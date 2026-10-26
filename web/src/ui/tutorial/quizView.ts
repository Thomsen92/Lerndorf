import { tr, msg } from '../../i18n';
/**
 * Tutorial quiz: three tap-to-answer questions in a non-modal panel (the account menu
 * stays reachable). Wrong answers show the English hint and may be repeated; the solution is never
 * sent to the client. The server decides which question is current (answered + 1).
 */
import type { Result } from '../../api/build';
import type { TutorialAnswerResult, TutorialQuestion } from '../../api/tutorial';
import { loadVoices, speakEnglish } from '../../quests/speech';
import { stringList } from '../../tasks/answer';
import { NETWORK_ERROR, NEXT, QUIZ_DONE, QUIZ_INTRO, RETRY } from './messages';
import { createCompanion } from '../../mascot/mascotStage';
import type { Sound } from '../sound';

export interface QuizApi {
  question(): Promise<Result<TutorialQuestion>>;
  answer(nr: number, answer: unknown): Promise<Result<TutorialAnswerResult>>;
}

export interface QuizOptions {
  sound?: Pick<Sound, 'enabled'>;
  reducedMotion?: () => boolean;
  api: QuizApi;
  /** Coins after the third correct answer (reward booked by the server). */
  onCoins: (coins: number) => void;
}

export interface QuizHandle {
  /** Resolves when all three questions are answered correctly. */
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
  const byte = createCompanion({ sound: opts.sound, reducedMotion: opts.reducedMotion });
  byte.say('quiz');

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
    panel.append(byte.el);
    return h;
  };
  const button = (label: string, primary: boolean, onClick: () => void): HTMLButtonElement => {
    const b = el('button', primary ? 'primary' : undefined, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const showError = (message: string): void => {
    heading(tr('Fragen'));
    const status = el('p', 'status error', message);
    status.setAttribute('role', 'status');
    const retry = button(RETRY, true, () => void load());
    panel.append(status, retry);
    retry.focus();
  };

  const load = async (): Promise<void> => {
    heading(tr('Fragen'));
    panel.append(el('p', undefined, tr('Lädt …')));
    const res = await safe(() => opts.api.question());
    if (closed) return;
    if (!res.ok) {
      showError(res.message);
      return;
    }
    render(res.value);
  };

  const render = (q: TutorialQuestion): void => {
    const data = (q.data && typeof q.data === 'object' ? q.data : {}) as Record<string, unknown>;
    heading(msg`Frage ${q.nr} von ${q.total}`);
    if (q.nr === 1) panel.append(el('p', 'quest-rule', QUIZ_INTRO));
    const prompt = el('p', 'tutorial-prompt', q.prompt);
    prompt.lang = 'en';
    panel.append(prompt);
    byte.lookAt(prompt);

    if (q.type === 'listening') {
      const speak = typeof data.speak === 'string' ? data.speak : '';
      const fallback = el('p', 'quest-fallback');
      fallback.hidden = true;
      const play = (): void => {
        byte.listen();
        void speakEnglish(speak).then((ok) => {
          if (ok || closed) return;
          fallback.textContent = tr('Dein Gerät kann nicht vorlesen. Lies den Text: ');
          const t = el('span', undefined, speak);
          t.lang = 'en';
          fallback.append(t);
          fallback.hidden = false;
        });
      };
      const listen = button(tr('▶ Anhören'), false, play);
      listen.className = 'quest-listen';
      listen.dataset.listen = '';
      panel.append(listen, fallback);
      play();
    }

    const formBox = el('div', 'quest-form tutorial-answers');
    formBox.setAttribute('role', 'group');
    formBox.setAttribute('aria-label', tr('Antwort antippen'));
    const feedback = el('p', 'status quest-feedback');
    feedback.setAttribute('role', 'status');
    let pending = false;
    panel.append(formBox, feedback);
    const choices: HTMLButtonElement[] = [];
    const lock = (on: boolean): void => {
      choices.forEach((b) => {
        b.disabled = on;
      });
    };
    const submit = async (answer: string, selected: HTMLButtonElement): Promise<void> => {
      if (pending) return;
      pending = true;
      choices.forEach((b) => b.classList.remove('is-wrong', 'is-correct'));
      synth?.cancel();
      byte.thinking();
      lock(true);
      formBox.setAttribute('aria-busy', 'true');
      feedback.textContent = tr('Wird geprüft …');
      const res = await safe(() => opts.api.answer(q.nr, answer));
      pending = false;
      if (closed) {
        if (res.ok && res.value.done) opts.onCoins(res.value.coins);
        return;
      }
      formBox.removeAttribute('aria-busy');
      if (!res.ok) {
        lock(false);
        feedback.textContent = res.message;
        selected.focus();
        return;
      }
      const r = res.value;
      void byte.answer(`tutorial-${q.nr}`, r.correct);
      if (!r.correct) {
        lock(false);
        selected.classList.add('is-wrong');
        selected.focus();
        feedback.textContent = r.hint
          ? tr('Leider falsch. Tipp: ')
          : tr('Leider falsch. Versuch es noch einmal.');
        if (r.hint) {
          const hint = el('span', undefined, r.hint);
          hint.lang = 'en';
          feedback.append(hint);
        }
        return;
      }
      selected.classList.add('is-correct');
      if (r.done) {
        opts.onCoins(r.coins);
        feedback.textContent = QUIZ_DONE;
        const next = button(NEXT, true, () => resolveDone());
        panel.append(next);
        next.focus();
        return;
      }
      feedback.textContent = tr('Richtig!');
      const next = button(NEXT, true, () => void load());
      panel.append(next);
      next.focus();
    };
    for (const option of stringList(data, 'options')) {
      const choice = button(option, false, () => void submit(option, choice));
      choice.className = 'tutorial-answer';
      choice.lang = 'en';
      choices.push(choice);
      formBox.append(choice);
    }
    choices[0]?.focus();
  };

  void load();
  return {
    done,
    close() {
      closed = true;
      byte.dispose();
      synth?.cancel(); // stop reading aloud on close / logout
      overlay.remove();
    },
  };
}
