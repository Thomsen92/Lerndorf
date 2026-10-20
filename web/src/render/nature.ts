/**
 * Trees and lanterns as instanced meshes (LOOK §7, §8; SPEC §10.11). Few meshes, many instances:
 * a tree is a trunk plus a crown, a lantern a mast, a glowing head and a light pool on the ground.
 * Placeholder models with the colours and sizes of the prototype.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Layout } from '../world/layout';
import {
  placeBushes,
  placeFlowers,
  placeHedges,
  placeLamps,
  placeLaneEdgeTufts,
  placeLaneStones,
  placeStepStones,
  placeMeadows,
  placeReeds,
  placeRocks,
  placeShoreStones,
  placeTufts,
  placeTrees,
  type Lamp,
  type Tree,
} from '../world/scatter';
import { buildGrass } from './grass';
import { instancedModel, kenneyModel, kenneyScatter, type Variant } from './kenney';

const TRUNK = '#6b4a2f';
// round crowns: greens with warm and teal accents, so the valley is not one green (LOOK §8)
const CROWNS = [
  '#2f7d5b',
  '#3a8f63',
  '#4d9a5d',
  '#5d8f3e',
  '#2c6e57',
  '#5fa04c',
  '#c9a23e',
  '#3f8f8a',
  '#d4893a',
];
// pines stay dark and cool
const PINES = ['#2c6e57', '#2f6e5a', '#3a7f66', '#2a5f6b'];
// cherry blossom: white to pink, some in orchard patches and some single trees (LOOK §8)
const BLOSSOMS = ['#f4a6c8', '#f7c6d9', '#ef8fb5', '#fbd9e6', '#ffffff'];

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

/** The procedural trees of the prototype: placeholder until the Kenney models have loaded. */
function placeholderTrees(list: Tree[], kind: Tree['kind']): THREE.Group {
  const g = new THREE.Group();
  if (list.length === 0) return g;
  const trunkMat = new THREE.MeshStandardMaterial({ color: TRUNK, flatShading: true, roughness: 0.9 });
  const crownMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.8 });
  // the trunk reaches well into the crown and a little into the ground: nothing floats (LOOK §8)
  const trunk = new THREE.CylinderGeometry(0.18, 0.25, 1.5, 6);
  trunk.translate(0, 0.55, 0);
  g.add(
    instanced(trunk, trunkMat, list.length, (i, m) => {
      const t = list[i];
      m.makeRotationY(t.rot)
        .scale(new THREE.Vector3(t.scale, t.scale, t.scale))
        .setPosition(t.x, t.y, t.z);
    }),
  );
  const colour = (i: number): THREE.Color => crownColour(list[i], kind);
  // two-tier crowns as in the prototype: two stacked cones, or two offset icosahedra
  const crown =
    kind === 'pine'
      ? mergeGeometries([
          new THREE.ConeGeometry(1.2, 1.8, 7).translate(0, 1.7, 0),
          new THREE.ConeGeometry(0.9, 1.4, 7).translate(0, 2.5, 0),
        ])
      : mergeGeometries([
          new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.85, 0),
          new THREE.IcosahedronGeometry(0.8, 0).translate(0.5, 2.35, 0.2),
        ]);
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
  g.children.forEach((c) => (c.castShadow = true)); // trees cast shadows (LOOK §3)
  return g;
}

/** Fixed hash of a tree position (picks model and colour). */
const treeHash = (t: Tree): number => Math.abs(Math.floor(t.x * 7 + t.z * 3));

/** Crown colour of a tree; round trees in the orchard patches and some single ones bloom. */
function crownColour(t: Tree, kind: Tree['kind']): THREE.Color {
  const h = treeHash(t);
  const orchard = Math.sin(t.x * 0.045 + 1.3) * Math.cos(t.z * 0.05 - 0.7) > 0.6;
  const bloom = kind === 'round' && (orchard || h % 13 === 0);
  const palette = kind === 'pine' ? PINES : CROWNS;
  return new THREE.Color(bloom ? BLOSSOMS[h % BLOSSOMS.length] : palette[h % palette.length]);
}

