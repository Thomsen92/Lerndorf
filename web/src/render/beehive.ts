/**
 * The beehive on the market (teacher, 28.10.2026): a straw skep on a wooden stand with three round,
 * friendly bees buzzing around it. Own geometry only (no external model); a tap opens the Spelling Bee.
 */
import * as THREE from 'three';
import type { Layout } from '../world/layout';
import { HALLOWEEN_STAND_ANGLE, HALLOWEEN_STAND_RADIUS, PLAZA_RADIUS } from '../world/constants';
import { DECOR_STALL_OFFSETS, MARKET_SHOP_RADIUS, marketShopPlacement } from './marketShop';

export interface Beehive {
  root: THREE.Group;
  /** The skep, for the glowing outline of the cue. */
  skep: THREE.Object3D;
  update(dt: number, elapsed: number, reducedMotion: boolean): void;
  dispose(): void;
}

/** Things on the plaza the hive must keep clear of (centre and radius in metres). */
export function plazaObstacles(layout: Layout): Array<{ x: number; z: number; r: number }> {
  const at = (a: number, r: number) => ({
    x: layout.plaza.x + Math.cos(a) * r,
    z: layout.plaza.z + Math.sin(a) * r,
  });
  const board = layout.map.boardAngle;
  const shop = marketShopPlacement(layout);
  return [
    { ...at(board, 6), r: 1.8 },
    ...DECOR_STALL_OFFSETS.map((o) => ({ ...at(board + o, 5), r: 1.6 })),
    { ...at(board + HALLOWEEN_STAND_ANGLE, HALLOWEEN_STAND_RADIUS), r: 2.4 }, // Halloween stand
    { x: shop.x, z: shop.z, r: MARKET_SHOP_RADIUS },
    ...layout.map.benchAngles.map((a) => ({ ...at(a, PLAZA_RADIUS - 0.4), r: 1 })),
    { ...at(layout.map.benchAngles[0] + 0.7, PLAZA_RADIUS - 1.2), r: 0.6 },
    { ...at(layout.map.benchAngles[2] - 0.6, PLAZA_RADIUS - 1.2), r: 0.6 },
    { ...layout.plaza, r: 3 }, // fountain
  ];
}

/** The hive's own footprint (table and skep). */
export const BEEHIVE_RADIUS = 1;

/**
 * Where the hive stands: next to the quest board, on the side and at the distance with the most room
 * (benches sit at different angles on every map). Deterministic, facing the plaza centre.
 */
export function beehiveSpot(layout: Layout): { x: number; z: number; yaw: number } {
  const obstacles = plazaObstacles(layout);
  let best = { x: 0, z: 0, clearance: -Infinity };
  for (const side of [1, -1])
    for (let offset = 0.55; offset <= 1.0001; offset += 0.05)
      for (const r of [6.2, 6.6, 7.0]) {
        const a = layout.map.boardAngle + side * offset;
        const x = layout.plaza.x + Math.cos(a) * r;
        const z = layout.plaza.z + Math.sin(a) * r;
        const clearance = Math.min(...obstacles.map((o) => Math.hypot(o.x - x, o.z - z) - o.r));
        // ties: prefer the right side and close to the board
        if (clearance > best.clearance + 0.05) best = { x, z, clearance };
      }
  const { x, z } = best;
  return { x, z, yaw: Math.atan2(layout.plaza.x - x, layout.plaza.z - z) };
}

