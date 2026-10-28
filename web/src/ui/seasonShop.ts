/** The chest remains part of the one shop; purchase limits are still enforced by SeasonApi. */
import { tr, msg } from '../i18n';
import type { SeasonApi } from '../api/season';
import { chestSvg, seasonPictures } from './learnpass/rewardArt';
import { openInside, type InsideHandle } from './learnpass/insideModal';
import './seasonShop.css';

export interface SeasonShopOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  shopOpen?: boolean;
}
export type SeasonShopElement = HTMLElement & { dispose(): void };

export function createSeasonShopTile(opts: SeasonShopOptions): SeasonShopElement {
  const section = document.createElement('section') as SeasonShopElement;
  section.className = 'season-shop';
  section.innerHTML = `
    <div class="season-shop-icon">${chestSvg()}</div>
    <div class="season-shop-text"><strong>${tr('Season-Truhe')}</strong><small class="season-shop-meta"></small></div>
    <button type="button" class="season-shop-buy" disabled>${tr('Kaufen')}</button>
    <button type="button" class="season-chest-inside season-shop-inside">${tr('Was ist drin?')}</button>
    <p class="season-shop-status" role="status" hidden></p>`;
  const meta = section.querySelector<HTMLElement>('.season-shop-meta')!;
  const buy = section.querySelector<HTMLButtonElement>('.season-shop-buy')!;
  const status = section.querySelector<HTMLElement>('.season-shop-status')!;
  let closed = false;
  let busy = false;
  let inside: InsideHandle | null = null;
  let left = 0;
  let running = false;
  section.querySelector<HTMLButtonElement>('.season-shop-inside')!.addEventListener('click', () => {
    if (closed) return;
    inside?.close();
    const pictures = seasonPictures();
    const pool = opts.api.state().then((st) => opts.api.pool(st.season.id));
    inside = openInside(document.body, { pool, pictures, onClose: () => pictures.release() });
  });
  function render(): void {
    if (closed) return;
    meta.textContent =
      opts.shopOpen === false
        ? tr('Der Shop ist gerade geschlossen.')
        : running
          ? msg`50 Münzen · ${left} von 2 diese Woche`
          : tr('Die Saison läuft nicht.');
    buy.disabled = busy || !running || left <= 0 || opts.shopOpen === false;
    buy.textContent = left <= 0 && running ? tr('Limit erreicht') : tr('Kaufen');
  }
  async function load(): Promise<void> {
    try {
      const state = await opts.api.state();
      if (closed) return;
      left = state.shop.left;
      running = state.season.state === 'running';
      render();
    } catch {
      if (closed) return;
      meta.textContent = tr('Die Season konnte nicht geladen werden.');
      buy.disabled = true;
    }
  }
  buy.addEventListener('click', async () => {
    if (closed || busy || buy.disabled || opts.shopOpen === false) return;
    busy = true;
    buy.disabled = true;
    status.hidden = true;
    try {
      const result = await opts.api.buyChest();
      if (closed) return;
      opts.onCoins(opts.getCoins() - 50);
      left = result.left;
      status.textContent = tr('Die Truhe liegt in deinem Inventar.');
      status.hidden = false;
      status.classList.remove('error');
    } catch (error: unknown) {
      if (closed) return;
      const text = error instanceof Error ? error.message : '';
      status.textContent = /weekly limit/.test(text)
        ? tr('Du hast diese Woche schon zwei Truhen gekauft.')
        : /not enough coins/.test(text)
          ? tr('Nicht genug Münzen.')
          : /season not running/.test(text)
            ? tr('Die Saison läuft nicht.')
            : tr('Die Truhe konnte nicht gekauft werden.');
      status.hidden = false;
      status.classList.add('error');
      void load();
    } finally {
      busy = false;
      render();
    }
  });
  section.dispose = () => {
    if (closed) return;
    closed = true;
    buy.disabled = true;
    inside?.close();
    inside = null;
  };
  void load();
  return section;
}
