// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openAccountMenu } from '../../src/ui/accountMenu';
import type { ModalHandle } from '../../src/ui/dialog';

let handle: ModalHandle | null = null;
let opener: HTMLButtonElement;

function setup(over: Partial<Parameters<typeof openAccountMenu>[0]> = {}) {
  const opts = {
    opener,
    nickname: 'Mia',
    coins: 42,
    quality: 'auto' as const,
    onQuality: vi.fn(),
    onLedger: vi.fn(),
    onLogout: vi.fn(),
    ...over,
  };
  handle = openAccountMenu(opts);
  return { opts, handle };
}
const btn = (label: string): HTMLButtonElement => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent === label);
  if (!b) throw new Error(`button ${label} not found`);
  return b as HTMLButtonElement;
};

beforeEach(() => {
  document.body.innerHTML = '<main><button id="menu-btn">Menü</button></main>';
  opener = document.getElementById('menu-btn') as HTMLButtonElement;
});
afterEach(() => {
  handle?.close();
  handle = null;
});

describe('openAccountMenu', () => {
  it('opens a modal titled Einstellungen showing nickname and coins', () => {
    setup();
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(document.querySelector('h2')?.textContent).toBe('Einstellungen');
    const text = document.querySelector('.modal-body')?.textContent ?? '';
    expect(text).toContain('Mia');
    expect(text).toContain('42');
  });

  it('offers three quality buttons with the current choice pressed', () => {
    setup({ quality: 'low' });
    const group = document.querySelector('[role="group"]');
    expect(group?.getAttribute('aria-label')).toBe('Grafik-Qualität');
    expect(group?.classList.contains('seg')).toBe(true);
    expect(group?.querySelectorAll('button')).toHaveLength(3);
    expect(btn('Niedrig').getAttribute('aria-pressed')).toBe('true');
    expect(btn('Auto').getAttribute('aria-pressed')).toBe('false');
    expect(btn('Hoch').getAttribute('aria-pressed')).toBe('false');
  });

  it('choosing Hoch calls onQuality and updates aria-pressed', () => {
    const { opts } = setup();
    btn('Hoch').click();
    expect(opts.onQuality).toHaveBeenCalledWith('high');
    expect(btn('Hoch').getAttribute('aria-pressed')).toBe('true');
    expect(btn('Auto').getAttribute('aria-pressed')).toBe('false');
  });

  it('Kontoauszug closes the menu before calling onLedger', () => {
    let openWhenCalled: boolean | null = null;
    const { handle: h } = setup({
      onLedger: () => {
        openWhenCalled = h.isOpen;
      },
    });
    btn('Kontoauszug').click();
    expect(openWhenCalled).toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Abmelden calls onLogout', () => {
    const { opts } = setup();
    btn('Abmelden').click();
    expect(opts.onLogout).toHaveBeenCalledTimes(1);
  });
});
