// The Midnight Collection: cover, card almanach, achievements placeholder and 3D detail
// (plan package 6). Ownership is read-only from the server; the view never grants anything.
import { tr, msg } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import type { CollectionApi } from '../api/collection';
import type { CardDefinition, CollectionCatalog } from './types';
import { openCardPreview } from './cardPreview';
import { catalogAssetUrl } from './catalog';
import './collectionView.css';

export interface CollectionViewOptions {
  api: CollectionApi;
  seasonId: string;
  catalog: CollectionCatalog;
  opener?: HTMLElement | null;
  reducedMotion: boolean;
  onClose?: () => void;
}

export interface CollectionView {
  close(): void;
  readonly isOpen: boolean;
}

type Filter = 'all' | 'normal' | 'rare' | 'epic' | 'legendary' | 'curses';

export function openCollection(opts: CollectionViewOptions): CollectionView {
  const modal: ModalHandle = openModal({
    title: tr('The Midnight Collection'),
    opener: opts.opener,
    wide: true,
    onClose: opts.onClose,
  });
  modal.body.classList.add('collection-view');
  const head = document.createElement('div');
  head.className = 'collection-toolbar';
  const content = document.createElement('div');
  content.className = 'collection-content';
  modal.body.append(head, content);

  const owned = new Set<string>();
  let filter: Filter = 'all';
  let search = '';
  let page: 'cover' | 'cards' | 'achievements' | 'detail' = 'cover';
  let detail: CardDefinition | null = null;
  let searchInput: HTMLInputElement | null = null;

  function setPage(next: typeof page, card?: CardDefinition): void {
    page = next;
    if (card) detail = card;
    render();
    content.scrollTop = 0;
  }

  function render(): void {
    head.replaceChildren();
    content.replaceChildren();
    if (page !== 'cover') {
      const back = button(tr('← Almanach'), () => setPage('cards'), 'collection-back');
      head.append(back);
    }
    if (page === 'cover') renderCover();
    else if (page === 'cards') renderCards();
    else if (page === 'achievements') renderAchievements();
    else if (detail) renderDetail(detail);
    else renderCards();
  }

  function renderCover(): void {
    const cover = document.createElement('div');
    cover.className = 'collection-cover';
    const image = document.createElement('img');
    image.className = 'collection-cover-image';
    image.src = catalogAssetUrl(opts.catalog.almanacCover.front);
    image.alt = tr('Umschlag des Halloween-Almanachs');
    image.loading = 'lazy';
    const info = document.createElement('div');
    info.className = 'collection-cover-info';
    const h = document.createElement('h3');
    h.textContent = opts.catalog.name;
    const p = document.createElement('p');
    p.textContent = msg`${opts.catalog.cards.length} Karten · ${owned.size} in deiner Sammlung`;
    const open = button(tr('Almanach öffnen'), () => setPage('cards'), 'primary collection-open');
    const legendary = opts.catalog.cards.find((card) => card.id === opts.catalog.almanacCover.cardId);
    const legendaryButton = button(tr('Legendary-Karte ansehen'), () => {
      if (legendary) setPage('detail', legendary);
    });
    info.append(h, p, open, legendaryButton);
    const tabs = document.createElement('div');
    tabs.className = 'collection-tabs';
    const cardsTab = button(tr('Karten'), () => setPage('cards'));
    const achievements = button(tr('Erfolge'), () => setPage('achievements'));
    tabs.append(cardsTab, achievements);
    info.append(tabs);
    cover.append(image, info);
    content.append(cover);
  }

  function renderCards(): void {
    const tools = document.createElement('div');
    tools.className = 'collection-tools';
    searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = tr('Karte suchen');
    searchInput.setAttribute('aria-label', tr('Karte suchen'));
    searchInput.value = search;
    searchInput.addEventListener('input', () => {
      search = searchInput?.value ?? '';
      renderGrid(grid);
    });
    const filters = document.createElement('div');
    filters.className = 'collection-filters';
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', tr('Nach Seltenheit filtern'));
    const labels: Array<[Filter, string]> = [
      ['all', tr('Alle')],
      ['normal', tr('Normal')],
      ['rare', tr('Selten')],
      ['epic', tr('Episch')],
      ['legendary', tr('Legendär')],
      ['curses', tr('Classroom Curses')],
    ];
    for (const [value, label] of labels) {
      const chip = button(
        label,
        () => {
          filter = value;
          filters.querySelectorAll('button').forEach((el) => {
            el.setAttribute('aria-pressed', String(el === chip));
          });
          renderGrid(grid);
        },
        'collection-chip',
      );
      chip.setAttribute('aria-pressed', String(filter === value));
      filters.append(chip);
    }
    tools.append(searchInput, filters);
    const grid = document.createElement('div');
    grid.className = 'collection-grid';
    grid.setAttribute('role', 'list');
    content.append(tools, grid);
    renderGrid(grid);
  }

  function visibleCards(): CardDefinition[] {
    const query = search.trim().toLowerCase();
    return opts.catalog.cards.filter((card) => {
      if (filter === 'curses' && card.series !== 'classroom-curses') return false;
      if (filter !== 'all' && filter !== 'curses' && card.rarity !== filter) return false;
      if (!query) return true;
      return [card.name, card.topic, card.key, card.example].some((text) =>
        text.toLowerCase().includes(query),
      );
    });
  }

  function renderGrid(grid: HTMLElement): void {
    grid.replaceChildren();
    const cards = visibleCards();
    for (const card of cards) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'collection-card';
      item.dataset.cardId = card.id;
      item.setAttribute('role', 'listitem');
      const img = document.createElement('img');
      img.className = 'collection-card-thumb';
      img.src = catalogAssetUrl(card.thumbnail);
      img.alt = '';
      img.loading = 'lazy';
      const name = document.createElement('span');
      name.className = 'collection-card-name';
      name.textContent = card.name;
      const meta = document.createElement('span');
      meta.className = 'collection-card-meta';
      meta.textContent = `${rarityLabel(card.rarity)} · ${card.topic}`;
      item.append(img, name, meta);
      if (owned.has(card.id)) {
        const badge = document.createElement('span');
        badge.className = 'collection-owned';
        badge.textContent = tr('In deiner Sammlung');
        item.append(badge);
      }
      item.addEventListener('click', () => setPage('detail', card));
      grid.append(item);
    }
    if (!cards.length) {
      const empty = document.createElement('p');
      empty.className = 'collection-empty';
      empty.textContent = tr('Keine Karte passt zu deiner Suche.');
      grid.append(empty);
    }
  }

  function renderDetail(card: CardDefinition): void {
    const wrap = document.createElement('article');
    wrap.className = 'collection-detail';
    const top = document.createElement('div');
    top.className = 'collection-detail-top';
    const img = document.createElement('img');
    img.className = 'collection-detail-cover';
    img.src = catalogAssetUrl(card.thumbnail);
    img.alt = '';
    const info = document.createElement('div');
    const h = document.createElement('h3');
    h.textContent = card.name;
    const meta = document.createElement('p');
    meta.className = 'collection-card-meta';
    meta.textContent = `${rarityLabel(card.rarity)} · ${card.topic}`;
    const key = document.createElement('p');
    key.className = 'collection-detail-key';
    key.textContent = card.key;
    const example = document.createElement('p');
    example.textContent = card.example;
    const open3d = button(
      tr('In 3D ansehen'),
      () => {
        openCardPreview({
          card,
          opener: open3d,
          reducedMotion: opts.reducedMotion,
          resolve: (path) => catalogAssetUrl(path),
        });
      },
      'primary',
    );
    info.append(h, meta, key, example);
    if (owned.has(card.id)) {
      const own = document.createElement('p');
      own.className = 'collection-owned-text';
      own.textContent = tr('In deiner Sammlung');
      info.append(own);
    }
    info.append(open3d);
    top.append(img, info);

    const notes = document.createElement('ul');
    notes.className = 'collection-detail-notes';
    for (const note of card.notes) {
      const li = document.createElement('li');
      li.textContent = note;
      notes.append(li);
    }
    wrap.append(top, notes);
    if (card.tip) {
      const tip = document.createElement('p');
      tip.className = 'collection-detail-tip';
      tip.textContent = card.tip;
      wrap.append(tip);
    }
    if (card.description) {
      const description = document.createElement('p');
      description.textContent = card.description;
      wrap.append(description);
    }
    if (card.effects?.length) {
      const title = document.createElement('p');
      title.className = 'collection-detail-label';
      title.textContent = tr('Imaginary effect');
      const effects = document.createElement('ul');
      for (const effect of card.effects) {
        const li = document.createElement('li');
        li.textContent = effect;
        effects.append(li);
      }
      wrap.append(title, effects);
    }
    if (card.flavour) {
      const flavour = document.createElement('p');
      flavour.className = 'collection-detail-flavour';
      flavour.textContent = card.flavour;
      wrap.append(flavour);
    }
    if (card.source) {
      const source = document.createElement('p');
      source.className = 'collection-source';
      source.textContent = `${card.source.work} · ${card.source.author} · ${card.source.publisher}`;
      const link = document.createElement('a');
      link.href = card.source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = tr('Quelle öffnen');
      source.append(' ', link);
      wrap.append(source);
    }
    if (card.reference) {
      const reference = document.createElement('p');
      reference.className = 'collection-source';
      reference.textContent = `${card.reference.work} · ${card.reference.publisher} · ${card.reference.page}`;
      wrap.append(reference);
    }
    content.append(wrap);
  }

  function renderAchievements(): void {
    const box = document.createElement('div');
    box.className = 'collection-achievements';
    const h = document.createElement('h3');
    h.textContent = tr('Erfolge');
    const p = document.createElement('p');
    p.textContent = tr(
      'Erfolge sind noch ein Platzhalter. Rahmen und Titel sind Vorschauen, keine freigeschalteten Erfolge.',
    );
    box.append(h, p);
    content.append(box);
  }

  render();
  void opts.api
    .my(opts.seasonId)
    .then((state) => {
      if (!modal.isOpen) return;
      state.cards.forEach((card) => owned.add(card.cardId));
      render();
    })
    .catch(() => {
      // The almanach stays readable without ownership; no fake badges.
    });

  return {
    close: () => modal.close(),
    get isOpen() {
      return modal.isOpen;
    },
  };
}

function button(label: string, action: () => void, className = ''): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  if (className) el.className = className;
  el.addEventListener('click', action);
  return el;
}

function rarityLabel(rarity: CardDefinition['rarity']): string {
  if (rarity === 'normal') return tr('Normal');
  if (rarity === 'rare') return tr('Selten');
  if (rarity === 'epic') return tr('Episch');
  return tr('Legendär');
}
