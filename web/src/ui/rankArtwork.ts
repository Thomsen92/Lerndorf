import type { CrestTier } from './crest';

/** Original game artwork. Shared paths keep the SVG UI and canvas world labels identical. */
interface Palette {
  light: string;
  metal: string;
  dark: string;
  face: string;
  deep: string;
  gem: string;
  accent: string;
}
export const RANK_PALETTES: Record<CrestTier, Palette> = {
  wood: {
    light: '#fff3b2',
    metal: '#ffb72c',
    dark: '#a53b08',
    face: '#ed7218',
    deep: '#8c2612',
    gem: '#ffe34b',
    accent: '#ff8936',
  },
  bronze: {
    light: '#fff1be',
    metal: '#ff9c49',
    dark: '#9c283d',
    face: '#ef5849',
    deep: '#8b204c',
    gem: '#ffdf49',
    accent: '#ff666d',
  },
  silver: {
    light: '#f0fcff',
    metal: '#b8e1ff',
    dark: '#445b9e',
    face: '#2db8ff',
    deep: '#2141af',
    gem: '#5affed',
    accent: '#6e83ff',
  },
  gold: {
    light: '#fff7a2',
    metal: '#ffcb24',
    dark: '#b24800',
    face: '#ff6731',
    deep: '#b31f45',
    gem: '#ff4167',
    accent: '#ff9b08',
  },
  emerald: {
    light: '#d3ffe1',
    metal: '#4ff4b0',
    dark: '#116a81',
    face: '#10c9b1',
    deep: '#085f84',
    gem: '#c8ff51',
    accent: '#30b9fc',
  },
  sapphire: {
    light: '#e7e2ff',
    metal: '#8fa9ff',
    dark: '#4432a7',
    face: '#8058ff',
    deep: '#2d208b',
    gem: '#5cffff',
    accent: '#cd75ff',
  },
  rainbow: {
    light: '#fff0ba',
    metal: '#ffd24b',
    dark: '#8c268e',
    face: '#ff3eaf',
    deep: '#6639cc',
    gem: '#68ffff',
    accent: '#c44cff',
  },
};
const ORDER: CrestTier[] = ['wood', 'bronze', 'silver', 'gold', 'emerald', 'sapphire', 'rainbow'];
export interface RankShape {
  d: string;
  fill: string;
  stroke?: string;
  width?: number;
  opacity?: number;
}
const path = (d: string, fill: string, stroke?: string, width = 1, opacity = 1): RankShape => ({
  d,
  fill,
  stroke,
  width,
  opacity,
});
const circle = (x: number, y: number, r: number) =>
  `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ring = (outer: number, inner: number) => `${circle(50, 55, outer)} ${circle(50, 55, inner)}`;
const star = (x: number, y: number, r: number) => {
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      radius = i % 2 ? r * 0.46 : r;
    return `${x + Math.cos(a) * radius} ${y + Math.sin(a) * radius}`;
  });
  return `M${points.join('L')}Z`;
};
function jewel(x: number, y: number, r: number): RankShape[] {
  return [
    path(`M${x} ${y - r}L${x + r} ${y} ${x} ${y + r} ${x - r} ${y}Z`, '$gem', '$dark', 0.65),
    path(`M${x} ${y - r}L${x} ${y} ${x - r} ${y}Z`, '#ffffff', undefined, 1, 0.8),
    path(`M${x} ${y}L${x + r} ${y} ${x} ${y + r}Z`, '$deep', undefined, 1, 0.5),
  ];
}
function spark(x: number, y: number, r: number): RankShape {
  return path(
    `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`,
    '#ffffff',
  );
}
function wings(tier: number): RankShape[] {
  if (tier < 2) return [];
  const out: RankShape[] = [];
  for (const right of [false, true]) {
    const p = (x: number, y: number) => `${right ? 100 - x : x} ${y}`;
    out.push(
      path(
        `M${p(29, 34)}L${p(3, 19)} ${p(11, 42)} ${p(3, 39)} ${p(17, 60)} ${p(10, 57)} ${p(30, 78)} ${p(37, 63)}Z`,
        '$metal',
        '$dark',
        1.1,
      ),
    );
    out.push(path(`M${p(3, 19)}L${p(24, 41)} ${p(29, 34)}Z`, '$light'));
    out.push(path(`M${p(11, 42)}L${p(29, 49)} ${p(24, 41)}Z`, '$accent'));
    out.push(path(`M${p(17, 60)}L${p(31, 59)} ${p(29, 49)}Z`, '$light'));
    out.push(path(`M${p(10, 57)}L${p(30, 78)} ${p(31, 59)}Z`, '$dark', undefined, 1, 0.55));
  }
  return out;
}
function crown(tier: number): RankShape[] {
  if (tier === 0) return jewel(50, 17, 7);
  const tall = tier >= 3;
  return [
    path(
      tall ? 'M31 24L26 8 41 15 50 1 59 15 74 8 69 24Z' : 'M35 24L31 12 43 18 50 7 57 18 69 12 65 24Z',
      '$metal',
      '$dark',
      1.2,
    ),
    path(
      tall ? 'M31 24L26 8 41 15 50 1 50 23Z' : 'M35 24L31 12 43 18 50 7 50 24Z',
      '$light',
      undefined,
      1,
      0.7,
    ),
    path('M33 23Q50 19 67 23L66 28Q50 24 34 28Z', '$metal', '$dark', 0.6),
    ...jewel(50, 17, tall ? 4.5 : 3.5),
    ...(tall ? [path(circle(29, 9, 2), '$light'), path(circle(71, 9, 2), '$light')] : []),
  ];
}

export function frameArtwork(tier: CrestTier): RankShape[] {
  const rank = ORDER.indexOf(tier),
    out: RankShape[] = [];
  if (rank === 6) {
    out.push(path('M23 54L9 86 25 81 28 98 43 77 57 77 72 98 75 81 91 86 77 54Z', '$ribbon', '$dark', 1));
    out.push(path('M10 85L27 64 28 97 42 77 30 64Z', '$face'));
  }
  out.push(...wings(rank));
  if (rank === 1)
    out.push(
      path('M50 15L87 35 87 75 50 96 13 75 13 35Z', '$dark'),
      path('M50 18L84 36 84 74 50 93 16 74 16 36Z', '$metal'),
    );
  if (rank === 4 || rank === 5)
    out.push(
      path(
        'M50 11L63 26 86 20 82 42 99 55 82 68 86 90 63 84 50 99 37 84 14 90 18 68 1 55 18 42 14 20 37 26Z',
        '$metal',
        '$dark',
        1,
      ),
    );
  out.push(
    path(ring(37, 29.5), '$metal', '$dark', 1.4),
    path(ring(35.5, 33.5), '$light'),
    path(ring(32, 29.5), '$dark'),
    path('M19 38A35 35 0 0 1 70 26L67 31A30 30 0 0 0 23 41Z', '#ffffff', undefined, 1, 0.7),
    path('M19 70A35 35 0 0 0 80 70L75 68A30 30 0 0 1 23 68Z', '$accent', undefined, 1, 0.9),
  );
  out.push(...crown(rank));
  if (rank >= 2) {
    out.push(...jewel(16, 55, 4), ...jewel(84, 55, 4));
  }
  if (rank >= 3) {
    out.push(...jewel(50, 89, 6));
  }
  if (rank >= 5) {
    out.push(spark(11, 19, 4), spark(91, 78, 3));
  }
  if (rank === 6) {
    out.push(spark(88, 12, 5), spark(9, 82, 4));
  }
  return out;
}

export function crestArtwork(tier: CrestTier): RankShape[] {
  const rank = ORDER.indexOf(tier),
    out: RankShape[] = [];
  if (rank >= 3)
    out.push(
      path('M31 65L21 97 41 88 50 97 59 88 79 97 69 65Z', '$ribbon', '$dark', 1),
      path('M27 91L36 70 44 85Z', '$light', undefined, 1, 0.6),
    );
  out.push(...wings(rank));
  const outer = 'M50 10L83 24 78 61Q74 78 50 92Q26 78 22 61L17 24Z';
  out.push(path(outer, '$dark'), path('M50 12L81 25 76 61Q72 77 50 90Q28 77 24 61L19 25Z', '$metal'));
  out.push(path('M50 17L75 28 71 60Q67 73 50 83Q33 73 29 60L25 28Z', '$dark'));
  out.push(path('M50 20L72 30 68 59Q64 70 50 79Q36 70 32 59L28 30Z', '$face'));
  out.push(path('M50 20L50 79Q36 70 32 59L28 30Z', '$light', undefined, 1, 0.17));
  out.push(path('M50 12L19 25 24 61 29 59 25 28 50 17Z', '$light'));
  out.push(path('M50 90Q72 77 76 61L81 25 75 28 71 60Q67 73 50 83Z', '$accent'));
  out.push(path('M25 28L50 17 75 28', '$light', undefined, 1, 0.9));
  if (rank >= 1) {
    out.push(...jewel(25, 28, 3), ...jewel(75, 28, 3));
  }
  if (rank >= 3) {
    out.push(...jewel(50, 84, 4));
  }
  if (rank >= 4) {
    out.push(spark(13, 20, 3), spark(89, 66, 3));
  }
  // Small star sits above the level, leaving a generous, high-contrast number field.
  out.push(path(star(50, 29, 8), '$gem', '$dark', 0.8), path('M50 21L50 29 43 31 46 26Z', '$light'));
  if (rank === 6) {
    out.push(spark(90, 12, 4), spark(10, 84, 3));
  }
  return out;
}

/** Wide title plates use the same metal, gems and rank progression as avatar frames. */
export function titleArtwork(tier: CrestTier): RankShape[] {
  const rank = ORDER.indexOf(tier),
    out: RankShape[] = [];
  for (const right of [false, true]) {
    const p = (x: number, y: number) => `${right ? 240 - x : x} ${y}`;
    if (rank >= 3) {
      out.push(
        path(
          `M${p(25, 24)}L${p(2, 5)} ${p(8, 23)} ${p(1, 22)} ${p(13, 35)} ${p(3, 38)} ${p(25, 50)} ${p(34, 32)}Z`,
          '$metal',
          '$dark',
          1,
        ),
      );
      out.push(path(`M${p(2, 5)}L${p(23, 27)} ${p(25, 24)}Z`, '$light'));
      out.push(path(`M${p(8, 23)}L${p(27, 33)} ${p(13, 35)}Z`, '$accent'));
      out.push(path(`M${p(3, 38)}L${p(25, 50)} ${p(27, 38)}Z`, '$light'));
    } else if (rank === 2) {
      out.push(
        path(
          `M${p(24, 6)}L${p(0, 32)} ${p(24, 58)} ${p(29, 54)} ${p(8, 32)} ${p(29, 10)}Z`,
          '$metal',
          '$dark',
          0.8,
        ),
      );
    }
  }
  if (rank >= 4) {
    out.push(path('M94 15L105 2 120 10 135 2 146 15 134 20H106Z', '$metal', '$dark', 0.8));
    out.push(path('M94 15L105 2 112 14 120 10 120 18Z', '$light'));
    out.push(path('M101 49L120 62 139 49Z', '$metal', '$dark', 0.8));
  }
  out.push(path('M18 12H222L237 32 222 52H18L3 32Z', '$dark'));
  out.push(path('M19 14H221L234 32 221 50H19L6 32Z', '$metal'));
  out.push(path('M21 18H219L229 32 219 46H21L11 32Z', '#111b38'));
  out.push(path('M24 21H216L224 32 216 43H24L16 32Z', '#1b2449'));
  out.push(path('M19 14H221L224 18H21L9 32H6Z', '$light', undefined, 1, 0.9));
  out.push(path('M19 50H221L234 32H231L219 47H21Z', '$accent'));
  // Inset edge highlights give the label a metallic bezel without crowding the text.
  out.push(path('M23 19H217', 'none', '$light', 0.65, 0.55));
  out.push(path('M23 45H217', 'none', '$light', 0.65, 0.4));
  if (rank >= 1) {
    out.push(...jewel(120, 12, rank >= 4 ? 6 : 4.5));
  }
  if (rank >= 2) {
    out.push(...jewel(15, 32, 3.5), ...jewel(225, 32, 3.5));
  }
  if (rank >= 5) {
    out.push(path('M28 8L40 4 35 14 24 19Z', '$metal', '$dark', 0.7));
    out.push(path('M212 8L200 4 205 14 216 19Z', '$metal', '$dark', 0.7));
    out.push(...jewel(120, 52, 4));
  }
  if (rank === 6) out.push(spark(34, 7, 3), spark(207, 55, 3));
  return out;
}

export function artworkDefs(key: string, tier: CrestTier): string {
  const p = RANK_PALETTES[tier];
  const gradient = (name: string, stops: Array<[number, string]>, x2 = '0', y2 = '1') =>
    `<linearGradient id="${key}-${name}" x2="${x2}" y2="${y2}">${stops.map(([n, c]) => `<stop offset="${n}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  return `<defs>${gradient(
    'metal',
    [
      [0, p.light],
      [0.22, p.metal],
      [0.47, p.light],
      [0.53, p.metal],
      [1, p.dark],
    ],
    '.35',
    '1',
  )}${gradient('face', [
    [0, p.face],
    [1, p.deep],
  ])}${gradient(
    'gem',
    [
      [0, '#ffffff'],
      [0.25, p.gem],
      [1, p.accent],
    ],
    '.7',
    '1',
  )}${gradient(
    'ribbon',
    [
      [0, p.accent],
      [0.5, p.deep],
      [1, p.face],
    ],
    '1',
    '0',
  )}</defs>`;
}
export function artworkSvg(shapes: RankShape[], key: string, tier: CrestTier): string {
  const p = RANK_PALETTES[tier];
  const paint = (fill: string) =>
    fill.startsWith('$')
      ? ['metal', 'face', 'gem', 'ribbon'].includes(fill.slice(1))
        ? `url(#${key}-${fill.slice(1)})`
        : p[fill.slice(1) as keyof Palette]
      : fill;
  return shapes
    .map(
      (s) =>
        `<path d="${s.d}" fill="${paint(s.fill)}" fill-rule="evenodd"${s.stroke ? ` stroke="${paint(s.stroke)}" stroke-width="${s.width}" stroke-linejoin="round"` : ''}${s.opacity !== 1 ? ` opacity="${s.opacity}"` : ''}/>`,
    )
    .join('');
}
export function drawRankArtwork(cx: CanvasRenderingContext2D, shapes: RankShape[], tier: CrestTier): void {
  const p = RANK_PALETTES[tier],
    gradients: Record<string, CanvasGradient> = {};
  for (const [name, stops] of Object.entries({
    metal: [
      [0, p.light],
      [0.22, p.metal],
      [0.47, p.light],
      [0.53, p.metal],
      [1, p.dark],
    ],
    face: [
      [0, p.face],
      [1, p.deep],
    ],
    gem: [
      [0, '#ffffff'],
      [0.25, p.gem],
      [1, p.accent],
    ],
    ribbon: [
      [0, p.accent],
      [0.5, p.deep],
      [1, p.face],
    ],
  } as Record<string, Array<[number, string]>>)) {
    const g = cx.createLinearGradient(0, 0, name === 'ribbon' ? 100 : 35, name === 'ribbon' ? 0 : 100);
    for (const [n, c] of stops) g.addColorStop(n, c);
    gradients[name] = g;
  }
  const paint = (fill: string) =>
    fill.startsWith('$') ? (gradients[fill.slice(1)] ?? p[fill.slice(1) as keyof Palette]) : fill;
  for (const s of shapes) {
    cx.globalAlpha = s.opacity ?? 1;
    cx.fillStyle = paint(s.fill);
    const d = new Path2D(s.d);
    cx.fill(d, 'evenodd');
    if (s.stroke) {
      cx.strokeStyle = paint(s.stroke);
      cx.lineWidth = s.width ?? 1;
      cx.lineJoin = 'round';
      cx.stroke(d);
    }
  }
  cx.globalAlpha = 1;
}
