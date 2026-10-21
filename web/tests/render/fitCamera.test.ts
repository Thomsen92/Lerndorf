import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { fitCameraToBox } from '../../src/render/itemPreview';

function extents(box: THREE.Box3, yaw: number, elevation: number): { w: number; h: number } {
  const aspect = 4 / 3;
  const { position, target } = fitCameraToBox(box, 35, aspect, yaw, elevation, 0.88);
  const cam = new THREE.PerspectiveCamera(35, aspect, 0.01, 1000);
  cam.position.copy(position);
  cam.lookAt(target);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const n = new THREE.Vector3(x, y, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).project(cam);
        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
      }
  return { w: maxX - minX, h: maxY - minY };
}

describe('fitCameraToBox', () => {
  it.each([
    ['cube', new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5))],
    ['flat strip', new THREE.Box3(new THREE.Vector3(-3, 0, -0.15), new THREE.Vector3(3, 1, 0.15))],
  ])('fills the limiting axis to about 88%% (%s)', (_n, box) => {
    const { w, h } = extents(box, 0.6, 0.4);
    const limit = Math.max(w / 2, h / 2);
    expect(limit).toBeGreaterThan(0.85);
    expect(limit).toBeLessThan(0.91);
    expect(w / 2).toBeLessThanOrEqual(0.9);
    expect(h / 2).toBeLessThanOrEqual(0.9);
  });
});
