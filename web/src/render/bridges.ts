/**
 * Arched wooden footbridges (LOOK §9, review befund 6): a gently curved deck over the river, slim
 * rails on both sides. One merged mesh per bridge, placeholder geometry.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bridgeHeight, type Bridge } from '../world/layout';

const DECK_WIDTH = 2.0;
const RAIL_HEIGHT = 0.85;
const SEGMENTS = 14;

/** Point on the arched deck: t from 0 (bank a) to 1 (bank b). */
function deckPoint(b: Bridge, t: number): { x: number; y: number; z: number; nx: number; nz: number } {
  const x = b.a.x + (b.b.x - b.a.x) * t;
  const z = b.a.z + (b.b.z - b.a.z) * t;
  const y = bridgeHeight(b, t);
  const len = Math.hypot(b.b.x - b.a.x, b.b.z - b.a.z) || 1;
  return { x, y, z, nx: -(b.b.z - b.a.z) / len, nz: (b.b.x - b.a.x) / len };
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

/**
 * Planks with thickness: one box per segment, tilted along the arch, with a small gap between them,
 * plus two beams underneath along the edges. The deck reads as wood from the side, not as a ribbon.
 */
function plankGeometry(b: Bridge): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const p = deckPoint(b, i / SEGMENTS);
    const q = deckPoint(b, (i + 1) / SEGMENTS);
    const len = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
    const plank = new THREE.BoxGeometry(DECK_WIDTH, 0.14, Math.max(0.05, len - 0.05));
    // explicit basis: x across the deck (horizontal), z along the arch, y perpendicular to both.
    // A plain "rotate z onto the direction" quaternion would also roll the plank (review 20.10.).
    const along = new THREE.Vector3(q.x - p.x, q.y - p.y, q.z - p.z).normalize();
    const across = new THREE.Vector3(p.nx, 0, p.nz).normalize();
    const up = new THREE.Vector3().crossVectors(along, across).normalize();
    if (up.y < 0) {
      up.negate();
      across.negate();
    }
    plank.applyMatrix4(new THREE.Matrix4().makeBasis(across, up, along));
    plank.translate(
      (p.x + q.x) / 2 - up.x * 0.07,
      (p.y + q.y) / 2 - up.y * 0.07,
      (p.z + q.z) / 2 - up.z * 0.07,
    );
    parts.push(plank);
  }
  // beams under both edges, and a post pair at each end standing down into the bank
  for (const side of [-0.8, 0.8]) {
    for (let i = 0; i < SEGMENTS; i++) {
      const p = deckPoint(b, i / SEGMENTS);
      const q = deckPoint(b, (i + 1) / SEGMENTS);
      parts.push(
        stick(
          p.x + p.nx * side,
          p.y - 0.22,
          p.z + p.nz * side,
          q.x + q.nx * side,
          q.y - 0.22,
          q.z + q.nz * side,
          0.16,
        ),
      );
    }
    for (const t of [0, 1]) {
      const p = deckPoint(b, t);
      parts.push(
        stick(
          p.x + p.nx * side,
          p.y - 1.2,
          p.z + p.nz * side,
          p.x + p.nx * side,
          p.y,
          p.z + p.nz * side,
          0.2,
        ),
      );
    }
  }
  return mergeGeometries(parts);
}

/** One arched bridge: planked deck, beams and slim rails. */
export function buildBridge(b: Bridge, wood: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(plankGeometry(b), wood);
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);
  const rails = new THREE.Mesh(railGeometry(b), wood);
  rails.castShadow = true;
  g.add(rails);
  return g;
}
