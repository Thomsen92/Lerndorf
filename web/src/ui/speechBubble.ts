// Comic speech bubble for the tutorial overlay (look: docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md §9.3).
// Text is always set with textContent, never as HTML.

export type BubbleMood = 'sad' | 'happy' | 'plain';

/** Gap between the bubble tip and the point it refers to, in px. */
const TIP_GAP = 6;
const TIP_MIN = 20;

export function createBubble(text: string, mood: BubbleMood): HTMLElement {
  const el = document.createElement('div');
  el.className = `speech-bubble speech-bubble--${mood}`;
  el.setAttribute('role', 'status');
  el.textContent = text;
  return el;
}

/**
 * Places the bubble above `screen` (the figure's head, in viewport pixels), clamped into the window.
 * The tip stays aimed at the figure: its horizontal offset inside the bubble goes into `--tip-x`.
 * If there is no room above, the bubble is placed below and flagged with `speech-bubble--below`.
 */
export function positionBubble(el: HTMLElement, screen: { x: number; y: number }): void {
  const w = el.getBoundingClientRect().width;
  const h = el.getBoundingClientRect().height;
  const maxLeft = Math.max(0, window.innerWidth - w);
  const left = Math.min(Math.max(screen.x - w / 2, 0), maxLeft);
  let top = screen.y - h - TIP_GAP;
  const below = top < 0 && screen.y + TIP_GAP + h <= window.innerHeight;
  if (below) top = screen.y + TIP_GAP;
  top = Math.min(Math.max(top, 0), Math.max(0, window.innerHeight - h));
  const tip = Math.min(Math.max(screen.x - left, TIP_MIN), Math.max(TIP_MIN, w - TIP_MIN));
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.setProperty('--tip-x', `${tip}px`);
  el.classList.toggle('speech-bubble--below', below);
}
