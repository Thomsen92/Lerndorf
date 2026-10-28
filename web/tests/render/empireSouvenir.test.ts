import { readFileSync, existsSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { GLB_ITEMS } from '../../src/render/glbItems';
it('keeps only the supplied Empire State mesh centred, grounded and miniature', () => {
  const file = new URL('../../public/assets/shop/ollie-empire-state.glb', import.meta.url);
  const bytes = readFileSync(file);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  expect(json.meshes).toHaveLength(1);
  expect(json.materials).toHaveLength(1);
  expect(json.images).toHaveLength(1);
  expect(json.images[0].uri).toBeUndefined();
  expect(json.images[0].bufferView).toBeDefined();
  expect(json.meshes[0].primitives).toHaveLength(1);
  const box = new THREE.Box3();
  const walk = (index: number, parent: THREE.Matrix4) => {
    const node = json.nodes[index];
    const m = new THREE.Matrix4();
    if (node.matrix) m.fromArray(node.matrix);
    else
      m.compose(
        new THREE.Vector3(...(node.translation ?? [0, 0, 0])),
        new THREE.Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
        new THREE.Vector3(...(node.scale ?? [1, 1, 1])),
      );
    m.premultiply(parent);
    if (node.mesh !== undefined)
      for (const p of json.meshes[node.mesh].primitives) {
        const a = json.accessors[p.attributes.POSITION];
        box.union(new THREE.Box3(new THREE.Vector3(...a.min), new THREE.Vector3(...a.max)).applyMatrix4(m));
        expect(json.accessors[p.indices].count / 3).toBe(1368);
      }
    for (const child of node.children ?? []) walk(child, m);
  };
  for (const root of json.scenes[json.scene ?? 0].nodes) walk(root, new THREE.Matrix4());
  const size = box.getSize(new THREE.Vector3()),
    centre = box.getCenter(new THREE.Vector3());
  expect(size.y).toBeCloseTo(1.8, 5);
  expect(size.x).toBeLessThan(0.3);
  expect(size.z).toBeLessThan(0.3);
  expect(box.min.y).toBeCloseTo(0, 5);
  expect(centre.x).toBeCloseTo(0, 5);
  expect(centre.z).toBeCloseTo(0, 5);
  expect(GLB_ITEMS.reward_ollie_nyc_postcard.file).toBe('shop/ollie-empire-state.glb');
  expect(existsSync(new URL('../../public/assets/shop/ollie-nyc-postcard.glb', import.meta.url))).toBe(true);
  const licence = readFileSync(
    new URL('../../public/assets/shop/LICENSE-ollie-empire-state.txt', import.meta.url),
    'utf8',
  );
  expect(licence).toContain('sumitmangela');
  expect(licence).toContain('creativecommons.org/licenses/by/4.0');
});
