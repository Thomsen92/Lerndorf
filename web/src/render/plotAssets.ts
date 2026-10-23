/**
 * Placeholder models for the plot slots (docs/ASSET_VERTRAG.md): houses, garages, cars and the
 * decoration scenes. They follow the asset contract exactly, so the Blender models can replace
 * them one by one later: origin in the middle of the footprint on the ground, front towards +Z,
 * everything inside the highest visible size of the kind (world/plotPlan.ts MAX_SIZE).
 * tests/render/plotAssets.test.ts measures every model against the contract.
 */
import * as THREE from 'three';
import { RUIN_ID, buildRuin } from './ruin';

const solidMats = new Map<string, THREE.MeshStandardMaterial>();
const glowMats = new Map<string, THREE.MeshBasicMaterial>();

function solid(colour: string): THREE.MeshStandardMaterial {
  let m = solidMats.get(colour);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.88, flatShading: true });
    solidMats.set(colour, m);
  }
  return m;
}

function glow(colour: string): THREE.MeshBasicMaterial {
  let m = glowMats.get(colour);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: colour });
    glowMats.set(colour, m);
  }
  return m;
}

type Mat = THREE.Material;

function add(
  g: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: Mat,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = !(mat instanceof THREE.MeshBasicMaterial);
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

/** Box standing on y (bottom at y). */
function box(g: THREE.Object3D, w: number, h: number, d: number, mat: Mat, x = 0, y = 0, z = 0): THREE.Mesh {
  return add(g, new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z);
}

/** Upright cylinder standing on y. */
function cyl(
  g: THREE.Object3D,
  rTop: number,
  rBottom: number,
  h: number,
  mat: Mat,
  x = 0,
  y = 0,
  z = 0,
  seg = 8,
): THREE.Mesh {
  return add(g, new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat, x, y + h / 2, z);
}

/** Low-poly ball (bush, flower, hay) with its centre at (x, y, z). */
function blob(
  g: THREE.Object3D,
  r: number,
  mat: Mat,
  x: number,
  y: number,
  z: number,
  detail = 0,
): THREE.Mesh {
  return add(g, new THREE.IcosahedronGeometry(r, detail), mat, x, y, z);
}

/**
 * Gable roof as a prism. `ridgeAlongX`: the ridge runs parallel to the front (eaves face the
 * street); otherwise the gable end faces the street. w/d are the outer sizes including overhang.
 */
function gable(
  g: THREE.Object3D,
  w: number,
  d: number,
  rise: number,
  y: number,
  mat: Mat,
  ridgeAlongX: boolean,
): void {
  const span = ridgeAlongX ? d : w;
  const length = ridgeAlongX ? w : d;
  const shape = new THREE.Shape();
  shape.moveTo(-span / 2, 0);
  shape.lineTo(0, rise);
  shape.lineTo(span / 2, 0);
  shape.lineTo(-span / 2, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  geo.translate(0, 0, -length / 2);
  if (ridgeAlongX) geo.rotateY(Math.PI / 2);
  add(g, geo, mat, 0, y, 0);
}

const WALLS = ['#efe6d6', '#e8dcc6', '#f1e9dc', '#e4d7c0', '#f3e2cf', '#dfe6e8'];
const ROOFS = ['#c4574b', '#3f8f88', '#5a62b8', '#d08a3c', '#8c5aa8', '#4f8f5f', '#b86a8a'];
const TIMBER = '#6b4a35';
const DOOR = '#5a3a26';
const WINDOW = '#ffad42';
const STONE = '#8f8d86';
const WOOD = '#8a5a36';
const GREEN = ['#3f8f5a', '#4d9a5d', '#2f7d5b', '#5d8f3e'];
const FLOWERS = ['#f2c94c', '#eb5757', '#f2a7d0', '#ffffff', '#bb6bd9'];

/** Colour variation of the same model from plot to plot (the asset stays the same). */
export interface Tint {
  wall: string;
  roof: string;
}

export function tintFor(seed: number): Tint {
  return { wall: WALLS[seed % WALLS.length], roof: ROOFS[(seed * 3 + 1) % ROOFS.length] };
}

/** A framed glowing window on a wall facing +Z (or turned by rotY). */
function windowAt(g: THREE.Object3D, x: number, y: number, z: number, rotY = 0, w = 0.6, h = 0.65): void {
  const frame = add(g, new THREE.BoxGeometry(w + 0.18, h + 0.18, 0.05), solid(TIMBER), x, y, z);
  const glass = add(g, new THREE.BoxGeometry(w, h, 0.07), glow(WINDOW), x, y, z);
  frame.rotation.y = rotY;
  glass.rotation.y = rotY;
  if (rotY !== 0) {
    frame.position.x -= 0.02 * Math.sign(x);
  } else {
    frame.position.z -= 0.02;
  }
}

/** Front door with frame and step, on the wall at z (front +Z). Door 0.95 x 1.95 m (avatar 1.64 m). */
function frontDoor(g: THREE.Object3D, z: number, x = 0): void {
  box(g, 1.15, 2.15, 0.06, solid(TIMBER), x, 0.3, z + 0.01);
  box(g, 0.95, 1.95, 0.08, solid(DOOR), x, 0.3, z + 0.03);
  box(g, 1.3, 0.12, 0.3, solid(STONE), x, 0.18, z + 0.15);
}

/** Timber-frame look: plinth, corner posts and a band around the house. */
function frame(g: THREE.Object3D, w: number, d: number, h: number, bandY: number): void {
  box(g, w + 0.12, 0.3, d + 0.12, solid(STONE), 0, 0, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) box(g, 0.16, h, 0.16, solid(TIMBER), (sx * w) / 2, 0.3, (sz * d) / 2);
  }
  box(g, w + 0.06, 0.14, d + 0.06, solid(TIMBER), 0, bandY, 0);
}

// ---------------------------------------------------------------- houses (slot 6 x 4)

function houseFachwerk(t: Tint): THREE.Group {
  const g = new THREE.Group();
  const w = 5.0;
  const d = 3.2;
  const h = 2.6;
  frame(g, w, d, h, 1.55);
  box(g, w, h, d, solid(t.wall), 0, 0.3, 0);
  frontDoor(g, d / 2);
  windowAt(g, -1.5, 1.55, d / 2 + 0.02);
  windowAt(g, 1.5, 1.55, d / 2 + 0.02);
  windowAt(g, w / 2 + 0.02, 1.55, 0, Math.PI / 2);
  windowAt(g, -w / 2 - 0.02, 1.55, 0, Math.PI / 2);
  gable(g, w + 0.6, d + 0.6, 1.7, 0.3 + h, solid(t.roof), true);
  box(g, 0.45, 1.3, 0.45, solid('#9a5a48'), 1.4, 0.3 + h + 0.6, -0.5);
  // small canopy over the door
  const canopy = box(g, 1.5, 0.1, 0.4, solid(TIMBER), 0, 2.45, d / 2 + 0.15);
  canopy.rotation.x = 0.25;
  return g;
}

function houseLandhaus(t: Tint): THREE.Group {
  const g = new THREE.Group();
  const w = 5.4;
  const d = 3.2;
  const h = 3.9;
  frame(g, w, d, h, 0.3 + 1.95);
  box(g, w, h, d, solid(t.wall), 0, 0.3, 0);
  frontDoor(g, d / 2);
  for (const x of [-1.7, 1.7]) windowAt(g, x, 1.4, d / 2 + 0.02);
  for (const x of [-1.7, 0, 1.7]) windowAt(g, x, 3.2, d / 2 + 0.02);
  windowAt(g, w / 2 + 0.02, 1.4, 0, Math.PI / 2);
  windowAt(g, w / 2 + 0.02, 3.2, 0, Math.PI / 2);
  // small balcony above the door
  box(g, 2.0, 0.12, 0.38, solid(TIMBER), 0, 2.35, d / 2 + 0.19);
  box(g, 2.0, 0.5, 0.06, solid(TIMBER), 0, 2.47, d / 2 + 0.35);
  gable(g, w + 0.6, d + 0.6, 1.6, 0.3 + h, solid(t.roof), false);
  box(g, 0.45, 1.0, 0.45, solid('#9a5a48'), -1.6, 0.3 + h + 0.6, 0.5);
  return g;
}

function houseVilla(t: Tint): THREE.Group {
  const g = new THREE.Group();
  const w = 5.2;
  const d = 2.6;
  const h = 3.1;
  frame(g, w, d, h, 0.3 + 1.6);
  box(g, w, h, d, solid(t.wall), 0, 0.3, 0);
  frontDoor(g, d / 2);
  windowAt(g, -1.6, 1.6, d / 2 + 0.02, 0, 0.8, 1.0);
  windowAt(g, 1.6, 1.6, d / 2 + 0.02, 0, 0.8, 1.0);
  windowAt(g, w / 2 + 0.02, 1.6, 0, Math.PI / 2);
  // porch: two white posts and a little gable over the door, inside the footprint
  for (const x of [-0.9, 0.9]) box(g, 0.16, 2.5, 0.16, solid('#f1e9dc'), x, 0.3, d / 2 + 0.55);
  const porch = new THREE.Group();
  porch.position.set(0, 2.8, d / 2 + 0.35);
  gable(porch, 2.3, 0.7, 0.6, 0, solid(t.roof), false);
  g.add(porch);
  gable(g, w + 0.6, d + 0.6, 2.0, 0.3 + h, solid(t.roof), true);
  // two dormers with glowing windows on the front slope
  for (const x of [-1.4, 1.4]) {
    box(g, 0.9, 0.8, 0.9, solid(t.wall), x, 0.3 + h + 0.25, 0.55);
    windowAt(g, x, 0.3 + h + 0.7, 1.02, 0, 0.45, 0.45);
    const dg = new THREE.Group();
    dg.position.set(x, 0.3 + h + 1.05, 0.55);
    gable(dg, 1.1, 1.1, 0.4, 0, solid(t.roof), false);
    g.add(dg);
  }
  box(g, 0.45, 1.2, 0.45, solid('#9a5a48'), -1.9, 0.3 + h + 0.7, -0.6);
  return g;
}

// ---------------------------------------------------------------- garages (slot 3 x 4)

function garageHolz(): THREE.Group {
  const g = new THREE.Group();
  const w = 2.6;
  const d = 3.4;
  const h = 2.3;
  box(g, w + 0.1, 0.2, d + 0.1, solid(STONE));
  box(g, w, h, d, solid('#a0703f'), 0, 0.2, 0);
  // vertical boards on the side walls
  for (let k = -1; k <= 1; k++) {
    box(g, 0.05, h, 0.08, solid(TIMBER), w / 2 + 0.02, 0.2, k * 1.1);
    box(g, 0.05, h, 0.08, solid(TIMBER), -w / 2 - 0.02, 0.2, k * 1.1);
  }
  // gate: two wings
  box(g, 2.2, 1.95, 0.08, solid('#6b4a2f'), 0, 0.2, d / 2 + 0.03);
  box(g, 0.06, 1.95, 0.1, solid(TIMBER), 0, 0.2, d / 2 + 0.05);
  box(g, 2.2, 0.06, 0.1, solid(TIMBER), 0, 1.15, d / 2 + 0.05);
  gable(g, w + 0.4, d + 0.4, 0.8, 0.2 + h, solid('#7a4f2e'), false);
  return g;
}

function garageStein(): THREE.Group {
  const g = new THREE.Group();
  const w = 2.7;
  const d = 3.5;
  const h = 2.5;
  box(g, w, h, d, solid('#b9b2a6'));
  box(g, w + 0.2, 0.18, d + 0.2, solid('#8f8d86'), 0, h, 0);
  // sectional door with horizontal panels and a lamp above it
  box(g, 2.3, 2.05, 0.08, solid('#e8e4da'), 0, 0, d / 2 + 0.03);
  for (let k = 1; k < 4; k++) box(g, 2.3, 0.04, 0.1, solid('#c9c3b6'), 0, k * 0.5, d / 2 + 0.05);
  box(g, 0.3, 0.2, 0.2, glow('#ffc56b'), 0, 2.15, d / 2 + 0.12);
  return g;
}

// ---------------------------------------------------------------- cars (pedestal 3 x 5)

function wheels(g: THREE.Object3D, x: number, zs: number[], r: number): void {
  for (const z of zs) {
    for (const sx of [-1, 1]) {
      const wheel = add(g, new THREE.CylinderGeometry(r, r, 0.26, 10), solid('#2b2b33'), sx * x, r, z);
      wheel.rotation.z = Math.PI / 2;
      const hub = add(
        g,
        new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.28, 8),
        solid('#c9c3b6'),
        sx * x,
        r,
        z,
      );
      hub.rotation.z = Math.PI / 2;
    }
  }
}

