import { CREST_COLOURS, CREST_PATHS, crestParts, crestTier, type CrestTier } from '../ui/crest';
/**
 * Builds the 3D village from a Layout: terrain, river, lanes, bridges, plaza and plots.
 * Placeholder models only (boxes and cones). The comic models come in Stufe 2.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAP_SIZE, WATER_LEVEL } from '../world/constants';
import {
  DRIVEWAY_X,
  HOUSE_FRONT_Z,
  PATH_X,
  PLOT_ROWS,
  SLOTS,
  rectCentre,
  type SlotDef,
  type SlotId,
} from '../world/plotPlan';
import { plotAsset, tintFor } from './plotAssets';
import { shownItem, type SlotMap } from '../api/build';
import type { Layout, Plot } from '../world/layout';
import type { Point2 } from '../world/geometry';
import { createRng } from '../world/rng';
import { laneDistance, placeMeadows } from '../world/scatter';
import { buildNature, buildVegetation } from './nature';
import { buildPlaza } from './plaza';
import { buildBridge } from './bridges';
import { bakeStatic } from './merge';
import { buildLandmarks } from './landmarks';
import { rippleNormalTexture, skyTexture } from './textures';
import { fenceGeometry } from './house';
import { buildLanes } from './lanes';
import { instancedModel, kenneyModel } from './kenney';

const MAT = {
  ground: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
  path: new THREE.MeshStandardMaterial({
    color: '#c9b48c',
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  }),
  water: new THREE.MeshStandardMaterial({
    color: '#5fb3d9',
    roughness: 0.15,
    metalness: 0.1,
    side: THREE.DoubleSide,
  }),
  wood: new THREE.MeshStandardMaterial({ color: '#8a5a36', roughness: 0.9 }),
  wall: new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.9 }),
  roof: new THREE.MeshStandardMaterial({ color: '#c4574b', roughness: 0.8, flatShading: true }),
  grass: new THREE.MeshStandardMaterial({ color: '#5f8f52', roughness: 1, flatShading: true }),
  grass2: new THREE.MeshStandardMaterial({ color: '#6a9c58', roughness: 1, flatShading: true }),
  stone: new THREE.MeshStandardMaterial({ color: '#8f8d86', roughness: 0.95, flatShading: true }),
  timber: new THREE.MeshStandardMaterial({ color: '#6b4a35', roughness: 0.9 }),
  door: new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.8 }),
  window: new THREE.MeshBasicMaterial({ color: '#ffad42' }),
  trunk: new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 }),
  mailbox: new THREE.MeshStandardMaterial({ color: '#3c4a7a', roughness: 0.7 }),
  lotLawn: new THREE.MeshStandardMaterial({ color: '#729f5c', roughness: 1, flatShading: true }),
  rope: new THREE.MeshStandardMaterial({ color: '#e8d9b0', roughness: 0.9 }),
  signBoard: new THREE.MeshStandardMaterial({ color: '#a0703f', roughness: 0.9 }),
};

function terrainMesh(layout: Layout): THREE.Mesh {
  // low-poly ground with visible facets, coloured per vertex (prototype, LOOK §3/§4)
  const size = MAP_SIZE + 40;
  const seg = 170;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const low = new THREE.Color('#4e7a45');
  const mid = new THREE.Color('#5f8f52');
  const high = new THREE.Color('#7aa35c');
  const bank = new THREE.Color('#a99b72');
  const pathCol = new THREE.Color('#c99a78');
  const trampled = new THREE.Color('#8c9a58');
  const meadowCol = new THREE.Color('#93c26a');
  const tmp = new THREE.Color();
  const t = layout.terrain;
  const meadows = placeMeadows(layout);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = t.groundHeight(x, z);
    pos.setY(i, h);
    tmp
      .copy(low)
      .lerp(mid, smoothstep(-0.5, 2.5, h))
      .lerp(high, smoothstep(3, 9, h));
    // sandy bank only right at the water (no brown slopes)
    const rd = t.riverDistance(x, z);
    tmp.lerp(bank, smoothstep(5.6, 3.8, rd) * 0.85);
    // blossom meadows are painted into the grass, so they follow every slope
    for (const m of meadows) {
      const d = Math.hypot(x - m.x, z - m.z);
      if (d < m.radius + 1) tmp.lerp(meadowCol, smoothstep(m.radius + 1, m.radius - 0.6, d) * 0.8);
    }
    // the lane strip lies on top and fades out at its sides (render/lanes.ts): under the fade
    // the lawn is trampled and dry, under the solid core it is earth
    const ld = laneDistance(layout, x, z);
    tmp.lerp(trampled, smoothstep(1.9, 0.8, ld) * 0.45);
    tmp.lerp(pathCol, smoothstep(0.7, 0.3, ld) * 0.9);
    // gentle large and small noise, so no field is one flat colour (LOOK §2.1)
    const n = Math.sin(x * 1.7) * Math.cos(z * 1.3) * 0.025 + Math.sin(x * 0.21 + z * 0.17) * 0.03;
    col[i * 3] = tmp.r + n;
    col[i * 3 + 1] = tmp.g + n * 1.2;
    col[i * 3 + 2] = tmp.b + n * 0.6;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88 }),
  );
  mesh.receiveShadow = true;
  mesh.userData.kind = 'ground'; // stays its own mesh (taps on the ground find free plots)
  return mesh;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/**
 * River surface (LOOK §4): four vertices across, so the water is light at the banks and deep blue in
 * the middle, with two blues alternating along the course. Ripples come from a scrolling normal map;
 * the sky panorama is reflected in it once it has loaded (userData.setSky).
 */
