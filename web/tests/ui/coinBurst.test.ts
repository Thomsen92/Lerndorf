// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { coinBurst } from '../../src/ui/coinBurst';

function stubAnimation(): void {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: () => ({ finished: Promise.resolve() }),
  });
}

it('pops coins, plays the coin sound and cleans up', async () => {
  stubAnimation();
  const counter = document.createElement('span');
  counter.textContent = '10 Münzen';
  document.body.append(counter);
  const play = vi.fn();
  coinBurst({ at: counter, amount: 50, sound: { play } });
  expect(play).toHaveBeenCalledWith('coins');
  expect(document.querySelectorAll('.coin-burst-coin').length).toBe(12);
  expect(document.querySelector('.coin-burst-gain')?.textContent).toBe('+50');
  await new Promise((r) => setTimeout(r, 1300));
  expect(document.querySelector('.coin-burst')).toBeNull();
});

it('shows only the label with reduced motion', () => {
  stubAnimation();
  const counter = document.createElement('span');
  document.body.append(counter);
  coinBurst({ at: counter, amount: 10, reduced: true });
  expect(document.querySelectorAll('.coin-burst-coin').length).toBe(0);
  expect(document.querySelector('.coin-burst-gain')?.textContent).toBe('+10');
});
