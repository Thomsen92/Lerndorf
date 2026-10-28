/**
 * Spooky English Quiz (SPOOKY_STARTER §5, package S3): one question per view, every answer is one
 * big button and one tap sends it. No dropdowns, inputs or extra check button. Listening clips are
 * the local Edge-TTS MP3s (shared listeningPath), played only after a tap, never by the browser voice.
 * XP and tier shown here are always the server's numbers.
 */
import { tr, msg } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import { listeningPath } from '../quests/listening';
import { createCompanion, type Companion } from '../mascot/mascotStage';
import { activeSound } from '../ui/sound';
import { celebrate } from '../ui/celebration';
import type { ProgressDelta } from '../api/progress';
import {
  StarterClosedError,
  type StarterAnswer,
  type StarterApi,
  type StarterQuestion,
  type StarterState,
} from '../api/seasonStarter';
import './spookyQuiz.css';

export interface SpookyQuizOptions {
  api: StarterApi;
  seasonId: string;
  opener?: HTMLElement | null;
  openLearnPass: () => void;
  onProgress?: (delta: ProgressDelta) => void;
  track?: (modal: ModalHandle) => void;
  /** Test seam; the app uses real <audio> elements. */
  createAudio?: (src: string) => HTMLAudioElement;
  /** Test seam; the app shows Sir Byte like in the daily quests. */
  companion?: () => Companion | null;
  reducedMotion?: () => boolean;
}

export interface SpookyQuiz {
  close(): void;
  readonly isOpen: boolean;
}

/** A small carved pumpkin (static markup, no user text). */
const PUMPKIN =
  '<svg viewBox="0 0 32 32" focusable="false"><path class="stem" d="M15 4c1-2 4-3 5-2-2 1-3 3-3 5h-2z"/>' +
  '<path class="body" d="M16 8c-3-2-9-1-11 4-3 6 0 15 6 16 2 .4 3-.6 5-.6s3 1 5 .6c6-1 9-10 6-16-2-5-8-6-11-4z"/>' +
  '<path class="face" d="M10 15l3 2-3 1zm12 0-3 2 3 1zm-11 6c2 2 8 2 10 0l-2 1-1-1-1 1-1-1-1 1-1-1-1 1z"/></svg>';

