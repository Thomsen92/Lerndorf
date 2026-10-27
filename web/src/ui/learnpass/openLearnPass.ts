/** Opens the LearnPass page with the real API (U5): claims, shop chest and inventory link. */
import { tr } from '../../i18n';
import type { SeasonApi } from '../../api/season';
import { renderLearnPass, type LearnPassHandle } from './learnpassView';

export interface OpenLearnPassOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  reducedMotion: boolean;
  onOpenInventory: () => void;
  onPickItem?: () => void;
}

export interface LearnPassOverlay {
  close(): void;
}

export function openLearnPass(opts: OpenLearnPassOptions): LearnPassOverlay {
  let view: LearnPassHandle | null = null;
  let closed = false;

  function close(): void {
    closed = true;
    view?.destroy();
    view = null;
  }

  const actions = {
    onClose: () => close(),
    getCoins: opts.getCoins,
    async onClaim(tier: number): Promise<void> {
      const result = await opts.api.claim(tier);
      const coins = result.rewards.coins ?? 0;
      if (coins > 0) opts.onCoins(opts.getCoins() + coins);
      await refresh();
    },
    async onBuyChest(): Promise<void> {
      await opts.api.buyChest();
      opts.onCoins(opts.getCoins() - 50);
      await refresh();
    },
    onOpenInventory(): void {
      close();
      opts.onOpenInventory();
    },
    onOpenInside(): void {
      // The view opens the pool dialog itself.
    },
    onPickItem(): void {
      opts.onPickItem?.();
    },
  };

  async function refresh(): Promise<void> {
    if (closed) return;
    const state = await opts.api.state();
    if (closed) return;
    if (!view) {
      view = renderLearnPass(state, actions, opts.reducedMotion);
      document.body.append(view.el);
    } else {
      view.update(state);
    }
  }

  function fail(): void {
    if (closed) return;
    const box = document.createElement('div');
    box.className = 'learnpass-error';
    box.setAttribute('role', 'alert');
    box.innerHTML = `<p>${tr('Die Season konnte nicht geladen werden.')}</p>`;
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'lp-btn';
    ok.textContent = tr('Schließen');
    ok.addEventListener('click', () => box.remove());
    box.append(ok);
    document.body.append(box);
  }

  void refresh().catch(fail);
  return { close };
}
