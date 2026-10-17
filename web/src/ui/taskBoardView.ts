/**
 * Task board overlay (SPEC §12): tasks of the current and earlier weeks, one open at a time.
 * Answer forms for choice, gap, match and order. Feedback in plain German.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadTasks, loadTodayStatus, submitAnswer, type AnswerResult, type TaskStatus } from '../api/economy';
import {
  berlinToday,
  buildAnswer,
  stringList,
  wrongMessage,
  type AnswerState,
  type TaskView,
} from '../tasks/answer';
import { weekLabel } from '../teacher/week';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export interface TaskBoardOptions {
  supabase: SupabaseClient;
  coins: number;
  onCoins: (coins: number) => void;
  onClose: () => void;
}

export async function openTaskBoard(opts: TaskBoardOptions): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Aufgabentafel');
  document.body.appendChild(overlay);

  const close = (): void => {
    overlay.remove();
    opts.onClose();
  };
  let coins = opts.coins;
  let openTask: string | null = null;
  let state: AnswerState | null = null;

  const draw = async (): Promise<void> => {
    overlay.innerHTML = '<section class="panel"><p>Lädt …</p></section>';
    const day = berlinToday();
    const [tasks, status] = await Promise.all([
      loadTasks(opts.supabase),
      loadTodayStatus(opts.supabase, day),
    ]);
    if (!tasks.ok || !status.ok) {
      overlay.innerHTML = `<section class="panel"><p class="error">${esc(
        !tasks.ok ? tasks.message : status.ok ? '' : status.message,
      )}</p><button type="button" id="close">Schließen</button></section>`;
      overlay.querySelector('#close')?.addEventListener('click', close);
      return;
    }
    const taskList = tasks.value;
    const statusMap = status.value;
    tasksRef = taskList;
    const byWeek = groupByWeek(taskList);
    overlay.innerHTML = `
      <section class="panel">
        <header class="panel-head">
          <h2>Aufgabentafel</h2>
          <span class="coins">${coins} Münzen</span>
          <button type="button" id="close">Schließen</button>
        </header>
        <p class="status" id="status" role="status"></p>
        ${
          tasks.value.length === 0
            ? '<p>Es gibt noch keine Aufgaben.</p>'
            : Array.from(byWeek.entries())
                .map(([week, list]) => weekBlock(week, list, statusMap, openTask))
                .join('')
        }
        <div id="form"></div>
      </section>`;
    overlay.querySelector('#close')?.addEventListener('click', close);
    overlay.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((btn) =>
      btn.addEventListener('click', () => {
        openTask = btn.dataset.open ?? null;
        const task = tasks.value.find((t) => t.id === openTask);
        if (task) state = emptyState(task);
        void draw().then(() => task && renderForm(task));
      }),
    );
    const open = tasks.value.find((t) => t.id === openTask);
    if (open) void renderForm(open);

    async function renderForm(task: TaskView): Promise<void> {
      const form = overlay.querySelector<HTMLElement>('#form');
      if (!form || !state) return;
      const st = statusMap[task.id];
      if (st?.solved) {
        form.innerHTML = '<p class="status">Diese Aufgabe hast du heute schon gelöst.</p>';
        return;
      }
      form.innerHTML = `
        <div class="task">
          <p class="task-prompt">${esc(task.prompt)}</p>
          ${answerForm(task, state)}
          <button type="button" class="primary" id="check">Prüfen</button>
          <p class="hint">Versuche heute: ${attemptsUsed(st)} von 3</p>
        </div>`;
      bindForm(task);
    }

    function bindForm(task: TaskView): void {
      const s = state;
      if (!s) return;
      overlay.querySelectorAll<HTMLInputElement>('input[name=choice]').forEach((r) =>
        r.addEventListener('change', () => {
          if (s.type === 'choice') s.picked = r.value;
        }),
      );
      overlay.querySelector<HTMLInputElement>('#gap')?.addEventListener('input', (ev) => {
        if (s.type === 'gap') s.text = (ev.target as HTMLInputElement).value;
      });
      overlay.querySelectorAll<HTMLSelectElement>('select[data-left]').forEach((sel) =>
        sel.addEventListener('change', () => {
          if (s.type === 'match') s.picks[sel.dataset.left as string] = sel.value || null;
        }),
      );
      overlay.querySelectorAll<HTMLButtonElement>('[data-word]').forEach((btn) =>
        btn.addEventListener('click', () => {
          if (s.type === 'order') {
            s.sequence.push(btn.dataset.word as string);
            void draw().then(() => {
              const t = findTask(task.id);
              if (t) void renderForm(t);
            });
          }
        }),
      );
      overlay.querySelector('#reset')?.addEventListener('click', () => {
        if (s.type === 'order') s.sequence = [];
        void draw().then(() => {
          const t = findTask(task.id);
          if (t) void renderForm(t);
        });
      });
      overlay.querySelector('#check')?.addEventListener('click', async () => {
        const answer = buildAnswer(s);
        const msg = overlay.querySelector<HTMLParagraphElement>('#status');
        if (answer === null) {
          if (msg) msg.textContent = 'Bitte zuerst alles ausfüllen.';
          return;
        }
        const res = await submitAnswer(opts.supabase, task.id, answer);
        if (!res.ok) {
          if (msg) msg.textContent = res.message;
          return;
        }
        coins = res.value.coins;
        opts.onCoins(coins);
        await draw();
        const after = overlay.querySelector<HTMLParagraphElement>('#status');
        if (after) after.textContent = resultText(res.value);
      });
    }
    // helper to find the current task after a redraw
    function findTask(id: string): TaskView | undefined {
      return tasksRef.find((t) => t.id === id);
    }
  };

  let tasksRef: TaskView[] = [];
  await draw();
}

/** Tasks grouped by week, newest first (the caller sorts). */
function groupByWeek(list: TaskView[]): Map<string, TaskView[]> {
  const map = new Map<string, TaskView[]>();
  for (const t of list) {
    const arr = map.get(t.week) ?? [];
    arr.push(t);
    map.set(t.week, arr);
  }
  return map;
}

