// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import type { Progress, ProgressApi } from '../../src/api/progress';
import type { AvatarBadge } from '../../src/ui/avatarBadge';
import { createProgressFlow } from '../../src/ui/progressFlow';

const gained = {
  gained: [{ reason: 'quest' as const, xp: 15 }],
  xp: 15,
  level: 1,
  levelBefore: 1,
  newChests: 0,
};
const progress: Progress = {
  xp: 15,
  level: 1,
  levelXp: 0,
  nextLevelXp: 50,
  titleId: null,
  frameId: 'frame_wood',
  streak: { current: 1, best: 1, shieldLeft: 1 },
  today: { solved: 1, total: 3 },
  chests: [],
  unseen: [],
  stats: { quests: 1, stamps: 0, bestStreak: 1 },
};

it('updates the badge and quest count from confirmed progress and marks only displayed entries', async () => {
  const api = {
    load: vi.fn(async () => ({
      ok: true as const,
      value: {
        ...progress,
        unseen: [{ id: 7, reason: 'quest' as const, ref: 'q1', delta: 15, createdAt: '' }],
      },
    })),
    markSeen: vi.fn(async () => ({ ok: true as const, value: true as const })),
  } as unknown as ProgressApi;
  const el = document.createElement('button');
  document.body.append(el);
  const badge = {
    el,
    update: vi.fn(),
    animateTo: vi.fn(async () => undefined),
    target: () => new DOMRect(),
  } as AvatarBadge;
  const setQuestBadge = vi.fn();
  const updateTag = vi.fn();
  const flow = createProgressFlow({
    api,
    badge,
    getCoins: () => 70,
    onCoins: vi.fn(),
    updateTag,
    setQuestBadge,
    live: document.createElement('p'),
    reducedMotion: () => true,
    track: (h) => h,
    isActive: () => true,
  });
  await flow.onProgress(gained);
  expect(badge.update).toHaveBeenCalledWith(expect.objectContaining({ xp: 15, coins: 70 }));
  expect(setQuestBadge).toHaveBeenCalledWith(2);
  expect(api.markSeen).toHaveBeenCalledWith(7);
  expect(updateTag).toHaveBeenCalledWith({ level: 1, titleLabel: null });
});

it('quietly tolerates unavailable progress and does no work after logout', async () => {
  const load = vi.fn(async () => ({ ok: false, message: 'offline' }));
  const api = { load } as unknown as ProgressApi;
  let active = true;
  const flow = createProgressFlow({
    api,
    badge: {} as AvatarBadge,
    getCoins: () => 0,
    onCoins: vi.fn(),
    updateTag: vi.fn(),
    setQuestBadge: vi.fn(),
    live: document.createElement('p'),
    reducedMotion: () => true,
    track: (h) => h,
    isActive: () => active,
  });
  await flow.start();
  expect(load).toHaveBeenCalledTimes(1);
  active = false;
  await flow.onProgress(gained);
  expect(load).toHaveBeenCalledTimes(1);
});

it('shows an independent stamp before acknowledging the cursor from a quest answer', async () => {
  const markSeen = vi.fn(async () => ({ ok: true as const, value: true as const }));
  const api = {
    load: async () => ({
      ok: true as const,
      value: {
        ...progress,
        unseen: [
          { id: 6, reason: 'stamp' as const, ref: '2026-10-19', delta: 100, createdAt: '' },
          { id: 7, reason: 'quest' as const, ref: 'q1', delta: 15, createdAt: '' },
        ],
      },
    }),
    markSeen,
  } as unknown as ProgressApi;
  const badge = {
    el: document.createElement('button'),
    update: vi.fn(),
    animateTo: vi.fn(async () => undefined),
    target: () => new DOMRect(),
  } as AvatarBadge;
  const flow = createProgressFlow({
    api,
    badge,
    getCoins: () => 0,
    onCoins: vi.fn(),
    updateTag: vi.fn(),
    setQuestBadge: vi.fn(),
    live: document.createElement('p'),
    reducedMotion: () => true,
    track: (h) => h,
    isActive: () => true,
  });
  const done = flow.onProgress(gained);
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(markSeen).not.toHaveBeenCalled();
  expect(document.querySelector('.xp-welcome')?.textContent).toContain(
    'Stempel für die Woche ab 19.10.: +100 XP',
  );
  document.querySelector<HTMLButtonElement>('[data-welcome-next]')?.click();
  await done;
  expect(markSeen).toHaveBeenCalledWith(7);
});

it('shows every page of unseen progress before moving its cursor', async () => {
  let unseen: Progress['unseen'] = Array.from({ length: 51 }, (_, i) => ({
    id: i + 1,
    reason: 'quest',
    ref: `q${i}`,
    delta: 1,
    createdAt: '',
  }));
  const markSeen = vi.fn(async (id: number) => {
    unseen = unseen.filter((r) => r.id > id);
    return { ok: true as const, value: true as const };
  });
  const api = {
    load: async () => ({ ok: true as const, value: { ...progress, unseen: unseen.slice(0, 50) } }),
    rewards: async () => ({ ok: true as const, value: [] }),
    markSeen,
  } as unknown as ProgressApi;
  const badge = { el: document.createElement('button'), update: vi.fn() } as unknown as AvatarBadge;
  const flow = createProgressFlow({
    api,
    badge,
    getCoins: () => 0,
    onCoins: vi.fn(),
    updateTag: vi.fn(),
    setQuestBadge: vi.fn(),
    live: document.createElement('p'),
    reducedMotion: () => true,
    track: (h) => h,
    isActive: () => true,
  });
  const done = flow.start();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(markSeen).not.toHaveBeenCalled();
  document.querySelector<HTMLButtonElement>('[data-welcome-next]')?.click();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(markSeen).toHaveBeenCalledWith(50);
  expect(document.querySelector('.xp-welcome')?.textContent).toContain('Aufgaben: +1 XP');
  document.querySelector<HTMLButtonElement>('[data-welcome-next]')?.click();
  await done;
  expect(markSeen).toHaveBeenLastCalledWith(51);
});
