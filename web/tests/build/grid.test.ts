import { describe, it, expect } from 'vitest';
import {
  canPlace,
  cellBlocked,
  cellCentre,
  cellsOf,
  footprintFor,
  placementAt,
  type Placed,
} from '../../src/build/grid';

const GRID = { cols: 7, rows: 6 };

describe('footprintFor', () => {
  it('swaps width and depth on odd quarter turns', () => {
    expect(footprintFor({ w: 2, d: 1 }, 0)).toEqual({ w: 2, d: 1 });
    expect(footprintFor({ w: 2, d: 1 }, 1)).toEqual({ w: 1, d: 2 });
    expect(footprintFor({ w: 2, d: 1 }, 2)).toEqual({ w: 2, d: 1 });
    expect(footprintFor({ w: 2, d: 1 }, 3)).toEqual({ w: 1, d: 2 });
  });
});

describe('cellBlocked', () => {
  it('blocks the back two rows (the house)', () => {
    expect(cellBlocked(0, 0, GRID)).toBe(true);
    expect(cellBlocked(6, 1, GRID)).toBe(true);
    expect(cellBlocked(0, 2, GRID)).toBe(false);
  });

  it('blocks the gate cell in the front centre', () => {
    expect(cellBlocked(3, 5, GRID)).toBe(true);
    expect(cellBlocked(2, 5, GRID)).toBe(false);
  });

  it('blocks everything outside the plot', () => {
    expect(cellBlocked(-1, 3, GRID)).toBe(true);
    expect(cellBlocked(7, 3, GRID)).toBe(true);
    expect(cellBlocked(0, 6, GRID)).toBe(true);
  });
});

describe('canPlace', () => {
  const bench: Placed[] = [];

  it('accepts a free cell in the front area', () => {
    expect(canPlace(0, 3, { w: 2, d: 1 }, GRID, bench)).toEqual({ ok: true });
  });

  it('refuses a footprint that reaches into the house', () => {
    expect(canPlace(0, 1, { w: 2, d: 1 }, GRID, bench).ok).toBe(false);
  });

  it('refuses an overlap with an existing placement', () => {
    const placed: Placed[] = [{ x: 0, z: 3, w: 2, d: 1 }];
    expect(canPlace(1, 3, { w: 1, d: 1 }, GRID, placed).ok).toBe(false);
    expect(canPlace(2, 3, { w: 1, d: 1 }, GRID, placed).ok).toBe(true); // next to it is fine
  });

  it('refuses a footprint that touches the gate', () => {
    expect(canPlace(2, 5, { w: 2, d: 1 }, GRID, bench).ok).toBe(false);
  });
});

describe('cells and centres', () => {
  it('lists every cell of a placement', () => {
    expect(cellsOf({ x: 1, z: 2, w: 2, d: 1 })).toEqual([
      { x: 1, z: 2 },
      { x: 2, z: 2 },
    ]);
  });

  it('finds the placement under a cell', () => {
    const list: Placed[] = [{ x: 0, z: 3, w: 2, d: 1 }];
    expect(placementAt(list, 1, 3)).toBe(list[0]);
    expect(placementAt(list, 4, 3)).toBeUndefined();
  });

  it('centres the grid on the plot', () => {
    expect(cellCentre(0, 0, GRID)).toEqual({ lx: -3, lz: -2.5 });
    expect(cellCentre(3, 3, GRID)).toEqual({ lx: 0, lz: 0.5 });
  });
});
