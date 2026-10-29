/**
 * Opens the LearnPass page with the real API (U5): claims, shop chest, inventory link, the chest
 * pool for "What's inside?" and the tier-40 pick. Holds the session picture renderer while open.
 */
import { tr } from '../../i18n';
import type { PoolItem, SeasonApi } from '../../api/season';
import { announceCardGrants } from '../../collection/cardNotice';
import { cardById, collectionCatalog } from '../../collection/catalog';
import { revealCards } from '../../collection/cardReveal';
import type { CardDefinition } from '../../collection/types';
import type { SoundName } from '../sound';
import { itemName } from '../seasonChests';
import { renderLearnPass, type LearnPassHandle } from './learnpassView';
import { openInside } from './insideModal';
import { openSeasonPick } from './seasonPick';
import { seasonPictures, type PortraitFactory } from './rewardArt';

export interface OpenLearnPassOptions {
  api: SeasonApi;
  getCoins: () => number;
  onCoins: (coins: number) => void;
  reducedMotion: boolean;
  onOpenInventory: () => void;
  /** The player's portrait in a given frame (frame rewards); a default figure otherwise. */
  portrait?: PortraitFactory;
  sound?: { play(name: SoundName, delayMs?: number): void } | null;
  /** "Zum Almanach" after a drawn card: opens the almanach at that card. */
  onOpenAlmanac?: (cardId: string) => void;
}

export interface LearnPassOverlay {
  close(): void;
  readonly isOpen: boolean;
}

export function openLearnPass(opts: OpenLearnPassOptions): LearnPassOverlay {
  let view: LearnPassHandle | null = null;
  let closed = false;
  let errorBox: HTMLElement | null = null;
  let seasonId = '';
  let poolJob: Promise<PoolItem[]> | null = null;
  const pictures = seasonPictures();
  const pool = () => (poolJob ??= opts.api.pool(seasonId));

  function close(): void {
    if (closed) return;
    closed = true;
    view?.destroy();
    view = null;
    pictures.release();
    errorBox?.remove();
    errorBox = null;
  }

  const actions = {
    onClose: () => close(),
    getCoins: opts.getCoins,
    itemName: (id: string) => itemName(id),
    async onClaim(tier: number): Promise<number> {
      const result = await opts.api.claim(tier);
      const coins = result.rewards.coins ?? 0;
      if (coins > 0) opts.onCoins(opts.getCoins() + coins);
      const cards = (result.rewards.cards ?? [])
        .filter((card) => card.granted)
        .map((card) => card.id);
      await refresh();
      if (cards.length) void showDrawnCards(cards);
      return coins;
    },
    async onBuyChest(): Promise<void> {
      await opts.api.buyChest();
      opts.onCoins(opts.getCoins() - 50);
      await refresh();
    },
    onOpenInventory(): void {
      close();
      opts.onOpenInventory();
    },
    onOpenInside(): void {
      if (view) openInside(view.el, { pool: pool(), pictures, reducedMotion: opts.reducedMotion });
    },
    onPickItem(): void {
      if (!view) return;
      openSeasonPick(view.el, {
        pool: pool(),
        owned: opts.api.owned(),
        pictures,
        onPick: async (itemId) => {
          const result = await opts.api.choose(itemId, seasonId || undefined);
          if (result.coins) opts.onCoins(opts.getCoins() + result.coins);
          await refresh();
        },
      });
    },
  };

  /** New cards from a claim: the reveal with mystery and flip; the short notice if that fails. */
  async function showDrawnCards(ids: string[]): Promise<void> {
    try {
      const catalog = await collectionCatalog();
      const cards = ids
        .map((id) => cardById(catalog, id))
        .filter((card): card is CardDefinition => Boolean(card));
      if (!cards.length || closed) throw Error('no cards');
      revealCards({
        cards,
        reducedMotion: opts.reducedMotion,
        sound: opts.sound,
        // the almanac is a modal like the reveal and would open behind the pass: close the pass first
        onAlmanac: opts.onOpenAlmanac
          ? (cardId) => {
              close();
              opts.onOpenAlmanac?.(cardId);
            }
          : undefined,
      });
    } catch {
      announceCardGrants(ids);
    }
  }

  async function refresh(): Promise<void> {
    if (closed) return;
    const state = await opts.api.state();
    if (closed) return;
    seasonId = state.season.id;
    if (!view) {
      view = renderLearnPass(state, actions, {
        reducedMotion: opts.reducedMotion,
        pictures,
        portrait: opts.portrait,
      });
      document.body.append(view.el);
    } else {
      view.update(state);
    }
  }

  function fail(): void {
    if (closed) return;
    const box = document.createElement('div');
    errorBox?.remove();
    errorBox = box;
    box.className = 'learnpass-error';
    box.setAttribute('role', 'alert');
    const p = document.createElement('p');
    p.textContent = tr('Die Season konnte nicht geladen werden.');
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'lp-act';
    ok.textContent = tr('Schließen');
    ok.addEventListener('click', () => {
      box.remove();
      close();
    });
    box.append(p, ok);
    document.body.append(box);
  }

  void refresh().catch(fail);
  return {
    close,
    get isOpen() {
      return !closed;
    },
  };
}
