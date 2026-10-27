import './coinBurst.css';

export interface CoinBurstOptions {
  /** The coin counter the coins fly back into. */
  at: HTMLElement;
  amount: number;
  reduced?: boolean;
  sound?: { play(name: 'coins'): void };
}

const COINS = 12;

/**
 * A short, punchy coin pop on the coin counter. Purely visual, never blocks a tap. With reduced
 * motion only the "+N" label appears.
 */
export function coinBurst(opts: CoinBurstOptions): void {
  const rect = opts.at.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  opts.sound?.play('coins');
  const layer = document.createElement('div');
  layer.className = 'coin-burst';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);

  const label = document.createElement('span');
  label.className = 'coin-burst-gain';
  label.textContent = `+${Math.max(1, Math.round(opts.amount))}`;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  layer.append(label);
  if (typeof label.animate === 'function')
    label.animate(
      [
        { transform: 'translate(-50%, 0)', opacity: 1 },
        { transform: 'translate(-50%, -28px)', opacity: 0 },
      ],
      { duration: 900, easing: 'ease-out' },
    );

  if (!opts.reduced && typeof label.animate === 'function') {
    for (let i = 0; i < COINS; i++) {
      const coin = document.createElement('span');
      coin.className = 'coin-burst-coin';
      coin.style.left = `${x}px`;
      coin.style.top = `${y}px`;
      layer.append(coin);
      const angle = (i / COINS) * Math.PI * 2;
      const dx = Math.cos(angle) * 34;
      const dy = Math.sin(angle) * 28 - 10;
      coin.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0, offset: 0 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.4 },
          { transform: 'translate(-50%, -50%) scale(0.7)', opacity: 0, offset: 1 },
        ],
        { duration: 650, delay: i * 25, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' },
      );
    }
  }
  window.setTimeout(() => layer.remove(), 1200);
}
