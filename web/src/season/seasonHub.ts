// Season hub: the HUD ticket and the stand open the LearnPass directly. It is independent of the
// dark Halloween world (r13/r14).
import { tr } from '../i18n';
import type { WorldThemeState } from '../api/worldTheme';
import './seasonHub.css';

export interface SeasonHubOptions {
  host: HTMLElement;
  openLearnPass: () => void;
  canOpen: () => boolean;
  /** Called once per shown welcome; the server stores the seen flag (plan package 7). */
  onAcknowledge?: (seasonId: string) => void;
}

export interface SeasonHub {
  el: HTMLButtonElement;
  open(): void;
  setState(state: WorldThemeState | null): void;
  /** Marks the running season as seen (no popup any more). */
  maybeAutoOpen(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

export function createSeasonHub(opts: SeasonHubOptions): SeasonHub {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'season-world-ticket';
  el.setAttribute('aria-label', tr('Season I – Halloween öffnen'));
  const image = document.createElement('img');
  image.src = `${import.meta.env.BASE_URL}assets/halloween/season-ticket.svg`;
  image.alt = '';
  image.width = 100;
  image.height = 54;
  const label = document.createElement('span');
  label.textContent = 'Season I';
  el.append(image, label);
  opts.host.append(el);

  // The ticket sits right below the player card. The card's height changes with the UI size,
  // the language and the zoom, so it is measured instead of guessed (no overlap, teacher 28.10.2026).
  const place = (): void => {
    const nav = document.querySelector<HTMLElement>('nav.game-nav');
    if (!nav || !nav.isConnected) return;
    const navRect = nav.getBoundingClientRect();
    if (navRect.height === 0) return;
    const hostRect = opts.host.getBoundingClientRect();
    el.style.top = `${Math.round(navRect.bottom - hostRect.top + 12)}px`;
  };
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => place()) : null;
  let watched: Element | null = null;
  const watch = (): void => {
    const nav = document.querySelector('nav.game-nav');
    if (nav && nav !== watched) {
      if (watched) resize?.unobserve(watched);
      resize?.observe(nav);
      watched = nav;
    }
    place();
  };
  window.addEventListener('resize', watch);
  requestAnimationFrame(watch);

  let state: WorldThemeState | null = null;
  // A season acknowledged in this session must not be sent again while the poll is in flight.
  let acknowledged: string | null = null;

  /** The ticket goes straight to the LearnPass; the welcome text was shelved (teacher, 29.10.2026). */
  function open(): void {
    if (!opts.canOpen()) return;
    if (state?.seasonState === 'running' && state.seasonId && acknowledged !== state.seasonId) {
      acknowledged = state.seasonId;
      opts.onAcknowledge?.(state.seasonId);
    }
    opts.openLearnPass();
  }

  el.addEventListener('click', open);

  return {
    el,
    open,
    setState(next) {
      state = next;
      watch();
      if (!next?.seasonId) return;
      if (acknowledged === next.seasonId) return;
      if (next.welcomeSeen) acknowledged = next.seasonId;
    },
    maybeAutoOpen() {
      // no welcome dialog any more: the season counts as seen without a popup
      if (!state || state.seasonState !== 'running' || !state.seasonId) return;
      if (state.welcomeSeen || acknowledged === state.seasonId) return;
      acknowledged = state.seasonId;
      opts.onAcknowledge?.(state.seasonId);
    },
    setVisible(visible) {
      el.hidden = !visible;
      if (visible) watch();
    },
    dispose() {
      resize?.disconnect();
      window.removeEventListener('resize', watch);
      el.remove();
    },
  };
}