function riverMesh(river: Point2[]): THREE.Mesh {
  const shallow = new THREE.Color('#7cc4dc');
  const blueA = new THREE.Color('#3f8fbf');
  const blueB = new THREE.Color('#2f78ab');
  const across = [-1, -0.45, 0.45, 1];
  const verts: number[] = [];
  const cols: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const tmp = new THREE.Color();
  let along = 0;
  river.forEach((p, i) => {
    const half = 3.6 + 0.8 * Math.sin(i * 0.09); // width 5.6 to 8.8 m
    const prev = river[Math.max(0, i - 1)];
    const next = river[Math.min(river.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const l = Math.hypot(tx, tz) || 1;
    if (i > 0) along += Math.hypot(p.x - prev.x, p.z - prev.z);
    const deep = tmp.copy(blueA).lerp(blueB, 0.5 + 0.5 * Math.sin(along * 0.08));
    across.forEach((k) => {
      verts.push(p.x + (-tz / l) * half * k, WATER_LEVEL, p.z + (tx / l) * half * k);
      const c = Math.abs(k) === 1 ? shallow : deep;
      cols.push(c.r, c.g, c.b);
      uvs.push((k * half) / 6, along / 6);
    });
    if (i > 0) {
      const a0 = (i - 1) * 4;
      const b0 = i * 4;
      for (let k = 0; k < 3; k++) {
        idx.push(a0 + k, b0 + k, a0 + k + 1, a0 + k + 1, b0 + k, b0 + k + 1);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const ripples = rippleNormalTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    normalMap: ripples,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.06,
    metalness: 0.3,
    envMap: skyTexture(), // replaced by the sky panorama (setSky)
    envMapIntensity: 0.9,
    emissive: '#1d4f73',
    emissiveIntensity: 0.25,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.userData = { ripples, material: mat };
  return mesh;
}

export interface TagInfo {
  nickname: string;
  level?: number;
  titleLabel?: string | null;
}
export function drawTagCrest(
  cx: CanvasRenderingContext2D,
  level: number,
  x: number,
  y: number,
  size: number,
): void {
  const tier = crestTier(level);
  cx.save();
  cx.translate(x, y);
  cx.scale(size / 100, size / 100);
  cx.fillStyle = CREST_COLOURS[tier];
  cx.strokeStyle = '#493724';
  cx.lineWidth = 3;
  for (const key of crestParts(level)) {
    cx.fillStyle =
      key === 'ribbon' || key === 'rivets' ? '#fff0c9' : key === 'crown' ? '#f5d479' : CREST_COLOURS[tier];
    const shape = new Path2D(CREST_PATHS[key]);
    cx.fill(shape);
    cx.stroke(shape);
  }
  cx.fillStyle = '#302416';
  cx.font = 'bold 24px Georgia';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(`Lv.${level}`, 50, 75, 70);
  cx.restore();
}
export function nameTagLayout(
  info: TagInfo,
  _own: boolean,
): { width: number; height: number; lines: string[]; crest: { text: string; tier: CrestTier } | null } {
  return {
    width: 256,
    height: info.titleLabel ? 96 : 64,
    lines: info.titleLabel ? [info.nickname, info.titleLabel] : [info.nickname],
    crest: info.level ? { text: `Lv.${info.level}`, tier: crestTier(info.level) } : null,
  };
}
export interface VillageMember {
  /** Plot index in the class village (profiles.plot_index). */
  plotIndex: number;
  nickname: string;
  level?: number;
  titleLabel?: string | null;
  frameId?: string;
  /** What stands in the slots of the plot (house and garage fall back to the starters). */
  slots?: SlotMap;
}

/** Floating name label above a house. Canvas texture, so no HTML inside the 3D scene. */
export function nameTag(info: TagInfo | string, own: boolean): THREE.Sprite {
  const data = typeof info === 'string' ? { nickname: info } : info;
  const layout = nameTagLayout(data, own);
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = layout.height;
  const cx = cv.getContext('2d');
  if (cx) {
    cx.fillStyle = own ? 'rgba(255,181,71,0.95)' : 'rgba(20,24,40,0.8)';
    cx.beginPath();
    cx.roundRect(6, 10, 244, layout.height - 20, 22);
    cx.fill();
    cx.fillStyle = own ? '#2a1d05' : '#ffffff';
    cx.font = 'bold 26px Atkinson Hyperlegible, Verdana, sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    if (layout.crest) drawTagCrest(cx, data.level!, 12, 14, 44);
    cx.fillText(data.nickname, layout.crest ? 151 : 128, 33, layout.crest ? 184 : 236);
    if (data.titleLabel) {
      cx.font = '20px Georgia, serif';
      cx.fillText(data.titleLabel, 128, 68, 230);
    }
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true }),
  );
  sprite.scale.set(2.4, (layout.height / 64) * 0.6, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * A free plot (SPEC §10.5): lawn with four wooden stakes and a small sign "frei". No house and no
 * fence, so an empty plot does not look like a ghost house.
 */
function freeLot(p: Plot): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.h, p.z);
  g.rotation.y = p.face;
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.1, p.d), MAT.lotLawn);
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  g.add(lawn);
  // building site: stakes at the corners and in the middle of each side, a rope between them
  const hw = p.w / 2 - 0.2;
  const hd = p.d / 2 - 0.2;
  const ring: Array<[number, number]> = [
    [-hw, -hd],
    [0, -hd],
    [hw, -hd],
    [hw, 0],
    [hw, hd],
    [0, hd],
    [-hw, hd],
    [-hw, 0],
  ];
  ring.forEach(([x, z], i) => {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 5), MAT.wood);
    stake.position.set(x, 0.35, z);
    stake.castShadow = true;
    g.add(stake);
    const [nx, nz] = ring[(i + 1) % ring.length];
    const len = Math.hypot(nx - x, nz - z);
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, len), MAT.rope);
    rope.position.set((x + nx) / 2, 0.55, (z + nz) / 2);
    rope.rotation.y = Math.atan2(nx - x, nz - z);
    g.add(rope);
  });
  // a wooden sign at the front and a small pile of planks: here a house can be built
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 0.12), MAT.trunk);
  post.position.set(-1.6, 0.65, hd - 0.4);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), MAT.signBoard);
  board.position.set(-1.6, 1.2, hd - 0.33);
  g.add(post, board);
  const sign = nameTag('frei', false);
  sign.scale.set(1.1, 0.28, 1);
  sign.position.set(-1.6, 1.2, hd - 0.25);
  g.add(sign);
  for (let k = 0; k < 4; k++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.3), k % 2 ? MAT.wood : MAT.timber);
    plank.position.set(hw - 1.6, 0.13 + Math.floor(k / 2) * 0.13, -hd + 1.2 + (k % 2) * 0.34);
    plank.rotation.y = 0.12 * (k - 1.5);
    plank.castShadow = true;
    g.add(plank);
  }
  plantFreeLot(g, p);
  return g;
}

