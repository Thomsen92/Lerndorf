import { tr, msg } from '../i18n';
import { artworkDefs, artworkSvg, crestArtwork, drawRankArtwork } from './rankArtwork';
import './awards.css';
export type CrestTier = 'wood' | 'bronze' | 'silver' | 'gold' | 'emerald' | 'sapphire' | 'rainbow';
export const CREST_TIER_LABEL: Record<CrestTier, string> = {
  wood: tr('Holz'),
  bronze: tr('Bronze'),
  silver: tr('Silber'),
  gold: tr('Gold'),
  emerald: tr('Smaragd'),
  sapphire: tr('Saphir'),
  rainbow: tr('Regenbogen'),
};
const TIERS: CrestTier[] = ['wood', 'bronze', 'silver', 'gold', 'emerald', 'sapphire', 'rainbow'];
export function crestTier(level: number): CrestTier {
  return TIERS[Math.min(6, Math.max(0, Math.floor(level / 5)))];
}
let serial = 0;
export function crestSvg(level: number, size: number): SVGSVGElement {
  const value = Math.max(1, Math.floor(level) || 1),
    tier = crestTier(value),
    key = `rank-crest-${++serial}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', msg`Level ${value}, Wappen ${CREST_TIER_LABEL[tier]}`);
  svg.classList.add('level-crest', 'level-crest--rank');
  svg.dataset.rank = tier;
  svg.innerHTML = `<title>Lv.${value}</title>${artworkDefs(key, tier)}<g data-art="rank-shield">${artworkSvg(crestArtwork(tier), key, tier)}</g><text x="50" y="65" text-anchor="middle" fill="#fffdf4" stroke="#241c55" stroke-width="2.4" paint-order="stroke" font-family="Verdana,sans-serif" font-weight="900" font-size="${value < 10 ? 34 : value < 100 ? 31 : value < 1000 ? 25 : 20}">${value}</text>`;
  if (tier === 'rainbow') svg.classList.add('rank-legendary');
  return svg;
}
/** The same shield silhouette and level number for world-space canvas labels. */
export function drawMedal(
  cx: CanvasRenderingContext2D,
  level: number,
  x: number,
  y: number,
  size: number,
): void {
  const value = Math.max(1, Math.floor(level) || 1),
    tier = crestTier(value);
  cx.save();
  cx.translate(x, y);
  cx.scale(size / 100, size / 100);
  drawRankArtwork(cx, crestArtwork(tier), tier);
  cx.textAlign = 'center';
  cx.textBaseline = 'alphabetic';
  cx.font = `900 ${value < 10 ? 34 : value < 100 ? 31 : value < 1000 ? 25 : 20}px Verdana`;
  cx.strokeStyle = '#241c55';
  cx.lineWidth = 2.4;
  cx.lineJoin = 'round';
  cx.fillStyle = '#fffdf4';
  cx.strokeText(String(value), 50, 65);
  cx.fillText(String(value), 50, 65);
  cx.restore();
}
