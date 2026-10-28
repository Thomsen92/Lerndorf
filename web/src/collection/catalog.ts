// Runtime catalogue of the Halloween collection (plan package 1).
//
// The catalogue is generated from Prototyp/marktplatz/assets/collection/catalog.json by
// scripts/import-halloween-prototype.ts. This module never invents cards, never loads a 3D
// model and never reads player state: it only validates public definitions and resolves paths
// below the app base URL.
import {
  CARD_COUNT,
  PASS_CARD_COUNT,
  RARITY_COUNTS,
  RARITY_ORDER,
  type CardDefinition,
  type CardKind,
  type CardRarity,
  type CollectionCatalog,
} from './types.ts';

export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

const KINDS: readonly CardKind[] = [
  'grammar',
  'vocabulary',
  'proverb',
  'rhyme',
  'simile',
  'tongue-twister',
  'poem',
  'humour',
];
const ASSET_EXTENSIONS = /\.(glb|png|svg|jpe?g|webp)$/;
const ASSET_PATH = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

function fail(message: string): never {
  throw new CatalogError(message);
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${where} must be an object`);
  return value as Record<string, unknown>;
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${where} must be a non-empty string`);
  return value;
}

function integer(value: unknown, where: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${where} must be a non-negative integer`);
  return value as number;
}

function asset(value: unknown, where: string): string {
  const path = text(value, where);
  if (!ASSET_PATH.test(path) || path.includes('..') || path.includes('\\') || path.startsWith('/'))
    fail(`${where} must be a relative asset path without "..": ${path}`);
  if (!ASSET_EXTENSIONS.test(path)) fail(`${where} must point to a supported asset file: ${path}`);
  return path;
}

function rarity(value: unknown, where: string): CardRarity {
  if (typeof value !== 'string' || !RARITY_ORDER.includes(value as CardRarity))
    fail(`${where} must be one of ${RARITY_ORDER.join(', ')}`);
  return value as CardRarity;
}

function stringList(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    fail(`${where} must be a list of strings`);
  return value as string[];
}

function optionalText(value: unknown, where: string): string | undefined {
  if (value === undefined) return undefined;
  return text(value, where);
}

function card(value: unknown, index: number): CardDefinition {
  const where = `cards[${index}]`;
  const raw = object(value, where);
  const id = text(raw.id, `${where}.id`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(`${where}.id must be a kebab-case id: ${id}`);
  const kind = text(raw.kind, `${where}.kind`);
  if (!KINDS.includes(kind as CardKind)) fail(`${where}.kind is unknown: ${kind}`);
  const format = raw.format === undefined ? undefined : text(raw.format, `${where}.format`);
  if (format !== undefined && format !== 'printed-surface') fail(`${where}.format is unknown: ${format}`);
  const model = asset(raw.model, `${where}.model`);
  const motifModel = asset(raw.motifModel, `${where}.motifModel`);
  if (format === 'printed-surface' && model !== motifModel)
    fail(`${where} prints must reuse the same model for card and motif`);
  if (raw.satire !== undefined && typeof raw.satire !== 'boolean') fail(`${where}.satire must be a boolean`);
  if (raw.satire === true && raw.effectMode !== 'flavour-only')
    fail(`${where} satire must stay flavour-only`);
  const definition: CardDefinition = {
    id,
    number: integer(raw.number, `${where}.number`),
    name: text(raw.name, `${where}.name`),
    rarity: rarity(raw.rarity, `${where}.rarity`),
    kind: kind as CardKind,
    format: format as CardDefinition['format'],
    series: optionalText(raw.series, `${where}.series`),
    model,
    motifModel,
    thumbnail: asset(raw.thumbnail, `${where}.thumbnail`),
    front: asset(raw.front, `${where}.front`),
    back: asset(raw.back, `${where}.back`),
    topic: text(raw.topic, `${where}.topic`),
    key: text(raw.key, `${where}.key`),
    example: text(raw.example, `${where}.example`),
    notes: stringList(raw.notes, `${where}.notes`),
    tip: text(raw.tip, `${where}.tip`),
    color: optionalText(raw.color, `${where}.color`),
    icon: optionalText(raw.icon, `${where}.icon`),
    description: optionalText(raw.description, `${where}.description`),
    effects: raw.effects === undefined ? undefined : stringList(raw.effects, `${where}.effects`),
    flavour: optionalText(raw.flavour, `${where}.flavour`),
    satire: raw.satire as boolean | undefined,
    effectMode: raw.effectMode === 'flavour-only' ? 'flavour-only' : undefined,
    acquisition:
      raw.acquisition === undefined ? undefined : acquisition(raw.acquisition, `${where}.acquisition`),
    source: raw.source === undefined ? undefined : excerpt(raw.source, `${where}.source`),
    reference: raw.reference === undefined ? undefined : reference(raw.reference, `${where}.reference`),
    assetRoles: raw.assetRoles === undefined ? undefined : stringList(raw.assetRoles, `${where}.assetRoles`),
  };
  return definition;
}

function acquisition(value: unknown, where: string): CardDefinition['acquisition'] {
  const raw = object(value, where);
  const source = text(raw.source, `${where}.source`);
  if (source !== 'learnpass' && source !== 'season-chest') fail(`${where}.source is unknown: ${source}`);
  return {
    source,
    tier: raw.tier === undefined ? undefined : integer(raw.tier, `${where}.tier`),
    additionalToCoins: raw.additionalToCoins === true,
    uniquePerPlayer: raw.uniquePerPlayer === true,
  };
}

function excerpt(value: unknown, where: string): CardDefinition['source'] {
  const raw = object(value, where);
  if (raw.type !== 'original-excerpt') fail(`${where}.type must be original-excerpt`);
  return {
    type: 'original-excerpt',
    author: text(raw.author, `${where}.author`),
    work: text(raw.work, `${where}.work`),
    location: text(raw.location, `${where}.location`),
    url: text(raw.url, `${where}.url`),
    publisher: text(raw.publisher, `${where}.publisher`),
    excerptLines: stringList(raw.excerptLines, `${where}.excerptLines`),
    verifiedOn: text(raw.verifiedOn, `${where}.verifiedOn`),
    rights: text(raw.rights, `${where}.rights`),
    authorNote: optionalText(raw.authorNote, `${where}.authorNote`),
    additionalUrl: optionalText(raw.additionalUrl, `${where}.additionalUrl`),
  };
}

function reference(value: unknown, where: string): CardDefinition['reference'] {
  const raw = object(value, where);
  if (raw.type !== 'user-supplied-textbook-adaptation')
    fail(`${where}.type must be user-supplied-textbook-adaptation`);
  return {
    type: 'user-supplied-textbook-adaptation',
    work: text(raw.work, `${where}.work`),
    publisher: text(raw.publisher, `${where}.publisher`),
    page: text(raw.page, `${where}.page`),
    note: text(raw.note, `${where}.note`),
    sourceImage: raw.sourceImage === undefined ? undefined : asset(raw.sourceImage, `${where}.sourceImage`),
    author: optionalText(raw.author, `${where}.author`),
  };
}

/** Validates a generated catalogue. Throws CatalogError with a precise field for bad input. */
export function validateCollectionCatalog(
  input: unknown,
  opts: { requireContentVersion?: boolean } = {},
): CollectionCatalog {
  const raw = object(input, 'catalog');
  const cards = raw.cards;
  if (!Array.isArray(cards)) fail('cards must be a list');
  if (cards.length !== CARD_COUNT) fail(`catalog must contain exactly ${CARD_COUNT} cards`);
  const parsed = cards.map(card);
  const byId = new Map<string, CardDefinition>();
  const numbers = new Set<number>();
  for (const definition of parsed) {
    if (byId.has(definition.id)) fail(`duplicate card id: ${definition.id}`);
    if (numbers.has(definition.number)) fail(`duplicate card number: ${definition.number}`);
    byId.set(definition.id, definition);
    numbers.add(definition.number);
  }
  for (const rarityName of RARITY_ORDER) {
    const count = parsed.filter((definition) => definition.rarity === rarityName).length;
    if (count !== RARITY_COUNTS[rarityName])
      fail(`expected ${RARITY_COUNTS[rarityName]} ${rarityName} cards, found ${count}`);
  }
  const legendary = parsed.filter((definition) => definition.rarity === 'legendary');
  const policy = object(raw.rarityPolicy, 'rarityPolicy');
  const exclusive = text(policy.legendaryExclusiveCardId, 'rarityPolicy.legendaryExclusiveCardId');
  if (legendary[0]?.id !== exclusive) fail('the only legendary card must be the exclusive card');
  const cover = almanacCover(raw.almanacCover);
  if (cover.cardId !== exclusive) fail('the almanac cover must be the exclusive legendary card');
  if (cover.requiresCardOwnership !== false) fail('the almanac cover must stay visible without ownership');
  if (!byId.has(cover.cardId)) fail(`the almanac cover card is missing: ${cover.cardId}`);
  for (const definition of parsed) {
    if (definition.acquisition?.source === 'learnpass' && !['normal', 'rare'].includes(definition.rarity))
      fail(`learnpass cards must be normal or rare: ${definition.id}`);
    if (
      definition.acquisition?.source === 'season-chest' &&
      !['epic', 'legendary'].includes(definition.rarity)
    )
      fail(`season chest cards must be epic or legendary: ${definition.id}`);
    if (definition.acquisition?.source === 'learnpass' && definition.acquisition.tier === undefined)
      fail(`learnpass card needs a tier: ${definition.id}`);
  }

  const archived = archivedCards(raw.archivedCards, byId);
  const book = bookStudy(raw.bookStudy);
  const acquisitionPolicy = policyOf(raw.acquisitionPolicy);
  const passRewards = passCardRewards(raw.passCardRewards, byId);
  checkPassAllocation(passRewards, parsed);
  checkChestPolicy(acquisitionPolicy, parsed);

  const contentVersion = raw.contentVersion === undefined ? '' : text(raw.contentVersion, 'contentVersion');
  if ((opts.requireContentVersion ?? true) && !/^[0-9a-f]{64}$/.test(contentVersion))
    fail('contentVersion must be a sha256 hex string');
  if (contentVersion && !/^[0-9a-f]{64}$/.test(contentVersion))
    fail('contentVersion must be a sha256 hex string');

  return {
    schemaVersion: integer(raw.schemaVersion, 'schemaVersion'),
    contentVersion,
    season: text(raw.season, 'season'),
    name: text(raw.name, 'name'),
    license: text(raw.license, 'license'),
    cards: parsed,
    archivedCards: archived,
    rarityOrder: parsedRarityOrder(raw.rarityOrder),
    almanacCover: cover,
    bookStudy: book,
    rarityPolicy: { legendaryExclusiveCardId: exclusive },
    acquisitionPolicy,
    passCardRewards: passRewards,
  };
}

function parsedRarityOrder(value: unknown): CollectionCatalog['rarityOrder'] {
  if (!Array.isArray(value) || value.length !== RARITY_ORDER.length)
    fail('rarityOrder must list the four rarities');
  value.forEach((entry, index) => {
    if (entry !== RARITY_ORDER[index]) fail('rarityOrder must be normal, rare, epic, legendary');
  });
  return [...RARITY_ORDER];
}

function almanacCover(value: unknown): CollectionCatalog['almanacCover'] {
  const raw = object(value, 'almanacCover');
  return {
    cardId: text(raw.cardId, 'almanacCover.cardId'),
    front: asset(raw.front, 'almanacCover.front'),
    back: asset(raw.back, 'almanacCover.back'),
    bookModel: asset(raw.bookModel, 'almanacCover.bookModel'),
    role: text(raw.role, 'almanacCover.role'),
    requiresCardOwnership: false,
  };
}

function bookStudy(value: unknown): CollectionCatalog['bookStudy'] {
  const raw = object(value, 'bookStudy');
  return {
    id: text(raw.id, 'bookStudy.id'),
    name: text(raw.name, 'bookStudy.name'),
    model: asset(raw.model, 'bookStudy.model'),
    cover: asset(raw.cover, 'bookStudy.cover'),
    backCover: asset(raw.backCover, 'bookStudy.backCover'),
    status: text(raw.status, 'bookStudy.status'),
    almanacCoverCardId: text(raw.almanacCoverCardId, 'bookStudy.almanacCoverCardId'),
  };
}

function archivedCards(
  value: unknown,
  active: Map<string, CardDefinition>,
): CollectionCatalog['archivedCards'] {
  if (!Array.isArray(value)) fail('archivedCards must be a list');
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const raw = object(entry, `archivedCards[${index}]`);
    const id = text(raw.id, `archivedCards[${index}].id`);
    if (active.has(id)) fail(`archived card ${id} is still active`);
    if (seen.has(id)) fail(`duplicate archived card id: ${id}`);
    seen.add(id);
    if (raw.status !== 'benched') fail(`archived card ${id} must stay benched`);
    return {
      id,
      number: integer(raw.number, `archivedCards[${index}].number`),
      name: text(raw.name, `archivedCards[${index}].name`),
      status: 'benched',
      rarity: raw.rarity === undefined ? undefined : rarity(raw.rarity, `archivedCards[${index}].rarity`),
    };
  });
}

function policyOf(value: unknown): CollectionCatalog['acquisitionPolicy'] {
  const raw = object(value, 'acquisitionPolicy');
  const learnpass = object(raw.learnpass, 'acquisitionPolicy.learnpass');
  const chest = object(raw.chest, 'acquisitionPolicy.chest');
  if (raw.duplicates !== false) fail('acquisitionPolicy.duplicates must be false');
  if (raw.ownershipLimit !== 1) fail('acquisitionPolicy.ownershipLimit must be 1');
  return {
    version: text(raw.version, 'acquisitionPolicy.version'),
    duplicates: false,
    ownershipLimit: 1,
    learnpass: {
      rarities: listOfRarities(learnpass.rarities, 'acquisitionPolicy.learnpass.rarities'),
      coinTiers: numbers(learnpass.coinTiers, 'acquisitionPolicy.learnpass.coinTiers'),
      additionalToCoins: true,
      order: text(learnpass.order, 'acquisitionPolicy.learnpass.order'),
      allocation: text(learnpass.allocation, 'acquisitionPolicy.learnpass.allocation'),
    },
    chest: {
      rarities: listOfRarities(chest.rarities, 'acquisitionPolicy.chest.rarities'),
      cardIds: stringList(chest.cardIds, 'acquisitionPolicy.chest.cardIds'),
      excludeOwnedBeforeDraw: true,
      exhausted: text(chest.exhausted, 'acquisitionPolicy.chest.exhausted'),
      cardHitRate: chest.cardHitRate === null ? null : numberOrFail(chest.cardHitRate, 'cardHitRate'),
      rarityWeights:
        chest.rarityWeights === null
          ? null
          : weightMap(chest.rarityWeights, 'acquisitionPolicy.chest.rarityWeights'),
    },
    implementationStatus: text(raw.implementationStatus, 'acquisitionPolicy.implementationStatus'),
  };
}

function numberOrFail(value: unknown, where: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${where} must be a number`);
  return value;
}