const LOT_BUSH = ['#3f8f5a', '#4d9a5d', '#2f7d5b', '#5d8f3e'];
const LOT_FLOWER = ['#f2c94c', '#eb5757', '#f2a7d0', '#ffffff', '#bb6bd9'];

/**
 * Three small shrubs and a few blossoms on a free plot, always the same for the same plot (LOOK §8),
 * so the lot reads as a garden waiting for its owner instead of bare lawn.
 */
function plantFreeLot(g: THREE.Group, p: Plot): void {
  const rng = createRng(p.index * 97 + 5);
  const bush = new THREE.IcosahedronGeometry(0.55, 0);
  bush.translate(0, 0.4, 0);
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(
      bush,
      new THREE.MeshStandardMaterial({
        color: LOT_BUSH[(p.index + k) % LOT_BUSH.length],
        flatShading: true,
        roughness: 0.85,
      }),
    );
    // along the side edges, so the middle of the site stays open
    const side = k % 2 ? 1 : -1;
    m.position.set(side * (p.w / 2 - 0.9 - rng() * 0.6), 0.05, (rng() - 0.5) * p.d * 0.7);
    m.scale.set(0.8 + rng() * 0.5, 0.7 + rng() * 0.3, 0.8 + rng() * 0.5);
    m.rotation.y = rng() * Math.PI * 2;
    g.add(m);
  }
  const blossom = new THREE.SphereGeometry(0.1, 5, 4);
  for (let k = 0; k < 14; k++) {
    const m = new THREE.Mesh(
      blossom,
      new THREE.MeshStandardMaterial({
        color: LOT_FLOWER[(p.index + k) % LOT_FLOWER.length],
        roughness: 0.7,
      }),
    );
    m.position.set((rng() - 0.5) * p.w * 0.8, 0.12, (rng() - 0.5) * p.d * 0.8);
    g.add(m);
  }
}

