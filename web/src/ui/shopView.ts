import { tr, msg } from '../i18n';
/**
 * Shop and inventory areas (non-modal, SPEC §12): a category bar and a grid of item cards.
 * A card opens the shared detail dialog (purchase flow or inventory actions). After a change the list is
 * reloaded, so the affordability of every card follows the new coin value.
 * The inventory view reuses openItemArea with origin 'inventar'.
 */
import { KIND_LABEL, KIND_ORDER, type ItemApi, type ItemEntry, type ItemKind } from '../api/items';
import { partById } from '../avatars/catalog';
import type { CharacterKind } from '../render/character';
import type { PreviewFactory } from '../render/itemPreview';
import { acquireSessionThumbs, type ThumbSource } from '../render/itemThumbs';
import type { SlotId } from '../world/plotPlan';
import type { AreaHandle } from './areas';
import type { ModalHandle } from './dialog';
import { itemCard, openItemDetail, setCardThumb, type ItemOrigin } from './itemDetail';

export interface ItemAreaOptions {
  character?: CharacterKind;
  onWardrobe?: (itemId?: string) => void;
  api: ItemApi;
  getCoins: () => number;
  onCoins: (c: number) => void;
  shopOpen: boolean;
  buildOpen: boolean;
  category: ItemKind | null;
  onCategory: (k: ItemKind) => void;
  onBuild: (itemId: string) => void;
  onShowSlot: (slot: SlotId) => void;
  onOpenInventory: () => void;
  /** Called by the area's own „Schließen“ button; close() from outside does not call it. */
  onClose: () => void;
  createPreview?: PreviewFactory;
  /** Thumbnail source; default: the session WebGL source (renderer released when the area closes). */
  thumbs?: ThumbSource;
}

let counter = 0;

export function openShop(opts: ItemAreaOptions): AreaHandle {
  return openItemArea('shop', opts);
}

