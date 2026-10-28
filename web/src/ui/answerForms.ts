import { html, tr } from '../i18n';
/**
 * Answer forms for choice, gap, match and order (SPEC §12), made for tablets: big tiles, no
 * dropdowns, no radio buttons or checkboxes. Every answer is one tap (choice, gap with word bank)
 * or finishes itself with the last tap (match: pair everything, order: place every word). Then
 * `ready` is called and the area sends the answer. Only a gap without word bank (older content)
 * still has a text field and needs the area's „Prüfen“ button, see needsCheck().
 * Renders HTML from the public task data (never the solution) and writes the taps into an AnswerState.
 */
import { stringList, type AnswerState, type TaskType } from '../tasks/answer';
import { esc } from './esc';

/** What a form needs: its type and the public data (never the solution). */
export interface AnswerFormSpec {
  type: TaskType;
  data: Record<string, unknown>;
}

export function emptyState(form: AnswerFormSpec): AnswerState {
  switch (form.type) {
    case 'choice':
      return { type: 'choice', picked: null, wrong: [] };
    case 'gap':
      return { type: 'gap', text: '', wrong: [] };
    case 'match':
      return {
        type: 'match',
        picks: Object.fromEntries(stringList(form.data, 'left').map((l) => [l, null])),
        active: null,
      };
    case 'order':
      return { type: 'order', sequence: [], used: [] };
  }
}

/** A gap without word bank is typed, so it is the only form that needs a „Prüfen“ button. */
export function needsCheck(form: AnswerFormSpec): boolean {
  return form.type === 'gap' && stringList(form.data, 'bank').length === 0;
}

/**
 * Prepares the state for the next try after a wrong answer: a wrongly tapped tile stays greyed
 * out, pairs and sentences start again from the beginning.
 */
export function afterWrong(form: AnswerFormSpec, state: AnswerState): AnswerState {
  if (state.type === 'choice') {
    const wrong = state.picked === null ? (state.wrong ?? []) : [...(state.wrong ?? []), state.picked];
    return { type: 'choice', picked: null, wrong };
  }
  if (state.type === 'gap' && !needsCheck(form)) {
    const wrong = state.text === '' ? (state.wrong ?? []) : [...(state.wrong ?? []), state.text];
    return { type: 'gap', text: '', wrong };
  }
  if (state.type === 'gap') return state; // typed text stays, so it can be corrected
  return emptyState(form);
}

const tiles = (options: string[], wrong: string[]): string =>
  `<div class="tap-grid" role="group">${options
    .map((o) => {
      const no = wrong.includes(o);
      return `<button type="button" class="tap${no ? ' wrong' : ''}" data-pick="${esc(o)}" lang="en"${
        no ? ' disabled' : ''
      }>${esc(o)}</button>`;
    })
    .join('')}</div>`;

export function answerForm(form: AnswerFormSpec, state: AnswerState): string {
  switch (form.type) {
    case 'choice':
      return tiles(stringList(form.data, 'options'), state.type === 'choice' ? (state.wrong ?? []) : []);
    case 'gap': {
      const bank = stringList(form.data, 'bank');
      if (bank.length > 0) return tiles(bank, state.type === 'gap' ? (state.wrong ?? []) : []);
      return html`<input
        id="gap"
        class="tap-input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="Antwort"
        value="${state.type === 'gap' ? esc(state.text) : ''}"
      />`;
    }
    case 'match':
      return matchBoard(form, state);
    case 'order':
      return orderBoard(form, state);
  }
}

function matchBoard(form: AnswerFormSpec, state: AnswerState): string {
  const lefts = stringList(form.data, 'left');
  const rights = stringList(form.data, 'right');
  const picks = state.type === 'match' ? state.picks : {};
  const active = state.type === 'match' ? (state.active ?? null) : null;
  const activeRight = state.type === 'match' ? (state.activeRight ?? null) : null;
  // a pair keeps the colour of its left word, so the partners are easy to find
  const pairOf = (right: string): number => lefts.findIndex((l) => picks[l] === right);
  const left = lefts
    .map((l, i) => {
      const paired = picks[l] != null;
      const isActive = active === l;
      const cls = `tap${paired ? ` paired pair-${i % 6}` : ''}${isActive ? ' active' : ''}`;
      return `<button type="button" class="${cls}" data-left="${esc(l)}" lang="en" aria-pressed="${isActive}">${esc(l)}</button>`;
    })
    .join('');
  const right = rights
    .map((r) => {
      const i = pairOf(r);
      const isActive = activeRight === r;
      const cls = `tap${i >= 0 ? ` paired pair-${i % 6}` : ''}${isActive ? ' active' : ''}`;
      return `<button type="button" class="${cls}" data-right="${esc(r)}" aria-pressed="${isActive}">${esc(r)}</button>`;
    })
    .join('');
  const help = active
    ? html`<span lang="en">${esc(active)}</span> – jetzt rechts den Partner antippen.`
    : activeRight
      ? html`${esc(activeRight)} – jetzt links den Partner antippen.`
      : html('Tippe ein Wort an, dann seinen Partner auf der anderen Seite.');
  return `<p class="tap-help">${help}</p><div class="match-board"><div class="match-col">${left}</div><div class="match-col">${right}</div></div>`;
}

