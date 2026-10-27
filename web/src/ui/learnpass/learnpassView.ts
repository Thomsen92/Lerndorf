/**
 * LearnPass page (plan §14, variant A revised). A full-screen overlay like the profile: header,
 * status bar, one straight swipeable card track with a rail under the cards, and four tiles. The
 * view is pure DOM; the API calls arrive as callbacks, so the dev harness and the game share it.
 */
import { tr, msg } from '../../i18n';
import type { SeasonState, SeasonTier } from '../../api/season';
import { coinBurst } from '../coinBurst';
import {
  ICONS,
  chestSvg,
  coinSvg,
  modelPicture,
  rewardArt,
  rewardLabel,
  rewardText,
  type PortraitFactory,
  type SeasonPictures,
} from './rewardArt';
import { SEASON_CHEST_THUMB } from '../../render/itemThumbs';
import './learnpass.css';

export interface LearnPassActions {
  onClose(): void;
  /** Resolves with the coins the tier paid (for the coin pop), after the server confirmed it. */
  onClaim(tier: number): Promise<number | void>;
  onBuyChest(): Promise<void>;
  onOpenInventory(): void;
  onOpenInside(): void;
  onPickItem(): void;
  getCoins(): number;
  /** Display name of a pass scene or season item. */
  itemName?(id: string): string;
}

export interface LearnPassOptions {
  reducedMotion: boolean;
  pictures?: SeasonPictures | null;
  portrait?: PortraitFactory;
}

export interface LearnPassHandle {
  el: HTMLElement;
  update(state: SeasonState): void;
  destroy(): void;
}

const SKYLINE = `<svg class="lp-skyline" viewBox="0 0 1180 90" preserveAspectRatio="none" aria-hidden="true">
  <path fill="#0d0814" d="M0 90V62l40-6 22 8 30-22 26 18 44-10 20-30 8 4 10-24 10 24 8-4 18 32 40 6 30-14 22 10 36-6 16-20h10l16 20 44 4 26-12 30 14 40-8 24 10 34-20 18 16 26-6 30 12 24-18 22 4 14-28 6 2 8-18 8 18 6-2 14 30 34 4 28-10 40 12 30-8 26 10 34-14 24 8 30-6 40 10 34-8 26 6V90z"/>
  <g fill="#0d0814"><rect x="300" y="44" width="6" height="22"/><rect x="292" y="50" width="22" height="5"/>
  <rect x="820" y="40" width="6" height="26"/><rect x="812" y="47" width="22" height="5"/></g></svg>`;

let serial = 0;

function daysChip(state: SeasonState): string {
  if (state.season.state === 'upcoming') {
    const [, m, d] = state.season.starts_on.split('-');
    return msg`startet am ${d}.${m}.`;
  }
  if (state.season.state !== 'running') return tr('Saison beendet');
  return msg`noch ${state.season.days_left} Tage`;
}

