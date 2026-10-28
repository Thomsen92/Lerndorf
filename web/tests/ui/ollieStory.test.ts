// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { openOllieStory } from '../../src/shopkeeper/storyView';
import type { OllieStoryApi, StoryState } from '../../src/api/ollieStory';
import type { OllieSpeech } from '../../src/shopkeeper/speech';
import { setLocale } from '../../src/i18n';
let handle: ReturnType<typeof openOllieStory> | undefined;
afterEach(() => {
  handle?.close();
  document.body.replaceChildren();
  setLocale('de');
});
const flush = () => new Promise((r) => setTimeout(r, 0));
const click = (label: string) =>
  Array.from(document.querySelectorAll('button'))
    .find((b) => b.textContent === label)!
    .click();
const initial: StoryState = {
  id: 'ollie-australia-new-york',
  step: 0,
  total: 9,
  completed: false,
  coins: 100,
  reward: { coins: 50, xp: 80, itemId: 'reward_ollie_nyc_postcard' },
  question: {
    id: 'gap-1',
    position: 1,
    narrative: 'I packed my ... darn it!',
    clip: '0123456789abcdef01234567',
    options: ['backpack', 'handbag', 'suitcase'],
  },
};
function setup(over: Partial<OllieStoryApi> = {}) {
  setLocale('en');
  const onCoins = vi.fn(),
    onProgress = vi.fn(),
    onChanged = vi.fn();
  const voice = {
    say: vi.fn(async () => {}),
    tell: vi.fn(async () => {}),
    stop: vi.fn(),
    dispose: vi.fn(),
  } as OllieSpeech;
  const api: OllieStoryApi = {
    state: vi.fn(async () => ({ ok: true as const, value: initial })),
    answer: vi.fn(async () => ({ ok: false as const, message: 'Offline' })),
    ...over,
  };
  handle = openOllieStory({
    api,
    onCoins,
    onProgress,
    onChanged,
    onInventory: vi.fn(),
    createSpeech: () => voice,
    createView: () => null,
  });
  return { api, voice, onCoins, onProgress, onChanged };
}
it('opens a story, shows nine-step progress and three direct choices', async () => {
  const f = setup();
  await flush();
  expect(document.body.textContent).toContain('50 coins');
  expect(document.body.textContent).toContain('80 XP');
  click('Start my story');
  await flush();
  expect(document.querySelectorAll('.ollie-story-answer')).toHaveLength(3);
  expect(document.body.textContent).toContain('1 / 9');
  click('backpack');
  click('backpack');
  await flush();
  expect(f.api.answer).toHaveBeenCalledTimes(1);
  expect(document.body.textContent).toContain('Offline');
  expect(f.onProgress).not.toHaveBeenCalled();
});
it('reveals a hint after a wrong answer without progressing or rewards', async () => {
  const f = setup({
    answer: vi.fn(async () => ({
      ok: true as const,
      value: {
        correct: false,
        alreadySolved: false,
        hint: 'Two straps!',
        feedback: null,
        state: initial,
        awarded: { coins: 0, xp: 0, itemId: null },
        progress: null,
      },
    })),
  });
  await flush();
  click('Start my story');
  await flush();
  click('handbag');
  await flush();
  expect(document.body.textContent).toContain('Two straps!');
  expect(f.onChanged).not.toHaveBeenCalled();
  expect(f.voice.tell).toHaveBeenCalledWith('df0171db67cc19aa448f437e');
  expect(document.querySelector('.ollie-story-line')?.textContent).toBe(initial.question!.narrative);
  click('Listen again');
  await flush();
  expect(f.voice.tell).toHaveBeenLastCalledWith(initial.question!.clip);
});
it('applies the final server reward once and offers the inventory', async () => {
  const done = { ...initial, completed: true, step: 9, question: null, coins: 150 };
  const progress = {
    gained: [{ reason: 'quest' as const, xp: 80 }],
    xp: 80,
    level: 1,
    levelBefore: 1,
    newChests: 0,
  };
  const f = setup({
    answer: vi.fn(async () => ({
      ok: true as const,
      value: {
        correct: true,
        alreadySolved: false,
        hint: null,
        feedback: { text: 'Backpack! Cheers, mate.', clip: 'abcdef0123456789abcdef01' },
        state: done,
        awarded: { coins: 50, xp: 80, itemId: 'reward_ollie_nyc_postcard' },
        progress,
      },
    })),
  });
  await flush();
  click('Start my story');
  await flush();
  click('backpack');
  await flush();
  expect(f.onCoins).toHaveBeenLastCalledWith(150);
  expect(f.onProgress).toHaveBeenCalledWith(progress);
  expect(f.onChanged).toHaveBeenCalledTimes(1);
  click('See my souvenir');
  await flush();
  expect(document.body.textContent).toContain('Go to inventory');
});
it('closes without late progress updates or speech resurrection', async () => {
  let resolve!: (r: Awaited<ReturnType<OllieStoryApi['state']>>) => void;
  const f = setup({ state: () => new Promise((r) => (resolve = r)) });
  handle!.close();
  resolve({ ok: true as const, value: initial });
  await flush();
  expect(f.voice.dispose).toHaveBeenCalled();
  expect(document.querySelector('[role=dialog]')).toBeNull();
  expect(f.onCoins).not.toHaveBeenCalled();
});
it('reconciles a completed quest after an uncertain final reply without awarding again', async () => {
  const done: StoryState = { ...initial, completed: true, step: 9, question: null, coins: 150 };
  let reads = 0;
  const f = setup({ state: async () => ({ ok: true as const, value: reads++ ? done : initial }) });
  await flush();
  click('Start my story');
  await flush();
  click('backpack');
  await flush();
  click('Check saved progress');
  await flush();
  expect(f.onCoins).toHaveBeenLastCalledWith(150);
  expect(f.onChanged).toHaveBeenCalledTimes(1);
  expect(f.onProgress).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('You have heard this one!');
});
