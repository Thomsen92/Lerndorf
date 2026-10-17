// Template 'tal': the Stufe-0 valley (river to the south, plaza in the middle). From the prototype.
import type { MapDef } from './index';

export const TAL: MapDef = {
  id: 'tal',
  name: 'Tal',
  plaza: { x: -2, z: 4 },
  river: [
    { x: -70, z: -6 },
    { x: -48, z: -20 },
    { x: -26, z: -13 },
    { x: -6, z: -24 },
    { x: 14, z: -16 },
    { x: 34, z: -26 },
    { x: 52, z: -18 },
    { x: 72, z: -26 },
  ],
  lanes: [
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
    // connector: no dead end
    [
      { x: -42, z: -42 },
      { x: -24, z: -44 },
      { x: 2, z: -44 },
    ],
    // connector: no dead end
    [
      { x: 56, z: 4 },
      { x: 54, z: 16 },
      { x: 46, z: 28 },
    ],
    // connector: no dead end
    [
      { x: -58, z: 12 },
      { x: -50, z: 26 },
      { x: -36, z: 34 },
    ],
  ],
  boardAngle: 1.1,
  benchAngles: [0.2, 2.1, 3.65, 5.0],
  landmarks: [
    { kind: 'aussicht', x: -36, z: 34 },
    { kind: 'muehle', x: 44, z: 36 },
    { kind: 'obstwiese', x: 2, z: -44 },
  ],
};
