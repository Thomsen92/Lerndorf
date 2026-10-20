/**
 * Shop overlay (SPEC §12). Items grouped by kind: houses, garages, cars, decorations, avatar parts. A purchase needs its own confirmation
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
  // survives a redraw, so the result of a purchase stays visible
  let statusText = '';
  let statusError = false;
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
        <p class="status${statusError ? ' error' : ''}" id="status" role="status">${esc(statusText)}</p>
        ${GROUPS.map(([kind, title]) => {
          const list = buyable.filter((i) => i.kind === kind);
          if (list.length === 0) return '';
          return `<h3 class="shop-group">${title}</h3><div class="items">${list
            .map((i) => itemRow(i, coins, inv.value[i.id] ?? 0, opts.shopOpen))
            .join('')}</div>`;
        }).join('')}
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
    row.classList.add('confirm');
    row.innerHTML = `
      <span class="confirm-text">Für ${item.price} Münzen „${esc(item.nameDe)}“ kaufen?</span>
      <div class="confirm-actions">
        <button type="button" data-no="${esc(itemId)}">Abbrechen</button>
        <button type="button" class="primary" data-yes="${esc(itemId)}">Ja, kaufen</button>
      </div>`;
    row.querySelector(`[data-no]`)?.addEventListener('click', () => void draw());
    const yes = row.querySelector<HTMLButtonElement>(`[data-yes]`);
    yes?.addEventListener('click', async () => {
      yes.disabled = true; // no double purchase on a second tap
      yes.textContent = 'Kaufe …';
      const res = await buyItem(opts.supabase, itemId);
      if (!res.ok) {
        statusText = res.message;
        statusError = true;
      } else {
        coins = res.value.coins;
        opts.onCoins(coins);
        statusText = `„${item.nameDe}“ gekauft.`;
        statusError = false;
      }
      void draw();
    });
  };

  await draw();
}

/** Shop sections in this order. Houses, garages and cars can be owned once (one slot each). */
const GROUPS: Array<[string, string]> = [
  ['house', 'Häuser'],
  ['garage', 'Garagen'],
  ['car', 'Autos'],
  ['deco', 'Garten-Deko (für die vier Deko-Plätze)'],
  ['avatar', 'Für deinen Avatar'],
];
const ONCE = new Set(['house', 'garage', 'car']);

function itemRow(i: CatalogItem, coins: number, owned: number, shopOpen: boolean): string {
  const affordable = coins >= i.price;
  const have = ONCE.has(i.kind) && owned > 0;
  const disabled = !shopOpen || !affordable || have;
  const why = have ? 'hast du schon' : !shopOpen ? 'geschlossen' : !affordable ? 'zu teuer' : '';
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
