/**
 * Grid rules of the own plot (SPEC §10): cells of 1 m, the house takes the back two rows,
 * the gate is the front centre cell. The server checks the same rules (cell_blocked, place_item);
 * this module lets the screen show green or red before the pupil taps "Setzen".
 * Pure functions, tested in Node.
 */

export interface Footprint {
  w: number;
  d: number;
}

export interface Placed {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface GridSize {
  cols: number;
  rows: number;
}

/** Footprint after a rotation of `rot` quarter turns (odd turns swap width and depth). */
export function footprintFor(base: Footprint, rot: number): Footprint {
  return rot % 2 === 1 ? { w: base.d, d: base.w } : { w: base.w, d: base.d };
}

/** Same rule as settings in the database: house back two rows, gate at the front centre. */
export function cellBlocked(x: number, z: number, grid: GridSize): boolean {
  if (x < 0 || z < 0 || x >= grid.cols || z >= grid.rows) return true;
  return z < 2 || (x === Math.floor(grid.cols / 2) && z === grid.rows - 1);
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

/** Can an item with this footprint start at (x, z)? Mirrors place_item in the database. */
export function canPlace(x: number, z: number, fp: Footprint, grid: GridSize, placed: Placed[]): PlaceCheck {
  for (let cx = x; cx < x + fp.w; cx++) {
    for (let cz = z; cz < z + fp.d; cz++) {
      if (cellBlocked(cx, cz, grid))
        return { ok: false, reason: 'Hier ist kein Platz (Haus oder außerhalb)' };
    }
  }
  const overlaps = placed.some((p) => x < p.x + p.w && p.x < x + fp.w && z < p.z + p.d && p.z < z + fp.d);
  if (overlaps) return { ok: false, reason: 'Hier steht schon etwas' };
  return { ok: true };
}

/** Which cells a placement covers. */
export function cellsOf(p: Placed): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [];
  for (let x = p.x; x < p.x + p.w; x++) for (let z = p.z; z < p.z + p.d; z++) out.push({ x, z });
  return out;
}

/** The placement under a cell, if any. */
export function placementAt<T extends Placed>(list: T[], x: number, z: number): T | undefined {
  return list.find((p) => cellsOf(p).some((c) => c.x === x && c.z === z));
}

/**
 * Local position (metres, plot centre at 0,0; +z points to the front gate) of a cell's centre.
 * The grid is centred on the plot.
 */
export function cellCentre(x: number, z: number, grid: GridSize): { lx: number; lz: number } {
  return {
    lx: x - (grid.cols - 1) / 2,
    lz: z - (grid.rows - 1) / 2,
  };
}
