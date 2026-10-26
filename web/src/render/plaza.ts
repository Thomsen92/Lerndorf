import { tr } from '../i18n';
/**
 * Market plaza (LOOK §5, SPEC §10.7): paving with ring pattern, stone fountain, quest board with a
 * red roof and pinned notes, three market stalls with striped awnings, four benches, two tubs.
 * Placeholder models built from boxes, cylinders and tori with the colours of the prototype.
 */
import * as THREE from 'three';
import { instancedModel, kenneyModel, type KenneyModel } from './kenney';
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

const WATER = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: '#6fc3e6',
    roughness: 0.15,
    emissive: '#2a6f9a',
    emissiveIntensity: 0.45,
  });

/** The stone fountain of the prototype: placeholder until the Kenney fountain has loaded. */
function placeholderFountain(layout: Layout): THREE.Group {
  const g = new THREE.Group();
  const y = layout.plazaHeight;
  part(new THREE.CylinderGeometry(2.0, 2.2, 0.6, 16), mat(STONE), 0, y + 0.3, 0, g);
  part(new THREE.CylinderGeometry(0.35, 0.45, 1.4, 10), mat(STONE), 0, y + 1.2, 0, g);
  part(new THREE.CylinderGeometry(0.8, 0.6, 0.25, 14), mat(STONE), 0, y + 1.95, 0, g);
  // water: a flat disc in the basin, softly glowing (LOOK §5)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.1, 20), WATER());
  water.position.set(0, y + 0.62, 0);
  g.add(water);
  // replaced later: keep it out of the static merge (render/merge.ts)
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.kind = 'live';
  });
  return g;
}

/** Scale of the Kenney fountain (2 m wide, 0.48 m high) on the plaza. */
const FOUNTAIN_W = 2.3;
const FOUNTAIN_H = 2.0;

/**
 * Fountain: Kenney's round fountain with a raised inner bowl (Fantasy Town Kit, CC0), its water
 * glowing softly (LOOK §5). `onTop` receives the height of the inner water once it is known.
 */
function fountain(layout: Layout, onTop: (innerWater: number, outerWater: number) => void): THREE.Group {
  const g = new THREE.Group();
  const placeholder = placeholderFountain(layout);
  g.add(placeholder);
  void kenneyModel('town', 'fountain-round-detail').then((model) => {
    if (!model) return;
    const y = layout.plazaHeight;
    const stone = new THREE.Mesh(model.geometry, model.material);
    stone.scale.set(FOUNTAIN_W, FOUNTAIN_H, FOUNTAIN_W);
    stone.position.y = y;
    stone.castShadow = true;
    stone.receiveShadow = true;
    stone.userData.kind = 'live';
    g.remove(placeholder);
    g.add(stone);
    if (model.plain) {
      const water = new THREE.Mesh(model.plain, WATER());
      water.scale.copy(stone.scale);
      water.position.y = y + 0.01;
      g.add(water);
    }
    // inner bowl water at 0.38 m, outer basin at 0.14 m (model units)
    onTop(y + 0.38 * FOUNTAIN_H, y + 0.14 * FOUNTAIN_H);
  });
  return g;
}

function board(layout: Layout): THREE.Group {
  const g = new THREE.Group();
  const y = layout.plazaHeight;
  g.name = 'questBoard';
  g.userData.boardHeight = y + 1.9;
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

/** One removable draw call; the board keeps its existing click role after static baking. */
export function setBoardNote(plaza: THREE.Object3D, text: string | null): void {
  const board = plaza.getObjectByName('questBoard');
  if (!board) return;
  const old = board.getObjectByName('boardNote') as
    THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | undefined;
  if (old) {
    old.material.map?.dispose();
    old.material.dispose();
    old.geometry.dispose();
    old.removeFromParent();
  }
  if (!text) return;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fff3cf';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#654b31';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(tr('Nachricht von deiner Lehrkraft'), 48, 70);
  ctx.font = '42px sans-serif';
  let line = '',
    y = 145;
  for (const word of text.split(/\s+/)) {
    for (const chunk of word.match(/.{1,24}/gu) ?? []) {
      if (ctx.measureText(line + chunk).width > 920) {
        ctx.fillText(line.trim(), 48, y);
        line = '';
        y += 62;
      }
      line += chunk + ' ';
    }
  }
  ctx.fillText(line.trim(), 48, y);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({ map, toneMapped: false }),
  );
  mesh.name = 'boardNote';
  mesh.userData.kind = 'board';
  mesh.position.set(0, Number(board.userData.boardHeight), 0.19);
  board.add(mesh);
}

