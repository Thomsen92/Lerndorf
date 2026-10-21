/**
 * Main navigation: three labelled buttons (Dorf, Aufgaben, Mein Haus) plus a status button with nickname and coins.
 * Bottom bar in portrait, left rail in landscape (see style.css). Not mounted by itself.
 */
export type NavButton = 'dorf' | 'aufgaben' | 'haus';
/** all areas; bauen, shop and inventar live under 'haus' */
export type NavArea = NavButton | 'bauen' | 'shop' | 'inventar';

export const NAV_BUTTONS: readonly NavButton[] = ['dorf', 'aufgaben', 'haus'];

const LABELS: Record<NavButton, { icon: string; label: string }> = {
  dorf: { icon: '🏘', label: 'Dorf' },
  aufgaben: { icon: '📋', label: 'Aufgaben' },
  haus: { icon: '🏠', label: 'Mein Haus' },
};

/** Nav button that is marked for an area: bauen/shop/inventar → 'haus'. */
export function navButtonFor(area: NavArea): NavButton {
  return area === 'bauen' || area === 'shop' || area === 'inventar' ? 'haus' : area;
}

export interface GameNav {
  el: HTMLElement;
  status: HTMLElement;
  setActive(area: NavArea): void;
  setCoins(coins: number): void;
}

export function createGameNav(opts: {
  nickname: string;
  coins: number;
  onSelect: (area: NavButton, button: HTMLButtonElement) => void;
  onAccount: (button: HTMLButtonElement) => void;
}): GameNav {
  const el = document.createElement('nav');
  el.className = 'game-nav';
  el.setAttribute('aria-label', 'Hauptmenü');

  const buttons = new Map<NavButton, HTMLButtonElement>();
  for (const area of NAV_BUTTONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nav-btn';
    b.dataset.area = area;
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = LABELS[area].icon;
    const label = document.createElement('span');
    label.className = 'nav-label';
    label.textContent = LABELS[area].label;
    b.append(icon, label);
    b.addEventListener('click', () => opts.onSelect(area, b));
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

  el.append(status, live);

  let coinsNow = opts.coins;
  const renderStatus = (): void => {
    coinsEl.textContent = `${coinsNow} Münzen`;
    status.setAttribute('aria-label', `${opts.nickname}, ${coinsNow} Münzen – Einstellungen öffnen`);
  };
  renderStatus();

  return {
    el,
    status,
    setActive(area) {
      const active = navButtonFor(area);
      for (const [name, b] of buttons) {
        const on = name === active;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      }
    },
    setCoins(coins) {
      const diff = coins - coinsNow;
      coinsNow = coins;
      renderStatus();
      live.textContent = `Du hast jetzt ${coins} Münzen.`;
      if (diff > 0) {
        const tag = document.createElement('span');
        tag.className = 'gain';
        tag.setAttribute('aria-hidden', 'true');
        tag.textContent = `+${diff}`;
        status.append(tag);
        window.setTimeout(() => tag.remove(), 1400);
      }
    },
  };
}
