/**
 * First-login tutorial as one linear async flow (spec docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md
 * §4, §9): figure -> plot -> camera flight -> two messages -> quiz -> buy -> place -> dance -> Daily Quests.
 * The server owns the step: the flow starts at `state.step` and moves on only after an RPC confirmed it,
 * so a reload resumes at the last confirmed step. The 3D side comes in as a small interface (no WebGL here).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '../../api/build';
import {
  answerTutorial,
  buyTutorialHouse,
  continueTutorial,
  finishTutorial,
  getTutorialQuestion,
  placeTutorialHouse,
  startTutorial,
  type TutorialState,
} from '../../api/tutorial';
import { saveCharacter } from '../../api/village';
import type { CharacterKind } from '../../render/character';
import type { ThumbSource } from '../../render/itemThumbs';
import type { ProgressDelta } from '../../api/progress';
import { openCharacterPicker } from '../characterPicker';
import { openTutorialBuy } from '../shopView';
import { createBubble, positionBubble, type BubbleMood } from '../speechBubble';
import {
  BUY_BUTTON,
  BUY_TEXT,
  BUY_TITLE,
  FINAL_TEXT,
  MESSAGES,
  NETWORK_ERROR,
  NEXT,
  RETRY,
  SAD_TEXT,
} from './messages';
import { openQuiz, type QuizApi } from './quizView';
import type { TutorialGuide } from '../../mascot/marketByte';
import type { Sound } from '../sound';

/** The RPCs the flow needs; the default talks to Supabase, tests pass fakes. */
export interface TutorialApi extends QuizApi {
  saveCharacter(kind: CharacterKind): Promise<{ ok: true } | { ok: false; message: string }>;
  start(): Promise<Result<TutorialState>>;
  continueIntro(): Promise<Result<TutorialState>>;
  buyHouse(): Promise<Result<{ coins: number; qty: number }>>;
  placeHouse(): Promise<Result<number>>;
  finish(): Promise<Result<TutorialState>>;
}

export function tutorialApi(supabase: SupabaseClient): TutorialApi {
  return {
    saveCharacter: (kind) => saveCharacter(supabase, kind),
    start: () => startTutorial(supabase),
    continueIntro: () => continueTutorial(supabase, 'intro'),
    question: () => getTutorialQuestion(supabase),
    answer: (nr, answer) => answerTutorial(supabase, nr, answer),
    buyHouse: () => buyTutorialHouse(supabase),
    placeHouse: () => placeTutorialHouse(supabase),
    finish: () => finishTutorial(supabase),
  };
}

/** What the flow needs from the 3D village. */
export interface TutorialVillage {
  byte?: TutorialGuide;
  flyMarket?(reducedMotion: boolean): Promise<void>;
  pauseForQuiz?(paused: boolean): void;
  /** Camera: panorama -> market -> own plot; resolves at the end (short and calm with reduced motion). */
  flyIntro(reducedMotion: boolean): Promise<void>;
  /** Camera: closer to the figure for the final scene. */
  flyCloseUp(reducedMotion: boolean): Promise<void>;
  /** Own figure stands still in front of the house slot (ruin). */
  placeFigure(): void;
  /** Own figure walks again (end or abort of the tutorial). */
  releaseFigure(): void;
  /** One round of the figure's dance; resolves when it ends. */
  danceOnce(): Promise<void>;
  /** Viewport pixels just above the own figure's head; null when it is not on screen. */
  figureScreen(): { x: number; y: number } | null;
  /**
   * Guided build mode on the house slot: the pupil places the house, `place` saves it.
   * Resolves ok once the server confirmed and the plot shows the house (ruin gone);
   * not ok when the build mode could not open (then the flow offers a retry).
   */
  placeHouse(place: () => Promise<{ ok: true } | { ok: false; message: string }>): Promise<Result<true>>;
}

export interface TutorialContext {
  sound?: Pick<Sound, 'enabled'>;
  onProgress?: (delta: ProgressDelta) => Promise<void>;
  supabase: SupabaseClient;
  state: TutorialState;
  /** Builds the village (once the pupil has a plot) and returns its tutorial side. */
  village: () => Promise<TutorialVillage>;
  onCoins(coins: number): void;
  openDailyQuests(): void;
  api?: TutorialApi;
  /** default: the OS media query prefers-reduced-motion */
  reducedMotion?: () => boolean;
  thumbs?: ThumbSource;
  /** aborted on logout: the flow stops and removes its UI */
  signal?: AbortSignal;
  /** pause after the dance before the Daily Quests open, in ms */
  endPauseMs?: number;
}

