import { tr } from '../i18n';
import { artworkDefs, artworkSvg, frameArtwork } from './rankArtwork';
import type { CrestTier } from './crest';
import './awards.css';
import { characterAssetUrl, type CharacterKind } from '../render/character';
import type { PortraitSource } from '../render/portrait';
import type { AvatarLook } from '../avatars/look';
import { sessionPortraitSource } from '../render/portrait';
export type Ornament = 'grain' | 'rivets' | 'spikes' | 'crown' | 'gems' | 'shimmer';
export interface FrameStyle {
  id: string;
  label: string;
  colours: [string, string];
  ornament: Ornament;
}
export const FRAMES: Record<string, FrameStyle> = Object.fromEntries(
  [
    ['wood', tr('Holz'), '#a77142', '#e4bb79', 'grain'],
    ['bronze', tr('Bronze'), '#8d4725', '#efb56c', 'rivets'],
    ['silver', tr('Silber'), '#708491', '#e9f1f5', 'spikes'],
    ['gold', tr('Gold'), '#b77a18', '#ffe399', 'crown'],
    ['emerald', tr('Smaragd'), '#17644c', '#77e2a0', 'gems'],
    ['sapphire', tr('Saphir'), '#234f9a', '#a4cbff', 'gems'],
    ['rainbow', tr('Regenbogen'), '#ba5a9a', '#8be4cf', 'shimmer'],
  ].map(([id, label, a, b, ornament]) => [
    `frame_${id}`,
    { id: `frame_${id}`, label, colours: [a, b], ornament },
  ]),
) as Record<string, FrameStyle>;
export function frameStyle(id: string | null | undefined): FrameStyle {
  return FRAMES[id ?? ''] ?? FRAMES.frame_wood;
}
let serial = 0;

/** Season frames (plan E20, §14.2): owned through the LearnPass, drawn in their own motifs. */
export const SEASON_FRAMES: Record<string, { label: string; ring: [string, string]; motif: string }> = {
  frame_season_pumpkin: {
    label: tr('Kürbis'),
    ring: ['#ffb04a', '#c2541a'],
    motif: `<g stroke="#5a2408" stroke-width="1.6"><ellipse cx="22" cy="86" rx="9" ry="7" fill="#ff8f2b"/><ellipse cx="78" cy="86" rx="9" ry="7" fill="#ff8f2b"/><ellipse cx="50" cy="93" rx="11" ry="7" fill="#ff9d3a"/></g><g fill="#3f7a2c"><rect x="21" y="77" width="2.4" height="4" rx="1"/><rect x="77" y="77" width="2.4" height="4" rx="1"/><rect x="49" y="84" width="2.4" height="4" rx="1"/></g><path d="M44 18q6-9 12 0" fill="none" stroke="#3f7a2c" stroke-width="3" stroke-linecap="round"/>`,
  },
  frame_season_web: {
    label: tr('Spinnennetz'),
    ring: ['#5a4878', '#241a36'],
    motif: `<g fill="none" stroke="#e6dcf2" stroke-width="1" opacity=".85"><path d="M50 55L50 17M50 55L77 28M50 55L88 55M50 55L77 82M50 55L50 93M50 55L23 82M50 55L12 55M50 55L23 28"/><path d="M50 21l22 10 11 24-11 24-22 10-22-10-11-24 11-24z"/><path d="M50 14l29 12 13 29-13 29-29 12-29-12-13-29 13-29z"/></g><g fill="#120912"><circle cx="50" cy="12" r="4"/><path d="M46 10l-5-3M54 10l5-3M46 13l-5 2M54 13l5 2" stroke="#120912" stroke-width="1.4"/></g>`,
  },
  frame_season_grave: {
    label: tr('Grabstein'),
    ring: ['#b9c0c8', '#5d6670'],
    motif: `<path d="M36 22v-6a14 14 0 0 1 28 0v6z" fill="#8e969f" stroke="#3b424a" stroke-width="1.6"/><text x="50" y="20" text-anchor="middle" font-size="7" font-weight="700" fill="#3b424a" font-family="system-ui,sans-serif">RIP</text><g fill="#3b424a"><rect x="12" y="74" width="3" height="12"/><rect x="8.5" y="77" width="10" height="3"/><rect x="85" y="74" width="3" height="12"/><rect x="81.5" y="77" width="10" height="3"/></g>`,
  },
  frame_season_cauldron: {
    label: tr('Hexenkessel'),
    ring: ['#8fe08a', '#2f6b3a'],
    motif: `<g fill="#b7f5a0" stroke="#1f4a28" stroke-width="1.2"><circle cx="40" cy="14" r="4"/><circle cx="52" cy="9" r="5.5"/><circle cx="62" cy="16" r="3.5"/></g><g fill="#6fbf73"><path d="M24 80q2 8 0 12q-2-4 0-12z"/><path d="M76 80q2 8 0 12q-2-4 0-12z"/></g><ellipse cx="50" cy="94" rx="18" ry="4" fill="#1f2a22"/>`,
  },
};

function seasonFrameSvg(id: string, size: number): SVGSVGElement {
  const f = SEASON_FRAMES[id],
    key = `season-frame-${++serial}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait-frame', 'portrait-frame--season');
  svg.dataset.frame = id;
  svg.innerHTML = `<defs><linearGradient id="${key}-ring" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${f.ring[0]}"/><stop offset="1" stop-color="${f.ring[1]}"/></linearGradient></defs><circle cx="50" cy="55" r="35.5" fill="none" stroke="#120912" stroke-width="14"/><circle cx="50" cy="55" r="35.5" fill="none" stroke="url(#${key}-ring)" stroke-width="10"/>${f.motif}`;
  return svg;
}

export function frameSvg(id: string, size: number): SVGSVGElement {
  if (id in SEASON_FRAMES) return seasonFrameSvg(id, size);
  const f = frameStyle(id),
    tier = f.id.slice(6) as CrestTier,
    key = `rank-frame-${++serial}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait-frame');
  svg.dataset.rank = tier;
  svg.innerHTML = `${artworkDefs(key, tier)}<defs><mask id="${key}-opening" maskUnits="userSpaceOnUse"><rect width="100" height="100" fill="white"/><circle cx="50" cy="55" r="29.5" fill="black"/></mask></defs><g data-art="rank-frame" data-ornament="${f.ornament}" mask="url(#${key}-opening)">${artworkSvg(frameArtwork(tier), key, tier)}</g>`;
  if (tier === 'rainbow') svg.classList.add('rank-legendary');
  return svg;
}
export function avatarPortrait(opts: {
  character: CharacterKind | null;
  frameId: string;
  size: 'small' | 'large';
  portraits?: PortraitSource;
  look?: AvatarLook;
}): HTMLElement {
  const el = document.createElement('span');
  el.className = `avatar-portrait avatar-portrait--${opts.size} avatar-portrait--rank`;
  const img = document.createElement('img');
  img.alt = '';
  const kind = opts.character ?? 'boy';
  img.src = characterAssetUrl(kind, 'png');
  el.append(img, frameSvg(opts.frameId, opts.size === 'large' ? 160 : 64));
  void (opts.portraits ?? sessionPortraitSource)(kind, opts.look)
    .then((url) => {
      if (url) img.src = url;
    })
    .catch(() => undefined);
  return el;
}
