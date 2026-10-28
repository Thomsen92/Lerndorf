// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollectionCatalog } from '../../src/collection/types';
const preview = vi.hoisted(() => vi.fn());
vi.mock('../../src/collection/cardPreview', () => ({ openCardPreview: preview }));
import { openCollection } from '../../src/collection/collectionView';
import type { CollectionApi } from '../../src/api/collection';

const catalog = JSON.parse(
  readFileSync('public/assets/collection/catalog.json', 'utf8'),
) as CollectionCatalog;

const api = (owned: string[]) =>
  ({
    my: async () => ({
      seasonId: '2026-11-halloween',
      cards: owned.map((cardId) => ({ cardId, quantity: 1, firstAcquiredAt: '2026-10-28T10:00:00Z' })),
    }),
    teacherRead: vi.fn(),
  }) as unknown as CollectionApi;

function open(owned: string[] = []) {
  return openCollection({
    api: api(owned),
    seasonId: '2026-11-halloween',
    catalog,
    reducedMotion: true,
  });
}

afterEach(() => document.body.replaceChildren());

describe('collection almanach', () => {
  it('opens on the shared cover and reveals the almanach without owning the legendary card', async () => {
    open();
    await Promise.resolve();
    const cover = document.querySelector<HTMLImageElement>('.collection-cover-image');
    expect(cover?.getAttribute('src')).toContain('assets/collection/textbook/highlight-halloween-cover.png');
    expect(document.body.textContent).toContain('50 Karten');
    const legendary = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Legendary-Karte'),
    );
    legendary?.click();
    expect(document.body.textContent).toContain('Highlight 8');
  });

  it('lists all 50 cards, filters by rarity, curses and search', async () => {
    open();
    await Promise.resolve();
    const almanach = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Almanach öffnen',
    );
    almanach?.click();
    expect(document.querySelectorAll('.collection-card')).toHaveLength(50);

    const curses = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Classroom Curses',
    );
    curses?.click();
    expect(document.querySelectorAll('.collection-card')).toHaveLength(8);

    const all = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Alle');
    all?.click();
    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'Pumpkin Comparisons';
    search.dispatchEvent(new Event('input'));
    const names = Array.from(document.querySelectorAll('.collection-card-name')).map(
      (el) => el.textContent ?? '',
    );
    expect(names).toEqual(['Pumpkin Comparisons']);
  });

  it('marks owned cards and shows full card content with a 3D opener', async () => {
    open(['night-light']);
    await Promise.resolve();
    await Promise.resolve();
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent === 'Almanach öffnen')!
      .click();
    expect(document.querySelectorAll('.collection-owned')).toHaveLength(1);

    const search = document.querySelector<HTMLInputElement>('input[type=search]')!;
    search.value = 'The Star';
    search.dispatchEvent(new Event('input'));
    document.querySelector<HTMLButtonElement>('.collection-card')!.click();
    expect(document.body.textContent).toContain('Classic verse');
    expect(document.body.textContent).toContain('TWINKLE');
    expect(document.body.textContent).toContain('Jane Taylor');
    expect(document.body.textContent).toContain('In deiner Sammlung');
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent === 'In 3D ansehen')!
      .click();
    expect(preview).toHaveBeenCalledWith(
      expect.objectContaining({ card: expect.objectContaining({ id: 'night-light' }) }),
    );
  });

  it('labels achievements as a placeholder', async () => {
    open();
    await Promise.resolve();
    Array.from(document.querySelectorAll('button'))
      .find((b) => b.textContent === 'Erfolge')!
      .click();
    expect(document.body.textContent).toContain('Platzhalter');
  });

  it('keeps the almanach readable when ownership fails', async () => {
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
    await Promise.resolve();
    await Promise.resolve();
    expect(document.body.textContent).toContain('50 Karten');
    expect(document.querySelectorAll('.collection-owned')).toHaveLength(0);
  });
});
