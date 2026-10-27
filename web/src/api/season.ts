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
  rewards: { coins?: number; chest?: boolean; title_id?: string; frame_id?: string; item?: unknown; choice?: boolean };
}

export interface SeasonChest {
  id: number;
  source: 'pass' | 'streak' | 'shop';
}

export interface SeasonApi {
  state(): Promise<SeasonState>;
  chests(): Promise<SeasonChest[]>;
  claim(tier: number): Promise<ClaimResult>;
  choose(itemId: string): Promise<{ chosen: string; coins?: number }>;
  buyChest(): Promise<{ left: number }>;
  openChest(id: number): Promise<{ rarity: string; item_id: string; duplicate: boolean; coins: number }>;
  sell(itemId: string, qty: number): Promise<{ coins: number }>;
}

function unwrap<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export function seasonApi(supabase: SupabaseClient): SeasonApi {
  return {
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
    async choose(itemId) {
      const { data, error } = await supabase.rpc('choose_season_item', { p_item_id: itemId });
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
