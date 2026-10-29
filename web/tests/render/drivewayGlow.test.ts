import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { createDrivewayGlow } from '../../src/render/drivewayGlow';

it('fits the driveway and keeps a warm ground light for common cars or empty driveways', () => {
  const glow = createDrivewayGlow(3, 7);
  const floor = glow.root.getObjectByName('driveway-light') as THREE.Mesh;
  const bounds = new THREE.Box3().setFromObject(floor);
  expect(bounds.max.x - bounds.min.x).toBeCloseTo(3);
  expect(bounds.max.z - bounds.min.z).toBeCloseTo(7);
  expect(glow.root.getObjectByName('driveway-sparks')!.visible).toBe(false);
  expect(glow.root.getObjectByName('driveway-mist')!.visible).toBe(false);
  expect(floor.visible).toBe(true);
  glow.dispose();
});

it('uses rarity colors, reduces particles and freezes motion without replacing buffers', () => {
  const glow = createDrivewayGlow(3, 7),
    camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 5, 8);
  const floor = glow.root.getObjectByName('driveway-light') as THREE.Mesh<
    THREE.BufferGeometry,
    THREE.ShaderMaterial
  >;
  const sparks = glow.root.getObjectByName('driveway-sparks') as THREE.Points;
  const buffer = sparks.geometry;
  for (const [rarity, color] of [
    ['rare', '#62b8ff'],
    ['epic', '#cc83ff'],
    ['legendary', '#ffd15c'],
  ] as const) {
    glow.setRarity(rarity);
    glow.update(4, camera, 'high', false);
    expect(floor.material.uniforms.uColor.value.getHexString()).toBe(new THREE.Color(color).getHexString());
    expect(sparks.visible).toBe(true);
  }
  const highCount = buffer.drawRange.count;
  glow.update(5, camera, 'low', false);
  expect(buffer.drawRange.count).toBeLessThan(highCount);
  expect(sparks.geometry).toBe(buffer);
  glow.update(10, camera, 'low', true);
  expect(sparks.visible).toBe(false);
  expect(floor.material.uniforms.uTime.value).toBe(0);
  camera.position.z = 60;
  glow.update(10, camera, 'high', false);
  expect(glow.root.getObjectByName('driveway-mist')!.visible).toBe(false);
  const release = vi.spyOn(buffer, 'dispose');
  glow.dispose();
  glow.dispose();
  expect(release).toHaveBeenCalledTimes(1);
});
