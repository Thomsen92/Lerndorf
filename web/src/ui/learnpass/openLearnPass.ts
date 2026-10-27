/**
 * Opens the LearnPass page with the real API (U5): claims, shop chest, inventory link, the chest
 * pool for "What's inside?" and the tier-40 pick. Holds the session picture renderer while open.
 */
import { tr } from '../../i18n';
import type { PoolItem, SeasonApi } from '../../api/season';
import { itemName } from '../seasonChests';
import { renderLearnPass, type LearnPassHandle } from './learnpassView';
import { openInside } from './insideModal';
import { openSeasonPick } from './seasonPick';
import { seasonPictures, type PortraitFactory } from './rewardArt';

export interface OpenLearnPassOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  reducedMotion: boolean;
  onOpenInventory: () => void;
  /** The player's portrait in a given frame (frame rewards); a default figure otherwise. */
  portrait?: PortraitFactory;
}

export interface LearnPassOverlay {
  close(): void;
}

export function openLearnPass(opts: OpenLearnPassOptions): LearnPassOverlay {
  let view: LearnPassHandle | null = null;
  let closed = false;
  let seasonId = '';
  let poolJob: Promise<PoolItem[]> | null = null;
  const pictures = seasonPictures();
  const pool = () => (poolJob ??= opts.api.pool(seasonId));

  function close(): void {
    if (closed) return;
    closed = true;
    view?.destroy();
    view = null;
    pictures.release();
  }

  const actions = {
    onClose: () => close(),
    getCoins: opts.getCoins,
    itemName: (id: string) => itemName(id),
    async onClaim(tier: number): Promise<number> {
      const result = await opts.api.claim(tier);
      const coins = result.rewards.coins ?? 0;
      if (coins > 0) opts.onCoins(opts.getCoins() + coins);
      await refresh();
      return coins;
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
      if (view) openInside(view.el, { pool: pool(), pictures });
    },
    onPickItem(): void {
      if (!view) return;
      openSeasonPick(view.el, {
        pool: pool(),
        owned: opts.api.owned(),
        pictures,
        onPick: async (itemId) => {
          const result = await opts.api.choose(itemId, seasonId || undefined);
          if (result.coins) opts.onCoins(opts.getCoins() + result.coins);
          await refresh();
        },
      });
    },
  };

  async function refresh(): Promise<void> {
    if (closed) return;
    const state = await opts.api.state();
    if (closed) return;
    seasonId = state.season.id;
    if (!view) {
      view = renderLearnPass(state, actions, { reducedMotion: opts.reducedMotion, pictures, portrait: opts.portrait });
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
    const p = document.createElement('p');
    p.textContent = tr('Die Season konnte nicht geladen werden.');
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'lp-act';
    ok.textContent = tr('Schließen');
    ok.addEventListener('click', () => {
      box.remove();
      close();
    });
    box.append(p, ok);
    document.body.append(box);
  }

  void refresh().catch(fail);
  return { close };
}
