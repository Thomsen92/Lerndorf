/**
 * "What's inside?" dialog (plan §14.4): the chances and every chest item with its picture. The pool
 * comes from the database (items with a loot weight), never from a second list in the client, so
 * the shown rarities always match the roll (review B6). Opens from the LearnPass, the inventory and
 * the shop.
 */
import { tr, msg } from '../../i18n';
import type { PoolItem } from '../../api/season';
import { itemName } from '../seasonChests';
import { RARITY, modelPicture, type Rarity, type SeasonPictures } from './rewardArt';
import { openItem3dPreview, type Item3dPreviewHandle, type Item3dViewFactory } from '../item3dPreview';
import './insideModal.css';

/** Chances per rarity (plan E16), highest rarity first as in the dialog. */
export const ODDS: Array<{ rarity: Rarity; chance: number }> = [
  { rarity: 'legendary', chance: 3 },
  { rarity: 'epic', chance: 12 },
  { rarity: 'rare', chance: 30 },
  { rarity: 'common', chance: 55 },
];

export interface InsideHandle {
  el: HTMLElement;
  close(): void;
}

export interface InsideOptions {
  pool: Promise<PoolItem[]> | PoolItem[];
  pictures?: SeasonPictures | null;
  onClose?(): void;
  reducedMotion?: boolean;
  /** Test seam for the 3D view; the app uses WebGL. */
  createView?: Item3dViewFactory;
}

export function openInside(host: HTMLElement, opts: InsideOptions): InsideHandle {
  const overlay = document.createElement('div');
  overlay.className = 'inside-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'inside-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'inside-title');

  const head = document.createElement('header');
  head.className = 'inside-head';
  head.innerHTML = `<h2 id="inside-title">${tr('Was ist in einer Season-Truhe?')}</h2>`;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'inside-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', tr('Schließen'));
  head.append(closeBtn);

  const intro = document.createElement('p');
  intro.className = 'inside-intro';
  intro.textContent = tr(
    'Jede Truhe enthält genau einen Gegenstand. Pass-, Serien- und Shop-Truhen haben dieselben Chancen.',
  );

  const bands = document.createElement('div');
  bands.className = 'inside-bands';
  bands.setAttribute('aria-busy', 'true');

  dialog.append(head, intro, bands);
  overlay.append(dialog);
  host.append(overlay);

  void Promise.resolve(opts.pool)
    .then((pool) => {
      bands.removeAttribute('aria-busy');
      for (const odd of ODDS) {
        const items = pool.filter((p) => p.rarity === odd.rarity);
        const band = document.createElement('section');
        band.className = 'inside-band';
        band.style.setProperty('--r', RARITY[odd.rarity].color);
        const label = items.length === 1 ? tr('1 Gegenstand') : msg`${items.length} Gegenstände`;
        band.innerHTML = `<div class="inside-pct">${odd.chance} %<small>${RARITY[odd.rarity].label} · ${label}</small></div>`;
        const grid = document.createElement('div');
        grid.className = 'inside-items';
        for (const item of items) {
          // picture and name are one big button: tap opens the large 3D view (no hover, no tiny link)
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'inside-item';
          tile.setAttribute('aria-label', msg`${itemName(item.id)} in 3D ansehen`);
          const box = document.createElement('span');
          box.className = 'inside-box';
          box.append(modelPicture(opts.pictures ?? null, item.id, item.kind));
          const cap = document.createElement('span');
          cap.className = 'inside-name';
          cap.textContent = itemName(item.id);
          tile.append(box, cap);
          tile.addEventListener('click', () => showItem(item, tile));
          grid.append(tile);
        }
        band.append(grid);
        bands.append(band);
      }
    })
    .catch(() => {
      bands.removeAttribute('aria-busy');
      bands.textContent = tr('Die Gegenstände konnten nicht geladen werden.');
    });

  // One 3D view at a time inside the same dialog; the list keeps its scroll position underneath.
  let detail: Item3dPreviewHandle | null = null;
  function showItem(item: PoolItem, tile: HTMLButtonElement): void {
    detail?.close();
    const scroll = dialog.scrollTop;
    intro.hidden = true;
    bands.hidden = true;
    detail = openItem3dPreview(dialog, {
      item,
      reducedMotion: opts.reducedMotion,
      createView: opts.createView,
      onClose: () => {
        detail = null;
        if (!overlay.isConnected) return;
        intro.hidden = false;
        bands.hidden = false;
        dialog.scrollTop = scroll;
        tile.focus();
      },
    });
  }

  function closeFn(): void {
    if (!overlay.isConnected) return;
    detail?.close();
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    opts.onClose?.();
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      // the first Escape closes only the 3D view, the next one the list
      if (detail) detail.close();
      else closeFn();
    }
  }
  document.addEventListener('keydown', onKey, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeFn();
  });
  closeBtn.addEventListener('click', () => closeFn());
  closeBtn.focus();

  return {
    el: overlay,
    close: closeFn,
  };
}