function carKleinwagen(): THREE.Group {
  const g = new THREE.Group();
  box(g, 1.8, 0.65, 3.6, solid('#3f7fd0'), 0, 0.3, 0);
  box(g, 1.6, 0.62, 1.9, solid('#3f7fd0'), 0, 0.95, -0.25);
  // windows: a glass band slightly larger than the cabin
  box(g, 1.62, 0.42, 1.6, solid('#9fc6e0'), 0, 1.05, -0.25);
  box(g, 1.85, 0.08, 3.62, solid('#2f5f9f'), 0, 0.55, 0);
  for (const x of [-0.6, 0.6]) {
    box(g, 0.32, 0.18, 0.05, glow('#fff3c4'), x, 0.65, 1.81);
    box(g, 0.32, 0.16, 0.05, glow('#ff6b5b'), x, 0.65, -1.81);
  }
  wheels(g, 0.82, [1.15, -1.15], 0.32);
  return g;
}

function carCamper(): THREE.Group {
  const g = new THREE.Group();
  box(g, 2.0, 0.9, 4.3, solid('#d08a3c'), 0, 0.35, 0);
  box(g, 2.0, 0.75, 4.1, solid('#f1e9dc'), 0, 1.25, -0.1);
  box(g, 2.02, 0.4, 3.4, solid('#9fc6e0'), 0, 1.4, -0.35);
  box(g, 1.9, 0.5, 0.05, solid('#9fc6e0'), 0, 1.35, 1.96);
  for (const x of [-0.7, 0.7]) {
    box(g, 0.3, 0.2, 0.05, glow('#fff3c4'), x, 0.7, 2.16);
    box(g, 0.3, 0.2, 0.05, glow('#ff6b5b'), x, 0.7, -2.16);
  }
  wheels(g, 0.9, [1.4, -1.4], 0.35);
  return g;
}

