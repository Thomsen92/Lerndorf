import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadDecoRarities } from '../../src/api/decoRarities';

describe('decoration rarity catalogue', () => {
  const client = (data: unknown, error: unknown = null) => ({ from: () => ({ select: () => ({ in: () => Promise.resolve({ data, error }) }) }) }) as unknown as SupabaseClient;
  it('includes car rarity so driveway lighting follows the parked car', async () => {
    const filter = vi.fn().mockResolvedValue({data: [{id: 'car_camper', rarity:'rare'}], error:null});
    const db = {from: () => ({select: () => ({in: filter})})} as unknown as SupabaseClient;
    expect((await loadDecoRarities(db)).get('car_camper')).toBe('rare');
    expect(filter).toHaveBeenCalledWith('kind', ['deco', 'car']);
  });
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
