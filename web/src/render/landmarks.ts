/**
 * Landmarks of the map (SPEC §10.6): viewpoint, footbridge, windmill, orchard, forest hut.
 * Placeholder shapes in the colours of LOOK; they stand at the positions of the map template.
 */
import * as THREE from 'three';
import type { Layout } from '../world/layout';
import type { Landmark } from '../world/maps';
import { chimney, gableRoof } from './house';

const WOOD = '#8a5a36';
const STONE = '#a7a3a0';
const WHITE = '#efe6d6';
const LEAF = '#4d9a5d';
const TRUNK = '#6b4a2f';
const ROOF = '#c4574b';

function mesh(
  geo: THREE.BufferGeometry,
  color: string,
  x: number,
  y: number,
  z: number,
  g: THREE.Group,
  rotY = 0,
): void {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true }),
  );
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
}

function viewpoint(g: THREE.Group): void {
  mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), WOOD, 0, 0.5, 0, g);
  mesh(new THREE.BoxGeometry(1.8, 0.45, 0.1), WOOD, 0, 0.8, -0.22, g);
  mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.3, 7), STONE, 0, 0.15, 0, g);
}

function footbridge(g: THREE.Group): void {
  mesh(new THREE.BoxGeometry(2.2, 0.15, 2.6), WOOD, 0, 0.35, 0, g);
  mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), WOOD, -1.0, 0.7, 1.2, g);
  mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), WOOD, 1.0, 0.7, 1.2, g);
  mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), WOOD, -1.0, 0.7, -1.2, g);
  mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), WOOD, 1.0, 0.7, -1.2, g);
}

function windmill(g: THREE.Group): void {
  mesh(new THREE.CylinderGeometry(0.9, 1.2, 4.0, 8), WHITE, 0, 2.0, 0, g);
  mesh(new THREE.ConeGeometry(1.2, 1.4, 8), ROOF, 0, 4.7, 0, g);
  for (let k = 0; k < 4; k++) {
    mesh(new THREE.BoxGeometry(0.2, 2.6, 0.12), WOOD, 0, 3.0, 0.7, g, (k * Math.PI) / 2);
  }
}

function orchard(g: THREE.Group): void {
  for (const [x, z] of [
    [-1.6, 0.8],
    [1.4, -0.4],
    [0.2, 1.8],
  ]) {
    mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 6), TRUNK, x, 0.6, z, g);
    mesh(new THREE.IcosahedronGeometry(0.9, 0), LEAF, x, 1.9, z, g);
  }
}

function hut(g: THREE.Group): void {
  mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), WHITE, 0, 0.8, 0, g);
  const roof = gableRoof(2.4, 2.4, 1.2, ROOF);
  roof.position.y = 1.6;
  g.add(roof);
  mesh(new THREE.BoxGeometry(0.6, 1.0, 0.08), '#5a3a26', 0, 0.5, 1.22, g);
  g.add(chimney(2.4, 1.6, 1.2));
}

const BUILDERS: Record<Landmark['kind'], (g: THREE.Group) => void> = {
  aussicht: viewpoint,
  steg: footbridge,
  muehle: windmill,
  obstwiese: orchard,
  waldhuette: hut,
};

/** All landmarks of the layout's map, as one group. */
export function buildLandmarks(layout: Layout): THREE.Group {
  const root = new THREE.Group();
  for (const lm of layout.map.landmarks) {
    const g = new THREE.Group();
    g.position.set(lm.x, layout.terrain.groundHeight(lm.x, lm.z), lm.z);
    BUILDERS[lm.kind](g);
    root.add(g);
  }
  return root;
}
