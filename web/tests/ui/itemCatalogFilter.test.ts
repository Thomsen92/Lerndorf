import { describe, expect, it } from 'vitest';
import type { ItemEntry } from '../../src/api/items';
import { filterItemCatalog, type ItemCatalogFilter } from '../../src/ui/itemCatalogFilter';
const entry = (id: string, over: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  kind: 'deco',
  nameDe: id,
  price: 10,
  starter: false,
  owned: 0,
  free: 0,
  placedIn: [],
  fits: ['deco_1'],
  ...over,
});
const book = [
  entry('bench', { nameDe: 'Sunday Bench', owned: 3, free: 1 }),
  entry('starter', { starter: true, owned: 1 }),
  entry('hidden', { shopVisible: false, owned: 1 }),
  entry('house', { kind: 'house' }),
  entry('avatar', { kind: 'avatar' }),
];
const base: ItemCatalogFilter = {
  origin: 'shop',
  category: null,
  query: '',
  savedOnly: false,
  savedIds: new Set(),
};
describe('filterItemCatalog', () => {
  it('uses real visibility and starter rules in the shop', () =>
    expect(filterItemCatalog(book, base).map((e) => e.id)).toEqual(['bench', 'house', 'avatar']));
  it('combines category, trimmed case-insensitive name search and saved filter', () =>
    expect(
      filterItemCatalog(book, {
        ...base,
        category: 'deco',
        query: ' SUNDAY ',
        savedOnly: true,
        savedIds: new Set(['bench', 'house']),
      }).map((e) => e.id),
    ).toEqual(['bench']));
  it('includes owned hidden items and starters in inventory, never saved unowned items', () =>
    expect(
      filterItemCatalog(book, { ...base, origin: 'inventar', savedIds: new Set(['house']) }).map((e) => e.id),
    ).toEqual(['bench', 'starter', 'hidden']));
  it('does not infer avatar compatibility without a character', () =>
    expect(filterItemCatalog(book, { ...base, category: 'avatar' }).map((e) => e.id)).toEqual(['avatar']));
  it('does not mutate the input and returns empty saved results without inventing ownership', () => {
    expect(filterItemCatalog(book, { ...base, savedOnly: true })).toEqual([]);
    expect(book[0].owned).toBe(3);
  });
});