class Aborted extends Error {}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

async function safe<T>(call: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await call();
  } catch (err) {
    console.error('tutorial request failed', err);
    return { ok: false, message: NETWORK_ERROR };
  }
}

/** UI pieces of the flow: everything it adds is removed again on the end or on abort. */
function createUi(signal: AbortSignal | undefined, village: () => TutorialVillage | null) {
  const cleanups = new Set<() => void>();
  const aborted = new Promise<never>((_, reject) => {
    if (signal?.aborted) reject(new Aborted());
    signal?.addEventListener('abort', () => reject(new Aborted()), { once: true });
  });
  aborted.catch(() => undefined);
  const own = (cleanup: () => void): (() => void) => {
    const once = (): void => {
      if (!cleanups.delete(once)) return;
      cleanup();
    };
    cleanups.add(once);
    return once;
  };

  return {
    /** Waits for `p`, or throws when the tutorial was aborted meanwhile. */
    guard<T>(p: Promise<T>): Promise<T> {
      return Promise.race([p, aborted]);
    },
    own,
    /** A card at the bottom with text and one button; resolves on the tap. */
    card(text: string, label: string, kind: 'info' | 'error' = 'info'): Promise<void> {
      const el = document.createElement('div');
      el.className = `tutorial-card${kind === 'error' ? ' tutorial-card--error' : ''}`;
      el.setAttribute('role', 'group');
      el.setAttribute('aria-label', 'Tutorial');
      const p = document.createElement('p');
      p.setAttribute('role', 'status');
      p.textContent = text;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'primary tutorial-action';
      b.textContent = label;
      el.append(p, b);
      document.body.appendChild(el);
      const remove = own(() => el.remove());
      b.focus();
      return new Promise<void>((resolve) =>
        b.addEventListener('click', () => {
          remove();
          resolve();
        }),
      );
    },
    /** Comic bubble that follows the own figure; returns its remover. */
    bubble(text: string, mood: BubbleMood): () => void {
      const el = createBubble(text, mood);
      el.classList.add('tutorial-bubble');
      document.body.appendChild(el);
      let frame = 0;
      const place = (): void => {
        const at = village()?.figureScreen() ?? null;
        el.hidden = at === null;
        if (at) positionBubble(el, at);
      };
      const loop = (): void => {
        place();
        frame = window.requestAnimationFrame?.(loop) ?? 0;
      };
      loop();
      return own(() => {
        if (frame) window.cancelAnimationFrame?.(frame);
        el.remove();
      });
    },
    cleanup(): void {
      for (const c of [...cleanups]) c();
    },
  };
}

type Ui = ReturnType<typeof createUi>;

/** Repeats an RPC until it works; between tries a card shows the German message and a retry button. */
async function untilOk<T>(ui: Ui, call: () => Promise<Result<T>>): Promise<T> {
  for (;;) {
    const res = await ui.guard(safe(call));
    if (res.ok) return res.value;
    await ui.guard(ui.card(res.message, RETRY, 'error'));
  }
}

