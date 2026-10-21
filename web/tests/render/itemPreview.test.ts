import { describe, it, expect } from 'vitest';
import { previewFrame } from '../../src/render/itemPreview';
import { MAX_SIZE, type SlotKind } from '../../src/world/plotPlan';

const KINDS = Object.keys(MAX_SIZE) as SlotKind[];
const FOV_DEG = 35;

describe('previewFrame', () => {
  it('frames a house from further away than a decoration', () => {
    expect(previewFrame('house').distance).toBeGreaterThan(previewFrame('deco').distance);
  });

  for (const kind of KINDS) {
    it(`the largest ${kind} model fits the ${FOV_DEG} degree vertical field of view`, () => {
      const { w, d, h } = MAX_SIZE[kind];
      const needed = Math.max(w, d, h) / (2 * Math.tan((FOV_DEG / 2) * (Math.PI / 180)));
      expect(previewFrame(kind).distance).toBeGreaterThanOrEqual(needed);
    });

    it(`looks at the middle of a ${kind} model`, () => {
      expect(previewFrame(kind).targetY).toBe(MAX_SIZE[kind].h / 2);
    });
  }
});
