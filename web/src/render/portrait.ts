import * as THREE from 'three';
import { instantiate, loadCharacter, type CharacterKind } from './character';
import { configurePreviewRenderer } from './itemPreview';
import { AvatarCustomizer } from '../avatars/customizer';
import { emptyLook, lookKey, type AvatarLook } from '../avatars/look';
import { ASSET_REVISION } from '../avatars/catalog';
export const PORTRAIT_SIZE = 512;
export const PORTRAIT_YAW = (30 * Math.PI) / 180;
export const PORTRAIT_PITCH = (8 * Math.PI) / 180;
export function portraitCamera(
  head: THREE.Vector3,
  neck: THREE.Vector3,
  headHeight: number,
): { position: THREE.Vector3; target: THREE.Vector3; fov: number } {
  const target = head.clone().lerp(neck, 0.42);
  const distance = Math.max(0.85, headHeight * 3.5);
  return {
    position: new THREE.Vector3(target.x, head.y + Math.tan(PORTRAIT_PITCH) * distance, target.z + distance),
    target,
    fov: 30,
  };
}
export type PortraitSource = (kind: CharacterKind, look?: AvatarLook) => Promise<string | null>;
/** Include head-mounted items without letting back equipment shrink the face. */
export function portraitAppearanceBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = portraitHeadBounds(root);
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && /head$/i.test(o.name)) bounds.union(new THREE.Box3().setFromObject(o));
  });
  return bounds;
}
/** The head bone sits at the jaw; frame the actual skinned head geometry. */
export function portraitHeadBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  root.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.visible) return;
    const indices = mesh.geometry.getAttribute('skinIndex');
    const weights = mesh.geometry.getAttribute('skinWeight');
    if (!indices || !weights) return;
    const headBones = new Set(
      mesh.skeleton.bones.map((bone, index) => (/head/i.test(bone.name) ? index : -1)),
    );
    headBones.delete(-1);
    for (let i = 0; i < indices.count; i++) {
      let influence = 0;
      for (let j = 0; j < 4; j++)
        if (headBones.has(indices.getComponent(i, j))) influence += weights.getComponent(i, j);
      if (influence < 0.3) continue;
      mesh.getVertexPosition(i, vertex).applyMatrix4(mesh.matrixWorld);
      bounds.expandByPoint(vertex);
    }
  });
  return bounds;
}
/** Session image cache, with no permanent additional WebGL context. */
export const sessionPortraitSource: PortraitSource = createPortraitSource(async (kind, look) => {
  if (typeof WebGLRenderingContext === 'undefined') throw Error('WebGL unavailable');
  const renderer = createWebGLPortraitRender();
  if (!renderer) throw Error('WebGL unavailable');
  try {
    return await renderer.render(kind, look);
  } finally {
    renderer.dispose();
  }
});
export function createPortraitSource(
  render: (kind: CharacterKind, look?: AvatarLook) => Promise<string>,
): PortraitSource {
  const cache = new Map<string, Promise<string | null>>();
  let queue: Promise<unknown> = Promise.resolve();
  return (kind, look) => {
    const key = `${kind}:${ASSET_REVISION}:${look ? lookKey(look) : ''}`;
    let result = cache.get(key);
    if (result) return result;
    result = queue
      .then(() => (look ? render(kind, look) : render(kind)))
      .catch(() => {
        cache.delete(key);
        return null;
      });
    cache.set(key, result);
    queue = result;
    return result;
  };
}

export function createWebGLPortraitRender(): {
  render: (kind: CharacterKind, look?: AvatarLook) => Promise<string>;
  dispose(): void;
} | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  configurePreviewRenderer(renderer);
  renderer.setClearColor('#ffffff', 1);
  renderer.setSize(PORTRAIT_SIZE, PORTRAIT_SIZE);
  let disposed = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#ffffff');
  scene.add(new THREE.HemisphereLight('#e6edff', '#a08b70', 0.5));
  for (const [colour, intensity, x, y, z] of [
    ['#fff0dd', 2.2, -3, 4, 4],
    ['#d6e7ff', 0.6, 3, 1, 3],
    ['#ffffff', 1.2, 1, 4, -3],
  ] as const) {
    const light = new THREE.DirectionalLight(colour, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  return {
    async render(kind, look = emptyLook()) {
      if (disposed) throw Error('Portrait renderer disposed');
      const asset = await loadCharacter(kind);
      if (!asset) throw Error('Character unavailable');
      const clone = instantiate(asset);
      const style = new AvatarCustomizer(clone.root, kind);
      await style.applyLook(look);
      clone.walk.play();
      clone.mixer.update(0);
      clone.root.rotation.y = PORTRAIT_YAW;
      scene.add(clone.root);
      clone.root.updateMatrixWorld(true);
      try {
        let bone: THREE.Object3D | undefined;
        clone.root.traverse((o) => {
          if (!bone && /head$/i.test(o.name)) bone = o;
        });
        const bounds = portraitAppearanceBounds(clone.root);
        const head = bounds.isEmpty()
          ? (bone?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 1.45, 0))
          : bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const height = bounds.isEmpty() ? 0.3 : Math.max(size.y, size.x);
        const neck = head.clone().add(new THREE.Vector3(0, -height * 0.55, 0));
        const f = portraitCamera(head, neck, height),
          camera = new THREE.PerspectiveCamera(f.fov, 1, 0.01, 20);
        camera.position.copy(f.position);
        camera.lookAt(f.target);
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
      } finally {
        style.dispose();
        clone.mixer.stopAllAction();
        clone.mixer.uncacheRoot(clone.root);
        clone.root.traverse((o) => {
          if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.dispose();
        });
        scene.remove(clone.root); /* Skeleton clone shares cached geometry/materials; do not dispose those. */
      }
    },
    dispose() {
      disposed = true;
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
