// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemApi, ItemEntry, ItemKind } from '../../src/api/items';
import { openInventory } from '../../src/ui/inventoryView';
import { openShop, type ItemAreaOptions } from '../../src/ui/shopView';
import type { AreaHandle } from '../../src/ui/areas';

const mk = (id: string, kind: ItemKind, over: Partial<ItemEntry> = {}): ItemEntry => ({
  id,
  kind,
  nameDe: id,
  price: 20,
  starter: false,
  owned: 0,
  placedIn: [],
  free: 0,
  fits: kind === 'avatar' ? [] : ['house'],
  ...over,
});
const book: ItemEntry[] = [
  mk('house_start', 'house', { starter: true, owned: 1, price: 0, placedIn: ['house'] }),
  mk('house_big', 'house', { price: 50 }),
  mk('deco_cat', 'deco', { price: 10, owned: 1, free: 1 }),
  mk('deco_tree', 'deco', { price: 30 }),
  mk('hat', 'avatar', { price: 5 }),
];

let handles: AreaHandle[] = [];
beforeEach(() => {
  document.body.innerHTML = '<main><p>village</p></main>';
});
afterEach(() => {
  handles.forEach((h) => h.close());
  handles = [];
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const btn = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent === label);
const area = (): HTMLElement => document.querySelector('section.overlay.area') as HTMLElement;
const cardIds = (): string[] =>
  Array.from(document.querySelectorAll<HTMLElement>('.item-card')).map((c) => c.dataset.item ?? '');

function opts(over: Partial<ItemAreaOptions> = {}, api: Partial<ItemApi> = {}): ItemAreaOptions {
  return {
    api: {
      loadBook: async () => ({ ok: true, value: book }),
      buy: async () => ({ ok: true, value: { coins: 30, qty: 1 } }),
      ...api,
    },
    getCoins: () => 100,
    onCoins: vi.fn(),
    shopOpen: true,
    buildOpen: true,
    category: null,
    onCategory: vi.fn(),
    onBuild: vi.fn(),
    onShowSlot: vi.fn(),
    onOpenInventory: vi.fn(),
    onClose: vi.fn(),
    thumbs: async () => null,
    createPreview: () => null,
    ...over,
  };
}
async function shop(over: Partial<ItemAreaOptions> = {}, api: Partial<ItemApi> = {}) {
  const o = opts(over, api);
  const h = openShop(o);
  handles.push(h);
  await flush();
  return { o, h };
}

describe('shop', () => {
  it('is a non-modal labelled region', async () => {
    await shop();
    const a = area();
    expect(a.getAttribute('role')).toBe('region');
    const h2 = document.getElementById(a.getAttribute('aria-labelledby') ?? '');
    expect(h2?.tagName).toBe('H2');
    expect(h2?.textContent).toBe('Shop');
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(false);
  });

  it('starts on all items, hides starters and switches category', async () => {
    const { o } = await shop();
    const bar = Array.from(document.querySelectorAll<HTMLButtonElement>('.category-bar button'));
    expect(bar.map((b) => b.textContent)).toEqual([
      'Alle Gegenstände',
      'Häuser',
      'Garagen',
      'Autos',
      'Garten-Deko',
      'Für deinen Avatar',
    ]);
    expect(btn('Alle Gegenstände')?.getAttribute('aria-pressed')).toBe('true');
    expect(cardIds()).toEqual(['house_big', 'deco_cat', 'deco_tree', 'hat']);
    btn('Garten-Deko')?.click();
    expect(cardIds()).toEqual(['deco_cat', 'deco_tree']);
    expect(o.onCategory).toHaveBeenCalledWith('deco');
    expect(btn('Garten-Deko')?.getAttribute('aria-pressed')).toBe('true');
    expect(btn('Häuser')?.getAttribute('aria-pressed')).toBe('false');
    btn('Alle Gegenstände')?.click();
    expect(o.onCategory).toHaveBeenLastCalledWith(null);
    expect(cardIds()).toEqual(['house_big', 'deco_cat', 'deco_tree', 'hat']);
  });

  it('starts on the given category', async () => {
    await shop({ category: 'avatar' });
    expect(cardIds()).toEqual(['hat']);
  });

  it('shows a message for an empty category', async () => {
    await shop();
    btn('Autos')?.click();
    expect(area().textContent).toContain('In dieser Kategorie gibt es gerade nichts.');
  });

  it('shows a closed banner and the reason on the cards', async () => {
    await shop({ shopOpen: false });
    expect(area().textContent).toContain('Der Shop ist gerade geschlossen.');
    expect(document.querySelector('.item-card .item-reason')?.textContent).toBe(
      'Der Shop ist gerade geschlossen.',
    );
  });

  it('offers retry and close when the book cannot be loaded', async () => {
    let fail = true;
    const loadBook = vi.fn(async () =>
      fail ? { ok: false as const, message: 'Kein Netz.' } : { ok: true as const, value: book },
    );
    const { o } = await shop({}, { loadBook });
    expect(area().textContent).toContain('Kein Netz.');
    fail = false;
    btn('Nochmal versuchen')?.click();
    await flush();
    expect(loadBook).toHaveBeenCalledTimes(2);
    expect(cardIds()).toEqual(['house_big', 'deco_cat', 'deco_tree', 'hat']);
    btn('Schließen')?.click();
    expect(o.onClose).toHaveBeenCalledTimes(1);
  });

  it('reloads after a purchase so affordability uses the new coins', async () => {
    let coins = 100;
    const loadBook = vi.fn(async () => ({ ok: true as const, value: book }));
    await shop({ getCoins: () => coins, onCoins: (c) => (coins = c) }, { loadBook });
    expect(loadBook).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-item="house_big"] .item-reason')).toBeNull();
    btn('Garten-Deko')?.click();
    (document.querySelector('[data-item="deco_tree"]') as HTMLElement).click();
    btn('Kaufen für 30 Münzen')?.click();
    btn('Ja, kaufen')?.click();
    await flush();
    await flush();
    expect(coins).toBe(30);
    expect(loadBook).toHaveBeenCalledTimes(2);
    btn('Zum Inventar')?.click();
    btn('Häuser')?.click();
    expect(document.querySelector('[data-item="house_big"] .item-reason')?.textContent).toBe(
      'Dafür reichen die Münzen nicht.',
    );
  });

  it('close() removes the area, disposes an open detail and does not call onClose', async () => {
    const { o, h } = await shop();
    (document.querySelector('.item-card') as HTMLElement).click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    h.close();
    expect(document.querySelector('section.overlay.area')).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(o.onClose).not.toHaveBeenCalled();
    expect(document.querySelector('main')?.hasAttribute('inert')).toBe(false);
  });
});

