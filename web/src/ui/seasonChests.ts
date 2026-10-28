/** Season chests in the inventory (plan §5.3, U2): count, open with a short reveal, duplicates. */
import { tr, msg, itemName as globalItemName } from '../i18n';
import { ITEM_NAMES } from '../i18n/itemNames';
import type { ChestResult, SeasonApi } from '../api/season';
import {
  RARITY,
  chestSvg,
  modelPicture,
  rarityOf,
  seasonPictures,
  type SeasonPictures,
} from './learnpass/rewardArt';
import { openInside, type InsideHandle } from './learnpass/insideModal';
import { cardById, collectionCatalog } from '../collection/catalog';
import { SEASON_CHEST_THUMB } from '../render/itemThumbs';
import { GLB_ITEMS } from '../render/glbItems';
import './seasonChests.css';

const SELL: Record<string, number> = { common: 15, rare: 40, epic: 100, legendary: 250 };

export interface SeasonChestRow {
  id: number;
  source: 'pass' | 'streak' | 'shop';
}

/** Display name of a season, scene or shop item: one name table for every view (review W6). */
export function itemName(id: string, fallback = ''): string {
  return globalItemName(id, ITEM_NAMES[id] ?? (fallback || id));
}

export interface SeasonChestOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  reducedMotion: boolean;
  onChanged?: () => void;
}

export type SeasonChestElement = HTMLElement & { dispose(): void };

export function createSeasonChests(opts: SeasonChestOptions): SeasonChestElement {
  const section = document.createElement('section') as SeasonChestElement;
  let closed = false;
  let opening = false;
  let inside: InsideHandle | null = null;
  let stopReveal: (() => void) | null = null;
  section.className = 'season-chests';
  if (opts.reducedMotion) section.classList.add('reduced-motion');
  const head = document.createElement('h3');
  const rows = document.createElement('div');
  rows.className = 'season-chest-rows';
  section.append(head, rows);

  let chests: SeasonChestRow[] = [];

  function render(): void {
    if (closed) return;
    head.innerHTML = '';
    head.append(tr('Season-Truhen'));
    if (chests.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'season-chest-count';
      badge.textContent = `×${chests.length}`;
      head.append(badge);
    }
    rows.innerHTML = '';
    if (chests.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'season-chest-empty';
      empty.textContent = tr('Keine Season-Truhe wartet.');
      rows.append(empty);
      return;
    }
    const row = document.createElement('div');
    row.className = 'season-chest-row';
    const icon = document.createElement('span');
    icon.className = 'season-chest-icon';
    icon.innerHTML = chestSvg(56);
    const text = document.createElement('span');
    text.className = 'season-chest-text';
    text.innerHTML = `<strong>${msg`Season-Truhe ×${chests.length}`}</strong><small>${tr('Aus Pass, Serie und Shop')}</small>`;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'season-chest-open';
    open.textContent = tr('Öffnen');
    open.addEventListener('click', () => {
      if (closed || opening) return;
      open.disabled = true;
      void openNext().finally(() => {
        if (!closed) open.disabled = false;
      });
    });
    row.append(icon, text, open);
    rows.append(row);
  }

  // The chances live in one place for pass, inventory and shop (plan §14.4).
  const insideLink = document.createElement('button');
  insideLink.type = 'button';
  insideLink.className = 'season-chest-inside';
  insideLink.textContent = tr('Was ist drin?');
  insideLink.addEventListener('click', () => {
    if (closed) return;
    inside?.close();
    const pictures = seasonPictures();
    const pool = opts.api.state().then((st) => opts.api.pool(st.season.id));
    inside = openInside(document.body, { pool, pictures, onClose: () => pictures.release() });
  });
  section.append(insideLink);

  async function openNext(): Promise<void> {
    const chest = chests[0];
    if (!chest || closed || opening) return;
    opening = true;
    try {
      const result = await opts.api.openChest(chest.id);
      if (closed) return;
      if (result.coins > 0) opts.onCoins(opts.getCoins() + result.coins);
      chests = chests.filter((c) => c.id !== chest.id);
      render();
      opts.onChanged?.();
      stopReveal?.();
      stopReveal = reveal(result, opts, section);
    } catch {
      // The RPC already refused; keep the list so the pupil can try again.
    } finally {
      opening = false;
    }
  }

  void opts.api
    .chests()
    .then((list) => {
      if (closed) return;
      chests = list;
      render();
    })
    .catch(() => render());

  section.dispose = () => {
    if (closed) return;
    closed = true;
    inside?.close();
    inside = null;
    stopReveal?.();
    stopReveal = null;
  };
  render();
  return section;
}

