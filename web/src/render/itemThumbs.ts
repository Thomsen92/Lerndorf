/**
 * Small item pictures for shop and inventory cards. ONE offscreen renderer renders the models one at a
 * time; results are cached as PNG data URLs, so there is never a WebGL context per card.
 */
import * as THREE from 'three';
import type { ItemEntry, ItemKind } from '../api/items';
import type { SlotKind } from '../world/plotPlan';
import {
  configurePreviewRenderer,
  createPreviewScene,
  frameCameraToBox,
  PREVIEW_STILL_YAW,
} from './itemPreview';
import { plotAsset, tintFor } from './plotAssets';

/** Data URL (PNG) of the item, or null for items without a model (avatar) or on failure. */
export type ThumbItem = Pick<ItemEntry, 'id' | 'kind' | 'fits'>;
export type ThumbSource = (e: ThumbItem) => Promise<string | null>;

export const THUMB_PLACEHOLDER: Record<ItemKind, string> = {
  house: '🏠',
  garage: '🏘️',
  car: '🚗',
  deco: '🌳',
  avatar: '👕',
};

const THUMB_W = 256;
const THUMB_H = 192;

/** Expected condition (no WebGL, renderer released): placeholders stay, nothing is logged. */
class ThumbUnavailable extends Error {}

/** Caches by item id across calls; renders strictly one at a time; failures are not cached. */
export function createThumbSource(
  render: (kind: SlotKind, itemId: string) => Promise<string> | string,
): ThumbSource {
  const cache = new Map<string, Promise<string | null>>();
  let tail: Promise<unknown> = Promise.resolve();
  return (e) => {
    if (e.kind === 'avatar' || e.fits.length === 0) return Promise.resolve(null);
    const kind = e.kind;
    const hit = cache.get(e.id);
    if (hit) return hit;
    const job = tail.then(async (): Promise<string | null> => {
      try {
        return await render(kind, e.id);
      } catch (err) {
        if (!(err instanceof ThumbUnavailable)) console.error('thumbnail failed', e.id, err);
        cache.delete(e.id);
        return null;
      }
    });
    tail = job;
    cache.set(e.id, job);
    return job;
  };
}

/** One lazily created offscreen renderer (256x192, alpha); null when WebGL is unavailable. */
export function createWebGLThumbRender(): {
  render: (kind: SlotKind, itemId: string) => string;
  dispose(): void;
} | null {
  let renderer: THREE.WebGLRenderer;
  try {
    const canvas = document.createElement('canvas');
    // probe first: constructing the renderer without WebGL logs an error
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return null;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(THUMB_W, THUMB_H, false);
  configurePreviewRenderer(renderer);
  const { scene, camera } = createPreviewScene();
  camera.aspect = THUMB_W / THUMB_H;
  camera.updateProjectionMatrix();
  return {
    render(kind, itemId) {
      const model = plotAsset(kind, itemId, tintFor(0));
      try {
        model.rotation.y = PREVIEW_STILL_YAW;
        scene.add(model);
        frameCameraToBox(camera, kind, model, PREVIEW_STILL_YAW);
        renderer.render(scene, camera);
        if (renderer.getContext().isContextLost()) throw new ThumbUnavailable('WebGL context lost');
        const url = renderer.domElement.toDataURL('image/png');
        if (!url.startsWith('data:image/png')) throw new ThumbUnavailable('thumbnail encoding failed');
        return url;
      } finally {
        scene.remove(model);
        model.traverse((o) => {
          // materials are shared and cached by plotAssets (the village uses them too): never dispose them
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
      }
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

let sessionSource: ThumbSource | null = null;
let gl: ReturnType<typeof createWebGLThumbRender> | undefined;
let glFailed = false;
let users = 0;
let currentFactory: ThumbRenderFactory = createWebGLThumbRender;

export type ThumbRenderFactory = typeof createWebGLThumbRender;

/** Test helper: forget the session cache and renderer. */
export function resetSessionThumbs(): void {
  gl?.dispose();
  gl = undefined;
  glFailed = false;
  users = 0;
  sessionSource = null;
}

/**
 * Session-wide source: the data-URL cache lives for the whole session, the WebGL renderer only while an
 * area holds it. Without WebGL (or after release) thumbnails resolve to null, so cards keep placeholders.
 */
export function acquireSessionThumbs(factory: ThumbRenderFactory = createWebGLThumbRender): {
  source: ThumbSource;
  release(): void;
} {
  if (users === 0) currentFactory = factory;
  users++;
  sessionSource ??= createThumbSource((kind, id) => {
    if (users === 0) throw new ThumbUnavailable('thumbnail renderer released');
    if (gl === undefined && !glFailed) {
      gl = currentFactory();
      if (!gl) glFailed = true;
    }
    if (!gl) throw new ThumbUnavailable('WebGL unavailable');
    return gl.render(kind, id);
  });
  let released = false;
  return {
    source: sessionSource,
    release() {
      if (released) return;
      released = true;
      users--;
      if (users === 0) {
        gl?.dispose();
        gl = undefined;
        glFailed = false;
      }
    },
  };
}
