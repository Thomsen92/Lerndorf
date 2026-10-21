/**
 * Animated villager model (boy, generated with Tripo, Mixamo rig). Loaded once, cloned per villager.
 * Clips: walk, swagger (shown as "catwalk" on a single tap) and dance_04 (double tap).
 * Sitting and waving are left out for now; standing uses the first frame of the walk clip.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export type CharacterClip = 'walk' | 'catwalk' | 'dance';
export const CLIP_NAMES: Record<CharacterClip, string> = { walk: 'walk', catwalk: 'swagger', dance: 'dance_04' };
/** Same height as the old placeholder figure (head top at 1.64 m). */
export const FIGURE_HEIGHT = 1.64;
const URL = `${import.meta.env.BASE_URL}assets/characters/boy.glb`;

export interface CharacterAsset {
  scene: THREE.Object3D;
  clips: Record<CharacterClip, THREE.AnimationClip>;
  scale: number;
}

export interface CharacterInstance {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<CharacterClip, THREE.AnimationAction>;
}

/** Keeps the figure on the spot: the hips' x/z movement is frozen at the first frame (y stays). */
export function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  for (const track of clip.tracks) {
    if (!/hips\.position$/i.test(track.name)) continue;
    const v = track.values;
    const x0 = v[0];
    const z0 = v[2];
    for (let i = 0; i < v.length; i += 3) {
      v[i] = x0;
      v[i + 2] = z0;
    }
  }
  return clip;
}

let pending: Promise<CharacterAsset | null> | null = null;

/** Loads the model once; resolves null if loading fails (the placeholders stay then). */
export function loadCharacter(): Promise<CharacterAsset | null> {
  pending ??= new GLTFLoader()
    .loadAsync(URL)
    .then((gltf) => {
      const find = (name: string): THREE.AnimationClip | undefined =>
        gltf.animations.find((a) => a.name === name);
      const walk = find(CLIP_NAMES.walk);
      const catwalk = find(CLIP_NAMES.catwalk);
      const dance = find(CLIP_NAMES.dance);
      if (!walk || !catwalk || !dance) {
        console.warn('character: missing clip', gltf.animations.map((a) => a.name));
        return null;
      }
      gltf.scene.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
      const scale = size.y > 0 ? FIGURE_HEIGHT / size.y : 1;
      return {
        scene: gltf.scene,
        clips: { walk: stripRootMotion(walk), catwalk: stripRootMotion(catwalk), dance: stripRootMotion(dance) },
        scale,
      };
    })
    .catch((err: unknown) => {
      console.warn('character: load failed', err);
      return null;
    });
  return pending;
}

/** A fresh copy with its own skeleton and mixer. */
export function instantiate(asset: CharacterAsset): CharacterInstance {
  const root = cloneSkinned(asset.scene);
  root.scale.setScalar(asset.scale);
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions = {
    walk: mixer.clipAction(asset.clips.walk),
    catwalk: mixer.clipAction(asset.clips.catwalk),
    dance: mixer.clipAction(asset.clips.dance),
  };
  return { root, mixer, actions };
}
