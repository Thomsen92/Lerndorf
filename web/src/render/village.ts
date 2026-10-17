/**
 * Builds the 3D village from a Layout: terrain, river, lanes, bridges, plaza and plots.
 * Placeholder models only (boxes and cones). The comic models come in Stufe 2.
 */
import * as THREE from 'three';
import { MAP_SIZE } from '../world/constants';
import type { Layout, Plot } from '../world/layout';
import type { Point2 } from '../world/geometry';
import { laneDistance } from '../world/scatter';
import { buildNature, buildVegetation } from './nature';
import { buildPlaza } from './plaza';
import { buildBridge } from './bridges';
import { bakeStatic } from './merge';
import { buildLandmarks } from './landmarks';
import { dirtTexture, grassTexture, skyTexture, waterTexture } from './textures';
import { chimney, fenceGeometry, gableRoof, gardenPathGeometry } from './house';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
  width: number | ((i: number) => number),
  heightAt: (x: number, z: number) => number,
  mat: THREE.Material,
): THREE.Mesh {
  const verts: number[] = [];
  const idx: number[] = [];
  points.forEach((p, i) => {
    const w = typeof width === 'number' ? width : width(i);
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l;
    const nz = tx / l;
    const hL = heightAt(p.x + (nx * w) / 2, p.z + (nz * w) / 2) + 0.06;
    const hR = heightAt(p.x - (nx * w) / 2, p.z - (nz * w) / 2) + 0.06;
    verts.push(p.x + (nx * w) / 2, hL, p.z + (nz * w) / 2, p.x - (nx * w) / 2, hR, p.z - (nz * w) / 2);
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
  const seg = 140; // about 1 vertex per metre in the valley (SPEC §10.2)
  const geo = new THREE.PlaneGeometry(MAP_SIZE + 30, MAP_SIZE + 30, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const low = new THREE.Color('#4e7a45');
  const high = new THREE.Color('#7aa35c');
  const bank = new THREE.Color('#a99b72');
  // darker, earthier path colour; paths are narrower than before (cozy citybuilder look)
  const pathCol = new THREE.Color('#a8926c');
  const trampled = new THREE.Color('#8a9a5c');
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
    // paths painted into the ground: soft edge, no floating strip (review befund 4)
    const onPath = Math.min(1, Math.max(0, (1.7 - laneDistance(layout, x, z)) / 0.8));
    tmp.lerp(pathCol, onPath);
    // trampled grass at the very edge of the path, and a little brightness noise so no area is one colour
    tmp.lerp(trampled, (1 - Math.abs(2 * onPath - 1)) * 0.35 * (onPath > 0 ? 1 : 0));
    const noise = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    tmp.multiplyScalar(1 + (noise - Math.floor(noise) - 0.5) * 0.12);
    col[i * 3] = tmp.r;
    col[i * 3 + 1] = tmp.g;
    col[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // grass: grain texture times the vertex colours; smooth shading, so the land is not faceted
  const grass = grassTexture();
  grass.repeat.set((MAP_SIZE + 30) / 9, (MAP_SIZE + 30) / 9);
  const ground = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: grass,
    roughness: 0.88,
  });
  const mesh = new THREE.Mesh(geo, ground);
  mesh.receiveShadow = true;
  return mesh;
}

function riverMesh(river: Point2[]): THREE.Mesh {
  // width changes between 5.6 and 8.8 m along the course (LOOK §4)
  const wave = waterTexture();
  const mesh = ribbon(
    river,
    (i) => 7.2 + 1.6 * Math.sin(i * 0.09),
    () => -0.55,
    // water reflects the evening sky (cheap environment map, no second render pass)
    new THREE.MeshStandardMaterial({
      color: '#5fb3d9',
      map: wave,
      roughness: 0.12,
      metalness: 0.45,
      envMap: skyTexture(),
      envMapIntensity: 1.1,
      side: THREE.DoubleSide,
    }),
  );
  mesh.userData = { waterMap: wave };
  return mesh;
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

/**
 * A free plot (SPEC §10.5): lawn with four wooden stakes and a small sign "frei". No house and no
 * fence, so an empty plot does not look like a ghost house.
 */
function freeLot(p: Plot): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, p.h, p.z);
  g.rotation.y = p.face;
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.1, p.d), MAT.grass);
  lawn.position.y = 0.02;
  lawn.receiveShadow = true;
  g.add(lawn);
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 6), MAT.wood);
    stake.position.set((sx * p.w) / 2 - sx * 0.2, 0.3, (sz * p.d) / 2 - sz * 0.2);
    stake.castShadow = true;
    g.add(stake);
  }
  const sign = nameTag('frei', false);
  sign.scale.set(1.4, 0.36, 1);
  sign.position.set(0, 1.4, -p.d / 2 + 0.6);
  g.add(sign);
  return g;
}

