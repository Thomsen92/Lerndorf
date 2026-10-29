// @vitest-environment happy-dom
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
const speakEnglish = vi.fn().mockResolvedValue(true);
vi.mock('../../src/quests/speech', () => ({ speakEnglish: (...a: unknown[]) => speakEnglish(...a) }));
import { openSpellingBee } from '../../src/minigames/spellingBee/spellingBeeView';
import type { SpellingApi, SpellingState } from '../../src/api/spellingBee';

const hash = (w: string) =>
  createHash('sha256').update(`lerndorf-spelling:3:${w}`).digest('hex').slice(0, 16);
const state = (rewardedLeft = 3, tutorial = false, golden = 'alligator'): SpellingState => ({
  day: '2026-10-28',
  puzzle: {
    id: 3,
    center: 'l',
    letters: ['a', 'g', 'i', 'o', 'r', 't'],
    wordCount: 3,
    maxPoints: 22,
    hashes: ['tall', 'trail', 'alligator'].map(hash),
    golden: hash(golden),
  },
  roundSeconds: 180,
  freeRounds: 3,
  rewardedLeft,
  tutorial,
  board: {
    week: '2026-10-26',
    top: [{ nickname: 'anna', classId: '8a', score: 12, rank: 1, me: false }],
    me: null,
    all: { top: [{ nickname: 'ben', classId: '8b', score: 40, rank: 1, me: false }], me: null },
    total: { top: [{ nickname: 'cleo', classId: '8a', score: 77, rank: 1, me: false }], me: null },
  },
});
const flush = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
};
const tapWord = (word: string) => {
  for (const c of word) document.querySelector<HTMLButtonElement>(`.bee-cell[data-letter="${c}"]`)!.click();
  document.querySelector<HTMLButtonElement>('[data-enter]')!.click();
};

afterEach(() => document.body.replaceChildren());

