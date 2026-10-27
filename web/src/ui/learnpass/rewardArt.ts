/**
 * Reward pictures for the LearnPass (plan §14.2): the 3D season chest, real model renders of the
 * pass scenes and the tier-40 pair, the game's title plaque, the player's portrait in the season
 * frame and a coin stack. No emoji, no flat placeholder symbols; the SVG chest is only the fallback
 * while a render is pending or WebGL is missing.
 */
import { tr, msg } from '../../i18n';
import type { SeasonTier } from '../../api/season';
import { acquireSessionThumbs, SEASON_CHEST_THUMB } from '../../render/itemThumbs';
import { SLOTS, slotAccepts, type SlotKind } from '../../world/plotPlan';
import { characterAssetUrl } from '../../render/character';
import { titlePlaque } from '../titlePlaque';
import { frameSvg } from '../frames';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Rarity colours and labels (plan §14.6); the database word "common" shows as "Normal". */
// Labels are getters: the language can change after this module loaded.
export const RARITY: Record<Rarity, { readonly label: string; color: string }> = {
  common: {
    get label() {
      return tr('Normal');
    },
    color: '#9aa3ad',
  },
  rare: {
    get label() {
      return tr('Selten');
    },
    color: '#4a8ff0',
  },
  epic: {
    get label() {
      return tr('Episch');
    },
    color: '#a46cf0',
  },
  legendary: {
    get label() {
      return tr('Legendär');
    },
    color: '#f2b630',
  },
};

export function rarityOf(value: string | null | undefined): Rarity {
  return value === 'rare' || value === 'epic' || value === 'legendary' ? value : 'common';
}

/** Light behind each reward picture (plan §14.2). */
export const GLOW = {
  coins: '#f2b630',
  chest: '#a46cf0',
  frame: '#ff8f2b',
  title: '#d2462e',
  scene: '#6fbf73',
  pick: '#f2b630',
} as const;
export type RewardKind = keyof typeof GLOW;

export const TITLE_LABELS: Record<string, string> = {
  title_season_pumpkin_rookie: 'Pumpkin Rookie',
  title_season_ghost_hunter: 'Ghost Hunter',
  title_season_witch_friend: "Witch's Friend",
  title_season_halloween_legend: 'Halloween Legend',
};

const FRAME_SOURCES: Record<string, string> = {
  frame_season_pumpkin: 'Kürbis',
  frame_season_web: 'Spinnennetz',
  frame_season_grave: 'Grabstein',
  frame_season_cauldron: 'Hexenkessel',
};
export const frameLabel = (id: string): string => (FRAME_SOURCES[id] ? tr(FRAME_SOURCES[id]) : tr('Season'));

let uid = 0;

/** One gold coin with a star, the same artwork everywhere in the pass. */
export function coinSvg(size = 22): string {
  const id = `lp-coin-${++uid}`;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" class="lp-coin-svg">
    <defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff3b8"/>
    <stop offset=".45" stop-color="#ffcf4d"/><stop offset="1" stop-color="#b9780f"/></radialGradient></defs>
    <ellipse cx="32" cy="34" rx="26" ry="26" fill="#8a5508"/><circle cx="32" cy="31" r="26" fill="url(#${id})"/>
    <circle cx="32" cy="31" r="19" fill="none" stroke="#a8690c" stroke-width="3" opacity=".7"/>
    <path d="M32 19l3.6 7.6 8.3.9-6.2 5.6 1.8 8.2L32 37.2l-7.5 4.1 1.8-8.2-6.2-5.6 8.3-.9z" fill="#a8690c" opacity=".8"/>
  </svg>`;
}

/** Three coins on top of each other (coin rewards). */
export function coinStackSvg(size = 86): string {
  const coin = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})">${coinSvg(64).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>`;
  return `<svg viewBox="0 0 96 96" width="${size}" height="${size}" aria-hidden="true" class="lp-coins-svg">
    ${coin(30, 4, 0.85)}${coin(4, 26, 0.85)}${coin(34, 34, 1)}</svg>`;
}

/** Flat chest, only while the 3D picture is rendering or without WebGL. */
export function chestSvg(size = 64): string {
  return `<svg viewBox="0 0 120 96" width="${size}" height="${(size * 96) / 120}" aria-hidden="true">
    <rect x="14" y="40" width="92" height="46" rx="8" fill="#5b2c6f" stroke="#2a1236" stroke-width="3"/>
    <path d="M14 46 Q60 6 106 46" fill="#6d3a86" stroke="#2a1236" stroke-width="3"/>
    <rect x="54" y="46" width="12" height="26" rx="3" fill="#f2b630" stroke="#8a5a12" stroke-width="2"/>
    <path d="M14 48 h92" stroke="#a46cf0" stroke-width="3"/>
  </svg>`;
}

export const ICONS = {
  check:
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#a6e05a"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#120912" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="color:#6d5a85"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  star: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="color:#f2b630"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z" fill="currentColor"/></svg>',
};