// ---------------------------------------------------------------- decoration scenes (pedestal 3 x 3)

function flowerRing(g: THREE.Object3D, r: number, n: number, seed = 0): void {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + seed;
    cyl(g, 0.02, 0.02, 0.25, solid('#4d7a3a'), Math.cos(a) * r, 0, Math.sin(a) * r, 4);
    blob(g, 0.11, solid(FLOWERS[(k + seed) % FLOWERS.length]), Math.cos(a) * r, 0.3, Math.sin(a) * r);
  }
}

function bed(g: THREE.Object3D, w: number, d: number, x: number, z: number, n: number, seed: number): void {
  box(g, w, 0.3, d, solid(WOOD), x, 0, z);
  box(g, w - 0.16, 0.05, d - 0.16, solid('#5a3e2b'), x, 0.28, z);
  for (let k = 0; k < n; k++) {
    const fx = x + ((k % 4) / 3 - 0.5) * (w - 0.5);
    const fz = z + (Math.floor(k / 4) / Math.max(1, Math.ceil(n / 4) - 1) - 0.5) * (d - 0.4);
    cyl(g, 0.02, 0.02, 0.25, solid('#4d7a3a'), fx, 0.3, fz, 4);
    blob(g, 0.12, solid(FLOWERS[(k + seed) % FLOWERS.length]), fx, 0.6, fz);
  }
}

