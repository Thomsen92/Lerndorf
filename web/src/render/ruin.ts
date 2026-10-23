/**
 * The ruin: a run-down house that stands in the house slot until the pupil has bought and placed
 * the tutorial house (docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md §9.6).
 * It is built from Kenney parts (CC0, blender/sources/LICENSES.md): Fantasy Town walls, planks and
 * roof, Survival Kit metal patches, Graveyard debris. It is no shop item and never in the inventory.
 *
 * Contract like every house model (docs/ASSET_VERTRAG.md B.1): origin in the middle of the 6 x 4
 * footprint on the ground, front towards +Z, nothing outside 6.0 x 4.0 m and 6.0 m high.
 */
import * as THREE from 'three';
import { kenneyModel, type Pack } from './kenney';

/** Id that the client puts into the house slot instead of a catalogue item. */
export const RUIN_ID = 'ruin';

export interface RuinPart {
  pack: Pack;
  name: string;
  /** Centre of the tile on the ground, in metres from the middle of the footprint. */
  x: number;
  z: number;
  y?: number;
  /** Turn around the vertical axis, radians. */
  rot: number;
  /** Uniform scale of the Kenney tile (one tile is 1 m before scaling). */
  scale: number;
  /** Extra lean (radians), so the ruin looks crooked. */
  tilt?: [number, number];
}

const S = 2; // wall tiles: 1 m * 2 = 2 m wide and high
const HALF_PI = Math.PI / 2;

// A Fantasy Town wall tile has its wall on the +X edge of the tile. These centres put the outer
// face of the wall on the border of the 6 x 4 footprint (1.0 = 0.5 m * scale 2 from the centre).
const FRONT_Z = 2 - 1.0;
const BACK_Z = -(2 - 1.0);
const SIDE_X = 3 - 1.0;

export const RUIN_PARTS: readonly RuinPart[] = [
  // floor of old planks, with holes
  ...[
    [-2, -1],
    [0, -1],
    [2, -1],
    [-2, 1],
    [2, 1],
  ].map(([x, z]): RuinPart => ({ pack: 'town', name: 'planks', x, z, rot: 0, scale: S, y: 0.01 })),
  { pack: 'town', name: 'planks-half', x: 0.5, z: 1, rot: HALF_PI, scale: S, y: 0.01 },

  // front wall (+Z): shutters, empty doorway, broken wall
  { pack: 'town', name: 'wall-wood-window-shutters', x: -2, z: FRONT_Z, rot: -HALF_PI, scale: S },
  { pack: 'town', name: 'wall-wood-doorway-square', x: 0, z: FRONT_Z, rot: -HALF_PI, scale: S },
  { pack: 'town', name: 'wall-wood-half', x: 2, z: FRONT_Z, rot: -HALF_PI, scale: S },
  // back wall (-Z)
  { pack: 'town', name: 'wall-broken', x: -2, z: BACK_Z, rot: HALF_PI, scale: S },
  { pack: 'town', name: 'wall-wood', x: 0, z: BACK_Z, rot: HALF_PI, scale: S },
  { pack: 'town', name: 'wall-wood-broken', x: 2, z: BACK_Z, rot: HALF_PI, scale: S },
  // left wall (-X)
  { pack: 'town', name: 'wall-wood-broken', x: -SIDE_X, z: -1, rot: Math.PI, scale: S },
  { pack: 'town', name: 'wall-wood-half', x: -SIDE_X, z: 1, rot: Math.PI, scale: S },
  // right wall (+X)
  { pack: 'town', name: 'wall-wood', x: SIDE_X, z: -1, rot: 0, scale: S },
  { pack: 'town', name: 'wall-wood-window-shutters', x: SIDE_X, z: 1, rot: 0, scale: S },

  // corner posts
  { pack: 'town', name: 'pillar-wood', x: -2.85, z: 1.85, rot: 0, scale: S },
  { pack: 'town', name: 'pillar-wood', x: 2.85, z: 1.85, rot: 0, scale: S },
  { pack: 'town', name: 'pillar-wood', x: -2.85, z: -1.85, rot: 0, scale: S },
  { pack: 'town', name: 'pillar-wood', x: 2.85, z: -1.85, rot: 0, scale: S },

  // half a roof over the back, crooked and sagging towards the right
  { pack: 'town', name: 'roof-gable', x: -1.98, z: -1.0, y: 1.98, rot: 0, scale: 1.8, tilt: [0.03, 0.04] },
  { pack: 'town', name: 'roof-gable', x: 0.0, z: -1.0, y: 1.9, rot: 0, scale: 1.8, tilt: [-0.05, 0.1] },
  { pack: 'town', name: 'roof-gable', x: 1.8, z: -0.9, y: 1.55, rot: 0, scale: 1.8, tilt: [0.18, -0.28] },
  { pack: 'town', name: 'chimney', x: -1.4, z: -1.2, y: 2.6, rot: 0, scale: 1.2, tilt: [0.03, 0.08] },

  // patches of sheet metal over the holes
  { pack: 'survival', name: 'metal-panel-screws', x: 2.0, z: FRONT_Z + 0.13, y: 0.25, rot: HALF_PI * 4, scale: 2.8 },
  { pack: 'survival', name: 'metal-panel', x: -SIDE_X - 0.13, z: -1.0, y: 0.7, rot: -HALF_PI, scale: 2.6 },
  { pack: 'survival', name: 'metal-panel-screws', x: -2.0, z: BACK_Z + 0.13, y: 0.5, rot: HALF_PI, scale: 2.4 },

  // clutter in front
  { pack: 'graveyard', name: 'debris-wood', x: -1.2, z: 1.55, rot: 0.4, scale: 1.4 },
  { pack: 'graveyard', name: 'debris-wood', x: 1.6, z: 1.6, rot: -0.7, scale: 1.2 },
  { pack: 'survival', name: 'resource-planks', x: -2.4, z: 1.5, rot: 0.9, scale: 1.5 },
  { pack: 'town', name: 'fence-broken', x: 0.0, z: 1.2, rot: 0, scale: 1.6 },
];

/**
 * Builds the ruin. The parts load in the background (one file per kind of part), so the group
 * starts empty and fills when they have arrived; a part that fails to load is left out.
 */
export function buildRuin(parts: readonly RuinPart[] = RUIN_PARTS): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ruin';
  for (const part of parts) {
    void kenneyModel(part.pack, part.name).then((model) => {
      if (!model) return;
      const mesh = new THREE.Mesh(model.geometry, model.material);
      mesh.position.set(part.x, part.y ?? 0, part.z);
      mesh.rotation.set(part.tilt?.[0] ?? 0, part.rot, part.tilt?.[1] ?? 0, 'YXZ');
      mesh.scale.setScalar(part.scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    });
  }
  return g;
}
