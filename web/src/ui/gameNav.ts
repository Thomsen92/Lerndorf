import { tr, msg } from '../i18n';
import type { AvatarBadge } from './avatarBadge';
import { coinBurst } from './coinBurst';
import './gameNav.css';
/**
 * Two accessible shortcuts beside the avatar in the top right. No village/market shortcut or rail.
 */
export type NavButton = 'aufgaben' | 'haus';
/** all areas; bauen, shop and inventar live under 'haus' */
export type NavArea = NavButton | 'dorf' | 'bauen' | 'shop' | 'inventar' | 'profil' | 'kleiderschrank';

export const NAV_BUTTONS: readonly NavButton[] = ['aufgaben', 'haus'];

const LABELS: Record<NavButton, { icon: string; label: string }> = {
  aufgaben: {
    icon: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/>',
    label: tr('Aufgaben'),
  },
  haus: { icon: '<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>', label: tr('Mein Haus') },
};

/** Nav button that is marked for an area: bauen/shop/inventar → 'haus'. */
export function navButtonFor(area: NavArea): NavButton | null {
  if (area === 'profil' || area === 'dorf') return null;
  return area === 'bauen' || area === 'shop' || area === 'inventar' || area === 'kleiderschrank'
    ? 'haus'
    : area;
}

export interface GameNav {
  el: HTMLElement;
  status: HTMLElement;
  setActive(area: NavArea): void;
  setCoins(coins: number): void;
  setQuestBadge(open: number | 'done' | null): void;
  /** Tutorial: the area buttons are aria-disabled and ignore taps; the status (account) button stays usable. */
  setLocked(locked: boolean): void;
}

export function createGameNav(opts: {
  badge?: AvatarBadge;
  nickname: string;
  coins: number;
  onSelect: (area: NavButton, button: HTMLButtonElement) => void;
  onAccount: (button: HTMLButtonElement) => void;
  /** Opens the news feed (coin history and notices) from the bell under the avatar. */
  onNews?: () => void;
  /** Return to the market and frame Sir Byte with the quest board. */
  onByte?: (button: HTMLButtonElement) => void;
  sound?: { play(name: 'coins'): void };
  reducedMotion?: () => boolean;
}): GameNav {
  const el = document.createElement('nav');
  el.className = 'game-nav';
  el.setAttribute('aria-label', tr('Hauptmenü'));

  const buttons = new Map<NavButton, HTMLButtonElement>();
  let locked = false;
  for (const area of NAV_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-btn';
    b.dataset.area = area;
    b.setAttribute('aria-label', LABELS[area].label);
    b.title = LABELS[area].label;
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">${LABELS[area].icon}</svg>`;
    const label = document.createElement('span');
    label.className = 'nav-label sr-only';
    label.textContent = LABELS[area].label;
    b.append(icon, label);
    b.addEventListener('click', () => {
      if (locked) return;
      opts.onSelect(area, b);
    });
    buttons.set(area, b);
    el.append(b);
  }

  const status = document.createElement('button');
  status.type = 'button';
  status.className = 'nav-status';
  const who = document.createElement('span');
  who.className = 'nav-who';
  who.textContent = opts.nickname;
  const coinsEl = document.createElement('span');
  coinsEl.className = 'nav-coins';
  status.setAttribute('aria-haspopup', 'dialog');
  status.append(who, coinsEl);
  status.addEventListener('click', () => opts.onAccount(status));

  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');

  const statusElement = opts.badge?.el ?? status;
  const bell = document.createElement('button');
  bell.type = 'button';
  bell.className = 'nav-bell';
  bell.setAttribute('aria-label', tr('Neuigkeiten'));
  bell.title = tr('Neuigkeiten');
  bell.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
  bell.addEventListener('click', () => opts.onNews?.());
  const user = document.createElement('div');
  user.className = 'nav-user';
  let byteButton: HTMLButtonElement | undefined;
  user.append(statusElement);
  if (opts.onByte) {
    byteButton = document.createElement('button');
    byteButton.type = 'button';
    byteButton.className = 'nav-byte';
    byteButton.setAttribute('aria-label', tr('Zu Sir Byte und der Questtafel'));
    byteButton.title = tr('Zu Sir Byte und der Questtafel');
    const portrait = document.createElement('img'),
      label = document.createElement('span');
    portrait.src = `${import.meta.env.BASE_URL}assets/sir-byte/preview.png`;
    portrait.alt = '';
    portrait.draggable = false;
    label.textContent = 'Sir Byte';
    byteButton.append(portrait, label);
    byteButton.onclick = () => {
      if (!locked) opts.onByte?.(byteButton!);
    };
    const actions = document.createElement('div');
    actions.className = 'nav-user-actions';
    actions.append(byteButton, bell);
    user.append(actions);
  } else user.append(bell);
  el.append(user, live);

  let coinsNow = opts.coins;
  const renderStatus = (): void => {
    coinsEl.textContent = msg`${coinsNow} Münzen`;
    status.setAttribute('aria-label', msg`${opts.nickname}, ${coinsNow} Münzen – Einstellungen öffnen`);
  };
  renderStatus();

  return {
    el,
    status: statusElement,
    setQuestBadge(open) {
      const b = buttons.get('aufgaben')!;
      b.querySelector('.quest-badge')?.remove();
      b.setAttribute('aria-label', tr('Aufgaben'));
      if (open === null) return;
      const badge = document.createElement('span');
      badge.className = 'quest-badge';
      badge.textContent = open === 'done' ? '✓' : String(open);
      badge.setAttribute('aria-hidden', 'true');
      b.append(badge);
      b.setAttribute(
        'aria-label',
        open === 'done' ? tr('Aufgaben, Tagesziel geschafft') : msg`Aufgaben, ${open} Quests offen`,
      );
    },
    setActive(area) {
      const active = navButtonFor(area);
      for (const [name, b] of buttons) {
        const on = name === active;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      }
    },
    setLocked(on) {
      locked = on;
      if (byteButton) {
        if (on) byteButton.setAttribute('aria-disabled', 'true');
        else byteButton.removeAttribute('aria-disabled');
      }
      for (const b of buttons.values()) {
        if (on) b.setAttribute('aria-disabled', 'true');
        else b.removeAttribute('aria-disabled');
      }
    },
    setCoins(coins) {
      const diff = coins - coinsNow;
      coinsNow = coins;
      renderStatus();
      opts.badge?.setCoins?.(coins);
      live.textContent = msg`Du hast jetzt ${coins} Münzen.`;
      if (diff > 0) {
        coinBurst({
          at: coinsEl,
          amount: diff,
          reduced: opts.reducedMotion?.() ?? false,
          sound: opts.sound,
        });
        const tag = document.createElement('span');
        tag.className = 'gain';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = `+${diff}`;
        statusElement.append(tag);
        window.setTimeout(() => tag.remove(), 1400);
      }
    },
  };
}
