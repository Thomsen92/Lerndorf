// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemApi, ItemEntry } from '../../src/api/items';
import type { PreviewFactory } from '../../src/render/itemPreview';
import { itemCard, openItemDetail, type DetailOptions } from '../../src/ui/itemDetail';
import type { ModalHandle } from '../../src/ui/dialog';
import type { SeasonApi } from '../../src/api/season';

const deco: ItemEntry = {
  id: 'deco_cat',
  kind: 'deco',
  nameDe: 'Katzenschild',
  price: 120,
  starter: false,
  owned: 2,
  placedIn: ['deco_3'],
  free: 1,
  fits: ['deco_1', 'deco_2', 'deco_3', 'deco_4'],
};
const avatar: ItemEntry = { ...deco, id: 'hat', kind: 'avatar', nameDe: 'Hut', owned: 0, placedIn: [], free: 0, fits: [] };

let handles: ModalHandle[] = [];
let opener: HTMLButtonElement;
beforeEach(() => {
  document.body.innerHTML = '<main><button class="opn">x</button></main>';
  opener = document.querySelector('.opn') as HTMLButtonElement;
});
afterEach(() => {
  [...handles].reverse().forEach((h) => h.close());
  handles = [];
});

const text = (): string => document.querySelector('[role="dialog"]')?.textContent ?? '';
const btn = (label: string): HTMLButtonElement | undefined =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent === label);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function open(over: Partial<DetailOptions> & { entry: ItemEntry }, api?: Partial<ItemApi>) {
  const calls = {
    onCoins: vi.fn(),
    onBuild: vi.fn(),
    onShowSlot: vi.fn(),
    onOpenInventory: vi.fn(),
    onChanged: vi.fn(),
  };
  const fullApi: ItemApi = {
    loadBook: async () => ({ ok: true, value: [] }),
    buy: async () => ({ ok: true, value: { coins: 30, qty: 1 } }),
    ...api,
  };
  const h = openItemDetail({
    origin: 'shop',
    opener,
    api: fullApi,
    getCoins: () => 150,
    shopOpen: true,
    buildOpen: true,
    createPreview: () => null,
    reducedMotion: true,
    ...calls,
    ...over,
  });
  handles.push(h);
  return { h, calls, api: fullApi };
}

describe('itemCard', () => {
  it('shop card shows name, kind, price and the blocked reason', () => {
    const c = itemCard(deco, 'shop', { coins: 10, shopOpen: true });
    expect(c.tagName).toBe('BUTTON');
    expect(c.textContent).toContain('Katzenschild');
    expect(c.textContent).toContain('Garten-Deko');
    expect(c.textContent).toContain('120 Münzen');
    expect(c.textContent).toContain('Dafür reichen die Münzen nicht.');
    const ok = itemCard(deco, 'shop', { coins: 500, shopOpen: true });
    expect(ok.textContent).not.toContain('reichen');
  });
  it('inventory card shows owned and placed counts', () => {
    const c = itemCard(deco, 'inventar', { coins: 0, shopOpen: true });
    expect(c.textContent).toContain('Besitz: 2 · aufgestellt: 1');
  });
  it('escapes names', () => {
    const c = itemCard({ ...deco, nameDe: '<b>x</b>' }, 'shop', { coins: 500, shopOpen: true });
    expect(c.querySelector('b')).toBeNull();
  });
});

