import { expect, it } from 'vitest';
import { SLOTS, rectCentre, slotAt, slotNear } from '../../src/world/plotPlan';
it('prefers exact hits and reaches only half a metre beyond the nearest rectangle', () => {
  for (const slot of SLOTS) {
    const p = rectCentre(slot);
    expect(slotNear(p.lx, p.lz)).toBe(slot);
  }
  for (const [x, z, id] of [
    [8.01, 5, 'car'],
    [7.99, 5, 'deco_2'],
    [3.3, 5, 'deco_1'],
    [4, 5, undefined],
    [1, 11.4, 'deco_3'],
    [1, 11.6, undefined],
  ] as const) {
    expect(slotNear(x - 5.5, z - 5.5)?.id).toBe(id);
    expect(slotNear(x - 5.5, z - 5.5, 0)).toBe(slotAt(x - 5.5, z - 5.5));
  }
});
