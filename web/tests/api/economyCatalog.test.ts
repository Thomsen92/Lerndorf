import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buyItem, loadCatalog } from '../../src/api/economy';
import { buildItemBook } from '../../src/api/items';

function clientFor(rows: Record<string, unknown>[]): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: async () => ({ data: rows, error: null }),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe('catalogue metadata', () => {
  it('retains season and English description through the item book', async () => {
    const result = await loadCatalog(
      clientFor([
        {
          id: 'season_test',
          kind: 'deco',
          slot: null,
          name_de: 'Test',
          price: 20,
          starter: false,
          shop_visible: true,
          season: '2026-11-halloween',
          description: 'A warm lantern for your garden.',
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.value[0].season).toBe('2026-11-halloween');
    expect(result.value[0].description).toBe('A warm lantern for your garden.');
    const [entry] = buildItemBook(
      result.value,
      { season_test: 3 },
      {
        deco_1: { itemId: 'season_test', rot: 0 },
        deco_2: { itemId: 'season_test', rot: 1 },
      },
    );
    expect(entry).toMatchObject({
      seasonItem: true,
      owned: 3,
      free: 1,
      placedIn: ['deco_1', 'deco_2'],
      description: 'A warm lantern for your garden.',
    });
  });

  it('normalises absent metadata without hiding normal shop items', async () => {
    const result = await loadCatalog(
      clientFor([
        {
          id: 'plain',
          kind: 'house',
          slot: null,
          name_de: 'Plain',
          price: 100,
          starter: false,
        },
      ]),
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.value[0]).toMatchObject({ season: null, description: null, shopVisible: true });
  });
});

describe('purchase error certainty', () => {
  const client = (error: { code?: string; message: string }) =>
    ({
      rpc: async () => ({ data: null, error }),
    }) as unknown as SupabaseClient;

  it('preserves definitive server rejection codes', async () => {
    expect(
      await buyItem(client({ code: '22023', message: 'not enough coins' }), 'shop_support_duck'),
    ).toMatchObject({ ok: false, code: '22023' });
  });

  it.each([
    { message: 'Failed to fetch' },
    { message: 'Unknown error' },
    { code: '504', message: 'Network timeout' },
    { code: '57014', message: 'Request aborted' },
  ])('marks uncertain responses for a safe ownership check: %s', async (error) => {
    expect(await buyItem(client(error), 'shop_support_duck')).toMatchObject({
      ok: false,
      code: 'NETWORK_UNCERTAIN',
    });
  });

  it('marks a thrown transport error as uncertain', async () => {
    const rejected = {
      rpc: async () => {
        throw new TypeError('Failed to fetch');
      },
    } as unknown as SupabaseClient;
    expect(await buyItem(rejected, 'shop_support_duck')).toMatchObject({
      ok: false,
      code: 'NETWORK_UNCERTAIN',
    });
  });
});
