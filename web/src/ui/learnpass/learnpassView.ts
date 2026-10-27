/**
 * LearnPass page (plan §14). A full-screen overlay like the profile: header, status bar, a straight
 * swipeable card track and four tiles. The view is pure DOM; the API calls arrive as callbacks, so
 * the dev harness and the real profile share it.
 */
import { tr, msg } from '../../i18n';
import type { SeasonState, SeasonTier } from '../../api/season';
import { rewardArt, rewardText, coinSvg, chestSvg } from './rewardArt';
import { openInside } from './insideModal';
import './learnpass.css';

export interface LearnPassActions {
  onClose(): void;
  onClaim(tier: number): Promise<void>;
  onBuyChest(): Promise<void>;
  onOpenInventory(): void;
  onOpenInside(): void;
  onPickItem(): void;
  getCoins(): number;
}

export interface LearnPassHandle {
  el: HTMLElement;
  update(state: SeasonState): void;
  destroy(): void;
}

let serial = 0;

function glyph(state: SeasonTier['state']): string {
  return state === 'claimed' ? '✓' : state === 'locked' ? '🔒' : '';
}

function card(tier: SeasonTier, state: SeasonState, actions: LearnPassActions): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'lp-card';
  if (tier.chest && tier.tier < 40) b.classList.add('milestone');
  if (tier.tier === 40) b.classList.add('tier40');
  b.classList.add(tier.state);
  if (tier.tier === state.tier) {
    const you = document.createElement('span');
    you.className = 'lp-you';
    you.textContent = tr('Du');
    b.append(you);
  }
  const head = document.createElement('div');
  head.className = 'lp-card-head';
  head.innerHTML = `<span>${tier.chest ? '★ ' : ''}TIER ${tier.tier}</span><span>${glyph(tier.state)}</span>`;
  const text = rewardText(tier);
  b.append(head, rewardArt(tier));
  const body = document.createElement('div');
  body.className = 'lp-card-body';
  const name = document.createElement('div');
  name.className = 'lp-name';
  name.textContent = text.name;
  body.append(name);
  if (text.sub) {
    const sub = document.createElement('div');
    sub.className = 'lp-sub';
    sub.textContent = text.sub;
    body.append(sub);
  }
  b.append(body);

  const foot = document.createElement('div');
  foot.className = 'lp-foot';
  if (tier.state === 'claimed') {
    foot.classList.add('claimed');
    foot.textContent = tr('Abgeholt');
  } else if (tier.state === 'ready') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lp-btn';
    btn.textContent = tr('Abholen');
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      void actions.onClaim(tier.tier).catch(() => {
        btn.disabled = false;
      });
    });
    foot.append(btn);
  } else if (tier.state === 'next') {
    foot.textContent = msg`${state.next?.missing ?? 0} XP fehlen`;
  } else {
    foot.textContent = msg`${tier.xp} XP`;
  }
  b.append(foot);

  const label =
    tier.state === 'ready'
      ? msg`Stufe ${tier.tier}: ${text.name}, bereit zum Abholen`
      : msg`Stufe ${tier.tier}: ${text.name}, ${tier.state === 'claimed' ? tr('abgeholt') : tier.state === 'next' ? tr('nächste Stufe') : msg`${tier.xp} XP`}`;
  b.setAttribute('aria-label', label);
  return b;
}

