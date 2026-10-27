// @vitest-environment happy-dom
// "What's inside?" (plan §14.4): four bands from Legendary to Normal, built from the pool the
// database returns, so the shown rarity is always the rolled one (review B6).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ODDS, openInside } from '../../src/ui/learnpass/insideModal';
import type { PoolItem } from '../../src/api/season';
import { setLocale } from '../../src/i18n';

beforeEach(() => setLocale('en'));

const POOL: PoolItem[] = [
  { id: 'season_warlock', kind: 'deco', rarity: 'legendary', sell: 250 },
  { id: 'season_house_horror', kind: 'house', rarity: 'legendary', sell: 250 },
  { id: 'season_dodge', kind: 'car', rarity: 'epic', sell: 100 },
  { id: 'season_witch_statue', kind: 'deco', rarity: 'rare', sell: 40 },
  { id: 'season_bat', kind: 'deco', rarity: 'common', sell: 15 },
];

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('inside modal', () => {
  it('lists the odds from Legendary to Normal, summing to 100', () => {
    expect(ODDS.map((o) => o.rarity)).toEqual(['legendary', 'epic', 'rare', 'common']);
    expect(ODDS.map((o) => o.chance)).toEqual([3, 12, 30, 55]);
    expect(ODDS.reduce((sum, o) => sum + o.chance, 0)).toBe(100);
  });

  it('sorts every pool item into the band of its database rarity', async () => {
    const handle = openInside(document.body, { pool: Promise.resolve(POOL) });
    await settle();
    const bands = [...handle.el.querySelectorAll('.inside-band')];
    expect(bands).toHaveLength(4);
    expect(bands[0].textContent).toContain('3 %');
    expect(bands[0].textContent).toContain('Legendary · 2 items');
    expect(bands[0].textContent).toContain('Warlock');
    expect(bands[1].textContent).toContain('Pickup truck');
    expect(bands[2].textContent).toContain('Witch statue');
    expect(bands[3].textContent).toContain('Bat');
    expect(handle.el.textContent).toContain("What's inside a season chest?");
    expect(handle.el.textContent).not.toContain('sells for');
    handle.close();
  });

  it('closes on Escape and reports it', () => {
    const onClose = vi.fn();
    openInside(document.body, { pool: POOL, onClose });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.inside-overlay')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
