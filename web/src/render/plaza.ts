/**
 * Market plaza (LOOK §5, SPEC §10.7): paving with ring pattern, stone fountain, quest board with a
 * red roof and pinned notes, three market stalls with striped awnings, four benches, two tubs.
 * Placeholder models built from boxes, cylinders and tori with the colours of the prototype.
 */
import * as THREE from 'three';
import type { Layout } from '../world/layout';
import { PLAZA_RADIUS } from '../world/constants';
import { pavingTexture } from './textures';

const STONE = '#a7a3a0';
const WOOD = '#8a5a36';
const POST = '#7a4f2e';
const DARK = '#2b2b33';

function mat(
  color: string,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra });
}

/** Mesh helper: a part at a local position inside a group. */
function part(
  geo: THREE.BufferGeometry,
  m: THREE.Material,
  x: number,
  y: number,
  z: number,
  g: THREE.Group,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

function fountain(layout: Layout): THREE.Group {
  const g = new THREE.Group();
  const y = layout.plazaHeight;
  part(new THREE.CylinderGeometry(2.0, 2.2, 0.6, 16), mat(STONE), 0, y + 0.3, 0, g);
  part(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 10), mat(STONE), 0, y + 1.2, 0, g);
  part(new THREE.CylinderGeometry(0.8, 0.6, 0.25, 14), mat(STONE), 0, y + 1.95, 0, g);
  // water: a flat disc in the basin, softly glowing (LOOK §5)
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 0.1, 20),
    new THREE.MeshStandardMaterial({
      color: '#6fc3e6',
      roughness: 0.15,
      emissive: '#2a6f9a',
      emissiveIntensity: 0.45,
    }),
  );
  water.position.set(0, y + 0.62, 0);
  g.add(water);
  return g;
}

function board(layout: Layout): THREE.Group {
  const g = new THREE.Group();
  const y = layout.plazaHeight;
  part(new THREE.BoxGeometry(0.2, 3.0, 0.2), mat(POST), -1.6, y + 1.5, 0, g);
  part(new THREE.BoxGeometry(0.2, 3.0, 0.2), mat(POST), 1.6, y + 1.5, 0, g);
  // the board itself: the click target of the task board (villageView checks userData.kind)
  const plank = part(new THREE.BoxGeometry(3.4, 2.0, 0.15), mat('#a0703f'), 0, y + 1.9, 0, g);
  plank.userData = { kind: 'board' };
  // red gable roof: a triangle prism, 4.0 wide and 0.8 high (LOOK §5)
  const shape = new THREE.Shape();
  shape.moveTo(-2.0, 0);
  shape.lineTo(0, 0.8);
  shape.lineTo(2.0, 0);
  shape.lineTo(-2.0, 0);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.4);
  part(roofGeo, mat('#c4574b'), 0, y + 2.9, 0, g);
  // six pastel notes with a red pin
  const pastel = ['#fff8e1', '#fff3c4', '#e8f4ff', '#ffe8ec', '#eaffea', '#fff8e1'];
  const notes: Array<[number, number]> = [
    [-1.1, 2.4],
    [-0.2, 2.5],
    [0.8, 2.35],
    [-0.8, 1.5],
    [0.3, 1.45],
    [1.15, 1.55],
  ];
  notes.forEach(([nx, ny], i) => {
    const note = part(new THREE.BoxGeometry(0.62, 0.72, 0.03), mat(pastel[i]), nx, y + ny, 0.1, g);
    note.rotation.z = (((i * 37) % 9) - 4) * 0.03;
    part(new THREE.BoxGeometry(0.08, 0.08, 0.04), mat('#d64545'), nx, y + ny + 0.3, 0.12, g);
  });
  return g;
}

/** A market stall with counter, posts and a striped awning. Front faces the plaza. */
function stall(layout: Layout, angle: number, radius: number, stripe: string, goods: string[]): THREE.Group {
  const x = layout.plaza.x + Math.cos(angle) * radius;
  const z = layout.plaza.z + Math.sin(angle) * radius;
  const g = new THREE.Group();
  g.position.set(x, layout.plazaHeight, z);
  g.rotation.y = Math.atan2(layout.plaza.x - x, layout.plaza.z - z);
  part(new THREE.BoxGeometry(2.4, 0.9, 1.1), mat(WOOD), 0, 0.45, 0, g);
  for (const [px, pz] of [
    [-1.1, -0.5],
    [1.1, -0.5],
    [-1.1, 0.5],
    [1.1, 0.5],
  ]) {
    part(new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6), mat(WOOD), px, 1.1, pz, g);
  }
  // six slanted strips: white and the stall colour alternate (LOOK §5)
  for (let k = 0; k < 6; k++) {
    const strip = part(
      new THREE.BoxGeometry(0.42, 0.12, 1.5),
      mat(k % 2 === 0 ? '#f4f1ea' : stripe),
      -1.05 + k * 0.42,
      2.3,
      0.15,
      g,
    );
    strip.rotation.x = 0.18;
  }
  goods.forEach((col, k) => {
    part(new THREE.SphereGeometry(0.17, 6, 5), mat(col), -0.8 + k * 0.32, 1.0, 0.1 + (k % 2) * 0.2, g);
  });
  return g;
}

