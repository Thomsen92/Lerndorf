import { describe, it, expect } from 'vitest';
import { decorationPose } from '../../src/render/placements';
import type { Plot } from '../../src/world/layout';

const GRID = { cols: 7, rows: 6 };
const plot = { index: 0, x: 10, z: 5, h: 1, face: 0 } as Plot;

describe('decorationPose', () => {
  it('puts a single cell at the right world position on an unrotated plot', () => {
    // local centre of cell (0,0) is (-3, -2.5)
    const p = decorationPose(plot, 0, 0, 1, 1, GRID);
    expect(p.x).toBeCloseTo(7, 6);
    expect(p.z).toBeCloseTo(2.5, 6);
    expect(p.y).toBeCloseTo(1.35, 6);
  });

  it('centres a 2 x 1 footprint between its two cells', () => {
    const p = decorationPose(plot, 0, 3, 2, 1, GRID);
    // cells (0,3) and (1,3): centre lx = -3 + 0.5, lz = 0.5
    expect(p.x).toBeCloseTo(10 - 2.5, 6);
    expect(p.z).toBeCloseTo(5 + 0.5, 6);
  });

  it('turns with the plot', () => {
    const turned = { ...plot, face: Math.PI / 2 } as Plot;
    const p = decorationPose(turned, 3, 3, 1, 1, GRID);
    // local (0, 0.5) rotated by 90 degrees around the plot centre
    expect(p.x).toBeCloseTo(10 + 0.5, 6);
    expect(p.z).toBeCloseTo(5, 6);
  });
});
