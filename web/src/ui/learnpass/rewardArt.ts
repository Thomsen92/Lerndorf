/** Reward artwork for the LearnPass cards (plan §14.2: images per reward, no emoji). */
import { tr, msg } from '../../i18n';
import type { SeasonTier } from '../../api/season';

const TITLES: Record<string, string> = {
  title_season_pumpkin_rookie: 'Pumpkin Rookie',
  title_season_ghost_hunter: 'Ghost Hunter',
  title_season_witch_friend: "Witch's Friend",
  title_season_halloween_legend: 'Halloween Legend',
};

const FRAMES: Record<string, string> = {
  frame_season_pumpkin: tr('Kürbis'),
  frame_season_web: tr('Spinnennetz'),
  frame_season_grave: tr('Grabstein'),
  frame_season_cauldron: tr('Hexenkessel'),
};

let uid = 0;

export function coinSvg(): string {
  const id = `lp-coin-${++uid}`;
  return `<svg viewBox="0 0 96 72" width="96" height="72" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe39a"/><stop offset="1" stop-color="#c98a12"/>
    </linearGradient></defs>
    <g fill="url(#${id})" stroke="#7a4d05" stroke-width="2">
      <ellipse cx="30" cy="46" rx="20" ry="14"/><ellipse cx="56" cy="46" rx="20" ry="14"/>
      <ellipse cx="43" cy="34" rx="20" ry="14"/>
    </g>
    <g fill="#8a5a12"><circle cx="43" cy="34" r="4"/><circle cx="30" cy="46" r="3"/><circle cx="56" cy="46" r="3"/></g>
  </svg>`;
}

export function chestSvg(): string {
  return `<svg viewBox="0 0 120 96" width="110" height="88" aria-hidden="true">
    <rect x="14" y="40" width="92" height="46" rx="8" fill="#5b2c6f" stroke="#2a1236" stroke-width="3"/>
    <path d="M14 46 Q60 6 106 46" fill="#6d3a86" stroke="#2a1236" stroke-width="3"/>
    <rect x="54" y="46" width="12" height="26" rx="3" fill="#f2b630" stroke="#8a5a12" stroke-width="2"/>
    <circle cx="60" cy="58" r="4" fill="#8a5a12"/>
    <path d="M14 48 h92" stroke="#a46cf0" stroke-width="3"/>
  </svg>`;
}

export function plaqueSvg(label: string): string {
  const safe = label.replace(/[<>&"]/g, '');
  return `<svg viewBox="0 0 140 64" width="130" height="60" aria-hidden="true">
    <path d="M12 12 h116 l-8 40 h-100 z" fill="#2a3a5c" stroke="#7d9ad0" stroke-width="3"/>
    <text x="70" y="39" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14"
      font-weight="700" fill="#f6e9d2">${safe}</text>
  </svg>`;
}

export function frameSvgMock(id: string): string {
  const color = id.includes('web') ? '#a46cf0' : id.includes('grave') ? '#9aa3ad' : id.includes('cauldron') ? '#6fbf73' : '#ff8f2b';
  return `<svg viewBox="0 0 72 84" width="70" height="82" aria-hidden="true">
    <rect x="4" y="4" width="64" height="76" rx="10" fill="none" stroke="${color}" stroke-width="6"/>
    <rect x="16" y="18" width="40" height="40" rx="8" fill="#2a1f3a" stroke="${color}" stroke-width="2"/>
    <circle cx="36" cy="38" r="10" fill="${color}" opacity="0.8"/>
  </svg>`;
}

export function sceneSvg(): string {
  return `<svg viewBox="0 0 120 90" width="110" height="82" aria-hidden="true">
    <rect x="8" y="66" width="104" height="16" rx="4" fill="#3a4a3a"/>
    <path d="M60 12 l26 34 h-52 z" fill="#4a5a3a" stroke="#2a3a2a" stroke-width="3"/>
    <circle cx="38" cy="62" r="10" fill="#d96a1f"/><circle cx="72" cy="60" r="12" fill="#ff8f2b"/>
    <rect x="58" y="46" width="4" height="12" fill="#6fbf73"/>
  </svg>`;
}

export function tier40Svg(): string {
  return `<svg viewBox="0 0 200 110" width="190" height="104" aria-hidden="true">
    <g transform="translate(6 14)">
      <path d="M10 70 h64 v-24 h-64 z" fill="#3a2a44" stroke="#8a5a12" stroke-width="2"/>
      <path d="M6 46 l36 -24 36 24 z" fill="#5a3a2a" stroke="#8a5a12" stroke-width="2"/>
      <rect x="34" y="54" width="14" height="16" fill="#f2b630"/>
    </g>
    <g transform="translate(112 6)">
      <circle cx="34" cy="20" r="12" fill="#ffd16d"/>
      <path d="M20 34 h28 l6 40 h-40 z" fill="#2a3a5c"/>
      <path d="M14 40 l-10 18 M54 40 l10 18" stroke="#2a3a5c" stroke-width="6"/>
    </g>
  </svg>`;
}

export function rewardArt(tier: SeasonTier): HTMLElement {
  const art = document.createElement('div');
  art.className = 'lp-art';
  if (tier.tier === 40) {
    art.innerHTML = tier40Svg();
  } else if (tier.chest) {
    art.innerHTML = chestSvg();
  } else if (tier.title_id) {
    art.innerHTML = plaqueSvg(TITLES[tier.title_id] ?? 'Title');
  } else if (tier.frame_id) {
    art.innerHTML = frameSvgMock(tier.frame_id);
  } else if (tier.item_id) {
    art.innerHTML = sceneSvg();
  } else {
    art.innerHTML = coinSvg();
  }
  return art;
}

/** Card name and the small line under it. */
export function rewardText(tier: SeasonTier): { name: string; sub: string } {
  if (tier.tier === 40) {
    return { name: tr('Season-Abschluss'), sub: tr('Truhe, Titel, 25 Münzen + freie Wahl') };
  }
  if (tier.chest) {
    const parts = [tr('Season-Truhe')];
    if (tier.coins > 0) parts.push(msg`+ ${tier.coins} Münzen`);
    return { name: parts[0], sub: parts.slice(1).join(' ') || tr('Ein Gegenstand') };
  }
  if (tier.title_id) {
    return { name: tr('Neuer Titel'), sub: `+ ${tier.coins} ${tr('Münzen')}` };
  }
  if (tier.frame_id) {
    return { name: msg`Rahmen: ${FRAMES[tier.frame_id] ?? tr('Season')}`, sub: `+ ${tier.coins} ${tr('Münzen')}` };
  }
  if (tier.item_id) {
    return { name: tr('Garten-Szene'), sub: `+ ${tier.coins} ${tr('Münzen')}` };
  }
  return { name: msg`${tier.coins} Münzen`, sub: '' };
}
