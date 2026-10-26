import { tr } from '../i18n';
import type { Say } from './sirByte';
import './mascot.css';
type AvoidRect = { left: number; top: number; right: number; bottom: number };
/** Place above the head, shifting upward past pupil speech and fixed controls. */
export function placeByteBubble(
  point: { x: number; y: number },
  width: number,
  height: number,
  viewport: { width: number; height: number },
  avoid: AvoidRect[],
) {
  let left = Math.max(12, Math.min(viewport.width - width - 12, point.x - width / 2));
  let top = Math.max(112, Math.min(viewport.height - 110 - height, point.y - height - 20));
  for (const rect of avoid) {
    if (
      left + width + 8 > rect.left &&
      left - 8 < rect.right &&
      top + height + 8 > rect.top &&
      top - 8 < rect.bottom
    ) {
      if (rect.left <= 12 && rect.right < viewport.width / 3) {
        left = Math.min(viewport.width - width - 12, rect.right + 12);
        continue;
      }
      const above = rect.top - height - 12;
      if (above >= 112) top = above;
      else if (rect.bottom + 12 + height < viewport.height - 100) top = rect.bottom + 12;
    }
  }
  return { left, top };
}
export function createByteBubble(host: HTMLElement) {
  const el = document.createElement('aside');
  el.className = 'byte-bubble';
  const label = document.createElement('span');
  label.className = 'byte-label';
  label.textContent = 'SIR BYTE';
  label.setAttribute('aria-hidden', 'true');
  const text = document.createElement('p');
  text.lang = 'en';
  text.setAttribute('role', 'status');
  el.append(label, text);
  host.append(el);
  el.hidden = true;
  let timer = 0,
    resolveAsk: (() => void) | null = null;
  const hide = (): void => {
    clearTimeout(timer);
    el.hidden = true;
    el.querySelector('button')?.remove();
    resolveAsk?.();
    resolveAsk = null;
  };
  return {
    el,
    show(say: Say, sticky = false) {
      hide();
      if (!say.text) return;
      text.textContent = say.text;
      el.hidden = false;
      if (!sticky) timer = window.setTimeout(hide, say.seconds * 1000);
    },
    ask(value: string): Promise<void> {
      hide();
      text.textContent = value;
      el.hidden = false;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'primary tutorial-action';
      button.textContent = tr('Weiter');
      el.append(button);
      button.focus();
      return new Promise((resolve) => {
        resolveAsk = resolve;
        button.addEventListener('click', hide, { once: true });
      });
    },
    anchor(point: { x: number; y: number } | null) {
      if (!point) {
        el.style.visibility = 'hidden';
        return;
      }
      el.style.visibility = '';
      const width = el.offsetWidth || 300,
        height = el.offsetHeight || 100;
      const avoid = [
        ...document.querySelectorAll<HTMLElement>('.tutorial-bubble, .build-bar, .avatar-badge, .game-nav'),
      ]
        .filter((e) => !e.hidden)
        .map((e) => e.getBoundingClientRect());
      const at = placeByteBubble(point, width, height, { width: innerWidth, height: innerHeight }, avoid);
      el.style.left = `${at.left}px`;
      el.style.top = `${at.top}px`;
      el.style.setProperty('--byte-tip-x', `${Math.max(16, Math.min(width - 32, point.x - at.left - 8))}px`);
    },
    hide,
    dispose() {
      hide();
      el.remove();
    },
  };
}