export function renderLearnPass(
  state: SeasonState,
  actions: LearnPassActions,
  reducedMotion: boolean,
): LearnPassHandle {
  const area = document.createElement('section');
  area.className = 'learnpass';
  if (reducedMotion) area.classList.add('reduced-motion');
  area.setAttribute('role', 'region');
  const titleId = `learnpass-title-${++serial}`;
  area.setAttribute('aria-labelledby', titleId);

  const head = document.createElement('header');
  head.className = 'lp-head';
  const season = document.createElement('div');
  season.className = 'lp-season';
  season.innerHTML = `<small>${tr('Season I')}</small><h1 id="${titleId}">${tr('Halloween')}</h1>`;
  const chips = document.createElement('div');
  chips.className = 'lp-chips';
  const days = document.createElement('span');
  days.className = 'lp-chip';
  days.textContent = msg`${state.season.days_left} Tage übrig`;
  const coins = document.createElement('span');
  coins.className = 'lp-chip';
  coins.innerHTML = `<span class="coin">${coinSvg()}</span><span class="lp-coins">${actions.getCoins()}</span>`;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'lp-close';
  close.textContent = '✕';
  close.setAttribute('aria-label', tr('Schließen'));
  close.addEventListener('click', actions.onClose);
  chips.append(days, coins, close);
  head.append(season, chips);

  const status = document.createElement('div');
  status.className = 'lp-status';

  const trackWrap = document.createElement('div');
  trackWrap.className = 'lp-track-wrap';
  const track = document.createElement('div');
  track.className = 'lp-track';
  track.setAttribute('aria-label', tr('LearnPass-Stufen, nach links und rechts wischen'));
  track.tabIndex = 0;
  const rail = document.createElement('div');
  rail.className = 'lp-rail';
  trackWrap.append(track, rail);

  const bottom = document.createElement('div');
  bottom.className = 'lp-bottom';

  area.append(head, status, trackWrap, bottom);

  const error = document.createElement('div');
  error.className = 'lp-error';
  error.hidden = true;

  function centreCurrent(): void {
    const target = track.querySelector<HTMLElement>(`.lp-card[data-tier="${state.tier}"]`);
    target?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function render(): void {
    // status bar
    const next = state.next;
    const pct = next ? Math.min(100, Math.round((100 * (state.xp - (state.tiers[state.tier - 1]?.xp ?? 0))) / (next.xp - (state.tiers[state.tier - 1]?.xp ?? 0)))) : 100;
    status.innerHTML = '';
    const hex = document.createElement('div');
    hex.className = 'lp-hex';
    hex.textContent = String(state.tier);
    const stext = document.createElement('div');
    stext.className = 'lp-status-text';
    stext.innerHTML = `<strong>${msg`Stufe ${state.tier} von 40`}</strong><span>${
      next ? msg`${state.xp} XP · ${next.missing} XP bis Stufe ${next.tier}` : msg`${state.xp} XP · höchste Stufe`
    }</span><div class="lp-bar"><span style="width:${pct}%"></span></div>`;
    const jump = document.createElement('button');
    jump.type = 'button';
    jump.className = 'lp-btn ghost';
    jump.textContent = msg`Zu Stufe ${state.tier}`;
    jump.addEventListener('click', centreCurrent);
    status.append(hex, stext, jump);

    // cards + rail
    track.innerHTML = '';
    for (const tier of state.tiers) {
      const c = card(tier, state, actions);
      c.dataset.tier = String(tier.tier);
      track.append(c);
    }
    const dots = state.tiers.map((t) => `<span class="lp-dot ${t.state === 'claimed' ? 'done' : ''} ${t.tier === state.tier ? 'you' : ''}"></span>`).join('');
    rail.innerHTML = `<div class="lp-rail-line"><div class="lp-rail-fill" style="width:${(100 * state.tier) / 40}%"></div></div><div class="lp-dots">${dots}</div>`;

    // bottom tiles
    bottom.innerHTML = '';
    const pass = document.createElement('div');
    pass.className = 'lp-tile';
    pass.innerHTML = `<div class="lp-tile-icon">${chestSvg()}</div>
      <div class="lp-tile-text"><strong>${msg`${state.chests.pass} Truhe wartet`}</strong>
      <small>${tr('Aus dem Pass')}</small></div>`;
    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'lp-btn';
    openBtn.textContent = tr('Im Inventar öffnen');
    openBtn.disabled = state.chests.pass === 0;
    openBtn.addEventListener('click', actions.onOpenInventory);
    pass.append(openBtn);

    const streak = document.createElement('div');
    streak.className = 'lp-tile';
    const p = Math.min(1, state.streak.current / 3);
    streak.innerHTML = `<div class="lp-ring" style="--p:${p}"><span>${state.streak.current}/3</span></div>
      <div class="lp-tile-text"><strong>${tr('Truhen-Serie')}</strong>
      <small>${msg`${state.streak.current} von 3 Tagen. Löse morgen eine Quest für eine Truhe.`}</small></div>`;

    const shop = document.createElement('div');
    shop.className = 'lp-tile';
    shop.innerHTML = `<div class="lp-tile-icon">${chestSvg()}</div>
      <div class="lp-tile-text"><strong>${tr('Truhe kaufen')}</strong>
      <small>${msg`50 Münzen · ${state.shop.left} von 2 diese Woche`}</small></div>`;
    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'lp-btn';
    buy.textContent = tr('Kaufen');
    buy.disabled = state.shop.left === 0 || state.season.state !== 'running';
    buy.addEventListener('click', () => {
      buy.disabled = true;
      void actions.onBuyChest().catch(() => {
        buy.disabled = false;
      });
    });
    shop.append(buy);

    const inside = document.createElement('button');
    inside.type = 'button';
    inside.className = 'lp-tile';
    inside.innerHTML = `<div class="lp-tile-icon">${chestSvg()}</div>
      <div class="lp-tile-text"><strong>${tr('Was ist drin?')}</strong>
      <small>${tr('Chancen und alle 28 Gegenstände')}</small></div>`;
    inside.addEventListener('click', () => openInside(area));

    bottom.append(pass, streak, shop, inside);

    // choice tile replaces the pass tile text when tier 40 is open
    if (state.choice.open) {
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'lp-btn';
      pick.textContent = tr('Gegenstand wählen');
      pick.addEventListener('click', actions.onPickItem);
      pass.append(pick);
    }

    error.hidden = true;
    area.append(error);
    queueMicrotask(centreCurrent);
  }

  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      actions.onClose();
    } else if (event.key === 'ArrowRight') {
      track.scrollBy({ left: 200, behavior: 'smooth' });
    } else if (event.key === 'ArrowLeft') {
      track.scrollBy({ left: -200, behavior: 'smooth' });
    }
  }
  area.addEventListener('keydown', onKey);

  render();
  close.focus();

  return {
    el: area,
    update(nextState) {
      state = nextState;
      const coinEl = area.querySelector('.lp-coins');
      if (coinEl) coinEl.textContent = String(actions.getCoins());
      render();
    },
    destroy() {
      area.removeEventListener('keydown', onKey);
      area.remove();
    },
  };
}