/** Flat surface strip in plot-local coordinates (path, driveway). */
function surface(
  g: THREE.Group,
  lx: number,
  z0: number,
  z1: number,
  w: number,
  mat: THREE.Material,
  y: number,
): void {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, z1 - z0), mat);
  m.position.set(lx, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  g.add(m);
}

// paving stones in warm greys (Kenney style), on a dark bed that shows as the joints
const PAVING = [
  new THREE.MeshStandardMaterial({ color: '#c7c0b3', roughness: 0.9, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: '#b3ac9f', roughness: 0.9, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: '#d4cdbf', roughness: 0.9, flatShading: true }),
];
const PAVING_BED = new THREE.MeshStandardMaterial({ color: '#7d766b', roughness: 1, flatShading: true });

/**
 * A paved strip in plot-local coordinates: rows of slightly irregular flat stones (about 0.4 m),
 * every other row shifted by half a stone, on a dark bed. One mesh per stone colour, so the
 * static merge (render/merge.ts) folds them into the village.
 */
function paving(g: THREE.Group, lx: number, z0: number, z1: number, w: number, seed: number): void {
  surface(g, lx, z0, z1, w, PAVING_BED, 0.07);
  const parts: THREE.BufferGeometry[][] = PAVING.map(() => []);
  const rows = Math.max(1, Math.round((z1 - z0) / 0.42));
  const rowD = (z1 - z0) / rows;
  let h = seed * 9973 + 17;
  const rnd = (): number => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
  for (let r = 0; r < rows; r++) {
    const shift = r % 2 ? 0.5 : 0;
    const cols = Math.max(1, Math.round(w / 0.45));
    const colW = w / cols;
    for (let c = -1; c < cols; c++) {
      let a = (c + shift) * colW;
      let b = a + colW;
      a = Math.max(a, 0);
      b = Math.min(b, w);
      if (b - a < 0.12) continue;
      const sw = b - a - 0.06 - rnd() * 0.04;
      const sd = rowD - 0.06 - rnd() * 0.04;
      const stone = new THREE.BoxGeometry(sw, 0.05 + rnd() * 0.02, sd);
      stone.rotateY((rnd() - 0.5) * 0.08);
      stone.translate(lx - w / 2 + (a + b) / 2, 0.11, z0 + (r + 0.5) * rowD);
      parts[Math.floor(rnd() * PAVING.length)].push(stone);
    }
  }
  parts.forEach((list, k) => {
    if (list.length === 0) return;
    const m = new THREE.Mesh(mergeGeometries(list), PAVING[k]);
    m.receiveShadow = true;
    g.add(m);
  });
}

/** Width of the driveway gate (the opening in the front fence). */
const DRIVE_GATE = 3.0;

