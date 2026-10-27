// @vitest-environment happy-dom
// U1: the LearnPass page renders 40 tier cards, turns the reached tier into a Collect action and
// closes on Escape. The API is replaced by callbacks, so no network is involved.
import { describe, expect, it, vi } from 'vitest';
import { renderLearnPass } from '../../src/ui/learnpass/learnpassView';
import type { SeasonState, SeasonTier } from '../../src/api/season';

function mockState(): SeasonState {
  const chests = new Set([5, 10, 15, 20, 25, 30, 35, 40]);
  const tiers: SeasonTier[] = [];
  for (let t = 1; t <= 40; t++) {
    const xp = t <= 10 ? t * 30 : t <= 20 ? 300 + (t - 10) * 60 : t <= 30 ? 900 + (t - 20) * 90 : 1800 + (t - 30) * 120;
    tiers.push({
      tier: t,
      xp,
      coins: (t <= 20 ? 5 : 0) + (chests.has(t) ? 25 : 0),
      chest: chests.has(t),
      title_id: null,
      frame_id: null,
      item_id: null,
      choice: t === 40,
      state: t < 12 ? 'claimed' : t === 12 ? 'ready' : t === 13 ? 'next' : 'locked',
    });
  }
  return {
    season: {
      id: '2026-11-halloween',
      label: 'Season I – Halloween',
      theme: 'halloween',
      starts_on: '2026-10-28',
      ends_on: '2026-12-06',
      state: 'running',
      days_left: 26,
    },
    xp: 452,
    tier: 12,
    tiers,
    next: { tier: 13, xp: 480, missing: 28 },
    chests: { pass: 1, streak: 0, shop: 0 },
    shop: { price: 50, left: 1, week_start: '2026-10-26' },
    streak: { current: 2, best: 4, last_day: '2026-10-26', to_chest: 1 },
    choice: { open: false, item_id: null },
  };
}

function render(overrides: Partial<Parameters<typeof renderLearnPass>[1]> = {}) {
  const actions = {
    onClose: vi.fn(),
    onClaim: vi.fn().mockResolvedValue(undefined),
    onBuyChest: vi.fn().mockResolvedValue(undefined),
    onOpenInventory: vi.fn(),
    onOpenInside: vi.fn(),
    onPickItem: vi.fn(),
    getCoins: () => 240,
    ...overrides,
  };
  const view = renderLearnPass(mockState(), actions, false);
  document.body.append(view.el);
  return { view, actions };
}

describe('LearnPass page', () => {
  it('renders all forty tiers and marks the reached one', () => {
    const { view } = render();
    expect(view.el.querySelectorAll('.lp-card')).toHaveLength(40);
    expect(view.el.querySelectorAll('.lp-card.claimed')).toHaveLength(11);
    const ready = view.el.querySelector('.lp-card.ready');
    expect(ready?.getAttribute('aria-label')).toContain('12');
    expect(ready?.querySelector('button')?.textContent).toBe('Abholen');
    expect(view.el.querySelector('.lp-you')?.textContent).toBe('Du');
    view.destroy();
  });

  it('claims the reached tier through the callback', async () => {
    const { view, actions } = render();
    const button = view.el.querySelector<HTMLButtonElement>('.lp-card.ready button');
    button?.click();
    expect(actions.onClaim).toHaveBeenCalledWith(12);
    view.destroy();
  });

  it('closes on Escape', () => {
    const { view, actions } = render();
    view.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(actions.onClose).toHaveBeenCalled();
    view.destroy();
  });

  it('shows the coins and the shop limit', () => {
    const { view } = render();
    expect(view.el.querySelector('.lp-coins')?.textContent).toBe('240');
    const texts = [...view.el.querySelectorAll('.lp-tile-text small')].map((el) => el.textContent ?? '');
    expect(texts.some((t) => t.includes('1 von 2'))).toBe(true);
    view.destroy();
  });
});
