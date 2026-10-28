import type { ItemEntry, ItemKind } from '../api/items';

export interface ItemCatalogFilter {
  origin: 'shop' | 'inventar';
  category: ItemKind | null;
  query: string;
  savedOnly: boolean;
  savedIds: ReadonlySet<string>;
}

/** Presentation filters only. Purchase permissions and ownership remain server controlled. */
export function filterItemCatalog(entries: readonly ItemEntry[], filter: ItemCatalogFilter): ItemEntry[] {
  const query = filter.query.trim().toLocaleLowerCase();
  return entries.filter(
    (entry) =>
      (filter.origin === 'shop' ? !entry.starter && entry.shopVisible !== false : entry.owned > 0) &&
      (filter.category === null || entry.kind === filter.category) &&
      (!query || entry.nameDe.toLocaleLowerCase().includes(query)) &&
      (!filter.savedOnly || filter.savedIds.has(entry.id)),
  );
}
