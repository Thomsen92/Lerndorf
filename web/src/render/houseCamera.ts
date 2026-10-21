/** Fixed camera view of the own house and the flight to it (house menu). */
import * as THREE from 'three';
import type { Plot } from '../world/layout';

export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export const FLIGHT_SECONDS = 0.8;

const DISTANCE = 26;
const ELEVATION = (30 * Math.PI) / 180;

/** Fixed view of the own house: target = plot centre at house height, camera in front of the house (+Z of the plot, rotated by plot.face), 30° above, distance 26. */
export function houseView(plot: Plot): CameraPose {
  const target = new THREE.Vector3(plot.x, plot.h + 2, plot.z);
  const lz = DISTANCE * Math.cos(ELEVATION);
  // same local -> world convention as BuildMode.toWorld (lx = 0)
  const position = new THREE.Vector3(
    plot.x + lz * Math.sin(plot.face),
    target.y + DISTANCE * Math.sin(ELEVATION),
    plot.z + lz * Math.cos(plot.face),
  );
  return { position, target };
}

/** Pose at t ∈ [0,1] with smoothstep easing; t ≥ 1 returns `to`. */
export function lerpPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  if (t >= 1) return { position: to.position.clone(), target: to.target.clone() };
  const c = Math.max(0, t);
  const k = c * c * (3 - 2 * c);
  return {
    position: from.position.clone().lerp(to.position, k),
    target: from.target.clone().lerp(to.target, k),
  };
}

/** True when the world point lies on the given plot (rotated-rectangle test). */
export function onPlot(plot: Plot, p: THREE.Vector3): boolean {
  const dx = p.x - plot.x;
  const dz = p.z - plot.z;
  const lx = dx * Math.cos(plot.face) - dz * Math.sin(plot.face);
  const lz = dx * Math.sin(plot.face) + dz * Math.cos(plot.face);
  return Math.abs(lx) <= plot.w / 2 && Math.abs(lz) <= plot.d / 2;
}
