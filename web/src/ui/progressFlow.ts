/** Coordinates confirmed XP feedback and serializes celebrations from fast consecutive answers. */
import {
  unlockedAt,
  type Progress,
  type ProgressApi,
  type ProgressDelta,
  type Reward,
} from '../api/progress';
import type { AvatarBadge } from './avatarBadge';
import type { ModalHandle } from './dialog';
import { openLevelUp } from './levelUp';
import type { Sound } from './sound';
import { openWelcome, welcomeLines } from './welcome';
import { showXpGain } from './xpToast';

export interface ProgressFlow {
  start(): Promise<void>;
  refresh(): Promise<void>;
  onProgress(delta: ProgressDelta, from?: HTMLElement | null): Promise<void>;
  frameChanged(id: string): void;
  titleChanged(label: string | null): void;
}

export function createProgressFlow(opts: {
  api: ProgressApi;
  badge: AvatarBadge;
  getCoins: () => number;
  onCoins: (c: number) => void;
  updateTag: (info: { level: number; titleLabel: string | null }) => void;
  setQuestBadge: (n: number | 'done' | null) => void;
  live: HTMLElement;
  sound?: Sound;
  reducedMotion: () => boolean;
  track: (h: ModalHandle) => ModalHandle;
  isActive: () => boolean;
}): ProgressFlow {
  let current: Progress | null = null;
  let titleLabel: string | null = null;
  let queue = Promise.resolve();
  let celebratedLevel = 1;
  const update = (p: Progress): void => {
    current = p;
    opts.badge.update({
      level: p.level,
      xp: p.xp,
      levelXp: p.levelXp,
      nextLevelXp: p.nextLevelXp,
      coins: opts.getCoins(),
      streak: p.streak.current,
      chests: p.chests.length,
      frameId: p.frameId,
    });
    opts.setQuestBadge(
      p.today.total > 0 ? (p.today.solved >= p.today.total ? 'done' : p.today.total - p.today.solved) : null,
    );
    opts.updateTag({ level: p.level, titleLabel });
  };
  const rewards = async (): Promise<Reward[]> => {
    const r = await opts.api.rewards();
    return r.ok ? r.value : [];
  };
  const equip = (r: Reward): void => {
    if (!current || !opts.isActive()) return;
    if (r.kind === 'frame') {
      current.frameId = r.id;
      update(current);
    } else {
      current.titleId = r.id;
      titleLabel = r.label;
      opts.updateTag({ level: current.level, titleLabel });
    }
  };
  const celebrate = async (p: Progress, before: number, allRewards: Reward[]): Promise<void> => {
    if (!opts.isActive() || p.level <= celebratedLevel) return;
    before = Math.max(before, celebratedLevel);
    celebratedLevel = p.level;
    await new Promise<void>((resolve) => {
      opts.track(
        openLevelUp({
          levelFrom: before,
          levelTo: p.level,
          chests: p.chests,
          rewards: unlockedAt(allRewards, before, p.level),
          api: opts.api,
          sound: opts.sound,
          reducedMotion: opts.reducedMotion(),
          opener: opts.badge.el,
          onCoins: opts.onCoins,
          onEquip: equip,
          onDone: resolve,
        }),
      );
    });
    if (!opts.isActive()) return;
    const refreshed = await opts.api.load();
    if (refreshed.ok && opts.isActive()) update(refreshed.value);
  };
  const enqueue = (job: () => Promise<void>): Promise<void> => {
    queue = queue
      .then(async () => {
        if (opts.isActive()) await job();
      })
      .catch(() => undefined);
    return queue;
  };
  // A cursor acknowledges every preceding row. Show other-device/teacher bookings too,
  // rather than discarding them when acknowledging the most recent quest feedback.
  const acknowledge = async (initial: Progress, shown: ProgressDelta['gained'] = []): Promise<number> => {
    let page = initial;
    let total = 0;
    const remaining = shown.map((g) => ({ ...g }));
    while (opts.isActive() && page.unseen.length) {
      const extras = [...page.unseen];
      for (let i = extras.length - 1; i >= 0; i--) {
        const at = remaining.findIndex((g) => g.reason === extras[i].reason && g.xp === extras[i].delta);
        if (at !== -1) {
          extras.splice(i, 1);
          remaining.splice(at, 1);
        }
      }
      if (extras.length)
        await new Promise<void>((resolve) =>
          opts.track(
            openWelcome({
              lines: welcomeLines(extras),
              opener: opts.badge.el,
              onDone: resolve,
            }),
          ),
        );
      if (!opts.isActive()) return total;
      total += page.unseen.reduce((n, row) => n + row.delta, 0);
      const marked = await opts.api.markSeen(page.unseen[page.unseen.length - 1].id);
      if (!marked.ok || !opts.isActive() || page.unseen.length < 50) break;
      const next = await opts.api.load();
      if (!next.ok || !opts.isActive()) break;
      page = next.value;
    }
    return total;
  };
  const flow: ProgressFlow = {
    refresh: async () => {
      if (!opts.isActive()) return;
      const r = await opts.api.load();
      if (r.ok && opts.isActive()) update(r.value);
    },
    start: () =>
      enqueue(async () => {
        const r = await opts.api.load();
        if (!r.ok || !opts.isActive()) return;
        const p = r.value;
        const allRewards = await rewards();
        if (!opts.isActive()) return;
        titleLabel = allRewards.find((x) => x.id === p.titleId)?.label ?? null;
        update(p);
        if (!p.unseen.length) {
          celebratedLevel = p.level;
          return;
        }
        const shownXp = await acknowledge(p);
        if (!opts.isActive()) return;
        const xpBefore = Math.max(0, p.xp - shownXp);
        let before = 1;
        const threshold = (level: number): number => 50 * (level - 1) + (25 * (level - 1) * (level - 2)) / 2;
        while (threshold(before + 1) <= xpBefore) before++;
        if (p.level > before || p.chests.length) await celebrate(p, before, allRewards);
      }),
    onProgress: (delta, from = null) =>
      enqueue(async () => {
        if (!delta.gained.length) return;
        await showXpGain({
          delta,
          from,
          badge: opts.badge,
          live: opts.live,
          sound: opts.sound,
          reducedMotion: opts.reducedMotion(),
        });
        if (!opts.isActive()) return;
        const r = await opts.api.load();
        if (!r.ok || !opts.isActive()) return;
        update(r.value);
        await acknowledge(r.value, delta.gained);
        if (delta.level > delta.levelBefore) {
          const allRewards = await rewards();
          await celebrate(r.value, delta.levelBefore, allRewards);
        }
      }),
    frameChanged(id) {
      if (current) {
        current.frameId = id;
        update(current);
      }
    },
    titleChanged(label) {
      titleLabel = label;
      if (current) opts.updateTag({ level: current.level, titleLabel });
    },
  };
  return flow;
}