/**
 * Closed double gates in front of the car stands of all occupied plots: Kenney Fantasy Town
 * fence-gate (a 1 m fence tile along z with a door in the middle, 0.38 m high), turned along the
 * front fence; one InstancedMesh.
 */
function driveGates(plots: Plot[]): THREE.Group {
  const g = new THREE.Group();
  if (plots.length === 0) return g;
  void kenneyModel('town', 'fence-gate').then((model) => {
    if (!model) return;
    const mats = plots.map((p) => {
      // the model is a fence tile: its posts stand on the tile edge at x = 0.46, so centre it first
      const local = new THREE.Matrix4()
        .makeTranslation(DRIVEWAY_X, 0.02, p.d / 2)
        .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))
        .multiply(new THREE.Matrix4().makeScale(DRIVE_GATE, 2.2, DRIVE_GATE))
        .multiply(new THREE.Matrix4().makeTranslation(-0.46, 0, 0));
      return new THREE.Matrix4().makeRotationY(p.face).setPosition(p.x, p.h, p.z).multiply(local);
    });
    const gates = instancedModel(model, mats);
    gates.castShadow = true;
    g.add(gates);
  });
  return g;
}

/**
 * Contents of an occupied plot after the fixed plan (world/plotPlan.ts): house, garage, driveway
 * with car pedestal, footpath, four decoration pedestals (green lawn while empty), fence with a gate
 * on the footpath and an opening for the driveway, mailbox at the gate.
 */
function plotContents(p: Plot, slots: SlotMap): THREE.Group {
  const g = new THREE.Group();
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.1, p.d), p.index % 2 ? MAT.grass : MAT.grass2);
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  g.add(lawn);

  // paved footpath from the garden gate to the front door, and the paved car stand in front of
  // the garage (the plot ends at its fence: no driveway out to the lane, the gate stays shut)
  paving(g, PATH_X, HOUSE_FRONT_Z, p.d / 2, 2.0, p.index * 2 + 1);
  const garage = SLOTS.find((s) => s.id === 'garage') as SlotDef;
  const driveStart = garage.z + garage.d - PLOT_ROWS / 2;
  paving(g, DRIVEWAY_X, driveStart, p.d / 2, 3.0, p.index * 2 + 2);
  for (const side of [-1.55, 1.55]) surface(g, DRIVEWAY_X + side, driveStart, p.d / 2, 0.12, MAT.stone, 0.1);

  const tint = tintFor(p.index);
  for (const slot of SLOTS) {
    const content = shownItem(slots, slot.id, slot.kind);
    if (!content) continue; // empty pedestal: green lawn
    const model = plotAsset(slot.kind, content.itemId, tint);
    model.userData.slot = slot.id;
    const c = rectCentre(slot);
    model.position.set(c.lx, 0.07, c.lz);
    model.rotation.y = (content.rot * Math.PI) / 2;
    g.add(model);
  }

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), MAT.trunk);
  post.position.set(PATH_X + 1.4, 0.45, p.d / 2 - 0.3);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.3), MAT.mailbox);
  box.position.set(PATH_X + 1.4, 0.95, p.d / 2 - 0.3);
  g.add(post, box);

  // post-and-rail fence: open gateway on the footpath (the residents walk through) and an opening
  // in front of the car stand that is closed by a double gate (driveGates, one mesh per village)
  const fence = new THREE.Mesh(
    fenceGeometry(p.w, p.d, [
      [PATH_X - 1.0, PATH_X + 1.0],
      [DRIVEWAY_X - DRIVE_GATE / 2, DRIVEWAY_X + DRIVE_GATE / 2],
    ]),
    MAT.wood,
  );
  fence.castShadow = true;
  g.add(fence);
  return g;
}

/** Marks every mesh of a group so that bakeStatic leaves it alone (the own plot changes live). */
function keepLive(g: THREE.Object3D): void {
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.kind = o.userData.kind ?? 'live';
  });
}

