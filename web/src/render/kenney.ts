/**
 * Kenney models (CC0, blender/sources/LICENSES.md): Forest Kit, Survival Kit and Fantasy Town Kit,
 * copied as GLB to public/assets/kenney/<pack>/. Every model is one mesh that samples the pack's
 * gradient palette (Textures/colormap.png), so all instances of a model are one InstancedMesh.
 *
 * Foliage can be recoloured per instance: on load, each vertex looks up its palette colour, and
 * green ones are marked as leaves (attribute aLeaf). The instanced material then replaces the hue
 * of the leaves with the instance tint (attribute aTint) and keeps the palette's light-to-dark
 * shading; trunks and stones keep their colours. A white tint keeps the original greens.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type Pack = 'forests' | 'survival' | 'town' | 'food' | 'nature' | 'graveyard';

export interface KenneyModel {
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  /** Parts without palette texture (the water of a fountain), merged; null if there are none. */
  plain: THREE.BufferGeometry | null;
}

const BASE = `${import.meta.env.BASE_URL}assets/kenney/`;

/** Plain colours of the Nature Kit, mapped to the flower and meadow colours of LOOK §4/§8. */
const PLAIN_COLOURS: Record<string, string> = {
  grass: '#5f9150',
  colorRed: '#eb5757',
  colorPurple: '#bb6bd9',
  colorYellow: '#f2c94c',
  colorWhite: '#fff6e0',
};
const loader = new GLTFLoader();
const cache = new Map<string, Promise<KenneyModel | null>>();
const pending: Array<Promise<unknown>> = [];

/** Palette pixels of one pack, read once from the loaded texture (for the leaf mask). */
const palettes = new Map<THREE.Texture, ImageData | null>();

function paletteOf(tex: THREE.Texture | null): ImageData | null {
  if (!tex) return null;
  if (palettes.has(tex)) return palettes.get(tex) ?? null;
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  let data: ImageData | null = null;
  try {
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    const cx = cv.getContext('2d');
    if (cx) {
      cx.drawImage(img, 0, 0);
      data = cx.getImageData(0, 0, img.width, img.height);
    }
  } catch {
    data = null; // no leaf mask: the model keeps its own colours
  }
  palettes.set(tex, data);
  return data;
}

/** 1 for vertices whose palette colour is green (foliage), else 0. */
function leafMask(geo: THREE.BufferGeometry, tex: THREE.Texture | null): Float32Array {
  const uv = geo.getAttribute('uv');
  const mask = new Float32Array(geo.getAttribute('position').count);
  const pal = paletteOf(tex);
  if (!uv || !pal || !tex) return mask;
  const m = tex.matrix; // KHR_texture_transform, if the pack uses it
  const v = new THREE.Vector3();
  for (let i = 0; i < mask.length; i++) {
    v.set(uv.getX(i), uv.getY(i), 1).applyMatrix3(m);
    const px = Math.min(pal.width - 1, Math.max(0, Math.floor((v.x - Math.floor(v.x)) * pal.width)));
    // glTF textures are not flipped: v = 0 is the top row of the image
    const py = Math.min(pal.height - 1, Math.max(0, Math.floor((v.y - Math.floor(v.y)) * pal.height)));
    const o = (py * pal.width + px) * 4;
    const r = pal.data[o];
    const g = pal.data[o + 1];
    const b = pal.data[o + 2];
    mask[i] = g > r + 20 && g > b - 10 ? 1 : 0;
  }
  return mask;
}