/** Runs the tutorial from the current server step. Resolves at the end (or silently on abort). */
export async function runTutorial(ctx: TutorialContext): Promise<void> {
  let state = ctx.state;
  if (!state.needed || state.step === 'done') return;
  const api = ctx.api ?? tutorialApi(ctx.supabase);
  const reduced = ctx.reducedMotion ?? prefersReducedMotion;
  let village: TutorialVillage | null = null;
  const ui = createUi(ctx.signal, () => village);
  let finished = false;

  try {
    // 1. figure (only when none is saved) and plot
    if (state.step === 'intro') {
      if (state.character === null) await ui.guard(pickCharacter(ui, api));
      state = await untilOk(ui, () => api.start());
    }

    // 2. the village with the own plot; the figure waits in front of the house slot
    village = await ui.guard(ctx.village());
    village.placeFigure();
    const guide = village.byte;

    // 3. camera flight, sad bubble, two messages
    if (state.step === 'intro') {
      if (guide) {
        await ui.guard(village.flyMarket?.(reduced()) ?? Promise.resolve());
        await ui.guard(guide.ask('hello'));
        await ui.guard(guide.ask('welcome'));
        await ui.guard(guide.ask('ready'));
        guide.atPlot();
      }
      await ui.guard(village.flyIntro(reduced()));
      const sad = ui.bubble(SAD_TEXT, 'sad');
      if (guide) {
        for (const key of ['ruin', 'quests', 'coins'] as const) await ui.guard(guide.ask(key));
      } else for (const text of MESSAGES) await ui.guard(ui.card(text, NEXT));
      // continueTutorial answers ok after errcode 22023 with a re-read state; if that is still
      // 'intro' (stale read), do not skip ahead: show the retry card and ask again
      state = await untilOk(ui, async () => {
        const r = await api.continueIntro();
        if (r.ok && r.value.step === 'intro') return { ok: false, message: NETWORK_ERROR };
        return r;
      });
      sad();
    } else {
      guide?.atPlot();
      // resume: a short, calm move to the own plot
      await ui.guard(village.flyIntro(true));
    }

    // 4. quiz: the server knows the current question
    if (state.step === 'quiz') {
      guide?.hideBubble();
      village.pauseForQuiz?.(true);
      const quiz = openQuiz({
        api,
        onCoins: (c) => ctx.onCoins(c),
        sound: ctx.sound,
        reducedMotion: reduced,
      });
      const close = ui.own(() => {
        quiz.close();
        village?.pauseForQuiz?.(false);
      });
      await ui.guard(quiz.done);
      close();
      state = { ...state, step: 'buy', answered: 5 };
    }

    // 5. buy the house (also when the shop is closed)
    if (state.step === 'buy') {
      guide?.say('buy');
      await ui.guard(buyHouse(ui, api, ctx));
      guide?.hideBubble();
      state = { ...state, step: 'place' };
    }

    // 6. place it in the house slot (also when building is closed)
    if (state.step === 'place') {
      guide?.pointHouse();
      const v = village;
      for (;;) {
        const res = await ui.guard(
          v.placeHouse(async () => {
            const r = await safe(() => api.placeHouse());
            return r.ok ? { ok: true } : r;
          }),
        );
        if (res.ok) break;
        await ui.guard(ui.card(res.message, RETRY, 'error'));
      }
      state = { ...state, step: 'done', needed: false };
    }

    // 7. closing scene: closer camera, one dance, the final line, then the Daily Quests
    await ui.guard(village.flyCloseUp(reduced()));
    guide?.react('celebrate');
    const happy = guide ? () => guide.hideBubble() : ui.bubble(FINAL_TEXT, 'happy');
    const dance = village.danceOnce();
    const finish = safe(() => api.finish());
    await ui.guard(dance);
    guide?.say('final');
    await ui.guard(new Promise((r) => setTimeout(r, ctx.endPauseMs ?? 1500)));
    happy();
    let result = await ui.guard(finish);
    while (!result.ok) {
      await ui.guard(ui.card(result.message, RETRY, 'error'));
      result = await ui.guard(safe(() => api.finish()));
    }
    if (result.ok && result.value.progress && ctx.onProgress)
      await ui.guard(ctx.onProgress(result.value.progress));
    finished = true;
  } catch (err) {
    if (!(err instanceof Aborted)) console.error('tutorial stopped', err);
  } finally {
    ui.cleanup();
    village?.releaseFigure();
    village?.byte?.restore();
    village?.pauseForQuiz?.(false);
  }
  if (finished && !ctx.signal?.aborted) ctx.openDailyQuests();
}

/** Required figure choice; resolves after the server saved it. */
function pickCharacter(ui: Ui, api: TutorialApi): Promise<void> {
  return new Promise<void>((resolve) => {
    let picked = false;
    const modal = openCharacterPicker({
      required: true,
      current: null,
      onPick: async (kind) => {
        let res: { ok: true } | { ok: false; message: string };
        try {
          res = await api.saveCharacter(kind);
        } catch {
          res = { ok: false, message: NETWORK_ERROR };
        }
        if (!res.ok) return res.message;
        picked = true;
        // the picker closes itself after this returns
        setTimeout(() => {
          release();
          resolve();
        }, 0);
        return null;
      },
    });
    const release = ui.own(() => {
      if (!picked) modal.close();
    });
  });
}

function buyHouse(ui: Ui, api: TutorialApi, ctx: TutorialContext): Promise<void> {
  return new Promise<void>((resolve) => {
    const area = openTutorialBuy({
      title: BUY_TITLE,
      text: BUY_TEXT,
      button: BUY_BUTTON,
      thumbs: ctx.thumbs,
      buy: () => safe(() => api.buyHouse()),
      onBought: (coins) => {
        ctx.onCoins(coins);
        close();
        resolve();
      },
    });
    const close = ui.own(() => area.close());
  });
}
