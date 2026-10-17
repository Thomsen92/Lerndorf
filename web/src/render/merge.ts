/**
 * Performance (PLAN L.9, SPEC §10.11): static scenery is merged into a few meshes, one per material
 * kind. Textured surfaces (ground, paths, paving), water, instanced meshes, sprites and anything
 * with a click role (userData.kind) stay as they are.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function isBakeable(mesh: THREE.Mesh): boolean {
  if (mesh instanceof THREE.InstancedMesh) return false;
  if (mesh.userData.kind) return false;
  const m = mesh.material;
  if (Array.isArray(m)) return false;
  const std = m as THREE.MeshStandardMaterial;
  if (std.map) return false; // textured: keep the texture
  if (std.transparent) return false;
  if (std.emissive && std.emissive.getHex() !== 0) return false; // water and other glowing surfaces
  return m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial;
}

/** Geometry of one mesh in root space, with its colour as a vertex attribute. */
function bakedGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const k of Object.keys(geo.attributes)) {
    if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
  }
  if (!geo.attributes.normal) geo.computeVertexNormals();
  mesh.updateWorldMatrix(true, false);
  geo.applyMatrix4(mesh.matrixWorld);
  const colour = (mesh.material as THREE.MeshStandardMaterial).color ?? new THREE.Color('#ffffff');
  const count = geo.attributes.position.count;
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    col[i * 3] = colour.r;
    col[i * 3 + 1] = colour.g;
    col[i * 3 + 2] = colour.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/**
 * Merges the static meshes under `root` into one lit and one unlit mesh (plus the untouched rest).
 * Returns the same root, so the caller keeps its references.
 */
export function bakeStatic(root: THREE.Group): THREE.Group {
  const toBake: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh && isBakeable(o)) toBake.push(o);
  });
  const lit: THREE.BufferGeometry[] = [];
  const unlit: THREE.BufferGeometry[] = [];
  for (const mesh of toBake) {
    const basic = mesh.material instanceof THREE.MeshBasicMaterial;
    (basic ? unlit : lit).push(bakedGeometry(mesh));
    mesh.parent?.remove(mesh);
  }
  if (lit.length > 0) {
    const mesh = new THREE.Mesh(
      mergeGeometries(lit),
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  if (unlit.length > 0) {
    root.add(new THREE.Mesh(mergeGeometries(unlit), new THREE.MeshBasicMaterial({ vertexColors: true })));
  }
  return root;
}
