import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadDecoRarities } from '../../src/api/decoRarities';

describe('decoration rarity catalogue', () => {
  const client = (data: unknown, error: unknown = null) => ({ from: () => ({ select: () => ({ eq: () => Promise.resolve({ data, error }) }) }) }) as unknown as SupabaseClient;
  it('reads existing rarity metadata without changing placements or inventory', async () => {
    const result = await loadDecoRarities(client([{id: 'blue', rarity: 'rare'}, {id:'gold', rarity:'legendary'}]));
    expect([...result]).toEqual([['blue','rare'], ['gold','legendary']]);
  });
  it('unknown or missing metadata remains common', async () => {
    const result = await loadDecoRarities(client([{id:'old',rarity:null},{id:'future',rarity:'new'}]));
    expect([...result.values()]).toEqual(['common','common']);
  });
  it('older or unavailable catalogues safely return an empty map', async () => {
    expect((await loadDecoRarities(client(null, {message:'unavailable'}))).size).toBe(0);
  });
});