function lanternPost(g: THREE.Object3D, x: number, z: number, h = 1.8): void {
  cyl(g, 0.05, 0.07, h, solid('#2b2b33'), x, 0, z, 6);
  box(g, 0.3, 0.34, 0.3, glow('#ffc56b'), x, h, z);
  box(g, 0.4, 0.07, 0.4, solid('#2b2b33'), x, h + 0.34, z);
}

function bench(g: THREE.Object3D, x: number, z: number, rotY = 0): void {
  const b = new THREE.Group();
  box(b, 1.6, 0.12, 0.5, solid(WOOD), 0, 0.45, 0);
  box(b, 1.6, 0.45, 0.1, solid(WOOD), 0, 0.6, -0.22);
  for (const sx of [-0.7, 0.7]) box(b, 0.1, 0.45, 0.45, solid('#2b2b33'), sx, 0, 0);
  b.position.set(x, 0, z);
  b.rotation.y = rotY;
  g.add(b);
}

const DECO: Record<string, () => THREE.Group> = {
  deco_cat_sign: () => {
    const g = new THREE.Group();
    const wood = solid(WOOD);
    const cat = solid('#d08a3c');
    const cream = solid('#f3e2cf');
    const dark = solid('#2b2b33');

    // The greeting is a compact 5×7 block font built into one geometry (no texture or extra draw calls).
    const boardX = -0.27;
    const boardZ = -0.25;
    const boardWidth = 2.35;
    const boardHeight = 0.62;
    const boardDepth = 0.14;
    const boardBottom = 1.04;
    box(g, boardWidth, boardHeight, boardDepth, wood, boardX, boardBottom, boardZ);
    for (const x of [boardX - 0.72, boardX + 0.72]) {
      box(g, 0.12, 1.4, 0.12, wood, x, 0, boardZ - 0.01);
    }

    const glyphs: Record<string, string[]> = {
      H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
      a: ['00000', '01110', '00001', '01111', '10001', '10011', '01101'],
      l: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
      o: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
      M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
      i: ['00100', '00000', '01100', '00100', '00100', '00100', '01110'],
      k: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
      '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
    };
    const phrase = 'Hallo Malik!';
    const cellW = 0.032;
    const cellH = 0.055;
    const advance = 0.18;
    const space = 0.1;
    const phraseWidth =
      phrase.split('').reduce((width, char) => width + (char === ' ' ? space : advance), 0) -
      (phrase.endsWith('!') ? advance - cellW * 5 : 0);
    let cursorX = boardX - phraseWidth / 2;
    const positions: number[] = [];
    const indices: number[] = [];
    let vertex = 0;
    const faceZ = boardZ + boardDepth / 2 + 0.008;
    for (const char of phrase) {
      if (char === ' ') {
        cursorX += space;
        continue;
      }
      const rows = glyphs[char];
      for (let row = 0; row < rows.length; row++) {
        for (let col = 0; col < rows[row].length; col++) {
          if (rows[row][col] !== '1') continue;
          const x0 = cursorX + col * cellW;
          const x1 = x0 + cellW * 0.82;
          const y0 = boardBottom + (boardHeight - cellH * 7) / 2 + (6 - row) * cellH;
          const y1 = y0 + cellH * 0.82;
          positions.push(x0, y0, faceZ, x1, y0, faceZ, x1, y1, faceZ, x0, y1, faceZ);
          indices.push(vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3);
          vertex += 4;
        }
      }
      cursorX += advance;
    }
    const lettering = new THREE.BufferGeometry();
    lettering.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lettering.setIndex(indices);
    lettering.computeVertexNormals();
    add(g, lettering, cream, 0, 0, 0);

    // Seated cat beside the sign: compact body, head, ears, paws, face, and a curved tail silhouette.
    const catX = 0.93;
    const catZ = 0.08;
    blob(g, 0.23, cat, catX, 0.3, catZ, 0);
    blob(g, 0.17, cat, catX, 0.64, catZ + 0.06, 0);
    for (const side of [-1, 1]) {
      add(g, new THREE.ConeGeometry(0.075, 0.18, 4), cat, catX + side * 0.105, 0.83, catZ + 0.04);
      box(g, 0.1, 0.12, 0.17, cat, catX + side * 0.12, 0, catZ + 0.19);
      blob(g, 0.023, dark, catX + side * 0.065, 0.665, catZ + 0.205, 0);
      blob(g, 0.035, cream, catX + side * 0.04, 0.59, catZ + 0.22, 0);
    }
    blob(g, 0.018, dark, catX, 0.615, catZ + 0.245, 0);
    for (const [x, y, z] of [
      [catX - 0.2, 0.27, catZ - 0.08],
      [catX - 0.3, 0.35, catZ - 0.12],
      [catX - 0.27, 0.46, catZ - 0.13],
    ]) {
      blob(g, 0.065, cat, x, y, z, 0);
    }
    return g;
  },
  deco_mailbox: () => {
    const g = new THREE.Group();
    box(g, 0.14, 1.1, 0.14, solid('#6b4a2f'), 0, 0, 0);
    box(g, 0.55, 0.42, 0.75, solid('#3c4a7a'), 0, 1.1, 0);
    box(g, 0.05, 0.35, 0.2, solid('#eb5757'), 0.3, 1.35, 0.15);
    flowerRing(g, 0.8, 10);
    flowerRing(g, 1.2, 14, 2);
    return g;
  },
  deco_flowerbed: () => {
    const g = new THREE.Group();
    bed(g, 2.6, 0.9, 0, -0.7, 8, 0);
    bed(g, 2.6, 0.9, 0, 0.7, 8, 3);
    return g;
  },
  deco_fence: () => {
    const g = new THREE.Group();
    // white picket fence on three sides around a small flower patch
    const runs: Array<[number, number, number, number]> = [
      [-1.35, -1.35, 1.35, -1.35],
      [-1.35, -1.35, -1.35, 1.0],
      [1.35, -1.35, 1.35, 1.0],
    ];
    for (const [ax, az, bx, bz] of runs) {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 0.3);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        box(g, 0.08, 0.8, 0.08, solid('#f1e9dc'), ax + (bx - ax) * t, 0, az + (bz - az) * t);
      }
      const rail = box(g, len, 0.06, 0.05, solid('#f1e9dc'), (ax + bx) / 2, 0.55, (az + bz) / 2);
      rail.rotation.y = Math.atan2(-(bz - az), bx - ax);
    }
    bed(g, 2.0, 1.2, 0, -0.4, 8, 1);
    return g;
  },
  deco_gnome: () => {
    const g = new THREE.Group();
    cyl(g, 0.22, 0.3, 0.5, solid('#3f6fb0'), 0, 0, 0);
    blob(g, 0.2, solid('#f2c9a0'), 0, 0.68, 0.02);
    add(g, new THREE.ConeGeometry(0.17, 0.35, 6), solid('#ffffff'), 0, 0.5, 0.15).rotation.x = Math.PI;
    add(g, new THREE.ConeGeometry(0.24, 0.6, 7), solid('#d64545'), 0, 1.05, 0);
    for (const [x, z, s] of [
      [-0.9, 0.6, 1],
      [0.8, -0.7, 0.8],
      [0.9, 0.8, 1.2],
      [-0.7, -0.9, 0.9],
    ]) {
      cyl(g, 0.06 * s, 0.08 * s, 0.25 * s, solid('#f1e9dc'), x, 0, z, 6);
      add(
        g,
        new THREE.SphereGeometry(0.2 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        solid('#d64545'),
        x,
        0.25 * s,
        z,
      );
    }
    for (let k = 0; k < 4; k++)
      blob(g, 0.35, solid(GREEN[k]), Math.cos(k * 1.6 + 0.4) * 1.1, 0.25, Math.sin(k * 1.6 + 0.4) * 1.1);
    return g;
  },
  deco_bench: () => {
    const g = new THREE.Group();
    bench(g, 0, -0.6);
    lanternPost(g, 1.15, -0.8);
    blob(g, 0.45, solid(GREEN[0]), -1.1, 0.35, -0.8);
    flowerRing(g, 0.5, 6);
    return g;
  },
  deco_hedge: () => {
    const g = new THREE.Group();
    // clipped hedge in an L with rounded shrubs
    for (let k = 0; k < 5; k++) blob(g, 0.42, solid(GREEN[k % 2]), -1.0 + k * 0.5, 0.45, -1.0, 1);
    for (let k = 1; k < 5; k++) blob(g, 0.42, solid(GREEN[(k + 1) % 2]), -1.0, 0.45, -1.0 + k * 0.5, 1);
    blob(g, 0.55, solid(GREEN[2]), 0.6, 0.55, 0.6, 1);
    return g;
  },
  deco_rosebush: () => {
    const g = new THREE.Group();
    for (const [x, z, s] of [
      [-0.7, -0.5, 1.1],
      [0.7, -0.4, 1],
      [0, 0.7, 0.9],
    ]) {
      blob(g, 0.55 * s, solid('#3f7d4a'), x, 0.55 * s, z, 1);
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9;
        blob(
          g,
          0.09,
          solid(k % 3 ? '#d64545' : '#f2a7d0'),
          x + Math.cos(a) * 0.45 * s,
          0.6 * s + (k % 2) * 0.2,
          z + Math.sin(a) * 0.45 * s,
        );
      }
    }
    return g;
  },
  deco_lantern: () => {
    const g = new THREE.Group();
    lanternPost(g, -0.9, -0.9, 2.0);
    lanternPost(g, 0.9, 0.9, 2.0);
    for (let k = 0; k < 5; k++) {
      const t = k / 4;
      add(
        g,
        new THREE.CylinderGeometry(0.28, 0.3, 0.06, 7),
        solid('#b9b2a6'),
        -1.0 + t * 2.0,
        0.03,
        1.0 - t * 2.0,
      );
    }
    return g;
  },
  deco_fountain: () => {
    const g = new THREE.Group();
    cyl(g, 1.2, 1.3, 0.45, solid('#a7a3a0'), 0, 0, 0, 14);
    cyl(
      g,
      1.05,
      1.05,
      0.05,
      new THREE.MeshStandardMaterial({
        color: '#6fc3e6',
        emissive: '#2a6f9a',
        emissiveIntensity: 0.4,
        roughness: 0.1,
      }),
      0,
      0.4,
      0,
      14,
    );
    cyl(g, 0.18, 0.24, 1.0, solid('#a7a3a0'), 0, 0.45, 0, 8);
    cyl(g, 0.5, 0.35, 0.18, solid('#a7a3a0'), 0, 1.45, 0, 10);
    return g;
  },
  deco_statue: () => {
    const g = new THREE.Group();
    box(g, 1.1, 0.8, 1.1, solid('#b9b2a6'));
    box(g, 1.3, 0.12, 1.3, solid('#a7a3a0'), 0, 0.8, 0);
    cyl(g, 0.22, 0.32, 0.9, solid('#c9c3b6'), 0, 0.92, 0, 7);
    blob(g, 0.22, solid('#c9c3b6'), 0, 2.05, 0, 0);
    add(g, new THREE.ConeGeometry(0.25, 0.35, 5), solid('#c9c3b6'), 0, 2.35, 0);
    for (let k = 0; k < 4; k++)
      blob(g, 0.3, solid(GREEN[k]), Math.cos(k * 1.57 + 0.78) * 1.1, 0.22, Math.sin(k * 1.57 + 0.78) * 1.1);
    return g;
  },
  deco_swing: () => {
    const g = new THREE.Group();
    for (const sx of [-1.2, 1.2]) {
      for (const sz of [-0.5, 0.5]) {
        const leg = add(g, new THREE.BoxGeometry(0.12, 2.5, 0.12), solid(WOOD), sx, 1.2, sz * 0.6);
        leg.rotation.x = sz * 0.35;
      }
    }
    box(g, 2.6, 0.14, 0.14, solid(WOOD), 0, 2.35, 0);
    for (const sx of [-0.3, 0.3]) box(g, 0.03, 1.6, 0.03, solid('#e8d9b0'), sx, 0.75, 0);
    box(g, 0.8, 0.08, 0.35, solid('#d64545'), 0, 0.7, 0);
    return g;
  },
  deco_pond: () => {
    const g = new THREE.Group();
    add(
      g,
      new THREE.CylinderGeometry(1.15, 1.15, 0.05, 12),
      new THREE.MeshStandardMaterial({
        color: '#4fa3d1',
        emissive: '#1d4f73',
        emissiveIntensity: 0.4,
        roughness: 0.1,
      }),
      0,
      0.04,
      0,
    );
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const r = add(
        g,
        new THREE.DodecahedronGeometry(0.22, 0),
        solid(STONE),
        Math.cos(a) * 1.18,
        0.17,
        Math.sin(a) * 1.18,
      );
      r.rotation.set(k, k * 0.7, 0);
    }
    for (const [x, z] of [
      [0.3, 0.2],
      [-0.4, -0.3],
    ])
      cyl(g, 0.22, 0.22, 0.02, solid('#5d8f3e'), x, 0.07, z, 8);
    for (let k = 0; k < 5; k++)
      cyl(g, 0.02, 0.03, 0.9, solid('#6f8f45'), -0.9 + k * 0.08, 0, 0.9 - k * 0.05, 4);
    return g;
  },
  deco_wagon: () => {
    const g = new THREE.Group();
    box(g, 1.2, 0.5, 1.6, solid(WOOD), 0, 0.5, 0);
    blob(g, 0.6, solid('#e3c35a'), 0, 1.05, 0, 0).scale.set(1, 0.6, 1.25);
    for (const z of [-0.55, 0.55]) {
      for (const sx of [-1, 1]) {
        const w = add(
          g,
          new THREE.CylinderGeometry(0.42, 0.42, 0.1, 10),
          solid('#6b4a2f'),
          sx * 0.66,
          0.42,
          z,
        );
        w.rotation.z = Math.PI / 2;
      }
    }
    box(g, 0.08, 0.08, 0.6, solid('#6b4a2f'), 0, 0.55, 1.1);
    return g;
  },
  deco_tent: () => {
    const g = new THREE.Group();
    const tent = new THREE.Group();
    tent.position.set(0, 0, -0.35);
    gable(tent, 1.9, 2.0, 1.5, 0, solid('#d08a3c'), false);
    g.add(tent);
    // campfire in front: ring of stones and a glowing flame
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      add(
        g,
        new THREE.DodecahedronGeometry(0.12, 0),
        solid(STONE),
        Math.cos(a) * 0.32,
        0.08,
        1.0 + Math.sin(a) * 0.32,
      );
    }
    add(g, new THREE.ConeGeometry(0.18, 0.45, 5), glow('#ffb35c'), 0, 0.25, 1.0);
    return g;
  },
};

