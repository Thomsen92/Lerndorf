/**
 * Animated villager models (boy and girl, generated with Tripo, Mixamo rig). Each model is loaded
 * once and cloned per villager. Clips: walk, catwalk (single tap) and one or more dances (double tap).
 * Sitting and waving are left out for now; standing uses the first frame of the walk clip.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

export type CharacterKind = 'boy' | 'girl';
export const CHARACTER_KINDS: readonly CharacterKind[] = ['boy', 'girl'];
/** Figure without a choice yet (until the pupil picks one). */
export const DEFAULT_CHARACTER: CharacterKind = 'boy';
export const CHARACTER_LABEL: Record<CharacterKind, string> = { boy: 'Junge', girl: 'Mädchen' };

const CATWALK = 'gravious sassy catwalk of a  model';
/** Clip names inside each GLB. */
export const CLIP_NAMES: Record<CharacterKind, { walk: string; catwalk: string; dances: string[] }> = {
  boy: { walk: 'walk', catwalk: CATWALK, dances: ['dance_03'] },
  girl: { walk: 'walk', catwalk: CATWALK, dances: ['dance_04', 'sexy dance'] },
};
/** Same height as the old placeholder figure (head top at 1.64 m). */
export const FIGURE_HEIGHT = 1.64;

export function isCharacterKind(v: unknown): v is CharacterKind {
  return v === 'boy' || v === 'girl';
}

export interface CharacterAsset {
  kind: CharacterKind;
  scene: THREE.Object3D;
  walk: THREE.AnimationClip;
  catwalk: THREE.AnimationClip;
  dances: THREE.AnimationClip[];
  scale: number;
}

export interface CharacterInstance {
  kind: CharacterKind;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  walk: THREE.AnimationAction;
  catwalk: THREE.AnimationAction;
  dances: THREE.AnimationAction[];
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

const pending = new Map<CharacterKind, Promise<CharacterAsset | null>>();

/** Loads a model once; resolves null if loading fails (the placeholder stays then). */
export function loadCharacter(kind: CharacterKind): Promise<CharacterAsset | null> {
  let p = pending.get(kind);
  if (p) return p;
  const url = `${import.meta.env.BASE_URL}assets/characters/${kind}.glb`;
  p = new GLTFLoader()
    .loadAsync(url)
    .then((gltf): CharacterAsset | null => {
      const names = CLIP_NAMES[kind];
      const find = (name: string): THREE.AnimationClip | undefined =>
        gltf.animations.find((a) => a.name === name);
      const walk = find(names.walk);
      const catwalk = find(names.catwalk);
      const dances = names.dances.map(find).filter((c): c is THREE.AnimationClip => c !== undefined);
      if (!walk || !catwalk || dances.length === 0) {
        console.warn(`character ${kind}: missing clip`, gltf.animations.map((a) => a.name));
        return null;
      }
      gltf.scene.updateMatrixWorld(true);
      const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
      return {
        kind,
        scene: gltf.scene,
        walk: stripRootMotion(walk),
        catwalk: stripRootMotion(catwalk),
        dances: dances.map(stripRootMotion),
        scale: size.y > 0 ? FIGURE_HEIGHT / size.y : 1,
      };
    })
    .catch((err: unknown) => {
      console.warn(`character ${kind}: load failed`, err);
      return null;
    });
  pending.set(kind, p);
  return p;
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
  return {
    kind: asset.kind,
    root,
    mixer,
    walk: mixer.clipAction(asset.walk),
    catwalk: mixer.clipAction(asset.catwalk),
    dances: asset.dances.map((c) => mixer.clipAction(c)),
  };
}
