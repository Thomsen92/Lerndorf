// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { openHouseMenu } from '../../src/ui/houseMenu';

const cbs = () => ({ onBuild: vi.fn(), onShop: vi.fn(), onInventory: vi.fn(), onSettings: vi.fn(), onBack: vi.fn() });
const buttons = (): HTMLButtonElement[] => [...document.querySelectorAll<HTMLButtonElement>('.house-menu button')];

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('houseMenu', () => {
  it('is a non-modal region titled Mein Haus', () => {
    openHouseMenu(cbs());
    const r = document.querySelector('[role="region"]')!;
    const h = r.querySelector('h2')!;
    expect(h.textContent).toBe('Mein Haus');
    expect(r.getAttribute('aria-labelledby')).toBe(h.id);
    expect(r.getAttribute('aria-modal')).toBeNull();
  });
  it('has five buttons in order, each calling its callback', () => {
    const c = cbs();
    openHouseMenu(c);
    expect(buttons().map((b) => b.textContent)).toEqual(['Bauen', 'Shop', 'Inventar', 'Einstellungen', 'Zurück']);
    buttons().forEach((b) => b.click());
    expect(c.onBuild).toHaveBeenCalledOnce();
    expect(c.onShop).toHaveBeenCalledOnce();
    expect(c.onInventory).toHaveBeenCalledOnce();
    expect(c.onSettings).toHaveBeenCalledWith(buttons()[3]);
    expect(c.onBack).toHaveBeenCalledOnce();
  });
  it('focuses Bauen and Escape goes back', () => {
    const c = cbs();
    openHouseMenu(c);
    expect(document.activeElement).toBe(buttons()[0]);
    buttons()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(c.onBack).toHaveBeenCalledOnce();
  });
  it('close removes it without callbacks', () => {
    const c = cbs();
    openHouseMenu(c).close();
    expect(document.querySelector('.house-menu')).toBeNull();
    expect(c.onBack).not.toHaveBeenCalled();
  });
});