const HOUSES: Record<string, (t: Tint) => THREE.Group> = {
  house_fachwerk: houseFachwerk,
  house_landhaus: houseLandhaus,
  house_villa: houseVilla,
};
const GARAGES: Record<string, () => THREE.Group> = {
  garage_holz: garageHolz,
  garage_stein: garageStein,
};
const CARS: Record<string, () => THREE.Group> = {
  car_kleinwagen: carKleinwagen,
  car_camper: carCamper,
};

/** All item ids with a model (the asset contract test checks each one). */
export const MODEL_IDS = {
  house: Object.keys(HOUSES),
  garage: Object.keys(GARAGES),
  car: Object.keys(CARS),
  deco: Object.keys(DECO),
};

/**
 * The model of an item, origin in the middle of its footprint on the ground, front towards +Z.
 * Unknown ids fall back to a neutral placeholder of the right kind.
 */
export function plotAsset(kind: string, itemId: string, tint: Tint = tintFor(0)): THREE.Group {
  if (kind === 'house' && itemId === RUIN_ID) return buildRuin();
  if (kind === 'house') return (HOUSES[itemId] ?? houseFachwerk)(tint);
  if (kind === 'garage') return (GARAGES[itemId] ?? garageHolz)();
  if (kind === 'car') return (CARS[itemId] ?? carKleinwagen)();
  const scene = DECO[itemId];
  if (scene) return scene();
  const g = new THREE.Group();
  box(g, 1.2, 1.0, 1.2, solid('#c9a23e'));
  return g;
}
