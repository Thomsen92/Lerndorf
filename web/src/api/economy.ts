import { tr, itemName } from '../i18n';
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
  season?: string | null;
  /** English shop description shown in the item detail. */
  description?: string | null;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Turns the database error into a short German message for the pupil. */
function explain(message: string): string {
  if (message.includes('not enough coins')) return tr('Dafür reichen die Münzen nicht.');
  if (message.includes('shop is closed')) return tr('Der Shop ist gerade geschlossen.');
  if (message.includes('building is closed')) return tr('Das Bauen ist gerade geschlossen.');
  if (message.includes('already occupied')) return tr('Hier steht schon etwas.');
  if (message.includes('outside the free plot') || message.includes('no free copy'))
    return tr('Hier kann man nichts hinstellen.');
  return tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.');
}

export async function loadCatalog(supabase: SupabaseClient): Promise<Outcome<CatalogItem[]>> {
  const { data, error } = await supabase
    .from('items')
    .select('id, kind, slot, name_de, price, starter, shop_visible, season, description')
    .eq('active', true)
    .order('price');
  if (error) return fail(tr('Der Shop konnte nicht geladen werden.'));
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      slot: r.slot,
      nameDe: itemName(r.id, r.name_de),
      price: r.price,
      starter: r.starter,
      shopVisible: r.shop_visible ?? true,
      season: r.season ?? null,
      description: r.description ?? null,
    })),
  };
}

/** Owned quantity per item id (own inventory, RLS). */
export async function loadInventory(supabase: SupabaseClient): Promise<Outcome<Record<string, number>>> {
  const { data, error } = await supabase.from('inventory').select('item_id, qty').gt('qty', 0);
  if (error) return fail(tr('Das Inventar konnte nicht geladen werden.'));
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.item_id] = r.qty;
  return { ok: true, value: map };
}

export async function buyItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<Outcome<{ coins: number; qty: number }>> {
  try {
    const { data, error } = await supabase.rpc('buy_item', { p_item_id: itemId });
    if (error) {
      // buy_item has no request ID. A transport failure can arrive after a successful booking.
      const uncertain = !error.code || /fetch|network|timeout|timed out|abort/i.test(error.message);
      return {
        ok: false,
        message: uncertain
          ? tr('Die Kaufantwort ist unklar. Prüfe zuerst dein Inventar, bevor du erneut kaufst.')
          : explain(error.message),
        code: uncertain ? 'NETWORK_UNCERTAIN' : error.code,
      };
    }
    return { ok: true, value: data as { coins: number; qty: number } };
  } catch {
    return {
      ok: false,
      message: tr('Die Kaufantwort ist unklar. Prüfe zuerst dein Inventar, bevor du erneut kaufst.'),
      code: 'NETWORK_UNCERTAIN',
    };
  }
}
