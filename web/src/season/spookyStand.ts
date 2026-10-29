import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Layout } from '../world/layout';
import { HALLOWEEN_STAND_ANGLE, HALLOWEEN_STAND_RADIUS } from '../world/constants';

export interface SpookyStand {
  root: THREE.Group;
  ready: Promise<void>;
  dispose(): void;
}

/** These GLBs are loaded for this view, not borrowed from the shared inventory cache. */
function release(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m);
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) textures.add(v);
      }
    }
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}

/** Independent event teaser: remains accessible in both normal and Halloween light. */
export function createSpookyStand(
  layout: Layout,
  opts: { load?: () => Promise<THREE.Object3D> } = {},
): SpookyStand {
  const root = new THREE.Group();
  root.name = 'spookySeasonStand';
  root.userData.bakeStatic = false;
  const a = layout.map.boardAngle + HALLOWEEN_STAND_ANGLE,
    r = HALLOWEEN_STAND_RADIUS;
  root.position.set(
    layout.plaza.x + Math.cos(a) * r,
    layout.plazaHeight + 0.1,
    layout.plaza.z + Math.sin(a) * r,
  );
  root.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(4.7, 3.9, 3.7),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.position.set(0, 1.85, 0.45);
  hit.userData.kind = 'seasonStand';
  root.add(hit);
  // A legible loading/error fallback retains the click target if an asset cannot be fetched.
  const fallback = new THREE.Group();
  fallback.name = 'spookyStandFallback';
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.1, 1.1),
    new THREE.MeshStandardMaterial({ color: '#684e83', roughness: 0.88 }),
  );
  counter.position.y = 0.55;
  counter.userData.kind = 'seasonStand';
  fallback.add(counter);
  root.add(fallback);
  let disposed = false;
  const load =
    opts.load ??
    (async () => {
      const gltf = await new GLTFLoader().loadAsync(
        `${import.meta.env.BASE_URL}assets/halloween/halloween-shop-event.glb`,
      );
      return gltf.scene;
    });
  const ready = load()
    .then((model) => {
      if (disposed) {
        release(model);
        return;
      }
      model.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.userData.kind = 'seasonStand';
        }
      });
      root.remove(fallback);
      release(fallback);
      root.add(model);
      root.userData.assetReady = true;
    })
    .catch(() => {
      root.userData.assetError = true;
    });
  return {
    root,
    ready,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      release(root);
    },
  };
}
