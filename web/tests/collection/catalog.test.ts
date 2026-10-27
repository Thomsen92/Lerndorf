// Package 1: the generated runtime catalogue must describe exactly the approved collection and
// must never point outside web/public/assets/collection.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CatalogError,
  assetPaths,
  catalogAssetUrl,
  cardById,
  validateCollectionCatalog,
} from '../../src/collection/catalog';
import type { CollectionCatalog } from '../../src/collection/types';

const publicDir = new URL('../../public/assets/collection/', import.meta.url);
const rawCatalog = JSON.parse(
  readFileSync(new URL('catalog.json', publicDir), 'utf8'),
) as CollectionCatalog;
const manifest = JSON.parse(readFileSync(new URL('import-manifest.json', publicDir), 'utf8')) as {
  contentVersion: string;
  files: Array<{ path: string; sha256: string; bytes: number }>;
};

function copy(): CollectionCatalog {
  return structuredClone(rawCatalog);
}

describe('collection catalogue', () => {
  it('validates the generated runtime catalogue', () => {
    const catalog = validateCollectionCatalog(rawCatalog);
    expect(catalog.cards).toHaveLength(50);
    expect(catalog.contentVersion).toMatch(/^[0-9a-f]{64}$/);
    expect(catalog.contentVersion).toBe(manifest.contentVersion);
  });

  it('holds exactly 18 normal, 17 rare, 14 epic and one legendary card', () => {
    const counts = { normal: 0, rare: 0, epic: 0, legendary: 0 };
    for (const card of rawCatalog.cards) counts[card.rarity] += 1;
    expect(counts).toEqual({ normal: 18, rare: 17, epic: 14, legendary: 1 });
    expect(rawCatalog.cards.filter((card) => card.rarity === 'legendary')[0]?.id).toBe(
      'highlight-halloween-card',
    );
    expect(rawCatalog.rarityPolicy.legendaryExclusiveCardId).toBe('highlight-halloween-card');
    expect(rawCatalog.almanacCover.cardId).toBe('highlight-halloween-card');
    expect(rawCatalog.almanacCover.requiresCardOwnership).toBe(false);
  });

  it('keeps ids and print numbers unique and archives the eight benched figures', () => {
    expect(new Set(rawCatalog.cards.map((card) => card.id)).size).toBe(50);
    expect(new Set(rawCatalog.cards.map((card) => card.number)).size).toBe(50);
    expect(rawCatalog.archivedCards).toHaveLength(8);
    expect(rawCatalog.archivedCards.every((card) => card.status === 'benched')).toBe(true);
    const active = new Set(rawCatalog.cards.map((card) => card.id));
    for (const archived of rawCatalog.archivedCards) expect(active.has(archived.id)).toBe(false);
  });

  it('gives every printed surface one model for card and motif', () => {
    const printed = rawCatalog.cards.filter((card) => card.format === 'printed-surface');
    expect(printed).toHaveLength(20);
    for (const card of printed) expect(card.motifModel).toBe(card.model);
    for (const card of rawCatalog.cards.filter((entry) => entry.format !== 'printed-surface'))
      expect(card.motifModel).not.toBe(card.model);
  });

  it('assigns 35 normal/rare cards to the 24 coin tiers', () => {
    expect(rawCatalog.passCardRewards).toHaveLength(24);
    expect(rawCatalog.passCardRewards.reduce((sum, tier) => sum + tier.cardIds.length, 0)).toBe(35);
    const ids = rawCatalog.passCardRewards.flatMap((tier) => tier.cardIds);
    expect(new Set(ids).size).toBe(35);
    for (const id of ids) expect(['normal', 'rare']).toContain(cardById(rawCatalog, id)?.rarity);
    const coinTiers = rawCatalog.acquisitionPolicy.learnpass.coinTiers;
    for (const tier of rawCatalog.passCardRewards) expect(coinTiers).toContain(tier.tier);
  });

  it('keeps the 15 epic/legendary chest cards out of the pass', () => {
    const chestIds = rawCatalog.acquisitionPolicy.chest.cardIds;
    expect(chestIds).toHaveLength(15);
    expect(chestIds.filter((id) => cardById(rawCatalog, id)?.rarity === 'legendary')).toEqual([
      'highlight-halloween-card',
    ]);
    const passIds = new Set(rawCatalog.passCardRewards.flatMap((tier) => tier.cardIds));
    for (const id of chestIds) expect(passIds.has(id)).toBe(false);
  });

  it('only references files that the import copied below the public asset root', () => {
    const listed = new Map(manifest.files.map((file) => [file.path, file]));
    for (const path of assetPaths(rawCatalog)) {
      expect(listed.has(path)).toBe(true);
      const file = readFileSync(new URL(path, publicDir));
      expect(file.byteLength).toBe(listed.get(path)?.bytes);
    }
    expect(manifest.files).toHaveLength(assetPaths(rawCatalog).length + 2);
    expect(manifest.files.map((file) => file.path)).toEqual(
      expect.arrayContaining(['LICENSES.md', 'LITERARY_SOURCES.md']),
    );
  });

  it('resolves every path below the app base URL', () => {
    expect(catalogAssetUrl('cards/a.glb', '/')).toBe('/assets/collection/cards/a.glb');
    expect(catalogAssetUrl('cards/a.glb', '/Lerndorf/')).toBe('/Lerndorf/assets/collection/cards/a.glb');
  });

  it('rejects duplicate ids, a second legendary and unsafe asset paths', () => {
    const duplicate = copy();
    duplicate.cards[1].id = duplicate.cards[0].id;
    expect(() => validateCollectionCatalog(duplicate)).toThrow(CatalogError);

    const legendary = copy();
    legendary.rarityPolicy.legendaryExclusiveCardId = legendary.cards[0].id;
    expect(() => validateCollectionCatalog(legendary)).toThrow(/legendary/);

    const unsafe = copy();
    unsafe.cards[0].model = '../../../Prototyp/secret.glb';
    expect(() => validateCollectionCatalog(unsafe)).toThrow(/relative asset path/);

    const format = copy();
    format.cards[0].format = 'hologram' as never;
    expect(() => validateCollectionCatalog(format)).toThrow(/format/);

    const satire = copy();
    const funny = satire.cards.find((card) => card.satire);
    if (!funny) throw new Error('expected a satirical card');
    funny.effectMode = undefined;
    expect(() => validateCollectionCatalog(satire)).toThrow(/flavour-only/);

    const missing = copy();
    missing.cards.splice(0, 1);
    expect(() => validateCollectionCatalog(missing)).toThrow(/exactly 50/);
  });

  it('rejects a pass tier that points at an epic card or doubles a card', () => {
    const epic = copy();
    const epicCard = epic.cards.find((card) => card.rarity === 'epic');
    if (!epicCard) throw new Error('expected an epic card');
    epic.passCardRewards[0].cardIds = [epicCard.id];
    expect(() => validateCollectionCatalog(epic)).toThrow(/must not contain epic/);

    const doubled = copy();
    doubled.passCardRewards[1].cardIds = [doubled.passCardRewards[0].cardIds[0]];
    expect(() => validateCollectionCatalog(doubled)).toThrow(/twice|tier/);
  });

  it('ships no prototype paths, Blender sources or licence-less copies', () => {
    const text = readFileSync(new URL('catalog.json', publicDir), 'utf8');
    expect(text).not.toContain('Prototyp/');
    expect(text).not.toContain('.blend');
    expect(text).not.toContain('http://127.0.0.1');
    expect(readFileSync(new URL('LICENSES.md', publicDir), 'utf8')).toContain('CC0');
  });
});