// Kenney models (render/kenney.ts): layered pines from all three kits, autumn pines from the
// Survival Kit (keep their orange), and the round tree of the Fantasy Town Kit, widened
const PINE_MODELS: Variant[] = [
  { pack: 'forests', name: 'tree-high', height: 3.5 },
  { pack: 'forests', name: 'tree', height: 3.0 },
  { pack: 'town', name: 'tree-high', height: 3.6 },
  { pack: 'survival', name: 'tree-tall', height: 3.4 },
  { pack: 'town', name: 'tree-high-crooked', height: 3.4 },
  { pack: 'forests', name: 'tree-high', height: 3.2 },
  { pack: 'survival', name: 'tree-autumn-tall', height: 3.3 },
];
const AUTUMN_PINE = 6;
const ROUND_MODELS: Variant[] = [{ pack: 'town', name: 'tree-high-round', height: 3.4 }];

function treeGroup(trees: Tree[], kind: Tree['kind']): THREE.Group {
  const list = trees.filter((t) => t.kind === kind);
  const variants = kind === 'pine' ? PINE_MODELS : ROUND_MODELS;
  const pick = (t: Tree): number => Math.floor(treeHash(t) / 3) % variants.length;
  const g = kenneyScatter(
    list,
    variants,
    pick,
    (t, _i, unit, m) => {
      // round crowns: wider than the slim model, a little different per tree
      const wide = kind === 'round' ? 1.3 + (treeHash(t) % 5) * 0.08 : 1.7;
      const s = unit * t.scale;
      m.makeRotationY(t.rot)
        .scale(new THREE.Vector3(s * wide, s, s * wide))
        .setPosition(t.x, t.y - 0.05, t.z);
    },
    {
      tint: (t) => (kind === 'pine' && pick(t) === AUTUMN_PINE ? null : crownColour(t, kind)),
      shadows: true, // trees cast shadows (LOOK §3)
      placeholder: placeholderTrees(list, kind),
    },
  );
  return g;
}

/** Lantern height (top of the cap) and its glass, in metres above the ground (LOOK §7). */
const LANTERN_HEIGHT = 2.4;
// in the Kenney lantern (1.56 m) the glass sits between the plate at 1.27 and the cap at 1.50
const GLASS_LOW = (1.27 / 1.56) * LANTERN_HEIGHT;
const GLASS_HIGH = (1.5 / 1.56) * LANTERN_HEIGHT;

function lampGroup(lamps: Lamp[]): THREE.Group {
  const g = new THREE.Group();
  if (lamps.length === 0) return g;
  const mast = new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6);
  mast.translate(0, 1.1, 0);
  const mastMesh = instanced(
    mast,
    new THREE.MeshStandardMaterial({ color: '#2b2b33', roughness: 0.8 }),
    lamps.length,
    (i, m) => m.makeTranslation(lamps[i].x, lamps[i].y, lamps[i].z),
  );
  g.add(mastMesh);
  // glowing head (MeshBasic: it shines without a light source, LOOK §3)
  const head = new THREE.BoxGeometry(0.35, 0.4, 0.35);
  head.translate(0, 2.35, 0);
  const headMat = new THREE.MeshBasicMaterial({ color: '#ffc56b' });
  const headMesh = instanced(head, headMat, lamps.length, (i, m) =>
    m.makeTranslation(lamps[i].x, lamps[i].y, lamps[i].z),
  );
  g.add(headMesh);
  // Kenney lantern (Fantasy Town Kit): post, plate and cap from the model, the glass between
  // plate and cap glows; until it has loaded the placeholder mast and head stay
  void kenneyModel('town', 'lantern').then((model) => {
    if (!model) return;
    const box = model.geometry.boundingBox as THREE.Box3;
    const unit = LANTERN_HEIGHT / (box.max.y - box.min.y);
    const posts = lamps.map((l) => {
      const m = new THREE.Matrix4().makeRotationY(l.face).scale(new THREE.Vector3(unit, unit, unit));
      return m.setPosition(l.x, l.y - 0.03, l.z);
    });
    const post = instancedModel(model, posts);
    post.castShadow = true;
    const glass = new THREE.BoxGeometry(0.26, GLASS_HIGH - GLASS_LOW, 0.26);
    glass.translate(0, (GLASS_LOW + GLASS_HIGH) / 2, 0);
    const glassMesh = instanced(glass, headMat, lamps.length, (i, m) =>
      m.makeRotationY(lamps[i].face).setPosition(lamps[i].x, lamps[i].y - 0.03, lamps[i].z),
    );
    g.remove(mastMesh, headMesh);
    g.add(post, glassMesh);
  });
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

