// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { applyUiScale, readUiScale, setUiScale, UI_SCALE_KEY } from '../../src/ui/uiScale';

it('defaults to medium and remembers the choice', () => {
  localStorage.clear();
  expect(readUiScale()).toBe('m');
  setUiScale('l');
  expect(localStorage.getItem(UI_SCALE_KEY)).toBe('l');
  expect(document.documentElement.dataset.ui).toBe('l');
  expect(readUiScale()).toBe('l');
  applyUiScale('s');
  expect(document.documentElement.dataset.ui).toBe('s');
});

it('offers a mini size for desktop screens', () => {
  localStorage.clear();
  setUiScale('xs');
  expect(readUiScale()).toBe('xs');
  expect(document.documentElement.dataset.ui).toBe('xs');
});

it('falls back to medium when storage throws', () => {
  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  expect(readUiScale(broken)).toBe('m');
});
