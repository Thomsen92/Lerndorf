// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NAV_BUTTONS, createGameNav, navButtonFor, type GameNav } from '../../src/ui/gameNav';

let onSelect: ReturnType<typeof vi.fn>;
let onAccount: ReturnType<typeof vi.fn>;
let onNews: ReturnType<typeof vi.fn>;
let nav: GameNav;

const buttons = (): HTMLButtonElement[] => [...nav.el.querySelectorAll<HTMLButtonElement>('button.nav-btn')];
const live = (): HTMLElement => nav.el.querySelector<HTMLElement>('[role="status"]')!;

beforeEach(() => {
  document.body.innerHTML = '';
  onSelect = vi.fn();
  onAccount = vi.fn();
  onNews = vi.fn();
  nav = createGameNav({ nickname: 'Fuchs', coins: 130, onSelect, onAccount, onNews });
  document.body.append(nav.el);
});

describe('gameNav', () => {
  it('shows remaining quests or a completed day without selecting a profile nav entry', () => {
    nav.setQuestBadge(2);
    expect(nav.el.querySelector('.quest-badge')?.textContent).toBe('2');
    expect(nav.el.querySelector('[data-area=aufgaben]')?.getAttribute('aria-label')).toContain(
      '2 Quests offen',
    );
    nav.setQuestBadge('done');
    expect(nav.el.querySelector('.quest-badge')?.textContent).toBe('✓');
    nav.setQuestBadge(null);
    expect(nav.el.querySelector('.quest-badge')).toBeNull();
    nav.setActive('profil');
    expect(nav.el.querySelector('[aria-current=page]')).toBeNull();
  });
  it('maps areas to nav buttons', () => {
    expect(NAV_BUTTONS).toEqual(['aufgaben', 'haus']);
    expect(navButtonFor('bauen')).toBe('haus');
    expect(navButtonFor('shop')).toBe('haus');
    expect(navButtonFor('inventar')).toBe('haus');
    expect(navButtonFor('dorf')).toBeNull();
  });

  it('has just two accessible icon buttons beside the avatar status', () => {
    expect(nav.el.tagName).toBe('NAV');
    expect(nav.el.getAttribute('aria-label')).toBe('Hauptmenü');
    expect(buttons()).toHaveLength(2);
    expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual(['Aufgaben', 'Mein Haus']);
    expect(nav.el.querySelector('[data-area=dorf]')).toBeNull();
    for (const b of buttons()) {
      expect(b.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(b.querySelector('.nav-label')?.textContent?.length).toBeGreaterThan(0);
      expect(b.querySelector('svg')).not.toBeNull();
      expect(b.querySelector('.nav-label')?.classList.contains('sr-only')).toBe(true);
    }
    expect(buttons().map((b) => b.querySelector('.nav-label')?.textContent)).toEqual([
      'Aufgaben',
      'Mein Haus',
    ]);
  });

  it('opens the news feed from the bell under the avatar', () => {
    const bell = nav.el.querySelector<HTMLButtonElement>('.nav-bell')!;
    expect(bell.getAttribute('aria-label')).toBe('Neuigkeiten');
    expect(nav.el.querySelector('.nav-user')?.lastElementChild).toBe(bell);
    bell.click();
    expect(onNews).toHaveBeenCalledOnce();
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
    const haus = buttons()[1]!;
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

it('offers Sir Byte as a camera shortcut and blocks it during the tutorial', () => {
  const onByte = vi.fn();
  const shortcut = createGameNav({ nickname: 'Fuchs', coins: 0, onSelect, onAccount, onByte });
  const b = shortcut.el.querySelector<HTMLButtonElement>('.nav-byte')!;
  expect(b).not.toBeNull();
  expect(b.querySelector('img')?.src).toContain('sir-byte/preview.png');
  b.click();
  expect(onByte).toHaveBeenCalledWith(b);
  shortcut.setLocked(true);
  b.click();
  expect(onByte).toHaveBeenCalledTimes(1);
  expect(b.getAttribute('aria-disabled')).toBe('true');
  shortcut.setLocked(false);
  b.click();
  expect(onByte).toHaveBeenCalledTimes(2);
});