describe('inventory', () => {
  async function inv(api: ItemApi['loadBook'] = async () => ({ ok: true, value: book })) {
    const h = openInventory({ ...opts({}, { loadBook: api }), createPreview: () => null });
    handles.push(h);
    await flush();
  }

  it('lists owned items including starters, with categories only for owned kinds', async () => {
    await inv();
    const kinds = Array.from(document.querySelectorAll('.category-bar button')).map((b) => b.textContent);
    expect(kinds).toEqual(['Alle Gegenstände', 'Häuser', 'Garten-Deko']);
    expect(cardIds()).toEqual(['house_start', 'deco_cat']);
    btn('Garten-Deko')?.click();
    expect(cardIds()).toEqual(['deco_cat']);
    expect(document.getElementById(area().getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Inventar',
    );
  });

  it('shows the empty text when nothing is owned', async () => {
    await inv(async () => ({ ok: true, value: [mk('house_big', 'house')] }));
    expect(area().textContent).toContain(
      'Du hast noch keine eigenen Sachen. Im Shop kannst du welche kaufen.',
    );
    expect(document.querySelector<HTMLElement>('.category-bar')?.hidden).toBe(true);
  });
});

describe('item area thumbnails', () => {
  it('requests a thumbnail for every card of the current category only, once', async () => {
    const thumbs = vi.fn(async () => 'data:image/png;base64,AAA');
    handles.push(openShop(opts({ category: 'deco', thumbs })));
    await flush();
    await flush();
    expect(thumbs.mock.calls.map((c) => (c as unknown as [ItemEntry])[0].id).sort()).toEqual([
      'deco_cat',
      'deco_tree',
    ]);
    expect(area().querySelectorAll('img.item-thumb').length).toBe(2);
    btn('Garten-Deko')?.click();
    await flush();
    expect(thumbs).toHaveBeenCalledTimes(2);
    expect(area().querySelectorAll('img.item-thumb').length).toBe(2);
  });
  it('falls back to placeholders when the source yields nothing', async () => {
    handles.push(openShop(opts({ category: 'deco', thumbs: async () => null })));
    await flush();
    await flush();
    expect(area().querySelectorAll('span.item-thumb').length).toBe(2);
  });
});

describe('item area browsing', () => {
  it('combines search and saved filters without buying, using the supplied session list', async () => {
    const savedIds = new Set(['deco_cat']);
    const buy = vi.fn();
    await shop({ savedIds, category: 'deco' }, { buy });
    const search = area().querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'tree';
    search.dispatchEvent(new Event('input'));
    expect(cardIds()).toEqual(['deco_tree']);
    area().querySelector<HTMLButtonElement>('[data-save="deco_tree"]')!.click();
    expect(savedIds.has('deco_tree')).toBe(true);
    area().querySelector<HTMLButtonElement>('[data-filter="saved"]')!.click();
    expect(cardIds()).toEqual(['deco_tree']);
    expect(buy).not.toHaveBeenCalled();
  });
  it('navigates to the existing inventory and shop through callbacks', async () => {
    const onOpenInventory = vi.fn();
    await shop({ onOpenInventory });
    area().querySelector<HTMLButtonElement>('[data-nav="inventar"]')!.click();
    expect(onOpenInventory).toHaveBeenCalledOnce();
    handles.forEach((h) => h.close());
    const onShop = vi.fn();
    handles.push(openInventory({ ...opts(), onShop }));
    await flush();
    area().querySelector<HTMLButtonElement>('[data-nav="shop"]')!.click();
    expect(onShop).toHaveBeenCalledOnce();
  });
  it('keeps season content after load, category switches and purchase reloads', async () => {
    const { h } = await shop({
      season: { state: async () => ({ season: { state: 'running' }, shop: { left: 2 } }) } as never,
    });
    const season = area().querySelector('.season-shop');
    expect(season).not.toBeNull();
    btn('Garten-Deko')!.click();
    expect(area().querySelector('.season-shop')).toBe(season);
    (document.querySelector('[data-item="deco_tree"]') as HTMLElement).click();
    btn('Kaufen für 30 Münzen')?.click();
    btn('Ja, kaufen')?.click();
    await flush();
    await flush();
    expect(area().querySelector('.season-shop')).toBe(season);
    h.close();
  });
});

describe('item area ownership and lifecycle', () => {
  it('keeps inventory chest controls visible even with no owned item types', async () => {
    const { onOpenInventory: _unused, ...options } = opts();
    const handle = openInventory({ ...options, api: { ...options.api, loadBook: async () => ({ ok: true, value: [] }) }, season: { chests: async () => [{ id: 1, source: 'shop' }] } as never });
    handles.push(handle); await flush();
    expect(area().querySelector('.season-chest-open')).not.toBeNull();
    expect(area().textContent).toContain('Du hast noch keine eigenen Sachen.');
    expect(area().querySelector('.item-area-owned-count')?.textContent).toBe('0');
  });
  it('shows authoritative inventory quantities including available copies', async () => {
    handles.push(openInventory({ ...opts(), category: 'deco', api: { loadBook: async () => ({ ok: true, value: [mk('bench', 'deco', { owned: 3, free: 1, placedIn: ['deco_1', 'deco_2'] })] }), buy: vi.fn() } }));
    await flush(); expect(area().querySelector('.item-count')?.textContent).toBe('Besitz: 3 · aufgestellt: 2 · frei: 1');
    expect(area().querySelector('.item-price')).toBeNull();
  });
  it('does not remount a closed area after a late book or thumbnail response', async () => {
    let finish!: (result: { ok: true; value: ItemEntry[] }) => void;
    const handle = openShop(opts({}, { loadBook: () => new Promise(resolve => { finish = resolve; }) }));
    handle.close(); finish({ ok: true, value: book }); await flush();
    expect(document.querySelector('.item-area')).toBeNull();
    let thumb!: (url: string) => void;
    const second = openShop(opts({ category: 'house', thumbs: () => new Promise(resolve => { thumb = resolve; }) }));
    await flush(); second.close(); thumb('late.png'); await flush();
    expect(document.querySelector('.item-area')).toBeNull(); expect(document.querySelector('img[src="late.png"]')).toBeNull();
  });
});
