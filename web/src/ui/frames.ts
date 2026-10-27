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
export function frameSvg(id: string, size: number): SVGSVGElement {
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
