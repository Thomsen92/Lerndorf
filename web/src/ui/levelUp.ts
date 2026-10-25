import type { Chest, ProgressApi, Reward } from '../api/progress';
import { PROGRESS_ERROR } from '../api/progress';
import { openModal, type ModalHandle } from './dialog';
import type { Sound } from './sound';
import { crestSvg } from './crest';
export function chestResultText(coinsWon: number, roll: 'normal' | 'double' | 'triple'): string {
  return `+${coinsWon} Münzen${roll === 'double' ? ' – Super!' : roll === 'triple' ? ' – Jackpot!' : ''}`;
}
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
  let pending = false,
    opened = false;
  let coinFrame: number | null = null;
  const modal = openModal({
    title: opts.chest.size === 'big' ? 'Große Truhe' : 'Deine Truhe',
    opener: opts.opener,
    canClose: () => !pending,
    onClose: () => {
      if (coinFrame !== null) window.cancelAnimationFrame(coinFrame);
      opts.onDone();
    },
  });
  const graphic = document.createElement('div');
  graphic.className = 'chest chest--closed';
  graphic.setAttribute('aria-hidden', 'true');
  graphic.innerHTML =
    '<svg viewBox="0 0 160 120"><path d="M25 47 Q25 15 80 15 Q135 15 135 47 L135 99 25 99 Z" fill="#a56a32" stroke="#50361f" stroke-width="5"/><path class="chest-lid" d="M25 47 Q25 15 80 15 Q135 15 135 47 Z" fill="#c58c48" stroke="#50361f" stroke-width="5"/><path d="M40 26 V98 M120 26 V98 M25 58 H135" fill="none" stroke="#edc266" stroke-width="9"/><rect x="69" y="49" width="22" height="25" rx="3" fill="#ffdd7f" stroke="#50361f" stroke-width="3"/></svg>';
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  const open = button('Truhe öffnen', () => {
    void run();
  });
  async function run(): Promise<void> {
    if (pending || opened) return;
    pending = true;
    open.disabled = true;
    status.textContent = 'Die Truhe wird geöffnet …';
    graphic.className = 'chest chest--wobble';
    opts.sound?.play('chest');
    try {
      const result = await opts.api.openChest(opts.chest.id);
      if (!modal.isOpen) return;
      if (!result.ok) throw Error();
      opened = true;
      graphic.className = 'chest chest--open';
      status.textContent = chestResultText(result.value.coinsWon, result.value.roll);
      opts.onCoins(result.value.coins);
      opts.sound?.play('coins');
      if (!opts.reducedMotion) {
        const burst = document.createElement('div');
        burst.className = 'chest-coins';
        for (let i = 0; i < 10; i++) {
          const coin = document.createElement('span');
          coin.style.setProperty('--coin-x', `${Math.cos((i * Math.PI) / 5) * 100}px`);
          coin.style.setProperty('--coin-y', `${Math.sin((i * Math.PI) / 5) * 70 - 80}px`);
          burst.append(coin);
        }
        const counter = document.createElement('span');
        counter.className = 'chest-count';
        graphic.append(burst, counter);
        const start = performance.now();
        const count = (now: number): void => {
          if (!modal.isOpen) return;
          const fraction = Math.min(1, (now - start) / 600);
          counter.textContent = `+${Math.round(result.value.coinsWon * fraction)}`;
          if (fraction < 1) coinFrame = window.requestAnimationFrame(count);
          else {
            coinFrame = null;
            burst.remove();
          }
        };
        coinFrame = window.requestAnimationFrame(count);
      }
      open.remove();
      modal.body.append(button('Weiter', () => modal.close()));
    } catch {
      if (!modal.isOpen) return;
      status.textContent = PROGRESS_ERROR;
      open.textContent = 'Nochmal versuchen';
    } finally {
      pending = false;
      open.disabled = false;
    }
  }
  modal.body.classList.add('chest-dialog');
  if (opts.reducedMotion) modal.body.classList.add('reduced-motion');
  modal.body.append(graphic, status, open);
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
  let child: ModalHandle | null = null;
  let closing = false;
  const modal = openModal({
    title: `Level ${opts.levelTo}!`,
    opener: opts.opener,
    onClose: () => {
      child?.close();
      opts.onDone();
    },
  });
  modal.body.classList.add('level-up');
  modal.body.append(crestSvg(opts.levelTo, 140));
  opts.sound?.play('levelup');
  for (const reward of opts.rewards.filter((r) => r.level > opts.levelFrom && r.level <= opts.levelTo)) {
    const row = document.createElement('div');
    row.className = 'reward-row';
    const label = document.createElement('p');
    label.textContent = `Neuer ${reward.kind === 'title' ? 'Titel' : 'Rahmen'}: ${reward.label}`;
    const error = document.createElement('p');
    error.setAttribute('role', 'status');
    row.append(
      label,
      button(reward.kind === 'title' ? 'Jetzt wählen' : 'Jetzt anlegen', (b) => {
        b.disabled = true;
        void (reward.kind === 'title' ? opts.api.setTitle(reward.id) : opts.api.setFrame(reward.id))
          .then((result) => {
            if (!modal.isOpen) return;
            if (result.ok) {
              opts.onEquip(reward);
              b.textContent = 'gewählt';
            } else {
              error.textContent = PROGRESS_ERROR;
              b.disabled = false;
            }
          })
          .catch(() => {
            if (!modal.isOpen) return;
            error.textContent = PROGRESS_ERROR;
            b.disabled = false;
          });
      }),
      error,
    );
    modal.body.append(row);
  }
  for (const chest of opts.chests) {
    const row = button('Truhe öffnen', (b) => {
      child = openChestDialog({
        chest,
        api: opts.api,
        sound: opts.sound,
        reducedMotion: opts.reducedMotion,
        opener: b,
        onCoins: opts.onCoins,
        onDone: () => {
          child = null;
          if (!modal.isOpen || closing) return;
          void opts.api
            .load()
            .then((result) => {
              if (modal.isOpen && result.ok && !result.value.chests.some((c) => c.id === chest.id))
                b.remove();
            })
            .catch(() => undefined);
        },
      });
    });
    modal.body.append(row);
  }
  modal.body.append(button('Weiter', () => modal.close()));
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
  return {
    body: modal.body,
    get isOpen() {
      return modal.isOpen;
    },
    close() {
      closing = true;
      const active = child;
      child = null;
      active?.close();
      modal.close();
    },
  };
}
