// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { celebrate, CELEBRATION_MS } from '../../src/ui/celebration';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('pops up a big word with confetti and the fanfare, never catching a tap, and goes away', () => {
  vi.useFakeTimers();
  const play = vi.fn();
  celebrate({
    theme: 'spooky',
    subtitle: 'Quiz geschafft!',
    sound: { play },
    reduced: false,
    random: () => 0.5,
  });
  const layer = document.querySelector('.celebration') as HTMLElement;
  expect(layer.classList.contains('spooky')).toBe(true);
  expect(layer.getAttribute('aria-hidden')).toBe('true');
  expect(layer.querySelector('.celebration-title')?.textContent).toBe('Geschafft!');
  expect(layer.querySelector('.celebration-sub')?.textContent).toBe('Quiz geschafft!');
  expect(layer.querySelectorAll('.confetti').length).toBeGreaterThan(50);
  expect(play).toHaveBeenCalledWith('victory');
  vi.advanceTimersByTime(CELEBRATION_MS);
  expect(document.querySelector('.celebration')).toBeNull();
});

it('shows only the word with reduced motion, and a second call replaces the first', () => {
  celebrate({ reduced: true });
  celebrate({ reduced: true, title: 'Yay' });
  const layers = document.querySelectorAll('.celebration');
  expect(layers.length).toBe(1);
  expect(layers[0].querySelectorAll('.confetti').length).toBe(0);
  expect(layers[0].textContent).toBe('Yay');
});