export function openSpookyQuiz(opts: SpookyQuizOptions): SpookyQuiz {
  const modal = openModal({
    title: tr('Spooky English Quiz'),
    opener: opts.opener ?? null,
    wide: true,
    onClose: () => cleanup(),
  });
  opts.track?.(modal);
  const body = modal.body;
  body.classList.add('spooky-quiz');
  // the whole window turns into a moonlit night (spookyQuiz.css): panel, backdrop and title
  body.closest('.panel')?.classList.add('spooky-panel');
  body.closest('.overlay')?.classList.add('spooky-overlay');
  // Sir Byte keeps the pupil company like in the daily quests: reactions, praise and the quiz loop.
  const byte =
    (
      opts.companion ??
      (() =>
        createCompanion({
          sound: activeSound() ?? undefined,
          reducedMotion: opts.reducedMotion,
        }))
    )() ?? null;
  const content = document.createElement('div');
  content.className = 'spooky-content';
  if (byte) {
    const layout = document.createElement('div');
    layout.className = 'quests-with-byte spooky-with-byte';
    layout.append(byte.el, content);
    body.append(layout);
  } else body.append(content);
  const makeAudio = opts.createAudio ?? ((src: string) => new Audio(src));

  let closed = false;
  let state: StarterState | null = null;
  let index = 0;
  let starterXp = 0;
  let tier = 0;
  let audio: HTMLAudioElement | null = null;
  let audioDone: (() => void) | null = null;

  content.textContent = tr('Quiz wird geladen …');
  void opts.api
    .state(opts.seasonId)
    .then((s) => {
      if (closed) return;
      state = s;
      starterXp = s.awardedXp;
      if (s.completed) return showSummary();
      if (s.state !== 'running') return showClosed(s.state);
      byte?.say('spooky');
      index = Math.max(
        0,
        s.questions.findIndex((q) => !q.solved),
      );
      showQuestion();
    })
    .catch(() => {
      if (closed) return;
      content.replaceChildren(
        line('p', tr('Das Quiz konnte nicht geladen werden. Bitte später nochmal versuchen.'), 'error'),
        backButton(),
      );
    });

  function line(tag: 'p' | 'h3' | 'span', text: string, className = ''): HTMLElement {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  }
  function button(text: string, className: string, onClick: () => void): HTMLButtonElement {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = text;
    el.addEventListener('click', onClick);
    return el;
  }
  function backButton(): HTMLButtonElement {
    return button(tr('Zurück ins Dorf'), 'spooky-back', () => modal.close());
  }

  function stopAudio(): void {
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audioDone?.();
    audio = null;
    audioDone = null;
  }

  function showClosed(seasonState: string): void {
    stopAudio();
    const text =
      seasonState === 'upcoming'
        ? tr('Das Quiz startet, sobald die Season läuft.')
        : tr('Die Season ist vorbei. Neue XP gibt es für das Quiz nicht mehr.');
    content.replaceChildren(line('p', text, 'spooky-intro'), backButton());
  }

  function showSummary(): void {
    stopAudio();
    const head = line('h3', tr('Quiz geschafft!'), 'spooky-title');
    const total = msg`${starterXp} XP verdient`;
    const summary = line('p', tier > 0 ? msg`${total} · Tier ${tier} erreicht` : total, 'spooky-summary');
    const pass = button(tr('LearnPass öffnen'), 'primary spooky-pass', () => {
      modal.close();
      opts.openLearnPass();
    });
    pass.dataset.openPass = '';
    byte?.say('spookyDone');
    content.replaceChildren(
      head,
      summary,
      line('p', tr('Hol dir jetzt deine Belohnungen im LearnPass ab.')),
      pass,
      backButton(),
    );
  }

  function showQuestion(): void {
    stopAudio();
    if (!state) return;
    const question = state.questions[index];
    const counter = progressRow(state.questions, index);
    const prompt = line('h3', question.prompt, 'spooky-prompt');
    const status = line('p', '', 'spooky-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    const list = document.createElement('div');
    list.className = 'spooky-options';
    const nodes: HTMLElement[] = [counter, prompt];
    if (question.type === 'listening' && question.speak) nodes.push(listeningControls(question, status));
    let pending = false;
    let finished = question.solved;
    const buttons = question.options.map((option) => {
      const el = button(option, 'spooky-option', () => void submit(option, el));
      el.disabled = finished;
      return el;
    });
    list.append(...buttons);
    nodes.push(list, status);
    content.replaceChildren(...nodes);
    if (finished) {
      status.textContent = tr('Schon gelöst.');
      content.append(nextButton());
    }

    async function submit(option: string, el: HTMLButtonElement): Promise<void> {
      if (pending || finished || closed) return;
      pending = true;
      const wrongBefore = new Set(buttons.filter((b) => b.dataset.wrong !== undefined));
      for (const b of buttons) b.disabled = true;
      status.className = 'spooky-status';
      status.textContent = tr('Wird geprüft …');
      byte?.thinking();
      let answer: StarterAnswer;
      try {
        answer = await opts.api.answer(opts.seasonId, question.id, option);
      } catch (err) {
        if (closed) return;
        pending = false;
        if (err instanceof StarterClosedError) {
          finished = true;
          status.className = 'spooky-status error';
          status.textContent = tr('Die Season ist vorbei. Diese Antwort wurde nicht gewertet.');
          return;
        }
        for (const b of buttons) b.disabled = wrongBefore.has(b);
        status.className = 'spooky-status error';
        status.textContent = tr('Keine Verbindung. Tippe die Antwort bitte noch einmal.');
        return;
      }
      if (closed) return;
      pending = false;
      if (answer.correct) {
        finished = true;
        question.solved = true;
        el.classList.add('correct');
        el.textContent = `✓ ${option}`;
        counter.querySelectorAll('.spooky-pumpkin')[index]?.classList.add('lit', 'just-lit');
        tier = answer.reachedTier;
        starterXp += answer.awardedXp;
        status.className = 'spooky-status ok';
        status.textContent =
          answer.awardedXp > 0
            ? msg`Richtig! +${answer.awardedXp} XP`
            : answer.alreadySolved
              ? tr('Richtig! Diese Frage hattest du schon gelöst.')
              : tr('Richtig!');
        if (answer.progress && answer.awardedXp > 0) opts.onProgress?.(answer.progress);
        void byte?.answer(`spooky-${question.id}`, true);
        // the last question: big „Success!“ with confetti and the victory fanfare
        if (answer.completed && !answer.alreadySolved && !state?.completed)
          celebrate({ theme: 'spooky', subtitle: tr('Quiz geschafft!'), sound: activeSound() });
        if (state) state.completed = answer.completed;
        content.append(nextButton());
      } else {
        el.classList.add('wrong');
        el.dataset.wrong = '';
        el.textContent = `✗ ${option}`;
        void byte?.answer(`spooky-${question.id}`, false);
        for (const b of buttons) b.disabled = b.dataset.wrong !== undefined;
        status.className = 'spooky-status hint';
        status.textContent = answer.hint
          ? msg`Noch nicht. Tipp: ${answer.hint}`
          : tr('Noch nicht. Versuch es nochmal.');
      }
    }
  }

  /**
   * Ten pumpkins show where the pupil stands: lit ones are solved, the current one glows, the
   * rest wait in the dark. The sentence beside them carries the same information for everyone.
   */
  function progressRow(questions: StarterQuestion[], current: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'spooky-progress';
    const patch = document.createElement('span');
    patch.className = 'spooky-pumpkins';
    patch.setAttribute('aria-hidden', 'true');
    questions.forEach((q, i) => {
      const pumpkin = document.createElement('span');
      pumpkin.className = `spooky-pumpkin${q.solved ? ' lit' : ''}${i === current ? ' current' : ''}`;
      pumpkin.innerHTML = PUMPKIN;
      patch.append(pumpkin);
    });
    row.append(patch, line('p', msg`Frage ${current + 1} von ${questions.length}`, 'spooky-counter'));
    return row;
  }

  function nextButton(): HTMLButtonElement {
    const done = state?.completed ?? false;
    const el = button(done ? tr('Zum Ergebnis') : tr('Nächste Frage'), 'primary spooky-next', () => {
      if (!state) return;
      if (state.completed) return showSummary();
      const open = state.questions.findIndex((q, i) => i > index && !q.solved);
      index = open >= 0 ? open : state.questions.findIndex((q) => !q.solved);
      if (index < 0) return showSummary();
      showQuestion();
    });
    return el;
  }

  function listeningControls(question: StarterQuestion, status: HTMLElement): HTMLElement {
    const box = document.createElement('div');
    box.className = 'spooky-listen';
    const play = button(tr('▶ Anhören'), 'spooky-play', () => {
      // play() stays inside the tap handler: iPads refuse audio that starts after an await.
      stopAudio();
      byte?.listen();
      const clip = makeAudio(`${import.meta.env.BASE_URL}${listeningPath(question.speak!)}`);
      // music down while the clip plays, back up when it ends, fails or is stopped
      const release = activeSound()?.quiet() ?? (() => undefined);
      const onError = (): void => {
        release();
        status.className = 'spooky-status error';
        status.textContent = tr('Audio konnte nicht abgespielt werden. Versuch es nochmal.');
        reveal.hidden = false;
      };
      clip.addEventListener('error', onError);
      clip.addEventListener('ended', release);
      audio = clip;
      audioDone = () => {
        clip.removeEventListener('error', onError);
        clip.removeEventListener('ended', release);
        release();
      };
      void clip.play().catch(onError);
      play.textContent = tr('↻ Nochmal anhören');
    });
    const reveal = button(tr('Englischen Text zeigen'), 'spooky-text', () => {
      reveal.replaceWith(line('p', question.speak!, 'spooky-spoken'));
    });
    reveal.hidden = true;
    box.append(play, reveal);
    return box;
  }

  function cleanup(): void {
    if (closed) return;
    closed = true;
    stopAudio();
    byte?.dispose();
  }

  return {
    close: () => modal.close(),
    get isOpen() {
      return modal.isOpen;
    },
  };
}
