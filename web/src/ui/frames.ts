import type { CharacterKind } from '../render/character';
import type { PortraitSource } from '../render/portrait';
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
    ['wood', 'Holz', '#a77142', '#e4bb79', 'grain'],
    ['bronze', 'Bronze', '#8d4725', '#efb56c', 'rivets'],
    ['silver', 'Silber', '#708491', '#e9f1f5', 'spikes'],
    ['gold', 'Gold', '#b77a18', '#ffe399', 'crown'],
    ['emerald', 'Smaragd', '#17644c', '#77e2a0', 'gems'],
    ['sapphire', 'Saphir', '#234f9a', '#a4cbff', 'gems'],
    ['rainbow', 'Regenbogen', '#ba5a9a', '#8be4cf', 'shimmer'],
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
    key = `frame-metal-${++serial}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('portrait-frame');
  let ornament = '';
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6,
      x = 50 + 44 * Math.cos(angle),
      y = 50 + 44 * Math.sin(angle);
    ornament +=
      f.ornament === 'grain'
        ? `<path d="M ${x - 2} ${y - 2} l 4 4"/>`
        : f.ornament === 'spikes'
          ? `<path d="M ${x - 3} ${y + 2} L ${x} ${y - 5} L ${x + 3} ${y + 2} Z"/>`
          : f.ornament === 'gems'
            ? `<path d="M ${x} ${y - 4} l 3 4 -3 4 -3 -4 Z" fill="${f.colours[1]}"/>`
            : `<circle cx="${x}" cy="${y}" r="1.7"/>`;
  }
  if (f.ornament === 'crown')
    ornament += '<path d="M 33 12 L 30 2 42 8 50 0 58 8 70 2 67 12 Z" fill="#ffdc70"/>';
  svg.innerHTML = `<defs><linearGradient id="${key}" x2="1" y2="1"><stop stop-color="${f.colours[1]}"/><stop offset=".48" stop-color="${f.colours[0]}"/><stop offset="1" stop-color="${f.colours[1]}"/></linearGradient></defs><circle cx="50" cy="50" r="43" fill="none" stroke="#493421" stroke-width="12"/><circle cx="50" cy="50" r="43" fill="none" stroke="url(#${key})" stroke-width="9"/><circle cx="50" cy="50" r="37.5" fill="none" stroke="${f.colours[1]}"/><g data-ornament="${f.ornament}" stroke="#503826" fill="${f.colours[1]}" stroke-width="1.1">${ornament}</g>`;
  if (f.ornament === 'shimmer') svg.classList.add('frame-shimmer');
  return svg;
}
export function avatarPortrait(opts: {
  character: CharacterKind | null;
  frameId: string;
  size: 'small' | 'large';
  portraits?: PortraitSource;
}): HTMLElement {
  const el = document.createElement('span');
  el.className = `avatar-portrait avatar-portrait--${opts.size}`;
  const img = document.createElement('img');
  img.alt = '';
  const kind = opts.character ?? 'boy';
  img.src = `${import.meta.env.BASE_URL}assets/characters/${kind}.png`;
  el.append(img, frameSvg(opts.frameId, opts.size === 'large' ? 160 : 64));
  void (opts.portraits ?? sessionPortraitSource)(kind)
    .then((url) => {
      if (url) img.src = url;
    })
    .catch(() => undefined);
  return el;
}
