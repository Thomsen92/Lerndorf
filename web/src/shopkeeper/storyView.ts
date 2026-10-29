import { getLocale } from '../i18n';
import type { OllieStoryApi, StoryState, StoryQuestion } from '../api/ollieStory';
import type { ProgressDelta } from '../api/progress';
import { openModal, type ModalHandle } from '../ui/dialog';
import type { Sound } from '../ui/sound';
import { silenceSirByte } from '../mascot/voice';
import { createOllieSpeech, type OllieSpeech } from './speech';
import { createItemOrbitView } from '../render/itemOrbitView';
import type { Item3dView, Item3dViewFactory } from '../ui/item3dPreview';
import './story.css';
import { empireModelCredit } from './empireCredit';

const text = (en: string, de: string): string => (getLocale() === 'de' ? de : en);
const INTRO =
  'Fancy hearing my story, mate? Australia, New York, and a rather unreliable memory. Help me find nine missing words. I have a little souvenir for you.';
const INTRO_CLIP = '60db88c0e94554336efe43e1',
  WRONG_CLIP = 'df0171db67cc19aa448f437e';
type Speech = Pick<OllieSpeech, 'tell' | 'stop' | 'dispose'>;
export interface OllieStoryOptions {
  api: OllieStoryApi;
  opener?: HTMLElement;
  sound?: Sound;
  onCoins: (coins: number) => void;
  onProgress: (delta: ProgressDelta) => void;
  onChanged: () => void;
  onInventory: () => void;
  createSpeech?: (opts: Parameters<typeof createOllieSpeech>[0]) => Speech;
  createView?: Item3dViewFactory;
}

