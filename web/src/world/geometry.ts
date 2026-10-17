/** Small 2D helpers shared by the world modules. */

export interface Point2 {
  x: number;
  z: number;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Smooth step from e0 to e1 (edge0 > edge1 gives a falling curve, as in the prototype). */
export function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Distance from point (px, pz) to the segment a-b. */
export function segmentDistance(px: number, pz: number, a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - a.x) * dx + (pz - a.z) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - a.x - t * dx, pz - a.z - t * dz);
}

export const dist = (a: Point2, b: Point2): number => Math.hypot(a.x - b.x, a.z - b.z);

/** Rotation around Y that turns local +z towards the target (same convention as the prototype). */
export const yawTo = (from: Point2, to: Point2): number => Math.atan2(to.x - from.x, to.z - from.z);
