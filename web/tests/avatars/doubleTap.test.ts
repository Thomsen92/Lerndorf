import { describe, expect, it } from 'vitest';
import { createDoubleTap } from '../../src/avatars/doubleTap';

describe('double tap', () => {
  it('second tap on the same figure within the window is a double tap', () => {
    const tap = createDoubleTap(350);
    expect(tap('a', 1000)).toBe('single');
    expect(tap('a', 1300)).toBe('double');
  });
  it('too slow, or another figure, stays single', () => {
    const tap = createDoubleTap(350);
    expect(tap('a', 0)).toBe('single');
    expect(tap('a', 400)).toBe('single');
    expect(tap('b', 500)).toBe('single');
  });
  it('a third quick tap starts fresh', () => {
    const tap = createDoubleTap(350);
    tap('a', 0);
    expect(tap('a', 100)).toBe('double');
    expect(tap('a', 200)).toBe('single');
  });
});
