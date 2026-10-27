/** Season chest in the shop (plan §5.4, U4a): 50 coins, two per Berlin week, remaining count. */
import { tr, msg } from '../i18n';
import type { SeasonApi } from '../api/season';
import { chestSvg } from './learnpass/rewardArt';
import './seasonShop.css';

export interface SeasonShopOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
}

export function createSeasonShopTile(opts: SeasonShopOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'season-shop';
  section.innerHTML = `
    <div class="season-shop-icon">${chestSvg()}</div>
    <div class="season-shop-text">
      <strong>${tr('Season-Truhe')}</strong>
      <small class="season-shop-meta"></small>
    </div>
    <button type="button" class="season-shop-buy">${tr('Kaufen')}</button>
    <p class="season-shop-status" role="status" hidden></p>`;
  const meta = section.querySelector<HTMLElement>('.season-shop-meta')!;
  const buy = section.querySelector<HTMLButtonElement>('.season-shop-buy')!;
  const status = section.querySelector<HTMLElement>('.season-shop-status')!;
  let left = 0;
  let running = false;

  function render(): void {
    meta.textContent = running
      ? msg`50 Münzen · ${left} von 2 diese Woche`
      : tr('Die Saison läuft nicht.');
    buy.disabled = !running || left <= 0;
    buy.textContent = left <= 0 && running ? tr('Limit erreicht') : tr('Kaufen');
  }

  function message(text: string): void {
    status.textContent = text;
    status.hidden = false;
    status.classList.add('error');
  }

  async function load(): Promise<void> {
    try {
      const state = await opts.api.state();
      left = state.shop.left;
      running = state.season.state === 'running';
      render();
    } catch {
      meta.textContent = tr('Die Season konnte nicht geladen werden.');
      buy.disabled = true;
    }
  }

  buy.addEventListener('click', () => {
    if (buy.disabled) return;
    buy.disabled = true;
    status.hidden = true;
    void opts.api
      .buyChest()
      .then((result) => {
        opts.onCoins(opts.getCoins() - 50);
        left = result.left;
        render();
        status.textContent = tr('Die Truhe liegt in deinem Inventar.');
        status.hidden = false;
        status.classList.remove('error');
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : '';
        message(
          /weekly limit/.test(text)
            ? tr('Du hast diese Woche schon zwei Truhen gekauft.')
            : /not enough coins/.test(text)
              ? tr('Not enough coins.')
              : /season not running/.test(text)
                ? tr('Die Saison läuft nicht.')
                : tr('Die Truhe konnte nicht gekauft werden.'),
        );
        void load();
      });
  });

  void load();
  return section;
}
