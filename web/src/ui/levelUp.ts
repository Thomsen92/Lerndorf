import { tr, msg } from '../i18n';
import type { Chest, ProgressApi, Reward } from '../api/progress';
import { PROGRESS_ERROR } from '../api/progress';
import { openModal, type ModalHandle } from './dialog';
import type { Sound } from './sound';
import { crestSvg } from './crest';
import { titlePlaque } from './titlePlaque';
import { createChestControl, type ChestControl } from './chestControl';
export { chestResultText } from './chestControl';
const button = (label: string, run: (b: HTMLButtonElement) => void): HTMLButtonElement => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => run(b));
  return b;
};
export function openChestDialog(opts: {
  chest: Chest;
  api: ProgressApi;
  sound?: Sound;
  reducedMotion: boolean;
  opener?: HTMLElement | null;
  onCoins: (c: number) => void;
  onDone: () => void;
}): ModalHandle {
  let card: ChestControl | null = null;
  const modal = openModal({
    title: opts.chest.size === 'big' ? tr('Große Truhe') : tr('Deine Truhe'),
    opener: opts.opener,
    canClose: () => !card?.pending,
    onClose: () => {
      card?.dispose();
      opts.onDone();
    },
  });
  const done = button(tr('Weiter'), () => modal.close());
  done.hidden = true;
  card = createChestControl({
    ...opts,
    onCoins: (coins) => {
      if (modal.isOpen) opts.onCoins(coins);
    },
    onOpened: () => {
      if (modal.isOpen) done.hidden = false;
    },
  });
  modal.body.classList.add('chest-dialog');
  modal.body.append(card.el, done);
  return modal;
}
export interface CelebrationOptions {
  levelFrom: number;
  levelTo: number;
  chests: Chest[];
  rewards: Reward[];
  api: ProgressApi;
  sound?: Sound;
  reducedMotion: boolean;
  opener?: HTMLElement | null;
  onCoins: (coins: number) => void;
  onEquip: (r: Reward) => void;
  onDone: () => void;
}
export function openLevelUp(opts: CelebrationOptions): ModalHandle {
  const cards: ChestControl[] = [];
  const modal = openModal({
    title: msg`Level ${opts.levelTo}!`,
    opener: opts.opener,
    canClose: () => !cards.some((card) => card.pending),
    onClose: () => {
      cards.forEach((card) => card.dispose());
      opts.onDone();
    },
  });
  modal.body.classList.add('level-up');
  modal.body.append(crestSvg(opts.levelTo, 140));
  opts.sound?.play('levelup');
  const rewards = document.createElement('div');
  rewards.className = 'level-rewards';
  for (const reward of opts.rewards.filter((r) => r.level > opts.levelFrom && r.level <= opts.levelTo)) {
    const row = document.createElement('div');
    row.className = 'reward-row';
    const label = document.createElement('p');
    label.textContent = msg`Neuer ${reward.kind === 'title' ? tr('Titel') : tr('Rahmen')}: ${reward.label}`;
    const error = document.createElement('p');
    error.setAttribute('role', 'status');
    row.append(
      label,
      ...(reward.kind === 'title' ? [titlePlaque(reward.label, opts.levelTo)] : []),
      button(reward.kind === 'title' ? tr('Jetzt wählen') : tr('Jetzt anlegen'), (b) => {
        b.disabled = true;
        void (reward.kind === 'title' ? opts.api.setTitle(reward.id) : opts.api.setFrame(reward.id))
          .then((result) => {
            if (!modal.isOpen) return;
            if (result.ok) {
              opts.onEquip(reward);
              b.textContent = tr('Gewählt');
            } else {
              error.textContent = PROGRESS_ERROR;
              b.disabled = false;
            }
          })
          .catch(() => {
            if (modal.isOpen) {
              error.textContent = PROGRESS_ERROR;
              b.disabled = false;
            }
          });
      }),
      error,
    );
    rewards.append(row);
  }
  modal.body.append(rewards);
  const done = button(tr('Weiter'), () => {
    if (!cards.some((card) => card.pending)) modal.close();
  });
  if (opts.chests.length) {
    const grid = document.createElement('div');
    grid.className = 'loot-grid';
    for (const chest of opts.chests) {
      const card = createChestControl({
        chest,
        api: opts.api,
        sound: opts.sound,
        reducedMotion: opts.reducedMotion,
        onCoins: (coins) => {
          if (modal.isOpen) opts.onCoins(coins);
        },
        onPending: () => {
          done.disabled = cards.some((card) => card.pending);
        },
      });
      cards.push(card);
      grid.append(card.el);
    }
    modal.body.append(grid);
  }
  modal.body.append(done);
  if (!opts.reducedMotion) {
    const stars = document.createElement('div');
    stars.className = 'xp-confetti';
    stars.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 24; i++) {
      const img = document.createElement('img');
      img.src = `${import.meta.env.BASE_URL}assets/kenney/fx/star.png`;
      img.style.setProperty('--i', String(i));
      img.style.left = `${(i * 47) % 100}%`;
      stars.append(img);
    }
    modal.body.append(stars);
    window.setTimeout(() => stars.remove(), 1500);
  }
  return modal;
}
