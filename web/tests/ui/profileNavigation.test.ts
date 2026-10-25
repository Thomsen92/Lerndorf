// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { openProfile } from '../../src/ui/profileView';
import type { ProgressApi } from '../../src/api/progress';

afterEach(() => document.body.replaceChildren());
const flush = () => new Promise((r) => setTimeout(r, 0));
it('keeps overview short and moves locked rewards to their own collection page', async () => {
  const api = {
    load: async () => ({
      ok: true,
      value: {
        xp: 620,
        level: 6,
        levelXp: 500,
        nextLevelXp: 675,
        titleId: null,
        frameId: 'frame_wood',
        streak: { current: 6, best: 9, shieldLeft: 1 },
        today: { solved: 2, total: 3 },
        chests: [],
        unseen: [],
        stats: { quests: 42, stamps: 3, bestStreak: 9 },
      },
    }),
    rewards: async () => ({
      ok: true,
      value: [
        { id: 'title_busy_bee', kind: 'title', level: 7, label: 'Busy Bee' },
        { id: 'frame_gold', kind: 'frame', level: 15, label: 'Gold' },
      ],
    }),
  } as unknown as ProgressApi;
  const handle = openProfile({
    api,
    nickname: 'Lea',
    character: 'girl',
    getCoins: () => 42,
    onCoins: vi.fn(),
    onFrame: vi.fn(),
    onTitle: vi.fn(),
    onSettings: vi.fn(),
    onClose: vi.fn(),
    reducedMotion: true,
  });
  await flush();
  expect(document.body.textContent).toContain('Noch 55 XP bis Level 7');
  expect(document.body.textContent).not.toContain('So bekommst du XP');
  expect(document.body.textContent).not.toContain('Busy Bee');
  const find = (name: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.getAttribute('aria-label') === name || b.textContent === name,
    )!;
  find('Sammlung ansehen').click();
  expect(document.querySelector('h2')?.textContent).toBe('Meine Sammlung');
  expect(find('Busy Bee, ab Level 7').disabled).toBe(true);
  expect(document.body.textContent).not.toContain('Gold');
  find('Rahmen').click();
  expect(document.body.textContent).toContain('Gold');
  expect(document.body.textContent).not.toContain('Busy Bee');
  find('Zurück zum Profil').click();
  expect(document.querySelector('h2')?.textContent).toBe('Mein Profil');
  handle.close();
});