describe('preview', () => {
  it('renders a labelled canvas when the factory returns a preview', () => {
    const show = vi.fn();
    const dispose = vi.fn();
    const { h } = open({ entry: deco, createPreview: (() => ({ show, dispose })) as unknown as PreviewFactory });
    expect(document.querySelector('canvas')?.getAttribute('aria-label')).toBe('Vorschau: Katzenschild');
    expect(show).toHaveBeenCalledWith('deco', 'deco_cat');
    h.close();
    expect(dispose).toHaveBeenCalled();
  });
  it('shows an error and retry when the factory returns null; buy stays enabled', () => {
    const factory = vi.fn(() => null);
    open({ entry: deco, createPreview: factory as unknown as PreviewFactory });
    expect(text()).toContain('Die Vorschau konnte nicht geladen werden.');
    expect(factory).toHaveBeenCalledTimes(1);
    btn('Nochmal versuchen')!.click();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(btn('Kaufen für 120 Münzen')!.disabled).toBe(false);
  });
  it('retry moves focus to the first action button', () => {
    const stub = { show: vi.fn(), dispose: vi.fn() };
    const factory = vi.fn().mockReturnValueOnce(null).mockReturnValue(stub);
    open({ entry: deco, createPreview: factory as unknown as PreviewFactory });
    btn('Nochmal versuchen')!.click();
    expect(document.querySelector('canvas')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelector('.item-actions button'));
  });
  it('avatar items get a hint instead of a canvas, and no Aufstellen', () => {
    open({ entry: avatar, origin: 'inventar' });
    expect(document.querySelector('canvas')).toBeNull();
    expect(text()).toContain('Vorschau gibt es mit dem Avatar-Editor.');
    expect(btn('Aufstellen')).toBeUndefined();
  });
});

describe('shop flow', () => {
  it('disables buying with the reason visible', () => {
    open({ entry: deco, getCoins: () => 5 });
    expect(btn('Kaufen für 120 Münzen')!.disabled).toBe(true);
    expect(text()).toContain('Dafür reichen die Münzen nicht.');
  });
  it('confirms, buys once on double click, reports the result', async () => {
    const buy = vi.fn(async () => ({ ok: true as const, value: { coins: 30, qty: 1 } }));
    const { calls } = open({ entry: deco }, { buy });
    btn('Kaufen für 120 Münzen')!.click();
    expect(text()).toContain('Für 120 Münzen „Katzenschild“ kaufen?');
    expect(text()).toContain('Danach übrig: 30 Münzen.');
    expect(btn('Abbrechen')).toBeDefined();
    const yes = btn('Ja, kaufen')!;
    expect(document.activeElement).toBe(yes);
    yes.click();
    yes.click();
    await flush();
    expect(buy).toHaveBeenCalledTimes(1);
    expect(calls.onCoins).toHaveBeenCalledWith(30);
    expect(calls.onChanged).toHaveBeenCalled();
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      '„Katzenschild“ gekauft. Du hast jetzt 30 Münzen. Besitz insgesamt: 1.',
    );
    expect(btn('Zum Inventar')).toBeDefined();
    expect(document.activeElement).toBe(btn('Zum Inventar'));
    btn('Jetzt aufstellen')!.click();
    expect(calls.onBuild).toHaveBeenCalledWith('deco_cat');
  });
  it('hides Jetzt aufstellen when building is closed', async () => {
    open({ entry: deco, buildOpen: false });
    btn('Kaufen für 120 Münzen')!.click();
    btn('Ja, kaufen')!.click();
    await flush();
    expect(btn('Zum Inventar')).toBeDefined();
    expect(btn('Jetzt aufstellen')).toBeUndefined();
  });
  it('Escape does not close while the purchase is pending, result is not lost', async () => {
    let resolve!: (v: { ok: true; value: { coins: number; qty: number } }) => void;
    const buy = vi.fn(() => new Promise<{ ok: true; value: { coins: number; qty: number } }>((r) => (resolve = r)));
    const { h, calls } = open({ entry: deco }, { buy });
    btn('Kaufen für 120 Münzen')!.click();
    btn('Ja, kaufen')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.isOpen).toBe(true);
    resolve({ ok: true, value: { coins: 30, qty: 1 } });
    await flush();
    expect(h.isOpen).toBe(true);
    expect(calls.onCoins).toHaveBeenCalledWith(30);
    expect(text()).toContain('gekauft');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(h.isOpen).toBe(false);
  });
  it('shows a failure message and allows trying again', async () => {
    const buy = vi.fn(async () => ({ ok: false as const, message: 'Dafür reichen die Münzen nicht.' }));
    const { calls } = open({ entry: deco }, { buy });
    btn('Kaufen für 120 Münzen')!.click();
    btn('Ja, kaufen')!.click();
    await flush();
    expect(document.querySelector('[role="status"]')?.textContent).toBe('Dafür reichen die Münzen nicht.');
    expect(calls.onCoins).not.toHaveBeenCalled();
    expect(btn('Ja, kaufen')!.disabled).toBe(false);
    expect(document.activeElement).toBe(btn('Ja, kaufen'));
  });
  it('a throwing callback does not leave the dialog stuck', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { calls } = open({ entry: deco });
    calls.onChanged.mockImplementation(() => {
      throw new Error('boom');
    });
    btn('Kaufen für 120 Münzen')!.click();
    btn('Ja, kaufen')!.click();
    await flush();
    expect(text()).toContain('gekauft');
    expect(text()).not.toContain('Einen Moment');
    spy.mockRestore();
  });
});

