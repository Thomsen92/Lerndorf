// Own CC0 low-poly postcard sculpture. No external model or texture service.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
};
const geometries = [];
function block(w, h, d, x, y, z, color, rotation = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateZ(rotation);
  g.translate(x, y, z);
  const c = new THREE.Color(color),
    a = new Float32Array(g.getAttribute('position').count * 3);
  for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  geometries.push(g);
}
block(1.2, 0.9, 0.05, 0, 0.55, 0, '#fff0ce');
block(1.06, 0.74, 0.025, 0, 0.55, 0.037, '#78b7bd');
block(0.86, 0.08, 0.36, 0, 0.04, -0.01, '#355e67');
block(0.1, 0.9, 0.055, -0.55, 0.55, 0.005, '#e7b258');
block(0.1, 0.9, 0.055, 0.55, 0.55, 0.005, '#e7b258');
for (const [x, h, w] of [
  [-0.38, 0.23, 0.15],
  [-0.2, 0.32, 0.13],
  [0, 0.47, 0.17],
  [0.21, 0.28, 0.16],
  [0.39, 0.2, 0.13],
]) {
  block(w, h, 0.045, x, 0.22 + h / 2, 0.075, '#2a5768');
  for (let y = 0.29; y < 0.22 + h - 0.03; y += 0.075) block(w * 0.55, 0.025, 0.008, x, y, 0.102, '#f9d585');
}
block(0.09, 0.08, 0.05, 0, 0.73, 0.075, '#2a5768');
block(0.018, 0.16, 0.04, 0, 0.83, 0.075, '#2a5768');
block(0.18, 0.19, 0.022, 0.36, 0.83, 0.063, '#f7d27b');
block(0.022, 0.12, 0.018, -0.42, 0.86, 0.064, '#fff8dd');
block(0.022, 0.12, 0.018, -0.33, 0.86, 0.064, '#fff8dd');
block(0.022, 0.145, 0.018, -0.375, 0.86, 0.064, '#fff8dd', 0.64);
block(0.022, 0.07, 0.018, -0.22, 0.835, 0.064, '#fff8dd');
block(0.022, 0.085, 0.018, -0.245, 0.885, 0.064, '#fff8dd', 0.6);
block(0.022, 0.085, 0.018, -0.195, 0.885, 0.064, '#fff8dd', -0.6);
const geometry = mergeGeometries(geometries, false);
const root = new THREE.Group();
root.name = 'Ollies_New_York_Postcard';
root.add(
  new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, flatShading: true }),
  ),
);
root.updateMatrixWorld(true);
const binary = await new GLTFExporter().parseAsync(root, { binary: true });
const bytes = Buffer.from(binary),
  folder = new URL('../../public/assets/shop/', import.meta.url);
writeFileSync(new URL('ollie-nyc-postcard.glb', folder), bytes);
// At <600 triangles the far view intentionally uses the same single-material low-poly sculpture.
writeFileSync(new URL('ollie-nyc-postcard.lod.glb', folder), bytes);
const box = new THREE.Box3().setFromObject(root),
  size = box.getSize(new THREE.Vector3());
const audit = {
  id: 'reward_ollie_nyc_postcard',
  author: 'Lerndorf own geometry',
  license: 'CC0-1.0',
  file: 'shop/ollie-nyc-postcard.glb',
  triangles: geometry.index.count / 3,
  materials: 1,
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  size: size.toArray(),
};
writeFileSync(
  new URL('../../../content/quests/ollie-souvenir-audit.json', import.meta.url),
  JSON.stringify(audit, null, 2) + '\n',
);
const manifestUrl = new URL('manifest.json', folder);
const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
manifest.items = manifest.items.filter((item) => item.id !== audit.id);
manifest.items.push({
  ...audit,
  file: 'ollie-nyc-postcard.glb',
  kind: 'deco',
  name: 'Ollie’s New York Postcard',
  price: 0,
  shopVisible: false,
  rewardOnly: true,
});
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 4) + '\n');
console.log(JSON.stringify(audit));
