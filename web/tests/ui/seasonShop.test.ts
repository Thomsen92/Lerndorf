// @vitest-environment happy-dom
// U4a: the season chest tile in the shop — weekly limit, coins and error messages.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeasonShopTile } from '../../src/ui/seasonShop';
import type { SeasonApi, SeasonState } from '../../src/api/season';
import { setLocale } from '../../src/i18n';

beforeEach(() => setLocale('en'));

function state(left: number, running = true): SeasonState {
  return {
    season: {
      id: '2026-11-halloween',
      label: 'Season I',
      theme: 'halloween',
      starts_on: '2026-10-28',
      ends_on: '2026-12-06',
      state: running ? 'running' : 'ended',
      days_left: 26,
    },
    xp: 0,
    tier: 0,
    tiers: [],
    next: null,
    chests: { pass: 0, streak: 0, shop: 0 },
    shop: { price: 50, left, week_start: '2026-10-26' },
    streak: { current: 0, best: 0, last_day: null, to_chest: 3 },
    choice: { open: false, item_id: null },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('season shop tile', () => {
  it('buys a chest for 50 coins and shows the remaining count', async () => {
    const onCoins = vi.fn();
    const api = {
      state: vi.fn().mockResolvedValue(state(2)),
      buyChest: vi.fn().mockResolvedValue({ left: 1 }),
    } as unknown as SeasonApi;
    const tile = createSeasonShopTile({ api, getCoins: () => 240, onCoins });
    document.body.append(tile);
    await settle();
    expect(tile.querySelector('.season-shop-meta')?.textContent).toContain('2 of 2');
    tile.querySelector<HTMLButtonElement>('.season-shop-buy')?.click();
    await settle();
    expect(api.buyChest).toHaveBeenCalled();
    expect(onCoins).toHaveBeenCalledWith(190);
    expect(tile.querySelector('.season-shop-meta')?.textContent).toContain('1 of 2');
    expect(tile.querySelector('.season-shop-status')?.textContent).toContain('inventory');
    tile.remove();
  });

  it('disables the button when the weekly limit is reached', async () => {
    const api = { state: vi.fn().mockResolvedValue(state(0)), buyChest: vi.fn() } as unknown as SeasonApi;
    const tile = createSeasonShopTile({ api, getCoins: () => 240, onCoins: vi.fn() });
    document.body.append(tile);
    await settle();
    const button = tile.querySelector<HTMLButtonElement>('.season-shop-buy');
    expect(button?.disabled).toBe(true);
    expect(button?.textContent).toBe('Limit reached');
    tile.remove();
  });

  it('shows a friendly message when the RPC refuses', async () => {
    const api = {
      state: vi.fn().mockResolvedValue(state(1)),
      buyChest: vi.fn().mockRejectedValue(new Error('weekly limit')),
    } as unknown as SeasonApi;
    const tile = createSeasonShopTile({ api, getCoins: () => 240, onCoins: vi.fn() });
    document.body.append(tile);
    await settle();
    tile.querySelector<HTMLButtonElement>('.season-shop-buy')?.click();
    await settle();
    expect(tile.querySelector('.season-shop-status')?.textContent).toContain('two chests');
    tile.remove();
  });

  it('explains an ended season', async () => {
    const api = {
      state: vi.fn().mockResolvedValue(state(2, false)),
      buyChest: vi.fn(),
    } as unknown as SeasonApi;
    const tile = createSeasonShopTile({ api, getCoins: () => 240, onCoins: vi.fn() });
    document.body.append(tile);
    await settle();
    expect(tile.querySelector<HTMLButtonElement>('.season-shop-buy')?.disabled).toBe(true);
    expect(tile.querySelector('.season-shop-meta')?.textContent).toContain('not running');
    tile.remove();
  });
});

it('blocks teacher-closed shop purchases without hiding the chest tile', async () => {
  const api = { state: vi.fn().mockResolvedValue(state(2)), buyChest: vi.fn() } as unknown as SeasonApi;
  const tile = createSeasonShopTile({ api, shopOpen: false, getCoins: () => 240, onCoins: vi.fn() });
  await settle();
  tile.querySelector<HTMLButtonElement>('.season-shop-buy')?.click();
  expect(api.buyChest).not.toHaveBeenCalled();
  expect(tile.textContent).toContain('closed');
  tile.dispose();
});
it('disposes pending season purchase callbacks and late loads', async () => {
  let finish!: (value: { left: number }) => void;
  const api = {
    state: vi.fn().mockResolvedValue(state(2)),
    buyChest: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  } as unknown as SeasonApi;
  const onCoins = vi.fn();
  const tile = createSeasonShopTile({ api, getCoins: () => 240, onCoins });
  await settle();
  tile.querySelector<HTMLButtonElement>('.season-shop-buy')?.click();
  tile.dispose();
  finish({ left: 1 });
  await settle();
  expect(onCoins).not.toHaveBeenCalled();
});
