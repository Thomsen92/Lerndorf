// "My Almanac": the Midnight Collection as a big book of its own (teacher, 28.10.2026).
// The book opens, its chapters are the four rarities, discovered cards can be read and turned in 3D,
// undiscovered cards stay a dark mystery that cannot be opened. Ownership is read-only from the
// server; the view never grants anything. While it is open the village does not render (the caller
// tracks the handle like every modal), so the book costs almost nothing.
import { tr, msg } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import type { CollectionApi } from '../api/collection';
import type { CardDefinition, CardRarity, CollectionCatalog } from './types';
import { openCardPreview } from './cardPreview';
import { catalogAssetUrl } from './catalog';
import '../season/spookyFont.css';
import './collectionView.css';
import './almanac.css';

export interface CollectionViewOptions {
  api: CollectionApi;
  seasonId: string;
  catalog: CollectionCatalog;
  opener?: HTMLElement | null;
  reducedMotion: boolean;
  onClose?: () => void;
  /** Shows this card's page first (a card that was just drawn). */
  focusCardId?: string;
}

export interface CollectionView {
  close(): void;
  readonly isOpen: boolean;
}

/** The chapters of the book, from the most common to the one legendary card. */
export const ALMANAC_CHAPTERS: readonly CardRarity[] = ['normal', 'rare', 'epic', 'legendary'];
/** Cards on one book page (3 x 3). */
export const CARDS_PER_PAGE = 9;

type Page =
  | { kind: 'intro' }
  | {
      kind: 'cards';
      rarity: CardRarity;
      cards: CardDefinition[];
      first: boolean;
      part: number;
      parts: number;
    };

const OPEN_MS = 900;
const TURN_MS = 360;