/**
 * Model pictures through the one session thumbnail renderer (plan §14.2): cached data URLs, one
 * render at a time. Hold it while a view is open and release it when the view closes.
 */
export interface SeasonPictures {
  get(itemId: string, kind: SlotKind): Promise<string | null>;
  release(): void;
}

export function seasonPictures(): SeasonPictures {
  const { source, release } = acquireSessionThumbs();
  return {
    get: (id, kind) => source({ id, kind, fits: SLOTS.filter((s) => slotAccepts(s, kind)).map((s) => s.id) }),
    release,
  };
}

/** An <img> that shows the model render once it is there; `fallback` stays visible until then. */
export function modelPicture(
  pictures: SeasonPictures | null,
  itemId: string,
  kind: SlotKind,
  fallback = '',
): HTMLElement {
  const box = document.createElement('span');
  box.className = 'lp-pic';
  box.innerHTML = fallback;
  void pictures
    ?.get(itemId, kind)
    .then((url) => {
      if (!url) return;
      const img = document.createElement('img');
      img.alt = '';
      img.src = url;
      box.replaceChildren(img);
    })
    .catch(() => undefined);
  return box;
}

/** The player's portrait inside a season frame; without one a default figure stands in. */
export type PortraitFactory = (frameId: string) => HTMLElement;

export function defaultPortrait(frameId: string): HTMLElement {
  const el = document.createElement('span');
  el.className = 'lp-frame-art';
  const img = document.createElement('img');
  img.alt = '';
  img.src = characterAssetUrl('girl', 'png');
  el.append(img, frameSvg(frameId, 96));
  return el;
}

export function rewardKind(tier: SeasonTier): RewardKind {
  if (tier.choice) return 'pick';
  if (tier.chest) return 'chest';
  if (tier.frame_id) return 'frame';
  if (tier.title_id) return 'title';
  if (tier.item_id) return 'scene';
  return 'coins';
}

export function rewardArt(
  tier: SeasonTier,
  pictures: SeasonPictures | null,
  portrait: PortraitFactory = defaultPortrait,
): HTMLElement {
  const art = document.createElement('div');
  art.className = 'lp-art';
  const kind = rewardKind(tier);
  art.style.setProperty('--glow', GLOW[kind]);
  if (kind === 'pick') {
    const pair = document.createElement('span');
    pair.className = 'lp-pick-art';
    pair.append(
      modelPicture(pictures, 'season_warlock', 'deco'),
      modelPicture(pictures, 'season_house_horror', 'house'),
    );
    art.append(pair);
  } else if (kind === 'chest') {
    art.append(modelPicture(pictures, SEASON_CHEST_THUMB, 'deco', chestSvg(96)));
  } else if (kind === 'frame') {
    art.append(portrait(tier.frame_id ?? ''));
  } else if (kind === 'title') {
    const plaque = document.createElement('span');
    plaque.className = 'lp-title-art';
    plaque.append(titlePlaque(TITLE_LABELS[tier.title_id ?? ''] ?? tr('Titel'), 12, true));
    art.append(plaque);
  } else if (kind === 'scene') {
    art.append(modelPicture(pictures, tier.item_id ?? '', 'deco'));
  } else {
    art.innerHTML = coinStackSvg();
  }
  return art;
}

/** Card name and the small line under it (plan §14.7). */
export function rewardText(
  tier: SeasonTier,
  sceneName: (id: string) => string,
): { name: string; sub: string } {
  const plus = tier.coins > 0 ? msg`+ ${tier.coins} Münzen` : '';
  switch (rewardKind(tier)) {
    case 'pick':
      return { name: tr('Such dir einen Season-Gegenstand aus'), sub: tr('+ Truhe, Titel, 25 Münzen') };
    case 'chest':
      return { name: tr('Season-Truhe'), sub: plus };
    case 'frame':
      return { name: msg`Rahmen: ${frameLabel(tier.frame_id ?? '')}`, sub: plus };
    case 'title':
      return { name: tr('Neuer Titel'), sub: plus };
    case 'scene':
      return { name: sceneName(tier.item_id ?? ''), sub: tr('Garten-Szene') };
    default:
      return { name: msg`${tier.coins} Münzen`, sub: '' };
  }
}

/** Screen-reader label of a card: "Tier 12: Title Pumpkin Rookie, + 5 coins, ready" (plan §14.6). */
export function rewardLabel(tier: SeasonTier, text: { name: string; sub: string }): string {
  const what = tier.title_id ? msg`Titel ${TITLE_LABELS[tier.title_id] ?? ''}` : text.name;
  const state =
    tier.state === 'claimed'
      ? tr('abgeholt')
      : tier.state === 'ready'
        ? tr('bereit')
        : tier.state === 'next'
          ? tr('nächste Stufe')
          : tr('gesperrt');
  return [msg`Stufe ${tier.tier}: ${what}`, text.sub, state].filter(Boolean).join(', ');
}
