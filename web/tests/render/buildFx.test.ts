import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { BuildFx, popScale, shrinkPose, puffLayout, puffOpacity } from '../../src/render/buildFx';
it('uses bounded pop, shrink and smoke curves', () => {
  expect(popScale(0)).toBeCloseTo(0);
  expect(popScale(0.6)).toBe(1);
  expect(popScale(1)).toBe(1);
  const samples = Array.from({ length: 61 }, (_, i) => popScale(i / 100));
  expect(Math.max(...samples)).toBeCloseTo(1.15, 1);
  expect(samples.indexOf(Math.max(...samples))).toBeGreaterThan(30);
  expect(shrinkPose(0)).toEqual({ scale: 1, yaw: 0 });
  expect(shrinkPose(0.4)).toEqual({ scale: 0, yaw: 0.6 });
  expect(puffOpacity(0)).toBe(0.9);
  expect(puffOpacity(0.5)).toBe(0);
  expect(puffLayout(9, 2, 0.4)).toHaveLength(8);
  for (const p of puffLayout(8, 2, 0.4)) {
    expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(2.4);
    expect(p.y).toBeGreaterThanOrEqual(0);
  }
  expect(puffLayout(1, 2, 0.4)[0].scale).toBeGreaterThan(puffLayout(1, 2, 0)[0].scale);
});
it('restores placed objects, detaches removed objects and never disposes shared resources', () => {
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const fx = new BuildFx(scene, { texture: new THREE.Texture(), reducedMotion: () => false });
  const obj = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const dispose = vi.spyOn(obj.geometry, 'dispose');
  const parent = new THREE.Group();
  parent.position.set(3, 2, 1);
  parent.rotation.y = 1;
  scene.add(parent);
  parent.add(obj);
  const smoke = scene.children.find((x) => x instanceof THREE.InstancedMesh)!;
  expect(smoke.visible).toBe(false);
  fx.place(obj, 'deco');
  expect(obj.scale.x).toBe(0);
  fx.update(0.3, camera);
  expect(obj.scale.x).toBeGreaterThan(0);
  fx.update(0.4, camera);
  expect(obj.scale.x).toBe(1);
  expect(fx.busy).toBe(false);
  const position = obj.getWorldPosition(new THREE.Vector3());
  fx.remove(obj, 'deco');
  expect(obj.parent).not.toBe(parent);
  expect(obj.getWorldPosition(new THREE.Vector3()).distanceTo(position)).toBeLessThan(1e-8);
  fx.update(0.45, camera);
  expect(obj.parent).toBe(null);
  parent.add(obj);
  obj.scale.setScalar(1);
  fx.remove(obj, 'deco');
  fx.clear();
  expect(obj.parent).toBe(null);
  expect(smoke.visible).toBe(false);
  parent.add(obj);
  obj.scale.setScalar(1);
  fx.place(obj, 'deco');
  fx.clear();
  expect(obj.scale.x).toBe(1);
  fx.dispose();
  expect(dispose).not.toHaveBeenCalled();
});
it('supports reduced motion and missing smoke texture', () => {
  const scene = new THREE.Scene(),
    obj = new THREE.Object3D();
  scene.add(obj);
  const reduced = new BuildFx(scene, { texture: null, reducedMotion: () => true });
  reduced.place(obj, 'house');
  expect(obj.scale.x).toBe(1);
  expect(reduced.busy).toBe(false);
  reduced.remove(obj, 'house');
  expect(obj.parent).toBe(null);
  reduced.dispose();
  const fx = new BuildFx(scene, { texture: null, reducedMotion: () => false });
  fx.place(obj, 'deco');
  expect(obj.scale.x).toBe(0);
  expect(scene.children.find((x) => x instanceof THREE.InstancedMesh)?.visible).toBe(false);
  fx.dispose();
});
