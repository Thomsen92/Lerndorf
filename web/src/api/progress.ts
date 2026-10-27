import { tr } from '../i18n';
/** Server-owned progression. Components use this adapter so UI previews never need live accounts. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Outcome } from './economy';

export type XpReason = 'quest' | 'day_goal' | 'streak' | 'stamp' | 'tutorial' | 'first_place' | 'backfill';
export interface StreakInfo {
  current: number;
  best: number;
  shieldLeft: number;
  todayDone?: boolean;
  restarted?: boolean;
}
export interface ProgressDelta {
  gained: Array<{ reason: XpReason; xp: number }>;
  xp: number;
  level: number;
  levelBefore: number;
  newChests: number;
  streak?: StreakInfo;
}
export interface Chest {
  id: number;
  size: 'normal' | 'big';
  source: 'level' | 'streak' | 'backfill';
  ref: string;
}
export interface Progress {
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  titleId: string | null;
  frameId: string;
  streak: StreakInfo;
  today: { solved: number; total: number };
  chests: Chest[];
  unseen: Array<{ id: number; reason: XpReason; ref: string; delta: number; createdAt: string }>;
  stats: { quests: number; stamps: number; bestStreak: number };
}
export interface Reward {
  id: string;
  kind: 'title' | 'frame';
  level: number;
  label: string;
  /** Season rewards are owned through the pass, not through a level. */
  season?: string | null;
  owned?: boolean;
}
export interface ProgressApi {
  load(): Promise<Outcome<Progress>>;
  rewards(): Promise<Outcome<Reward[]>>;
  markSeen(id: number): Promise<Outcome<true>>;
  openChest(
    id: number,
  ): Promise<Outcome<{ coinsWon: number; roll: 'normal' | 'double' | 'triple'; coins: number }>>;
  setTitle(id: string | null): Promise<Outcome<true>>;
  setFrame(id: string): Promise<Outcome<true>>;
}

export const PROGRESS_ERROR = tr('Das hat nicht geklappt. Nochmal versuchen');
const REASONS = new Set(['quest', 'day_goal', 'streak', 'stamp', 'tutorial', 'first_place', 'backfill']);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function parseStreak(raw: unknown): StreakInfo {
  const r = isRecord(raw) ? raw : {};
  return {
    current: Number(r.current ?? 0),
    best: Number(r.best ?? 0),
    shieldLeft: Number(r.shield_left ?? 1),
    ...(typeof r.today_done === 'boolean' ? { todayDone: r.today_done } : {}),
    ...(typeof r.restarted === 'boolean' ? { restarted: r.restarted } : {}),
  };
}

export function parseProgressDelta(raw: unknown): ProgressDelta | null {
  if (
    !isRecord(raw) ||
    !finite(raw.xp) ||
    !finite(raw.level) ||
    !finite(raw.level_before) ||
    !finite(raw.new_chests) ||
    !Array.isArray(raw.gained)
  )
    return null;
  const gained: ProgressDelta['gained'] = [];
  for (const row of raw.gained) {
    if (!isRecord(row) || !REASONS.has(String(row.reason)) || !finite(row.xp)) return null;
    gained.push({ reason: row.reason as XpReason, xp: row.xp });
  }
  return {
    gained,
    xp: raw.xp,
    level: raw.level,
    levelBefore: raw.level_before,
    newChests: raw.new_chests,
    ...(isRecord(raw.streak) ? { streak: parseStreak(raw.streak) } : {}),
  };
}

export function levelFraction(p: Pick<Progress, 'xp' | 'levelXp' | 'nextLevelXp'>): number {
  const span = p.nextLevelXp - p.levelXp;
  return span > 0 ? Math.max(0, Math.min(1, (p.xp - p.levelXp) / span)) : 0;
}
export function unlockedAt(rewards: Reward[], from: number, to: number): Reward[] {
  return rewards
    .filter((r) => r.level > from && r.level <= to)
    .sort((a, b) => a.level - b.level || (a.kind === b.kind ? 0 : a.kind === 'title' ? -1 : 1));
}

