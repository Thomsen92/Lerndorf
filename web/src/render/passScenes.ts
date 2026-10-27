/**
 * Pass-exclusive garden scenes (plan §6.1, package A3). They are composed from the CC0 Kenney
 * Graveyard Kit, so many small parts cost almost no draw calls (shared palette materials) and the
 * season chest pool stays untouched. Each scene is normalised into the 3 x 3 decoration pedestal.
 */
import * as THREE from 'three';
import { MAX_SIZE } from '../world/plotPlan';
import { kenneyModel } from './kenney';

export interface ScenePart {
  /** Model name in the Kenney graveyard pack. */
  name: string;
  x: number;
  z: number;
  rot?: number;
  scale?: number;
  y?: number;
}

/** Scene id -> parts, in metres inside a 3 x 3 x 3 pedestal (before normalisation). */
export const PASS_SCENES: Record<string, ScenePart[]> = {
  scene_pumpkin_bed: [
    { name: 'pumpkin', x: -0.7, z: 0.4 },
    { name: 'pumpkin-carved', x: 0.1, z: 0.6, rot: 0.4 },
    { name: 'pumpkin-tall-carved', x: 0.85, z: 0.2, rot: 1.1 },
    { name: 'hay-bale', x: 0, z: -0.75, scale: 1.1 },
  ],
  scene_fire_basket: [
    { name: 'fire-basket', x: 0, z: 0 },
    { name: 'rocks', x: 0.9, z: 0.6, rot: 0.7 },
    { name: 'hay-bale-bundled', x: -0.85, z: -0.5, rot: 1.2 },
  ],
  scene_autumn_pine: [
    { name: 'pine-fall-crooked', x: 0, z: 0, scale: 1.15 },
    { name: 'pumpkin', x: 0.9, z: 0.7 },
    { name: 'pumpkin-carved', x: -0.8, z: 0.6, rot: 2.1 },
  ],
  scene_lantern_path: [
    { name: 'lightpost-double', x: -0.7, z: -0.2 },
    { name: 'road', x: 0.4, z: 0.1, scale: 1.2 },
    { name: 'lantern-candle', x: 1.05, z: 0.55 },
  ],
  scene_graveyard_gate: [
    { name: 'iron-fence-border-gate', x: 0, z: 0.35 },
    { name: 'iron-fence', x: -1.25, z: 0.3, rot: Math.PI / 2 },
    { name: 'iron-fence', x: 1.25, z: 0.3, rot: -Math.PI / 2 },
    { name: 'iron-fence-border-column', x: -1.2, z: 0.3 },
  ],
  scene_candle_altar: [
    { name: 'altar-stone', x: 0, z: -0.3 },
    { name: 'candle-multiple', x: 0, z: 0.15 },
    { name: 'detail-chalice', x: 0.65, z: 0.4 },
  ],
  scene_ghost_grave: [
    { name: 'character-ghost', x: 0.25, z: 0.2, scale: 1.15 },
    { name: 'gravestone-round', x: -0.6, z: -0.25 },
    { name: 'candle', x: 0.75, z: 0.5 },
  ],
  scene_skeleton_bench: [
    { name: 'character-skeleton', x: 0.35, z: 0.2 },
    { name: 'bench-damaged', x: -0.45, z: 0 },
  ],
  scene_zombie_garden: [
    { name: 'character-zombie', x: 0.3, z: 0.2 },
    { name: 'grave-border', x: -0.6, z: -0.4 },
    { name: 'debris', x: 0.8, z: 0.5, rot: 1.4 },
  ],
  scene_little_crypt: [
    { name: 'crypt-small', x: 0, z: -0.25, scale: 1.25 },
    { name: 'urn-round', x: 0.85, z: 0.6 },
  ],
  scene_vampire_coffin: [
    { name: 'character-vampire', x: 0.35, z: 0.2 },
    { name: 'coffin', x: -0.55, z: -0.25, rot: 0.3, scale: 1.1 },
  ],
  scene_gravedigger: [
    { name: 'character-keeper', x: 0.2, z: 0.2 },
    { name: 'shovel-dirt', x: -0.55, z: 0.3, rot: 0.6 },
    { name: 'grave', x: -0.3, z: -0.6 },
  ],
};

const cache = new Map<string, Promise<THREE.Group>>();

/** Normalises a composed scene into the pedestal: centred, on the ground, 2.4 m wide at most. */
export function normaliseScene(scene: THREE.Object3D): THREE.Group {
  const holder = new THREE.Group();
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const max = MAX_SIZE.deco;
  const safe = (n: number) => Math.max(n, 0.001);
  const scale = Math.min(
    2.4 / safe(Math.max(size.x, size.z)),
    max.h / safe(size.y),
    max.w / safe(size.x),
    max.d / safe(size.z),
  );
  const inner = scene;
  inner.scale.multiplyScalar(scale);
  box.setFromObject(inner);
  const centre = box.getCenter(new THREE.Vector3());
  inner.position.x -= centre.x;
  inner.position.z -= centre.z;
  inner.position.y -= box.min.y;
  holder.add(inner);
  return holder;
}

function buildScene(id: string): Promise<THREE.Group> {
  const parts = PASS_SCENES[id] ?? [];
  return Promise.all(parts.map((p) => kenneyModel('graveyard', p.name))).then((models) => {
    const group = new THREE.Group();
    parts.forEach((part, index) => {
      const model = models[index];
      if (!model) return;
      const mesh = new THREE.Mesh(model.geometry, model.material);
      mesh.scale.setScalar(part.scale ?? 1);
      mesh.position.set(part.x, part.y ?? 0, part.z);
      mesh.rotation.y = part.rot ?? 0;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    return normaliseScene(group);
  });
}

/** The composed scene as an independent clone (thumbnails and pictures wait for it). */
export function loadPassScene(id: string): Promise<THREE.Group> {
  let hit = cache.get(id);
  if (!hit) {
    hit = buildScene(id);
    cache.set(id, hit);
  }
  return hit.then((scene) => scene.clone(true));
}

/** Synchronous group with a placeholder; the composed scene replaces it when the parts arrive. */
export function passScene(id: string): THREE.Group {
  const holder = new THREE.Group();
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 1, transparent: true, opacity: 0.5 }),
  );
  placeholder.position.y = 0.35;
  holder.add(placeholder);
  void loadPassScene(id).then((scene) => {
    holder.remove(placeholder);
    placeholder.geometry.dispose();
    holder.add(scene);
  });
  return holder;
}
