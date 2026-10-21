import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogItem } from '../../src/api/economy';
import {
  KIND_ORDER,
  buildItemBook,
  groupByKind,
  purchaseState,
  supabaseItemApi,
  type ItemEntry,
} from '../../src/api/items';

const catalog: CatalogItem[] = [
  { id: 'house_fachwerk', kind: 'house', slot: null, nameDe: 'Fachwerkhaus', price: 0, starter: true },
  { id: 'house_villa', kind: 'house', slot: null, nameDe: 'Villa', price: 100, starter: false },
  { id: 'deco_cat_sign', kind: 'deco', slot: null, nameDe: 'Katzenschild', price: 20, starter: false },
  { id: 'avatar_hat', kind: 'avatar', slot: null, nameDe: 'Hut', price: 10, starter: false },
];

const book = (inv: Record<string, number> = {}, slots = {}) => buildItemBook(catalog, inv, slots);
const entry = (id: string, b: ItemEntry[]) => b.find((e) => e.id === id)!;

describe('buildItemBook', () => {
  it('counts a starter as owned once and placed where it is the fallback', () => {
    const e = entry('house_fachwerk', book());
    expect(e.owned).toBe(1);
    expect(e.placedIn).toEqual(['house']);
    expect(e.free).toBe(0);
  });

  it('tracks placements and free copies of a deco', () => {
    const e = entry('deco_cat_sign', book({ deco_cat_sign: 2 }, { deco_3: { itemId: 'deco_cat_sign', rot: 0 } }));
    expect(e.owned).toBe(2);
    expect(e.placedIn).toEqual(['deco_3']);
    expect(e.free).toBe(1);
    expect(e.fits).toEqual(['deco_1', 'deco_2', 'deco_3', 'deco_4']);
  });

  it('gives avatar items no slots', () => {
    const e = entry('avatar_hat', book({ avatar_hat: 1 }));
    expect(e.fits).toEqual([]);
    expect(e.placedIn).toEqual([]);
  });

  it('keeps items the pupil does not own', () => {
    const b = book();
    expect(b).toHaveLength(catalog.length);
    expect(entry('house_villa', b).owned).toBe(0);
  });
});

describe('groupByKind', () => {
  it('returns all five kinds in order, empty groups included', () => {
    const groups = groupByKind(book());
    expect(groups.map((g) => g.kind)).toEqual([...KIND_ORDER]);
    expect(groups.find((g) => g.kind === 'car')!.items).toEqual([]);
    expect(groups.find((g) => g.kind === 'house')!.items).toHaveLength(2);
  });
});

describe('purchaseState', () => {
  it('blocks an owned once-only item first', () => {
    const e = entry('house_villa', book({ house_villa: 1 }));
    expect(purchaseState(e, 0, false)).toEqual({ canBuy: false, reason: 'Hast du schon.' });
  });
  it('blocks when the shop is closed', () => {
    const e = entry('house_villa', book());
    expect(purchaseState(e, 500, false)).toEqual({ canBuy: false, reason: 'Der Shop ist gerade geschlossen.' });
  });
  it('blocks when coins are short', () => {
    const e = entry('house_villa', book());
    expect(purchaseState(e, 99, true)).toEqual({ canBuy: false, reason: 'Dafür reichen die Münzen nicht.' });
  });
  it('allows buying a deco again', () => {
    const e = entry('deco_cat_sign', book({ deco_cat_sign: 3 }));
    expect(purchaseState(e, 20, true)).toEqual({ canBuy: true, reason: null });
  });
});

describe('supabaseItemApi', () => {
  it('reports a failed load', async () => {
    const failing = { data: null, error: { message: 'boom' } };
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'gt', 'in']) builder[m] = () => builder;
    builder.then = (res: (v: unknown) => unknown) => Promise.resolve(failing).then(res);
    const client = { from: () => builder } as unknown as SupabaseClient;
    const out = await supabaseItemApi(client, 'u1').loadBook();
    expect(out.ok).toBe(false);
  });
});
