import { describe, it, expect } from 'vitest';
import {
  DRIVEWAY,
  PATH,
  PLOT_COLS,
  PLOT_ROWS,
  ROTATIONS,
  SLOTS,
  rectCentre,
  slotAt,
  type CellRect,
} from '../../src/world/plotPlan';

const cells = (r: CellRect): string[] => {
  const out: string[] = [];
  for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) out.push(`${x},${z}`);
  return out;
};

// docs/ASSET_VERTRAG.md A.2 (Fassung 2)
describe('plot plan', () => {
  it('has the seven slots of the contract with their sizes', () => {
    const by = Object.fromEntries(SLOTS.map((s) => [s.id, `${s.w}x${s.d}`]));
    expect(by).toEqual({
      house: '6x4',
      garage: '3x4',
      car: '3x5',
      deco_1: '3x3',
      deco_2: '3x3',
      deco_3: '3x3',
      deco_4: '3x3',
    });
  });

  it('keeps every slot inside the 11 x 11 grid and no two slots overlap', () => {
    const seen = new Set<string>();
    for (const s of SLOTS) {
      for (const c of cells(s)) {
        const [x, z] = c.split(',').map(Number);
        expect(x >= 0 && x < PLOT_COLS && z >= 0 && z < PLOT_ROWS).toBe(true);
        expect(seen.has(c)).toBe(false);
        seen.add(c);
      }
    }
  });

  it('keeps the footpath free and puts the car pedestal inside the driveway', () => {
    const path = new Set(cells(PATH));
    for (const s of SLOTS) for (const c of cells(s)) expect(path.has(c)).toBe(false);
    const drive = new Set(cells(DRIVEWAY));
    const car = SLOTS.find((s) => s.id === 'car');
    for (const c of cells(car as CellRect)) expect(drive.has(c)).toBe(true);
    for (const s of SLOTS.filter((s) => s.id !== 'car'))
      for (const c of cells(s)) expect(drive.has(c)).toBe(false);
  });

  it('finds the slot under a local point', () => {
    for (const s of SLOTS) {
      const c = rectCentre(s);
      expect(slotAt(c.lx, c.lz)?.id).toBe(s.id);
    }
    expect(slotAt(rectCentre(PATH).lx, rectCentre(PATH).lz)).toBeUndefined();
  });

  it('lets only the square decoration pedestals turn', () => {
    expect(ROTATIONS.deco).toEqual([0, 1, 2, 3]);
    expect(ROTATIONS.house).toEqual([0]);
    expect(ROTATIONS.car).toEqual([0]);
  });
});