function weightMap(value: unknown, where: string): Record<string, number> {
  const raw = object(value, where);
  const result: Record<string, number> = {};
  for (const [key, weight] of Object.entries(raw)) {
    rarity(key, `${where} key`);
    if (typeof weight !== 'number' || weight < 0) fail(`${where}.${key} must be a non-negative number`);
    result[key] = weight;
  }
  if (!Object.keys(result).length) fail(`${where} must not be empty`);
  return result;
}

function numbers(value: unknown, where: string): number[] {
  if (!Array.isArray(value)) fail(`${where} must be a list`);
  return value.map((entry, index) => integer(entry, `${where}[${index}]`));
}

function listOfRarities(value: unknown, where: string): CardRarity[] {
  if (!Array.isArray(value)) fail(`${where} must be a list`);
  return value.map((entry, index) => rarity(entry, `${where}[${index}]`));
}

function passCardRewards(
  value: unknown,
  cards: Map<string, CardDefinition>,
): CollectionCatalog['passCardRewards'] {
  if (!Array.isArray(value)) fail('passCardRewards must be a list');
  const tiers = new Set<number>();
  const seen = new Set<string>();
  return value.map((entry, index) => {
    const raw = object(entry, `passCardRewards[${index}]`);
    const tier = integer(raw.tier, `passCardRewards[${index}].tier`);
    if (tiers.has(tier)) fail(`duplicate pass tier: ${tier}`);
    tiers.add(tier);
    const cardIds = stringList(raw.cardIds, `passCardRewards[${index}].cardIds`);
    if (cardIds.length < 1 || cardIds.length > 2) fail(`pass tier ${tier} must hold one or two cards`);
    for (const id of cardIds) {
      if (seen.has(id)) fail(`card ${id} is assigned to the pass twice`);
      seen.add(id);
      const definition = cards.get(id);
      if (!definition) fail(`pass tier ${tier} references an unknown card: ${id}`);
      if (definition.rarity !== 'normal' && definition.rarity !== 'rare')
        fail(`pass tier ${tier} must not contain ${definition.rarity} card ${id}`);
      if (definition.acquisition?.tier !== tier)
        fail(`card ${id} advertises tier ${definition.acquisition?.tier}, not ${tier}`);
    }
    return { tier, cardIds };
  });
}

