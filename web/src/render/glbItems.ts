/**
 * GLB items for the season and shop catalogue (plan A1, §6.3).
 * The models are meshopt-compressed; without the decoder they never finish loading.
 * Every model is normalised once: centred on the origin, standing on y = 0 and scaled into the
 * MAX_SIZE box of its kind (decorations at least 0.8 m high). The village, previews and thumbnails
 * keep showing a placeholder until the model is there.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MAX_SIZE, type SlotKind } from '../world/plotPlan';

export interface GlbItem {
  /** Path below assets/, e.g. 'season1/warlock.glb'. */
  file: string;
  kind: SlotKind;
  /** Extra yaw for models whose front does not face +Z. */
  yaw?: number;
}

/**
 * Item id -> model. Kept in sync with supabase/migrations/0030 and 0031 by
 * web/tests/render/glbItems.test.ts (which reads both manifests).
 */
export const GLB_ITEMS: Record<string, GlbItem> = {
  // 28 chest items (season 0030)
  season_warlock: { file: 'season1/warlock.glb', kind: 'deco' },
  season_house_horror: { file: 'season1/house-horror.glb', kind: 'house' },
  season_pumpkin_patch: { file: 'season1/pumpkin-patch.glb', kind: 'deco' },
  season_clock_tower: { file: 'season1/clock-tower.glb', kind: 'deco' },
  season_dodge: { file: 'season1/dodge-pickup.glb', kind: 'car' },
  season_monster_plant: { file: 'season1/kit-monster-plant.glb', kind: 'deco' },
  season_pumpkin_tree: { file: 'season1/jack-o-lantern-tree.glb', kind: 'deco' },
  season_candy_pile: { file: 'season1/candy-pile.glb', kind: 'deco' },
  season_graveyard_corner: { file: 'season1/graveyard-corner.glb', kind: 'deco' },
  season_fence_lantern: { file: 'season1/fence-lamp.glb', kind: 'deco' },
  season_witch_statue: { file: 'season1/witch.glb', kind: 'deco' },
  season_pumpkin_girl: { file: 'season1/pumpkin-girl.glb', kind: 'deco' },
  season_witch_figure: { file: 'season1/kit-witch.glb', kind: 'deco' },
  season_mummy: { file: 'season1/kit-mummy.glb', kind: 'deco' },
  season_skeleton: { file: 'season1/kit-skeleton.glb', kind: 'deco' },
  season_zombie: { file: 'season1/kit-zombie.glb', kind: 'deco' },
  season_witch_cat: { file: 'season1/kit-witch-cat.glb', kind: 'deco' },
  season_cauldron: { file: 'season1/kit-cauldron.glb', kind: 'deco' },
  season_pumpkin_cat: { file: 'season1/spooky-pumpkin-cat.glb', kind: 'deco' },
  season_ghost_kitty: { file: 'season1/ghost-kitty.glb', kind: 'deco' },
  season_candy_bucket: { file: 'season1/kit-candy-bucket.glb', kind: 'deco' },
  season_bat: { file: 'season1/kit-bat.glb', kind: 'deco' },
  season_candle: { file: 'season1/kit-candle.glb', kind: 'deco' },
  season_ghost: { file: 'season1/kit-ghost.glb', kind: 'deco' },
  season_gravestone: { file: 'season1/kit-gravestone.glb', kind: 'deco' },
  season_jack_o_lantern: { file: 'season1/kit-jack-o-lantern.glb', kind: 'deco' },
  season_broom: { file: 'season1/kit-broom.glb', kind: 'deco' },
  season_sign: { file: 'season1/kit-sign.glb', kind: 'deco' },
  // 6 shop items (season 0031)
  shop_cabin: { file: 'shop/cabin.glb', kind: 'house' },
  shop_white_house: { file: 'shop/white-house.glb', kind: 'house' },
  shop_president_car: { file: 'shop/president-car.glb', kind: 'car' },
  shop_trump: { file: 'shop/trump-statue.glb', kind: 'deco' },
  shop_toyoyo: { file: 'shop/toyoyo-highlight.glb', kind: 'car' },
  shop_beatall: { file: 'shop/beatall.glb', kind: 'car' },
};

const BASE = `${import.meta.env.BASE_URL}assets/`;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Group>>();

export function isGlbItem(itemId: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLB_ITEMS, itemId);
}

/** Normalises a loaded scene into a group that fits MAX_SIZE and stands on y = 0. */
export function normaliseGlb(scene: THREE.Object3D, spec: GlbItem): THREE.Group {
  const holder = new THREE.Group();
  const inner = scene.clone(true);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  const max = MAX_SIZE[spec.kind];
  const safe = (n: number) => Math.max(n, 0.001);
  let scale = Math.min(max.w / safe(size.x), max.d / safe(size.z), max.h / safe(size.y));
  if (spec.kind === 'deco' && size.y * scale < 0.8) {
    // Tiny props (bat, candle, candy bucket) would vanish on a 3 x 3 pedestal.
    scale = Math.min(0.8 / safe(size.y), max.w / safe(size.x), max.d / safe(size.z));
  }
  inner.scale.setScalar(scale);
  const centre = box.getCenter(new THREE.Vector3());
  inner.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
  holder.add(inner);
  if (spec.yaw) holder.rotation.y = spec.yaw;
  holder.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return holder;
}

/** Loads and caches one item. The promise resolves to a normalised, independent group. */
export function loadGlbItem(itemId: string, variant: 'high' | 'lod' = 'high'): Promise<THREE.Group> {
  const cacheKey = `${itemId}:${variant}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const spec = GLB_ITEMS[itemId];
  if (!spec) return Promise.reject(new Error(`unknown glb item ${itemId}`));
  const file = variant === 'lod' ? spec.file.replace(/\.glb$/, '.lod.glb') : spec.file;
  const promise = loader
    .loadAsync(`${BASE}${file}`)
    .then((gltf) => normaliseGlb(gltf.scene, spec))
    .catch((err) => {
      // Keep the placeholder instead of breaking the village; a missing LOD is expected.
      if (variant === 'high') console.warn('season model failed', itemId, err);
      return new THREE.Group();
    });
  cache.set(cacheKey, promise);
  return promise;
}

/** Distance at which the simplified far version takes over (plan §6.3). */
export const LOD_DISTANCE = 26;

/** Placeholder + async model, so callers can add it synchronously like the procedural assets. */
export function glbAsset(itemId: string, kind: string): THREE.Group {
  const holder = new THREE.Group();
  const spec = GLB_ITEMS[itemId];
  const max = MAX_SIZE[(spec?.kind ?? kind) as SlotKind] ?? MAX_SIZE.deco;
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(max.w, 1.2), Math.min(max.h, 1.0), Math.min(max.d, 1.2)),
    new THREE.MeshStandardMaterial({ color: 0x4a3a5a, roughness: 1, transparent: true, opacity: 0.55 }),
  );
  placeholder.position.y = placeholder.geometry.parameters.height / 2;

  // One LOD node per item: the full model up close, the simplified far version beyond the distance.
  const lod = new THREE.LOD();
  lod.addLevel(placeholder, 0);
  void loadGlbItem(itemId, 'high').then((model) => {
    lod.remove(placeholder);
    placeholder.geometry.dispose();
    lod.addLevel(model, 0);
  });
  void loadGlbItem(itemId, 'lod').then((model) => {
    if (model.children.length > 0) lod.addLevel(model, LOD_DISTANCE);
  });
  holder.add(lod);
  return holder;
}
