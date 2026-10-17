/**
 * Arched wooden footbridges (LOOK §9, review befund 6): a gently curved deck over the river, slim
 * rails on both sides. One merged mesh per bridge, placeholder geometry.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Bridge } from '../world/layout';

const DECK_WIDTH = 2.0;
const ARCH = 0.8; // how much the middle rises above the ends
const RAIL_HEIGHT = 0.85;
const SEGMENTS = 14;

/** Point on the arched deck: t from 0 (bank a) to 1 (bank b). */
function deckPoint(b: Bridge, t: number): { x: number; y: number; z: number; nx: number; nz: number } {
  const x = b.a.x + (b.b.x - b.a.x) * t;
  const z = b.a.z + (b.b.z - b.a.z) * t;
  const y = b.y + ARCH * Math.sin(Math.PI * t);
  const len = Math.hypot(b.b.x - b.a.x, b.b.z - b.a.z) || 1;
  return { x, y, z, nx: -(b.b.z - b.a.z) / len, nz: (b.b.x - b.a.x) / len };
}

/** Deck: a curved strip of planks, drawn as a ribbon over the arch. */
function deckGeometry(b: Bridge): THREE.BufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const p = deckPoint(b, i / SEGMENTS);
    const hw = DECK_WIDTH / 2;
    verts.push(p.x + p.nx * hw, p.y, p.z + p.nz * hw, p.x - p.nx * hw, p.y, p.z - p.nz * hw);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Thin box between two points, used for rail posts and rails. */
function stick(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  thick: number,
): THREE.BufferGeometry {
  const dx = bx - ax;
  const dy = by - ay;
  const dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1e-6;
  const geo = new THREE.BoxGeometry(thick, thick, len);
  // point the box along the segment
  const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  geo.applyQuaternion(quat);
  geo.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  return geo;
}

/** Slim handrails on both sides with a post every few segments. */
function railGeometry(b: Bridge): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const side of [-1, 1]) {
    let prev: { x: number; y: number; z: number } | null = null;
    for (let i = 0; i <= SEGMENTS; i++) {
      const p = deckPoint(b, i / SEGMENTS);
      const off = (DECK_WIDTH / 2) * side;
      const top = { x: p.x + p.nx * off, y: p.y + RAIL_HEIGHT, z: p.z + p.nz * off };
      if (prev) parts.push(stick(prev.x, prev.y, prev.z, top.x, top.y, top.z, 0.05));
      if (i % 4 === 0 || i === SEGMENTS) {
        parts.push(stick(top.x, p.y, top.z, top.x, top.y, top.z, 0.07));
      }
      prev = top;
    }
  }
  return mergeGeometries(parts);
}

/** One arched bridge: deck plus slim rails. */
export function buildBridge(b: Bridge, wood: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(deckGeometry(b), wood);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);
  const rails = new THREE.Mesh(railGeometry(b), wood);
  rails.castShadow = true;
  g.add(rails);
  return g;
}
