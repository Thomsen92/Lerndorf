/**
 * House parts (LOOK §6): gable roof with overhang and chimney, post-and-rail fence with a 1.6 m
 * gate, and the garden path from the gate to the lane. Placeholder geometry; merged per plot so
 * that a village of 34 plots needs few draw calls.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const FENCE_HEIGHT = 0.7;
const POST_STEP = 1.2;
const GATE_HALF = 0.8; // 1.6 m opening in the middle of the front

/** Gable roof: a triangle prism along z, with 0.35 m overhang on both sides. */
export function gableRoof(bw: number, bd: number, rise: number, colour: string): THREE.Mesh {
  const half = bw / 2 + 0.35;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(0, rise);
  shape.lineTo(half, 0);
  shape.lineTo(-half, 0);
  const depth = bd + 0.6;
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8, flatShading: true }),
  );
  mesh.castShadow = true;
  return mesh;
}

/** Chimney on one roof slope (LOOK §6: #9a5a48, 0,42 x 1,0). */
export function chimney(bw: number, bh: number, rise: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 1.0, 0.42),
    new THREE.MeshStandardMaterial({ color: '#9a5a48', roughness: 0.9 }),
  );
  mesh.position.set(bw * 0.25, bh + rise * 0.5 + 0.2, 0);
  mesh.castShadow = true;
  return mesh;
}

/** A box between two ground points, centred on the segment, lifted by `y` (merged later). */
function beam(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  width: number,
  height: number,
  y: number,
): THREE.BufferGeometry {
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz);
  const geo = new THREE.BoxGeometry(width, height, len);
  geo.rotateY(Math.atan2(dx, dz));
  geo.translate((ax + bx) / 2, y, (az + bz) / 2);
  return geo;
}

/**
 * Fence around a plot in plot-local coordinates: back and sides closed, the front open where
 * `openings` say (local x ranges: gate, driveway). Posts every 1.2 m and one rail at 0.5 m
 * (LOOK §6: never a solid wall).
 */
export function fenceGeometry(
  w: number,
  d: number,
  openings: Array<[number, number]> = [[-GATE_HALF, GATE_HALF]],
): THREE.BufferGeometry {
  const runs: Array<[number, number, number, number]> = [
    [-w / 2, -d / 2, w / 2, -d / 2], // back
    [-w / 2, -d / 2, -w / 2, d / 2], // left side
    [w / 2, -d / 2, w / 2, d / 2], // right side
  ];
  // front: the pieces between the openings
  const cuts = [...openings].sort((a, b) => a[0] - b[0]);
  let x = -w / 2;
  for (const [a, b] of cuts) {
    if (a - x > 0.3) runs.push([x, d / 2, a, d / 2]);
    x = Math.max(x, b);
  }
  if (w / 2 - x > 0.3) runs.push([x, d / 2, w / 2, d / 2]);
  const parts: THREE.BufferGeometry[] = [];
  for (const [ax, az, bx, bz] of runs) {
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.round(len / POST_STEP));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      parts.push(beam(px, pz, px, pz, 0.13, FENCE_HEIGHT, FENCE_HEIGHT / 2));
    }
    parts.push(beam(ax, az, bx, bz, 0.07, 0.08, 0.5));
  }
  return mergeGeometries(parts);
}

/**
 * Garden path as a flat ribbon from `from` to `to` (world coordinates), following the ground.
 * Returned as one geometry so that all garden paths of a village merge into one mesh.
 */
export function gardenPathGeometry(
  from: { x: number; z: number },
  to: { x: number; z: number },
  width: number,
  heightAt: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const steps = Math.max(2, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / 0.8));
  const verts: number[] = [];
  const idx: number[] = [];
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const l = Math.hypot(dx, dz) || 1;
  const nx = -dz / l;
  const nz = dx / l;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = from.x + dx * t;
    const cz = from.z + dz * t;
    const h = heightAt(cx, cz) + 0.05;
    verts.push(
      cx + (nx * width) / 2,
      h,
      cz + (nz * width) / 2,
      cx - (nx * width) / 2,
      h,
      cz - (nz * width) / 2,
    );
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
