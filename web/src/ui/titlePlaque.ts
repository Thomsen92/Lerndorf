import { crestTier } from './crest';
import { artworkDefs, artworkSvg, titleArtwork } from './rankArtwork';
import './titlePlaque.css';

let serial = 0;
/** Display only: its decoration follows the player's level; title selection stays independent. */
export function titlePlaque(label: string, level: number, compact = false): HTMLSpanElement {
  const tier = crestTier(level),
    key = `title-plaque-${++serial}`;
  const el = document.createElement('span');
  el.className = `title-plaque${compact ? ' title-plaque--compact' : ''}`;
  el.dataset.rank = tier;
  el.title = label;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 240 64');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('title-plaque-art');
  svg.innerHTML = `${artworkDefs(key, tier)}<g data-art="rank-title">${artworkSvg(titleArtwork(tier), key, tier)}</g>`;
  const text = document.createElement('span');
  text.className = 'title-plaque-label';
  text.textContent = label;
  el.append(svg, text);
  return el;
}
