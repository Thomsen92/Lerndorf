/**
 * Fixed geometry of the valley. Values are taken from the Stufe-0 prototype
 * (Prototyp/index.html) and must stay in sync with it until the prototype is retired.
 */
import type { Point2 } from './geometry';

export const MAP_SIZE = 130;
export const PLAZA: Point2 = { x: -2, z: 4 };
export const PLAZA_RADIUS = 8;
/** The valley wall: plots and paths stay inside this radius (plus a small allowance). */
export const VALLEY_RADIUS = 52;

/** River control points (centripetal Catmull-Rom spline through them). */
export const RIVER_CONTROL: Point2[] = [
  { x: -70, z: -6 },
  { x: -48, z: -20 },
  { x: -26, z: -13 },
  { x: -6, z: -24 },
  { x: 14, z: -16 },
  { x: 34, z: -26 },
  { x: 52, z: -18 },
  { x: 72, z: -26 },
];

/** Hand-shaped main lanes. Plots attach to them with short garden paths. */
export const LANES: Point2[][] = [
  // west road
  [
    { x: -58, z: 12 },
    { x: -44, z: 16 },
    { x: -30, z: 12 },
    { x: -17, z: 9 },
    { x: -8, z: 6 },
  ],
  // east road
  [
    { x: 5, z: 7 },
    { x: 16, z: 12 },
    { x: 28, z: 6 },
    { x: 42, z: 10 },
    { x: 56, z: 4 },
  ],
  // north lane
  [
    { x: -3, z: 13 },
    { x: -6, z: 24 },
    { x: 2, z: 34 },
    { x: -4, z: 46 },
  ],
  // south-west over the river
  [
    { x: -9, z: -1 },
    { x: -17, z: -6 },
    { x: -24, z: -12 },
    { x: -27, z: -22 },
    { x: -34, z: -34 },
    { x: -42, z: -42 },
  ],
  // south-east over the river
  [
    { x: 28, z: 6 },
    { x: 33, z: -6 },
    { x: 33, z: -19 },
    { x: 31, z: -32 },
    { x: 22, z: -42 },
  ],
  // north-east loop
  [
    { x: 16, z: 12 },
    { x: 20, z: 25 },
    { x: 32, z: 32 },
    { x: 44, z: 30 },
  ],
  // north-west hill
  [
    { x: -30, z: 12 },
    { x: -36, z: 26 },
    { x: -28, z: 38 },
  ],
  // south meadow
  [
    { x: -27, z: -22 },
    { x: -12, z: -36 },
    { x: 2, z: -40 },
  ],
];

/** Index of the board lane entry that faces the quest board (used by the UI later). */
export const BOARD_ANGLE = 1.1;
export const BENCH_ANGLES = [0.2, 2.1, 3.65, 5.0];