function plotGroup(p: Plot, member: VillageMember | undefined, own: boolean): THREE.Group {
  if (!member) return freeLot(p);
  const g = new THREE.Group();
  g.position.set(p.x, p.h, p.z);
  g.rotation.y = p.face;

  if (member) {
    const tag = nameTag(member.nickname, own);
    tag.position.set(0, 4.6, -p.d / 2 + 1.5);
    tag.userData = { house: true, own };
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
  // door towards the gate, two glowing windows on the front (LOOK §6: #ffad42, MeshBasic)
  const front = bd / 2 + 0.02;
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.2, 0.08),
    new THREE.MeshStandardMaterial({ color: '#5a3a26', roughness: 0.8 }),
  );
  door.position.set(0, 0.6, front);
  house.add(door);
  for (const wx of [-bw * 0.3, bw * 0.3]) {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.08),
      new THREE.MeshBasicMaterial({ color: '#ffad42' }),
    );
    win.position.set(wx, bh * 0.55, front);
    house.add(win);
  }
  const roof = gableRoof(bw, bd, 1.3 + ((p.index * 13) % 5) * 0.1, ROOF_COLORS[p.index % ROOF_COLORS.length]);
  roof.position.y = bh;
  house.add(roof);
  house.add(chimney(bw, bh, 1.3));
  g.add(house);

  // post-and-rail fence with a 1.6 m gate in front, merged into one mesh (LOOK §6)
  const fence = new THREE.Mesh(fenceGeometry(p.w, p.d), MAT.wood);
  fence.castShadow = true;
  g.add(fence);

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

  // lanes: a thin dirt strip on the ground (1.6 m), textured, lifted 5 cm; the colour in the
  // terrain (see terrainMesh) underneath matches, so the edge is soft
  const dirt = new THREE.MeshStandardMaterial({
    map: dirtTexture(),
    color: '#b8a07a',
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  for (const pts of layout.map.lanes) {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
      false,
      'centripetal',
    );
    const samples = curve
      .getSpacedPoints(Math.ceil(curve.getLength() / 0.7))
      .map((v) => ({ x: v.x, z: v.z }));
    root.add(ribbon(samples, 1.6, (x, z) => layout.terrain.groundHeight(x, z) + 0.05, dirt));
  }

  // plaza: paving, fountain, quest board, stalls, benches (render/plaza.ts)
  const plaza = buildPlaza(layout);
  root.add(plaza);

  for (const b of layout.bridges) root.add(buildBridge(b, MAT.wood));

  for (const p of layout.plots) {
    root.add(plotGroup(p, byPlot.get(p.index), p.index === ownPlotIndex));
  }
  // garden paths from each gate to its lane: one merged mesh for the whole village
  const gardens = layout.plots.map((p) =>
    gardenPathGeometry(p.gate, p.link, 1.0, (x, z) => layout.terrain.groundHeight(x, z)),
  );
  const gardenMesh = new THREE.Mesh(mergeGeometries(gardens), dirt);
  gardenMesh.receiveShadow = true;
  root.add(gardenMesh);
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
  root.userData.animate = (t: number): void => {
    const wave = river.userData.waterMap as THREE.Texture;
    wave.offset.set(t * 0.012, t * 0.005);
    (plaza.userData.animate as ((t: number) => void) | undefined)?.(t);
  };
  return bakeStatic(root);
}