export function openItemArea(origin: ItemOrigin, opts: ItemAreaOptions): AreaHandle {
  const title = origin === 'shop' ? tr('Shop') : tr('Inventar');
  const titleId = `area-title-${++counter}`;

  const area = document.createElement('section');
  area.className = 'overlay area';
  area.setAttribute('role', 'region');
  area.setAttribute('aria-labelledby', titleId);

  const head = document.createElement('header');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.id = titleId;
  h2.textContent = title;
  const coinsEl = document.createElement('span');
  coinsEl.className = 'coins';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = tr('Schließen');
  closeBtn.addEventListener('click', () => opts.onClose());
  head.append(h2, coinsEl, closeBtn);
  const content = document.createElement('div');
  content.className = 'area-content';
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.append(head, content);
  area.appendChild(panel);
  document.body.appendChild(area);

  let closed = false;
  let book: ItemEntry[] | null = null;
  let error: string | null = null;
  let category: ItemKind | null = opts.category;
  let detail: ModalHandle | null = null;
  let loadId = 0;
  // cards are reused across redraws so the dialog's opener stays in the document
  const cards = new Map<string, HTMLButtonElement>();

  const session = opts.thumbs ? null : acquireSessionThumbs();
  const thumbs: ThumbSource = opts.thumbs ?? (session as NonNullable<typeof session>).source;
  // resolved pictures survive redraws (null = no picture); pending ids are requested only once
  const urls = new Map<string, string | null>();
  const pending = new Set<string>();

  function attachThumb(entry: ItemEntry, card: HTMLButtonElement): void {
    const known = urls.get(entry.id);
    if (known) setCardThumb(card, known);
    if (urls.has(entry.id) || pending.has(entry.id)) return;
    pending.add(entry.id);
    void thumbs(entry)
      .catch(() => null)
      .then((url) => {
        pending.delete(entry.id);
        if (closed) return;
        urls.set(entry.id, url);
        const c = cards.get(entry.id);
        if (url && c) setCardThumb(c, url);
      });
  }

  const visible = (): ItemEntry[] =>
    (book ?? []).filter((e) =>
      origin === 'shop'
        ? !e.starter &&
          e.shopVisible !== false &&
          (e.kind !== 'avatar' || !opts.character || partById(e.id)?.character === opts.character)
        : e.owned > 0,
    );
  const kinds = (): ItemKind[] =>
    origin === 'shop' ? [...KIND_ORDER] : KIND_ORDER.filter((k) => visible().some((e) => e.kind === k));

  function draw(focusKind?: ItemKind): void {
    coinsEl.textContent = msg`${opts.getCoins()} Münzen`;
    content.replaceChildren();
    if (error !== null) {
      const p = document.createElement('p');
      p.className = 'error';
      p.textContent = error;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = tr('Nochmal versuchen');
      retry.addEventListener('click', () => void load(false));
      content.append(p, retry);
      return;
    }
    if (book === null) {
      const p = document.createElement('p');
      p.textContent = tr('Lädt …');
      content.appendChild(p);
      return;
    }
    if (origin === 'shop' && !opts.shopOpen) {
      const p = document.createElement('p');
      p.className = 'notice-in';
      p.textContent = tr('Der Shop ist gerade geschlossen.');
      content.appendChild(p);
    }
    const available = kinds();
    if (available.length === 0) {
      const p = document.createElement('p');
      p.textContent =
        origin === 'shop'
          ? tr('In dieser Kategorie gibt es gerade nichts.')
          : tr('Du hast noch keine eigenen Sachen. Im Shop kannst du welche kaufen.');
      content.appendChild(p);
      return;
    }
    if (category === null || !available.includes(category)) category = available[0] ?? 'house';
    const current = category;

    const bar = document.createElement('div');
    bar.className = 'category-bar';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', tr('Kategorien'));
    for (const kind of available) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.kind = kind;
      b.textContent = KIND_LABEL[kind];
      b.setAttribute('aria-pressed', String(kind === current));
      b.addEventListener('click', () => {
        category = kind;
        draw(kind);
        opts.onCategory(kind);
      });
      bar.appendChild(b);
    }
    content.appendChild(bar);

    const list = visible().filter((e) => e.kind === current);
    if (list.length === 0) {
      const p = document.createElement('p');
      p.textContent = tr('In dieser Kategorie gibt es gerade nichts.');
      content.appendChild(p);
    } else {
      const grid = document.createElement('div');
      grid.className = 'item-grid';
      const ctx = { coins: opts.getCoins(), shopOpen: opts.shopOpen };
      for (const entry of list) {
        const fresh = itemCard(entry, origin, ctx);
        let card = cards.get(entry.id);
        if (card) card.innerHTML = fresh.innerHTML;
        else {
          card = fresh;
          cards.set(entry.id, card);
          const c = card;
          c.addEventListener('click', () => openDetail(entry.id, c));
        }
        attachThumb(entry, card);
        grid.appendChild(card);
      }
      content.appendChild(grid);
    }
    if (focusKind) bar.querySelector<HTMLButtonElement>(`[data-kind="${focusKind}"]`)?.focus();
  }

  function openDetail(itemId: string, opener: HTMLButtonElement): void {
    const entry = book?.find((e) => e.id === itemId);
    if (!entry || detail?.isOpen) return;
    const handle = openItemDetail({
      entry,
      origin,
      opener,
      api: opts.api,
      getCoins: opts.getCoins,
      shopOpen: opts.shopOpen,
      buildOpen: opts.buildOpen,
      onCoins: opts.onCoins,
      onBuild: opts.onBuild,
      onShowSlot: opts.onShowSlot,
      onOpenInventory: opts.onOpenInventory,
      character: opts.character,
      onWardrobe: opts.onWardrobe,
      onChanged: () => {
        if (!closed) void load(false);
      },
      createPreview: opts.createPreview,
    });
    detail = handle;
  }

  async function load(showLoading: boolean): Promise<void> {
    const id = ++loadId;
    if (showLoading || error !== null) {
      error = null;
      book = null;
      draw();
    }
    let res: Awaited<ReturnType<ItemApi['loadBook']>>;
    try {
      res = await opts.api.loadBook();
    } catch (err) {
      console.error('loadBook failed', err);
      res = { ok: false, message: tr('Das hat nicht geklappt. Versuch es nochmal.') };
    }
    if (closed || id !== loadId) return;
    if (res.ok) {
      book = res.value;
      error = null;
    } else {
      error = res.message;
    }
    draw();
  }

  draw();
  void load(true);

  return {
    close() {
      if (closed) return;
      closed = true;
      session?.release();
      detail?.close();
      detail = null;
      area.remove();
    },
  };
}

