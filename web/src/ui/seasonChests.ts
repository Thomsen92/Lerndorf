/** Season chests in the inventory (plan §5.3, U2): count, open with a short reveal, duplicates. */
import { tr, msg, getLocale } from '../i18n';
import type { SeasonApi } from '../api/season';
import { chestSvg } from './learnpass/rewardArt';
import './seasonChests.css';

export interface SeasonChestRow {
  id: number;
  source: 'pass' | 'streak' | 'shop';
}

const NAMES: Record<string, string> = {
  season_warlock: 'Warlock',
  season_house_horror: 'Haunted house',
  season_pumpkin_patch: 'Pumpkin patch',
  season_clock_tower: 'Spooky clock tower',
  season_dodge: 'Pickup truck',
  season_monster_plant: 'Monster plant',
  season_pumpkin_tree: 'Pumpkin tree',
  season_candy_pile: 'Candy pile',
  season_graveyard_corner: 'Graveyard corner',
  season_fence_lantern: 'Fence with lantern',
  season_witch_statue: 'Witch statue',
  season_pumpkin_girl: 'Pumpkin girl',
  season_witch_figure: 'Witch',
  season_mummy: 'Mummy',
  season_skeleton: 'Skeleton',
  season_zombie: 'Zombie',
  season_witch_cat: 'Witch cat',
  season_cauldron: 'Cauldron',
  season_pumpkin_cat: 'Pumpkin cat',
  season_ghost_kitty: 'Ghost cat',
  season_candy_bucket: 'Candy bucket',
  season_bat: 'Bat',
  season_candle: 'Grave candle',
  season_ghost: 'Little ghost',
  season_gravestone: 'Gravestone',
  season_jack_o_lantern: "Jack-o'-lantern",
  season_broom: 'Broom',
  season_sign: 'Halloween sign',
};

const NAMES_DE: Record<string, string> = {
  season_warlock: 'Warlock',
  season_house_horror: 'Horror-Haus',
  season_pumpkin_patch: 'Kürbisfeld',
  season_clock_tower: 'Spuk-Uhrturm',
  season_dodge: 'Dodge Pickup',
  season_monster_plant: 'Monsterpflanze',
  season_pumpkin_tree: 'Kürbisbaum',
  season_candy_pile: 'Süßigkeitenhaufen',
  season_graveyard_corner: 'Friedhofsecke',
  season_fence_lantern: 'Zaun mit Laterne',
  season_witch_statue: 'Hexe (Statue)',
  season_pumpkin_girl: 'Kürbismädchen',
  season_witch_figure: 'Hexe (Figur)',
  season_mummy: 'Mumie',
  season_skeleton: 'Skelett',
  season_zombie: 'Zombie',
  season_witch_cat: 'Hexenkatze',
  season_cauldron: 'Hexenkessel',
  season_pumpkin_cat: 'Kürbiskatze',
  season_ghost_kitty: 'Geisterkatze',
  season_candy_bucket: 'Süßigkeiteneimer',
  season_bat: 'Fledermaus',
  season_candle: 'Grablicht',
  season_ghost: 'Kleiner Geist',
  season_gravestone: 'Grabstein',
  season_jack_o_lantern: 'Kürbislaterne',
  season_broom: 'Besen',
  season_sign: 'Halloween-Schild',
};

const RARITY: Record<string, { label: string; color: string }> = {
  common: { label: tr('Gewöhnlich'), color: '#b9b2c6' },
  rare: { label: tr('Selten'), color: '#4a8ff0' },
  epic: { label: tr('Episch'), color: '#a06bf0' },
  legendary: { label: tr('Legendär'), color: '#f2b630' },
};

export function itemName(id: string, fallback = ''): string {
  if (getLocale() === 'de') return NAMES_DE[id] ?? NAMES[id] ?? (fallback || id);
  return NAMES[id] ?? (fallback || id);
}

export interface SeasonChestOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  reducedMotion: boolean;
}

export function createSeasonChests(opts: SeasonChestOptions): HTMLElement {
  const section = document.createElement('section');
  section.className = 'season-chests';
  if (opts.reducedMotion) section.classList.add('reduced-motion');
  const head = document.createElement('h3');
  const rows = document.createElement('div');
  rows.className = 'season-chest-rows';
  section.append(head, rows);

  let chests: SeasonChestRow[] = [];

  function render(): void {
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
    icon.innerHTML = chestSvg();
    const text = document.createElement('span');
    text.className = 'season-chest-text';
    text.innerHTML = `<strong>${msg`Season-Truhe ×${chests.length}`}</strong><small>${tr('Aus Pass, Serie und Shop')}</small>`;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'season-chest-open';
    open.textContent = tr('Öffnen');
    open.addEventListener('click', () => {
      open.disabled = true;
      void openNext().finally(() => {
        open.disabled = false;
      });
    });
    row.append(icon, text, open);
    rows.append(row);
  }

  async function openNext(): Promise<void> {
    const chest = chests[0];
    if (!chest) return;
    try {
      const result = await opts.api.openChest(chest.id);
      if (result.coins > 0) opts.onCoins(opts.getCoins() + result.coins);
      chests = chests.filter((c) => c.id !== chest.id);
      render();
      reveal(result, opts, section);
    } catch {
      // The RPC already refused; keep the list so the pupil can try again.
    }
  }

  void opts.api
    .chests()
    .then((list) => {
      chests = list;
      render();
    })
    .catch(() => render());

  render();
  return section;
}

function reveal(
  result: { rarity: string; item_id: string; name_de?: string; duplicate: boolean; coins: number },
  opts: SeasonChestOptions,
  host: HTMLElement,
): void {
  const rarity = RARITY[result.rarity] ?? RARITY.common;
  const overlay = document.createElement('div');
  overlay.className = 'season-reveal';
  const card = document.createElement('div');
  card.className = 'season-reveal-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.setAttribute('aria-label', tr('Ergebnis der Season-Truhe'));
  const chest = document.createElement('div');
  chest.className = 'season-reveal-chest';
  chest.innerHTML = chestSvg();
  if (!opts.reducedMotion) chest.classList.add('shake');
  const rarityEl = document.createElement('span');
  rarityEl.className = 'season-reveal-rarity';
  rarityEl.textContent = tr(rarity.label);
  rarityEl.style.color = rarity.color;
  rarityEl.style.borderColor = rarity.color;
  const name = document.createElement('strong');
  name.className = 'season-reveal-name';
  name.textContent = itemName(result.item_id, result.name_de ?? '');
  const note = document.createElement('p');
  note.className = 'season-reveal-note';
  note.textContent = result.duplicate
    ? msg`Schon vorhanden – ${result.coins} Münzen`
    : tr('Neu in deiner Sammlung');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'season-reveal-ok';
  ok.textContent = tr('Weiter');
  ok.addEventListener('click', () => {
    overlay.remove();
    ok.focus();
  });
  card.append(chest, rarityEl, name, note, ok);
  overlay.append(card);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });
  host.append(overlay);
  ok.focus();
}
