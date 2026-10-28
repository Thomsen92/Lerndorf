import './celebration.css';
import { tr } from '../i18n';

export interface CelebrationOptions {
  /** Big word in the middle; default „Geschafft!“ (English: „Success!“). */
  title?: string;
  /** Small line under it. */
  subtitle?: string;
  /** Colours and lettering: gold for the Daily Quests, Halloween for the Spooky English Quiz. */
  theme?: 'gold' | 'spooky';
  /** Plays the victory fanfare together with the picture. */
  sound?: { play(name: 'victory', delayMs?: number): void } | null;
  reduced?: boolean;
  /** Test seam for the confetti positions. */
  random?: () => number;
}

/** How long the picture stays: the fanfare (3.7 s) plus time for the confetti to land. */
export const CELEBRATION_MS = 4600;
const PIECES = 90;
const COLOURS = {
  gold: ['#ffd16d', '#ffb347', '#6fcf97', '#6fb6ff', '#ff8fb1', '#ffffff'],
  spooky: ['#ff7a1a', '#ffb347', '#9b5cff', '#7dff6a', '#f6e9d2', '#ff4f7b'],
};

let current: { close(): void } | null = null;

/**
 * A big „Success!“ that pops up with confetti, sparkles and the victory fanfare, for the moment a
 * whole quiz is done (all of today's Daily Quests, the Spooky English Quiz). Purely visual: it never
 * catches a tap and removes itself after CELEBRATION_MS. With reduced motion only the word appears.
 */
export function celebrate(opts: CelebrationOptions = {}): { close(): void } {
  current?.close();
  const theme = opts.theme ?? 'gold';
  const reduced =
    opts.reduced ??
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rnd = opts.random ?? Math.random;
  opts.sound?.play('victory');

  const layer = document.createElement('div');
  layer.className = `celebration ${theme}${reduced ? ' reduced' : ''}`;
  layer.setAttribute('aria-hidden', 'true');

  const rays = document.createElement('div');
  rays.className = 'celebration-rays';
  const stamp = document.createElement('div');
  stamp.className = 'celebration-stamp';
  const title = document.createElement('strong');
  title.className = 'celebration-title';
  title.textContent = opts.title ?? tr('Geschafft!');
  stamp.append(title);
  if (opts.subtitle) {
    const sub = document.createElement('span');
    sub.className = 'celebration-sub';
    sub.textContent = opts.subtitle;
    stamp.append(sub);
  }
  layer.append(rays, stamp);

  if (!reduced) {
    const colours = COLOURS[theme];
    for (let i = 0; i < PIECES; i++) {
      const piece = document.createElement('i');
      // a third shoots up from the bottom corners, the rest rains down from the top
      const burst = i % 3 === 0;
      piece.className = `confetti${burst ? ' burst' : ''}${i % 4 === 0 ? ' round' : ''}`;
      const left = burst ? (i % 2 === 0 ? 4 + rnd() * 10 : 86 + rnd() * 10) : rnd() * 100;
      const drift = burst ? (left < 50 ? 20 + rnd() * 35 : -(20 + rnd() * 35)) : (rnd() - 0.5) * 30;
      piece.style.cssText = [
        `left:${left.toFixed(1)}%`,
        `--drift:${drift.toFixed(1)}vw`,
        `--spin:${Math.round(360 + rnd() * 720) * (rnd() < 0.5 ? -1 : 1)}deg`,
        `--delay:${Math.round(rnd() * (burst ? 500 : 900))}ms`,
        `--fall:${Math.round(2200 + rnd() * 1600)}ms`,
        `--size:${(6 + rnd() * 7).toFixed(1)}px`,
        `background:${colours[i % colours.length]}`,
      ].join(';');
      layer.append(piece);
    }
    for (let i = 0; i < 10; i++) {
      const spark = document.createElement('b');
      spark.className = 'sparkle';
      const angle = (i / 10) * Math.PI * 2;
      const r = 120 + rnd() * 70;
      spark.style.cssText = `--sx:${Math.round(Math.cos(angle) * r * 1.4)}px;--sy:${Math.round(
        Math.sin(angle) * r,
      )}px;--delay:${150 + Math.round(rnd() * 500)}ms`;
      layer.append(spark);
    }
  }
  document.body.append(layer);

  let closed = false;
  const timer = setTimeout(() => close(), CELEBRATION_MS);
  function close(): void {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    layer.remove();
    if (current === handle) current = null;
  }
  const handle = { close };
  current = handle;
  return handle;
}
