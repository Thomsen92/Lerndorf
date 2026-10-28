import { tr, msg } from '../i18n';
import { PROGRESS_ERROR, levelFraction, type Progress, type ProgressApi, type Reward } from '../api/progress';
import type { CharacterKind } from '../render/character';
import { avatarPortrait, frameSvg } from './frames';
import { crestSvg } from './crest';
import { titlePlaque } from './titlePlaque';
import type { AreaHandle } from './areas';
import type { Sound } from './sound';
import { createChestControl, type ChestControl } from './chestControl';
import { createSeasonCard } from './seasonCard';
import type { SeasonApi } from '../api/season';
import './profile.css';
import type { AvatarLook } from '../avatars/look';

/** Small card-stack icon for the almanach entry (no external image). */
function cardStackSvg(size: number): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  for (const [x, y] of [
    [10, 12],
    [15, 9],
    [20, 6],
  ]) {
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '30');
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', '#2a1f33');
    rect.setAttribute('stroke', '#d6a34f');
    rect.setAttribute('stroke-width', '2');
    svg.append(rect);
  }
  return svg;
}
let serial = 0;
export function openProfile(opts: {
  api: ProgressApi;
  nickname: string;
  character: CharacterKind | null;
  look?: AvatarLook;
  getCoins: () => number;
  onCoins: (c: number) => void;
  onFrame: (id: string) => void;
  onTitle: (label: string | null) => void;
  onSettings: (b: HTMLButtonElement) => void;
  onClose: () => void;
  onQuests?: () => void;
  /** Season entry card (U5); omitted in read-only views without a season. */
  season?: { api: SeasonApi; onOpen: () => void };
  /** Opens the Halloween card almanach (package 6); omitted where no collection exists. */
  collection?: { open: () => void };
  sound?: Sound;
  reducedMotion: boolean;
}): AreaHandle {
  const area = document.createElement('section');
  area.className = 'overlay area profile-area';
  area.setAttribute('role', 'region');
  if (opts.reducedMotion) area.classList.add('reduced-motion');
  const titleId = `profile-title-${++serial}`;
  area.setAttribute('aria-labelledby', titleId);
  const panel = document.createElement('div');
  panel.className = 'panel';
  const head = document.createElement('header');
  head.className = 'panel-head profile-head';
  const title = document.createElement('h2');
  title.id = titleId;
  title.tabIndex = -1;
  const button = (
    value: string,
    action: (b: HTMLButtonElement) => void,
    className = '',
  ): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = value;
    b.className = className;
    b.addEventListener('click', () => action(b));
    return b;
  };
  const text = (parent: HTMLElement, tag: string, value: string, className = ''): HTMLElement => {
    const el = document.createElement(tag);
    el.textContent = value;
    el.className = className;
    parent.append(el);
    return el;
  };
  const back = button(tr('← Profil'), () => show('overview'));
  back.setAttribute('aria-label', tr('Zurück zum Profil'));
  const settings = button(tr('Einstellungen'), opts.onSettings, 'profile-settings');
  head.append(back, title, settings, button(tr('Schließen'), opts.onClose));
  const content = document.createElement('div');
  content.className = 'area-content profile-content';
  panel.append(head, content);
  area.append(panel);
  document.body.append(area);
  let closed = false,
    progress: Progress | null = null,
    rewards: Reward[] = [],
    busy = false;
  let page: 'overview' | 'collection' = 'overview',
    category: 'title' | 'frame' = 'title';
  let chests: ChestControl[] = [];
  const clearChests = (): void => {
    chests.forEach((c) => c.dispose());
    chests = [];
  };
  function show(next: typeof page, kind?: typeof category): void {
    page = next;
    if (kind) category = kind;
    render();
    title.focus();
    content.scrollTop = 0;
  }
  function overview(p: Progress): void {
    const hero = document.createElement('section');
    hero.className = 'profile-player';
    const portrait = button('', () => show('collection', 'frame'), 'profile-portrait-button');
    portrait.setAttribute('aria-label', tr('Rahmen ändern'));
    portrait.title = tr('Rahmen ändern');
    portrait.append(
      avatarPortrait({ character: opts.character, look: opts.look, frameId: p.frameId, size: 'large' }),
    );
    const edit = text(portrait, 'span', '✎', 'profile-edit');
    edit.setAttribute('aria-hidden', 'true');
    const identity = document.createElement('div');
    identity.className = 'profile-identity';
    text(identity, 'h3', opts.nickname);
    const titleButton = button(
      rewards.find((r) => r.id === p.titleId)?.label ?? tr('Titel auswählen'),
      () => show('collection', 'title'),
      'profile-current-title',
    );
    const equippedTitle = rewards.find((r) => r.id === p.titleId);
    if (equippedTitle) titleButton.replaceChildren(titlePlaque(equippedTitle.label, p.level));
    titleButton.title = tr('Titel ändern');
    identity.append(titleButton);
    text(identity, 'p', msg`${opts.getCoins()} Münzen`, 'profile-wallet');
    hero.append(portrait, identity, crestSvg(p.level, 96));
    content.append(hero);
    const xp = document.createElement('div');
    xp.className = 'profile-progress';
    text(xp, 'p', msg`Noch ${Math.max(0, p.nextLevelXp - p.xp)} XP bis Level ${p.level + 1}`);
    const bar = document.createElement('div');
    bar.className = 'xp-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', tr('Fortschritt zum nächsten Level'));
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuenow', String(p.xp - p.levelXp));
    bar.setAttribute('aria-valuemax', String(p.nextLevelXp - p.levelXp));
    const fill = document.createElement('span');
    fill.style.width = `${100 * levelFraction(p)}%`;
    bar.append(fill);
    xp.append(bar);
    content.append(xp);
    if (opts.season) content.append(createSeasonCard({ api: opts.season.api, onOpen: opts.season.onOpen }));
    const daily = document.createElement('div');
    daily.className = 'profile-daily';
    const streak = document.createElement('div');
    streak.className = 'profile-milestone';
    text(streak, 'span', tr('Deine Serie'), 'profile-small-label');
    text(streak, 'strong', msg`🔥 ${p.streak.current} Tage`);
    if (p.streak.shieldLeft) {
      const shield = text(streak, 'span', tr('Geschützt'), 'profile-shield');
      shield.title = tr('Ein Schutzschild ist bereit.');
    }
    const today = opts.onQuests ? button('', () => opts.onQuests?.()) : document.createElement('div');
    today.className = 'profile-milestone profile-today';
    text(today, 'span', tr('Heute'), 'profile-small-label');
    text(today, 'strong', p.today.total ? msg`${p.today.solved} von ${p.today.total}` : tr('Pause'));
    text(
      today,
      'span',
      p.today.total ? tr('Quests geschafft') : tr('Bald gibt es neue Quests'),
      'profile-small-label',
    );
    const dots = document.createElement('span');
    dots.className = 'profile-quest-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < Math.min(3, p.today.total); i++) {
      const dot = document.createElement('i');
      if (i < p.today.solved) dot.className = 'done';
      dots.append(dot);
    }
    today.append(dots);
    daily.append(streak, today);
    content.append(daily);
    const loot = document.createElement('section');
    loot.className = 'profile-loot';
    const heading = text(loot, 'h3', tr('Deine Truhen'));
    if (p.chests.length) text(heading, 'span', String(p.chests.length), 'profile-loot-count');
    if (!p.chests.length) text(loot, 'p', msg`Nächste Truhe bei Level ${p.level + 1}.`, 'profile-empty');
    else {
      text(loot, 'p', tr('Tippe eine Truhe an.'), 'profile-small-label');
      const row = document.createElement('div');
      row.className = 'loot-grid';
      for (const chest of p.chests) {
        const card = createChestControl({
          chest,
          api: opts.api,
          sound: opts.sound,
          reducedMotion: opts.reducedMotion,
          onCoins: (coins) => {
            opts.onCoins(coins);
            if (closed) return;
            const wallet = content.querySelector('.profile-wallet');
            if (wallet) wallet.textContent = msg`${coins} Münzen`;
          },
          onOpened: (id) => {
            if (progress) {
              progress.chests = progress.chests.filter((c) => c.id !== id);
              if (!closed) {
                const count = content.querySelector<HTMLElement>('.profile-loot-count');
                if (count) {
                  count.textContent = String(progress.chests.length);
                  count.hidden = progress.chests.length === 0;
                }
              }
            }
          },
        });
        chests.push(card);
        row.append(card.el);
      }
      loot.append(row);
    }
    content.append(loot);
    const collection = button('', () => show('collection'), 'profile-collection-link');
    collection.setAttribute('aria-label', tr('Sammlung ansehen'));
    collection.append(frameSvg(p.frameId, 48));
    const label = document.createElement('span');
    text(label, 'strong', tr('Sammlung'));
    text(label, 'span', tr('Titel und Rahmen'));
    collection.append(label);
    text(collection, 'span', '→', 'profile-collection-arrow');
    content.append(collection);
    if (opts.collection) {
      const cardCollection = button('', () => opts.collection?.open(), 'profile-collection-link');
      cardCollection.setAttribute('aria-label', tr('Sammelkarten ansehen'));
      cardCollection.append(cardStackSvg(48));
      const cardLabel = document.createElement('span');
      text(cardLabel, 'strong', tr('Sammelkarten'));
      text(cardLabel, 'span', tr('Der Halloween-Almanach'));
      cardCollection.append(cardLabel);
      text(cardCollection, 'span', '→', 'profile-collection-arrow');
      content.append(cardCollection);
    }
  }
  async function choose(reward: Reward | null, b: HTMLButtonElement, error: HTMLElement): Promise<void> {
    if (!progress || busy || closed) return;
    busy = true;
    b.disabled = true;
    const kind = category;
    try {
      const result =
        kind === 'title' ? await opts.api.setTitle(reward?.id ?? null) : await opts.api.setFrame(reward!.id);
      if (!result.ok) throw Error();
      if (closed) return;
      if (kind === 'title') {
        progress.titleId = reward?.id ?? null;
        opts.onTitle(reward?.label ?? null);
      } else {
        progress.frameId = reward!.id;
        opts.onFrame(reward!.id);
      }
      busy = false;
      render();
      content.querySelectorAll<HTMLButtonElement>('[data-reward]').forEach((button) => {
        if (button.dataset.reward === (reward?.id ?? 'none')) button.focus();
      });
    } catch {
      if (!closed) {
        error.textContent = PROGRESS_ERROR;
        b.disabled = false;
      }
    } finally {
      busy = false;
    }
  }
  function collection(p: Progress): void {
    const tabs = document.createElement('div');
    tabs.className = 'collection-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', tr('Sammlungskategorien'));
    const panelId = `${titleId}-collection`;
    const focusTab = (): void => {
      content.querySelector<HTMLButtonElement>('[role=tab][aria-selected=true]')?.focus();
    };
    for (const kind of ['title', 'frame'] as const) {
      const tab = button(kind === 'title' ? tr('Titel') : tr('Rahmen'), () => {
        category = kind;
        render();
        focusTab();
      });
      tab.setAttribute('role', 'tab');
      tab.id = `${panelId}-${kind}`;
      tab.setAttribute('aria-selected', String(category === kind));
      tab.setAttribute('aria-controls', panelId);
      tab.tabIndex = category === kind ? 0 : -1;
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        category =
          event.key === 'Home'
            ? 'title'
            : event.key === 'End'
              ? 'frame'
              : category === 'title'
                ? 'frame'
                : 'title';
        render();
        focusTab();
      });
      tabs.append(tab);
    }
    content.append(tabs);
    const list = document.createElement('section');
    list.className = `collection-grid${category === 'title' ? ' collection-grid--titles' : ''}`;
    list.id = panelId;
    list.setAttribute('role', 'tabpanel');
    list.setAttribute('aria-labelledby', `${panelId}-${category}`);
    const items: Array<Reward | null> =
      category === 'title'
        ? [null, ...rewards.filter((r) => r.kind === 'title')]
        : rewards.filter((r) => r.kind === 'frame');
    for (const reward of items) {
      const selected = category === 'title' ? p.titleId === (reward?.id ?? null) : p.frameId === reward?.id;
      const locked = !!reward && (reward.season ? !reward.owned : reward.level > p.level);
      const note = reward?.season
        ? locked
          ? msg`, ${tr('Season I')}`
          : selected
            ? tr(', gewählt')
            : tr(', wählen')
        : locked
          ? msg`, ab Level ${reward!.level}`
          : selected
            ? tr(', gewählt')
            : tr(', wählen');
      const card = document.createElement('div');
      card.className = `collection-card${locked ? ' collection-card--locked' : ''}${selected ? ' collection-card--selected' : ''}`;
      const error = document.createElement('p');
      error.className = 'collection-error';
      error.setAttribute('role', 'status');
      const b = button('', (button) => {
        if (!selected) void choose(reward, button, error);
      });
      b.dataset.reward = reward?.id ?? 'none';
      b.setAttribute('aria-label', `${reward?.label ?? tr('Kein Titel')}${note}`);
      b.setAttribute('aria-pressed', String(selected));
      b.disabled = locked || busy;
      if (selected) b.setAttribute('aria-disabled', 'true');
      if (category === 'frame') b.append(frameSvg(reward!.id, 104));
      else if (reward) b.append(titlePlaque(reward.label, Math.max(p.level, reward.level)));
      else text(b, 'span', '—', 'collection-title-emblem').setAttribute('aria-hidden', 'true');
      if (category === 'frame' || !reward) text(b, 'strong', reward?.label ?? tr('Kein Titel'));
      text(
        b,
        'span',
        locked
          ? reward?.season
            ? msg`🔒 ${tr('Season I')}`
            : msg`🔒 Level ${reward!.level}`
          : selected
            ? tr('✓ Gewählt')
            : tr('Wählen'),
        'collection-card-state',
      );
      card.append(b, error);
      list.append(card);
    }
    content.append(list);
  }
  function render(): void {
    if (!progress || closed) return;
    clearChests();
    content.replaceChildren();
    title.textContent = page === 'overview' ? tr('Mein Profil') : tr('Meine Sammlung');
    area.dataset.page = page;
    back.hidden = page !== 'collection';
    settings.hidden = page !== 'overview';
    if (page === 'overview') overview(progress);
    else collection(progress);
  }
  async function load(): Promise<void> {
    try {
      const [p, catalogue] = await Promise.all([opts.api.load(), opts.api.rewards()]);
      if (closed) return;
      if (!p.ok || !catalogue.ok) throw Error();
      progress = p.value;
      rewards = catalogue.value;
      render();
    } catch {
      if (closed) return;
      clearChests();
      content.replaceChildren();
      const error = text(content, 'p', PROGRESS_ERROR);
      error.setAttribute('role', 'status');
      content.append(
        button(tr('Nochmal versuchen'), () => {
          void load();
        }),
      );
    }
  }
  title.textContent = tr('Mein Profil');
  back.hidden = true;
  text(content, 'p', tr('Profil wird geladen …'));
  void load();
  return {
    close() {
      closed = true;
      clearChests();
      area.remove();
    },
  };
}
