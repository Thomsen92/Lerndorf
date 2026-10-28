/** Season I API: thin Supabase adapter around the RPCs from migration 0029. */
import type { SupabaseClient } from '@supabase/supabase-js';

export type TierState = 'claimed' | 'ready' | 'next' | 'locked';

export interface SeasonTier {
  tier: number;
  xp: number;
  coins: number;
  chest: boolean;
  title_id: string | null;
  frame_id: string | null;
  item_id: string | null;
  choice: boolean;
  state: TierState;
}

export interface SeasonState {
  season: {
    id: string;
    label: string;
    theme: string;
    starts_on: string;
    ends_on: string;
    state: 'upcoming' | 'running' | 'ended' | 'closed';
    days_left: number;
  };
  xp: number;
  tier: number;
  tiers: SeasonTier[];
  next: { tier: number; xp: number; missing: number } | null;
  chests: { pass: number; streak: number; shop: number };
  shop: { price: number; left: number; week_start: string };
  streak: { current: number; best: number; last_day: string | null; to_chest: number };
  choice: { open: boolean; item_id: string | null };
}

export interface ClaimResult {
  tier: number;
  rewards: {
    coins?: number;
    chest?: boolean;
    title_id?: string;
    frame_id?: string;
    item?: unknown;
    choice?: boolean;
    cards?: Array<{ id: string; rarity: string; granted: boolean }>;
  };
}

export interface SeasonChest {
  id: number;
  source: 'pass' | 'streak' | 'shop';
}

/** One item of the chest pool, read from the database (review B6: no second list in the client). */
export interface PoolItem {
  id: string;
  kind: 'house' | 'garage' | 'car' | 'deco';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  sell: number;
}

const SELL_BY_RARITY: Record<PoolItem['rarity'], number> = {
  common: 15,
  rare: 40,
  epic: 100,
  legendary: 250,
};

export interface ChestResult {
  rarity: string;
  item_id: string;
  name_de?: string;
  duplicate: boolean;
  coins: number;
  card?: { id: string; rarity: string } | null;
  cardStatus?: 'awarded' | 'no-hit' | 'complete' | 'disabled' | 'legacy';
}

export interface SeasonApi {
  /** The chest pool of a season: items with a loot weight, rarity and sell value from 0030. */
  pool(seasonId: string): Promise<PoolItem[]>;
  /** Item ids the player owns at least once (tier-40 pick: "owned" badge). */
  owned(): Promise<Set<string>>;
  state(): Promise<SeasonState>;
  chests(): Promise<SeasonChest[]>;
  claim(tier: number): Promise<ClaimResult>;
  choose(itemId: string, seasonId?: string): Promise<{ chosen: string; duplicate?: boolean; coins?: number }>;
  buyChest(): Promise<{ left: number }>;
  openChest(id: number): Promise<ChestResult>;
  sell(itemId: string, qty: number): Promise<{ coins: number }>;
}

function unwrap<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export function seasonApi(supabase: SupabaseClient): SeasonApi {
  return {
    async pool(seasonId) {
      const { data, error } = await supabase
        .from('items')
        .select('id, kind, rarity, sell_price')
        .eq('season', seasonId)
        .gt('lootbox_weight', 0)
        .order('id');
      const rows = unwrap<
        Array<{ id: string; kind: PoolItem['kind']; rarity: PoolItem['rarity']; sell_price: number | null }>
      >(data, error);
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        rarity: r.rarity,
        sell: r.sell_price ?? SELL_BY_RARITY[r.rarity],
      }));
    },
    async owned() {
      const { data, error } = await supabase.from('inventory').select('item_id, qty').gt('qty', 0);
      return new Set(unwrap<Array<{ item_id: string }>>(data, error).map((r) => r.item_id));
    },
    async state() {
      const { data, error } = await supabase.rpc('season_state');
      return unwrap<SeasonState>(data, error);
    },
    async chests() {
      const { data, error } = await supabase
        .from('season_chests')
        .select('id, source')
        .is('opened_at', null)
        .order('id');
      return unwrap<SeasonChest[]>(data, error);
    },
    async claim(tier) {
      const { data, error } = await supabase.rpc('claim_season_tier', { p_tier: tier });
      return unwrap<ClaimResult>(data, error);
    },
    async choose(itemId, seasonId) {
      const { data, error } = await supabase.rpc('choose_season_item', {
        p_item_id: itemId,
        p_season: seasonId ?? null,
      });
      return unwrap(data, error);
    },
    async buyChest() {
      const { data, error } = await supabase.rpc('buy_season_chest');
      return unwrap(data, error);
    },
    async openChest(id) {
      const { data, error } = await supabase.rpc('open_season_chest', { p_id: id });
      return unwrap(data, error);
    },
    async sell(itemId, qty) {
      const { data, error } = await supabase.rpc('sell_item', { p_item_id: itemId, p_qty: qty });
      return unwrap(data, error);
    },
  };
}