function checkPassAllocation(rewards: CollectionCatalog['passCardRewards'], cards: CardDefinition[]): void {
  const total = rewards.reduce((sum, entry) => sum + entry.cardIds.length, 0);
  if (total !== PASS_CARD_COUNT) fail(`the pass must grant exactly ${PASS_CARD_COUNT} cards, found ${total}`);
  if (rewards.length !== 24) fail(`expected 24 coin tiers, found ${rewards.length}`);
  if (cards.filter((definition) => definition.acquisition?.source === 'learnpass').length !== PASS_CARD_COUNT)
    fail('every normal and rare card must be assigned to the pass exactly once');
}

function checkChestPolicy(policy: CollectionCatalog['acquisitionPolicy'], cards: CardDefinition[]): void {
  const chestCards = cards.filter((definition) => definition.acquisition?.source === 'season-chest');
  if (policy.chest.cardIds.length !== chestCards.length)
    fail('chest policy and card definitions disagree about the chest pool');
  for (const id of policy.chest.cardIds) {
    const definition = cards.find((entry) => entry.id === id);
    if (!definition) fail(`chest policy references an unknown card: ${id}`);
    if (!['epic', 'legendary'].includes(definition.rarity))
      fail(`chest card ${id} must be epic or legendary`);
  }
  const legendary = policy.chest.cardIds.filter(
    (id) => cards.find((entry) => entry.id === id)?.rarity === 'legendary',
  );
  if (legendary.length !== 1) fail('the chest pool must hold exactly one legendary card');
}