function load(pack: Pack, name: string): Promise<KenneyModel | null> {
  const key = `${pack}/${name}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = loader
    .loadAsync(`${BASE}${pack}/${name}.glb`)
    .then((gltf) => {
      gltf.scene.updateMatrixWorld(true);
      const parts: THREE.BufferGeometry[] = [];
      const plainParts: THREE.BufferGeometry[] = [];
      let map: THREE.Texture | null = null;
      const meshes: THREE.Mesh[] = [];
      gltf.scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
      });
      // models without any palette texture (Nature Kit: one plain colour per part) get their
      // colours baked into the vertices; in textured models, plain parts are extras (water)
      const textured = meshes.some((mesh) => (mesh.material as THREE.MeshStandardMaterial).map);
      for (const mesh of meshes) {
        const src = mesh.material as THREE.MeshStandardMaterial;
        if (!map && src.map) map = src.map;
        const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
        const flat = (g.index ? g.toNonIndexed() : g) as THREE.BufferGeometry;
        const keep = new THREE.BufferGeometry();
        keep.setAttribute('position', flat.getAttribute('position'));
        keep.setAttribute('normal', flat.getAttribute('normal'));
        if (textured && !src.map) {
          plainParts.push(keep);
          continue;
        }
        if (textured) {
          keep.setAttribute('uv', flat.getAttribute('uv'));
        } else {
          const n = keep.getAttribute('position').count;
          const col = new Float32Array(n * 3);
          const own = PLAIN_COLOURS[src.name];
          const c = own ? new THREE.Color(own) : src.color.clone(); // linear, as vertex colours are
          for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
          keep.setAttribute('color', new THREE.BufferAttribute(col, 3));
        }
        parts.push(keep);
      }
      if (parts.length === 0) return null;
      const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts);
      geometry.setAttribute('aLeaf', new THREE.BufferAttribute(leafMask(geometry, map), 1));
      geometry.computeBoundingBox();
      const material = new THREE.MeshStandardMaterial({
        map,
        vertexColors: !textured,
        roughness: 0.88,
        flatShading: true,
      });
      const plain = plainParts.length === 0 ? null : mergeGeometries(plainParts);
      return { geometry, material, plain };
    })
    .catch(() => null); // missing file: the caller keeps its placeholder
  cache.set(key, p);
  pending.push(p);
  return p;
}

/** Resolves once every model requested so far has loaded (or failed). */
export function kenneyReady(): Promise<void> {
  return Promise.all(pending).then(() => undefined);
}

/** Loads a model; geometry and material are shared, do not change them. */
export function kenneyModel(pack: Pack, name: string): Promise<KenneyModel | null> {
  return load(pack, name);
}

/**
 * Material for instanced Kenney models with leaf tinting: per instance `aTint` (RGB). White keeps
 * the palette; any other colour replaces the hue of the leaves and keeps their shading.
 */
export function tintedMaterial(base: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  const mat = base.clone();
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aLeaf;
        attribute vec3 aTint;
        varying float vLeaf;
        varying vec3 vTint;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLeaf = aLeaf;
        vTint = aTint;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vLeaf;
        varying vec3 vTint;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float keep = step(2.99, vTint.r + vTint.g + vTint.b);
          float luma = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          vec3 leaf = vTint * (0.35 + luma * 1.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, leaf, vLeaf * (1.0 - keep));
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'kenney-tinted';
  return mat;
}

/** One instanced mesh of a Kenney model; `tint` per instance (white = palette colours). */
export function instancedModel(
  model: KenneyModel,
  matrices: THREE.Matrix4[],
  tints?: THREE.Color[],
): THREE.InstancedMesh {
  const geo = model.geometry.clone();
  const tint = new Float32Array(matrices.length * 3).fill(1);
  tints?.forEach((c, i) => tint.set([c.r, c.g, c.b], i * 3));
  geo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tint, 3));
  const mesh = new THREE.InstancedMesh(geo, tintedMaterial(model.material), matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** One model choice for a scatter: the model is scaled so its height is `height` metres. */
export interface Variant {
  pack: Pack;
  name: string;
  height: number;
}

/**
 * Places `items` with Kenney models, one InstancedMesh per variant. The placeholder (the old
 * procedural meshes) stays visible until every variant has loaded; if one fails, it stays for good.
 * `place` writes the matrix for an item: `unit` is the scale that brings the model to its height.
 */
export function kenneyScatter<T>(
  items: T[],
  variants: Variant[],
  pick: (item: T, i: number) => number,
  place: (item: T, i: number, unit: number, m: THREE.Matrix4) => void,
  options: { tint?: (item: T, i: number) => THREE.Color | null; shadows?: boolean; placeholder?: THREE.Object3D } = {},
): THREE.Group {
  const g = new THREE.Group();
  if (options.placeholder) g.add(options.placeholder);
  if (items.length === 0) return g;
  void Promise.all(variants.map((v) => kenneyModel(v.pack, v.name))).then((models) => {
    if (models.some((m) => !m)) return;
    const white = new THREE.Color(1, 1, 1);
    const meshes = models.map((model, vi) => {
      const m = model as KenneyModel;
      const box = m.geometry.boundingBox as THREE.Box3;
      const unit = variants[vi].height / Math.max(0.01, box.max.y - box.min.y);
      const mats: THREE.Matrix4[] = [];
      const tints: THREE.Color[] = [];
      items.forEach((it, i) => {
        if (pick(it, i) % variants.length !== vi) return;
        const mat = new THREE.Matrix4();
        place(it, i, unit, mat);
        mats.push(mat);
        tints.push(options.tint?.(it, i) ?? white);
      });
      const mesh = instancedModel(m, mats, tints);
      mesh.castShadow = options.shadows ?? false;
      return mesh;
    });
    if (options.placeholder) g.remove(options.placeholder);
    for (const mesh of meshes) if (mesh.count > 0) g.add(mesh);
  });
  return g;
}
