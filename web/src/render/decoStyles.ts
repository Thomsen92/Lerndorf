/** Presentation only: catalogue IDs and placements remain unchanged. */
export type PlinthKind = 'meadow' | 'stone' | 'display';
export interface DecoStyle {
  kind: PlinthKind;
  shape: 'round' | 'rect';
  width: number;
  depth: number;
  height: number;
}
const meadow = new Set([
  'shop_sunday_bench',
  'shop_pocket_meadow',
  'shop_little_big_oak',
  'shop_rainy_day_barrel',
  'shop_apple_of_my_eye',
  'deco_bench',
  'deco_flowerbed',
  'deco_hedge',
  'deco_rosebush',
  'deco_pond',
  'deco_swing',
  'deco_tent',
  'deco_fence',
  'season_pumpkin_patch',
  'season_pumpkin_tree',
  'season_graveyard_corner',
  'season_fence_lantern',
]);
const display = new Set([
  'reward_ollie_nyc_postcard',
  'shop_support_duck',
  'deco_gnome',
  'deco_statue',
  'shop_trump',
  'season_warlock',
  'season_witch_statue',
  'season_witch_figure',
  'season_pumpkin_girl',
  'season_mummy',
  'season_skeleton',
  'season_zombie',
  'season_witch_cat',
  'season_pumpkin_cat',
  'season_ghost_kitty',
  'season_ghost',
]);

export function decoStyle(itemId: string, measuredWidth = 1.2, measuredDepth = 1.2): DecoStyle {
  const kind: PlinthKind = meadow.has(itemId) ? 'meadow' : display.has(itemId) ? 'display' : 'stone';
  // Tree crowns should not turn a small lawn pad into a full-slot display stage.
  if (itemId === 'shop_little_big_oak') {
    measuredWidth = 1.25;
    measuredDepth = 1.15;
  }
  const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 1.2);
  const w = safe(measuredWidth),
    d = safe(measuredDepth);
  const round = kind !== 'meadow' && Math.max(w, d) < 1.6 && Math.max(w, d) / Math.min(w, d) < 1.4;
  const margin = kind === 'meadow' ? 0.22 : 0.34;
  const clamp = (value: number) => Math.min(3, Math.max(0.78, value));
  const diameter = clamp(Math.hypot(w, d) + margin);
  return {
    kind,
    shape: round ? 'round' : 'rect',
    width: round ? diameter : clamp(w + margin),
    depth: round ? diameter : clamp(d + margin),
    height: kind === 'meadow' ? 0.05 : kind === 'display' ? 0.38 : 0.16,
  };
}
