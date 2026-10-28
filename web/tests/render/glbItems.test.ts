// A1: the GLB item registry must cover exactly the season and shop manifests, and the loader must
// normalise models into the MAX_SIZE box of their kind.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLB_ITEMS, MIN_DECO_SIZE, glbAsset, loadGlbItem, normaliseGlb } from '../../src/render/glbItems';
import { teacherDb } from '../teacherDb';

// The loader is replaced by a stub that returns one 1 x 0.5 x 0.5 m box, so the cache and the
// placeholder logic can be tested without files.
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder(): void {}
    loadAsync(): Promise<{ scene: THREE.Group }> {
      const scene = new THREE.Group();
      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.5)));
      return Promise.resolve({ scene });
    }
  },
}));

function sizeOf(object: THREE.Object3D): THREE.Vector3 {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
}

function boxScene(w: number, h: number, d: number): THREE.Group {
  const scene = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  mesh.position.set(3, h / 2 + 1, -2); // off-centre and floating, like the kit-* models
  scene.add(mesh);
  return scene;
}
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

  it('never enlarges a model that already fits (review B5)', () => {
    const size = sizeOf(normaliseGlb(boxScene(1, 1.4, 1), { file: 'x.glb', kind: 'deco' }));
    expect(size.y).toBeCloseTo(1.4, 2);
  });

  it('grows tiny decorations to 0.8 m on their longest side', () => {
    const size = sizeOf(normaliseGlb(boxScene(0.4, 0.2, 0.1), { file: 'x.glb', kind: 'deco' }));
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(MIN_DECO_SIZE, 2);
  });

  it('turns cars modelled along X before fitting them (review B5)', () => {
    const size = sizeOf(
      normaliseGlb(boxScene(4.5, 2.1, 2.1), { file: 'x.glb', kind: 'car', yaw: Math.PI / 2 }),
    );
    expect(size.z).toBeCloseTo(4.5, 1);
    expect(size.x).toBeCloseTo(2.1, 1);
  });

  it('turns Toyoyo and Beatall a quarter so their length lies on Z', () => {
    expect(GLB_ITEMS.shop_toyoyo.yaw).toBeCloseTo(Math.PI / 2);
    expect(GLB_ITEMS.shop_beatall.yaw).toBeCloseTo(Math.PI / 2);
  });

  it('gives every caller its own model, so two plots and a thumbnail never steal it (review B1)', async () => {
    const a = await loadGlbItem('season_bat');
    const b = await loadGlbItem('season_bat');
    expect(a).not.toBe(b);
    a.rotation.y = 0.6;
    expect(b.rotation.y).toBe(0);

    const plotA = glbAsset('season_bat', 'deco');
    const plotB = glbAsset('season_bat', 'deco');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const lodOf = (g: THREE.Group) => g.children.find((c) => c instanceof THREE.LOD) as THREE.LOD;
    expect(lodOf(plotA).levels[0].object.children.length).toBeGreaterThan(0);
    expect(lodOf(plotB).levels[0].object.children.length).toBeGreaterThan(0);
    expect(lodOf(plotA).levels[0].object).not.toBe(lodOf(plotB).levels[0].object);
    // the placeholder is gone once the model is there
    expect(plotA.children.filter((c) => c instanceof THREE.Mesh)).toHaveLength(0);
  });
});

describe('item ids of the migrations', () => {
  it('uses the final migrated model paths, including later souvenir replacements', async () => {
    const db = await teacherDb();
    try {
      const { rows } = await db.query<{ id: string; model: string }>(
        "select id,model from public.items where model like 'shop/%.glb' or model like 'season1/%.glb'",
      );
      expect(rows.length).toBeGreaterThan(50);
      for (const row of rows) expect(GLB_ITEMS[row.id]?.file, row.id).toBe(row.model);
    } finally {
      await db.close();
    }
  }, 30000);
});
