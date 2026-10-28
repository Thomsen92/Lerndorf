// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { openItemDetail } from '../../src/ui/itemDetail';
import type { ItemEntry, ItemApi } from '../../src/api/items';
const entry: ItemEntry = {
  id: 'deco_test',
  kind: 'deco',
  nameDe: 'Blumen',
  price: 25,
  starter: false,
  owned: 0,
  free: 0,
  placedIn: [],
  fits: ['deco_1'],
};
let handle: ReturnType<typeof openItemDetail> | undefined;
afterEach(() => {
  handle?.close();
  document.body.replaceChildren();
});
function open(buy: ItemApi['buy']) {
  const opener = document.createElement('button');
  document.body.append(opener);
  const coins = vi.fn(),
    changed = vi.fn(),
    inventory = vi.fn();
  handle = openItemDetail({
    entry,
    origin: 'shop',
    opener,
    api: { loadBook: async () => ({ ok: true, value: [] }), buy },
    getCoins: () => 100,
    shopOpen: true,
    buildOpen: true,
    onCoins: coins,
    onChanged: changed,
    onBuild: vi.fn(),
    onShowSlot: vi.fn(),
    onOpenInventory: inventory,
    createPreview: () => null,
  });
  return { coins, changed, inventory };
}
const click = (label: string) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent === label)!.click();
it('does not repeat an uncertain purchase and offers inventory verification', async () => {
  const buy = vi.fn(async () => ({ ok: false as const, message: 'Unklar', code: 'NETWORK_UNCERTAIN' }));
  const c = open(buy);
  click('Kaufen für 25 Münzen');
  click('Ja, kaufen');
  await new Promise((r) => setTimeout(r, 0));
  expect(buy).toHaveBeenCalledTimes(1);
  expect(c.coins).not.toHaveBeenCalled();
  expect([...document.querySelectorAll('button')].some((b) => b.textContent === 'Ja, kaufen')).toBe(false);
  click('Zum Inventar');
  expect(c.inventory).toHaveBeenCalledOnce();
});
it('ignores late purchase callbacks after the area is closed on logout', async () => {
  let resolve!: (r: { ok: true; value: { coins: number; qty: number } }) => void;
  const c = open(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  click('Kaufen für 25 Münzen');
  click('Ja, kaufen');
  handle!.close();
  resolve({ ok: true, value: { coins: 75, qty: 1 } });
  await new Promise((r) => setTimeout(r, 0));
  expect(c.coins).not.toHaveBeenCalled();
  expect(c.changed).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
