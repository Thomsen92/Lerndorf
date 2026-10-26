import { msg, tr } from '../i18n';
import type { Chest, ProgressApi } from '../api/progress';
import { createChestPreview, type ChestPreview } from '../render/chestPreview';
import type { Sound } from './sound';
import './chest.css';

export function chestResultText(coins: number, roll: 'normal' | 'double' | 'triple'): string {
  return msg`+${coins} Münzen${roll === 'double' ? tr(' – Super!') : roll === 'triple' ? tr(' – Jackpot!') : ''}`;
}
export interface ChestControl {
  el: HTMLElement;
  readonly pending: boolean;
  dispose(): void;
}

/** The chest is the hit target; its lid and winnings change only after server confirmation. */
export function createChestControl(opts: {
  chest: Chest;
  api: ProgressApi;
  reducedMotion: boolean;
  sound?: Sound;
  onCoins: (coins: number) => void;
  onOpened?: (id: number) => void;
  onPending?: (pending: boolean) => void;
  previewFactory?: typeof createChestPreview;
}): ChestControl {
  const el = document.createElement('article');
  el.className = 'loot-chest';
  el.dataset.chestId = String(opts.chest.id);
  el.dataset.state = 'closed';
  if (opts.reducedMotion) el.classList.add('reduced-motion');
  const hit = document.createElement('button');
  hit.type = 'button';
  hit.className = 'chest-hit';
  const label = opts.chest.size === 'big' ? tr('Große Truhe') : tr('Truhe');
  hit.setAttribute('aria-label', msg`${label} öffnen`);
  const visual = document.createElement('span');
  visual.className = 'loot-visual';
  visual.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.width = 390;
  canvas.height = 294;
  const fallback = document.createElement('span');
  fallback.className = 'loot-fallback';
  fallback.innerHTML =
    '<svg viewBox="0 0 240 180"><path d="M35 85 139 58 206 94 206 143 101 170 35 133Z" fill="#9c5a31" stroke="#49352c" stroke-width="5"/><path d="M101 115 206 88 206 143 101 170Z" fill="#77452e"/><g class="loot-fallback-lid"><path d="M35 85Q42 32 94 42L139 58Q186 48 206 94L101 122Z" fill="#bd7b40" stroke="#49352c" stroke-width="5"/><path d="M61 66 127 105M119 53 180 90" stroke="#edbb5c" stroke-width="12"/></g><path d="M61 99V142M167 106V151" stroke="#edbb5c" stroke-width="11"/><rect x="105" y="110" width="22" height="25" rx="3" fill="#ffd67e"/></svg>';
  fallback.hidden = true;
  visual.append(canvas, fallback);
  const caption = document.createElement('span');
  caption.className = 'loot-caption';
  caption.textContent = label;
  hit.append(visual, caption);
  const status = document.createElement('p');
  status.className = 'loot-status';
  status.setAttribute('role', 'status');
  el.append(hit, status);
  let preview: ChestPreview | null = null,
    pending = false,
    opened = false,
    disposed = false;
  let coinFrame = 0;
  const showFallback = (): void => {
    canvas.hidden = true;
    fallback.hidden = false;
    el.dataset.renderer = 'fallback';
  };
  preview = (opts.previewFactory ?? createChestPreview)(canvas, {
    size: opts.chest.size,
    reducedMotion: opts.reducedMotion,
    onError: showFallback,
  });
  if (!preview) showFallback();
  else el.dataset.renderer = 'webgl';
  let hovered = false,
    focused = false;
  const hover = (): void => {
    const active = (hovered || focused) && !opened;
    el.classList.toggle('loot-chest--hover', active);
    preview?.setHovered(active);
  };
  hit.addEventListener('pointerenter', () => {
    hovered = true;
    hover();
  });
  hit.addEventListener('pointerleave', () => {
    hovered = false;
    hover();
  });
  hit.addEventListener('focus', () => {
    focused = true;
    hover();
  });
  hit.addEventListener('blur', () => {
    focused = false;
    hover();
  });
  const animateCoins = (coins: number): void => {
    if (opts.reducedMotion) return;
    const burst = document.createElement('span');
    burst.className = 'loot-coins';
    burst.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 9; i++) {
      const coin = document.createElement('i');
      coin.style.setProperty('--coin-x', `${Math.cos(i * 0.8) * 90}px`);
      coin.style.setProperty('--coin-y', `${-65 - Math.sin(i * 0.7) * 65}px`);
      burst.append(coin);
    }
    const counter = document.createElement('span');
    counter.className = 'loot-counter';
    counter.setAttribute('aria-hidden', 'true');
    visual.append(burst, counter);
    const start = performance.now();
    const tick = (now: number): void => {
      if (disposed) return;
      const fraction = Math.min(1, (now - start) / 700);
      counter.textContent = `+${Math.round(coins * fraction)}`;
      if (fraction < 1) coinFrame = window.requestAnimationFrame(tick);
      else {
        coinFrame = 0;
        burst.remove();
      }
    };
    coinFrame = window.requestAnimationFrame(tick);
  };
  hit.addEventListener('click', () => {
    void open();
  });
  async function open(): Promise<void> {
    if (pending || opened || disposed) return;
    pending = true;
    el.dataset.state = 'pending';
    hit.setAttribute('aria-busy', 'true');
    hit.setAttribute('aria-disabled', 'true');
    status.textContent = tr('Die Truhe wird geöffnet …');
    preview?.setState('pending');
    opts.sound?.play('chest');
    opts.onPending?.(true);
    try {
      const result = await opts.api.openChest(opts.chest.id);
      if (!result.ok) throw Error();
      opts.onCoins(result.value.coins);
      opts.onOpened?.(opts.chest.id);
      if (disposed) return;
      opened = true;
      el.dataset.state = 'open';
      preview?.setState('open');
      hover();
      status.textContent = chestResultText(result.value.coinsWon, result.value.roll);
      hit.setAttribute('aria-label', msg`${label} geöffnet`);
      caption.textContent = tr('Geöffnet');
      opts.sound?.play('coins');
      animateCoins(result.value.coinsWon);
    } catch {
      if (disposed) return;
      el.dataset.state = 'closed';
      preview?.setState('closed');
      hit.removeAttribute('aria-disabled');
      status.textContent = tr('Das hat nicht geklappt. Tippe die Truhe noch einmal an.');
    } finally {
      pending = false;
      if (!disposed) {
        hit.removeAttribute('aria-busy');
        opts.onPending?.(false);
      }
    }
  }
  return {
    el,
    get pending() {
      return pending;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (coinFrame) window.cancelAnimationFrame(coinFrame);
      preview?.dispose();
    },
  };
}
