/**
 * Build mode data on the fixed plot plan (docs/ASSET_VERTRAG.md): what the pupil owns per kind and
 * what stands in each of the seven slots. Writes go through place_in_slot and clear_slot, which
 * only ever act on the caller's own plot and check kind, slot and rotation (migration 0013).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { STARTER, type SlotId } from '../world/plotPlan';
import { RUIN_ID } from '../render/ruin';

export interface BuildItem {
  id: string;
  kind: string;
  nameDe: string;
  /** Copies the pupil owns (starter house and garage: always 1). */
  owned: number;
  starter: boolean;
}

/** What stands in one slot. */
export interface SlotContent {
  itemId: string;
  rot: number;
}

export type SlotMap = Partial<Record<SlotId, SlotContent>>;

export interface BuildState {
  items: BuildItem[];
  slots: SlotMap;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

function explain(message: string): string {
  if (message.includes('building is closed')) return 'Das Bauen ist gerade geschlossen.';
  if (message.includes('no free copy')) return 'Davon hast du gerade keines mehr frei.';
  if (message.includes('does not fit')) return 'Das passt nicht auf diesen Platz.';
  if (message.includes('cannot be empty'))
    return 'Haus und Garage bleiben immer stehen. Du kannst sie nur austauschen.';
  if (message.includes('rotation')) return 'So kann man das nicht drehen.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

/** Loads the items of the plot kinds the pupil may use and the own slots. */
export async function loadBuildState(supabase: SupabaseClient, uid: string): Promise<Result<BuildState>> {
  const [items, inv, own] = await Promise.all([
    supabase
      .from('items')
      .select('id, kind, name_de, starter')
      .in('kind', ['house', 'garage', 'car', 'deco']),
    supabase.from('inventory').select('item_id, qty').gt('qty', 0),
    loadOwnSlots(supabase, uid),
  ]);
  if (items.error || inv.error || !own.ok) {
    return { ok: false, message: 'Die Sachen konnten nicht geladen werden.' };
  }
  const owned: Record<string, number> = {};
  for (const r of inv.data ?? []) owned[r.item_id] = r.qty;
  const list = (items.data ?? [])
    .map((r) => ({
      id: r.id as string,
      kind: r.kind as string,
      nameDe: r.name_de as string,
      starter: Boolean(r.starter),
      owned: r.starter ? 1 : (owned[r.id as string] ?? 0),
    }))
    .filter((i) => i.owned > 0);
  return { ok: true, value: { items: list, slots: own.value } };
}

/** The own slots (placements of the signed-in pupil). */
export async function loadOwnSlots(supabase: SupabaseClient, uid: string): Promise<Result<SlotMap>> {
  const { data, error } = await supabase.from('placements').select('item_id, slot, rot').eq('player_id', uid);
  if (error) return { ok: false, message: 'Die Sachen konnten nicht geladen werden.' };
  return { ok: true, value: slotMap(data ?? []) };
}

function slotMap(rows: Array<{ item_id: string; slot: string; rot: number }>): SlotMap {
  const map: SlotMap = {};
  for (const r of rows) map[r.slot as SlotId] = { itemId: r.item_id, rot: r.rot };
  return map;
}

/**
 * Item that a slot shows: its placement; the starter garage; the ruin in an empty house slot
 * (the house is bought and placed in the tutorial, there is no starter house any more).
 */
export function shownItem(slots: SlotMap, slot: SlotId, kind: string): SlotContent | undefined {
  const own = slots[slot];
  if (own) return own;
  if (kind === 'house') return { itemId: RUIN_ID, rot: 0 };
  const starter = STARTER[kind as keyof typeof STARTER];
  return starter ? { itemId: starter, rot: 0 } : undefined;
}

export async function placeInSlot(
  supabase: SupabaseClient,
  itemId: string,
  slot: SlotId,
  rot: number,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('place_in_slot', { p_item_id: itemId, p_slot: slot, p_rot: rot });
  if (error) return { ok: false, message: explain(error.message) };
  return { ok: true, value: true };
}

export async function clearSlot(supabase: SupabaseClient, slot: SlotId): Promise<Result<true>> {
  const { error } = await supabase.rpc('clear_slot', { p_slot: slot });
  if (error) return { ok: false, message: explain(error.message) };
  return { ok: true, value: true };
}

/** Slots of every classmate (RLS: same class only), by player id. */
export async function loadClassSlots(supabase: SupabaseClient): Promise<Map<string, SlotMap>> {
  const { data, error } = await supabase.from('placements').select('player_id, item_id, slot, rot');
  const out = new Map<string, SlotMap>();
  if (error || !data) return out;
  for (const r of data) {
    const map = out.get(r.player_id) ?? {};
    map[r.slot as SlotId] = { itemId: r.item_id, rot: r.rot };
    out.set(r.player_id, map);
  }
  return out;
}