export function openCollection(opts: CollectionViewOptions): CollectionView {
  const modal: ModalHandle = openModal({
    title: tr('Mein Almanach'),
    opener: opts.opener,
    wide: true,
    onClose: () => {
      closed = true;
      clearTimeout(timer);
      opts.onClose?.();
    },
  });
  modal.body.closest('.overlay')?.classList.add('almanac-overlay');
  modal.body.classList.add('almanac');

  const owned = new Set<string>();
  let loaded: 'loading' | 'ok' | 'failed' = 'loading';
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let spread = 0; // index of the first visible page
  let detail: CardDefinition | null = null;
  /** The chapter whose ribbon is lit: the one jumped to, else the first chapter on screen. */
  let activeRarity: CardRarity | null = null;
  const narrow = (): boolean => (modal.body.clientWidth || window.innerWidth) < 720;

  const pages: Page[] = [{ kind: 'intro' }];
  for (const rarity of ALMANAC_CHAPTERS) {
    const cards = opts.catalog.cards
      .filter((card) => card.rarity === rarity)
      .sort((a, b) => a.number - b.number);
    const parts = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
    for (let part = 0; part < parts; part++)
      pages.push({
        kind: 'cards',
        rarity,
        cards: cards.slice(part * CARDS_PER_PAGE, (part + 1) * CARDS_PER_PAGE),
        first: part === 0,
        part,
        parts,
      });
  }

  const ribbons = document.createElement('nav');
  ribbons.className = 'almanac-ribbons';
  ribbons.setAttribute('aria-label', tr('Kapitel'));
  const stage = document.createElement('div');
  stage.className = 'almanac-stage';
  const book = document.createElement('div');
  book.className = 'almanac-book';
  const left = document.createElement('section');
  left.className = 'almanac-page left';
  const right = document.createElement('section');
  right.className = 'almanac-page right';
  const cover = document.createElement('div');
  cover.className = 'almanac-cover';
  const coverImage = document.createElement('img');
  coverImage.src = `${import.meta.env.BASE_URL}assets/halloween/almanac-cover.webp`;
  coverImage.alt = '';
  cover.append(coverImage);
  book.append(left, right, cover);
  stage.append(book);
  const footer = document.createElement('div');
  footer.className = 'almanac-footer';
  const prev = button('‹', () => turn(-1), 'almanac-turn');
  prev.setAttribute('aria-label', tr('Vorherige Seite'));
  const next = button('›', () => turn(1), 'almanac-turn');
  next.setAttribute('aria-label', tr('Nächste Seite'));
  const where = document.createElement('p');
  where.className = 'almanac-where';
  where.setAttribute('aria-live', 'polite');
  footer.append(prev, where, next);
  modal.body.append(ribbons, stage, footer);

  // the book opens: the cover swings away from the spine
  if (opts.reducedMotion) cover.remove();
  else {
    book.classList.add('opening');
    timer = setTimeout(() => {
      book.classList.remove('opening');
      cover.remove();
    }, OPEN_MS);
  }

  const step = (): number => (narrow() ? 1 : 2);
  const align = (index: number): number => (narrow() ? index : index - (index % 2));

  function turn(direction: 1 | -1): void {
    if (detail) {
      detail = null;
      render();
      return;
    }
    const target = align(spread + direction * step());
    if (target < 0 || target >= pages.length) return;
    spread = target;
    activeRarity = null;
    flip(direction);
  }

  function flip(direction: 1 | -1): void {
    if (opts.reducedMotion) return render();
    book.classList.remove('turn-next', 'turn-prev');
    void book.offsetWidth; // restart the animation
    book.classList.add(direction > 0 ? 'turn-next' : 'turn-prev');
    render();
    clearTimeout(timer);
    timer = setTimeout(() => book.classList.remove('turn-next', 'turn-prev'), TURN_MS);
  }

  function jump(rarity: CardRarity): void {
    const index = pages.findIndex((page) => page.kind === 'cards' && page.rarity === rarity && page.first);
    if (index < 0) return;
    const target = align(index);
    const direction = target >= spread ? 1 : -1;
    detail = null;
    spread = target;
    activeRarity = rarity;
    flip(direction);
  }

  function render(): void {
    if (closed) return;
    renderRibbons();
    left.replaceChildren();
    right.replaceChildren();
    left.className = 'almanac-page left';
    right.className = 'almanac-page right';
    book.classList.toggle('single', narrow());
    if (detail) {
      renderDetail(detail);
      where.textContent = detail.name;
      prev.disabled = false;
      next.disabled = true;
      prev.setAttribute('aria-label', tr('Zurück zur Seite'));
      return;
    }
    prev.setAttribute('aria-label', tr('Vorherige Seite'));
    const shown = narrow() ? [pages[spread]] : [pages[spread], pages[spread + 1]];
    renderPage(left, shown[0]);
    if (shown[1]) renderPage(right, shown[1]);
    else if (!narrow()) renderEnd(right);
    const last = spread + shown.length;
    where.textContent = msg`Seite ${spread + 1}–${Math.min(last, pages.length)} von ${pages.length}`;
    if (narrow()) where.textContent = msg`Seite ${spread + 1} von ${pages.length}`;
    prev.disabled = spread === 0;
    next.disabled = last >= pages.length;
  }

  function renderRibbons(): void {
    ribbons.replaceChildren();
    const current = detail?.rarity ?? activeRarity ?? currentRarity();
    for (const rarity of ALMANAC_CHAPTERS) {
      const all = opts.catalog.cards.filter((card) => card.rarity === rarity);
      const found = all.filter((card) => owned.has(card.id)).length;
      const ribbon = button('', () => jump(rarity), `almanac-ribbon ${rarity}`);
      ribbon.setAttribute('aria-current', String(current === rarity));
      const name = document.createElement('span');
      name.textContent = rarityLabel(rarity);
      const count = document.createElement('small');
      count.textContent = `${found}/${all.length}`;
      ribbon.append(name, count);
      ribbons.append(ribbon);
    }
  }

  function currentRarity(): CardRarity | null {
    for (const page of narrow() ? [pages[spread]] : [pages[spread], pages[spread + 1]])
      if (page?.kind === 'cards') return page.rarity;
    return null;
  }

  function renderPage(host: HTMLElement, page: Page): void {
    host.dataset.rarity = page.kind === 'cards' ? page.rarity : '';
    if (page.kind === 'intro') return renderIntro(host);
    const head = document.createElement('header');
    head.className = 'almanac-page-head';
    const h = document.createElement('h3');
    h.textContent =
      page.parts > 1
        ? msg`${rarityLabel(page.rarity)} · ${page.part + 1}/${page.parts}`
        : rarityLabel(page.rarity);
    const all = opts.catalog.cards.filter((card) => card.rarity === page.rarity);
    const count = document.createElement('p');
    count.textContent = msg`${all.filter((card) => owned.has(card.id)).length} von ${all.length} entdeckt`;
    head.append(h, count);
    const grid = document.createElement('div');
    grid.className = 'almanac-grid';
    grid.setAttribute('role', 'list');
    for (const card of page.cards) grid.append(cardTile(card));
    host.append(head, grid);
  }

  function cardTile(card: CardDefinition): HTMLElement {
    const known = owned.has(card.id);
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `almanac-card ${card.rarity}${known ? '' : ' locked'}`;
    tile.dataset.cardId = card.id;
    tile.setAttribute('role', 'listitem');
    if (!known) {
      // undiscovered: dark and mysterious, it cannot be opened
      tile.disabled = true;
      tile.setAttribute('aria-label', msg`Karte ${card.number}: noch nicht entdeckt`);
      const mark = document.createElement('span');
      mark.className = 'almanac-mystery';
      mark.textContent = '?';
      mark.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span');
      number.className = 'almanac-card-number';
      number.textContent = `#${card.number}`;
      tile.append(mark, number);
      return tile;
    }
    const img = document.createElement('img');
    img.src = catalogAssetUrl(card.thumbnail);
    img.alt = '';
    img.loading = 'lazy';
    const name = document.createElement('span');
    name.className = 'almanac-card-name';
    name.textContent = card.name;
    tile.append(img, name);
    tile.addEventListener('click', () => {
      detail = card;
      flip(1);
    });
    return tile;
  }

  function renderIntro(host: HTMLElement): void {
    host.classList.add('intro');
    const title = document.createElement('h3');
    title.className = 'almanac-title';
    title.textContent = opts.catalog.name;
    const found = document.createElement('p');
    found.className = 'almanac-found';
    found.textContent =
      loaded === 'loading'
        ? tr('Lädt …')
        : msg`${owned.size} von ${opts.catalog.cards.length} Karten entdeckt`;
    const hint = document.createElement('p');
    hint.className = 'almanac-hint';
    hint.textContent =
      loaded === 'failed'
        ? tr('Deine Karten konnten nicht geladen werden. Versuch es später noch einmal.')
        : tr('Karten bekommst du im LearnPass. Dunkle Seiten warten noch auf dich.');
    const art = document.createElement('img');
    art.className = 'almanac-intro-art';
    art.src = `${import.meta.env.BASE_URL}assets/halloween/almanac-cover.webp`;
    art.alt = '';
    host.append(title, found, art, hint);
  }

  function renderEnd(host: HTMLElement): void {
    const end = document.createElement('p');
    end.className = 'almanac-end';
    end.textContent = tr('Ende des Almanachs');
    host.append(end);
  }

  function renderDetail(card: CardDefinition): void {
    left.classList.add('detail-art');
    left.dataset.rarity = card.rarity;
    right.dataset.rarity = card.rarity;
    const art = document.createElement('img');
    art.className = 'almanac-detail-art';
    art.src = catalogAssetUrl(card.front);
    art.alt = card.name;
    const open3d = button(
      tr('In 3D ansehen'),
      () =>
        openCardPreview({
          card,
          opener: open3d,
          reducedMotion: opts.reducedMotion,
          resolve: (path) => catalogAssetUrl(path),
        }),
      'primary almanac-3d',
    );
    left.append(art, open3d);

    const h = document.createElement('h3');
    h.textContent = card.name;
    const meta = document.createElement('p');
    meta.className = 'almanac-detail-meta';
    meta.textContent = `#${card.number} · ${rarityLabel(card.rarity)} · ${card.topic}`;
    const key = document.createElement('p');
    key.className = 'almanac-detail-key';
    key.textContent = card.key;
    const example = document.createElement('p');
    example.textContent = card.example;
    right.append(h, meta, key, example);
    if (card.notes.length) {
      const notes = document.createElement('ul');
      for (const note of card.notes) {
        const li = document.createElement('li');
        li.textContent = note;
        notes.append(li);
      }
      right.append(notes);
    }
    for (const [value, className] of [
      [card.tip, 'almanac-detail-tip'],
      [card.description, ''],
      [card.flavour, 'almanac-detail-flavour'],
    ] as const) {
      if (!value) continue;
      const p = document.createElement('p');
      if (className) p.className = className;
      p.textContent = value;
      right.append(p);
    }
    if (card.effects?.length) {
      const label = document.createElement('p');
      label.className = 'almanac-detail-label';
      label.textContent = tr('Imaginary effect');
      const effects = document.createElement('ul');
      for (const effect of card.effects) {
        const li = document.createElement('li');
        li.textContent = effect;
        effects.append(li);
      }
      right.append(label, effects);
    }
    if (card.source) {
      const source = document.createElement('p');
      source.className = 'almanac-source';
      source.textContent = `${card.source.work} · ${card.source.author} · ${card.source.publisher}`;
      const link = document.createElement('a');
      link.href = card.source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = tr('Quelle öffnen');
      source.append(' ', link);
      right.append(source);
    }
    if (card.reference) {
      const reference = document.createElement('p');
      reference.className = 'almanac-source';
      reference.textContent = `${card.reference.work} · ${card.reference.publisher} · ${card.reference.page}`;
      right.append(reference);
    }
    const back = button(tr('← Zurück zur Seite'), () => turn(-1), 'almanac-back');
    right.append(back);
  }

  const onResize = (): void => {
    spread = align(spread);
    render();
  };
  window.addEventListener('resize', onResize);
  const done = modal.body.closest('.overlay');
  const observer = new MutationObserver(() => {
    if (!done?.isConnected) {
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    }
  });
  if (done?.parentNode) observer.observe(done.parentNode, { childList: true });

  render();
  void opts.api
    .my(opts.seasonId)
    .then((state) => {
      if (closed) return;
      state.cards.forEach((card) => owned.add(card.cardId));
      loaded = 'ok';
      if (opts.focusCardId && owned.has(opts.focusCardId)) {
        const index = pages.findIndex(
          (page) => page.kind === 'cards' && page.cards.some((card) => card.id === opts.focusCardId),
        );
        if (index >= 0) spread = align(index);
      }
      render();
    })
    .catch(() => {
      // no ownership: every card stays dark, nothing is pretended
      loaded = 'failed';
      render();
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

export function rarityLabel(rarity: CardDefinition['rarity']): string {
  if (rarity === 'normal') return tr('Normal');
  if (rarity === 'rare') return tr('Selten');
  if (rarity === 'epic') return tr('Episch');
  return tr('Legendär');
}
