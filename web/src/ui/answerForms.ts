import { html } from '../i18n';
/**
 * Answer forms for choice, gap, match and order (SPEC §12), shared by the areas that ask questions.
 * Renders HTML from the public task data and writes the pupil's input into an AnswerState.
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
      return { type: 'choice', picked: null };
    case 'gap':
      return { type: 'gap', text: '' };
    case 'match':
      return {
        type: 'match',
        picks: Object.fromEntries(stringList(form.data, 'left').map((l) => [l, null])),
      };
    case 'order':
      return { type: 'order', sequence: [] };
  }
}

export function answerForm(form: AnswerFormSpec, state: AnswerState): string {
  switch (form.type) {
    case 'choice':
      return `<div class="choices">${stringList(form.data, 'options')
        .map(
          (o, i) =>
            `<label><input type="radio" name="choice" value="${esc(o)}" id="c${i}" ${
              state.type === 'choice' && state.picked === o ? 'checked' : ''
            }/> ${esc(o)}</label>`,
        )
        .join('')}</div>`;
    case 'gap':
      return html`<input
        id="gap"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        placeholder="Antwort"
      />`;
    case 'match': {
      const rights = stringList(form.data, 'right');
      return `<div class="matches">${stringList(form.data, 'left')
        .map(
          (l) =>
            `<label>${esc(l)} → <select data-left="${esc(l)}"><option value="">–</option>${rights
              .map((r) => `<option value="${esc(r)}">${esc(r)}</option>`)
              .join('')}</select></label>`,
        )
        .join('')}</div>`;
    }
    case 'order': {
      const words = stringList(form.data, 'words');
      const used = state.type === 'order' ? state.sequence : [];
      return html` <p class="hint">
          Antippen in der richtigen Reihenfolge: ${used.map(esc).join(' ') || '–'}
        </p>
        <div class="words">
          ${words.map((w) => `<button type="button" data-word="${esc(w)}">${esc(w)}</button>`).join('')}
        </div>
        <button type="button" id="reset">Neu anfangen</button>`;
    }
  }
}

/**
 * Writes the input of the controls inside `root` into `state` (mutated in place).
 * Order taps change the rendered sequence, so they ask the caller to redraw.
 */
export function bindAnswerForm(root: ParentNode, state: AnswerState, redraw: () => void): void {
  const s = state;
  root.querySelectorAll<HTMLInputElement>('input[name=choice]').forEach((r) =>
    r.addEventListener('change', () => {
      if (s.type === 'choice') s.picked = r.value;
    }),
  );
  root.querySelector<HTMLInputElement>('#gap')?.addEventListener('input', (ev) => {
    if (s.type === 'gap') s.text = (ev.target as HTMLInputElement).value;
  });
  root.querySelectorAll<HTMLSelectElement>('select[data-left]').forEach((sel) =>
    sel.addEventListener('change', () => {
      if (s.type === 'match') s.picks[sel.dataset.left as string] = sel.value || null;
    }),
  );
  root.querySelectorAll<HTMLButtonElement>('[data-word]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (s.type === 'order') {
        s.sequence.push(btn.dataset.word as string);
        redraw();
      }
    }),
  );
  root.querySelector('#reset')?.addEventListener('click', () => {
    if (s.type === 'order') s.sequence = [];
    redraw();
  });
}