/**
 * Opening a chest (plan §14.5): the 3D chest shakes, then rays and border in the rarity colour, the
 * item picture (160 px), badge, name and what happened, and "Next". Without motion it shows at once.
 */
function reveal(result: ChestResult, opts: SeasonChestOptions, host: HTMLElement): () => void {
  let finished = false;
  let timer: number | undefined;
  const rarity = rarityOf(result.rarity);
  const pictures: SeasonPictures = seasonPictures();
  const overlay = document.createElement('div');
  overlay.className = 'season-reveal';
  const card = document.createElement('div');
  card.className = 'season-reveal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', tr('Ergebnis der Season-Truhe'));
  card.style.setProperty('--r', RARITY[rarity].color);

  const pic = document.createElement('div');
  pic.className = 'season-reveal-pic';
  pic.append(modelPicture(pictures, SEASON_CHEST_THUMB, 'deco', chestSvg(150)));
  const result_ = document.createElement('div');
  result_.className = 'season-reveal-result';
  result_.setAttribute('role', 'status');
  const badge = document.createElement('span');
  badge.className = 'season-reveal-rarity';
  badge.textContent = RARITY[rarity].label;
  const name = document.createElement('strong');
  name.className = 'season-reveal-name';
  name.textContent = itemName(result.item_id, result.name_de ?? '');
  const note = document.createElement('p');
  note.className = 'season-reveal-note';
  note.textContent =
    result.coins > 0
      ? msg`Schon vorhanden – ${result.coins} Münzen`
      : result.duplicate
        ? msg`Doppelt – verkaufen für ${SELL[rarity]} Münzen`
        : tr('Neu! Jetzt in deinem Inventar.');
  // The card bonus is additive; the village item above stays exactly as before.
  const cardNote = document.createElement('p');
  cardNote.className = 'season-reveal-card-note';
  cardNote.hidden = true;
  if (result.card) {
    cardNote.hidden = false;
    cardNote.textContent = tr('Neue Sammelkarte!');
    void collectionCatalog()
      .then((catalog) => {
        if (finished) return;
        const definition = cardById(catalog, result.card!.id);
        if (definition) cardNote.textContent = `${tr('Sammelkarte')}: ${definition.name}`;
      })
      .catch(() => {
        // The card name is decoration; the grant already happened on the server.
      });
  } else if (result.cardStatus === 'complete') {
    cardNote.hidden = false;
    cardNote.textContent = tr('Alle Truhenkarten sind schon gesammelt.');
  }
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'season-reveal-ok';
  ok.textContent = tr('Weiter');
  const finish = (): void => {
    if (finished) return;
    finished = true;
    if (timer !== undefined) window.clearTimeout(timer);
    overlay.remove();
    pictures.release();
  };
  ok.addEventListener('click', finish);
  result_.append(badge, name, note, cardNote, ok);
  card.append(pic, result_);
  overlay.append(card);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) finish();
  });
  host.append(overlay);

  const show = (): void => {
    if (finished) return;
    card.classList.add('revealed');
    pic.replaceChildren(modelPicture(pictures, result.item_id, GLB_ITEMS[result.item_id]?.kind ?? 'deco'));
    ok.focus();
  };
  if (opts.reducedMotion) {
    show();
  } else {
    pic.classList.add('shake');
    timer = window.setTimeout(show, 1000);
  }
  return finish;
}
