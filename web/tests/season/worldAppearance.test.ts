import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createWorldAppearance } from '../../src/season/worldAppearance';
describe('reversible world appearance lifecycle', () => {
  it('replaces exactly one layer, preserves the independent shop and restores normal', async () => {
    const scene = new THREE.Scene(),
      village = new THREE.Group(),
      setTheme = vi.fn(),
      rig = { setTheme: vi.fn() },
      renderer = { toneMappingExposure: 1.05, shadowMap: { needsUpdate: false } };
    village.userData.setTheme = setTheme;
    const dispose = vi.fn(),
      update = vi.fn(),
      shopDispose = vi.fn(),
      shopRoot = new THREE.Group();
    const createLayer = vi.fn(() => ({ root: new THREE.Group(), ready: Promise.resolve(), update, dispose }));
    const appearance = createWorldAppearance({
      scene,
      village,
      rig,
      renderer,
      layout: {} as never,
      createLayer,
      createStand: () => ({ root: shopRoot, ready: Promise.resolve(), dispose: shopDispose }),
    });
    appearance.setTheme('halloween');
    appearance.setTheme('halloween');
    await appearance.ready();
    expect(createLayer).toHaveBeenCalledTimes(1);
    expect(renderer.toneMappingExposure).toBe(0.78);
    appearance.update(0.1, 1, false);
    expect(update).toHaveBeenCalledWith(0.1, 1, false);
    appearance.setTheme('normal');
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(shopRoot.parent).toBe(scene);
    expect(scene.children).toHaveLength(1);
    expect(renderer.toneMappingExposure).toBe(1.05);
    expect(setTheme).toHaveBeenLastCalledWith('normal');
    appearance.dispose();
    expect(shopDispose).toHaveBeenCalledOnce();
    expect(scene.children).toHaveLength(0);
  });
  it('does not reattach a slow disposed layer after a rapid switch', async () => {
    let finish!: () => void;
    const layer = {
      root: new THREE.Group(),
      ready: new Promise<void>((r) => {
        finish = r;
      }),
      update: vi.fn(),
      dispose: vi.fn(),
    };
    const scene = new THREE.Scene();
    const a = createWorldAppearance({
      scene,
      village: new THREE.Group(),
      rig: { setTheme: vi.fn() },
      renderer: { toneMappingExposure: 1.05, shadowMap: { needsUpdate: false } },
      layout: {} as never,
      createLayer: () => layer,
      createStand: () => ({ root: new THREE.Group(), ready: Promise.resolve(), dispose: vi.fn() }),
    });
    a.setTheme('halloween');
    a.setTheme('normal');
    finish();
    await layer.ready;
    expect(layer.root.parent).toBe(null);
    expect(layer.dispose).toHaveBeenCalledOnce();
    a.dispose();
  });
});
