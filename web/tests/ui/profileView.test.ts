// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { openProfile } from '../../src/ui/profileView';
import type { ProgressApi, Progress } from '../../src/api/progress';
afterEach(() => document.body.replaceChildren());
it('loads nonmodal profile with progress and exact streak text', async () => {
  const p: Progress = {
    xp: 620,
    level: 6,
    levelXp: 500,
    nextLevelXp: 675,
    titleId: null,
    frameId: 'frame_bronze',
    streak: { current: 6, best: 8, shieldLeft: 1 },
    today: { solved: 2, total: 3 },
    chests: [],
    unseen: [],
    stats: { quests: 12, stamps: 2, bestStreak: 8 },
  };
  const api = {
    load: async () => ({ ok: true, value: p }),
    rewards: async () => ({ ok: true, value: [] }),
  } as unknown as ProgressApi;
  const h = openProfile({
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
  await new Promise((r) => setTimeout(r, 0));
  expect(document.querySelector('[role=region]')?.textContent).toContain('Noch 55 XP bis Level 7');
  expect(document.body.textContent).toContain('🔥 6 Tage');
  expect(document.body.textContent).toContain('Nächste Truhe bei Level 7.');
  h.close();
  expect(document.querySelector('[role=region]')).toBeNull();
});

it('keeps a failed selection unchanged, retries and prevents choosing locked titles', async () => {
  const p = {
    xp: 620,
    level: 6,
    levelXp: 500,
    nextLevelXp: 675,
    titleId: null,
    frameId: 'frame_wood',
    streak: { current: 6, best: 8, shieldLeft: 1 },
    today: { solved: 2, total: 3 },
    chests: [],
    unseen: [],
    stats: { quests: 12, stamps: 2, bestStreak: 8 },
  };
  const setTitle = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, value: true });
  const onTitle = vi.fn();
  const api = {
    load: async () => ({ ok: true, value: p }),
    setTitle,
    rewards: async () => ({
      ok: true,
      value: [
        { id: 'title_quest_rookie', kind: 'title', label: 'Quest Rookie', level: 5 },
        { id: 'title_busy_bee', kind: 'title', label: 'Busy Bee', level: 7 },
      ],
    }),
  } as unknown as ProgressApi;
  const h = openProfile({
    api,
    nickname: 'Lea',
    character: 'girl',
    getCoins: () => 42,
    onCoins: vi.fn(),
    onFrame: vi.fn(),
    onTitle,
    onSettings: vi.fn(),
    onClose: vi.fn(),
    reducedMotion: true,
  });
  await new Promise((r) => setTimeout(r, 0));
  document.querySelector<HTMLButtonElement>('[aria-label="Sammlung ansehen"]')?.click();
  const all = () => [...document.querySelectorAll<HTMLButtonElement>('button')];
  const unlocked = all().find((b) => b.getAttribute('aria-label') === 'Quest Rookie, wählen')!;
  expect(all().find((b) => b.getAttribute('aria-label') === 'Busy Bee, ab Level 7')?.disabled).toBe(true);
  unlocked.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(onTitle).not.toHaveBeenCalled();
  expect(unlocked.disabled).toBe(false);
  expect(document.body.textContent).toContain('Das hat nicht geklappt. Nochmal versuchen');
  unlocked.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(onTitle).toHaveBeenCalledWith('Quest Rookie');
  expect(all().find((b) => b.getAttribute('aria-label') === 'Quest Rookie, gewählt')).toBeTruthy();
  all()
    .find((b) => b.getAttribute('aria-label') === 'Zurück zum Profil')!
    .click();
  expect(document.querySelector('.profile-current-title .title-plaque')?.getAttribute('data-rank')).toBe(
    'bronze',
  );
  expect(document.querySelector('.profile-current-title')?.textContent).toBe('Quest Rookie');
  h.close();
});

it('recovers from a loading failure and keeps closing available', async () => {
  const load = vi.fn().mockResolvedValue({ ok: false, message: 'offline' });
  const onClose = vi.fn();
  const h = openProfile({
    api: { load, rewards: async () => ({ ok: true, value: [] }) } as unknown as ProgressApi,
    nickname: 'Lea',
    character: 'boy',
    getCoins: () => 0,
    onCoins: vi.fn(),
    onFrame: vi.fn(),
    onTitle: vi.fn(),
    onSettings: vi.fn(),
    onClose,
    reducedMotion: true,
  });
  await new Promise((r) => setTimeout(r, 0));
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')];
  buttons.find((b) => b.textContent === 'Nochmal versuchen')?.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(load).toHaveBeenCalledTimes(2);
  buttons.find((b) => b.textContent === 'Schließen')?.click();
  expect(onClose).toHaveBeenCalled();
  h.close();
});

it('puts "My Almanac" right after the progress bar, before streak, chests and collection (BUG-007)', async () => {
  const p = {
    xp: 620,
    level: 6,
    levelXp: 500,
    nextLevelXp: 675,
    titleId: null,
    frameId: 'frame_wood',
    streak: { current: 6, best: 8, shieldLeft: 1 },
    today: { solved: 2, total: 3 },
    chests: [],
    unseen: [],
    stats: { quests: 12, stamps: 2, bestStreak: 8 },
  };
  const open = vi.fn();
  const h = openProfile({
    api: {
      load: async () => ({ ok: true, value: p }),
      rewards: async () => ({ ok: true, value: [] }),
    } as unknown as ProgressApi,
    nickname: 'Lea',
    character: 'girl',
    getCoins: () => 42,
    onCoins: vi.fn(),
    onFrame: vi.fn(),
    onTitle: vi.fn(),
    onSettings: vi.fn(),
    onClose: vi.fn(),
    reducedMotion: true,
    collection: { open },
  });
  await new Promise((r) => setTimeout(r, 0));
  const order = [
    ...document.querySelectorAll(
      '.profile-progress, .profile-almanac-link, .profile-daily, .profile-loot, .profile-collection-link:not(.profile-almanac-link)',
    ),
  ].map((el) =>
    el.classList.contains('profile-almanac-link')
      ? 'almanac'
      : el.classList.contains('profile-collection-link')
        ? 'collection'
        : el.className.replace('profile-', ''),
  );
  expect(order).toEqual(['progress', 'almanac', 'daily', 'loot', 'collection']);
  document.querySelector<HTMLButtonElement>('.profile-almanac-link')!.click();
  expect(open).toHaveBeenCalledOnce();
  h.close();
});
