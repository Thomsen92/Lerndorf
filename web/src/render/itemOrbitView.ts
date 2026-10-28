/**
 * Large orbit view of one item for "What's in it?" (DEEPSEEK_WHATS_INSIDE_3D): drag to turn,
 * pinch or wheel to zoom, reset to the framed start. Lit like the item detail (createPreviewScene).
 * The model comes from the same source as the thumbnails; shared GLB and pass-scene clones belong
 * to the village cache and are never disposed here. Renders only while the tab is visible.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  configurePreviewRenderer,
  createPreviewScene,
  fitCameraToBox,
  PREVIEW_STILL_YAW,
} from './itemPreview';
import { itemModel } from './itemThumbs';
import type { Item3dView } from '../ui/item3dPreview';

const FOV = 35;
const ELEVATION = 0.32; // rad above the horizon for the start view

export function createItemOrbitView(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): Item3dView | null {
  let renderer: THREE.WebGLRenderer;
  try {
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return null;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  configurePreviewRenderer(renderer);
  const { scene, camera } = createPreviewScene();
  camera.near = 0.05;
  camera.far = 500;
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !opts.reducedMotion;
  controls.dampingFactor = 0.1;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = 0.8;

  let model: THREE.Object3D | null = null;
  let shared = true;
  let token = 0;
  let disposed = false;
  let start: { position: THREE.Vector3; target: THREE.Vector3 } | null = null;

  const free = (): void => {
    if (!model) return;
    scene.remove(model);
    if (!shared)
      model.traverse((o) => {
        // procedural materials are cached by plotAssets and shared with the village: only geometry is ours
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    model = null;
  };

  const frame = (): void => {
    if (!model) return;
    // like the thumbnails: the box of the unturned model, seen with the model turned by the still yaw
    model.rotation.y = 0;
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    model.rotation.y = PREVIEW_STILL_YAW;
    model.updateMatrixWorld(true);
    const fit = fitCameraToBox(box, FOV, camera.aspect, PREVIEW_STILL_YAW, ELEVATION, 0.8);
    start = { position: fit.position, target: fit.target };
    const distance = fit.position.distanceTo(fit.target);
    controls.minDistance = distance * 0.35;
    controls.maxDistance = distance * 3;
    camera.position.copy(fit.position);
    controls.target.copy(fit.target);
    controls.update();
  };

  const resize = (): void => {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(canvas);

  const loop = (): void => {
    if (disposed || document.hidden || !canvas.isConnected) return;
    controls.update();
    renderer.render(scene, camera);
  };
  renderer.setAnimationLoop(loop);

  return {
    async load(kind, itemId) {
      const mine = ++token;
      const next = await itemModel(kind, itemId);
      if (disposed || mine !== token) {
        if (!next.shared)
          next.model.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
        return;
      }
      // a GLB that failed to load comes back as an empty group: report it instead of an empty stage
      if (new THREE.Box3().setFromObject(next.model).isEmpty()) throw new Error(`no model for ${itemId}`);
      free();
      model = next.model;
      shared = next.shared;
      scene.add(model);
      resize();
    },
    reset() {
      if (!start) return;
      camera.position.copy(start.position);
      controls.target.copy(start.target);
      controls.update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      token += 1;
      renderer.setAnimationLoop(null);
      observer?.disconnect();
      controls.dispose();
      free();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