/** A market stall with counter, posts and a striped awning. Front faces the plaza. */
/** What a stall sells: Kenney Food Kit model, its size and where the pieces lie on the counter. */
type Goods = 'apples' | 'pumpkins' | 'bread';
const GOODS: Record<Goods, { name: string; scale: number; spots: Array<[number, number]> }> = {
  apples: {
    name: 'apple',
    scale: 1.7,
    spots: [-0.95, -0.65, -0.35, 0.35, 0.65, 0.95].flatMap((x) => [
      [x, 0.1],
      [x + 0.15, 0.42],
    ]) as Array<[number, number]>,
  },
  pumpkins: {
    name: 'pumpkin',
    scale: 1.5,
    spots: [
      [-0.85, 0.15],
      [-0.4, 0.4],
      [0.45, 0.15],
      [0.9, 0.4],
    ],
  },
  bread: {
    name: 'loaf-round',
    scale: 0.7,
    spots: [
      [-0.8, 0.2],
      [-0.4, 0.45],
      [0.4, 0.2],
      [0.85, 0.45],
    ],
  },
};
/** Kenney stall (Fantasy Town Kit, 1 m) scaled to the size of the prototype stall. */
const STALL_SCALE = 2.3;
const COUNTER = 0.35 * STALL_SCALE;

/** The prototype stall: placeholder until the Kenney models have loaded. */
function placeholderStall(stripe: string, colours: string[]): THREE.Group {
  const g = new THREE.Group();

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
  colours.forEach((col, k) => {
    part(new THREE.SphereGeometry(0.17, 6, 5), mat(col), -0.8 + k * 0.32, 1.0, 0.1 + (k % 2) * 0.2, g);
  });
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.userData.kind = 'live'; // replaced later: not merged
  });
  return g;
}

/**
 * Market stall facing the plaza centre: Kenney stall with its awning in the stall colour
 * (the green roof is recoloured like the tree crowns) and Kenney food on the counter.
 */
