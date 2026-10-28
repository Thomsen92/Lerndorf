/** Our own round, friendly bee (inline SVG, no external picture): the face of the Spelling Bee. */
export function beeSvg(size = 120): string {
  return `<svg class="bee-art" viewBox="0 0 120 100" width="${size}" height="${Math.round(size * 0.83)}" aria-hidden="true">
  <ellipse cx="60" cy="94" rx="30" ry="4" fill="#00000033"/>
  <ellipse cx="44" cy="22" rx="15" ry="20" fill="#eaf6ff" stroke="#bcd7ea" stroke-width="2" transform="rotate(-22 44 22)"/>
  <ellipse cx="76" cy="20" rx="15" ry="20" fill="#eaf6ff" stroke="#bcd7ea" stroke-width="2" transform="rotate(18 76 20)"/>
  <path d="M70 26 q2 -14 -4 -20" stroke="#2b2118" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M80 28 q8 -12 6 -20" stroke="#2b2118" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="66" cy="6" r="3.5" fill="#2b2118"/><circle cx="86" cy="8" r="3.5" fill="#2b2118"/>
  <ellipse cx="58" cy="58" rx="40" ry="34" fill="#ffc81e"/>
  <path d="M30 34 q-12 24 0 48 l10 4 q-12 -28 0 -56z" fill="#2b2118"/>
  <path d="M44 27 q-14 31 0 62 l9 1 q-13 -32 0 -64z" fill="#2b2118"/>
  <ellipse cx="72" cy="58" rx="26" ry="28" fill="#ffd84a"/>
  <rect x="62" y="50" width="7" height="12" rx="3.5" fill="#2b2118"/><rect x="83" y="50" width="7" height="12" rx="3.5" fill="#2b2118"/>
  <circle cx="64" cy="53" r="1.6" fill="#fff"/><circle cx="85" cy="53" r="1.6" fill="#fff"/>
  <path d="M70 68 q6 6 12 0" stroke="#2b2118" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <ellipse cx="58" cy="68" rx="5" ry="3.2" fill="#ff9f8a" opacity=".8"/><ellipse cx="94" cy="66" rx="4" ry="3" fill="#ff9f8a" opacity=".8"/>
  <ellipse cx="46" cy="90" rx="6" ry="5" fill="#2b2118"/><ellipse cx="66" cy="91" rx="6" ry="5" fill="#2b2118"/>
</svg>`;
}
