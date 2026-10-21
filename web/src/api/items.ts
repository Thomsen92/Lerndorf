/**
 * Item model shared by shop, inventory and build views: catalogue, own inventory and own slots
 * merged into one list. Pure functions plus a thin Supabase adapter; writes only via buyItem.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SLOTS, slotAccepts, type SlotId } from '../world/plotPlan';
import { shownItem, loadOwnSlots, type SlotMap } from './build';
import { buyItem, loadCatalog, loadInventory, type CatalogItem, type Outcome } from './economy';

export type ItemKind = CatalogItem['kind'];

export interface ItemEntry {
  id: string;
  kind: ItemKind;
  nameDe: string;
  price: number;
  starter: boolean;
  /** Starter items: always 1. */
  owned: number;
  /** Slots that show this item (starters count where they are the fallback). */
  placedIn: SlotId[];
  /** max(0, owned - placedIn.length) */
  free: number;
  /** Slot ids that accept the kind; empty for avatar items. */
  fits: SlotId[];
}

export const KIND_ORDER: readonly ItemKind[] = ['house', 'garage', 'car', 'deco', 'avatar'];

export const KIND_LABEL: Record<ItemKind, string> = {
  house: 'Häuser',
  garage: 'Garagen',
  car: 'Autos',
  deco: 'Garten-Deko',
  avatar: 'Für deinen Avatar',
};

/** Kinds a pupil can own only once. */
const ONCE = new Set<ItemKind>(['house', 'garage', 'car']);

export function buildItemBook(
  catalog: CatalogItem[],
  inventory: Record<string, number>,
  slots: SlotMap,
): ItemEntry[] {
  return catalog.map((c) => {
    const owned = c.starter ? 1 : (inventory[c.id] ?? 0);
    const placedIn = SLOTS.filter((s) => shownItem(slots, s.id, s.kind)?.itemId === c.id).map((s) => s.id);
    const fits = SLOTS.filter((s) => slotAccepts(s, c.kind)).map((s) => s.id);
    return {
      id: c.id,
      kind: c.kind,
      nameDe: c.nameDe,
      price: c.price,
      starter: c.starter,
      owned,
      placedIn,
      free: Math.max(0, owned - placedIn.length),
      fits,
    };
  });
}

export function groupByKind(entries: ItemEntry[]): Array<{ kind: ItemKind; items: ItemEntry[] }> {
  return KIND_ORDER.map((kind) => ({ kind, items: entries.filter((e) => e.kind === kind) }));
}

/** Why a purchase is blocked; precedence: owned once, shop closed, not enough coins. */
export function purchaseState(
  e: ItemEntry,
  coins: number,
  shopOpen: boolean,
): { canBuy: boolean; reason: string | null } {
  if (ONCE.has(e.kind) && e.owned > 0) return { canBuy: false, reason: 'Hast du schon.' };
  if (!shopOpen) return { canBuy: false, reason: 'Der Shop ist gerade geschlossen.' };
  if (coins < e.price) return { canBuy: false, reason: 'Dafür reichen die Münzen nicht.' };
  return { canBuy: true, reason: null };
}

export interface ItemApi {
  loadBook(): Promise<Outcome<ItemEntry[]>>;
  buy(itemId: string): Promise<Outcome<{ coins: number; qty: number }>>;
}

export function supabaseItemApi(supabase: SupabaseClient, uid: string): ItemApi {
  return {
    async loadBook() {
      const [cat, inv, slots] = await Promise.all([
        loadCatalog(supabase),
        loadInventory(supabase),
        loadOwnSlots(supabase, uid),
      ]);
      if (!cat.ok) return cat;
      if (!inv.ok) return inv;
      if (!slots.ok) return slots;
      return { ok: true, value: buildItemBook(cat.value, inv.value, slots.value) };
    },
    buy: (itemId) => buyItem(supabase, itemId),
  };
}