function stall(
  layout: Layout,
  angle: number,
  radius: number,
  stripe: string,
  colours: string[],
  goods: Goods,
): THREE.Group {
  const x = layout.plaza.x + Math.cos(angle) * radius;
  const z = layout.plaza.z + Math.sin(angle) * radius;
  const g = new THREE.Group();
  g.position.set(x, layout.plazaHeight, z);
  g.rotation.y = Math.atan2(layout.plaza.x - x, layout.plaza.z - z);
  const placeholder = placeholderStall(stripe, colours);
  g.add(placeholder);
  const what = GOODS[goods];
  void Promise.all([kenneyModel('town', 'stall-green'), kenneyModel('food', what.name)]).then(
    ([stallModel, food]) => {
      if (!stallModel || !food) return;
      // the long side of the counter faces the plaza (the model's long side runs along z)
      const m = new THREE.Matrix4()
        .makeRotationY(Math.PI / 2)
        .scale(new THREE.Vector3(STALL_SCALE, STALL_SCALE, STALL_SCALE));
      const body = instancedModel(stallModel, [m], [new THREE.Color(stripe)]);
      const pieces = what.spots.map(([px, pz], k) =>
        new THREE.Matrix4()
          .makeRotationY(k * 1.7)
          .scale(new THREE.Vector3(what.scale, what.scale, what.scale))
          .setPosition(px, COUNTER, pz),
      );
      const wares = instancedModel(food, pieces);
      g.remove(placeholder);
      g.add(body, wares);
    },
  );
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

const TUB_FLOWERS = ['flower_redA', 'flower_purpleB', 'flower_yellowA'];

function tub(layout: Layout, angle: number): THREE.Group {
  const r = PLAZA_RADIUS - 1.2;
  const x = layout.plaza.x + Math.cos(angle) * r;
  const z = layout.plaza.z + Math.sin(angle) * r;
  const g = new THREE.Group();
  g.position.set(x, layout.plazaHeight, z);
  part(new THREE.CylinderGeometry(0.5, 0.42, 0.7, 10), mat(WOOD), 0, 0.35, 0, g);
  part(new THREE.SphereGeometry(0.45, 8, 6), mat('#5d8f3e'), 0, 0.85, 0, g);
  // three Nature Kit flowers on the shrub; until they have loaded the pink blossom stands in
  const blossom = part(new THREE.SphereGeometry(0.13, 5, 4), mat('#d98cc5'), 0.25, 1.0, 0.1, g);
  blossom.userData.kind = 'live';
  void Promise.all(TUB_FLOWERS.map((n) => kenneyModel('nature', n))).then((models) => {
    if (models.some((m) => !m)) return;
    g.remove(blossom);
    models.forEach((m, k) => {
      const a = k * 2.1 + angle;
      const at = new THREE.Matrix4()
        .makeRotationY(a)
        .scale(new THREE.Vector3(2.4, 2.4, 2.4))
        .setPosition(Math.cos(a) * 0.22, 1.12, Math.sin(a) * 0.22);
      g.add(instancedModel(m as KenneyModel, [at]));
    });
  });
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
  disc.position.set(layout.plaza.x, y - 0.14, layout.plaza.z);
  disc.receiveShadow = true;
  root.add(disc);
  for (let r = 2.4; r < PLAZA_RADIUS - 0.5; r += 1.8) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 4, 56), mat('#9d8d75'));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(layout.plaza.x, y + 0.09, layout.plaza.z);
    root.add(ring);
  }

  // water jet and droplets (animated each frame, see userData.animate); the heights follow the
  // fountain model once it has loaded
  let inner = layout.plazaHeight + 2.0;
  let outer = layout.plazaHeight + 0.62;
  const f = fountain(layout, (i, o) => {
    inner = i;
    outer = o;
  });
  f.position.set(layout.plaza.x, 0, layout.plaza.z);
  root.add(f);
  const jetMat = new THREE.MeshStandardMaterial({
    color: '#8fd3f0',
    emissive: '#2a6f9a',
    emissiveIntensity: 0.6,
    roughness: 0.1,
  });
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 1, 6), jetMat);
  jet.position.set(layout.plaza.x, inner + 0.5, layout.plaza.z);
  root.add(jet);
  const DROPS = 18;
  const dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 5, 4), jetMat, DROPS);
  dropMesh.frustumCulled = false;
  root.add(dropMesh);
  const m = new THREE.Matrix4();
  root.userData.animate = (t: number): void => {
    // the jet pulses in height; the droplets rise from its top, arc outwards and fall into the
    // outer basin
    const pulse = 0.85 + 0.15 * Math.sin(t * 4);
    jet.scale.set(1, 0.9 * pulse, 1);
    jet.position.y = inner + 0.45 * pulse;
    const top = inner + 0.9 * pulse;
    for (let i = 0; i < DROPS; i++) {
      const phase = (t * 0.7 + i / DROPS) % 1;
      const a = (i / DROPS) * Math.PI * 2;
      const r = phase * 1.5;
      const h = top + Math.sin(phase * Math.PI) * 0.5 - phase * (top - outer);
      m.makeTranslation(layout.plaza.x + Math.cos(a) * r, h, layout.plaza.z + Math.sin(a) * r);
      dropMesh.setMatrixAt(i, m);
    }
    dropMesh.instanceMatrix.needsUpdate = true;
  };

  const b = board(layout);
  b.position.set(layout.board.x, 0, layout.board.z);
  b.rotation.y = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  root.add(b);

  // stalls and benches away from the board (angles relative to the board)
  const stalls: Array<[number, string, string[], Goods]> = [
    [layout.map.boardAngle + 1.4, '#5a62b8', ['#eb5757', '#f2c94c', '#eb5757', '#6fcf97'], 'apples'],
    [layout.map.boardAngle + 2.6, '#3f8f88', ['#bb6bd9', '#f2a7d0', '#56ccf2'], 'bread'],
    [layout.map.boardAngle + 3.8, '#d08a3c', ['#f2994a', '#6fcf97', '#f2994a'], 'pumpkins'],
  ];
  for (const [angle, stripe, colours, goods] of stalls) {
    root.add(stall(layout, angle, 5.0, stripe, colours, goods));
  }
  for (const angle of layout.map.benchAngles) root.add(bench(layout, angle));
  root.add(tub(layout, layout.map.benchAngles[0] + 0.7));
  root.add(tub(layout, layout.map.benchAngles[2] - 0.6));
  return root;
}
