// A1: the GLB item registry must cover exactly the season and shop manifests, and the loader must
// normalise models into the MAX_SIZE box of their kind.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLB_ITEMS, normaliseGlb } from '../../src/render/glbItems';
import { MAX_SIZE } from '../../src/world/plotPlan';

const season = JSON.parse(
  readFileSync(new URL('../../public/assets/season1/manifest.json', import.meta.url), 'utf8'),
) as { items: Array<{ file: string; kind: string }> };
const shop = JSON.parse(
  readFileSync(new URL('../../public/assets/shop/manifest.json', import.meta.url), 'utf8'),
) as { items: Array<{ file: string; kind: string }> };

describe('glb item registry', () => {
  it('covers every season and shop model', () => {
    const files = new Set(Object.values(GLB_ITEMS).map((i) => i.file));
    for (const item of season.items) expect(files.has(`season1/${item.file}`)).toBe(true);
    for (const item of shop.items) expect(files.has(`shop/${item.file}`)).toBe(true);
  });

  it('has no entry without a manifest model', () => {
    const known = new Set([
      ...season.items.map((i) => `season1/${i.file}`),
      ...shop.items.map((i) => `shop/${i.file}`),
    ]);
    for (const spec of Object.values(GLB_ITEMS)) expect(known.has(spec.file)).toBe(true);
  });

  it('keeps the item kind in sync with the manifests', () => {
    const byFile = new Map<string, string>();
    for (const item of season.items) byFile.set(`season1/${item.file}`, item.kind);
    for (const item of shop.items) byFile.set(`shop/${item.file}`, item.kind);
    for (const spec of Object.values(GLB_ITEMS)) expect(byFile.get(spec.file)).toBe(spec.kind);
  });

  it('fits the model into MAX_SIZE and stands it on y = 0', () => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1));
    mesh.position.y = 2; // bottom at 0
    scene.add(mesh);
    const group = normaliseGlb(scene, { file: 'x.glb', kind: 'deco' });
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    expect(size.y).toBeCloseTo(MAX_SIZE.deco.h, 1);
    expect(size.x).toBeLessThanOrEqual(MAX_SIZE.deco.w + 0.01);
    expect(size.z).toBeLessThanOrEqual(MAX_SIZE.deco.d + 0.01);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 2);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 2);
  });
});
