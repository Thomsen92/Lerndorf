// @vitest-environment happy-dom
// U5: season card in the profile — tier, days left, waiting chests and the click target.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeasonCard } from '../../src/ui/seasonCard';
import type { SeasonApi, SeasonState } from '../../src/api/season';
import { setLocale } from '../../src/i18n';

beforeEach(() => setLocale('en'));


function state(overrides: Partial<SeasonState> = {}): SeasonState {
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
    xp: 452,
    tier: 12,
    tiers: [],
    next: null,
    chests: { pass: 2, streak: 0, shop: 0 },
    shop: { price: 50, left: 1, week_start: '2026-10-26' },
    streak: { current: 2, best: 4, last_day: '2026-10-26', to_chest: 1 },
    choice: { open: false, item_id: null },
    ...overrides,
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('profile season card', () => {
  it('shows tier, days left and the waiting chest badge', async () => {
    const onOpen = vi.fn();
    const api = { state: vi.fn().mockResolvedValue(state()) } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen }) as HTMLButtonElement;
    document.body.append(card);
    await settle();
    expect(card.disabled).toBe(false);
    expect(card.textContent).toContain('Tier 12 of 40 · 26 days left');
    expect(card.querySelector('.profile-season-badge')?.textContent).toBe('×2');
    card.click();
    expect(onOpen).toHaveBeenCalled();
    card.remove();
  });

  it('hides the badge without waiting chests', async () => {
    const api = {
      state: vi.fn().mockResolvedValue(state({ chests: { pass: 0, streak: 0, shop: 0 } })),
    } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen: vi.fn() }) as HTMLButtonElement;
    document.body.append(card);
    await settle();
    expect(card.querySelector<HTMLElement>('.profile-season-badge')?.hidden).toBe(true);
    card.remove();
  });

  it('stays disabled when the season cannot be loaded', async () => {
    const api = { state: vi.fn().mockRejectedValue(new Error('offline')) } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen: vi.fn() }) as HTMLButtonElement;
    document.body.append(card);
    await settle();
    expect(card.disabled).toBe(true);
    expect(card.textContent).toContain('could not be loaded');
    card.remove();
  });
});
