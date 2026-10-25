import { expect, it } from 'vitest';
import * as THREE from 'three';
import { portraitCamera, createPortraitSource, portraitHeadBounds } from '../../src/render/portrait';
it('frames the head geometry rather than the jaw bone or the legs', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([-0.2, 1.3, 0, 0.2, 1.7, 0, 0, 0.2, 0], 3),
  );
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  const head = new THREE.Bone(),
    leg = new THREE.Bone();
  head.name = 'Head';
  leg.name = 'Leg';
  mesh.add(head, leg);
  mesh.bind(new THREE.Skeleton([head, leg]));
  mesh.updateMatrixWorld(true);
  const bounds = portraitHeadBounds(mesh);
  expect(bounds.min.y).toBeCloseTo(1.3);
  expect(bounds.max.y).toBeCloseTo(1.7);
});
it('frames the head above shoulders', () => {
  const f = portraitCamera(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0, 1.3, 0), 0.3);
  expect(f.target.y).toBeGreaterThan(1.3);
  expect(f.target.y).toBeLessThan(1.5);
  expect(f.position.z).toBeGreaterThan(0.8);
  expect(f.fov).toBe(30);
});
it('caches successful portraits and retries failures', async () => {
  let count = 0;
  const source = createPortraitSource(async () => {
    count++;
    if (count === 1) throw Error();
    return 'png';
  });
  expect(await source('boy')).toBeNull();
  expect(await source('boy')).toBe('png');
  expect(await source('boy')).toBe('png');
  expect(count).toBe(2);
});
