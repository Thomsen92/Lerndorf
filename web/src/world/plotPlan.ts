import { tr } from '../i18n';
/**
 * The fixed plan of every pupil plot (docs/ASSET_VERTRAG.md, Fassung 2, approved 20.10.2026).
 * The same layout on every plot: house, garage with driveway, a car pedestal in the driveway,
 * four decoration pedestals of 3 x 3 cells and a footpath from the gate to the front door.
 * Cells are 1 m. x runs left to right as seen from the street, z from the back (0) to the street.
 * The server checks the same slot names and kinds (place_in_slot, migration 0013).
 * Pure data and maths, tested in Node.
 */

export const PLOT_COLS = 11;
export const PLOT_ROWS = 11;
/** Grass margin between the grid and the fence, on each side. */
export const PLOT_MARGIN = 0.7;
/** Width and depth of a plot including the margin. */
export const PLOT_W = PLOT_COLS + 2 * PLOT_MARGIN;
export const PLOT_D = PLOT_ROWS + 2 * PLOT_MARGIN;

export type SlotKind = 'house' | 'garage' | 'car' | 'deco';
export type SlotId = 'house' | 'garage' | 'car' | 'deco_1' | 'deco_2' | 'deco_3' | 'deco_4';

export interface CellRect {
  /** First cell (left, back). */
  x: number;
  z: number;
  /** Width and depth in cells. */
  w: number;
  d: number;
}

export interface SlotDef extends CellRect {
  id: SlotId;
  kind: SlotKind;
  /** Label for the pupil. */
  nameDe: string;
}

export const SLOTS: readonly SlotDef[] = [
  { id: 'house', kind: 'house', nameDe: tr('Haus'), x: 1, z: 0, w: 6, d: 4 },
  { id: 'garage', kind: 'garage', nameDe: tr('Garage'), x: 8, z: 0, w: 3, d: 4 },
  { id: 'car', kind: 'car', nameDe: tr('Auto-Platz'), x: 8, z: 4, w: 3, d: 5 },
  { id: 'deco_1', kind: 'deco', nameDe: tr('Deko-Platz 1'), x: 0, z: 4, w: 3, d: 3 },
  { id: 'deco_2', kind: 'deco', nameDe: tr('Deko-Platz 2'), x: 5, z: 4, w: 3, d: 3 },
  { id: 'deco_3', kind: 'deco', nameDe: tr('Deko-Platz 3'), x: 0, z: 8, w: 3, d: 3 },
  { id: 'deco_4', kind: 'deco', nameDe: tr('Deko-Platz 4'), x: 5, z: 8, w: 3, d: 3 },
];

/** Areas that belong to the plot itself and never take an asset. */
export const PATH: CellRect = { x: 3, z: 4, w: 2, d: 7 }; // gate -> front door
export const DRIVEWAY: CellRect = { x: 8, z: 4, w: 3, d: 7 }; // garage -> street, car pedestal inside

/** Highest visible size of an asset per kind, in metres (width, depth, height). */
export const MAX_SIZE: Record<SlotKind, { w: number; d: number; h: number }> = {
  house: { w: 6.0, d: 4.0, h: 6.0 },
  garage: { w: 3.0, d: 4.0, h: 3.5 },
  car: { w: 2.4, d: 4.6, h: 2.2 },
  deco: { w: 3.0, d: 3.0, h: 3.0 },
};

/** Allowed rotations in quarter turns. Only the square decoration pedestals may turn. */
export const ROTATIONS: Record<SlotKind, readonly number[]> = {
  house: [0],
  garage: [0],
  car: [0],
  deco: [0, 1, 2, 3],
};

/**
 * Item used when a slot that may not stay empty has no placement (every pupil owns it).
 * The house slot has none: it shows the ruin until the tutorial house is placed.
 */
export const STARTER: Partial<Record<SlotKind, string>> = {
  garage: 'garage_holz',
};

export function slotById(id: string): SlotDef | undefined {
  return SLOTS.find((s) => s.id === id);
}

/** Item kind of the catalogue (items.kind) that a slot accepts. */
export function slotAccepts(slot: SlotDef, itemKind: string): boolean {
  return slot.kind === itemKind;
}

/** Centre of a cell rectangle in plot-local metres (plot centre 0/0, +z towards the street). */
export function rectCentre(r: CellRect): { lx: number; lz: number } {
  return {
    lx: r.x + r.w / 2 - PLOT_COLS / 2,
    lz: r.z + r.d / 2 - PLOT_ROWS / 2,
  };
}

/** The slot under a plot-local point, if any. */
export function slotAt(lx: number, lz: number): SlotDef | undefined {
  const cx = lx + PLOT_COLS / 2;
  const cz = lz + PLOT_ROWS / 2;
  return SLOTS.find((s) => cx >= s.x && cx < s.x + s.w && cz >= s.z && cz < s.z + s.d);
}

export const TAP_MARGIN = 0.5;
export function slotNear(lx: number, lz: number, margin = TAP_MARGIN): SlotDef | undefined {
  const exact = slotAt(lx, lz);
  if (exact || margin <= 0) return exact;
  const x = lx + PLOT_COLS / 2,
    z = lz + PLOT_ROWS / 2;
  let nearest: SlotDef | undefined;
  let distance = Infinity;
  for (const slot of SLOTS) {
    const d = Math.hypot(
      Math.max(slot.x - x, 0, x - slot.x - slot.w),
      Math.max(slot.z - z, 0, z - slot.z - slot.d),
    );
    if (d <= margin && d < distance) {
      nearest = slot;
      distance = d;
    }
  }
  return nearest;
}

/** Local x of the footpath centre (the gate and the front door line up on it). */
export const PATH_X = rectCentre(PATH).lx;
/** Local z of the house front (front door). */
export const HOUSE_FRONT_Z = SLOTS[0].z + SLOTS[0].d - PLOT_ROWS / 2;
/** Plot-local z where the own figure stands in the tutorial: on the footpath, 1.6 m in front of the door. */
export const TUTORIAL_FIGURE_LZ = HOUSE_FRONT_Z + 1.6;
/** Id the client puts into the house slot instead of a catalogue item until the tutorial house is placed. */
export const RUIN_ID = 'ruin';
/** Local x of the driveway centre (the opening in the fence). */
export const DRIVEWAY_X = rectCentre(DRIVEWAY).lx;
