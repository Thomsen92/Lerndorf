// Loading, fitting and releasing card models for the almanach preview (plan package 6).
// One active model, at most four cached models, no second catalogue of asset paths.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export type CardModelLoader = (url: string) => Promise<THREE.Object3D>;

export function gltfCardLoader(): CardModelLoader {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return async (url) => (await loader.loadAsync(url)).scene;
}

/** Distance that keeps a model of `size` inside a perspective camera with margin. */
export function cameraDistance(size: THREE.Vector3, fovDeg: number, aspect: number, margin = 1.35): number {
  const fov = (fovDeg * Math.PI) / 180;
  const heightDistance = size.y / 2 / Math.tan(fov / 2);
  const widthDistance = size.x / 2 / Math.tan(fov / 2) / Math.max(aspect, 0.2);
  const depth = size.z / 2;
  // No absolute floor: the delivered cards are only a few centimetres tall.
  return Math.max(heightDistance, widthDistance, depth * 0.5, 0.001) * margin;
}

/** Centres the model at the origin and frames it from its real bounding box. */
/** Bounding box of the meshes a pupil can actually see (stray helper geometry is ignored). */
export function visibleBounds(root: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (
      materials.length > 0 &&
      materials.every(
        (material) => material.visible === false || (material.transparent && material.opacity <= 0.01),
      )
    )
      return;
    object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    part.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);
    box.union(part);
  });
  return box.isEmpty() ? new THREE.Box3().setFromObject(root) : box;
}

export function frameObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update(): void } | null,
  margin = 1.35,
): void {
  const box = visibleBounds(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const distance = cameraDistance(size, camera.fov, camera.aspect, margin);
  camera.position.set(center.x, center.y + size.y * 0.08, center.z + distance);
  camera.near = Math.max(distance / 100, 0.01);
  camera.far = distance * 10;
  camera.updateProjectionMatrix();
  camera.lookAt(center);
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

function isTexture(value: unknown): value is THREE.Texture {
  return value instanceof THREE.Texture;
}

/** Releases only resources of a card model; these are never shared with the village. */
export function disposeCardModel(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (isTexture(value)) textures.add(value);
    }
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export interface CardModelCache {
  /** Loads and marks a model active; the previous active model stays cached. */
  load(url: string): Promise<THREE.Object3D>;
  /** Detaches the active model and clears the active flag. */
  release(): void;
  /** Drops cached models that the active scene does not use. */
  clearInactive(): void;
  dispose(): void;
}

/** LRU with four entries; the active model is never evicted (plan §10.6). */
export function createCardModelCache(loader: CardModelLoader = gltfCardLoader(), max = 4): CardModelCache {
  const entries = new Map<string, THREE.Object3D>();
  const pending = new Map<string, Promise<THREE.Object3D>>();
  let active: THREE.Object3D | null = null;

  function evictable(url: string): boolean {
    const object = entries.get(url);
    return object !== undefined && object !== active;
  }
  function trim(): void {
    for (const url of [...entries.keys()]) {
      if (entries.size <= max) break;
      if (!evictable(url)) continue;
      const object = entries.get(url)!;
      entries.delete(url);
      object.removeFromParent();
      disposeCardModel(object);
    }
  }
  function makeActive(object: THREE.Object3D): THREE.Object3D {
    active = object;
    return object;
  }
  return {
    load(url) {
      const cached = entries.get(url);
      if (cached) {
        entries.delete(url);
        entries.set(url, cached);
        return Promise.resolve(makeActive(cached));
      }
      const running = pending.get(url);
      if (running) return running.then(makeActive);
      const job = loader(url)
        .then((object) => {
          pending.delete(url);
          entries.set(url, object);
          trim();
          return makeActive(object);
        })
        .catch((error: unknown) => {
          pending.delete(url);
          throw error;
        });
      pending.set(url, job);
      return job;
    },
    release() {
      active?.removeFromParent();
      active = null;
    },
    clearInactive() {
      for (const [url, object] of [...entries.entries()]) {
        if (object === active) continue;
        entries.delete(url);
        object.removeFromParent();
        disposeCardModel(object);
      }
    },
    dispose() {
      active = null;
      for (const object of entries.values()) {
        object.removeFromParent();
        disposeCardModel(object);
      }
      entries.clear();
      pending.clear();
    },
  };
}
