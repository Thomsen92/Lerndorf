import { expect, it } from 'vitest';
import { slotLook, pulseOpacity } from '../../src/render/buildMode';
import { slotById } from '../../src/world/plotPlan';
it('marks free, occupied, selected and incompatible slots beyond colour alone', () => {
  expect(slotLook(slotById('deco_2')!, {}, null, null)).toMatchObject({ free: true, icon: '🌷' });
  expect(slotLook(slotById('deco_1')!, { deco_1: { itemId: 'bench', rot: 0 } }, null, null)).toMatchObject({
    free: false,
    icon: null,
  });
  expect(slotLook(slotById('house')!, { house: { itemId: 'ruin', rot: 0 } }, 'house', null)).toMatchObject({
    free: true,
    icon: '🏠',
    selected: true,
    frame: 0.3,
  });
  expect(slotLook(slotById('deco_2')!, {}, null, 'car')).toMatchObject({ dimmed: true, icon: null });
  expect(pulseOpacity(0, false)).not.toBe(pulseOpacity(0.75, false));
  for (let t = 0; t < 3; t += 0.1) {
    expect(pulseOpacity(t, false)).toBeGreaterThanOrEqual(0.45 - 1e-10);
    expect(pulseOpacity(t, false)).toBeLessThanOrEqual(0.95);
    expect(pulseOpacity(t, true)).toBe(0.8);
  }
});
