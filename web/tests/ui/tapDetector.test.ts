import { describe, expect, it } from 'vitest';
import { createTapDetector } from '../../src/ui/tapDetector';

describe('tap detector', () => {
  it('single short tap is a tap', () => {
    const t = createTapDetector();
    t.down(1, 10, 10);
    expect(t.up(1, 12, 11)).toBe(true);
  });
  it('move over 8 px is not a tap', () => {
    const t = createTapDetector();
    t.down(1, 0, 0);
    expect(t.up(1, 9, 0)).toBe(false);
  });
  it('never treats a drag returning to its starting point as a tap', () => {
    const t = createTapDetector();
    t.down(1, 0, 0);
    t.move(1, 80, 0);
    t.move(1, 0, 0);
    expect(t.up(1, 0, 0)).toBe(false);
  });
  it('two pointers are never a tap, also the last finger lifted', () => {
    const t = createTapDetector();
    t.down(1, 0, 0);
    t.down(2, 5, 5);
    expect(t.up(2, 5, 5)).toBe(false);
    expect(t.up(1, 0, 0)).toBe(false);
    t.down(3, 0, 0);
    expect(t.up(3, 0, 0)).toBe(true);
  });
  it('pointercancel is not a tap', () => {
    const t = createTapDetector();
    t.down(1, 0, 0);
    t.cancel(1);
    expect(t.up(1, 0, 0)).toBe(false);
    t.down(2, 0, 0);
    expect(t.up(2, 0, 0)).toBe(true);
  });
  it('a lost pointerup does not block later taps (new primary pointer)', () => {
    const t = createTapDetector();
    t.down(1, 0, 0, true); // never released
    t.down(2, 5, 5, true);
    expect(t.up(2, 5, 5)).toBe(true);
  });
  it('release at window level frees the pointer', () => {
    const t = createTapDetector();
    t.down(1, 0, 0);
    t.release(1);
    t.down(2, 0, 0);
    expect(t.up(2, 0, 0)).toBe(true);
  });
});