const BUSH = ['#3f8f5a', '#4d9a5d', '#2f7d5b', '#5d8f3e', '#6a9c4a'];
const FLOWER = ['#f2c94c', '#eb5757', '#f2a7d0', '#ffffff', '#bb6bd9'];
// FLOWER index → model colour group (0 red, 1 purple, 2 yellow)
const FLOWER_GROUP = [2, 0, 1, 2, 1];
const FLOWER_MODELS: Variant[] = ['red', 'purple', 'yellow'].flatMap((c) =>
  ['A', 'B', 'C'].map((f) => ({ pack: 'nature' as const, name: `flower_${c}${f}`, height: 0.5 })),
);
const HEDGE = ['#3f8a55', '#4d9a5d', '#3a7d55'];
const BUSH_MODELS: Variant[] = [{ pack: 'town', name: 'tree-high-round', height: 1.5 }];
// heights here are the model heights (the flat stones are a few centimetres thick)
const LANE_STONE_MODELS: Variant[] = [
  { pack: 'nature', name: 'stone_smallFlatA', height: 0.07 },
  { pack: 'nature', name: 'stone_smallFlatB', height: 0.07 },
  { pack: 'nature', name: 'stone_smallFlatC', height: 0.07 },
];
const STEP_MODELS: Variant[] = [{ pack: 'nature', name: 'path_stone', height: 0.06 }];
const ROCK_MODELS: Variant[] = [
  { pack: 'town', name: 'rock-small', height: 0.9 },
  { pack: 'town', name: 'rock-wide', height: 0.8 },
  { pack: 'survival', name: 'rock-b', height: 0.55 },
  { pack: 'town', name: 'rock-large', height: 1.0 },
  { pack: 'survival', name: 'rock-c', height: 0.6 },
];
const SHORE_MODELS: Variant[] = [
  { pack: 'survival', name: 'rock-a', height: 0.45 },
  { pack: 'survival', name: 'rock-b', height: 0.4 },
  { pack: 'town', name: 'rock-wide', height: 0.4 },
  { pack: 'survival', name: 'rock-c', height: 0.5 },
  { pack: 'town', name: 'rock-small', height: 0.6 },
];

