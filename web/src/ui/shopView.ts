import { tr, msg } from '../i18n';
import type { SeasonApi } from '../api/season';
import { createSeasonChests } from './seasonChests';
import { createSeasonShopTile } from './seasonShop';
import { KIND_LABEL, KIND_ORDER, type ItemApi, type ItemEntry, type ItemKind } from '../api/items';
import { partById, canWear } from '../avatars/catalog';
import type { CharacterKind } from '../render/character';
import type { PreviewFactory } from '../render/itemPreview';
import { acquireSessionThumbs, type ThumbSource } from '../render/itemThumbs';
import type { SlotId } from '../world/plotPlan';
import type { AreaHandle } from './areas';
import type { ModalHandle } from './dialog';
import { itemCard, openItemDetail, setCardThumb, type ItemOrigin } from './itemDetail';
import { filterItemCatalog } from './itemCatalogFilter';
import { createOlliePanel } from './olliePanel';
import type { Sound } from './sound';
import type { OllieStoryApi } from '../api/ollieStory';
import type { ProgressDelta } from '../api/progress';
import { openOllieStory } from '../shopkeeper/storyView';
import './itemArea.css';

export interface ItemAreaOptions {
  character?: CharacterKind;
  onWardrobe?: (itemId?: string) => void;
  api: ItemApi;
  getCoins: () => number;
  onCoins: (c: number) => void;
  shopOpen: boolean;
  buildOpen: boolean;
  category: ItemKind | null;
  onCategory: (k: ItemKind | null) => void;
  onBuild: (itemId: string) => void;
  onShowSlot: (slot: SlotId) => void;
  onOpenInventory: () => void;
  onShop?: () => void;
  /** Owned by the signed-in player view and discarded on logout. Never persisted here. */
  savedIds?: Set<string>;
  sound?: Sound;
  story?: OllieStoryApi;
  onProgress?: (delta: ProgressDelta) => void;
  onRefreshProgress?: () => void;
  /** Only the visible close button calls this; external close() only disposes. */
  onClose: () => void;
  createPreview?: PreviewFactory;
  thumbs?: ThumbSource;
  season?: SeasonApi;
}

let counter = 0;
export function openShop(opts: ItemAreaOptions): AreaHandle {
  return openItemArea('shop', opts);
}

