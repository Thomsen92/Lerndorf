// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openCharacterPicker } from '../../src/ui/characterPicker';
import { characterOf } from '../../src/api/village';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
afterEach(() => {
  document.body.innerHTML = '';
});

describe('character picker', () => {
  it('offers boy and girl and saves the choice', async () => {
    const onPick = vi.fn().mockResolvedValue(null);
    const m = openCharacterPicker({ required: true, current: null, onPick });
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.character-choice')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Junge', 'Mädchen']);
    const close = [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Schließen');
    expect(close?.hidden).toBe(true);
    buttons[1].click();
    await flush();
    expect(onPick).toHaveBeenCalledWith('girl');
    expect(m.isOpen).toBe(false);
  });
  it('stays open with the message when saving fails', async () => {
    const m = openCharacterPicker({ required: true, current: null, onPick: vi.fn().mockResolvedValue('Fehler X') });
    document.querySelector<HTMLButtonElement>('.character-choice')?.click();
    await flush();
    expect(m.isOpen).toBe(true);
    expect(document.querySelector('.status')?.textContent).toBe('Fehler X');
  });
  it('marks the current figure', () => {
    openCharacterPicker({ required: false, current: 'boy', onPick: vi.fn() });
    expect(document.querySelector('[data-character="boy"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('.modal h2, [role=dialog] h2')?.textContent ?? '').toContain('Figur wechseln');
  });
});

describe('characterOf', () => {
  it('reads avatar.character', () => {
    expect(characterOf({ character: 'girl' })).toBe('girl');
    expect(characterOf({ character: 'robot' })).toBeNull();
    expect(characterOf({})).toBeNull();
    expect(characterOf(null)).toBeNull();
  });
});