/** The tutorial house (first-login tutorial, spec §4.7). */
export const TUTORIAL_HOUSE: ItemEntry = {
  id: 'house_fachwerk',
  kind: 'house',
  nameDe: tr('Fachwerkhaus'),
  price: 50,
  starter: false,
  owned: 0,
  placedIn: [],
  free: 0,
  fits: ['house'],
};

export interface TutorialBuyOptions {
  title: string;
  text: string;
  button: string;
  /** tutorial_buy_house; resolves the new coin value */
  buy: () => Promise<{ ok: true; value: { coins: number } } | { ok: false; message: string }>;
  onBought: (coins: number) => void;
  thumbs?: ThumbSource;
}

/**
 * Guided purchase of the tutorial house only: picture, name, price and one button. Non-modal (the
 * account menu stays usable) and without a close button; works when the shop is closed.
 */
export function openTutorialBuy(opts: TutorialBuyOptions): AreaHandle {
  const titleId = `area-title-${++counter}`;
  const area = document.createElement('section');
  area.className = 'overlay area tutorial-buy';
  area.setAttribute('role', 'region');
  area.setAttribute('aria-labelledby', titleId);
  const panel = document.createElement('div');
  panel.className = 'panel';
  const head = document.createElement('header');
  head.className = 'panel-head';
  const h2 = document.createElement('h2');
  h2.id = titleId;
  h2.textContent = opts.title;
  head.append(h2);
  const text = document.createElement('p');
  text.textContent = opts.text;
  const card = document.createElement('div');
  card.className = 'tutorial-buy-card';
  const thumb = document.createElement('span');
  thumb.className = 'item-thumb';
  thumb.setAttribute('aria-hidden', 'true');
  thumb.textContent = '🏠';
  const name = document.createElement('strong');
  name.className = 'item-name';
  name.textContent = TUTORIAL_HOUSE.nameDe;
  const price = document.createElement('span');
  price.className = 'item-price';
  price.textContent = msg`${TUTORIAL_HOUSE.price} Münzen`;
  card.append(thumb, name, price);
  const buy = document.createElement('button');
  buy.type = 'button';
  buy.className = 'primary tutorial-action';
  buy.textContent = opts.button;
  const status = document.createElement('p');
  status.className = 'status';
  status.setAttribute('role', 'status');
  panel.append(head, text, card, buy, status);
  area.appendChild(panel);
  document.body.appendChild(area);

  let closed = false;
  const session = opts.thumbs ? null : acquireSessionThumbs();
  const thumbs: ThumbSource = opts.thumbs ?? (session as NonNullable<typeof session>).source;
  void thumbs(TUTORIAL_HOUSE)
    .then((url) => {
      if (!url || closed) return;
      const img = document.createElement('img');
      img.className = 'item-thumb';
      img.src = url;
      img.alt = '';
      thumb.replaceWith(img);
    })
    .catch(() => undefined);

  let busy = false;
  buy.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    buy.disabled = true;
    status.textContent = tr('Wird gekauft …');
    let res: Awaited<ReturnType<TutorialBuyOptions['buy']>>;
    try {
      res = await opts.buy();
    } catch (err) {
      console.error('tutorial buy failed', err);
      res = { ok: false, message: tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.') };
    }
    busy = false;
    if (closed) return;
    buy.disabled = false;
    if (!res.ok) {
      status.textContent = res.message;
      return;
    }
    status.textContent = tr('Gekauft!');
    opts.onBought(res.value.coins);
  });
  buy.focus();

  return {
    close() {
      closed = true;
      session?.release();
      area.remove();
    },
  };
}
