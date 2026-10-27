// @vitest-environment happy-dom
// U2: season chests in the inventory — count, open, reveal card and duplicate note.
import { describe, expect, it, vi } from 'vitest';
import { createSeasonChests } from '../../src/ui/seasonChests';
import type { SeasonApi } from '../../src/api/season';

function api(overrides: Partial<SeasonApi> = {}): SeasonApi {
  return {
    state: vi.fn(),
    chests: vi.fn().mockResolvedValue([
      { id: 1, source: 'pass' },
      { id: 2, source: 'streak' },
    ]),
    claim: vi.fn(),
    choose: vi.fn(),
    buyChest: vi.fn(),
    openChest: vi.fn().mockResolvedValue({
      rarity: 'rare',
      item_id: 'season_bat',
      name_de: 'Fledermaus',
      duplicate: false,
      coins: 0,
    }),
    sell: vi.fn(),
    ...overrides,
  } as SeasonApi;
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('season chests in the inventory', () => {
  it('shows the waiting count and opens the first chest', async () => {
    const openChest = vi.fn().mockResolvedValue({
      rarity: 'rare',
      item_id: 'season_bat',
      name_de: 'Fledermaus',
      duplicate: false,
      coins: 0,
    });
    const section = createSeasonChests({
      api: api({ openChest }),
      getCoins: () => 240,
      onCoins: () => undefined,
      reducedMotion: true,
    });
    document.body.append(section);
    await settle();
    expect(section.querySelector('.season-chest-count')?.textContent).toBe('×2');
    const button = section.querySelector<HTMLButtonElement>('.season-chest-open');
    button?.click();
    await settle();
    expect(openChest).toHaveBeenCalledWith(1);
    expect(section.querySelector('.season-chest-count')?.textContent).toBe('×1');
    const card = section.querySelector('.season-reveal-card');
    expect(card?.textContent).toContain('Bat');
    expect(card?.textContent).toContain('Rare');
    section.querySelector<HTMLButtonElement>('.season-reveal-ok')?.click();
    expect(section.querySelector('.season-reveal')).toBeNull();
    section.remove();
  });

  it('explains a duplicate and books the coins', async () => {
    const onCoins = vi.fn();
    const section = createSeasonChests({
      api: api({
        openChest: vi.fn().mockResolvedValue({
          rarity: 'common',
          item_id: 'season_ghost',
          name_de: 'Kleiner Geist',
          duplicate: true,
          coins: 15,
        }),
      }),
      getCoins: () => 240,
      onCoins,
      reducedMotion: true,
    });
    document.body.append(section);
    await settle();
    section.querySelector<HTMLButtonElement>('.season-chest-open')?.click();
    await settle();
    expect(section.querySelector('.season-reveal-note')?.textContent).toContain('15');
    expect(onCoins).toHaveBeenCalledWith(255);
    section.remove();
  });
});
