import { tr } from '../../i18n';
// Template 'bach_norden': a narrow creek runs along the north edge; the plaza lies east of the
// valley centre with lanes in all directions. Lanes north of the plaza cross the creek.
import type { MapDef } from './index';

export const BACH_NORDEN: MapDef = {
  id: 'bach_norden',
  name: tr('Bach im Norden'),
  plaza: { x: 6, z: 6 },
  river: [
    { x: 60, z: -40 },
    { x: 44, z: -30 },
    { x: 30, z: -24 },
    { x: 14, z: -22 },
    { x: -2, z: -30 },
    { x: -20, z: -34 },
    { x: -40, z: -40 },
    { x: -60, z: -38 },
  ],
  lanes: [
    // west road
    [
      { x: -56, z: 8 },
      { x: -40, z: 10 },
      { x: -24, z: 6 },
      { x: -2, z: 6 },
    ],
    // east road
    [
      { x: 15, z: 6 },
      { x: 34, z: 10 },
      { x: 48, z: 4 },
      { x: 60, z: 8 },
    ],
    // south lane
    [
      { x: 6, z: 16 },
      { x: 8, z: 28 },
      { x: 4, z: 40 },
    ],
    // north lane over the creek
    [
      { x: 6, z: -6 },
      { x: 4, z: -16 },
      { x: 2, z: -24 },
      { x: 0, z: -34 },
    ],
    // south-west hill
    [
      { x: -4, z: 12 },
      { x: -18, z: 26 },
      { x: -30, z: 36 },
    ],
    // north-east corner
    [
      { x: 15, z: 6 },
      { x: 28, z: -8 },
      { x: 40, z: -16 },
    ],
    // connector: no dead end
    [
      { x: 60, z: 8 },
      { x: 52, z: 14 },
      { x: 46, z: 16 },
    ],
    // connector: no dead end
    [
      { x: 40, z: -16 },
      { x: 24, z: -30 },
      { x: 8, z: -34 },
    ],
    // connector: no dead end
    [
      { x: -56, z: 8 },
      { x: -48, z: 6 },
      { x: -42, z: 2 },
    ],
  ],
  boardAngle: 2.6,
  benchAngles: [0.4, 2.0, 3.6, 5.2],
  landmarks: [
    { kind: 'muehle', x: -42, z: 2 },
    { kind: 'obstwiese', x: 46, z: 16 },
    { kind: 'aussicht', x: -32, z: 42 },
  ],
};
