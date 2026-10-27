/**
 * Tier-40 pick (plan E7, §14.5): all 28 chest items with picture and rarity border, an "owned"
 * badge, a hint when the pick pays coins instead, and a confirmation step before the RPC runs.
 */
import { tr, msg } from '../../i18n';
import type { PoolItem } from '../../api/season';
import { itemName } from '../seasonChests';
import { ODDS } from './insideModal';
import { RARITY, modelPicture, type SeasonPictures } from './rewardArt';
import './insideModal.css';

export interface PickOptions {
  pool: Promise<PoolItem[]> | PoolItem[];
  owned: Promise<Set<string>> | Set<string>;
  pictures?: SeasonPictures | null;
  /** Runs choose_season_item; resolves when the server confirmed the pick. */
  onPick(itemId: string): Promise<void>;
  onClose?(): void;
}

export function openSeasonPick(host: HTMLElement, opts: PickOptions): { el: HTMLElement; close(): void } {
  const overlay = document.createElement('div');
  overlay.className = 'inside-overlay';
  const dialog = document.createElement('div');
  dialog.className = 'inside-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'pick-title');
  const head = document.createElement('header');
  head.className = 'inside-head';
  head.innerHTML = `<h2 id="pick-title">${tr('Such dir einen Season-Gegenstand aus')}</h2>`;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'inside-close';
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', tr('Schließen'));
  head.append(closeBtn);

  const grid = document.createElement('div');
  grid.className = 'pick-grid';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', tr('Season-Gegenstände'));
  const note = document.createElement('p');
  note.className = 'pick-note';
  note.setAttribute('role', 'status');
  const actions = document.createElement('div');
  actions.className = 'pick-actions';
  const confirm = document.createElement('button');
  confirm.type = 'button';
  confirm.className = 'pick-confirm';
  confirm.textContent = tr('Diesen nehmen');
  confirm.disabled = true;
  actions.append(confirm);

  dialog.append(head, grid, note, actions);
  overlay.append(dialog);
  host.append(overlay);

  let selected: PoolItem | null = null;
  let owned = new Set<string>();
  let asking = false;

  function describe(item: PoolItem): string {
    return owned.has(item.id)
      ? msg`Du hast ${itemName(item.id)} schon. Dafür bekommst du ${item.sell} Münzen.`
      : msg`${itemName(item.id)} kommt in dein Inventar.`;
  }

  void Promise.all([Promise.resolve(opts.pool), Promise.resolve(opts.owned)]).then(([pool, have]) => {
    owned = have;
    const order = ODDS.map((o) => o.rarity);
    for (const item of [...pool].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))) {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--r', RARITY[item.rarity].color);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', `${itemName(item.id)}, ${RARITY[item.rarity].label}${owned.has(item.id) ? `, ${tr('schon im Besitz')}` : ''}`);
      if (owned.has(item.id)) {
        b.classList.add('owned');
        b.dataset.owned = tr('schon da');
      }
      b.append(modelPicture(opts.pictures ?? null, item.id, item.kind));
      b.addEventListener('click', () => {
        selected = item;
        asking = false;
        confirm.textContent = tr('Diesen nehmen');
        for (const other of grid.querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === b));
        note.textContent = describe(item);
        confirm.disabled = false;
      });
      grid.append(b);
    }
  });

  confirm.addEventListener('click', () => {
    if (!selected || confirm.disabled) return;
    // Second tap confirms: the pick can only be made once (E7).
    if (!asking) {
      asking = true;
      confirm.textContent = msg`Sicher? ${itemName(selected.id)} nehmen`;
      return;
    }
    confirm.disabled = true;
    opts
      .onPick(selected.id)
      .then(() => closeFn())
      .catch(() => {
        confirm.disabled = false;
        asking = false;
        confirm.textContent = tr('Diesen nehmen');
        note.textContent = tr('Das hat nicht geklappt. Versuch es noch einmal.');
      });
  });

  function closeFn(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    opts.onClose?.();
  }
  function onKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeFn();
    }
  }
  document.addEventListener('keydown', onKey, true);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeFn();
  });
  closeBtn.addEventListener('click', () => closeFn());
  closeBtn.focus();
  return { el: overlay, close: closeFn };
}
