import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { levelFraction, parseProgressDelta, supabaseProgressApi, unlockedAt } from '../../src/api/progress';

const raw = {
  gained: [{ reason: 'quest', xp: 15 }],
  xp: 175,
  level: 3,
  level_before: 2,
  new_chests: 1,
  streak: { current: 6, best: 9, shield_left: 0, today_done: true, restarted: false },
};

describe('progress data', () => {
  it('maps a server delta and ignores absent or malformed data', () => {
    expect(parseProgressDelta(raw)).toEqual({
      gained: [{ reason: 'quest', xp: 15 }],
      xp: 175,
      level: 3,
      levelBefore: 2,
      newChests: 1,
      streak: { current: 6, best: 9, shieldLeft: 0, todayDone: true, restarted: false },
    });
    for (const bad of [undefined, null, 'oops', {}, { ...raw, xp: '175' }, { ...raw, gained: [{}] }])
      expect(parseProgressDelta(bad)).toBeNull();
  });
  it('clamps the progress bar and sorts every reward across multiple levels', () => {
    expect(levelFraction({ xp: 175, levelXp: 125, nextLevelXp: 225 })).toBe(0.5);
    expect(levelFraction({ xp: -10, levelXp: 0, nextLevelXp: 50 })).toBe(0);
    expect(levelFraction({ xp: 100, levelXp: 0, nextLevelXp: 50 })).toBe(1);
    expect(levelFraction({ xp: 0, levelXp: 0, nextLevelXp: 0 })).toBe(0);
    expect(
      unlockedAt(
        [
          { id: 'bee', kind: 'title', label: 'Busy Bee', level: 7 },
          { id: 'bronze', kind: 'frame', label: 'Bronze', level: 5 },
          { id: 'rookie', kind: 'title', label: 'Quest Rookie', level: 5 },
          { id: 'wood', kind: 'frame', label: 'Holz', level: 1 },
        ],
        4,
        7,
      ).map((r) => r.label),
    ).toEqual(['Quest Rookie', 'Bronze', 'Busy Bee']);
  });
  it('maps progress, RPC mutations and the cached catalogue', async () => {
    const rpc = vi.fn(async (name: string) => ({
      error: null,
      data:
        name === 'my_progress'
          ? {
              ...raw,
              level_xp: 125,
              next_level_xp: 225,
              title_id: null,
              frame_id: 'frame_wood',
              today: { solved: 2, total: 3 },
              chests: [{ id: 4, size: 'normal', source: 'level', ref: '3' }],
              unseen: [{ id: 5, reason: 'stamp', ref: '2026-10-19', delta: 100, created_at: 'now' }],
              stats: { quests: 12, stamps: 2, best_streak: 9 },
            }
          : name === 'open_chest'
            ? { coins_won: 100, roll: 'double', coins: 330 }
            : null,
    }));
    const catalogue = vi.fn(async () => ({
      data: [{ id: 'x', kind: 'title', level: 3, label: 'Word Collector' }],
      error: null,
    }));
    const api = supabaseProgressApi({
      rpc,
      from: () => ({ select: () => ({ order: catalogue }) }),
    } as unknown as SupabaseClient);
    const p = await api.load();
    expect(p.ok && p.value.levelXp).toBe(125);
    expect(p.ok && p.value.stats.bestStreak).toBe(9);
    expect(p.ok && p.value.unseen[0].createdAt).toBe('now');
    expect(await api.openChest(4)).toEqual({
      ok: true,
      value: { coinsWon: 100, roll: 'double', coins: 330 },
    });
    await api.markSeen(5);
    await api.setTitle(null);
    await api.setFrame('frame_wood');
    expect(rpc).toHaveBeenCalledWith('mark_progress_seen', { p_id: 5 });
    expect(rpc).toHaveBeenCalledWith('set_title', { p_id: null });
    expect(rpc).toHaveBeenCalledWith('set_frame', { p_id: 'frame_wood' });
    await api.rewards();
    await api.rewards();
    expect(catalogue).toHaveBeenCalledTimes(1);
  });
  it('turns database and thrown network errors into retryable outcomes', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ error: { message: 'private detail' } })
      .mockRejectedValue(Error('network'));
    const api = supabaseProgressApi({ rpc } as unknown as SupabaseClient);
    expect(await api.load()).toEqual({ ok: false, message: 'Das hat nicht geklappt. Nochmal versuchen' });
    expect(await api.openChest(1)).toEqual({
      ok: false,
      message: 'Das hat nicht geklappt. Nochmal versuchen',
    });
  });
});
