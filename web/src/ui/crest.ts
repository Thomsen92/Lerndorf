export type CrestTier = 'wood' | 'bronze' | 'silver' | 'gold' | 'emerald' | 'sapphire' | 'rainbow';
export const CREST_TIER_LABEL: Record<CrestTier, string> = {
  wood: 'Holz',
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  emerald: 'Smaragd',
  sapphire: 'Saphir',
  rainbow: 'Regenbogen',
};
const TIERS: CrestTier[] = ['wood', 'bronze', 'silver', 'gold', 'emerald', 'sapphire', 'rainbow'];
export function crestTier(level: number): CrestTier {
  return TIERS[Math.min(6, Math.max(0, Math.floor(level / 5)))];
}
export const CREST_COLOURS: Record<CrestTier, string> = {
  wood: '#a97443',
  bronze: '#bf7d43',
  silver: '#bcced7',
  gold: '#e6b74d',
  emerald: '#43a277',
  sapphire: '#537bc7',
  rainbow: '#c48bc4',
};
export const CREST_PATHS = {
  shield: 'M24 14 L76 14 76 46 Q75 67 50 80 Q25 67 24 46 Z',
  ribbon: 'M12 65 L88 65 83 77 89 86 50 81 11 86 17 77 Z',
  wingL: 'M25 24 L3 12 8 31 1 31 12 46 25 49 Z',
  wingR: 'M75 24 L97 12 92 31 99 31 88 46 75 49 Z',
  crown: 'M27 15 L24 1 41 9 50 0 59 9 76 1 73 15 Z',
  gem: 'M50 27 L62 40 50 56 38 40 Z',
  rivets:
    'M30 23 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M66 23 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M34 48 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0 M62 48 a2 2 0 1 0 4 0 a2 2 0 1 0 -4 0',
  wingBigL: 'M27 26 L0 5 4 25 0 27 6 40 2 43 16 54 27 51 Z',
  wingBigR: 'M73 26 L100 5 96 25 100 27 94 40 98 43 84 54 73 51 Z',
};
export function crestParts(level: number): Array<keyof typeof CREST_PATHS> {
  const i = TIERS.indexOf(crestTier(level));
  return [
    ...(i >= 3 ? (['wingBigL', 'wingBigR'] as const) : i >= 2 ? (['wingL', 'wingR'] as const) : []),
    'shield',
    ...(i >= 1 ? (['rivets'] as const) : []),
    ...(i >= 3 ? (['crown'] as const) : []),
    ...(i >= 4 ? (['gem'] as const) : []),
    'ribbon',
  ];
}
let serial = 0;
export function crestSvg(level: number, size: number): SVGSVGElement {
  const tier = crestTier(level),
    i = TIERS.indexOf(tier),
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Level ${level}, Wappen ${CREST_TIER_LABEL[tier]}`);
  svg.classList.add('level-crest');
  const path = (key: keyof typeof CREST_PATHS, fill: string) =>
    `<path data-part="${key}" d="${CREST_PATHS[key]}" fill="${fill}" stroke="#493724" stroke-width="2"/>`;
  const key = `crest-rainbow-${++serial}`;
  svg.innerHTML =
    (i === 6
      ? `<defs><linearGradient id="${key}" x2="1" y2="1"><stop stop-color="#eb8b80"/><stop offset=".3" stop-color="#f7d46b"/><stop offset=".6" stop-color="#7bc7ac"/><stop offset="1" stop-color="#9c96dc"/></linearGradient></defs>`
      : '') +
    crestParts(level)
      .map((part) =>
        path(
          part,
          part === 'ribbon' || part === 'rivets'
            ? '#fff0c9'
            : part === 'crown'
              ? '#f5d479'
              : part === 'gem'
                ? i === 4
                  ? '#b5f4c9'
                  : i === 5
                    ? '#b5dfff'
                    : '#f8d4ff'
                : i === 6
                  ? `url(#${key})`
                  : CREST_COLOURS[tier],
        ),
      )
      .join('') +
    `<text x="50" y="78" text-anchor="middle" fill="#493724" font-family="Georgia,serif" font-weight="bold" font-size="15">Lv.${Math.max(1, Math.floor(level))}</text>`;
  if (i === 6) svg.classList.add('frame-shimmer');
  return svg;
}
