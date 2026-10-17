/**
 * Trees and lanterns as instanced meshes (LOOK §7, §8; SPEC §10.11). Few meshes, many instances:
 * a tree is a trunk plus a crown, a lantern a mast, a glowing head and a light pool on the ground.
 * Placeholder models with the colours and sizes of the prototype.
 */
import * as THREE from 'three';
import type { Layout } from '../world/layout';
import {
  placeBushes,
  placeFlowers,
  placeHedges,
  placeLamps,
  placeMeadows,
  placeReeds,
  placeRocks,
  placeShoreStones,
  placeTrees,
  type Lamp,
  type Tree,
} from '../world/scatter';

const TRUNK = '#6b4a2f';
// round crowns: greens with warm and teal accents, so the valley is not one green (LOOK §8)
const CROWNS = ['#2f7d5b', '#5fa04c', '#c9a23e', '#3f8f8a', '#8aa84a', '#d4893a', '#4d9a5d', '#b9b24a'];
// pines stay dark and cool
const PINES = ['#2c6e57', '#2f6e5a', '#3a7f66', '#2a5f6b'];
const BLOSSOM = '#d98cc5';

/** Soft radial gradient for the light pools on the ground (LOOK §7). */
function poolTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const cx = cv.getContext('2d');
  if (cx) {
    const gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,190,110,0.55)');
    gr.addColorStop(0.5, 'rgba(255,170,90,0.18)');
    gr.addColorStop(1, 'rgba(255,160,80,0)');
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(cv);
}

function instanced(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  count: number,
  place: (i: number, m: THREE.Matrix4) => void,
  colour?: (i: number) => THREE.Color,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    place(i, m);
    mesh.setMatrixAt(i, m);
    if (colour) mesh.setColorAt(i, colour(i));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; // the unit geometry does not cover the instances
  return mesh;
}

function treeGroup(trees: Tree[], kind: Tree['kind']): THREE.Group {
  const list = trees.filter((t) => t.kind === kind);
  const g = new THREE.Group();
  if (list.length === 0) return g;
  const trunkMat = new THREE.MeshStandardMaterial({ color: TRUNK, flatShading: true, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.8 });
  const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.2, 6);
  trunk.translate(0, 0.6, 0);
  g.add(
    instanced(trunk, trunkMat, list.length, (i, m) => {
      const t = list[i];
      m.makeRotationY(t.rot)
        .scale(new THREE.Vector3(t.scale, t.scale, t.scale))
        .setPosition(t.x, t.y, t.z);
    }),
  );
  const palette = kind === 'pine' ? PINES : CROWNS;
  const colour = (i: number): THREE.Color => {
    const t = list[i];
    // a fixed colour per tree; about one in nine is a rare pink blossom tree (LOOK §8)
    const h = Math.abs(Math.floor(t.x * 7 + t.z * 3));
    return new THREE.Color(h % 9 === 0 ? BLOSSOM : palette[h % palette.length]);
  };
  if (kind === 'pine') {
    const crown = new THREE.ConeGeometry(1.2, 1.8, 7);
    crown.translate(0, 1.7 + 0.9, 0);
    g.add(
      instanced(
        crown,
        crownMat,
        list.length,
        (i, m) => {
          const t = list[i];
          m.makeRotationY(t.rot)
            .scale(new THREE.Vector3(t.scale, t.scale, t.scale))
            .setPosition(t.x, t.y, t.z);
        },
        colour,
      ),
    );
  } else {
    const crown = new THREE.IcosahedronGeometry(1.1, 0);
    crown.translate(0, 1.9 + 0.5, 0);
    g.add(
      instanced(
        crown,
        crownMat,
        list.length,
        (i, m) => {
          const t = list[i];
          m.makeRotationY(t.rot)
            .scale(new THREE.Vector3(t.scale, t.scale, t.scale))
            .setPosition(t.x, t.y, t.z);
        },
        colour,
      ),
    );
  }
  g.children.forEach((c) => (c.castShadow = true)); // trees cast shadows (LOOK §3)
  return g;
}

function lampGroup(lamps: Lamp[]): THREE.Group {
  const g = new THREE.Group();
  if (lamps.length === 0) return g;
  const mast = new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6);
  mast.translate(0, 1.1, 0);
  g.add(
    instanced(
      mast,
      new THREE.MeshStandardMaterial({ color: '#2b2b33', roughness: 0.8 }),
      lamps.length,
      (i, m) => m.makeTranslation(lamps[i].x, lamps[i].y, lamps[i].z),
    ),
  );
  // glowing head (MeshBasic: it shines without a light source, LOOK §3)
  const head = new THREE.BoxGeometry(0.35, 0.4, 0.35);
  head.translate(0, 2.35, 0);
  g.add(
    instanced(head, new THREE.MeshBasicMaterial({ color: '#ffc56b' }), lamps.length, (i, m) =>
      m.makeTranslation(lamps[i].x, lamps[i].y, lamps[i].z),
    ),
  );
  // light pool on the ground: additive, depth-free, one instanced mesh for all lanterns
  const pool = new THREE.PlaneGeometry(7, 7);
  pool.rotateX(-Math.PI / 2);
  const poolMesh = instanced(
    pool,
    new THREE.MeshBasicMaterial({
      map: poolTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.6, // softer light pools (cozy, not glaring)
    }),
    lamps.length,
    (i, m) => m.makeTranslation(lamps[i].x, lamps[i].y + 0.12, lamps[i].z),
  );
  poolMesh.renderOrder = 4;
  g.add(poolMesh);
  return g;
}

