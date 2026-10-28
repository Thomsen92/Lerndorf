import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../../src/render/kenney', () => ({ kenneyModel: vi.fn().mockResolvedValue(null) }));
import { createHalloweenLayer } from '../../src/render/season/halloweenLayer';
import { buildLayout } from '../../src/world/layout';
import { kenneyModel } from '../../src/render/kenney';

it('is usable synchronously and ready resolves with procedural fallbacks when assets fail', async () => {
  const layer = createHalloweenLayer(buildLayout(11, 4));
  expect(layer.root).toBeInstanceOf(THREE.Group);
  expect(layer.root.getObjectByName('bloodFountain')).toBeTruthy();
  await expect(layer.ready).resolves.toBeUndefined();
  expect(layer.root.userData.assetFailures.length).toBeGreaterThan(0);
  layer.update(0.016, 1, true);
  const first = layer.root.toJSON();
  layer.update(0.016, 19, true);
  expect(layer.root.toJSON()).toEqual(first);
  layer.dispose();
  layer.dispose();
  expect(layer.root.children).toHaveLength(0);
});

it('does not dispose cached model geometry or material on teardown or a late load', async () => {
  const geometry = new THREE.BoxGeometry(),
    material = new THREE.MeshStandardMaterial();
  const dg = vi.spyOn(geometry, 'dispose'),
    dm = vi.spyOn(material, 'dispose');
  const finish: Array<
    (model: { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; plain: null }) => void
  > = [];
  vi.mocked(kenneyModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish.push(resolve);
      }),
  );
  const layer = createHalloweenLayer(buildLayout(12, 2));
  layer.dispose();
  finish.forEach((resolve) => resolve({ geometry, material, plain: null }));
  await layer.ready;
  expect(layer.root.children).toHaveLength(0);
  expect(dg).not.toHaveBeenCalled();
  expect(dm).not.toHaveBeenCalled();
  vi.mocked(kenneyModel).mockResolvedValue(null);
});

it('keeps the cache reusable after disposing a fully loaded live layer', async () => {
  const geometry = new THREE.BoxGeometry(),
    material = new THREE.MeshStandardMaterial();
  const dg = vi.spyOn(geometry, 'dispose'),
    dm = vi.spyOn(material, 'dispose');
  vi.mocked(kenneyModel).mockResolvedValue({ geometry, material, plain: null });
  const layer = createHalloweenLayer(buildLayout(12, 2));
  await layer.ready;
  layer.update(0.016, 2, false);
  layer.dispose();
  expect(dg).not.toHaveBeenCalled();
  expect(dm).not.toHaveBeenCalled();
  vi.mocked(kenneyModel).mockResolvedValue(null);
});