function weekBlock(
  week: string,
  list: TaskView[],
  status: Record<string, TaskStatus>,
  openId: string | null,
): string {
  return `
    <h3>${esc(weekLabel(week))}</h3>
    <ul class="task-list">
      ${list
        .map((t) => {
          const st = status[t.id];
          const done = st?.solved;
          const locked = !done && (st?.attempts ?? 0) >= 3;
          const label = done ? 'gelöst' : locked ? 'keine Versuche mehr' : `${t.reward} Münzen`;
          return `<li>
            <button type="button" data-open="${esc(t.id)}" ${done || locked ? 'disabled' : ''} class="${
              openId === t.id ? 'primary' : ''
            }">${esc(t.prompt)} · ${label}</button>
          </li>`;
        })
        .join('')}
    </ul>`;
}

function emptyState(task: TaskView): AnswerState {
  switch (task.type) {
    case 'choice':
      return { type: 'choice', picked: null };
    case 'gap':
      return { type: 'gap', text: '' };
    case 'match':
      return {
        type: 'match',
        picks: Object.fromEntries(stringList(task.data, 'left').map((l) => [l, null])),
      };
    case 'order':
      return { type: 'order', sequence: [] };
  }
}

function answerForm(task: TaskView, state: AnswerState): string {
  switch (task.type) {
    case 'choice':
      return `<div class="choices">${stringList(task.data, 'options')
        .map(
          (o, i) =>
            `<label><input type="radio" name="choice" value="${esc(o)}" id="c${i}" ${
              state.type === 'choice' && state.picked === o ? 'checked' : ''
            }/> ${esc(o)}</label>`,
        )
        .join('')}</div>`;
    case 'gap':
      return `<input id="gap" type="text" autocomplete="off" autocapitalize="off" placeholder="Antwort" />`;
    case 'match': {
      const rights = stringList(task.data, 'right');
      return `<div class="matches">${stringList(task.data, 'left')
        .map(
          (l) =>
            `<label>${esc(l)} → <select data-left="${esc(l)}"><option value="">–</option>${rights
              .map((r) => `<option value="${esc(r)}">${esc(r)}</option>`)
              .join('')}</select></label>`,
        )
        .join('')}</div>`;
    }
    case 'order': {
      const words = stringList(task.data, 'words');
      const used = state.type === 'order' ? state.sequence : [];
      return `
        <p class="hint">Antippen in der richtigen Reihenfolge: ${used.map(esc).join(' ') || '–'}</p>
        <div class="words">${words
          .map((w) => `<button type="button" data-word="${esc(w)}">${esc(w)}</button>`)
          .join('')}</div>
        <button type="button" id="reset">Neu anfangen</button>`;
    }
  }
}

function attemptsUsed(st: TaskStatus | undefined): number {
  return st?.attempts ?? 0;
}

function resultText(r: AnswerResult): string {
  if (r.correct) return `Richtig! +Münzen. Kontostand: ${r.coins}`;
  const base = wrongMessage(r.attemptsLeft);
  return r.solution !== null ? `${base} Lösung: ${solutionText(r.solution)}` : base;
}

/** Shows the solution in plain words: a text as it is, a list as "a · b · c", pairs as "x = y". */
function solutionText(solution: unknown): string {
  if (typeof solution === 'string') return solution;
  if (Array.isArray(solution)) {
    return solution.map((x) => (Array.isArray(x) ? x.join(' = ') : String(x))).join(' · ');
  }
  return JSON.stringify(solution);
}