/** Nine server-owned gaps. Only the current question and already-unlocked reply reach this view. */
export function openOllieStory(opts: OllieStoryOptions): ModalHandle {
  silenceSirByte();
  // the village music stays off for the whole story; Ollie's voice carries it
  const releaseMusic = opts.sound?.hush();
  let busy = false,
    narrating = false,
    narration = 0,
    loadId = 0;
  let state: StoryState | null = null,
    view: Item3dView | null = null;
  const modal = openModal({
    title: text('A rather forgetful road trip', 'Eine ziemlich vergessliche Reise'),
    opener: opts.opener,
    wide: true,
    canClose: () => !busy,
    onClose: () => {
      releaseMusic?.();
      ++narration;
      ++loadId;
      speech.dispose();
      view?.dispose();
      view = null;
    },
  });
  modal.body.closest('.panel')?.classList.add('ollie-story');
  modal.body.classList.add('ollie-story-layout');
  const left = document.createElement('aside');
  left.className = 'ollie-story-scene';
  const route = document.createElement('p');
  route.className = 'ollie-story-route';
  route.textContent = 'AUSTRALIA  →  NEW YORK';
  const portrait = document.createElement('img');
  portrait.className = 'ollie-story-portrait';
  portrait.src = `${import.meta.env.BASE_URL}assets/shopkeeper/ollie-portrait.png`;
  portrait.alt = 'Ollie';
  const line = document.createElement('p');
  line.className = 'ollie-story-line';
  line.setAttribute('aria-live', 'polite');
  const audioTools = document.createElement('div');
  audioTools.className = 'ollie-story-audio';
  const right = document.createElement('section');
  right.className = 'ollie-story-content';
  const status = document.createElement('p');
  status.className = 'ollie-story-status';
  status.setAttribute('role', 'status');
  left.append(route, portrait, line, audioTools);
  modal.body.append(left, right, status);
  const speech = (opts.createSpeech ?? createOllieSpeech)({
    portrait,
    sound: opts.sound,
    clipDirectory: 'assets/shopkeeper/story-voice',
  });
  const button = (label: string, click: () => void, primary = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (primary) b.className = 'primary';
    b.addEventListener('click', click);
    return b;
  };
  const paragraph = (value: string): HTMLParagraphElement => {
    const p = document.createElement('p');
    p.textContent = value;
    return p;
  };
  const heading = (value: string): void => {
    const h = document.createElement('h3');
    h.textContent = value;
    right.append(h);
  };
  const stopSpeech = (): void => {
    ++narration;
    speech.stop();
    narrating = false;
  };
  const setDisabled = (): void => {
    right.querySelectorAll<HTMLButtonElement>('[data-await-speech]').forEach((b) => {
      b.disabled = busy || narrating || b.dataset.wrong === 'true';
    });
    const focused = document.activeElement;
    if (focused === document.body || (focused instanceof HTMLButtonElement && focused.disabled))
      right.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  };
  const setAudioTools = (value: string, clip: string): void => {
    audioTools.replaceChildren(
      button(text('Listen again', 'Noch einmal hören'), () => void speak(value, clip)),
      button(text('Skip audio', 'Audio überspringen'), () => {
        stopSpeech();
        setDisabled();
      }),
    );
  };
  const speak = async (value: string, clip: string): Promise<void> => {
    stopSpeech();
    const mine = narration;
    line.textContent = value;
    narrating = true;
    setDisabled();
    setAudioTools(value, clip);
    try {
      await speech.tell(clip);
    } catch {
      /* Text remains available if this recording cannot play. */
    }
    if (!modal.isOpen || mine !== narration) return;
    narrating = false;
    setDisabled();
  };
  function showReward(fresh = false): void {
    stopSpeech();
    right.replaceChildren();
    audioTools.replaceChildren();
    heading(
      text(
        fresh ? 'A little piece of New York' : 'You have heard this one!',
        fresh ? 'Ein kleines Stück New York' : 'Diese Geschichte kennst du schon!',
      ),
    );
    right.append(
      paragraph(text('New York souvenir · 50 coins · 80 XP', 'New-York-Souvenir · 50 Münzen · 80 XP')),
    );
    right.append(
      paragraph(
        text(
          fresh
            ? 'All nine words remembered. Your rewards are now in your account.'
            : 'Completed! You keep your rewards. They can only be earned once.',
          fresh
            ? 'Alle neun Wörter gefunden. Deine Belohnungen sind jetzt verbucht.'
            : 'Abgeschlossen! Deine Belohnungen bleiben erhalten. Du bekommst sie einmal.',
        ),
      ),
    );
    line.textContent = text(
      'Cheers, mate. A little New York memory, from me to you.',
      'Cheers, mate. Eine kleine Erinnerung an New York – von mir für dich.',
    );
    const canvas = document.createElement('canvas');
    canvas.className = 'ollie-story-gift';
    canvas.setAttribute('aria-label', text('New York souvenir in 3D', 'New-York-Souvenir in 3D'));
    canvas.tabIndex = 0;
    right.append(canvas);
    right.append(empireModelCredit());
    view?.dispose();
    view = (opts.createView ?? createItemOrbitView)(canvas, {
      reducedMotion:
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    if (view)
      void view.load('deco', 'reward_ollie_nyc_postcard').catch(() => {
        if (modal.isOpen)
          status.textContent = text(
            'Preview unavailable. Your souvenir is safe in your inventory.',
            'Vorschau nicht verfügbar. Dein Souvenir bleibt im Inventar.',
          );
      });
    right.append(
      button(
        text('Go to inventory', 'Zum Inventar'),
        () => {
          modal.close();
          opts.onInventory();
        },
        true,
      ),
    );
  }
  function showQuestion(question: StoryQuestion): void {
    stopSpeech();
    right.replaceChildren();
    status.textContent = '';
    heading(text('Help me find the word, mate.', 'Hilf mir, das Wort zu finden.'));
    const progress = paragraph(`${question.position} / ${state?.total ?? 9}`);
    progress.className = 'ollie-story-progress';
    right.append(progress);
    right.append(
      paragraph(text('Listen, then choose the missing word.', 'Höre zu und tippe auf das fehlende Wort.')),
    );
    for (const answer of question.options) {
      const choice = button(answer, () => void submit(question, answer));
      choice.className = 'ollie-story-answer';
      choice.dataset.awaitSpeech = 'true';
      right.append(choice);
    }
    void speak(question.narrative, question.clip);
  }
  async function submit(question: StoryQuestion, answer: string): Promise<void> {
    if (busy || narrating || !modal.isOpen) return;
    busy = true;
    setDisabled();
    status.textContent = text('One moment…', 'Einen Moment …');
    let result: Awaited<ReturnType<OllieStoryApi['answer']>>;
    try {
      result = await opts.api.answer(question.id, answer);
    } catch {
      result = {
        ok: false,
        message: text(
          'The connection dropped. Check saved progress before trying again.',
          'Die Verbindung ist abgebrochen. Prüfe zuerst den gespeicherten Fortschritt.',
        ),
      };
    }
    busy = false;
    if (!modal.isOpen) return;
    if (!result.ok) {
      status.textContent = result.message;
      // An answer may already have reached the server: reload before submitting it again.
      right.querySelectorAll<HTMLButtonElement>('.ollie-story-answer').forEach((b) => (b.disabled = true));
      right.append(
        button(text('Check saved progress', 'Gespeicherten Fortschritt prüfen'), () => void load()),
      );
      return;
    }
    const value = result.value;
    state = value.state;
    opts.onCoins(state.coins);
    if (!value.correct) {
      status.textContent = value.hint ?? text('Have another think, mate.', 'Denk noch einmal nach.');
      Array.from(right.querySelectorAll<HTMLButtonElement>('.ollie-story-answer'))
        .find((b) => b.textContent === answer)
        ?.setAttribute('data-wrong', 'true');
      void speak('Not quite, mate. Have another think. I have left you a little clue.', WRONG_CLIP).then(
        () => {
          if (!modal.isOpen || busy || state?.question?.id !== question.id) return;
          line.textContent = question.narrative;
          setAudioTools(question.narrative, question.clip);
        },
      );
      return;
    }
    if (value.awarded.coins > 0 || value.awarded.xp > 0 || value.awarded.itemId) {
      opts.onChanged();
      if (value.progress) opts.onProgress(value.progress);
    }
    right.replaceChildren();
    status.textContent = '';
    heading(text('That’s the word!', 'Das ist das Wort!'));
    const next = button(
      text(
        state.completed ? 'See my souvenir' : 'Carry on, Ollie',
        state.completed ? 'Mein Souvenir ansehen' : 'Erzähl weiter, Ollie',
      ),
      () => {
        if (narrating) return;
        if (state?.completed) showReward(value.awarded.itemId !== null);
        else if (state?.question) showQuestion(state.question);
      },
      true,
    );
    next.dataset.awaitSpeech = 'true';
    right.append(next);
    if (value.feedback) void speak(value.feedback.text, value.feedback.clip);
    else if (state.completed) showReward(false);
    else if (state.question) showQuestion(state.question);
  }
  async function load(): Promise<void> {
    stopSpeech();
    const mine = ++loadId;
    right.replaceChildren();
    status.textContent = text('Finding my travel diary…', 'Ich suche mein Reisetagebuch …');
    let result: Awaited<ReturnType<OllieStoryApi['state']>>;
    try {
      result = await opts.api.state();
    } catch {
      result = {
        ok: false,
        message: text('Could not load the story.', 'Die Geschichte konnte nicht geladen werden.'),
      };
    }
    if (!modal.isOpen || mine !== loadId) return;
    status.textContent = '';
    if (!result.ok) {
      status.textContent = result.message;
      right.append(button(text('Try again', 'Noch einmal versuchen'), () => void load()));
      return;
    }
    state = result.value;
    opts.onCoins(state.coins);
    if (state.completed) {
      opts.onChanged();
      showReward(false);
      return;
    }
    if (state.step > 0 && state.question) {
      showQuestion(state.question);
      return;
    }
    heading(text('Fancy hearing my story, mate?', 'Willst du meine Geschichte hören?'));
    right.append(
      paragraph(
        text(
          'Nine missing words. One rather unreliable memory.',
          'Neun fehlende Wörter. Ein ziemlich vergesslicher Erzähler.',
        ),
      ),
      paragraph(text('New York souvenir · 50 coins · 80 XP', 'New-York-Souvenir · 50 Münzen · 80 XP')),
      paragraph(
        text(
          'Your progress is saved. Rewards are earned once.',
          'Dein Fortschritt wird gespeichert. Die Belohnungen gibt es einmal.',
        ),
      ),
      button(
        text('Start my story', 'Geschichte starten'),
        () => {
          if (state?.question) showQuestion(state.question);
        },
        true,
      ),
    );
    void speak(INTRO, INTRO_CLIP);
  }
  void load();
  return modal;
}