describe('inventory', () => {
  it('Aufstellen builds and closes', () => {
    const { h, calls } = open({ entry: deco, origin: 'inventar' });
    btn('Aufstellen')!.click();
    expect(calls.onBuild).toHaveBeenCalledWith('deco_cat');
    expect(h.isOpen).toBe(false);
  });
  it('Zum Platz jumps to the slot', () => {
    const { calls } = open({ entry: deco, origin: 'inventar' });
    btn('Zum Platz: Deko-Platz 3')!.click();
    expect(calls.onShowSlot).toHaveBeenCalledWith('deco_3');
  });
  it('building closed disables Aufstellen with a reason', () => {
    open({ entry: deco, origin: 'inventar', buildOpen: false });
    expect(btn('Aufstellen')!.disabled).toBe(true);
    expect(text()).toContain('Das Bauen ist gerade geschlossen.');
  });
});

describe('itemCard thumbnail', () => {
  const ctx = { coins: 100, shopOpen: true };
  it('shows the placeholder, then the picture', async () => {
    const card = itemCard(deco, 'shop', ctx, async () => 'data:image/png;base64,AAA');
    expect(card.querySelector('span.item-thumb[aria-hidden="true"]')?.textContent).toBe('🌳');
    await flush();
    const img = card.querySelector('img.item-thumb');
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,AAA');
    expect(img?.getAttribute('alt')).toBe('');
    expect(card.querySelector('span.item-thumb')).toBeNull();
  });
  it('keeps the placeholder when the source resolves null or is missing', async () => {
    const card = itemCard(avatar, 'shop', ctx, async () => null);
    await flush();
    expect(card.querySelector('span.item-thumb')?.textContent).toBe('👕');
    expect(itemCard(deco, 'inventar', ctx).querySelector('span.item-thumb')).not.toBeNull();
  });
});

describe('season selling', () => {
  it('sells one free copy for coins', async () => {
    const sell = vi.fn().mockResolvedValue({ coins: 40 });
    const season = { sell } as unknown as SeasonApi;
    const { calls } = open({ origin: 'inventar', entry: { ...deco, seasonItem: true }, season });
    await flush();
    btn('Verkaufen')?.click();
    await flush();
    expect(sell).toHaveBeenCalledWith('deco_cat', 1);
    expect(calls.onCoins).toHaveBeenCalledWith(190);
    expect(calls.onChanged).toHaveBeenCalled();
  });
});
describe('description', () => {
  it('shows the English description in the detail', () => {
    const { h } = open({
      origin: 'shop',
      entry: { ...deco, description: 'A bubbling cauldron overflowing with Halloween candy.' },
    });
    expect(document.querySelector('.item-description')?.textContent).toBe(
      'A bubbling cauldron overflowing with Halloween candy.',
    );
    h.close();
  });
});