export function openItemArea(origin: ItemOrigin, opts: ItemAreaOptions): AreaHandle {
  const titleId = `area-title-${++counter}`;
  const area = document.createElement('section');
  area.className = 'overlay area item-area';
  area.dataset.origin = origin;
  area.setAttribute('role', 'region');
  area.setAttribute('aria-labelledby', titleId);
  const panel = document.createElement('div');
  panel.className = 'panel';
  const head = document.createElement('header');
  head.className = 'item-area-head';
  const brand = document.createElement('div');
  brand.className = 'item-area-brand';
  const brandName = document.createElement('strong');
  brandName.textContent = 'Ollie’s';
  const brandSmall = document.createElement('span');
  brandSmall.textContent = tr('DIES & DAS');
  brand.append(brandName, brandSmall);
  const nav = document.createElement('nav');
  nav.className = 'item-area-nav';
  nav.setAttribute('aria-label', tr('Shop und Inventar'));
  const ownedCount = document.createElement('span');
  ownedCount.className = 'item-area-owned-count';
  for (const [id, label] of [
    ['shop', tr('Shop')],
    ['inventar', tr('Inventar')],
  ] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.nav = id;
    button.textContent = label;
    if (id === origin) button.setAttribute('aria-current', 'page');
    else button.addEventListener('click', () => (id === 'shop' ? opts.onShop?.() : opts.onOpenInventory()));
    if (id === 'shop' && origin === 'inventar' && !opts.onShop) button.disabled = true;
    if (id === 'inventar') button.append(ownedCount);
    nav.append(button);
  }
  const coinsEl = document.createElement('span');
  coinsEl.className = 'coins item-area-wallet';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'item-area-close';
  closeBtn.textContent = tr('Schließen');
  closeBtn.addEventListener('click', () => {
    opts.sound?.play('shopCancel');
    opts.onClose();
  });
  head.append(brand, nav, coinsEl, closeBtn);
  const layout = document.createElement('div');
  layout.className = 'item-area-layout';
  const keeper = createOlliePanel(
    opts.sound,
    opts.story
      ? (opener) => {
          if (closed || story?.isOpen || detail?.isOpen) return;
          story = openOllieStory({
            api: opts.story!,
            opener,
            sound: opts.sound,
            onCoins,
            onProgress: (delta) => opts.onProgress?.(delta),
            onChanged: () => {
              if (!closed) {
                void load(false);
                opts.onRefreshProgress?.();
              }
            },
            onInventory: () => {
              if (!closed) opts.onOpenInventory();
            },
          });
        }
      : undefined,
  );
  const content = document.createElement('div');
  content.className = 'area-content item-area-catalog';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'item-area-eyebrow';
  eyebrow.textContent = origin === 'shop' ? tr('DEIN DORFLADEN') : tr('DEINE LIEBLINGSSTÜCKE');
  const h2 = document.createElement('h2');
  h2.id = titleId;
  h2.textContent = origin === 'shop' ? tr('Shop') : tr('Inventar');
  const subtitle = document.createElement('p');
  subtitle.className = 'item-area-subtitle';
  subtitle.textContent =
    origin === 'shop'
      ? tr('Kleine Dinge, die dein Dorf zu deinem Zuhause machen.')
      : tr('Alles, was dir gehört. Bereit für dein Dorf.');
  const filterHost = document.createElement('div');
  filterHost.className = 'item-area-filter';
  const searchRow = document.createElement('div');
  searchRow.className = 'item-area-search-row';
  const search = document.createElement('input');
  search.type = 'search';
  search.autocomplete = 'off';
  search.placeholder = tr('Finde etwas Schönes …');
  search.setAttribute('aria-label', tr('Gegenstände suchen'));
  const savedButton = document.createElement('button');
  savedButton.type = 'button';
  savedButton.dataset.filter = 'saved';
  savedButton.setAttribute('aria-pressed', 'false');
  savedButton.textContent = `♡ ${tr('Merkliste')}`;
  searchRow.append(search, savedButton);
  const bar = document.createElement('div');
  bar.className = 'category-bar';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', tr('Kategorien'));
  filterHost.append(searchRow, bar);
  // These hosts remain siblings: drawing the catalogue never detaches season controls.
  const seasonHost = document.createElement('div');
  seasonHost.className = 'item-area-season';
  const statusHost = document.createElement('div');
  statusHost.className = 'item-area-status';
  statusHost.setAttribute('role', 'status');
  statusHost.setAttribute('aria-live', 'polite');
  const gridHost = document.createElement('div');
  gridHost.className = 'item-grid';
  gridHost.setAttribute('aria-label', tr('Gegenstände'));
  content.append(eyebrow, h2, subtitle, filterHost, seasonHost, statusHost, gridHost);
  layout.append(keeper.element, content);
  panel.append(head, layout);
  area.append(panel);
  document.body.append(area);

  let closed = false;
  let book: ItemEntry[] | null = null;
  let error: string | null = null;
  let category: ItemKind | null = opts.category;
  let savedOnly = false;
  const savedIds = opts.savedIds ?? new Set<string>();
  let detail: ModalHandle | null = null;
  let story: ModalHandle | null = null;
  let loadId = 0;
  const cards = new Map<string, HTMLButtonElement>();
  const session = opts.thumbs ? null : acquireSessionThumbs();
  const thumbs: ThumbSource = opts.thumbs ?? session!.source;
  const urls = new Map<string, string | null>();
  const pending = new Set<string>();
  const onCoins = (coins: number): void => {
    if (!closed) {
      opts.onCoins(coins);
      coinsEl.textContent = msg`${opts.getCoins()} Münzen`;
    }
  };
  const season = opts.season
    ? origin === 'shop'
      ? createSeasonShopTile({ api: opts.season, getCoins: opts.getCoins, onCoins, shopOpen: opts.shopOpen })
      : createSeasonChests({
          api: opts.season,
          getCoins: opts.getCoins,
          onCoins,
          onChanged: () => {
            if (!closed) void load(false);
          },
          reducedMotion:
            typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
        })
    : null;
  if (season) seasonHost.append(season);

  const thumbObserver =
    !opts.thumbs && typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (observations) => {
            if (closed) return;
            for (const observation of observations) {
              if (!observation.isIntersecting) continue;
              const card = observation.target as HTMLButtonElement;
              const entry = book?.find((item) => item.id === card.dataset.item);
              thumbObserver?.unobserve(card);
              if (entry) requestThumb(entry, card);
            }
          },
          { rootMargin: '180px' },
        )
      : null;

  function attachThumb(entry: ItemEntry, card: HTMLButtonElement): void {
    const known = urls.get(entry.id);
    if (known) setCardThumb(card, known);
    if (urls.has(entry.id) || pending.has(entry.id)) return;
    if (thumbObserver) thumbObserver.observe(card);
    else requestThumb(entry, card);
  }

  function requestThumb(entry: ItemEntry, card: HTMLButtonElement): void {
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
        const current = cards.get(entry.id);
        if (url && current) setCardThumb(current, url);
      });
  }

  const entries = (): ItemEntry[] =>
    (book ?? []).filter(
      (entry) =>
        origin !== 'shop' ||
        entry.kind !== 'avatar' ||
        !opts.character ||
        canWear(partById(entry.id), opts.character),
    );
  const filtered = (all = false): ItemEntry[] =>
    filterItemCatalog(entries(), {
      origin,
      category: all ? null : category,
      query: all ? '' : search.value,
      savedOnly: all ? false : savedOnly,
      savedIds,
    });

  function drawCategories(): void {
    bar.replaceChildren();
    const kinds =
      origin === 'shop'
        ? KIND_ORDER
        : KIND_ORDER.filter((kind) => filtered(true).some((entry) => entry.kind === kind));
    if (book !== null && !error && origin === 'inventar' && kinds.length === 0) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    for (const kind of [null, ...kinds]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.kind = kind ?? 'all';
      button.textContent = kind === null ? tr('Alle Gegenstände') : KIND_LABEL[kind];
      button.setAttribute('aria-pressed', String(kind === category));
      button.addEventListener('click', () => {
        category = kind;
        opts.sound?.play('shopPage');
        draw();
        opts.onCategory(kind);
        bar.querySelector<HTMLButtonElement>(`[data-kind="${kind ?? 'all'}"]`)?.focus();
      });
      bar.append(button);
    }
  }

  function draw(): void {
    if (closed) return;
    coinsEl.textContent = msg`${opts.getCoins()} Münzen`;
    statusHost.replaceChildren();
    thumbObserver?.disconnect();
    gridHost.replaceChildren();
    savedButton.setAttribute('aria-pressed', String(savedOnly));
    drawCategories();
    ownedCount.textContent = book ? String(book.filter((e) => e.owned > 0).length) : '…';
    ownedCount.setAttribute('aria-label', tr('Verschiedene eigene Gegenstandsarten'));
    if (error !== null) {
      const message = document.createElement('p');
      message.className = 'error';
      message.textContent = error;
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = tr('Nochmal versuchen');
      retry.addEventListener('click', () => void load(true));
      statusHost.append(message, retry);
      return;
    }
    if (book === null) {
      statusHost.textContent = tr('Lädt …');
      return;
    }
    if (origin === 'shop' && !opts.shopOpen) {
      const notice = document.createElement('p');
      notice.className = 'notice-in';
      notice.textContent = tr('Der Shop ist gerade geschlossen.');
      statusHost.append(notice);
    }
    const list = filtered();
    const count = document.createElement('p');
    count.className = 'item-area-results';
    count.textContent = msg`${list.length} Gegenstandsarten`;
    statusHost.append(count);
    if (!list.length) {
      const empty = document.createElement('p');
      empty.className = 'item-area-empty';
      empty.textContent =
        origin === 'inventar' && !filtered(true).length
          ? tr('Du hast noch keine eigenen Sachen. Im Shop kannst du welche kaufen.')
          : savedOnly
            ? tr('Hier ist noch nichts auf deiner Merkliste. Tippe auf ein Herz, um etwas zu merken.')
            : search.value.trim()
              ? tr('Keine Treffer. Versuche einen anderen Suchbegriff.')
              : tr('In dieser Kategorie gibt es gerade nichts.');
      statusHost.append(empty);
      if (search.value || savedOnly || category !== null) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.textContent = tr('Alle Gegenstände zeigen');
        clear.addEventListener('click', () => {
          search.value = '';
          savedOnly = false;
          category = null;
          opts.onCategory(null);
          draw();
          search.focus();
        });
        statusHost.append(clear);
      }
      return;
    }
    const ctx = { coins: opts.getCoins(), shopOpen: opts.shopOpen };
    for (const entry of list) {
      const fresh = itemCard(entry, origin, ctx);
      let card = cards.get(entry.id);
      if (card) card.innerHTML = fresh.innerHTML;
      else {
        card = fresh;
        cards.set(entry.id, card);
        const opener = card;
        card.addEventListener('click', () => openDetail(entry.id, opener));
      }
      if (origin === 'inventar') {
        const count = card.querySelector('.item-count');
        if (count)
          count.textContent =
            entry.kind === 'avatar'
              ? opts.character && !canWear(partById(entry.id), opts.character)
                ? tr('Für eine andere Figur')
                : tr('In deinem Inventar')
              : msg`Besitz: ${entry.owned} · aufgestellt: ${entry.placedIn.length} · frei: ${entry.free}`;
      } else if (entry.owned > 0) {
        const owned = document.createElement('span');
        owned.className = 'item-owned';
        owned.textContent = msg`Besitz: ${entry.owned}`;
        card.append(owned);
      }
      const tile = document.createElement('article');
      tile.className = 'item-area-tile';
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'item-area-save';
      save.dataset.save = entry.id;
      save.textContent = savedIds.has(entry.id) ? '♥' : '♡';
      save.setAttribute('aria-pressed', String(savedIds.has(entry.id)));
      save.setAttribute('aria-label', msg`${entry.nameDe} merken`);
      save.addEventListener('click', () => {
        if (savedIds.has(entry.id)) savedIds.delete(entry.id);
        else savedIds.add(entry.id);
        opts.sound?.play('shopSave');
        draw();
        area.querySelector<HTMLButtonElement>(`[data-save="${CSS.escape(entry.id)}"]`)?.focus();
      });
      attachThumb(entry, card);
      tile.append(card, save);
      gridHost.append(tile);
    }
  }
  search.addEventListener('input', draw);
  savedButton.addEventListener('click', () => {
    savedOnly = !savedOnly;
    opts.sound?.play('shopClick');
    draw();
  });

  function openDetail(itemId: string, opener: HTMLButtonElement): void {
    const entry = book?.find((e) => e.id === itemId);
    if (!entry || closed || detail?.isOpen) return;
    detail = openItemDetail({
      entry,
      origin,
      opener,
      api: opts.api,
      getCoins: opts.getCoins,
      shopOpen: opts.shopOpen,
      buildOpen: opts.buildOpen,
      onCoins,
      onBuild: opts.onBuild,
      onShowSlot: opts.onShowSlot,
      onOpenInventory: opts.onOpenInventory,
      character: opts.character,
      onWardrobe: opts.onWardrobe,
      season: opts.season,
      sound: opts.sound,
      onChanged: () => {
        if (!closed) {
          if (origin === 'shop') keeper.bought();
          void load(false);
        }
      },
      createPreview: opts.createPreview,
    });
  }

  async function load(showLoading: boolean): Promise<void> {
    const id = ++loadId;
    if (showLoading || error !== null) {
      error = null;
      book = null;
      draw();
    }
    let result: Awaited<ReturnType<ItemApi['loadBook']>>;
    try {
      result = await opts.api.loadBook();
    } catch {
      result = { ok: false, message: tr('Das hat nicht geklappt. Versuch es nochmal.') };
    }
    if (closed || id !== loadId) return;
    if (result.ok) {
      book = result.value;
      error = null;
    } else error = result.message;
    draw();
  }
  draw();
  void load(true);
  return {
    close() {
      if (closed) return;
      closed = true;
      ++loadId;
      thumbObserver?.disconnect();
      keeper.close();
      story?.close();
      story = null;
      season?.dispose();
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
