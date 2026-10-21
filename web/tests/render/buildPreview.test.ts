import { describe, expect, it } from 'vitest';
import { autoSlot, fittingSlots, nextRotation, previewSlots } from '../../src/render/buildPreview';

describe('buildPreview', () => {
  it('previewSlots adds the pending item without touching saved', () => {
    const saved = { deco_1: { itemId: 'a', rot: 0 } };
    const out = previewSlots(saved, 'deco_2', { itemId: 'deco_cat_sign', rot: 1 });
    expect(out).not.toBe(saved);
    expect(out.deco_2).toEqual({ itemId: 'deco_cat_sign', rot: 1 });
    expect(out.deco_1).toEqual({ itemId: 'a', rot: 0 });
    expect(saved).toEqual({ deco_1: { itemId: 'a', rot: 0 } });
  });
  it('previewSlots without pending equals saved', () => {
    const saved = { car: { itemId: 'c', rot: 0 } };
    expect(previewSlots(saved, 'deco_1', null)).toEqual(saved);
  });
  it('nextRotation cycles', () => {
    expect(nextRotation('deco', 3)).toBe(0);
    expect(nextRotation('deco', 0)).toBe(1);
    expect(nextRotation('house', 0)).toBe(0);
  });
  it('fittingSlots', () => {
    expect(fittingSlots('car')).toEqual(['car']);
    expect(fittingSlots('deco')).toHaveLength(4);
    expect(fittingSlots('avatar')).toEqual([]);
  });
  it('autoSlot', () => {
    expect(autoSlot('deco', { deco_1: { itemId: 'x', rot: 0 } })).toBe('deco_2');
    expect(autoSlot('car', { car: { itemId: 'x', rot: 0 } })).toBe('car');
    expect(autoSlot('avatar', {})).toBeNull();
    const full = Object.fromEntries(
      ['deco_1', 'deco_2', 'deco_3', 'deco_4'].map((s) => [s, { itemId: 'x', rot: 0 }]),
    );
    expect(autoSlot('deco', full)).toBeNull();
  });
});
