/**
 * "What's inside?" (plan §14.4, U3): the four chest odds and all 28 season items with their
 * rarity and sell value. No secret: the pool is public, only the roll stays hidden.
 */
import { tr, msg } from '../../i18n';
import { itemName } from '../seasonChests';
import './insideModal.css';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const ODDS: Array<{ rarity: Rarity; chance: number; label: string; color: string }> = [
  { rarity: 'common', chance: 55, label: tr('Gewöhnlich'), color: '#b9b2c6' },
  { rarity: 'rare', chance: 30, label: tr('Selten'), color: '#4a8ff0' },
  { rarity: 'epic', chance: 12, label: tr('Episch'), color: '#a06bf0' },
  { rarity: 'legendary', chance: 3, label: tr('Legendär'), color: '#f2b630' },
];

export const SELL: Record<Rarity, number> = { common: 15, rare: 40, epic: 100, legendary: 250 };

export const POOL: Array<{ id: string; rarity: Rarity }> = [
  { id: 'season_ghost', rarity: 'common' },
  { id: 'season_candle', rarity: 'common' },
  { id: 'season_bat', rarity: 'common' },
  { id: 'season_candy_bucket', rarity: 'common' },
  { id: 'season_gravestone', rarity: 'common' },
  { id: 'season_broom', rarity: 'common' },
  { id: 'season_sign', rarity: 'common' },
  { id: 'season_jack_o_lantern', rarity: 'common' },
  { id: 'season_skeleton', rarity: 'rare' },
  { id: 'season_zombie', rarity: 'rare' },
  { id: 'season_mummy', rarity: 'rare' },
  { id: 'season_witch_cat', rarity: 'rare' },
  { id: 'season_cauldron', rarity: 'rare' },
  { id: 'season_pumpkin_cat', rarity: 'rare' },
  { id: 'season_ghost_kitty', rarity: 'rare' },
  { id: 'season_witch_figure', rarity: 'rare' },
  { id: 'season_monster_plant', rarity: 'rare' },
  { id: 'season_pumpkin_tree', rarity: 'rare' },
  { id: 'season_candy_pile', rarity: 'rare' },
  { id: 'season_graveyard_corner', rarity: 'rare' },
  { id: 'season_fence_lantern', rarity: 'rare' },
  { id: 'season_warlock', rarity: 'epic' },
  { id: 'season_pumpkin_patch', rarity: 'epic' },
  { id: 'season_clock_tower', rarity: 'epic' },
  { id: 'season_witch_statue', rarity: 'epic' },
  { id: 'season_pumpkin_girl', rarity: 'epic' },
  { id: 'season_house_horror', rarity: 'legendary' },
  { id: 'season_dodge', rarity: 'legendary' },
];

const COLOR: Record<Rarity, string> = {
  common: '#b9b2c6',
  rare: '#4a8ff0',
  epic: '#a06bf0',
  legendary: '#f2b630',
};

export interface InsideHandle {
  el: HTMLElement;
  close(): void;
}

export function openInside(host: HTMLElement): InsideHandle {
  const overlay = document.createElement('div');
  overlay.className = 'inside-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'inside-dialog';
  dialog.tabIndex = -1;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', tr('Was ist drin?'));

  const head = document.createElement('header');
  head.className = 'inside-head';
  head.innerHTML = `<h2>${tr('Was ist drin?')}</h2><button type="button" class="inside-close" aria-label="${tr('Schließen')}">✕</button>`;
  const body = document.createElement('div');
  body.className = 'inside-body';

  const intro = document.createElement('p');
  intro.className = 'inside-intro';
  intro.textContent = tr('Jede Season-Truhe würfelt eine dieser vier Seltenheiten.');

  const odds = document.createElement('div');
  odds.className = 'inside-odds';
  for (const o of ODDS) {
    const row = document.createElement('div');
    row.className = 'inside-odd';
    row.style.setProperty('--rarity', o.color);
    row.innerHTML = `<span class="inside-odd-label">${tr(o.label)}</span>
      <span class="inside-odd-bar"><span style="width:${o.chance}%"></span></span>
      <span class="inside-odd-value">${o.chance}%</span>`;
    odds.append(row);
  }

  const grid = document.createElement('div');
  grid.className = 'inside-grid';
  for (const rarity of ['legendary', 'epic', 'rare', 'common'] as Rarity[]) {
    for (const item of POOL.filter((p) => p.rarity === rarity)) {
      const card = document.createElement('div');
      card.className = 'inside-item';
      card.style.setProperty('--rarity', COLOR[item.rarity]);
      card.innerHTML = `<span class="inside-dot" aria-hidden="true"></span>
        <span class="inside-item-name">${itemName(item.id)}</span>
        <span class="inside-item-sell">${msg`Verkaufswert: ${SELL[item.rarity]} Münzen`}</span>`;
      grid.append(card);
    }
  }

  const hint = document.createElement('p');
  hint.className = 'inside-hint';
  hint.textContent = tr('Doppelte bleiben im Inventar und lassen sich dort verkaufen.');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'inside-ok';
  close.textContent = tr('Verstanden');
  close.addEventListener('click', () => closeFn());

  body.append(intro, odds, grid, hint, close);
  dialog.append(head, body);
  overlay.append(dialog);
  host.append(overlay);

  function closeFn(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeFn();
    }
  }
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeFn();
  });
  head.querySelector<HTMLButtonElement>('.inside-close')?.addEventListener('click', () => closeFn());
  dialog.focus();

  return { el: overlay, close: closeFn };
}