function bench(layout: Layout, angle: number): THREE.Group {
  const r = PLAZA_RADIUS - 0.4;
  const x = layout.plaza.x + Math.cos(angle) * r;
  const z = layout.plaza.z + Math.sin(angle) * r;
  const g = new THREE.Group();
  g.position.set(x, layout.plazaHeight, z);
  // face the centre of the plaza
  g.rotation.y = Math.atan2(layout.plaza.x - x, layout.plaza.z - z);
  part(new THREE.BoxGeometry(1.6, 0.12, 0.5), mat(WOOD), 0, 0.5, 0, g);
  part(new THREE.BoxGeometry(1.6, 0.45, 0.1), mat(WOOD), 0, 0.8, -0.22, g);
  part(new THREE.BoxGeometry(0.1, 0.5, 0.45), mat(DARK), -0.7, 0.25, 0, g);
  part(new THREE.BoxGeometry(0.1, 0.5, 0.45), mat(DARK), 0.7, 0.25, 0, g);
  return g;
}

function tub(layout: Layout, angle: number): THREE.Group {
  const r = PLAZA_RADIUS - 1.2;
  const x = layout.plaza.x + Math.cos(angle) * r;
  const z = layout.plaza.z + Math.sin(angle) * r;
  const g = new THREE.Group();
  g.position.set(x, layout.plazaHeight, z);
  part(new THREE.CylinderGeometry(0.5, 0.42, 0.7, 10), mat(WOOD), 0, 0.35, 0, g);
  part(new THREE.SphereGeometry(0.45, 8, 6), mat('#5d8f3e'), 0, 0.85, 0, g);
  part(new THREE.SphereGeometry(0.13, 5, 4), mat('#d98cc5'), 0.25, 1.0, 0.1, g);
  return g;
}

/** The whole plaza as one group. The caller adds it to the village. */
export function buildPlaza(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  const y = layout.plazaHeight;

  // paving disc with a soft edge, and thin rings every 1.8 m from r = 2.4 (LOOK §5)
  const paving = pavingTexture();
  paving.repeat.set(5, 5);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS + 0.4, 0.45, 56),
    new THREE.MeshStandardMaterial({ map: paving, color: '#d9cbb0', roughness: 0.95 }),
  );
  disc.position.set(layout.plaza.x, y - 0.2, layout.plaza.z);
  disc.receiveShadow = true;
  root.add(disc);
  for (let r = 2.4; r < PLAZA_RADIUS - 0.5; r += 1.8) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 4, 56), mat('#9d8d75'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(layout.plaza.x, y + 0.03, layout.plaza.z);
    root.add(ring);
  }

  const f = fountain(layout);
  f.position.set(layout.plaza.x, 0, layout.plaza.z);
  root.add(f);

  const b = board(layout);
  b.position.set(layout.board.x, 0, layout.board.z);
  b.rotation.y = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  root.add(b);

  // stalls and benches away from the board (angles relative to the board)
  const stalls: Array<[number, string, string[]]> = [
    [layout.map.boardAngle + 1.4, '#5a62b8', ['#eb5757', '#f2c94c', '#eb5757', '#6fcf97']],
    [layout.map.boardAngle + 2.6, '#3f8f88', ['#bb6bd9', '#f2a7d0', '#56ccf2']],
    [layout.map.boardAngle + 3.8, '#d08a3c', ['#f2994a', '#6fcf97', '#f2994a']],
  ];
  for (const [angle, stripe, goods] of stalls) root.add(stall(layout, angle, 5.0, stripe, goods));
  for (const angle of layout.map.benchAngles) root.add(bench(layout, angle));
  root.add(tub(layout, layout.map.benchAngles[0] + 0.7));
  root.add(tub(layout, layout.map.benchAngles[2] - 0.6));
  return root;
}
