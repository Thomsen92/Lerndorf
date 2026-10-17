/**
 * Height field of the valley: hills, a carved river bed and levelled plots.
 * Pure math, no rendering, so it can be unit-tested in Node.
 */
import * as THREE from 'three';
import { lerp, segmentDistance, smooth, type Point2 } from './geometry';
import { RIVER_CONTROL } from './constants';

export interface Flat {
  x: number;
  z: number;
  r: number;
  h: number;
}

const riverCurve = new THREE.CatmullRomCurve3(
  RIVER_CONTROL.map((p) => new THREE.Vector3(p.x, 0, p.z)),
  false,
  'centripetal',
);
/** River centre line as 2D points, shared by all layouts (the river never changes). */
export const RIVER_POINTS: Point2[] = riverCurve.getSpacedPoints(220).map((v) => ({ x: v.x, z: v.z }));

export class Terrain {
  /** Levelled areas (plaza, plots). Added while a layout is being built. */
  readonly flats: Flat[] = [];

  constructor(private readonly hillPhase: number) {}

  /** Distance to the river centre line. */
  riverDistance(x: number, z: number): number {
    let d = Infinity;
    for (let i = 1; i < RIVER_POINTS.length; i++) {
      const a = RIVER_POINTS[i - 1];
      const b = RIVER_POINTS[i];
      if (Math.abs(a.x - x) > 12) continue; // cheap reject, the river is far from most points
      d = Math.min(d, segmentDistance(x, z, a, b));
    }
    return d;
  }

  /** Natural hills before carving. */
  private baseHeight(x: number, z: number): number {
    const p = this.hillPhase;
    let h =
      2.6 * Math.sin(x * 0.055 + 1 + p) * Math.cos(z * 0.048 - p * 0.7) +
      1.6 * Math.sin(x * 0.11 - z * 0.08 + p * 1.3) +
      0.9 * Math.cos(z * 0.14 + x * 0.035);
    const r = Math.hypot(x, z);
    h += Math.max(0, r - 42) * 0.32; // hills rise towards the valley wall
    return h + 1.2;
  }

  /** Height with the river bed carved in, before levelling. */
  private carvedHeight(x: number, z: number): number {
    const d = this.riverDistance(x, z);
    const h = this.baseHeight(x, z);
    return lerp(h, Math.min(h, -0.9), smooth(7.5, 2.5, d)) - smooth(3.5, 0, d) * 0.4;
  }

  /** Height at (x, z) including levelled areas. */
  groundHeight(x: number, z: number): number {
    let v = this.carvedHeight(x, z);
    for (const f of this.flats) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r + 4) v = lerp(v, f.h, smooth(f.r + 4, f.r, d));
    }
    return v;
  }

  /** Height of the natural ground at a point, ignoring flats (used to level them). */
  naturalHeight(x: number, z: number): number {
    return this.carvedHeight(x, z);
  }
}
