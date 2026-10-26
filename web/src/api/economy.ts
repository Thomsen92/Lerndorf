/**
 * Shop for the pupil. Reads go through RLS; every change is an RPC (SPEC §8).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CatalogItem {
  id: string;
  kind: 'deco' | 'avatar' | 'house' | 'garage' | 'car';
  slot: string | null;
  nameDe: string;
  price: number;
  starter: boolean;
  shopVisible?: boolean;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Turns the database error into a short German message for the pupil. */
function explain(message: string): string {
  if (message.includes('not enough coins')) return 'Dafür reichen die Münzen nicht.';
  if (message.includes('shop is closed')) return 'Der Shop ist gerade geschlossen.';
  if (message.includes('building is closed')) return 'Das Bauen ist gerade geschlossen.';
  if (message.includes('already occupied')) return 'Hier steht schon etwas.';
  if (message.includes('outside the free plot') || message.includes('no free copy'))
    return 'Hier kann man nichts hinstellen.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

export async function loadCatalog(supabase: SupabaseClient): Promise<Outcome<CatalogItem[]>> {
  const { data, error } = await supabase
    .from('items')
    .select('id, kind, slot, name_de, price, starter, shop_visible')
    .eq('active', true)
    .order('price');
  if (error) return fail('Der Shop konnte nicht geladen werden.');
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      slot: r.slot,
      nameDe: r.name_de,
      price: r.price,
      starter: r.starter,
      shopVisible: r.shop_visible ?? true,
    })),
  };
}

/** Owned quantity per item id (own inventory, RLS). */
export async function loadInventory(supabase: SupabaseClient): Promise<Outcome<Record<string, number>>> {
  const { data, error } = await supabase.from('inventory').select('item_id, qty').gt('qty', 0);
  if (error) return fail('Das Inventar konnte nicht geladen werden.');
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.item_id] = r.qty;
  return { ok: true, value: map };
}

export async function buyItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<Outcome<{ coins: number; qty: number }>> {
  const { data, error } = await supabase.rpc('buy_item', { p_item_id: itemId });
  if (error) return fail(explain(error.message));
  return { ok: true, value: data as { coins: number; qty: number } };
}