function orderBoard(form: AnswerFormSpec, state: AnswerState): string {
  const words = stringList(form.data, 'words');
  const used = state.type === 'order' ? (state.used ?? []) : [];
  const sentence =
    used.length === 0
      ? `<span class="order-empty">${tr('Tippe die Wörter der Reihe nach an.')}</span>`
      : used
          .map(
            (w, j) =>
              `<button type="button" class="tap placed" data-placed="${j}" lang="en">${esc(words[w] ?? '')}</button>`,
          )
          .join('');
  const bank = words
    .map((w, i) =>
      used.includes(i)
        ? `<span class="tap ghost" aria-hidden="true">${esc(w)}</span>`
        : `<button type="button" class="tap" data-word="${i}" lang="en">${esc(w)}</button>`,
    )
    .join('');
  return html`<div class="order-sentence" aria-live="polite">${sentence}</div>
    <p class="tap-help">Falsches Wort? Tippe es oben an, dann geht es zurück.</p>
    <div class="order-bank">${bank}</div>`;
}

/**
 * Writes the taps inside `root` into `state` (mutated in place). Taps that change the picture ask
 * the caller to `redraw`; a complete answer calls `ready` (the area then sends it).
 */
export function bindAnswerForm(
  root: ParentNode,
  form: AnswerFormSpec,
  state: AnswerState,
  redraw: () => void,
  ready: () => void,
): void {
  const s = state;
  root.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const value = btn.dataset.pick as string;
      if (s.type === 'choice') s.picked = value;
      else if (s.type === 'gap') s.text = value;
      else return;
      btn.classList.add('picked');
      ready();
    }),
  );
  const gap = root.querySelector<HTMLInputElement>('#gap');
  gap?.addEventListener('input', () => {
    if (s.type === 'gap') s.text = gap.value;
  });
  gap?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') ready();
  });

  if (s.type === 'match') {
    const lefts = stringList(form.data, 'left');
    const complete = (): boolean => lefts.length > 0 && lefts.every((l) => s.picks[l] != null);
    root.querySelectorAll<HTMLButtonElement>('[data-left]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const l = btn.dataset.left as string;
        if (s.activeRight) {
          // right word was tapped first: this left word is its partner
          const owner = lefts.find((x) => s.picks[x] === s.activeRight);
          if (owner) s.picks[owner] = null;
          s.picks[l] = s.activeRight;
          s.activeRight = null;
          s.active = null;
        } else if (s.picks[l] != null) {
          s.picks[l] = null; // tapping a pair undoes it
          s.active = null;
        } else s.active = s.active === l ? null : l;
        redraw();
        if (complete()) ready();
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-right]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const r = btn.dataset.right as string;
        const owner = lefts.find((l) => s.picks[l] === r);
        if (s.active) {
          if (owner) s.picks[owner] = null; // the right word moves to the new partner
          s.picks[s.active] = r;
          s.active = null;
        } else if (owner) {
          s.picks[owner] = null; // tapping a pair undoes it
          s.activeRight = null;
        } else s.activeRight = s.activeRight === r ? null : r;
        redraw();
        if (complete()) ready();
      }),
    );
  }

  if (s.type === 'order') {
    const words = stringList(form.data, 'words');
    const used = (s.used ??= []);
    const sync = (): void => {
      s.sequence = used.map((i) => words[i] ?? '');
    };
    root.querySelectorAll<HTMLButtonElement>('[data-word]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.word);
        if (used.includes(i)) return;
        used.push(i);
        sync();
        redraw();
        if (used.length === words.length) ready();
      }),
    );
    root.querySelectorAll<HTMLButtonElement>('[data-placed]').forEach((btn) =>
      btn.addEventListener('click', () => {
        used.splice(Number(btn.dataset.placed), 1);
        sync();
        redraw();
      }),
    );
  }
}
