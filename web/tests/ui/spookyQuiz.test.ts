// @vitest-environment happy-dom
// Package S3: tablet tap quiz. One tap sends one answer; no dropdowns, inputs or check buttons.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSpookyQuiz } from '../../src/season/spookyQuizView';
import {
  StarterClosedError,
  type StarterAnswer,
  type StarterApi,
  type StarterQuestion,
  type StarterState,
} from '../../src/api/seasonStarter';
import { listeningPath } from '../../src/quests/listening';
import { setLocale } from '../../src/i18n';

const q = (id: string, solved = false, extra: Partial<StarterQuestion> = {}): StarterQuestion => ({
  id,
  kind: 'odd-one-out',
  type: 'choice',
  prompt: `Prompt ${id}`,
  options: ['alpha', 'beta', 'gamma'],
  solved,
  attempts: solved ? 1 : 0,
  ...extra,
});
const listen = (): StarterQuestion =>
  q('listen', false, {
    kind: 'listening-meaning',
    type: 'listening',
    prompt: 'Listen. Welche deutsche Bedeutung passt?',
    speak: 'Happy Halloween!',
    options: ['Fröhliches Halloween!', 'Guten Rutsch!', 'Alles Gute!'],
  });
function state(overrides: Partial<StarterState> = {}): StarterState {
  return {
    seasonId: 's1',
    state: 'running',
    solved: 1,
    total: 3,
    awardedXp: 10,
    completed: false,
    questions: [q('first', true), q('second'), listen()],
    ...overrides,
  };
}
function result(overrides: Partial<StarterAnswer> = {}): StarterAnswer {
  return {
    correct: true,
    alreadySolved: false,
    hint: null,
    solved: 2,
    total: 3,
    completed: false,
    awardedXp: 10,
    completionBonusXp: 0,
    seasonXp: 20,
    reachedTier: 0,
    progress: { gained: [{ reason: 'quest', xp: 10 }], xp: 20, level: 1, levelBefore: 1, newChests: 0 },
    ...overrides,
  };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const dialog = () => document.querySelector<HTMLElement>('[role=dialog]')!;
const options = () => Array.from(dialog().querySelectorAll<HTMLButtonElement>('.spooky-option'));
const status = () => dialog().querySelector('.spooky-status')?.textContent ?? '';

class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  currentTime = 0;
  paused = true;
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  private listeners = new Map<string, () => void>();
  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners.set(type, fn);
  }
  removeEventListener(type: string) {
    this.listeners.delete(type);
  }
  emit(type: string) {
    this.listeners.get(type)?.();
  }
  get listenerCount() {
    return this.listeners.size;
  }
}

function setup(opts: { st?: StarterState; answer?: StarterApi['answer'] } = {}) {
  FakeAudio.made = [];
  const api: StarterApi = {
    state: vi.fn().mockResolvedValue(opts.st ?? state()),
    answer: opts.answer ?? vi.fn().mockResolvedValue(result()),
  };
  const openLearnPass = vi.fn();
  const onProgress = vi.fn();
  const quiz = openSpookyQuiz({
    api,
    seasonId: 's1',
    openLearnPass,
    onProgress,
    createAudio: (src) => new FakeAudio(src) as unknown as HTMLAudioElement,
  });
  return { api, quiz, openLearnPass, onProgress };
}

afterEach(() => document.body.replaceChildren());

