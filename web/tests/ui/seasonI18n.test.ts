// @vitest-environment happy-dom
// U7: German and English labels on the new season surfaces.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../../src/i18n';
import { itemName } from '../../src/ui/seasonChests';
import { createSeasonShopTile } from '../../src/ui/seasonShop';
import type { SeasonApi, SeasonState } from '../../src/api/season';

function state(): SeasonState {
  return {
    season: {
      id: '2026-11-halloween',
      label: 'Season I',
      theme: 'halloween',
      starts_on: '2026-10-28',
      ends_on: '2026-12-06',
      state: 'running',
      days_left: 26,
    },
    xp: 0,
    tier: 0,
    tiers: [],
    next: null,
    chests: { pass: 0, streak: 0, shop: 0 },
    shop: { price: 50, left: 1, week_start: '2026-10-26' },
    streak: { current: 0, best: 0, last_day: null, to_chest: 3 },
    choice: { open: false, item_id: null },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => setLocale('en'));

describe('season i18n', () => {
  it('uses the German item names', () => {
    setLocale('de');
    expect(itemName('season_bat')).toBe('Fledermaus');
    expect(itemName('season_house_horror')).toBe('Horror-Haus');
  });

  it('uses the English item names by default', () => {
    setLocale('en');
    expect(itemName('season_bat')).toBe('Bat');
    expect(itemName('season_house_horror')).toBe('Haunted house');
  });

  it('translates the shop tile heading', async () => {
    const api = { state: vi.fn().mockResolvedValue(state()), buyChest: vi.fn() } as unknown as SeasonApi;
    setLocale('de');
    const de = createSeasonShopTile({ api, getCoins: () => 240, onCoins: vi.fn() });
    document.body.append(de);
    await settle();
    expect(de.textContent).toContain('Season-Truhe');
    de.remove();
    setLocale('en');
    const en = createSeasonShopTile({ api, getCoins: () => 240, onCoins: vi.fn() });
    document.body.append(en);
    await settle();
    expect(en.textContent).toContain('Season chest');
    en.remove();
  });
});
