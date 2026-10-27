/**
 * Dev-only season API with sample data (tier 12, 452 XP, like the design mock-up). The chest pool
 * comes from the season manifest, which carries the same rarities as migration 0030, so the harness
 * pages show what the game shows. `?tier=40` opens the pass with the tier-40 pick ready.
 */
import type { PoolItem, SeasonApi, SeasonState, SeasonTier } from '../src/api/season';
import { GLB_ITEMS } from '../src/render/glbItems';

const CHESTS = new Set([5, 10, 15, 20, 25, 30, 35, 40]);
const TITLES: Record<number, string> = {
  12: 'title_season_pumpkin_rookie',
  22: 'title_season_ghost_hunter',
  32: 'title_season_witch_friend',
  40: 'title_season_halloween_legend',
};
const FRAMES: Record<number, string> = {
  8: 'frame_season_pumpkin',
  18: 'frame_season_web',
  28: 'frame_season_grave',
  38: 'frame_season_cauldron',
};
const SCENES: Record<number, string> = {
  21: 'scene_pumpkin_bed',
  23: 'scene_fire_basket',
  24: 'scene_autumn_pine',
  26: 'scene_lantern_path',
  27: 'scene_graveyard_gate',
  29: 'scene_candle_altar',
  31: 'scene_ghost_grave',
  33: 'scene_skeleton_bench',
  34: 'scene_zombie_garden',
  36: 'scene_little_crypt',
  37: 'scene_vampire_coffin',
  39: 'scene_gravedigger',
};
const xpOf = (t: number) => (t <= 10 ? t * 30 : t <= 20 ? 300 + (t - 10) * 60 : t <= 30 ? 900 + (t - 20) * 90 : 1800 + (t - 30) * 120);

export interface MockSeason {
  api: SeasonApi;
  coins(): number;
  setCoins(n: number): void;
}

export function mockSeason(opts: { tier?: number; coins?: number } = {}): MockSeason {
  const reached = opts.tier ?? 12;
  let coins = opts.coins ?? 240;
  const xp = reached === 40 ? 3000 : xpOf(reached) + 2;
  const tiers: SeasonTier[] = Array.from({ length: 40 }, (_, i) => {
    const t = i + 1;
    return {
      tier: t,
      xp: xpOf(t),
      coins: (t <= 20 ? 5 : 0) + (CHESTS.has(t) ? 25 : 0),
      chest: CHESTS.has(t),
      title_id: TITLES[t] ?? null,
      frame_id: FRAMES[t] ?? null,
      item_id: SCENES[t] ?? null,
      choice: t === 40,
      state: t < reached || (reached === 40 && t === 40) ? 'claimed' : t === reached ? 'ready' : t === reached + 1 ? 'next' : 'locked',
    };
  });
  const state: SeasonState = {
    season: {
      id: '2026-11-halloween',
      label: 'Season I – Halloween',
      theme: 'halloween',
      starts_on: '2026-10-28',
      ends_on: '2026-12-06',
      state: 'running',
      days_left: 26,
    },
    xp,
    tier: reached,
    tiers,
    next: reached < 40 ? { tier: reached + 1, xp: xpOf(reached + 1), missing: xpOf(reached + 1) - xp } : null,
    chests: { pass: 1, streak: 1, shop: 0 },
    shop: { price: 50, left: 1, week_start: '2026-10-26' },
    streak: { current: 2, best: 4, last_day: '2026-10-26', to_chest: 1 },
    choice: { open: reached === 40, item_id: null },
  };
  let poolJob: Promise<PoolItem[]> | null = null;
  const chestList = [
    { id: 1, source: 'pass' as const },
    { id: 2, source: 'streak' as const },
  ];

  const api: SeasonApi = {
    pool() {
      poolJob ??= fetch('/assets/season1/manifest.json')
        .then((r) => r.json() as Promise<{ items: Array<{ file: string; rarity: string }> }>)
        .then((m) =>
          m.items.map((item) => {
            const id = Object.keys(GLB_ITEMS).find((k) => GLB_ITEMS[k].file === `season1/${item.file}`) ?? item.file;
            const rarity = (item.rarity === 'normal' ? 'common' : item.rarity) as PoolItem['rarity'];
            const sell = { common: 15, rare: 40, epic: 100, legendary: 250 }[rarity];
            return { id, kind: GLB_ITEMS[id]?.kind ?? 'deco', rarity, sell } as PoolItem;
          }),
        );
      return poolJob;
    },
    async owned() {
      return new Set(['season_pumpkin_patch', 'season_bat']);
    },
    async state() {
      return structuredClone(state);
    },
    async chests() {
      return chestList.slice();
    },
    async claim(tier) {
      const row = state.tiers[tier - 1];
      row.state = 'claimed';
      coins += row.coins;
      if (row.chest) state.chests.pass += 1;
      if (tier === state.tier && tier < 40) {
        state.tier = tier;
      }
      return { tier, rewards: { coins: row.coins, chest: row.chest } };
    },
    async choose(itemId) {
      state.choice = { open: false, item_id: itemId };
      const own = itemId === 'season_pumpkin_patch' || itemId === 'season_bat';
      if (own) coins += itemId === 'season_bat' ? 15 : 100;
      return { chosen: itemId, duplicate: own, coins: own ? (itemId === 'season_bat' ? 15 : 100) : 0 };
    },
    async buyChest() {
      if (state.shop.left <= 0) throw new Error('weekly limit');
      coins -= 50;
      state.shop.left -= 1;
      state.chests.shop += 1;
      return { left: state.shop.left };
    },
    async openChest(id) {
      const index = chestList.findIndex((c) => c.id === id);
      if (index >= 0) chestList.splice(index, 1);
      return id % 2
        ? { rarity: 'rare', item_id: 'season_witch_cat', duplicate: false, coins: 0 }
        : { rarity: 'common', item_id: 'season_bat', duplicate: true, coins: 0 };
    },
    async sell() {
      return { coins: 15 };
    },
  };
  return { api, coins: () => coins, setCoins: (n) => (coins = n) };
}