export const XP_HELP: ReadonlyArray<readonly [string, string]> = [
  [tr('Quest beim ersten Versuch'), '15 XP'],
  [tr('Quest beim zweiten oder dritten Versuch'), '10 XP'],
  [tr('Quest ab dem vierten Versuch'), '5 XP'],
  [tr('Ältere Quest nachholen'), tr('Halbe XP, aufgerundet')],
  [tr('Alle heutigen Quests geschafft'), '15 XP extra'],
  [tr('Ein heutiger Quest-Erfolg am Schultag'), tr('5 XP × Serie, höchstens 25 XP')],
  [tr('Wochenplan-Stempel'), '100 XP'],
  [tr('Tutorial geschafft'), '50 XP'],
  [tr('Einen Gegenstand zum ersten Mal hinstellen'), '10 XP'],
];

interface ProgressRow {
  xp: number;
  level: number;
  level_xp: number;
  next_level_xp: number;
  title_id: string | null;
  frame_id: string;
  streak: unknown;
  today: Progress['today'];
  chests: Chest[];
  unseen: Array<{ id: number; reason: XpReason; ref: string; delta: number; created_at: string }>;
  stats: { quests: number; stamps: number; best_streak: number };
}

export function supabaseProgressApi(supabase: SupabaseClient): ProgressApi {
  const protect = async <T>(run: () => Promise<T>): Promise<Outcome<T>> => {
    try {
      return { ok: true, value: await run() };
    } catch {
      return { ok: false, message: PROGRESS_ERROR };
    }
  };
  const rpc = async <T>(name: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.rpc(name, args);
    if (error) throw error;
    return data as T;
  };
  let catalogue: Promise<Reward[]> | null = null;
  return {
    load: () =>
      protect(async () => {
        const r = await rpc<ProgressRow>('my_progress');
        return {
          xp: r.xp,
          level: r.level,
          levelXp: r.level_xp,
          nextLevelXp: r.next_level_xp,
          titleId: r.title_id,
          frameId: r.frame_id,
          streak: parseStreak(r.streak),
          today: r.today,
          chests: r.chests ?? [],
          unseen: (r.unseen ?? []).map((x) => ({
            id: x.id,
            reason: x.reason,
            ref: x.ref,
            delta: x.delta,
            createdAt: x.created_at,
          })),
          stats: { quests: r.stats.quests, stamps: r.stats.stamps, bestStreak: r.stats.best_streak },
        };
      }),
    rewards: () =>
      protect(async () => {
        catalogue ??= (async () => {
          const { data, error } = await supabase
            .from('level_rewards')
            .select('id, kind, level, label, season')
            .order('sort');
          if (error) throw error;
          const { data: owned, error: ownedError } = await supabase
            .from('player_rewards')
            .select('reward_id');
          if (ownedError) throw ownedError;
          const ownedIds = new Set((owned ?? []).map((r) => r.reward_id as string));
          return ((data ?? []) as Reward[]).map((reward) => ({
            ...reward,
            label: tr(reward.label),
            owned: ownedIds.has(reward.id),
          }));
        })().catch((error) => {
          catalogue = null;
          throw error;
        });
        return catalogue;
      }),
    markSeen: (id) =>
      protect(async () => {
        await rpc('mark_progress_seen', { p_id: id });
        return true as const;
      }),
    openChest: (id) =>
      protect(async () => {
        const r = await rpc<{ coins_won: number; roll: 'normal' | 'double' | 'triple'; coins: number }>(
          'open_chest',
          { p_id: id },
        );
        return { coinsWon: r.coins_won, roll: r.roll, coins: r.coins };
      }),
    setTitle: (id) =>
      protect(async () => {
        await rpc('set_title', { p_id: id });
        return true as const;
      }),
    setFrame: (id) =>
      protect(async () => {
        await rpc('set_frame', { p_id: id });
        return true as const;
      }),
  };
}
