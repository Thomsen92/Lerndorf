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
  it('shows tier chip, progress, days left and waiting chests, and opens the pass (plan §14.5)', async () => {
    const onOpen = vi.fn();
    const api = { state: vi.fn().mockResolvedValue(state()) } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen });
    document.body.append(card);
    await settle();
    expect(card.querySelector('.profile-season-chip')?.textContent).toBe('Tier 12');
    expect(card.querySelector('.profile-season-meta')?.textContent).toBe('26 days left · 2 chests waiting');
    expect(card.querySelector('.profile-season-bar')).not.toBeNull();
    const open = card.querySelector<HTMLButtonElement>('.profile-season-open');
    expect(open?.textContent).toBe('Open LearnPass');
    expect(open?.disabled).toBe(false);
    open?.click();
    expect(onOpen).toHaveBeenCalled();
    card.remove();
  });

  it('leaves out the chests without waiting ones', async () => {
    const api = {
      state: vi.fn().mockResolvedValue(state({ chests: { pass: 0, streak: 0, shop: 0 } })),
    } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen: vi.fn() });
    document.body.append(card);
    await settle();
    expect(card.querySelector('.profile-season-meta')?.textContent).toBe('26 days left');
    card.remove();
  });

  it('keeps the button disabled when the season cannot be loaded', async () => {
    const api = { state: vi.fn().mockRejectedValue(new Error('offline')) } as unknown as SeasonApi;
    const card = createSeasonCard({ api, onOpen: vi.fn() });
    document.body.append(card);
    await settle();
    expect(card.querySelector<HTMLButtonElement>('.profile-season-open')?.disabled).toBe(true);
    expect(card.textContent).toContain('could not be loaded');
    card.remove();
  });
});

