// @vitest-environment happy-dom
// U3: "What's inside?" lists the four odds and all 28 pool items, and closes on Escape.
import { beforeEach, describe, expect, it } from 'vitest';
import { ODDS, POOL, SELL, openInside } from '../../src/ui/learnpass/insideModal';
import { setLocale } from '../../src/i18n';

beforeEach(() => setLocale('en'));


describe('inside modal', () => {
  it('shows the odds summing to 100 and the sell values', () => {
    expect(ODDS.map((o) => o.chance)).toEqual([55, 30, 12, 3]);
    expect(ODDS.reduce((sum, o) => sum + o.chance, 0)).toBe(100);
    expect(SELL).toEqual({ common: 15, rare: 40, epic: 100, legendary: 250 });
    expect(POOL.filter((p) => p.rarity === 'common')).toHaveLength(8);
    expect(POOL.filter((p) => p.rarity === 'rare')).toHaveLength(13);
    expect(POOL.filter((p) => p.rarity === 'epic')).toHaveLength(5);
    expect(POOL.filter((p) => p.rarity === 'legendary')).toHaveLength(2);
    expect(POOL).toHaveLength(28);
  });

  it('renders the item grid and closes on Escape', () => {
    const handle = openInside(document.body);
    expect(handle.el.querySelectorAll('.inside-item')).toHaveLength(28);
    expect(handle.el.textContent).toContain('55%');
    expect(handle.el.textContent).toContain('Legendary');
    expect(handle.el.textContent).toContain('Haunted house');
    handle.el.ownerDocument.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.inside-overlay')).toBeNull();
  });
});
