// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { CollectionCatalog } from '../../src/collection/types';
import { FLIP_MS, MYSTERY_MS, revealCards } from '../../src/collection/cardReveal';

const catalog = JSON.parse(
  readFileSync('public/assets/collection/catalog.json', 'utf8'),
) as CollectionCatalog;
const card = (id: string) => catalog.cards.find((c) => c.id === id)!;
const buttons = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.reveal-actions button'));

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('card reveal after a LearnPass claim', () => {
  it('builds suspense with the mystery sound, then turns the card with a flip sound', () => {
    vi.useFakeTimers();
    const play = vi.fn();
    revealCards({
      cards: [card('night-light')],
      reducedMotion: false,
      sound: { play },
      createRenderer: () => null,
      resolve: (path) => `/x/${path}`,
    });
    expect(play).toHaveBeenCalledWith('mystery');
    expect(document.querySelector('.card-reveal')?.classList.contains('mystery')).toBe(true);
    expect(document.querySelector('.reveal-caption')?.textContent).toContain('Eine Karte wird gezogen');
    expect(document.querySelector('.reveal-actions')?.hasAttribute('hidden')).toBe(true);
    // the printed card waits face down when there is no WebGL
    expect(document.querySelector('.reveal-fallback-back')?.textContent).toBe('?');

    vi.advanceTimersByTime(MYSTERY_MS);
    expect(play).toHaveBeenCalledWith('cardFlip');
    expect(document.querySelector('.card-reveal')?.classList.contains('revealed')).toBe(true);
    expect(document.querySelector('.reveal-fallback')?.classList.contains('flipped')).toBe(true);
    vi.advanceTimersByTime(FLIP_MS);
    const caption = document.querySelector('.reveal-caption')!.textContent!;
    expect(caption).toContain('Neu entdeckt!');
    expect(caption).toContain(card('night-light').name);
    expect(buttons().map((b) => b.textContent)).toEqual(['Weiter']);
  });

  it('shows several cards one after another and closes after the last', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    revealCards({
      cards: [card('night-light'), card('bat-cat')],
      reducedMotion: true,
      createRenderer: () => null,
      onDone,
    });
    vi.advanceTimersByTime(400);
    expect(buttons()[0].textContent).toBe('Nächste Karte');
    buttons()[0].click();
    expect(document.querySelector('.reveal-caption')?.textContent).toContain('Eine Karte wird gezogen');
    vi.advanceTimersByTime(400);
    expect(document.querySelector('.reveal-caption')?.textContent).toContain(card('bat-cat').name);
    buttons()[0].click();
    expect(document.querySelector('.card-reveal')).toBeNull();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('closes and opens the almanach at the drawn card', () => {
    vi.useFakeTimers();
    const onAlmanac = vi.fn();
    revealCards({
      cards: [card('bat-cat')],
      reducedMotion: true,
      createRenderer: () => null,
      onAlmanac,
    });
    vi.advanceTimersByTime(400);
    buttons()[1].click();
    expect(document.querySelector('.card-reveal')).toBeNull();
    expect(onAlmanac).toHaveBeenCalledWith('bat-cat');
  });
});
