// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollectionCatalog } from '../../src/collection/types';
const preview = vi.hoisted(() => vi.fn());
vi.mock('../../src/collection/cardPreview', () => ({
  openCardPreview: preview,
}));
import { ALMANAC_CHAPTERS, CARDS_PER_PAGE, openCollection } from '../../src/collection/collectionView';
import type { CollectionApi } from '../../src/api/collection';

const catalog = JSON.parse(
  readFileSync('public/assets/collection/catalog.json', 'utf8'),
) as CollectionCatalog;

const api = (owned: string[]) =>
  ({
    my: async () => ({
      seasonId: '2026-11-halloween',
      cards: owned.map((cardId) => ({
        cardId,
        quantity: 1,
        firstAcquiredAt: '2026-10-28T10:00:00Z',
      })),
    }),
    teacherRead: vi.fn(),
  }) as unknown as CollectionApi;

const flush = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

function open(owned: string[] = [], focusCardId?: string) {
  return openCollection({
    api: api(owned),
    seasonId: '2026-11-halloween',
    catalog,
    reducedMotion: true,
    focusCardId,
  });
}

const ribbon = (label: string): HTMLButtonElement =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.almanac-ribbon')).find((b) =>
    b.textContent?.startsWith(label),
  )!;
const tiles = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.almanac-card'));

afterEach(() => document.body.replaceChildren());

describe('My Almanac', () => {
  it('opens as a book of its own with the cover and four rarity chapters', async () => {
    open(['night-light']);
    await flush();
    expect(document.querySelector('.overlay.almanac-overlay')).not.toBeNull();
    expect(document.querySelector('[role=dialog] h2')?.textContent).toBe('Mein Almanach');
    expect(document.querySelector('.almanac-intro-art')?.getAttribute('src')).toContain('almanac-cover.webp');
    expect(document.body.textContent).toContain('1 von 50 Karten entdeckt');
    const labels = Array.from(document.querySelectorAll('.almanac-ribbon')).map((b) => b.textContent);
    expect(labels).toEqual(['Normal1/18', 'Selten0/17', 'Episch0/14', 'Legendär0/1']);
    expect(ALMANAC_CHAPTERS).toEqual(['normal', 'rare', 'epic', 'legendary']);
  });

  it('lists every card once, sorted into its rarity chapter, at most nine per page', async () => {
    open();
    await flush();
    const seen = new Set<string>();
    for (const chapter of ['Normal', 'Selten', 'Episch', 'Legendär']) {
      ribbon(chapter).click();
      for (let guard = 0; guard < 4; guard++) {
        const page = tiles();
        expect(page.length).toBeLessThanOrEqual(CARDS_PER_PAGE * 2);
        page.forEach((tile) => seen.add(tile.dataset.cardId!));
        const next = document.querySelector<HTMLButtonElement>('.almanac-turn:last-child')!;
        if (next.disabled) break;
        next.click();
      }
    }
    expect(seen.size).toBe(50);
  });

  it('keeps undiscovered cards dark and closed, discovered ones open their page and 3D view', async () => {
    open(['night-light'], 'night-light');
    await flush();
    const locked = tiles().filter((tile) => tile.classList.contains('locked'));
    expect(locked.length).toBeGreaterThan(0);
    expect(locked.every((tile) => tile.disabled && !tile.querySelector('img'))).toBe(true);
    expect(locked[0].getAttribute('aria-label')).toMatch(/noch nicht entdeckt/);
    locked[0].click();
    expect(document.querySelector('.almanac-detail-art')).toBeNull();

    const star = tiles().find((tile) => tile.dataset.cardId === 'night-light')!;
    expect(star.disabled).toBe(false);
    star.click();
    expect(document.body.textContent).toContain('TWINKLE');
    expect(document.body.textContent).toContain('Jane Taylor');
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent === 'In 3D ansehen')!
      .click();
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({
        card: expect.objectContaining({ id: 'night-light' }),
      }),
    );
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent === '← Zurück zur Seite')!
      .click();
    expect(document.querySelector('.almanac-detail-art')).toBeNull();
  });

  it('has no achievements any more (they moved to the profile collection)', async () => {
    open();
    await flush();
    expect(document.body.textContent).not.toContain('Erfolge');
  });

  it('keeps every card dark when ownership cannot be loaded', async () => {
    const failing = {
      my: async () => {
        throw new Error('offline');
      },
      teacherRead: vi.fn(),
    } as unknown as CollectionApi;
    openCollection({
      api: failing,
      seasonId: '2026-11-halloween',
      catalog,
      reducedMotion: true,
    });
    await flush();
    expect(document.body.textContent).toContain('konnten nicht geladen werden');
    ribbon('Legendär').click();
    expect(tiles().every((tile) => tile.classList.contains('locked'))).toBe(true);
  });
});
