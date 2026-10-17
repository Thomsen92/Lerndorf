/**
 * Build mode data: own placements, inventory and footprints. Writes go through place_item and
 * remove_placement, which only ever act on the caller's own plot (SPEC §8, §10).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Footprint, GridSize, Placed } from '../build/grid';

export interface BuildItem {
  id: string;
  nameDe: string;
  footprint: Footprint;
  owned: number;
}

export interface MyPlacement extends Placed {
  id: number;
  itemId: string;
  rot: number;
}

export interface BuildState {
  grid: GridSize;
  items: BuildItem[];
  placements: MyPlacement[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

function explain(message: string): string {
  if (message.includes('building is closed')) return 'Das Bauen ist gerade geschlossen.';
  if (message.includes('no free copy')) return 'Davon hast du gerade keines mehr frei.';
  if (message.includes('outside the free plot') || message.includes('already occupied'))
    return 'Hier passt es nicht hin.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

/** Loads the grid size, the decorations the pupil owns and the own placements. */
export async function loadBuildState(supabase: SupabaseClient, uid: string): Promise<Result<BuildState>> {
  const [settings, items, inv, placements] = await Promise.all([
    supabase.from('settings').select('plot_cols, plot_rows').eq('id', 1).single(),
    supabase.from('items').select('id, name_de, footprint').eq('kind', 'deco').eq('active', true),
    supabase.from('inventory').select('item_id, qty').gt('qty', 0),
    supabase.from('placements').select('id, item_id, cell_x, cell_z, rot').eq('player_id', uid),
  ]);
  if (settings.error || !settings.data)
    return { ok: false, message: 'Das Raster konnte nicht geladen werden.' };
  if (items.error || inv.error || placements.error) {
    return { ok: false, message: 'Die Sachen konnten nicht geladen werden.' };
  }

  const owned: Record<string, number> = {};
  for (const r of inv.data ?? []) owned[r.item_id] = r.qty;
  const catalogue = (items.data ?? []).map((r) => ({
    id: r.id as string,
    nameDe: r.name_de as string,
    footprint: { w: (r.footprint as number[])[0], d: (r.footprint as number[])[1] },
  }));

  const ownedItems = catalogue
    .filter((i) => (owned[i.id] ?? 0) > 0)
    .map((i) => ({ ...i, owned: owned[i.id] }));

  return {
    ok: true,
    value: {
      grid: { cols: settings.data.plot_cols, rows: settings.data.plot_rows },
      items: ownedItems,
      placements: (placements.data ?? []).map((p) => {
        const item = catalogue.find((c) => c.id === p.item_id);
        const fp = item?.footprint ?? { w: 1, d: 1 };
        const turned = p.rot % 2 === 1;
        return {
          id: p.id,
          itemId: p.item_id,
          rot: p.rot,
          x: p.cell_x,
          z: p.cell_z,
          w: turned ? fp.d : fp.w,
          d: turned ? fp.w : fp.d,
        };
      }),
    },
  };
}

export async function placeItem(
  supabase: SupabaseClient,
  itemId: string,
  x: number,
  z: number,
  rot: number,
): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('place_item', { p_item_id: itemId, p_x: x, p_z: z, p_rot: rot });
  if (error) return { ok: false, message: explain(error.message) };
  return { ok: true, value: Number(data) };
}

export async function removePlacement(supabase: SupabaseClient, id: number): Promise<Result<true>> {
  const { error } = await supabase.rpc('remove_placement', { p_id: id });
  if (error) return { ok: false, message: explain(error.message) };
  return { ok: true, value: true };
}

/** One placed decoration of any classmate, with its size after rotation (SPEC §10, PLAN 4.5). */
export interface ClassPlacement {
  playerId: string;
  itemId: string;
  x: number;
  z: number;
  rot: number;
  w: number;
  d: number;
}

/** Placements of the whole class (RLS: same class only). Sizes come from the catalogue. */
export async function loadClassPlacements(supabase: SupabaseClient): Promise<ClassPlacement[]> {
  const [placements, items] = await Promise.all([
    supabase.from('placements').select('player_id, item_id, cell_x, cell_z, rot'),
    supabase.from('items').select('id, footprint'),
  ]);
  if (placements.error || items.error || !placements.data || !items.data) return [];
  const fp = new Map<string, number[]>(items.data.map((i) => [i.id as string, i.footprint as number[]]));
  return placements.data.map((p) => {
    const base = fp.get(p.item_id) ?? [1, 1];
    const turned = p.rot % 2 === 1;
    return {
      playerId: p.player_id,
      itemId: p.item_id,
      x: p.cell_x,
      z: p.cell_z,
      rot: p.rot,
      w: turned ? base[1] : base[0],
      d: turned ? base[0] : base[1],
    };
  });
}

/** Grid size of a plot from the settings (same for all plots). */
export async function loadGrid(supabase: SupabaseClient): Promise<GridSize> {
  const { data } = await supabase.from('settings').select('plot_cols, plot_rows').eq('id', 1).single();
  return { cols: data?.plot_cols ?? 7, rows: data?.plot_rows ?? 6 };
}
