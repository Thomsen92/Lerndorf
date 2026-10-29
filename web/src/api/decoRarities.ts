import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecoRarity } from '../render/decoPresentation';

/** Read-only catalogue metadata; a missing/older catalogue safely uses common presentation. */
export async function loadDecoRarities(client: SupabaseClient): Promise<Map<string, DecoRarity>> {
  const { data, error } = await client.from('items').select('id, rarity').eq('kind', 'deco');
  if (error) return new Map();
  return new Map((data ?? []).map((row) => [row.id as string,
    (['rare', 'epic', 'legendary'].includes(row.rarity) ? row.rarity : 'common') as DecoRarity]));
}