export function renderLearnPass(
  initial: SeasonState,
  actions: LearnPassActions,
  options: boolean | LearnPassOptions,
): LearnPassHandle {
  const opts: LearnPassOptions = typeof options === 'boolean' ? { reducedMotion: options } : options;
  const pictures = opts.pictures ?? null;
  const nameOf = actions.itemName ?? ((id: string) => id);
  let state = initial;

  const area = document.createElement('section');
  area.className = 'learnpass';
  if (opts.reducedMotion) area.classList.add('reduced-motion');
  area.setAttribute('role', 'dialog');
  area.setAttribute('aria-modal', 'true');
  const titleId = `learnpass-title-${++serial}`;
  area.setAttribute('aria-labelledby', titleId);

  const page = document.createElement('div');
  page.className = 'lp-page';
  page.insertAdjacentHTML('afterbegin', `${SKYLINE}<div class="lp-fog" aria-hidden="true"></div>`);

  // header
  const head = document.createElement('header');
  head.className = 'lp-head';
  head.innerHTML = `<h1 class="lp-title" id="${titleId}"><small>${tr('Season I')}</small>${tr('Halloween')}</h1><span class="lp-grow"></span>`;
  const days = document.createElement('span');
  days.className = 'lp-chip';
  const coins = document.createElement('span');
  coins.className = 'lp-chip';
  coins.innerHTML = `${coinSvg(22)}<span class="lp-coins"></span>`;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lp-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', tr('Schließen'));
  close.addEventListener('click', () => actions.onClose());
  head.append(days, coins, close);

  // status bar
  const status = document.createElement('div');
  status.className = 'lp-status';
  status.setAttribute('aria-live', 'polite');

  // track
  const trackWrap = document.createElement('div');
  trackWrap.className = 'lp-track-wrap';
  const track = document.createElement('div');
  track.className = 'lp-track';
  track.tabIndex = 0;
  track.setAttribute('aria-label', tr('LearnPass-Stufen, nach links und rechts wischen'));
  trackWrap.append(track);

  const bottom = document.createElement('div');
  bottom.className = 'lp-bottom';

  page.append(head, status, trackWrap, bottom);
  area.append(page);

  function tierEl(tier: SeasonTier): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'lp-tier';
    wrap.dataset.tier = String(tier.tier);
    if (tier.tier <= state.tier) wrap.classList.add('done');
    if (tier.tier === state.tier) {
      wrap.classList.add('here');
      wrap.insertAdjacentHTML('afterbegin', `<span class="lp-you"><span>${tr('Du')}</span></span>`);
    }
    const card = document.createElement('article');
    card.className = `lp-card ${tier.state}`;
    if (tier.chest && tier.tier < 40) card.classList.add('milestone');
    if (tier.tier === 40) card.classList.add('tier40');
    const text = rewardText(tier, nameOf);
    card.setAttribute('aria-label', rewardLabel(tier, text));

    const mark = tier.state === 'claimed' ? ICONS.check : tier.state === 'locked' ? ICONS.lock : '';
    const top = document.createElement('div');
    top.className = 'lp-card-head';
    top.innerHTML = `<span>${tier.chest ? `${ICONS.star} ` : ''}${msg`Stufe ${tier.tier}`}</span>${mark}`;

    const name = document.createElement('div');
    name.className = 'lp-name';
    const nm = document.createElement('span');
    nm.className = 'lp-nm';
    nm.textContent = text.name;
    name.append(nm);
    const chosen = tier.choice && state.choice.item_id ? msg`Gewählt: ${nameOf(state.choice.item_id)}` : '';
    if (chosen || text.sub) {
      const extra = document.createElement('span');
      extra.className = 'lp-extra';
      extra.textContent = chosen || text.sub;
      name.append(extra);
    }

    const foot = document.createElement('div');
    foot.className = 'lp-foot';
    if (tier.state === 'ready') {
      const collect = document.createElement('button');
      collect.type = 'button';
      collect.className = 'lp-collect';
      collect.textContent = tr('Abholen');
      collect.addEventListener('click', () => {
        if (collect.disabled) return;
        collect.disabled = true;
        actions
          .onClaim(tier.tier)
          .then((gained) => {
            if (gained) coinBurst({ at: coins, amount: gained, reduced: opts.reducedMotion });
          })
          .catch(() => {
            collect.disabled = false;
          });
      });
      foot.append(collect);
    } else if (tier.choice && tier.state === 'claimed' && state.choice.open) {
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'lp-collect';
      pick.textContent = tr('Aussuchen');
      pick.addEventListener('click', () => actions.onPickItem());
      foot.append(pick);
    } else if (tier.state === 'claimed') {
      foot.textContent = tr('Abgeholt');
    } else if (tier.state === 'next') {
      foot.textContent = msg`noch ${state.next?.missing ?? Math.max(0, tier.xp - state.xp)} XP`;
    } else {
      foot.textContent = `${tier.xp} XP`;
    }

    card.append(top, rewardArt(tier, pictures, opts.portrait), name, foot);
    const node = document.createElement('span');
    node.className = 'lp-node-box';
    node.innerHTML = '<span class="lp-node"></span>';
    wrap.append(card, node);
    return wrap;
  }

  /** The rail runs from the first to the last node and is filled up to the player's tier. */
  function placeRail(): void {
    const nodes = [...track.querySelectorAll<HTMLElement>('.lp-node-box')];
    if (nodes.length === 0) return;
    const origin = track.getBoundingClientRect().left - track.scrollLeft;
    const centre = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2 - origin;
    };
    const first = centre(nodes[0]);
    const rail = track.querySelector<HTMLElement>('.lp-rail');
    if (!rail) return;
    rail.style.left = `${first}px`;
    rail.style.width = `${centre(nodes[nodes.length - 1]) - first}px`;
    const here = nodes[Math.max(0, state.tier - 1)];
    (rail.firstElementChild as HTMLElement).style.width = state.tier > 0 ? `${centre(here) - first}px` : '0';
  }

  function scrollToTier(n: number, smooth: boolean): void {
    const target = track.querySelector<HTMLElement>(`.lp-tier[data-tier="${Math.max(1, n)}"]`);
    if (!target) return;
    track.scrollTo({
      left: target.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2,
      behavior: smooth && !opts.reducedMotion ? 'smooth' : 'auto',
    });
  }

  /** The tier whose card sits closest to the middle of the track. */
  function centredTier(): number {
    const mid = track.getBoundingClientRect().left + track.clientWidth / 2;
    let best = 1;
    let bestDist = Infinity;
    for (const el of track.querySelectorAll<HTMLElement>('.lp-tier')) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist) {
        bestDist = d;
        best = Number(el.dataset.tier);
      }
    }
    return best;
  }

  function tile(cls = ''): HTMLDivElement {
    const t = document.createElement('div');
    t.className = `lp-tile ${cls}`.trim();
    return t;
  }

  function render(): void {
    days.textContent = daysChip(state);
    coins.querySelector('.lp-coins')!.textContent = String(actions.getCoins());

    const prevXp = state.tiers[state.tier - 1]?.xp ?? 0;
    const next = state.next;
    const pct = next ? Math.min(100, Math.round((100 * (state.xp - prevXp)) / Math.max(1, next.xp - prevXp))) : 100;
    status.innerHTML = `<div class="lp-hex" aria-hidden="true">${state.tier}</div>
      <div class="lp-status-text"><h2>${msg`Stufe ${state.tier} von 40`} <span>${
        next ? msg`${state.xp} XP · noch ${next.missing} XP bis Stufe ${next.tier}` : msg`${state.xp} XP · höchste Stufe`
      }</span></h2><div class="lp-bar"><i style="width:${pct}%"></i></div></div>`;
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'lp-ghost';
    jump.textContent = msg`Zu Stufe ${Math.max(1, state.tier)}`;
    jump.addEventListener('click', () => scrollToTier(state.tier, true));
    status.append(jump);

    const keepLeft = track.scrollLeft;
    const firstRender = track.childElementCount === 0;
    track.replaceChildren(...state.tiers.map(tierEl));
    const rail = document.createElement('div');
    rail.className = 'lp-rail';
    rail.innerHTML = '<i></i>';
    track.append(rail);

    // bottom tiles
    const waiting = state.chests.pass + state.chests.streak + state.chests.shop;
    const lastChestTier = state.tiers.filter((t) => t.chest && t.state === 'claimed').at(-1)?.tier;
    const pass = tile();
    const passIcon = document.createElement('span');
    passIcon.className = 'lp-tile-icon';
    passIcon.append(modelPicture(pictures, SEASON_CHEST_THUMB, 'deco', chestSvg(52)));
    pass.append(passIcon);
    pass.insertAdjacentHTML(
      'beforeend',
      `<b>${waiting === 1 ? tr('1 Truhe wartet') : msg`${waiting} Truhen warten`}</b><small>${
        state.chests.pass > 0 && lastChestTier ? msg`Von Stufe ${lastChestTier}` : waiting > 0 ? tr('Aus Serie und Shop') : tr('Noch keine Truhe')
      }</small>`,
    );
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'lp-act';
    openBtn.textContent = tr('Im Inventar öffnen');
    openBtn.disabled = waiting === 0;
    openBtn.addEventListener('click', () => actions.onOpenInventory());
    pass.append(openBtn);

    const streak = tile();
    const streakDays = state.streak.current > 0 && state.streak.current % 3 === 0 ? 3 : state.streak.current % 3;
    streak.innerHTML = `<span class="lp-tile-icon"><span class="lp-ring" style="--p:${(streakDays / 3) * 100}"><span>${streakDays}/3</span></span></span>
      <b>${tr('Truhen-Serie')}</b><small>${
        streakDays === 3
          ? tr('Truhe verdient! Bleib dran.')
          : msg`${streakDays} von 3 Tagen. Löse morgen eine Quest, dann bekommst du eine Truhe.`
      }</small>`;

    const shop = tile();
    shop.innerHTML = `<span class="lp-tile-icon">${coinSvg(46)}</span><b>${tr('Truhe kaufen')}</b>
      <small>${msg`50 Münzen · noch ${state.shop.left} von 2 diese Woche`}</small>`;
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'lp-act';
    const running = state.season.state === 'running';
    const canBuy = running && state.shop.left > 0 && actions.getCoins() >= 50;
    buy.textContent = !running ? tr('Saison beendet') : state.shop.left === 0 ? tr('Limit erreicht') : tr('Kaufen');
    buy.disabled = !canBuy;
    let confirmTimer = 0;
    buy.addEventListener('click', () => {
      if (buy.disabled) return;
      // Two taps: the first asks, the second buys (plan §14.1 "mit Bestätigung").
      if (!buy.classList.contains('confirm')) {
        buy.classList.add('confirm');
        buy.textContent = tr('Für 50 Münzen kaufen?');
        confirmTimer = window.setTimeout(() => {
          buy.classList.remove('confirm');
          buy.textContent = tr('Kaufen');
        }, 4000);
        return;
      }
      window.clearTimeout(confirmTimer);
      buy.disabled = true;
      void actions.onBuyChest().catch(() => {
        buy.disabled = false;
        buy.classList.remove('confirm');
        buy.textContent = tr('Kaufen');
      });
    });
    shop.append(buy);

    const inside = document.createElement('button');
    inside.type = 'button';
    inside.className = 'lp-tile inside';
    const insideIcon = document.createElement('span');
    insideIcon.className = 'lp-tile-icon';
    insideIcon.append(modelPicture(pictures, SEASON_CHEST_THUMB, 'deco', chestSvg(52)));
    inside.append(insideIcon);
    inside.insertAdjacentHTML('beforeend', `<b>${tr('Was ist drin?')}</b><small>${tr('Chancen und alle 28 Gegenstände')}</small>`);
    inside.addEventListener('click', () => actions.onOpenInside());

    bottom.replaceChildren(pass, streak, shop, inside);

    requestAnimationFrame(() => {
      placeRail();
      if (firstRender) scrollToTier(state.tier, false);
      else track.scrollLeft = keepLeft;
    });
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      actions.onClose();
    } else if (event.target === track && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
      // One card per key press; snapping would pull a pixel scroll straight back.
      event.preventDefault();
      scrollToTier(centredTier() + (event.key === 'ArrowRight' ? 1 : -1), true);
    }
  }
  area.addEventListener('keydown', onKey);

  // A mouse can drag the track too, so the page also works on a laptop; fingers scroll natively.
  let dragX = 0;
  let dragLeft = 0;
  let dragging = false;
  let moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    dragging = true;
    moved = false;
    dragX = e.clientX;
    dragLeft = track.scrollLeft;
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragX;
    if (Math.abs(dx) > 4) {
      moved = true;
      track.classList.add('dragging');
    }
    track.scrollLeft = dragLeft - dx;
  });
  const endDrag = () => {
    dragging = false;
    track.classList.remove('dragging');
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointerleave', endDrag);
  track.addEventListener(
    'click',
    (e) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    },
    true,
  );
  const onResize = () => placeRail();
  window.addEventListener('resize', onResize);

  render();
  close.focus();

  return {
    el: area,
    update(nextState) {
      state = nextState;
      render();
    },
    destroy() {
      area.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      area.remove();
    },
  };
}