/** Every file a browser may need for the collection, relative to the asset root. */
export function assetPaths(catalog: CollectionCatalog): string[] {
  const paths = new Set<string>();
  for (const card of catalog.cards) {
    paths.add(card.model);
    paths.add(card.motifModel);
    paths.add(card.thumbnail);
    paths.add(card.front);
    paths.add(card.back);
    if (card.reference?.sourceImage) paths.add(card.reference.sourceImage);
  }
  paths.add(catalog.almanacCover.front);
  paths.add(catalog.almanacCover.back);
  paths.add(catalog.almanacCover.bookModel);
  paths.add(catalog.bookStudy.model);
  paths.add(catalog.bookStudy.cover);
  paths.add(catalog.bookStudy.backCover);
  return [...paths].sort();
}

/** Resolves a catalogue path below the app base URL (one asset root, plan package 1). */
export function catalogAssetUrl(path: string, base = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : `${base}/`}assets/collection/${path}`;
}

export interface CatalogFetcher {
  (url: string): Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;
}

/** Loads and validates the generated catalogue. No 3D asset is touched here. */
export async function loadCollectionCatalog(
  fetcher: CatalogFetcher = fetch,
  base = import.meta.env.BASE_URL,
): Promise<CollectionCatalog> {
  const url = `${base.endsWith('/') ? base : `${base}/`}assets/collection/catalog.json`;
  const response = await fetcher(url);
  if (!response.ok) throw new CatalogError(`catalog request failed with ${response.status}`);
  return validateCollectionCatalog(await response.json());
}

export function cardById(catalog: CollectionCatalog, id: string): CardDefinition | undefined {
  return catalog.cards.find((card) => card.id === id);
}

let cached: Promise<CollectionCatalog> | null = null;

/** One shared catalogue request for all views; the file is small, models stay lazy. */
export function collectionCatalog(): Promise<CollectionCatalog> {
  cached ??= loadCollectionCatalog();
  return cached;
}

export function resetCollectionCatalogCache(): void {
  cached = null;
}
