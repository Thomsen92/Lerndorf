import * as THREE from 'three';
import type { WorldTheme } from '../api/worldTheme';
import type { Layout } from '../world/layout';
import { createHalloweenLayer, type HalloweenLayer } from '../render/season/halloweenLayer';
import { createSpookyStand, type SpookyStand } from './spookyStand';

export interface WorldAppearance {
  setTheme(theme: WorldTheme): void;
  update(dt: number, elapsed: number, reducedMotion: boolean): void;
  ready(): Promise<void>;
  dispose(): void;
  readonly theme: WorldTheme;
}

/** Three's raycaster includes hidden meshes; removed seasonal groups must not intercept taps. */
export function isWorldObjectVisible(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

/** Coordinates one removable theme layer without rebuilding plots or their stored items. */
export function createWorldAppearance(opts: {
  scene: THREE.Scene;
  village: THREE.Group;
  layout: Layout;
  rig: { setTheme(theme: WorldTheme): void };
  renderer: { toneMappingExposure: number; shadowMap: { needsUpdate: boolean } };
  createLayer?: (layout: Layout) => HalloweenLayer;
  createStand?: (layout: Layout) => SpookyStand;
}): WorldAppearance {
  let theme: WorldTheme = 'normal',
    layer: HalloweenLayer | null = null,
    disposed = false;
  const stand = (opts.createStand ?? createSpookyStand)(opts.layout);
  opts.scene.add(stand.root);
  void stand.ready.then(() => {
    if (!disposed) opts.renderer.shadowMap.needsUpdate = true;
  });
  function setTheme(next: WorldTheme): void {
    if (disposed || next === theme) return;
    layer?.root.removeFromParent();
    layer?.dispose();
    layer = null;
    opts.rig.setTheme(next);
    (opts.village.userData.setTheme as ((t: WorldTheme) => void) | undefined)?.(next);
    opts.renderer.toneMappingExposure = next === 'halloween' ? 0.78 : 1.05;
    theme = next;
    if (next === 'halloween') {
      const active = (opts.createLayer ?? createHalloweenLayer)(opts.layout);
      layer = active;
      opts.scene.add(active.root);
      void active.ready.then(() => {
        if (!disposed && layer === active) opts.renderer.shadowMap.needsUpdate = true;
      });
    }
    opts.renderer.shadowMap.needsUpdate = true;
  }
  return {
    get theme() {
      return theme;
    },
    setTheme,
    update(dt, elapsed, reducedMotion) {
      if (!disposed) layer?.update(dt, elapsed, reducedMotion);
    },
    async ready() {
      await Promise.all([stand.ready, layer?.ready]);
    },
    dispose() {
      if (disposed) return;
      setTheme('normal');
      disposed = true;
      stand.root.removeFromParent();
      stand.dispose();
    },
  };
}
