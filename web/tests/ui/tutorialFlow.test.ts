// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { continueTutorial, type TutorialState } from '../../src/api/tutorial';

vi.mock('../../src/quests/speech', () => ({
  speakEnglish: vi.fn().mockResolvedValue(true),
  loadVoices: vi.fn().mockResolvedValue([]),
}));
import { runTutorial, type TutorialApi, type TutorialVillage } from '../../src/ui/tutorial/flow';
import { FINAL_TEXT, MESSAGES } from '../../src/ui/tutorial/messages';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
async function until(cond: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (cond()) return;
    await tick();
  }
  throw new Error(`timed out waiting for ${what}`);
}
const buttons = (): HTMLButtonElement[] => Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
const button = (label: string): HTMLButtonElement | undefined =>
  buttons().find((b) => b.textContent?.trim() === label && !b.closest('[hidden]'));
async function click(label: string): Promise<void> {
  await until(() => Boolean(button(label)), `button ${label}`);
  button(label)?.click();
  await tick();
}

const SECRET = 'secretsolution';

/** A fake server with the step rules of migration 0019 (simplified). */
function fakeServer(init: Partial<TutorialState> & { failNext?: string[] } = {}) {
  const log: string[] = [];
  const s = {
    step: init.step ?? 'intro',
    plotIndex: init.plotIndex ?? null,
    character: init.character ?? null,
    answered: init.answered ?? 0,
    coins: 0,
  } as {
    step: TutorialState['step'];
    plotIndex: number | null;
    character: TutorialState['character'];
    answered: number;
    coins: number;
  };
  const fail = new Set(init.failNext ?? []);
  const failOnce = (name: string): boolean => {
    if (!fail.has(name)) return false;
    fail.delete(name);
    log.push(`${name}:error`);
    return true;
  };
  const err = { ok: false as const, message: 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.' };
  const state = (): TutorialState => ({
    needed: s.step !== 'done',
    step: s.step,
    plotIndex: s.plotIndex,
    character: s.character,
    answered: s.answered,
  });
  const api: TutorialApi = {
    saveCharacter: async (k) => {
      log.push('character');
      s.character = k;
      return { ok: true };
    },
    start: async () => {
      if (failOnce('start')) return err;
      log.push('start');
      s.plotIndex ??= 0;
      return { ok: true, value: state() };
    },
    continueIntro: async () => {
      log.push('continue');
      s.step = 'quiz';
      return { ok: true, value: state() };
    },
    question: async () => {
      log.push(`question${s.answered + 1}`);
      const nr = s.answered + 1;
      return {
        ok: true,
        value:
          nr === 2
            ? { nr, total: 5, type: 'gap', prompt: 'My name ___ Tom.', data: {} }
            : { nr, total: 5, type: 'choice', prompt: `Question ${nr}`, data: { options: ['yes', 'no'] } },
      };
    },
    answer: async (nr, a) => {
      if (failOnce('answer')) return err;
      log.push(`answer${nr}`);
      const right = nr === 2 ? a === SECRET : a === 'yes';
      if (!right)
        return {
          ok: true,
          value: { correct: false, hint: 'Think again.', answered: s.answered, done: false, coins: s.coins },
        };
      s.answered += 1;
      if (s.answered === 5) {
        s.coins += 50;
        s.step = 'buy';
      }
      return {
        ok: true,
        value: { correct: true, hint: null, answered: s.answered, done: s.answered === 5, coins: s.coins },
      };
    },
    buyHouse: async () => {
      if (failOnce('buy')) return err;
      log.push('buy');
      s.coins -= 50;
      s.step = 'place';
      return { ok: true, value: { coins: s.coins, qty: 1 } };
    },
    placeHouse: async () => {
      log.push('place');
      s.step = 'done';
      return { ok: true, value: 7 };
    },
    finish: async () => {
      log.push('finish');
      return { ok: true, value: state() };
    },
  };
  const village: TutorialVillage = {
    flyIntro: async (reduced) => void log.push(reduced ? 'camera:reduced' : 'camera'),
    flyCloseUp: async () => void log.push('closeup'),
    placeFigure: () => void log.push('figure'),
    releaseFigure: () => void log.push('release'),
    danceOnce: async () => {
      log.push('dance');
      // the final line is visible while the figure dances
      log.push(document.body.textContent?.includes(FINAL_TEXT) ? 'final-bubble' : 'no-bubble');
    },
    figureScreen: () => ({ x: 200, y: 200 }),
    placeHouse: async (place) => {
      log.push('build-mode');
      const r = await place();
      return r.ok ? { ok: true, value: true } : r;
    },
  };
  return { log, s, api, village, state };
}

function run(f: ReturnType<typeof fakeServer>, extra: { signal?: AbortSignal } = {}) {
  const onCoins = vi.fn();
  const openDailyQuests = vi.fn(() => f.log.push('daily'));
  const villageFn = vi.fn(async () => {
    f.log.push('village');
    return f.village;
  });
  const done = runTutorial({
    supabase: {} as SupabaseClient,
    state: f.state(),
    api: f.api,
    village: villageFn,
    onCoins,
    openDailyQuests,
    reducedMotion: () => false,
    thumbs: async () => null,
    endPauseMs: 0,
    ...extra,
  });
  return { done, onCoins, openDailyQuests, villageFn };
}

async function answerAll(from: number): Promise<void> {
  for (let nr = from; nr <= 5; nr++) {
    await until(() => document.querySelector('h2')?.textContent === `Frage ${nr} von 5`, `question ${nr}`);
    if (nr === 2) {
      const input = document.querySelector<HTMLInputElement>('#gap');
      if (input) {
        input.value = SECRET;
        input.dispatchEvent(new Event('input'));
      }
    } else {
      const yes = document.querySelector<HTMLInputElement>('input[value="yes"]');
      if (yes) {
        yes.checked = true;
        yes.dispatchEvent(new Event('change'));
      }
    }
    await click('Prüfen');
    await click('Weiter');
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('runTutorial', () => {
  it('uses the English guide, pauses the village during the quiz and restores Byte on abort', async () => {
    const f = fakeServer({ character: 'boy', plotIndex: 0 });
    const byte = {
      ask: vi.fn(async (_key: string) => {}),
      say: vi.fn(),
      react: vi.fn(),
      atPlot: vi.fn(),
      pointHouse: vi.fn(),
      hideBubble: vi.fn(),
      restore: vi.fn(),
    };
    f.village.byte = byte;
    f.village.flyMarket = vi.fn(async () => {});
    f.village.pauseForQuiz = vi.fn();
    const abort = new AbortController();
    const r = run(f, { signal: abort.signal });
    await until(() => document.querySelector('.tutorial-quiz') !== null, 'quiz with guide');
    expect(byte.ask.mock.calls.map((c) => c[0])).toEqual([
      'hello',
      'welcome',
      'ready',
      'ruin',
      'quests',
      'coins',
    ]);
    expect(f.village.pauseForQuiz).toHaveBeenCalledWith(true);
    abort.abort();
    await r.done;
    expect(byte.restore).toHaveBeenCalledOnce();
    expect(f.village.pauseForQuiz).toHaveBeenLastCalledWith(false);
    expect(document.querySelector('.byte-stage')).toBeNull();
  });
  it('awaits confirmed tutorial XP feedback after dancing before opening quests', async () => {
    const f = fakeServer({ step: 'place', character: 'boy', plotIndex: 0 });
    f.api.finish = async () => ({
      ok: true,
      value: {
        ...f.state(),
        progress: {
          gained: [{ reason: 'tutorial', xp: 50 }],
          xp: 50,
          level: 2,
          levelBefore: 1,
          newChests: 1,
        },
      },
    });
    let finishFeedback: () => void = () => undefined;
    const onProgress = vi.fn(
      () =>
        new Promise<void>((r) => {
          finishFeedback = r;
        }),
    );
    const openDailyQuests = vi.fn();
    const done = runTutorial({
      supabase: {} as SupabaseClient,
      state: f.state(),
      api: f.api,
      village: async () => f.village,
      onCoins: vi.fn(),
      openDailyQuests,
      onProgress,
      endPauseMs: 0,
    });
    await until(() => onProgress.mock.calls.length === 1, 'XP celebration');
    expect(f.log).toContain('dance');
    expect(openDailyQuests).not.toHaveBeenCalled();
    finishFeedback();
    await done;
    expect(openDailyQuests).toHaveBeenCalledTimes(1);
  });
  it('runs character -> start -> camera -> messages -> quiz -> buy -> place -> dance -> daily', async () => {
    const f = fakeServer();
    const r = run(f);
    await until(() => document.querySelectorAll('.character-choice').length > 0, 'picker');
    document.querySelector<HTMLButtonElement>('.character-choice')?.click();
    for (const text of MESSAGES) {
      await until(() => document.querySelector('.tutorial-card')?.textContent?.includes(text) ?? false, text);
      await click('Weiter');
    }
    await answerAll(1);
    await click('Haus kaufen');
    await r.done;
    const steps = f.log.filter((x) =>
      ['character', 'start', 'camera', 'continue', 'question1', 'buy', 'place', 'dance', 'daily'].includes(x),
    );
    expect(steps).toEqual([
      'character',
      'start',
      'camera',
      'continue',
      'question1',
      'buy',
      'place',
      'dance',
      'daily',
    ]);
    expect(f.log).toContain('final-bubble');
    expect(f.log).toContain('release');
    expect(f.log).toContain('finish');
    expect(r.onCoins).toHaveBeenCalledWith(50);
    expect(r.onCoins).toHaveBeenLastCalledWith(0);
    // nothing of the tutorial is left on screen
    expect(document.querySelector('.tutorial-card, .speech-bubble, .overlay')).toBeNull();
  });

  it('skips the figure choice when a figure is saved', async () => {
    const f = fakeServer({ character: 'girl' });
    run(f);
    await until(() => f.log.includes('camera'), 'camera');
    expect(f.log).not.toContain('character');
    expect(document.querySelector('.character-choice')).toBeNull();
    expect(f.log.slice(0, 3)).toEqual(['start', 'village', 'figure']);
  });

  it('needs „Weiter“ for every message', async () => {
    const f = fakeServer({ character: 'boy' });
    run(f);
    await until(() => document.querySelector('.tutorial-card') !== null, 'first card');
    expect(document.querySelector('.tutorial-card')?.textContent).toContain(MESSAGES[0]);
    await tick();
    await tick();
    expect(f.log).not.toContain('continue');
    await click('Weiter');
    await until(
      () => document.querySelector('.tutorial-card')?.textContent?.includes(MESSAGES[1]) ?? false,
      'second',
    );
    expect(f.log).not.toContain('continue');
    // the sad bubble stands at the figure meanwhile
    expect(document.querySelector('.speech-bubble--sad')).not.toBeNull();
    await click('Weiter');
    await until(() => f.log.includes('continue'), 'continue');
  });

  it('resumes the quiz at question 3 after a reload', async () => {
    const f = fakeServer({ step: 'quiz', answered: 2, character: 'boy', plotIndex: 4 });
    run(f);
    await until(() => document.querySelector('h2')?.textContent === 'Frage 3 von 5', 'question 3');
    expect(f.log).not.toContain('start');
    expect(f.log).not.toContain('continue');
    expect(f.log).toContain('camera:reduced');
    expect(f.log).not.toContain('question1');
  });

  it('a wrong answer shows the hint, allows a retry and never shows the solution', async () => {
    const f = fakeServer({ step: 'quiz', answered: 1, character: 'boy', plotIndex: 0 });
    run(f);
    await until(() => document.querySelector('#gap') !== null, 'gap form');
    const input = document.querySelector<HTMLInputElement>('#gap') as HTMLInputElement;
    input.value = 'are';
    input.dispatchEvent(new Event('input'));
    await click('Prüfen');
    await until(() => document.body.textContent?.includes('Think again.') ?? false, 'hint');
    expect(document.body.textContent).not.toContain(SECRET);
    expect(button('Prüfen')?.disabled).toBe(false);
    input.value = SECRET;
    input.dispatchEvent(new Event('input'));
    await click('Prüfen');
    await until(() => document.body.textContent?.includes('Richtig!') ?? false, 'correct');
    expect(f.s.answered).toBe(2);
  });

  it('a network error shows a message and keeps the button usable, without losing the step', async () => {
    const f = fakeServer({ step: 'quiz', answered: 0, character: 'boy', plotIndex: 0, failNext: ['answer'] });
    run(f);
    await until(() => document.querySelector('input[value="yes"]') !== null, 'choice');
    const yes = document.querySelector<HTMLInputElement>('input[value="yes"]') as HTMLInputElement;
    yes.checked = true;
    yes.dispatchEvent(new Event('change'));
    await click('Prüfen');
    await until(() => document.body.textContent?.includes('Bitte noch einmal versuchen') ?? false, 'error');
    expect(f.s.answered).toBe(0);
    expect(document.querySelector('h2')?.textContent).toBe('Frage 1 von 5');
    expect(button('Prüfen')?.disabled).toBe(false);
    await click('Prüfen');
    await until(() => f.s.answered === 1, 'answered after retry');
  });

  it('retries a failed start and a failed purchase with a German message', async () => {
    const f = fakeServer({ character: 'boy', failNext: ['start'] });
    run(f);
    await until(
      () => document.body.textContent?.includes('Bitte noch einmal versuchen') ?? false,
      'start error',
    );
    expect(f.log).not.toContain('village');
    await click('Noch einmal versuchen');
    await until(() => f.log.includes('camera'), 'camera after retry');

    document.body.innerHTML = '';
    const g = fakeServer({ step: 'buy', character: 'boy', plotIndex: 0, failNext: ['buy'] });
    const r = run(g);
    await click('Haus kaufen');
    await until(
      () => document.body.textContent?.includes('Bitte noch einmal versuchen') ?? false,
      'buy error',
    );
    expect(g.s.step).toBe('buy');
    expect(button('Haus kaufen')?.disabled).toBe(false);
    await click('Haus kaufen');
    await r.done;
    expect(g.log).toEqual(expect.arrayContaining(['buy:error', 'buy', 'place', 'dance', 'daily']));
  });

  it('the buy dialog shows the Fachwerkhaus for 50 coins', async () => {
    const f = fakeServer({ step: 'buy', character: 'boy', plotIndex: 0 });
    run(f);
    await until(() => Boolean(button('Haus kaufen')), 'buy dialog');
    const text = document.querySelector('.tutorial-buy')?.textContent ?? '';
    expect(text).toContain('Fachwerkhaus');
    expect(text).toContain('50 Münzen');
    expect(document.querySelector('.tutorial-buy button')?.textContent).toBe('Haus kaufen');
  });

  it('does not run when no tutorial is needed', async () => {
    const f = fakeServer({ step: 'done', character: 'boy', plotIndex: 0 });
    const r = run(f);
    await r.done;
    expect(r.villageFn).not.toHaveBeenCalled();
    expect(r.openDailyQuests).not.toHaveBeenCalled();
    expect(f.log).toEqual([]);
  });

  it('stops and cleans up on abort (logout)', async () => {
    const f = fakeServer({ character: 'boy' });
    const ac = new AbortController();
    const r = run(f, { signal: ac.signal });
    await until(() => document.querySelector('.tutorial-card') !== null, 'card');
    ac.abort();
    await r.done;
    expect(document.querySelector('.tutorial-card, .speech-bubble')).toBeNull();
    expect(f.log).toContain('release');
    expect(r.openDailyQuests).not.toHaveBeenCalled();
  });

  describe('runTutorial resume and replay', () => {
    it('step buy (coins already granted) goes straight to the buy dialog, then place', async () => {
      const f = fakeServer({ step: 'buy', character: 'boy', plotIndex: 0, answered: 5 });
      f.s.coins = 50;
      const r = run(f);
      await until(() => Boolean(button('Haus kaufen')), 'buy dialog');
      expect(f.log).not.toContain('continue');
      expect(f.log).not.toContain('question1');
      expect(document.querySelector('h2')?.textContent).not.toMatch(/^Frage/);
      await click('Haus kaufen');
      await r.done;
      const steps = f.log.filter((x) => ['buy', 'build-mode', 'place', 'dance', 'daily'].includes(x));
      expect(steps).toEqual(['buy', 'build-mode', 'place', 'dance', 'daily']);
    });

    it('step place with the house bought goes straight to the guided placement', async () => {
      const f = fakeServer({ step: 'place', character: 'boy', plotIndex: 0, answered: 5 });
      const r = run(f);
      await r.done;
      expect(f.log).not.toContain('buy');
      const steps = f.log.filter((x) => ['build-mode', 'place', 'dance', 'daily'].includes(x));
      expect(steps).toEqual(['build-mode', 'place', 'dance', 'daily']);
    });

    it('lost response after placing: server already at done, the replayed placement still ends with dance, bubble and finish', async () => {
      // the client never got the answer of tutorial_place_house; the state it read still said "place"
      const f = fakeServer({ step: 'place', character: 'boy', plotIndex: 0, answered: 5 });
      const r = run(f); // the state is read here: still "place"
      f.s.step = 'done';
      await r.done;
      expect(f.log).toEqual(expect.arrayContaining(['place', 'dance', 'final-bubble', 'finish', 'daily']));
    });

    it('a stale read after tutorial_continue (errcode 22023, still intro) does not skip ahead', async () => {
      const f = fakeServer({ character: 'boy' });
      let calls = 0;
      const real = f.api.continueIntro;
      f.api.continueIntro = async () => {
        calls += 1;
        if (calls === 1) return { ok: true, value: { ...f.state(), step: 'intro' } };
        return real();
      };
      run(f);
      for (let i = 0; i < MESSAGES.length; i++) await click('Weiter');
      await until(
        () => document.body.textContent?.includes('Bitte noch einmal versuchen') ?? false,
        'retry card',
      );
      expect(f.log).not.toContain('question1');
      expect(f.log).not.toContain('buy');
      await click('Noch einmal versuchen');
      await until(() => document.querySelector('h2')?.textContent === 'Frage 1 von 5', 'question 1');
      expect(calls).toBe(2);
    });

    it('tutorial_continue answering 22023 is treated as success with the re-read state', async () => {
      const f = fakeServer({ character: 'boy' });
      const rpc = vi.fn(async (fn: string) => {
        if (fn === 'tutorial_continue') {
          f.s.step = 'quiz'; // the first call went through, only its answer was lost
          return { data: null, error: { message: 'wording', code: '22023' } };
        }
        if (fn === 'tutorial_state')
          return {
            data: { needed: true, step: 'quiz', plot_index: 0, character: 'boy', answered: 0 },
            error: null,
          };
        return { data: null, error: { message: 'unexpected', code: '00000' } };
      });
      const onCoins = vi.fn();
      void runTutorial({
        supabase: { rpc } as unknown as SupabaseClient,
        state: f.state(),
        api: {
          ...f.api,
          continueIntro: () => continueTutorial({ rpc } as unknown as SupabaseClient, 'intro'),
        },
        village: async () => f.village,
        onCoins,
        openDailyQuests: () => undefined,
        reducedMotion: () => false,
        thumbs: async () => null,
        endPauseMs: 0,
      });
      for (let i = 0; i < MESSAGES.length; i++) await click('Weiter');
      await until(() => document.querySelector('h2')?.textContent === 'Frage 1 von 5', 'quiz after replay');
      expect(rpc).toHaveBeenCalledWith('tutorial_state', undefined);
    });
  });
});