export function createBeehive(layout: Layout): Beehive {
  const root = new THREE.Group();
  root.name = 'beehive';
  root.userData.bakeStatic = false;
  const spot = beehiveSpot(layout);
  root.position.set(spot.x, layout.plazaHeight, spot.z);
  root.rotation.y = spot.yaw;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const geo = <T extends THREE.BufferGeometry>(g: T): T => (geometries.push(g), g);
  const mat = (
    color: string,
    extra: THREE.MeshStandardMaterialParameters = {},
  ): THREE.MeshStandardMaterial => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
    materials.push(m);
    return m;
  };
  const tap = (mesh: THREE.Mesh): THREE.Mesh => {
    mesh.userData.kind = 'spellingBee';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // wooden stand: a small table with four legs
  const wood = mat('#8a5a32');
  const top = tap(new THREE.Mesh(geo(new THREE.BoxGeometry(1.7, 0.12, 1.3)), wood));
  top.position.y = 0.72;
  root.add(top);
  const legGeo = geo(new THREE.BoxGeometry(0.12, 0.72, 0.12));
  for (const [x, z] of [
    [-0.7, -0.5],
    [0.7, -0.5],
    [-0.7, 0.5],
    [0.7, 0.5],
  ]) {
    const leg = tap(new THREE.Mesh(legGeo, wood));
    leg.position.set(x, 0.36, z);
    root.add(leg);
  }

  // straw skep: a lathe with ridges, the entrance hole at the front
  const profile: THREE.Vector2[] = [];
  const rings = 7;
  for (let i = 0; i <= rings * 4; i++) {
    const t = i / (rings * 4);
    const radius = 0.72 * Math.cos(t * Math.PI * 0.5) ** 0.75 + 0.04 * Math.cos(t * rings * Math.PI * 2);
    profile.push(new THREE.Vector2(Math.max(0.02, radius), t * 1.25));
  }
  const skep = tap(
    new THREE.Mesh(geo(new THREE.LatheGeometry(profile, 28)), mat('#e0a640', { flatShading: false })),
  );
  skep.name = 'beehiveSkep';
  skep.position.y = 0.78;
  root.add(skep);
  const hole = tap(new THREE.Mesh(geo(new THREE.CircleGeometry(0.16, 20)), mat('#2b1a0a', { roughness: 1 })));
  hole.position.set(0, 0.95, 0.66);
  hole.rotation.x = -0.12;
  root.add(hole);
  const honey = tap(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.16, 0.14, 0.24, 16)), mat('#ffb800')));
  honey.position.set(0.62, 0.9, 0.38);
  root.add(honey);
  const lid = tap(new THREE.Mesh(geo(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 16)), wood));
  lid.position.set(0.62, 1.04, 0.38);
  root.add(lid);

  // three round bees
  const yellow = mat('#ffc81e', { flatShading: false, roughness: 0.55 });
  const black = mat('#2b2118', { flatShading: false, roughness: 0.5 });
  const wingMat = new THREE.MeshStandardMaterial({
    color: '#eaf6ff',
    transparent: true,
    opacity: 0.8,
    roughness: 0.2,
  });
  materials.push(wingMat);
  const blush = mat('#ff9f8a', { flatShading: false });
  const bodyGeo = geo(new THREE.SphereGeometry(0.22, 20, 16));
  const stripeGeo = geo(new THREE.TorusGeometry(0.205, 0.035, 8, 24));
  const eyeGeo = geo(new THREE.CapsuleGeometry(0.022, 0.04, 4, 8));
  const wingGeo = geo(new THREE.SphereGeometry(0.11, 12, 8));
  const footGeo = geo(new THREE.SphereGeometry(0.045, 8, 6));
  const antennaGeo = geo(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6));
  const tipGeo = geo(new THREE.SphereGeometry(0.022, 8, 6));
  const cheekGeo = geo(new THREE.SphereGeometry(0.03, 8, 6));

  interface Bee {
    root: THREE.Group;
    wings: THREE.Mesh[];
    phase: number;
    radius: number;
    height: number;
    speed: number;
  }
  const bees: Bee[] = [];
  for (let i = 0; i < 3; i++) {
    const bee = new THREE.Group();
    const body = tap(new THREE.Mesh(bodyGeo, yellow));
    body.scale.set(1.05, 0.95, 1);
    bee.add(body);
    // stripes on the back half (the bee looks along +z)
    for (const z of [-0.06, -0.14]) {
      const stripe = tap(new THREE.Mesh(stripeGeo, black));
      stripe.position.z = z;
      stripe.scale.setScalar(Math.cos(Math.abs(z) * 3.2));
      bee.add(stripe);
    }
    for (const x of [-0.07, 0.07]) {
      const eye = tap(new THREE.Mesh(eyeGeo, black));
      eye.position.set(x, 0.03, 0.2);
      eye.rotation.x = 0.2;
      bee.add(eye);
      const cheek = tap(new THREE.Mesh(cheekGeo, blush));
      cheek.position.set(x * 1.7, -0.04, 0.17);
      cheek.scale.set(1, 0.6, 0.4);
      bee.add(cheek);
      const antenna = tap(new THREE.Mesh(antennaGeo, black));
      antenna.position.set(x * 0.8, 0.24, 0.08);
      antenna.rotation.set(0.4, 0, x > 0 ? -0.3 : 0.3);
      bee.add(antenna);
      const tip = tap(new THREE.Mesh(tipGeo, black));
      tip.position.set(x * 1.3, 0.3, 0.12);
      bee.add(tip);
    }
    const wings: THREE.Mesh[] = [];
    for (const x of [-1, 1]) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.userData.kind = 'spellingBee';
      wing.scale.set(0.45, 1, 0.75);
      wing.position.set(x * 0.1, 0.24, -0.04);
      wing.rotation.z = x * 0.5;
      bee.add(wing);
      wings.push(wing);
    }
    for (const x of [-0.08, 0.08]) {
      const foot = tap(new THREE.Mesh(footGeo, black));
      foot.position.set(x, -0.2, 0.04);
      bee.add(foot);
    }
    bee.scale.setScalar(1.6);
    root.add(bee);
    bees.push({
      root: bee,
      wings,
      phase: (i / 3) * Math.PI * 2,
      radius: 1.05 + i * 0.12,
      height: 1.9 + i * 0.25,
      speed: 0.55 + i * 0.12,
    });
  }

  function update(_dt: number, elapsed: number, reducedMotion: boolean): void {
    const t = reducedMotion ? 0 : elapsed;
    for (const bee of bees) {
      const a = bee.phase + t * bee.speed;
      bee.root.position.set(
        Math.cos(a) * bee.radius,
        bee.height + Math.sin(t * 2.2 + bee.phase) * 0.12,
        Math.sin(a) * bee.radius * 0.8 + 0.2,
      );
      // look along the flight path
      bee.root.rotation.y = reducedMotion ? bee.phase : -a;
      const flap = reducedMotion ? 0 : Math.sin(t * 38 + bee.phase) * 0.45;
      bee.wings[0].rotation.z = -0.5 - flap;
      bee.wings[1].rotation.z = 0.5 + flap;
    }
  }
  update(0, 0, true);

  return {
    root,
    skep,
    update,
    dispose() {
      root.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
