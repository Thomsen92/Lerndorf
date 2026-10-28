import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLB_ITEMS, normaliseGlb } from '../../src/render/glbItems';
import { MAX_SIZE } from '../../src/world/plotPlan';

const path = new URL('../../../content/shop/ollie-items.json', import.meta.url);
const expected = [
  ['shop_evening_lantern', 'deco', 40], ['shop_sunday_bench', 'deco', 55],
  ['shop_pocket_meadow', 'deco', 25], ['shop_one_more_chapter', 'deco', 65],
  ['shop_little_big_oak', 'deco', 45], ['shop_support_duck', 'deco', 20],
  ['shop_rainy_day_barrel', 'deco', 35], ['shop_apple_of_my_eye', 'deco', 10],
  ['shop_little_blue_cottage', 'house', 140], ['shop_apple_gable_cottage', 'house', 100],
  ['shop_moss_corner_cottage', 'house', 125], ['shop_lantern_house', 'house', 150],
  ['shop_apple_gable_garage', 'garage', 75], ['shop_moss_workshop', 'garage', 100],
];
type Product = { id: string; kind: 'house' | 'garage' | 'deco'; price: number; file: string; nameEn: string; nameDe: string; descriptionEn: string; descriptionDe: string };
const products: Product[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).items : [];

// Node has no browser image decoder. Keep the exact binary geometry and node transforms;
// only strip materials for the bounds test. The export tool separately reloads complete
// textured GLBs in Chromium and records their bounds in ollie-audit.json.
// glTF JSON is free-form here; only meshes, materials and images are touched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geometryGlb(bytes: Buffer, json: Record<string, any>): ArrayBuffer {
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) delete primitive.material;
  delete json.materials;
  delete json.images;
  delete json.textures;
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.alloc(Math.ceil(text.length / 4) * 4, 32);
  text.copy(padded);
  const binary = bytes.subarray(20 + bytes.readUInt32LE(12));
  const result = Buffer.alloc(20 + padded.length + binary.length);
  result.writeUInt32LE(0x46546c67, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded.length, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(result, 20);
  binary.copy(result, 20 + padded.length);
  return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
}

describe('approved Ollie catalogue', () => {
  it('contains exactly the fourteen approved IDs, existing kinds and prices', () => {
    expect(products.map((p) => [p.id, p.kind, p.price])).toEqual(expected);
    for (const p of products) {
      expect(p.nameEn.length).toBeGreaterThan(3);
      expect(p.nameDe.length).toBeGreaterThan(3);
      expect(p.descriptionEn.length).toBeGreaterThan(10);
      expect(p.descriptionDe.length).toBeGreaterThan(10);
    }
  });

  it('loads self-contained real models, keeps their scale and fits every slot including overhangs', async () => {
    expect(products).toHaveLength(14);
    const loader = new GLTFLoader();
    for (const p of products) {
      expect(GLB_ITEMS[p.id]).toMatchObject({ file: `shop/${p.file}`, kind: p.kind });
      expect(GLB_ITEMS[p.id].fill).not.toBe(true);
      const bytes = readFileSync(new URL(`../../public/assets/shop/${p.file}`, import.meta.url));
      const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
      expect((json.buffers ?? []).every((b: { uri?: string }) => !b.uri)).toBe(true);
      expect((json.images ?? []).every((i: { uri?: string }) => !i.uri)).toBe(true);
      const gltf = await loader.parseAsync(geometryGlb(bytes, json), '');
      const original = new THREE.Box3().setFromObject(gltf.scene, true).getSize(new THREE.Vector3());
      const box = new THREE.Box3().setFromObject(normaliseGlb(gltf.scene, GLB_ITEMS[p.id]), true);
      const size = box.getSize(new THREE.Vector3());
      expect(size.x).toBeLessThanOrEqual(MAX_SIZE[p.kind].w + 0.001);
      expect(size.z).toBeLessThanOrEqual(MAX_SIZE[p.kind].d + 0.001);
      expect(size.y).toBeLessThanOrEqual(MAX_SIZE[p.kind].h + 0.001);
      expect(box.min.y).toBeCloseTo(0, 4);
      expect(size.x).toBeCloseTo(original.x, 3);
      expect(size.y).toBeCloseTo(original.y, 3);
      expect(size.z).toBeCloseTo(original.z, 3);
      expect(size.length()).toBeGreaterThan(0.5);
    }
  });
});
