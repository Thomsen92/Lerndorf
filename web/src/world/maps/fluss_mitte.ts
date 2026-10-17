// Template 'fluss_mitte': the river runs west-east through the middle, the plaza lies north of it.
// A footbridge crosses the river south of the plaza; the lanes south of the river reach the water edge.
import type { MapDef } from './index';

export const FLUSS_MITTE: MapDef = {
  id: 'fluss_mitte',
  name: 'Fluss in der Mitte',
  plaza: { x: 0, z: -14 },
  river: [
    { x: -72, z: -2 },
    { x: -50, z: 4 },
    { x: -28, z: -2 },
    { x: -8, z: 0 },
    { x: 12, z: -2 },
    { x: 32, z: 4 },
    { x: 52, z: 0 },
    { x: 72, z: 4 },
  ],
  lanes: [
    // west road along the north bank
    [
      { x: -58, z: -18 },
      { x: -40, z: -16 },
      { x: -22, z: -14 },
      { x: -8, z: -14 },
    ],
    // east road along the north bank
    [
      { x: 8, z: -14 },
      { x: 22, z: -16 },
      { x: 38, z: -14 },
      { x: 56, z: -18 },
    ],
    // south lane over the river
    [
      { x: 0, z: -6 },
      { x: 2, z: 4 },
      { x: -2, z: 14 },
      { x: 0, z: 30 },
    ],
    // north lane away from the plaza
    [
      { x: 0, z: -22 },
      { x: -4, z: -36 },
      { x: 4, z: -46 },
    ],
    // south-east loop over the river
    [
      { x: 22, z: -16 },
      { x: 28, z: 6 },
      { x: 38, z: 22 },
      { x: 46, z: 34 },
    ],
    // south-west hill
    [
      { x: -22, z: -14 },
      { x: -26, z: 4 },
      { x: -34, z: 22 },
    ],
    // connector: no dead end
    [
      { x: -58, z: -18 },
      { x: -54, z: -24 },
      { x: -52, z: -30 },
    ],
    // connector: no dead end
    [
      { x: 56, z: -18 },
      { x: 44, z: -12 },
      { x: 38, z: -14 },
    ],
  ],
  boardAngle: 4.7,
  benchAngles: [0.8, 2.4, 3.9, 5.5],
  landmarks: [
    { kind: 'steg', x: -2, z: 18 },
    { kind: 'waldhuette', x: 46, z: 40 },
    { kind: 'aussicht', x: -52, z: -30 },
  ],
};