/** Shrubs, rocks, reeds and flower patches (SPEC §10.6), all as instanced meshes. */
export function buildVegetation(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  const pick = (list: string[], i: number): THREE.Color => new THREE.Color(list[i % list.length]);

  const bushes = placeBushes(layout);
  const bushGeo = new THREE.IcosahedronGeometry(0.6, 0);
  bushGeo.translate(0, 0.45, 0);
  const bushPlaceholder = instanced(
    bushGeo,
    new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 }),
    bushes.length,
    (i, m) => {
      const b = bushes[i];
      m.makeRotationY(b.rot)
        .scale(new THREE.Vector3(b.scale, b.scale * 0.8, b.scale))
        .setPosition(b.x, b.y - 0.08, b.z);
    },
    (i) => pick(BUSH, i),
  );
  // shrub groups: three round crowns of the Fantasy Town tree each (one large, two smaller at its
  // side), squashed and sunk so the trunk stays under ground, in two or three greens
  const crowns: Array<{ x: number; y: number; z: number; s: number; c: number; r: number }> = [];
  bushes.forEach((b, i) => {
    const parts: Array<[number, number, number]> = [
      [0, 0, 1],
      [0.75, 0.5, 0.72],
      [0.65, 2.6, 0.6],
    ];
    parts.forEach(([d, a, k], j) => {
      const x = b.x + Math.cos(b.rot + a) * d * b.scale;
      const z = b.z + Math.sin(b.rot + a) * d * b.scale;
      crowns.push({ x, y: layout.terrain.groundHeight(x, z), z, s: b.scale * k, c: i + j, r: b.rot + j * 1.9 });
    });
  });
  root.add(
    kenneyScatter(
      crowns,
      BUSH_MODELS,
      () => 0,
      (c, _i, unit, m) => {
        const s = unit * c.s;
        m.makeRotationY(c.r)
          .scale(new THREE.Vector3(s * 2.0, s, s * 2.0))
          .setPosition(c.x, c.y - 0.48 * c.s, c.z);
      },
      { tint: (c) => pick(BUSH, c.c), placeholder: bushPlaceholder, shadows: true },
    ),
  );

  // flat stones on the lanes and stepping stones on the garden paths (Nature Kit)
  const laneStones = placeLaneStones(layout);
  root.add(
    kenneyScatter(laneStones, LANE_STONE_MODELS, (_s, i) => i, (st, _i, unit, m) => {
      const s = unit * st.scale;
      m.makeRotationY(st.rot)
        .scale(new THREE.Vector3(s, s, s))
        .setPosition(st.x, st.y + 0.13, st.z); // on top of the lane strip (0.11 m)
    }),
  );
  const steps = placeStepStones(layout);
  root.add(
    kenneyScatter(steps, STEP_MODELS, () => 0, (st, _i, unit, m) => {
      // the model is 1.0 wide and 0.58 deep: across the walking direction
      m.makeRotationY(st.rot)
        .scale(new THREE.Vector3(unit * 1.15, unit * 1.15, unit * 1.15))
        .setPosition(st.x, st.y + 0.05, st.z);
    }),
  );

  const rocks = placeRocks(layout);
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
  const rockPlaceholder = instanced(
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
  );
  root.add(
    kenneyScatter(
      rocks,
      ROCK_MODELS,
      (_r, i) => i,
      (r, _i, unit, m) => {
        const s = unit * (0.5 + r.scale);
        m.makeRotationY(r.rot * 3)
          .scale(new THREE.Vector3(s, s, s))
          .setPosition(r.x, r.y - 0.06 * s, r.z);
      },
      { placeholder: rockPlaceholder, shadows: true },
    ),
  );

  // stones on the river banks in small groups, some flat ones at the waterline (LOOK §4)
  const stones = placeShoreStones(layout);
  const stonePlaceholder = instanced(
    rockGeo,
    new THREE.MeshStandardMaterial({ color: '#a39f94', flatShading: true, roughness: 0.95 }),
    stones.length,
    (i, m) => {
      const r = stones[i];
      m.makeRotationY(r.rot)
        .scale(new THREE.Vector3(r.scale, r.scale * 0.7, r.scale))
        .setPosition(r.x, r.y - r.scale * 0.1, r.z);
    },
  );
  root.add(
    kenneyScatter(
      stones,
      SHORE_MODELS,
      (_r, i) => i,
      (r, _i, unit, m) => {
        const s = unit * (0.6 + r.scale * 1.6);
        m.makeRotationY(r.rot)
          .scale(new THREE.Vector3(s, s, s))
          .setPosition(r.x, r.y - 0.08 * s, r.z);
      },
      { placeholder: stonePlaceholder },
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

  // hedgerows beside the lanes: a short row of overlapping round shrubs, not a box (LOOK §2.3)
  const hedges = placeHedges(layout);
  const blobs: Array<{ x: number; y: number; z: number; s: number; c: number }> = [];
  hedges.forEach((h, i) => {
    const n = Math.max(3, Math.round(h.len / 0.75));
    for (let k = 0; k < n; k++) {
      const off = (k / (n - 1) - 0.5) * h.len;
      const x = h.x + Math.sin(h.rot) * off;
      const z = h.z + Math.cos(h.rot) * off;
      const wobble = Math.sin(i * 3.1 + k * 1.7);
      blobs.push({ x, y: layout.terrain.groundHeight(x, z), z, s: 0.62 + wobble * 0.1, c: i });
    }
  });
  const hedgePlaceholder = instanced(
    bushGeo,
    new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 }),
    blobs.length,
    (i, m) => {
      const b = blobs[i];
      m.makeRotationY(i * 0.9)
        .scale(new THREE.Vector3(b.s * 1.15, b.s * 0.95, b.s * 1.15))
        .setPosition(b.x, b.y - 0.08, b.z);
    },
    (i) => pick(HEDGE, blobs[i].c),
  );
  // hedgerows: overlapping round crowns (the bush model), sunk to their lower half
  root.add(
    kenneyScatter(
      blobs,
      [BUSH_MODELS[0]],
      () => 0,
      (b, i, unit, m) => {
        const s = unit * b.s * 1.5;
        m.makeRotationY(i * 0.9)
          .scale(new THREE.Vector3(s * 2.3, s, s * 2.3))
          .setPosition(b.x, b.y - 0.45 * b.s * 1.5, b.z);
      },
      { tint: (b) => pick(HEDGE, b.c), placeholder: hedgePlaceholder },
    ),
  );


  // blossom meadows are painted into the ground (render/village.ts); only their flowers stand here
  const meadows = placeMeadows(layout);

  // grass tufts: Kenney grass silhouettes on crossed cards (render/grass.ts), one draw call
  const tufts = placeTufts(layout);
  root.add(buildGrass(tufts, placeLaneEdgeTufts(layout)));

  // flower patches: five flowers around each patch centre; every 19th grass tuft and the
  // blossom meadows carry flowers too. y is the ground under the flower.
  const patches = placeFlowers(layout);
  const blossoms: Array<{ x: number; y: number; z: number; colour: number }> = [];
  patches.forEach((p, i) => {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + i;
      blossoms.push({
        x: p.x + Math.cos(a) * 0.35,
        y: p.y,
        z: p.z + Math.sin(a) * 0.35,
        colour: (i + k) % FLOWER.length,
      });
    }
  });
  tufts.forEach((t, i) => {
    if (i % 19 === 0) blossoms.push({ x: t.x + 0.05, y: t.y, z: t.z, colour: i % FLOWER.length });
  });
  for (const w of meadows) {
    for (const f of w.flowers) blossoms.push({ x: f.x, y: f.y, z: f.z, colour: f.colour });
  }
  const blossomPlaceholder = instanced(
    new THREE.SphereGeometry(0.12, 5, 4),
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }),
    blossoms.length,
    (i, m) => m.makeTranslation(blossoms[i].x, blossoms[i].y + 0.22, blossoms[i].z),
    (i) => pick(FLOWER, blossoms[i].colour),
  );
  // Nature Kit flowers: the colour picks red, purple or yellow (pink → purple, white → yellow
  // with a white heart), the position picks one of three shapes
  root.add(
    kenneyScatter(
      blossoms,
      FLOWER_MODELS,
      (b) => FLOWER_GROUP[b.colour] * 3 + (Math.abs(Math.floor(b.x * 13 + b.z * 7)) % 3),
      (b, i, unit, m) => {
        const s = unit * (0.85 + ((i * 7) % 5) * 0.08);
        m.makeRotationY(i * 2.4)
          .scale(new THREE.Vector3(s, s, s))
          .setPosition(b.x, b.y, b.z);
      },
      { placeholder: blossomPlaceholder },
    ),
  );
  return root;
}