/** Trees and lanterns of one layout, as a group. */
export function buildNature(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  const trees = placeTrees(layout);
  root.add(treeGroup(trees, 'pine'));
  root.add(treeGroup(trees, 'round'));
  root.add(lampGroup(placeLamps(layout)));
  return root;
}

const BUSH = ['#3f8f5a', '#4d9a5d', '#2f7d5b', '#5d8f3e'];
const FLOWER = ['#f2c94c', '#eb5757', '#f2a7d0', '#ffffff', '#bb6bd9'];
const MEADOW = ['#a9d17a', '#93c26a', '#b8d98a'];

/** Shrubs, rocks, reeds and flower patches (SPEC §10.6), all as instanced meshes. */
export function buildVegetation(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  const pick = (list: string[], i: number): THREE.Color => new THREE.Color(list[i % list.length]);

  const bushes = placeBushes(layout);
  const bushGeo = new THREE.IcosahedronGeometry(0.6, 0);
  bushGeo.translate(0, 0.45, 0);
  root.add(
    instanced(
      bushGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 }),
      bushes.length,
      (i, m) => {
        const b = bushes[i];
        m.makeRotationY(b.rot)
          .scale(new THREE.Vector3(b.scale, b.scale * 0.8, b.scale))
          .setPosition(b.x, b.y, b.z);
      },
      (i) => pick(BUSH, i),
    ),
  );

  const rocks = placeRocks(layout);
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
  root.add(
    instanced(
      rockGeo,
      new THREE.MeshStandardMaterial({ color: '#8f8d86', flatShading: true, roughness: 0.95 }),
      rocks.length,
      (i, m) => {
        const r = rocks[i];
        // half sunk into the ground (LOOK §4)
        m.makeRotationFromEuler(new THREE.Euler(r.rot, r.rot * 0.7, r.rot * 0.3))
          .scale(new THREE.Vector3(r.scale, r.scale * 0.8, r.scale))
          .setPosition(r.x, r.y - r.scale * 0.1, r.z);
      },
    ),
  );

  // stones on the river banks (LOOK §4)
  const stones = placeShoreStones(layout);
  root.add(
    instanced(
      rockGeo,
      new THREE.MeshStandardMaterial({ color: '#a39f94', flatShading: true, roughness: 0.95 }),
      stones.length,
      (i, m) => {
        const r = stones[i];
        m.makeRotationY(r.rot)
          .scale(new THREE.Vector3(r.scale, r.scale * 0.7, r.scale))
          .setPosition(r.x, r.y - r.scale * 0.1, r.z);
      },
    ),
  );

  const reeds = placeReeds(layout);
  const reedGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.1, 4);
  reedGeo.translate(0, 0.55, 0);
  root.add(
    instanced(
      reedGeo,
      new THREE.MeshStandardMaterial({ color: '#6f8f45', roughness: 0.9 }),
      reeds.length,
      (i, m) => {
        const r = reeds[i];
        m.makeRotationY(i * 1.3)
          .scale(new THREE.Vector3(r.scale, r.scale, r.scale))
          .setPosition(r.x, r.y, r.z);
      },
    ),
  );

  // hedges: clipped rows beside the lanes (LOOK §8)
  const hedges = placeHedges(layout);
  const hedgeGeo = new THREE.BoxGeometry(1, 1, 1);
  hedgeGeo.translate(0, 0.5, 0);
  root.add(
    instanced(
      hedgeGeo,
      new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 }),
      hedges.length,
      (i, m) => {
        const h = hedges[i];
        m.makeRotationY(h.rot)
          .scale(new THREE.Vector3(0.6, 0.9, h.len))
          .setPosition(h.x, h.y, h.z);
      },
      (i) => pick(BUSH, i),
    ),
  );

  // blossom meadows: a flat patch of lighter grass with flowers on it
  const meadows = placeMeadows(layout);
  root.add(
    instanced(
      new THREE.CircleGeometry(1, 14),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }),
      meadows.length,
      (i, m) => {
        const w = meadows[i];
        m.makeRotationX(-Math.PI / 2)
          .scale(new THREE.Vector3(w.radius, w.radius, 1))
          .setPosition(w.x, w.y + 0.04, w.z);
      },
      (i) => pick(MEADOW, i),
    ),
  );

  // flower patches: five small blossoms around each patch centre
  const patches = placeFlowers(layout);
  const blossoms: Array<{ x: number; y: number; z: number; colour: number }> = [];
  patches.forEach((p, i) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      blossoms.push({
        x: p.x + Math.cos(a) * 0.35,
        y: p.y + 0.22,
        z: p.z + Math.sin(a) * 0.35,
        colour: (i + k) % FLOWER.length,
      });
    }
  });
  for (const w of meadows) {
    for (const f of w.flowers) blossoms.push({ x: f.x, y: f.y + 0.22, z: f.z, colour: f.colour });
  }
  root.add(
    instanced(
      new THREE.SphereGeometry(0.12, 5, 4),
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }),
      blossoms.length,
      (i, m) => m.makeTranslation(blossoms[i].x, blossoms[i].y, blossoms[i].z),
      (i) => pick(FLOWER, blossoms[i].colour),
    ),
  );
  return root;
}
