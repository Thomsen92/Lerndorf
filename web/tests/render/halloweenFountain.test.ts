import { expect, it } from 'vitest';
import * as THREE from 'three';
import { createBloodFountain, centerPulseAt } from '../../src/render/season/bloodFountain';

it('plays two short pulses then a taller, longer third pulse', () => {
  expect(centerPulseAt(0.09).height).toBeCloseTo(2.8);
  expect(centerPulseAt(0.64).height).toBeCloseTo(2.8);
  expect(centerPulseAt(1.26).height).toBeCloseTo(3.25);
  expect(centerPulseAt(2).active).toBe(false);
  expect(centerPulseAt(2.89).height).toBeCloseTo(2.8);
});

it('deforms real jet vertices and freezes all fountain effects for reduced motion', () => {
  const fountain = createBloodFountain();
  const mesh = fountain.root.getObjectByName('bloodStreams') as THREE.Mesh;
  fountain.update(0.25, false);
  const first = Array.from(mesh.geometry.getAttribute('position').array);
  fountain.update(0.7, false);
  expect(Array.from(mesh.geometry.getAttribute('position').array)).not.toEqual(first);
  fountain.update(1, true);
  const still = fountain.root.toJSON();
  fountain.update(8, true);
  expect(fountain.root.toJSON()).toEqual(still);
  const dispose = new Map<THREE.BufferGeometry | THREE.Material, number>();
  fountain.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      for (const resource of [o.geometry, ...[o.material].flat()]) {
        if (dispose.has(resource)) continue;
        dispose.set(resource, 0);
        resource.addEventListener('dispose', () => dispose.set(resource, dispose.get(resource)! + 1));
      }
    }
  });
  fountain.dispose();
  fountain.dispose();
  expect([...dispose.values()].every((n) => n === 1)).toBe(true);
});
