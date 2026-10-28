/**
 * Small turntable renderer for the item detail dialog: one model on a transparent background,
 * lit like the village (LOOK §3) but without the sky, fog or shadows.
 */
import * as THREE from 'three';
import { MAX_SIZE, type SlotKind } from '../world/plotPlan';
import { plotAsset, tintFor } from './plotAssets';

const FOV_DEG = 35;
const TURN_SPEED = 0.4; // rad/s
const STILL_YAW = 0.6; // rad, used for reduced motion
/** Extra room around the largest model so it never touches the canvas edge. */
const MARGIN = 1.45;

/** Camera placement for the largest model of a kind: distance from the target, camera height, look-at height. */
export function previewFrame(kind: SlotKind): { distance: number; height: number; targetY: number } {
  const { w, d, h } = MAX_SIZE[kind];
  const fit = Math.max(w, d, h) / (2 * Math.tan((FOV_DEG / 2) * (Math.PI / 180)));
  return { distance: fit * MARGIN, height: h * 0.9, targetY: h / 2 };
}

/** Renderer settings shared by the turntable preview and the card thumbnails. */
export function configurePreviewRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
}

/** Scene lit like the village (LOOK §3) plus the camera; the single place for these values. */
export function createPreviewScene(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera } {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#a9b8e8', '#3a5a3a', 1.15));
  const sun = new THREE.DirectionalLight('#ffd2a1', 1.6);
  sun.position.set(-40, 55, 25);
  scene.add(sun);
  return { scene, camera: new THREE.PerspectiveCamera(FOV_DEG, 1, 0.1, 100) };
}

/** Places the camera for the largest model of a kind; returns the look-at height. */
export function frameCamera(camera: THREE.PerspectiveCamera, kind: SlotKind): number {
  const f = previewFrame(kind);
  camera.position.set(0, f.height, f.distance);
  camera.lookAt(0, f.targetY, 0);
  return f.targetY;
}

/**
 * Camera for a thumbnail: looks along a fixed direction (elevation above the horizon, from +z) at a box that
 * the model turns into by `yaw` around Y. Iteratively moves the target to the projected centre and scales
 * the distance until the limiting axis fills `fill` of the frame (NDC span 2 = full frame).
 */
export function fitCameraToBox(
  box: THREE.Box3,
  fovDeg: number,
  aspect: number,
  yaw: number,
  elevation: number,
  fill: number,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  const center = new THREE.Box3().setFromPoints(corners).getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(0, Math.sin(elevation), Math.cos(elevation));
  const cam = new THREE.PerspectiveCamera(fovDeg, aspect, 0.01, 1000);
  const target = center.clone();
  const halfTan = Math.tan((fovDeg / 2) * (Math.PI / 180));
  let dist = (new THREE.Box3().setFromPoints(corners).getSize(new THREE.Vector3()).length() / 2 / halfTan) * 1.2 || 1;
  for (let i = 0; i < 6; i++) {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      const n = c.clone().project(cam);
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
    const halfH = dist * halfTan;
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    target.addScaledVector(right, ((minX + maxX) / 2) * halfH * aspect).addScaledVector(up, ((minY + maxY) / 2) * halfH);
    dist *= Math.max(maxX - minX, maxY - minY) / (2 * fill);
  }
  return { position: target.clone().addScaledVector(dir, dist), target };
}

/** Frames one model for a thumbnail (see fitCameraToBox); the model must not be rotated yet or is rotated by `yaw`. */
export function frameCameraToBox(camera: THREE.PerspectiveCamera, kind: SlotKind, model: THREE.Object3D, yaw: number): void {
  const prev = model.rotation.y;
  model.rotation.y = 0;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  model.rotation.y = prev;
  model.updateMatrixWorld(true);
  const f = previewFrame(kind);
  const elevation = Math.atan2(f.height - f.targetY, f.distance);
  const fit = fitCameraToBox(box, FOV_DEG, camera.aspect, yaw, elevation, 0.88);
  camera.position.copy(fit.position);
  camera.lookAt(fit.target);
}

/** Resting yaw of the still frame (reduced motion and thumbnails). */
export const PREVIEW_STILL_YAW = STILL_YAW;

export interface ItemPreview {
  show(kind: SlotKind, itemId: string): void;
  reset?(): void;
  dispose(): void;
}

/** null when WebGL is unavailable. onError fires on webglcontextlost. */
export function createItemPreview(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean; onError: () => void },
): ItemPreview | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  configurePreviewRenderer(renderer);

  const { scene, camera } = createPreviewScene();
  let model: THREE.Object3D | null = null;
  let yaw = STILL_YAW;
  let raf = 0;
  let last = 0;
  let disposed = false;
  let lost = false;

  const freeModel = (): void => {
    if (!model) return;
    scene.remove(model);
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        // materials are shared and cached by plotAssets (the village uses them too): never dispose them here
        o.geometry.dispose();
      }
    });
    model = null;
  };

  const resize = (): void => {
    const w = canvas.clientWidth || canvas.width || 1;
    const h = canvas.clientHeight || canvas.height || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const draw = (): void => {
    if (!model) return;
    model.rotation.y = yaw;
    renderer.render(scene, camera);
  };

  const onLost = (e: Event): void => {
    e.preventDefault();
    lost = true;
    stop();
    opts.onError();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  const stop = (): void => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const tick = (now: number): void => {
    raf = 0;
    if (disposed || !canvas.isConnected) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    yaw += TURN_SPEED * dt;
    draw();
    raf = requestAnimationFrame(tick);
  };

  return {
    show(kind, itemId) {
      if (disposed || lost) return;
      stop();
      freeModel();
      model = plotAsset(kind, itemId, tintFor(0));
      scene.add(model);
      frameCamera(camera, kind);
      resize();
      yaw = STILL_YAW;
      draw();
      if (!opts.reducedMotion) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      canvas.removeEventListener('webglcontextlost', onLost);
      freeModel();
      renderer.dispose();
      if (!lost) renderer.forceContextLoss();
    },
  };
}

export type PreviewFactory = typeof createItemPreview;
