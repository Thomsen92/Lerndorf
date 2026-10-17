/**
 * Builds the 3D village from a Layout: terrain, river, lanes, bridges, plaza and plots.
 * Placeholder models only (boxes and cones). The comic models come in Stufe 2.
 */
import * as THREE from 'three';
import { PLAZA_RADIUS, MAP_SIZE } from '../world/constants';
import type { Layout, Plot } from '../world/layout';
import type { Point2 } from '../world/geometry';

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
  grass: new THREE.MeshStandardMaterial({ color: '#5f8f52', roughness: 1 }),
};

const ROOF_COLORS = ['#c4574b', '#3f8f88', '#5a62b8', '#d08a3c', '#8c5aa8', '#4f8f5f'];

/** Vertical ribbon on the ground (lanes, river) following a list of 2D points. */
function ribbon(
  points: Point2[],
  width: number,
  heightAt: (x: number, z: number) => number,
  mat: THREE.Material,
): THREE.Mesh {
  const verts: number[] = [];
  const idx: number[] = [];
  points.forEach((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l;
    const nz = tx / l;
    const hL = heightAt(p.x + (nx * width) / 2, p.z + (nz * width) / 2) + 0.06;
    const hR = heightAt(p.x - (nx * width) / 2, p.z - (nz * width) / 2) + 0.06;
    verts.push(
      p.x + (nx * width) / 2,
      hL,
      p.z + (nz * width) / 2,
      p.x - (nx * width) / 2,
      hR,
      p.z - (nz * width) / 2,
    );
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = true;
  return m;
}

function terrainMesh(layout: Layout): THREE.Mesh {
  const seg = 110;
  const geo = new THREE.PlaneGeometry(MAP_SIZE + 30, MAP_SIZE + 30, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const low = new THREE.Color('#4e7a45');
  const high = new THREE.Color('#7aa35c');
  const bank = new THREE.Color('#a99b72');
  const tmp = new THREE.Color();
  const t = layout.terrain;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = t.groundHeight(x, z);
    pos.setY(i, h);
    tmp.copy(low).lerp(high, Math.min(1, Math.max(0, (h - 1) / 8)));
    const rd = t.riverDistance(x, z);
    tmp.lerp(bank, Math.min(1, Math.max(0, (6.5 - rd) / 2.5)) * 0.85);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, MAT.ground);
  mesh.receiveShadow = true;
  return mesh;
}

function riverMesh(river: Point2[]): THREE.Mesh {
  return ribbon(river, 7, () => -0.55, MAT.water);
}

export interface VillageMember {
  /** Plot index in the class village (profiles.plot_index). */
  plotIndex: number;
  nickname: string;
}

/** Floating name label above a house. Canvas texture, so no HTML inside the 3D scene. */
function nameTag(text: string, own: boolean): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const cx = cv.getContext('2d');
  if (cx) {
    cx.fillStyle = own ? 'rgba(255,181,71,0.95)' : 'rgba(20,24,40,0.8)';
    cx.beginPath();
    cx.roundRect(6, 10, 244, 44, 22);
    cx.fill();
    cx.fillStyle = own ? '#2a1d05' : '#ffffff';
    cx.font = 'bold 26px Atkinson Hyperlegible, Verdana, sans-serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, 128, 33, 236);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true }),
  );
  sprite.scale.set(2.4, 0.6, 1);
  sprite.renderOrder = 10;
  return sprite;
}

function plotGroup(p: Plot, member: VillageMember | undefined, own: boolean): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.h, p.z);
  g.rotation.y = p.face;

  if (member) {
    const tag = nameTag(member.nickname, own);
    tag.position.set(0, 4.6, -p.d / 2 + 1.5);
    g.add(tag);
  }
  if (own) {
    // marker: a small yellow cone above the own house
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.7, 8),
      new THREE.MeshBasicMaterial({ color: '#ffd23f' }),
    );
    marker.position.set(0, 5.6, -p.d / 2 + 1.5);
    marker.rotation.x = Math.PI;
    g.add(marker);
  }

  // lawn
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.1, p.d), MAT.grass);
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  g.add(lawn);

  // house: sized and coloured per plot
  const bw = (p.big ? 4.2 : 3.0) + ((p.index * 37) % 7) * 0.09;
  const bh = p.big ? 3.2 : 2.2;
  const bd = (p.big ? 3.2 : 2.5) + ((p.index * 17) % 5) * 0.06;
  const house = new THREE.Group();
  house.position.set(0, 0, -p.d / 2 + bd / 2 + 0.6);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), MAT.wall);
  walls.position.y = bh / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  house.add(walls);
  const roofMat = new THREE.MeshStandardMaterial({
    color: ROOF_COLORS[p.index % ROOF_COLORS.length],
    flatShading: true,
    roughness: 0.8,
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(bw, bd) * 0.75, 1.6, 4), roofMat);
  roof.position.y = bh + 0.8;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);
  g.add(house);

  // fence along the front and sides, gate at the front
  const fenceH = 0.7;
  const addFence = (x: number, z: number, w: number, d: number) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, fenceH, d), MAT.wood);
    f.position.set(x, fenceH / 2, z);
    g.add(f);
  };
  addFence(0, -p.d / 2, p.w, 0.12);
  addFence(-p.w / 2, 0, 0.12, p.d);
  addFence(p.w / 2, 0, 0.12, p.d);
  addFence(-p.w / 4 - 0.6, p.d / 2, p.w / 2 - 1.2, 0.12);
  addFence(p.w / 4 + 0.6, p.d / 2, p.w / 2 - 1.2, 0.12);

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
  root.add(riverMesh(layout.terrain.river));

  // lanes: each lane is a Catmull-Rom curve through its control points
  for (const pts of layout.map.lanes) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
      false,
      'centripetal',
    );
    const samples = curve
      .getSpacedPoints(Math.ceil(curve.getLength() / 0.7))
      .map((v) => ({ x: v.x, z: v.z }));
    root.add(ribbon(samples, 1.8, (x, z) => layout.terrain.groundHeight(x, z), MAT.path));
  }

  // plaza: a flat disc with a fountain
  const plazaDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS + 0.4, 0.4, 40),
    MAT.path,
  );
  plazaDisc.position.set(layout.plaza.x, layout.plazaHeight - 0.2, layout.plaza.z);
  plazaDisc.receiveShadow = true;
  root.add(plazaDisc);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 0.8, 16), MAT.wood);
  fountain.position.set(layout.plaza.x, layout.plazaHeight + 0.4, layout.plaza.z);
  root.add(fountain);

  // quest board
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.2), MAT.wood);
  board.position.set(layout.board.x, layout.plazaHeight + 2.2, layout.board.z);
  board.lookAt(layout.plaza.x, layout.plazaHeight + 2.2, layout.plaza.z);
  board.userData = { kind: 'board' };
  root.add(board);

  for (const b of layout.bridges) {
    const len = Math.hypot(b.b.x - b.a.x, b.b.z - b.a.z) + 1.2;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, len), MAT.wood);
    deck.position.set((b.a.x + b.b.x) / 2, b.y, (b.a.z + b.b.z) / 2);
    deck.rotation.y = Math.atan2(b.b.x - b.a.x, b.b.z - b.a.z);
    deck.castShadow = true;
    root.add(deck);
  }

  for (const p of layout.plots) {
    root.add(plotGroup(p, byPlot.get(p.index), p.index === ownPlotIndex));
  }
  return root;
}
