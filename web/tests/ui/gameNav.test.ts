// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_BUTTONS, createGameNav, navButtonFor, type GameNav } from '../../src/ui/gameNav';

let onSelect: ReturnType<typeof vi.fn>;
let onAccount: ReturnType<typeof vi.fn>;
let nav: GameNav;

const buttons = (): HTMLButtonElement[] => [...nav.el.querySelectorAll<HTMLButtonElement>('button.nav-btn')];
const live = (): HTMLElement => nav.el.querySelector<HTMLElement>('[role="status"]')!;

beforeEach(() => {
  document.body.innerHTML = '';
  onSelect = vi.fn();
  onAccount = vi.fn();
  nav = createGameNav({ nickname: 'Fuchs', coins: 130, onSelect, onAccount });
  document.body.append(nav.el);
});

describe('gameNav', () => {
  it('maps areas to nav buttons', () => {
    expect(NAV_BUTTONS).toEqual(['dorf', 'aufgaben', 'haus']);
    expect(navButtonFor('bauen')).toBe('haus');
    expect(navButtonFor('shop')).toBe('haus');
    expect(navButtonFor('inventar')).toBe('haus');
    expect(navButtonFor('dorf')).toBe('dorf');
  });

  it('is a labelled nav with three text buttons in order', () => {
    expect(nav.el.tagName).toBe('NAV');
    expect(nav.el.getAttribute('aria-label')).toBe('Hauptmenü');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['🏘Dorf', '📋Aufgaben', '🏠Mein Haus']);
    for (const b of buttons()) {
      expect(b.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(b.querySelector('.nav-label')?.textContent?.length).toBeGreaterThan(0);
    }
    expect(buttons().map((b) => b.querySelector('.nav-label')?.textContent)).toEqual(['Dorf', 'Aufgaben', 'Mein Haus']);
  });

  it('marks exactly one button active', () => {
    nav.setActive('shop');
    let marked = buttons().filter((b) => b.getAttribute('aria-current') === 'page');
    expect(marked.map((b) => b.querySelector('.nav-label')?.textContent)).toEqual(['Mein Haus']);
    expect(buttons().filter((b) => b.classList.contains('active'))).toEqual(marked);
    nav.setActive('aufgaben');
    marked = buttons().filter((b) => b.getAttribute('aria-current') === 'page');
    expect(marked.map((b) => b.querySelector('.nav-label')?.textContent)).toEqual(['Aufgaben']);
    expect(buttons().filter((b) => b.classList.contains('active'))).toEqual(marked);
  });

  it('calls onSelect with the area and button', () => {
    const haus = buttons()[2]!;
    haus.click();
    expect(onSelect).toHaveBeenCalledWith('haus', haus);
  });

  it('shows nickname and coins in the status button and opens the account', () => {
    expect(nav.status.tagName).toBe('BUTTON');
    expect(nav.status.textContent).toContain('Fuchs');
    expect(nav.status.textContent).toContain('130 Münzen');
    expect(nav.status.getAttribute('aria-haspopup')).toBe('dialog');
    expect(nav.status.getAttribute('aria-label')).toBe('Fuchs, 130 Münzen – Einstellungen öffnen');
    nav.setCoins(140);
    expect(nav.status.getAttribute('aria-label')).toBe('Fuchs, 140 Münzen – Einstellungen öffnen');
    nav.status.click();
    expect(onAccount).toHaveBeenCalledWith(nav.status);
  });

  it('announces a gain with a +10 tag', () => {
    nav.setCoins(140);
    expect(live().getAttribute('aria-live')).toBe('polite');
    expect(live().textContent).toBe('Du hast jetzt 140 Münzen.');
    expect(nav.status.textContent).toContain('140 Münzen');
    expect(nav.el.querySelector('.gain')?.textContent).toBe('+10');
  });

  it('announces a loss without a gain tag', () => {
    nav.setCoins(120);
    expect(live().textContent).toBe('Du hast jetzt 120 Münzen.');
    expect(nav.el.querySelector('.gain')).toBeNull();
  });
});
