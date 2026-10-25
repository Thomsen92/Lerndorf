import { expect, it } from 'vitest';
import * as THREE from 'three';
import { createChestModel, poseChest, disposeChestModel } from '../../src/render/chestPreview';

it('builds a real chest with a hinged lid and a visible cavity', () => {
  const chest = createChestModel('normal');
  expect(chest.root.getObjectByName('chest-lid')).toBe(chest.lid);
  expect(chest.root.getObjectByName('chest-interior')).toBeTruthy();
  const shell = chest.root.getObjectByName('chest-lid-shell') as THREE.Mesh;
  expect((shell.material as THREE.Material).side).toBe(THREE.DoubleSide);
  let meshes = 0;
  chest.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes++;
  });
  expect(meshes).toBeGreaterThan(8);
  poseChest(chest, { open: 0, hover: false, pending: false, time: 1, reducedMotion: false });
  expect(chest.lid.rotation.x).toBeCloseTo(0);
  poseChest(chest, { open: 1, hover: false, pending: false, time: 2, reducedMotion: false });
  expect(chest.lid.rotation.x).toBeLessThan(-1.5);
  disposeChestModel(chest);
});

it('rattles when hovered or pending, and respects reduced motion', () => {
  const chest = createChestModel('big');
  poseChest(chest, { open: 0, hover: true, pending: false, time: 0.1, reducedMotion: false });
  expect(chest.root.rotation.z).not.toBe(0);
  poseChest(chest, { open: 0, hover: true, pending: true, time: 0.1, reducedMotion: true });
  expect(chest.root.rotation.z).toBe(0);
  expect(chest.lid.rotation.x).toBeCloseTo(0);
  disposeChestModel(chest);
});
