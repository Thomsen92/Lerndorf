import { html, tr, msg, getLocale } from '../i18n';
import { OLLIE_DESCRIPTIONS_DE } from '../i18n/ollieItemText';
/**
 * Item cards and the detail dialog shared by shop and inventory.
 * The card is a single button; the dialog shows a 3D preview, the purchase flow (own confirmation step,
 * one RPC at a time) and the inventory actions. While a purchase runs the dialog cannot be closed.
 */
import { KIND_LABEL, purchaseState, type ItemApi, type ItemEntry } from '../api/items';
import { type ItemPreview, type PreviewFactory } from '../render/itemPreview';
import { createShopItemPreview } from '../render/shopItemPreview';
import type { Sound } from './sound';
import './itemDetail.css';
import { THUMB_PLACEHOLDER, type ThumbSource } from '../render/itemThumbs';
import { slotById, type SlotId, type SlotKind } from '../world/plotPlan';
import { openModal, type ModalHandle } from './dialog';
import { esc } from './esc';
import type { SeasonApi } from '../api/season';
import { partById, partUrl, canWear } from '../avatars/catalog';
import type { CharacterKind } from '../render/character';

export type ItemOrigin = 'shop' | 'inventar';

/** Swaps the placeholder of a card's thumbnail for the picture. */
export function setCardThumb(card: HTMLElement, url: string): void {
  const thumb = card.querySelector('.item-thumb');
  if (!thumb) return;
  const img = document.createElement('img');
  img.className = 'item-thumb';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.src = url;
  thumb.replaceWith(img);
}

export function itemCard(
  e: ItemEntry,
  origin: ItemOrigin,
  ctx: { coins: number; shopOpen: boolean },
  thumbs?: ThumbSource,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'item-card';
  btn.dataset.item = e.id;
  const info =
    origin === 'shop'
      ? html`<span class="item-price">${e.price} Münzen</span>${(() => {
            const s = purchaseState(e, ctx.coins, ctx.shopOpen);
            return s.reason ? `<span class="item-reason">${esc(s.reason)}</span>` : '';
          })()}`
      : e.kind === 'avatar'
        ? html(`<span class="item-count">In deinem Inventar</span>`)
        : html`<span class="item-count">Besitz: ${e.owned} · aufgestellt: ${e.placedIn.length}</span>`;
  btn.innerHTML = `<span class="item-thumb" aria-hidden="true">${THUMB_PLACEHOLDER[e.kind]}</span><span class="item-name">${esc(e.nameDe)}</span><span class="item-kind">${esc(
    KIND_LABEL[e.kind],
  )}</span>${info}`;
  if (thumbs) {
    void thumbs(e)
      .then((url) => {
        if (url) setCardThumb(btn, url);
      })
      .catch(() => undefined);
  }
  return btn;
}

export interface DetailOptions {
  character?: CharacterKind;
  onWardrobe?: (itemId?: string) => void;
  entry: ItemEntry;
  origin: ItemOrigin;
  opener: HTMLElement;
  api: ItemApi;
  getCoins: () => number;
  shopOpen: boolean;
  buildOpen: boolean;
  onCoins: (coins: number) => void;
  onBuild: (itemId: string) => void;
  onShowSlot: (slotId: SlotId) => void;
  onOpenInventory: () => void;
  onChanged: () => void;
  createPreview?: PreviewFactory;
  reducedMotion?: boolean;
  /** Season items can be sold here (RPC sell_item). */
  season?: SeasonApi;
  sound?: Sound;
}

type Mode = 'detail' | 'confirm' | 'bought' | 'uncertain';