function plotGroup(p: Plot, member: VillageMember | undefined, own: boolean): THREE.Group {
  if (!member) return freeLot(p);
  const g = new THREE.Group();
  g.position.set(p.x, p.h, p.z);
  g.rotation.y = p.face;
  const house = rectCentre(SLOTS[0]);
  const tag = nameTag(member, own);
  tag.position.set(house.lx, 7.2, house.lz);
  tag.userData = { house: true, own };
  g.add(tag);
  if (own) {
    // marker: a small yellow cone above the own house
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.7, 8),
      new THREE.MeshBasicMaterial({ color: '#ffd23f' }),
    );
    marker.position.set(house.lx, 8.2, house.lz);
    marker.rotation.x = Math.PI;
    g.add(marker);
  }
  const contents = plotContents(p, member.slots ?? {});
  contents.name = 'contents';
  if (own) keepLive(contents);
  g.add(contents);
  return g;
}

/**
 * Builds the whole village as one Group. The caller adds it to the scene.
 * `members` labels the houses of the class; `ownPlotIndex` marks the pupil's own house.
 */
export function buildVillage(
  layout: Layout,
  members: VillageMember[] = [],
  ownPlotIndex: number | null = null,
): THREE.Group {
  const root = new THREE.Group();
  const byPlot = new Map(members.map((m) => [m.plotIndex, m]));
  root.add(terrainMesh(layout));
  const river = riverMesh(layout.terrain.river);
  root.add(river);

  // lanes: one soft-edged mesh (render/lanes.ts); the garden paths from the gates are stepping
  // stones (render/nature.ts); plots have no driveway out to the lane
  root.add(buildLanes(layout));

  // plaza: paving, fountain, quest board, stalls, benches (render/plaza.ts)
  const plaza = buildPlaza(layout);
  root.add(plaza);

  for (const b of layout.bridges) root.add(buildBridge(b, MAT.wood));

  let ownGroup: THREE.Group | null = null;
  for (const p of layout.plots) {
    const g = plotGroup(p, byPlot.get(p.index), p.index === ownPlotIndex);
    if (p.index === ownPlotIndex) ownGroup = g;
    root.add(g);
  }
  root.add(driveGates(layout.plots.filter((p) => byPlot.has(p.index))));
  // the build mode swaps the contents of the own plot without rebuilding the village
  root.userData.updateOwnPlot = (slots: SlotMap): void => {
    const plot = ownPlotIndex === null ? undefined : layout.plots[ownPlotIndex];
    if (!ownGroup || !plot) return;
    const old = ownGroup.getObjectByName('contents');
    if (old) ownGroup.remove(old);
    const fresh = plotContents(plot, slots);
    fresh.name = 'contents';
    ownGroup.add(fresh);
  };
  root.userData.ownSlotObject = (slot: SlotId): THREE.Object3D | null =>
    ownGroup?.getObjectByName('contents')?.children.find((object) => object.userData.slot === slot) ?? null;
  root.userData.updateOwnTag = (info: TagInfo): void => {
    const old = ownGroup?.children.find((o) => o instanceof THREE.Sprite && o.userData.house) as
      THREE.Sprite | undefined;
    if (!ownGroup || !old) return;
    const fresh = nameTag(info, true);
    old.material.map?.dispose();
    old.material.map = fresh.material.map;
    old.material.needsUpdate = true;
    old.scale.copy(fresh.scale);
    fresh.material.dispose();
  };
  root.add(buildNature(layout));
  root.add(buildVegetation(layout));
  root.add(buildLandmarks(layout));
  // animation hook: the village calls it every frame (water waves, fountain)
  // name labels: own house always, others only when the camera is near (SPEC §10.9)
  const houseTags: THREE.Sprite[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Sprite && o.userData.house) houseTags.push(o);
  });
  root.userData.labelUpdate = (cam: THREE.Camera): void => {
    const near = new THREE.Vector3();
    for (const tag of houseTags) {
      tag.getWorldPosition(near);
      tag.visible = Boolean(tag.userData.own) || near.distanceTo(cam.position) < 28;
    }
  };
  root.userData.setSky = (sky: THREE.Texture): void => {
    const mat = river.userData.material as THREE.MeshStandardMaterial;
    mat.envMap = sky;
    mat.needsUpdate = true;
  };
  root.userData.animate = (t: number): void => {
    // ripples drift downstream and pulse a little (LOOK §4: slow, about 0.9 rad/s)
    const ripples = river.userData.ripples as THREE.Texture;
    ripples.offset.set(t * 0.01, t * 0.03);
    const mat = river.userData.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.25 + 0.05 * Math.sin(t * 0.9);
    (plaza.userData.animate as ((t: number) => void) | undefined)?.(t);
  };
  return bakeStatic(root);
}