describe('spelling bee view', () => {
  it('shows the rules, free rounds and the list; a round checks words and sends them at the end', async () => {
    const finish = vi.fn().mockResolvedValue({
      score: 6,
      words: ['tall', 'trail'],
      maxPoints: 22,
      rewarded: true,
      coinsGained: 2,
      xpGained: 5,
      coins: 30,
      rewardedLeft: 2,
      board: {
        week: '2026-10-26',
        top: [],
        me: { score: 6, rank: 2 },
        all: { top: [], me: null },
        total: { top: [], me: null },
      },
      progress: null,
    });
    const api: SpellingApi = {
      state: vi.fn().mockResolvedValue(state()),
      start: vi.fn().mockResolvedValue({
        round: 9,
        puzzle: 3,
        endsAt: '',
        seconds: 180,
        rewarded: true,
        rewardedLeft: 2,
        tutorial: false,
        hints: [],
      }),
      hint: vi.fn(),
      finish,
    };
    const onCoins = vi.fn();
    const play = vi.fn();
    openSpellingBee({ api, reducedMotion: true, onCoins, sound: { play, enabled: true } });
    await flush();
    const text = document.body.textContent!;
    expect(text).toContain('Heute noch 3 von 3 Runden mit Münzen und XP.');
    expect(text).toContain('anna');
    document.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await flush();
    expect(document.querySelectorAll('.bee-cell')).toHaveLength(7);
    expect(document.querySelector('.bee-cell.center')?.textContent).toBe('L');
    tapWord('tall');
    await flush();
    expect(document.querySelector('.bee-toast')?.textContent).toBe('Gut! +1');
    expect(speakEnglish).toHaveBeenCalledWith('tall');
    expect(play).toHaveBeenCalledWith('ding');
    tapWord('roat');
    await flush();
    expect(document.querySelector('.bee-toast')?.textContent).toBe('Der gelbe Buchstabe fehlt.');
    tapWord('trail');
    await flush();
    expect(document.querySelector('.bee-score')?.textContent).toBe('6 Punkte');
    document.querySelector<HTMLButtonElement>('[data-stop]')!.click();
    await flush();
    expect(finish).toHaveBeenCalledWith(9, ['tall', 'trail']);
    expect(onCoins).toHaveBeenCalledWith(30);
    expect(document.body.textContent).toContain('+2 Münzen · +5 XP');
  });

  it('says when a round only counts for the list', async () => {
    const api: SpellingApi = { state: vi.fn().mockResolvedValue(state(0)), start: vi.fn(), hint: vi.fn(), finish: vi.fn() };
    openSpellingBee({ api, reducedMotion: true });
    await flush();
    expect(document.body.textContent).toContain('Heute gibt es keine Münzen mehr');
  });

  it('guides the practice round: help words, the next letter glows, Delete glows after a wrong letter', async () => {
    const api: SpellingApi = {
      state: vi.fn().mockResolvedValue(state(3, true)),
      start: vi.fn().mockResolvedValue({
        round: 1,
        puzzle: 3,
        endsAt: '',
        seconds: 300,
        rewarded: true,
        rewardedLeft: 3,
        tutorial: true,
        hints: ['tall', 'trail'],
      }),
      hint: vi.fn(),
      finish: vi.fn(),
    };
    openSpellingBee({ api, reducedMotion: true });
    await flush();
    expect(document.body.textContent).toContain('Übungsrunde');
    expect(document.querySelector('[data-start]')?.textContent).toBe('Übungsrunde starten · 5 Minuten');
    document.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await flush();
    const glowing = () => document.querySelector('.glow') as HTMLElement | null;
    expect([...document.querySelectorAll('[data-hint]')].map((b) => b.textContent)).toEqual([
      'TALL',
      'TRAIL',
    ]);
    expect(glowing()?.dataset.letter).toBe('t');
    const cell = (c: string) => document.querySelector<HTMLButtonElement>(`.bee-cell[data-letter="${c}"]`)!;
    cell('t').click();
    expect(glowing()?.dataset.letter).toBe('a');
    cell('o').click();
    expect(glowing()?.hasAttribute('data-delete')).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-delete]')!.click();
    for (const c of 'all') cell(c).click();
    expect(glowing()?.hasAttribute('data-enter')).toBe(true);
    document.querySelector<HTMLButtonElement>('[data-enter]')!.click();
    await flush();
    expect(document.querySelector('[data-hint="tall"]')?.classList.contains('done')).toBe(true);
    expect(glowing()?.dataset.letter).toBe('t');
    tapWord('trail');
    await flush();
    expect(glowing()).toBeNull();
  });

  it('doubles the golden word and shows three high score lists', async () => {
    const api: SpellingApi = {
      state: vi.fn().mockResolvedValue(state(3, false, 'trail')),
      start: vi.fn().mockResolvedValue({
        round: 4,
        puzzle: 3,
        endsAt: '',
        seconds: 180,
        rewarded: true,
        rewardedLeft: 2,
        tutorial: false,
        hints: [],
      }),
      hint: vi.fn(),
      finish: vi.fn(),
    };
    openSpellingBee({ api, reducedMotion: true });
    await flush();
    expect(document.body.textContent).toContain('Es zählt doppelt');
    const tab = (k: string) => document.querySelector<HTMLButtonElement>(`[data-board-tab="${k}"]`)!;
    const panel = (k: string) => document.querySelector<HTMLElement>(`[data-board-panel="${k}"]`)!;
    expect(panel('week').hidden).toBe(false);
    expect(panel('all').hidden).toBe(true);
    tab('all').click();
    expect(panel('all').hidden).toBe(false);
    expect(panel('all').textContent).toContain('ben');
    tab('total').click();
    expect(panel('total').textContent).toContain('cleo');
    expect(tab('total').getAttribute('aria-selected')).toBe('true');
    document.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await flush();
    expect(document.querySelector('.bee-golden')?.textContent).toBe('Goldenes Wort: noch versteckt');
    tapWord('trail');
    await flush();
    expect(document.querySelector('.bee-toast')?.textContent).toBe('Goldenes Wort! ×2 +10');
    expect(document.querySelector('.bee-score')?.textContent).toBe('10 Punkte');
    expect(document.querySelector('.bee-golden')?.textContent).toBe('Goldenes Wort gefunden: TRAIL');
    expect(document.querySelector('.bee-found li.golden')?.textContent).toBe('trail');
  });

  it('has three jokers a round that show the start of a word (migration 0060)', async () => {
    const hint = vi
      .fn()
      .mockResolvedValueOnce({ prefix: 'ta', length: 4, jokersLeft: 2 })
      .mockResolvedValueOnce({ prefix: 'tr', length: 5, jokersLeft: 1 })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ none: true, jokersLeft: 1 });
    const api: SpellingApi = {
      state: vi.fn().mockResolvedValue(state()),
      start: vi.fn().mockResolvedValue({
        round: 9,
        puzzle: 3,
        endsAt: '',
        seconds: 180,
        rewarded: true,
        rewardedLeft: 2,
        tutorial: false,
        hints: [],
      }),
      hint,
      finish: vi.fn(),
    };
    openSpellingBee({ api, reducedMotion: true });
    await flush();
    document.querySelector<HTMLButtonElement>('[data-start]')!.click();
    await flush();
    const joker = document.querySelector<HTMLButtonElement>('[data-joker]')!;
    expect(document.querySelector('[data-jokers]')?.textContent).toBe('3');
    tapWord('tall');
    await flush();
    joker.click();
    await flush();
    expect(hint).toHaveBeenCalledWith(9, ['tall']);
    expect(document.querySelector('.bee-joker-hints')?.textContent).toBe('TA··');
    expect(document.querySelector('[data-jokers]')?.textContent).toBe('2');
    joker.click();
    await flush();
    expect(document.querySelector('.bee-joker-hints')?.textContent).toBe('TA··TR···');
    // a failed call spends nothing and says so
    joker.click();
    await flush();
    expect(document.querySelector('.bee-toast')?.textContent).toBe('Joker gerade nicht möglich.');
    expect(document.querySelector('[data-jokers]')?.textContent).toBe('1');
    expect(joker.disabled).toBe(false);
    // every word found: no hint, the joker stays
    joker.click();
    await flush();
    expect(document.querySelector('.bee-toast')?.textContent).toBe('Du hast schon alle Wörter!');
    expect(document.querySelectorAll('.bee-joker-hints b')).toHaveLength(2);
  });
});
