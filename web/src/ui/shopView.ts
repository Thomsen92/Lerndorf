/**
 * Shop overlay (SPEC §12). Items grouped in Deko and Avatar. A purchase needs its own confirmation
 * in the page (no confirm()). Greyed out when the coins are not enough or the shop is closed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { buyItem, loadCatalog, loadInventory, type CatalogItem } from '../api/economy';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export interface ShopOptions {
  supabase: SupabaseClient;
  shopOpen: boolean;
  coins: number;
  onCoins: (coins: number) => void;
  onClose: () => void;
}

export async function openShop(opts: ShopOptions): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Shop');
  document.body.appendChild(overlay);

  let coins = opts.coins;
  const close = (): void => {
    overlay.remove();
    opts.onClose();
  };

  const draw = async (): Promise<void> => {
    overlay.innerHTML = `<section class="panel"><p>Lädt …</p></section>`;
    const [catalog, inv] = await Promise.all([loadCatalog(opts.supabase), loadInventory(opts.supabase)]);
    if (!catalog.ok || !inv.ok) {
      overlay.innerHTML = `<section class="panel"><p class="error">${esc(
        !catalog.ok ? catalog.message : inv.ok ? '' : inv.message,
      )}</p><button type="button" id="close">Schließen</button></section>`;
      overlay.querySelector('#close')?.addEventListener('click', close);
      return;
    }
    const buyable = catalog.value.filter((i) => !i.starter);
    overlay.innerHTML = `
      <section class="panel">
        <header class="panel-head">
          <h2>Shop</h2>
          <span class="coins">${coins} Münzen</span>
          <button type="button" id="close">Schließen</button>
        </header>
        ${opts.shopOpen ? '' : '<p class="notice-in">Der Shop ist gerade geschlossen.</p>'}
        <p class="status" id="status" role="status"></p>
        <div class="items">
          ${buyable.map((i) => itemRow(i, coins, inv.value[i.id] ?? 0, opts.shopOpen)).join('')}
        </div>
      </section>`;
    overlay.querySelector('#close')?.addEventListener('click', close);
    overlay
      .querySelectorAll<HTMLButtonElement>('[data-buy]')
      .forEach((btn) => btn.addEventListener('click', () => askConfirm(btn.dataset.buy as string, buyable)));
  };

  const askConfirm = (itemId: string, list: CatalogItem[]): void => {
    const item = list.find((i) => i.id === itemId);
    if (!item) return;
    const row = overlay.querySelector<HTMLElement>(`[data-row="${itemId}"]`);
    if (!row) return;
    row.innerHTML = `
      <span>Für ${item.price} Münzen „${esc(item.nameDe)}“ kaufen?</span>
      <button type="button" class="primary" data-yes="${itemId}">Ja, kaufen</button>
      <button type="button" data-no="${itemId}">Abbrechen</button>`;
    row.querySelector(`[data-no]`)?.addEventListener('click', () => void draw());
    row.querySelector(`[data-yes]`)?.addEventListener('click', async () => {
      const res = await buyItem(opts.supabase, itemId);
      const status = overlay.querySelector<HTMLParagraphElement>('#status');
      if (!res.ok) {
        if (status) status.textContent = res.message;
        void draw();
        return;
      }
      coins = res.value.coins;
      opts.onCoins(coins);
      if (status) status.textContent = `„${item.nameDe}“ gekauft.`;
      void draw();
    });
  };

  await draw();
}

function itemRow(i: CatalogItem, coins: number, owned: number, shopOpen: boolean): string {
  const affordable = coins >= i.price;
  const disabled = !shopOpen || !affordable;
  const why = !shopOpen ? 'geschlossen' : !affordable ? 'zu teuer' : '';
  return `
    <div class="item" data-row="${esc(i.id)}">
      <span class="item-name">${esc(i.nameDe)}</span>
      <span class="item-price">${i.price} Münzen</span>
      <span class="item-owned">${owned > 0 ? `${owned} im Inventar` : ''}</span>
      <button type="button" data-buy="${esc(i.id)}" ${disabled ? 'disabled' : ''} aria-label="${esc(i.nameDe)} kaufen">
        Kaufen${why ? ` (${why})` : ''}
      </button>
    </div>`;
}
