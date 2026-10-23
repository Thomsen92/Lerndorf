/**
 * Tutorial quiz: the five fixed questions one at a time, in a non-modal panel (the account menu
 * stays reachable). Wrong answers show the English hint and may be repeated; the solution is never
 * sent to the client. The server decides which question is current (answered + 1).
 */
import type { Result } from '../../api/build';
import type { QuestType } from '../../api/quests';
import type { TutorialAnswerResult, TutorialQuestion } from '../../api/tutorial';
import { loadVoices, speakEnglish } from '../../quests/speech';
import { answerMode, buildAnswer, type AnswerState } from '../../tasks/answer';
import { answerForm, bindAnswerForm, emptyState, type AnswerFormSpec } from '../answerForms';
import { NETWORK_ERROR, NEXT, QUIZ_DONE, QUIZ_INTRO, RETRY } from './messages';

export interface QuizApi {
  question(): Promise<Result<TutorialQuestion>>;
  answer(nr: number, answer: unknown): Promise<Result<TutorialAnswerResult>>;
}

export interface QuizOptions {
  api: QuizApi;
  /** coins after the fifth correct answer (reward booked by the server) */
  onCoins: (coins: number) => void;
}

export interface QuizHandle {
  /** resolves when all five questions are answered correctly */
  done: Promise<void>;
  close(): void;
}

async function safe<T>(call: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await call();
  } catch (err) {
    console.error('tutorial request failed', err);
    return { ok: false, message: NETWORK_ERROR };
  }
}

function formSpec(q: TutorialQuestion): AnswerFormSpec {
  const data = (q.data && typeof q.data === 'object' ? q.data : {}) as Record<string, unknown>;
  return { type: answerMode(q.type as QuestType, data), data };
}

let counter = 0;

export function openQuiz(opts: QuizOptions): QuizHandle {
  const titleId = `tutorial-quiz-title-${++counter}`;
  const overlay = document.createElement('section');
  overlay.className = 'overlay area tutorial-quiz';
  overlay.setAttribute('role', 'region');
  overlay.setAttribute('aria-labelledby', titleId);
  const panel = document.createElement('div');
  panel.className = 'panel';
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const synth = (globalThis as { speechSynthesis?: SpeechSynthesis }).speechSynthesis;
  if (synth) void loadVoices(synth).catch(() => undefined);

  let closed = false;
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((r) => (resolveDone = r));

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    cls?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const heading = (text: string): HTMLHeadingElement => {
    const h = el('h2', undefined, text);
    h.id = titleId;
    const head = el('div', 'panel-head');
    head.appendChild(h);
    panel.replaceChildren(head);
    return h;
  };
  const button = (label: string, primary: boolean, onClick: () => void): HTMLButtonElement => {
    const b = el('button', primary ? 'primary' : undefined, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const showError = (message: string): void => {
    heading('Fragen');
    const status = el('p', 'status error', message);
    status.setAttribute('role', 'status');
    const retry = button(RETRY, true, () => void load());
    panel.append(status, retry);
    retry.focus();
  };

  const load = async (): Promise<void> => {
    heading('Fragen');
    panel.append(el('p', undefined, 'Lädt …'));
    const res = await safe(() => opts.api.question());
    if (closed) return;
    if (!res.ok) {
      showError(res.message);
      return;
    }
    render(res.value);
  };

  const render = (q: TutorialQuestion): void => {
    const spec = formSpec(q);
    const state: AnswerState = emptyState(spec);
    heading(`Frage ${q.nr} von ${q.total}`);
    if (q.nr === 1) panel.append(el('p', 'quest-rule', QUIZ_INTRO));
    const prompt = el('p', 'tutorial-prompt', q.prompt);
    prompt.lang = 'en';
    panel.append(prompt);

    if (q.type === 'listening') {
      const data = spec.data;
      const speak = typeof data.speak === 'string' ? data.speak : '';
      const fallback = el('p', 'quest-fallback');
      fallback.hidden = true;
      const play = (): void => {
        void speakEnglish(speak).then((ok) => {
          if (ok || closed) return;
          fallback.textContent = 'Dein Gerät kann nicht vorlesen. Lies den Text: ';
          const t = el('span', undefined, speak);
          t.lang = 'en';
          fallback.append(t);
          fallback.hidden = false;
        });
      };
      const listen = button('▶ Anhören', false, play);
      listen.className = 'quest-listen';
      listen.dataset.listen = '';
      panel.append(listen, fallback);
      play();
    }

    const formBox = el('div', 'quest-form');
    formBox.innerHTML = answerForm(spec, state);
    const bindForm = (): void =>
      bindAnswerForm(formBox, state, () => {
        formBox.innerHTML = answerForm(spec, state);
        bindForm();
      });
    bindForm();
    const feedback = el('p', 'status quest-feedback');
    feedback.setAttribute('role', 'status');
    let pending = false;
    const check = button('Prüfen', true, () => void submit());
    check.id = 'check';
    panel.append(formBox, check, feedback);
    formBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
        e.preventDefault();
        void submit();
      }
    });
    (formBox.querySelector<HTMLElement>('input, select') ?? check).focus();

    const submit = async (): Promise<void> => {
      if (pending) return;
      const answer = buildAnswer(state);
      if (answer === null) {
        feedback.textContent = 'Bitte zuerst alles ausfüllen.';
        return;
      }
      pending = true;
      check.disabled = true;
      feedback.textContent = 'Wird geprüft …';
      const res = await safe(() => opts.api.answer(q.nr, answer));
      pending = false;
      if (closed) {
        if (res.ok && res.value.done) opts.onCoins(res.value.coins);
        return;
      }
      check.disabled = false;
      if (!res.ok) {
        feedback.textContent = res.message;
        return;
      }
      const r = res.value;
      if (!r.correct) {
        feedback.textContent = r.hint ? 'Leider falsch. Tipp: ' : 'Leider falsch. Versuch es noch einmal.';
        if (r.hint) {
          const hint = el('span', undefined, r.hint);
          hint.lang = 'en';
          feedback.append(hint);
        }
        return;
      }
      // correct: lock the form and go on
      formBox
        .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button')
        .forEach((c) => (c.disabled = true));
      check.remove();
      if (r.done) {
        opts.onCoins(r.coins);
        feedback.textContent = QUIZ_DONE;
        const next = button(NEXT, true, () => resolveDone());
        panel.append(next);
        next.focus();
        return;
      }
      feedback.textContent = 'Richtig!';
      const next = button(NEXT, true, () => void load());
      panel.append(next);
      next.focus();
    };
  };

  void load();
  return {
    done,
    close() {
      closed = true;
      overlay.remove();
    },
  };
}
