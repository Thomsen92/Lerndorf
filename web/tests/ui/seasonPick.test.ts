// @vitest-environment happy-dom
// Tier-40 pick (plan E7, §14.5): owned badge, coin hint before confirming, and two taps to pick.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openSeasonPick } from '../../src/ui/learnpass/seasonPick';
import type { PoolItem } from '../../src/api/season';
import { setLocale } from '../../src/i18n';

beforeEach(() => setLocale('en'));

const POOL: PoolItem[] = [
  { id: 'season_bat', kind: 'deco', rarity: 'common', sell: 15 },
  { id: 'season_warlock', kind: 'deco', rarity: 'legendary', sell: 250 },
  { id: 'season_pumpkin_patch', kind: 'deco', rarity: 'epic', sell: 100 },
];

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

describe('season pick', () => {
  it('marks owned items, explains the coins and picks only after a second tap', async () => {
    const onPick = vi.fn().mockResolvedValue(undefined);
    const pick = openSeasonPick(document.body, { pool: POOL, owned: new Set(['season_pumpkin_patch']), onPick });
    await settle();
    const buttons = [...pick.el.querySelectorAll<HTMLButtonElement>('.pick-grid button')];
    expect(buttons).toHaveLength(3);
    // legendary first, as in "What's inside?"
    expect(buttons[0].getAttribute('aria-label')).toContain('Warlock');
    const owned = buttons.find((b) => b.classList.contains('owned'));
    owned?.click();
    expect(pick.el.querySelector('.pick-note')?.textContent).toBe(
      'You already own Pumpkin patch. Picking it gives you 100 coins.',
    );
    const confirm = pick.el.querySelector<HTMLButtonElement>('.pick-confirm');
    confirm?.click();
    expect(onPick).not.toHaveBeenCalled();
    confirm?.click();
    expect(onPick).toHaveBeenCalledWith('season_pumpkin_patch');
    await settle();
    expect(document.querySelector('.inside-overlay')).toBeNull();
  });
});