export function openItemDetail(opts: DetailOptions): ModalHandle {
  const { entry, origin } = opts;
  const factory = opts.createPreview ?? createShopItemPreview;
  const reducedMotion =
    opts.reducedMotion ??
    (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hasSlot = entry.fits.length > 0;

  let busy = false;
  let mode: Mode = 'detail';
  let preview: ItemPreview | null = null;

  const modal = openModal({
    title: entry.nameDe,
    opener: opts.opener,
    wide: true,
    canClose: () => !busy,
    onClose: () => {
      preview?.dispose();
      preview = null;
    },
  });
  modal.body.classList.add('item-detail-layout');
  modal.body.closest('.panel')?.classList.add('item-detail');

  const previewBox = document.createElement('div');
  previewBox.className = 'item-preview';
  const actions = document.createElement('div');
  actions.className = 'item-actions';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.className = 'status';
  const side = document.createElement('div');
  side.className = 'item-detail-side';
  side.append(actions, status);
  modal.body.append(previewBox, side);
  if (entry.description) {
    const description = document.createElement('p');
    description.className = 'item-description';
    description.textContent =
      getLocale() === 'de' ? (OLLIE_DESCRIPTIONS_DE[entry.id] ?? entry.description) : entry.description;
    side.insertBefore(description, actions);
  }

  const button = (label: string, onClick: () => void, cls = '', disabled = false): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    return b;
  };
  const note = (text: string): HTMLParagraphElement => {
    const p = document.createElement('p');
    p.className = 'notice-in';
    p.textContent = text;
    return p;
  };

  const focusIn = (el: HTMLElement | null | undefined): void => {
    if (el && modal.isOpen) el.focus();
  };
  const actionButton = (label?: string): HTMLButtonElement | null =>
    Array.from(actions.querySelectorAll('button')).find((b) => !label || b.textContent === label) ?? null;

  function setStatus(text: string, error = false): void {
    status.textContent = text;
    status.className = error ? 'status error' : 'status';
  }

  async function doSell(): Promise<void> {
    if (!opts.season || busy) return;
    busy = true;
    for (const b of actions.querySelectorAll('button')) b.disabled = true;
    try {
      const res = await opts.season.sell(entry.id, 1);
      if (!modal.isOpen) return;
      opts.onCoins(opts.getCoins() + res.coins);
      setStatus(msg`Verkauft für ${res.coins} Münzen.`);
      opts.onChanged();
      modal.close();
    } catch {
      if (!modal.isOpen) return;
      setStatus(tr('Verkaufen fehlgeschlagen.'), true);
      busy = false;
      renderActions();
    }
  }

  function renderPreview(): void {
    const avatarPart = partById(entry.id);
    if (avatarPart) {
      previewBox.replaceChildren();
      const img = document.createElement('img');
      img.src = partUrl(avatarPart, true);
      img.alt = entry.nameDe;
      img.style.cssText = 'width:100%;height:260px;object-fit:contain';
      previewBox.append(img);
      return;
    }
    preview?.dispose();
    preview = null;
    previewBox.replaceChildren();
    if (!hasSlot) {
      const p = document.createElement('p');
      p.className = 'preview-hint';
      p.textContent = tr('Vorschau gibt es mit dem Avatar-Editor.');
      previewBox.appendChild(p);
      return;
    }
    const showError = (): void => {
      if (!modal.isOpen) return;
      preview?.dispose();
      preview = null;
      previewBox.replaceChildren();
      const p = document.createElement('p');
      p.className = 'preview-hint';
      p.textContent = tr('Die Vorschau konnte nicht geladen werden.');
      const retry = button(tr('Nochmal versuchen'), () => {
        renderPreview();
        focusIn(actionButton());
      });
      previewBox.append(p, retry);
    };
    const canvas = document.createElement('canvas');
    canvas.className = 'item-preview-canvas';
    canvas.setAttribute('aria-label', `Vorschau: ${entry.nameDe}`);
    canvas.setAttribute('role', 'img');
    canvas.tabIndex = 0;
    previewBox.appendChild(canvas);
    const help = document.createElement('p');
    help.className = 'item-preview-help';
    help.textContent = tr('Mit dem Finger drehen, mit zwei Fingern zoomen.');
    previewBox.append(help);
    let p: ItemPreview | null = null;
    try {
      p = factory(canvas, { reducedMotion, onError: showError });
    } catch {
      p = null;
    }
    if (!p) {
      showError();
      return;
    }
    preview = p;
    if (p.reset) {
      const reset = button(tr('Ansicht zurücksetzen'), () => p?.reset?.());
      reset.className = 'item-preview-reset';
      previewBox.append(reset);
    }
    try {
      p.show(entry.kind as SlotKind, entry.id);
    } catch {
      showError();
    }
  }

  function renderActions(): void {
    actions.replaceChildren();
    const coins = opts.getCoins();
    if (mode === 'confirm') {
      const t = document.createElement('p');
      t.className = 'confirm-text';
      t.textContent = msg`Für ${entry.price} Münzen „${entry.nameDe}“ kaufen?`;
      actions.append(
        t,
        note(msg`Danach übrig: ${coins - entry.price} Münzen.`),
        button(tr('Abbrechen'), () => {
          if (busy) return;
          mode = 'detail';
          opts.sound?.play('shopCancel');
          setStatus('');
          renderActions();
          focusIn(actionButton());
        }),
        button(tr('Ja, kaufen'), () => void doBuy(), 'primary'),
      );
      return;
    }
    if (mode === 'uncertain') {
      actions.append(
        note(tr('Die Kaufantwort ist unklar. Prüfe zuerst dein Inventar, bevor du erneut kaufst.')),
        button(tr('Zum Inventar'), () => {
          modal.close();
          opts.onOpenInventory();
        }),
      );
      return;
    }
    if (mode === 'bought') {
      if (entry.kind === 'avatar' && partById(entry.id) && opts.onWardrobe) {
        actions.append(
          button(
            tr('Zum Kleiderschrank'),
            () => {
              modal.close();
              opts.onWardrobe!(entry.id);
            },
            'primary',
          ),
        );
        return;
      }
      actions.append(
        button(tr('Zum Inventar'), () => {
          modal.close();
          opts.onOpenInventory();
        }),
      );
      if (hasSlot && opts.buildOpen) {
        actions.append(
          button(
            tr('Jetzt aufstellen'),
            () => {
              modal.close();
              opts.onBuild(entry.id);
            },
            'primary',
          ),
        );
      }
      return;
    }
    if (origin === 'shop') {
      const s = purchaseState(entry, coins, opts.shopOpen);
      actions.append(
        button(
          msg`Kaufen für ${entry.price} Münzen`,
          () => {
            mode = 'confirm';
            opts.sound?.play('shopClick');
            setStatus('');
            renderActions();
            focusIn(actionButton(tr('Ja, kaufen')));
          },
          'primary',
          !s.canBuy,
        ),
      );
      if (s.reason) actions.append(note(s.reason));
      return;
    }
    // inventory
    if (entry.kind === 'avatar') {
      const part = partById(entry.id);
      if (part && opts.onWardrobe && (!opts.character || canWear(part, opts.character)))
        actions.append(
          button(
            tr('Anziehen'),
            () => {
              modal.close();
              opts.onWardrobe!(entry.id);
            },
            'primary',
          ),
        );
      else
        actions.append(
          note(
            part
              ? tr('Für deine andere Figur.')
              : tr('Für diesen Gegenstand ist noch kein tragbares Modell verfügbar.'),
          ),
        );
    }
    if (hasSlot) {
      const canBuild = opts.buildOpen && entry.free > 0;
      actions.append(
        button(
          tr('Aufstellen'),
          () => {
            modal.close();
            opts.onBuild(entry.id);
          },
          'primary',
          !canBuild,
        ),
      );
      if (!opts.buildOpen) actions.append(note(tr('Das Bauen ist gerade geschlossen.')));
      else if (entry.free === 0) actions.append(note(tr('Alles ist schon aufgestellt.')));
    }
    if (opts.season && entry.seasonItem && entry.free > 0) {
      actions.append(button(tr('Verkaufen'), () => void doSell()));
    }
    for (const id of entry.placedIn) {
      const slot = slotById(id);
      actions.append(
        button(msg`Zum Platz: ${slot?.nameDe ?? id}`, () => {
          modal.close();
          opts.onShowSlot(id);
        }),
      );
    }
  }

  async function doBuy(): Promise<void> {
    if (busy) return;
    busy = true;
    for (const b of actions.querySelectorAll('button')) b.disabled = true;
    setStatus(tr('Einen Moment …'));
    let res: Awaited<ReturnType<ItemApi['buy']>>;
    try {
      res = await opts.api.buy(entry.id);
    } catch (err) {
      console.error('buy failed', err);
      res = {
        ok: false,
        message: tr('Die Kaufantwort ist unklar. Prüfe zuerst dein Inventar, bevor du erneut kaufst.'),
        code: 'NETWORK_UNCERTAIN',
      };
    }
    busy = false;
    if (!modal.isOpen) return;
    if (res.ok) {
      mode = 'bought';
      opts.sound?.play('shopCoin');
      setStatus(msg`„${entry.nameDe}“ gekauft. Du hast jetzt ${res.value.coins} Münzen.`);
      if (entry.kind === 'deco') {
        status.textContent += ` ${msg`Besitz insgesamt: ${res.value.qty}.`}`;
      }
    } else {
      mode = res.code === 'NETWORK_UNCERTAIN' ? 'uncertain' : 'confirm';
      setStatus(res.message, true);
    }
    if (modal.isOpen) {
      renderActions();
      focusIn(actionButton(res.ok ? undefined : tr('Ja, kaufen')));
    }
    if (res.ok) {
      // callbacks last: a throwing callback must not leave the dialog stuck
      try {
        opts.onCoins(res.value.coins);
        opts.onChanged();
      } catch (err) {
        console.error('item purchase callback failed', err);
      }
    }
  }

  renderPreview();
  renderActions();
  return modal;
}