describe('spooky quiz view', () => {
  it('starts at the first open question with big answer buttons only', async () => {
    setup();
    await tick();
    expect(dialog().textContent).toContain('Frage 2 von 3');
    expect(dialog().textContent).toContain('Prompt second');
    expect(options().map((b) => b.textContent)).toEqual(['alpha', 'beta', 'gamma']);
    expect(dialog().querySelector('select, input, textarea, [type=checkbox], [type=radio]')).toBeNull();
    expect(dialog().querySelector('.spooky-next')).toBeNull();
  });

  it('sends one tap at once, locks the answers while pending and reports the server XP', async () => {
    let finish!: (r: StarterAnswer) => void;
    const answer = vi.fn(() => new Promise<StarterAnswer>((resolve) => (finish = resolve)));
    const { onProgress } = setup({ answer });
    await tick();
    options()[1].click();
    options()[2].click();
    expect(answer).toHaveBeenCalledTimes(1);
    expect(answer).toHaveBeenCalledWith('s1', 'second', 'beta');
    expect(options().every((b) => b.disabled)).toBe(true);
    finish(result());
    await tick();
    expect(status()).toContain('Richtig! +10 XP');
    expect(options()[1].textContent).toContain('✓');
    expect(onProgress).toHaveBeenCalledOnce();
    const next = dialog().querySelector<HTMLButtonElement>('.spooky-next')!;
    next.click();
    expect(dialog().textContent).toContain('Frage 3 von 3');
  });

  it('shows the hint after a wrong answer and lets the pupil try again', async () => {
    const answer = vi
      .fn()
      .mockResolvedValue(
        result({ correct: false, hint: 'Look for -er.', awardedXp: 0, solved: 1, progress: null }),
      );
    const { onProgress } = setup({ answer });
    await tick();
    options()[0].click();
    await tick();
    expect(status()).toContain('Look for -er.');
    expect(status()).not.toContain('XP');
    expect(options()[0].disabled).toBe(true);
    expect(options()[1].disabled).toBe(false);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('keeps the attempt open after a network error without pretending success', async () => {
    const answer = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(result());
    setup({ answer });
    await tick();
    options()[1].click();
    await tick();
    expect(status()).toMatch(/Verbindung/);
    expect(status()).not.toContain('XP');
    expect(options().every((b) => !b.disabled)).toBe(true);
    options()[1].click();
    await tick();
    expect(status()).toContain('+10 XP');
  });

  it('plays the local clip only on tap and stops it when the question changes', async () => {
    setup({ st: state({ questions: [q('first', true), listen(), q('third')] }) });
    await tick();
    expect(FakeAudio.made).toHaveLength(0);
    expect(dialog().textContent).not.toContain('Happy Halloween!');
    dialog().querySelector<HTMLButtonElement>('.spooky-play')!.click();
    expect(FakeAudio.made).toHaveLength(1);
    expect(FakeAudio.made[0].src).toContain(listeningPath('Happy Halloween!'));
    expect(FakeAudio.made[0].play).toHaveBeenCalledOnce();
    options()[0].click();
    await tick();
    dialog().querySelector<HTMLButtonElement>('.spooky-next')!.click();
    expect(FakeAudio.made[0].pause).toHaveBeenCalled();
    expect(FakeAudio.made[0].currentTime).toBe(0);
    expect(FakeAudio.made[0].listenerCount).toBe(0);
  });

  it('offers a retry and the English text when the clip cannot play', async () => {
    setup({ st: state({ questions: [q('first', true), listen()] }) });
    await tick();
    dialog().querySelector<HTMLButtonElement>('.spooky-play')!.click();
    FakeAudio.made[0].emit('error');
    expect(status()).toMatch(/Audio/);
    dialog().querySelector<HTMLButtonElement>('.spooky-text')!.click();
    expect(dialog().textContent).toContain('Happy Halloween!');
  });

  it('shows 150 XP and the tier only as the server confirms them and opens the real pass', async () => {
    const answer = vi.fn().mockResolvedValue(
      result({
        solved: 3,
        completed: true,
        awardedXp: 60,
        completionBonusXp: 50,
        seasonXp: 150,
        reachedTier: 5,
      }),
    );
    const { openLearnPass } = setup({
      st: state({ solved: 2, awardedXp: 90, questions: [q('first', true), q('second', true), q('third')] }),
      answer,
    });
    await tick();
    options()[0].click();
    await tick();
    expect(status()).toContain('+60 XP');
    // the last question pops up the big „Geschafft!“ with confetti
    expect(document.querySelector('.celebration.spooky .celebration-title')?.textContent).toBe('Geschafft!');
    dialog().querySelector<HTMLButtonElement>('.spooky-next')!.click();
    expect(dialog().textContent).toContain('150 XP verdient · Tier 5 erreicht');
    dialog().querySelector<HTMLButtonElement>('[data-open-pass]')!.click();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(openLearnPass).toHaveBeenCalledOnce();
  });

  it('opens a finished quiz on its summary and a planned season without questions', async () => {
    setup({
      st: state({
        solved: 3,
        completed: true,
        awardedXp: 150,
        questions: [q('a', true), q('b', true), q('c', true)],
      }),
    });
    await tick();
    expect(dialog().textContent).toContain('150 XP');
    expect(options()).toHaveLength(0);
    document.body.replaceChildren();
    setup({ st: state({ state: 'upcoming', solved: 0 }) });
    await tick();
    expect(dialog().textContent).toMatch(/startet/);
    expect(options()).toHaveLength(0);
  });

  it('reports a season that ended while answering', async () => {
    setup({ answer: vi.fn().mockRejectedValue(new StarterClosedError('season not running')) });
    await tick();
    options()[0].click();
    await tick();
    expect(status()).toMatch(/Season/);
    expect(options().every((b) => b.disabled)).toBe(true);
  });

  it('stops audio and drops everything on close', async () => {
    const { quiz } = setup({ st: state({ questions: [q('first', true), listen()] }) });
    await tick();
    dialog().querySelector<HTMLButtonElement>('.spooky-play')!.click();
    quiz.close();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    expect(FakeAudio.made[0].pause).toHaveBeenCalled();
    expect(FakeAudio.made[0].listenerCount).toBe(0);
  });

  it('speaks English by default for players but keeps the German meanings unchanged', async () => {
    setLocale('en');
    setup({ st: state({ questions: [q('first', true), listen()] }) });
    await tick();
    expect(dialog().textContent).toContain('Question 2 of 2');
    expect(dialog().querySelector('.spooky-play')?.textContent).toBe('▶ Listen');
    expect(options()[0].textContent).toBe('Fröhliches Halloween!');
    options()[0].click();
    await tick();
    expect(status()).toContain('Correct! +10 XP');
  });

  it('brings Sir Byte along: greeting, thinking, praise or help, listening and the final line', async () => {
    FakeAudio.made = [];
    const fake = {
      el: Object.assign(document.createElement('figure'), { className: 'byte-stage' }),
      say: vi.fn(),
      thinking: vi.fn(),
      answer: vi.fn().mockResolvedValue(undefined),
      listen: vi.fn(),
      dispose: vi.fn(),
    };
    const answer = vi
      .fn()
      .mockResolvedValueOnce(result({ correct: false, hint: 'Hint', awardedXp: 0, progress: null }))
      .mockResolvedValueOnce(
        result({
          solved: 2,
          completed: true,
          awardedXp: 60,
          completionBonusXp: 50,
          seasonXp: 150,
          reachedTier: 5,
        }),
      );
    const quiz = openSpookyQuiz({
      api: {
        state: vi.fn().mockResolvedValue(state({ questions: [q('first', true), listen()], total: 2 })),
        answer,
      },
      seasonId: 's1',
      openLearnPass: vi.fn(),
      createAudio: (src) => new FakeAudio(src) as unknown as HTMLAudioElement,
      companion: () => fake as never,
    });
    await tick();
    expect(dialog().querySelector('.spooky-with-byte .byte-stage')).toBe(fake.el);
    expect(fake.say).toHaveBeenCalledWith('spooky');
    dialog().querySelector<HTMLButtonElement>('.spooky-play')!.click();
    expect(fake.listen).toHaveBeenCalledOnce();
    options()[1].click();
    expect(fake.thinking).toHaveBeenCalledOnce();
    await tick();
    expect(fake.answer).toHaveBeenLastCalledWith('spooky-listen', false);
    options()[0].click();
    await tick();
    expect(fake.answer).toHaveBeenLastCalledWith('spooky-listen', true);
    dialog().querySelector<HTMLButtonElement>('.spooky-next')!.click();
    expect(fake.say).toHaveBeenLastCalledWith('spookyDone');
    quiz.close();
    expect(fake.dispose).toHaveBeenCalledOnce();
  });
});
