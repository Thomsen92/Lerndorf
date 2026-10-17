/**
 * Decorations of the whole class on their plots (SPEC §10, PLAN 4.5). One InstancedMesh per item
 * type, so a village of 32 plots with about ten items each stays within the draw-call budget.
 * Placeholder boxes until the real models exist.
 */
import * as THREE from 'three';
import { cellCentre, type GridSize } from '../build/grid';
import type { Layout, Plot } from '../world/layout';
import type { ClassPlacement } from '../api/build';

export interface Pose {
  x: number;
  y: number;
  z: number;
  rotY: number;
  w: number;
  d: number;
}

/**
 * World pose of a decoration with its first cell at (cx, cz) on a plot. The footprint covers
 * w x d cells, so its centre is shifted by half the extra cells.
 */
export function decorationPose(
  plot: Plot,
  cx: number,
  cz: number,
  w: number,
  d: number,
  grid: GridSize,
): Pose {
  const c = cellCentre(cx, cz, grid);
  const lx = c.lx + (w - 1) / 2;
  const lz = c.lz + (d - 1) / 2;
  const cos = Math.cos(plot.face);
  const sin = Math.sin(plot.face);
  return {
    x: plot.x + lx * cos + lz * sin,
    y: plot.h + 0.35,
    z: plot.z - lx * sin + lz * cos,
    rotY: plot.face,
    w,
    d,
  };
}

export function colourOf(id: string): THREE.Color {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.55, 0.6);
}

/** Builds the decorations of all classmates. `plotOf` maps a player id to the plot index. */
export function buildPlacements(
  layout: Layout,
  placements: ClassPlacement[],
  plotOf: Map<string, number>,
  grid: GridSize,
): THREE.Group {
  const root = new THREE.Group();
  const byItem = new Map<string, Array<Pose>>();

  for (const p of placements) {
    const index = plotOf.get(p.playerId);
    const plot = index === undefined ? undefined : layout.plots[index];
    if (!plot) continue;
    const list = byItem.get(p.itemId) ?? [];
    list.push(decorationPose(plot, p.x, p.z, p.w, p.d, grid));
    byItem.set(p.itemId, list);
  }

  const unit = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  for (const [itemId, poses] of byItem) {
    const mesh = new THREE.InstancedMesh(
      unit,
      new THREE.MeshStandardMaterial({ color: colourOf(itemId), roughness: 0.8 }),
      poses.length,
    );
    poses.forEach((pose, i) => {
      quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.rotY);
      matrix.compose(
        new THREE.Vector3(pose.x, pose.y, pose.z),
        quat,
        new THREE.Vector3(pose.w * 0.9, 0.7, pose.d * 0.9),
      );
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    // the bounding sphere of the unit box does not cover the instances: skip culling
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  return root;
}
