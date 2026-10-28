// Public content and ownership types of the Halloween collection (plan §3.2).
// Nothing here knows about a player; ownership arrives from the server RPC.

export type CardRarity = 'normal' | 'rare' | 'epic' | 'legendary';
export type CardKind =
  'grammar' | 'vocabulary' | 'proverb' | 'rhyme' | 'simile' | 'tongue-twister' | 'poem' | 'humour';

export interface CardSource {
  type: 'original-excerpt';
  author: string;
  work: string;
  location: string;
  url: string;
  publisher: string;
  excerptLines: string[];
  verifiedOn: string;
  rights: string;
  authorNote?: string;
  additionalUrl?: string;
}

export interface CardReference {
  type: 'user-supplied-textbook-adaptation';
  work: string;
  publisher: string;
  page: string;
  note: string;
  sourceImage?: string;
  author?: string;
}

export interface CardAcquisition {
  source: 'learnpass' | 'season-chest';
  tier?: number;
  additionalToCoins?: boolean;
  uniquePerPlayer?: boolean;
}

export interface CardDefinition {
  id: string;
  number: number;
  name: string;
  rarity: CardRarity;
  kind: CardKind;
  format?: 'printed-surface';
  series?: string;
  model: string;
  motifModel: string;
  thumbnail: string;
  front: string;
  back: string;
  topic: string;
  key: string;
  example: string;
  notes: string[];
  tip: string;
  color?: string;
  icon?: string;
  description?: string;
  effects?: string[];
  flavour?: string;
  satire?: boolean;
  effectMode?: 'flavour-only';
  acquisition?: CardAcquisition;
  source?: CardSource;
  reference?: CardReference;
  assetRoles?: string[];
}

export interface CardOwnership {
  cardId: string;
  quantity: 1;
  firstAcquiredAt: string;
}

export interface CollectionState {
  seasonId: string;
  cards: CardOwnership[];
}

export interface AlmanacCover {
  cardId: string;
  front: string;
  back: string;
  bookModel: string;
  role: string;
  requiresCardOwnership: false;
}

export interface BookStudy {
  id: string;
  name: string;
  model: string;
  cover: string;
  backCover: string;
  status: string;
  almanacCoverCardId: string;
}

export interface CardAcquisitionPolicy {
  version: string;
  duplicates: false;
  ownershipLimit: 1;
  learnpass: {
    rarities: CardRarity[];
    coinTiers: number[];
    additionalToCoins: true;
    order: string;
    allocation: string;
  };
  chest: {
    rarities: CardRarity[];
    cardIds: string[];
    excludeOwnedBeforeDraw: true;
    exhausted: string;
    cardHitRate: number | null;
    rarityWeights: Record<string, number> | null;
  };
  implementationStatus: string;
}

export interface PassCardReward {
  tier: number;
  cardIds: string[];
}

export interface ArchivedCard {
  id: string;
  number: number;
  name: string;
  status: string;
  rarity?: CardRarity;
}

export interface CollectionCatalog {
  schemaVersion: number;
  contentVersion: string;
  season: string;
  name: string;
  license: string;
  cards: CardDefinition[];
  archivedCards: ArchivedCard[];
  rarityOrder: CardRarity[];
  almanacCover: AlmanacCover;
  bookStudy: BookStudy;
  rarityPolicy: { legendaryExclusiveCardId: string };
  acquisitionPolicy: CardAcquisitionPolicy;
  passCardRewards: PassCardReward[];
}

export const RARITY_ORDER: readonly CardRarity[] = ['normal', 'rare', 'epic', 'legendary'];
/** 18 normal, 17 rare, 14 epic and exactly one legendary card (plan r11). */
export const RARITY_COUNTS: Readonly<Record<CardRarity, number>> = {
  normal: 18,
  rare: 17,
  epic: 14,
  legendary: 1,
};
export const CARD_COUNT = 50;
export const PASS_CARD_COUNT = 35;
