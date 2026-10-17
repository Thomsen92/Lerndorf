/**
 * Height field of the valley: hills, a carved river bed and levelled plots.
 * Pure math, no rendering, so it can be unit-tested in Node. The river comes from the map template.
 */
import * as THREE from 'three';
import { lerp, segmentDistance, smooth, type Point2 } from './geometry';

export interface Flat {
  x: number;
  z: number;
  r: number;
  h: number;
}

/** River centre line: centripetal Catmull-Rom through the control points, sampled evenly. */
export function riverCenterline(control: Point2[]): Point2[] {
  const curve = new THREE.CatmullRomCurve3(
    control.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    false,
    'centripetal',
  );
  return curve.getSpacedPoints(220).map((v) => ({ x: v.x, z: v.z }));
}

export class Terrain {
  /** Levelled areas (plaza, plots). Added while a layout is being built. */
  readonly flats: Flat[] = [];

  /** Path points with their smoothed target height (see setPaths), bucketed on a 4 m grid. */
  private pathGrid = new Map<string, Array<{ x: number; z: number; h: number }>>();

  constructor(
    private readonly hillPhase: number,
    /** River centre line of this map. */
    readonly river: Point2[],
  ) {}

  /** Distance to the river centre line. */
  riverDistance(x: number, z: number): number {
    let d = Infinity;
    for (let i = 1; i < this.river.length; i++) {
      const a = this.river[i - 1];
      const b = this.river[i];
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

  /**
   * Gives the lanes a smooth bed: the height along each lane is averaged over about 8 m, and the
   * ground next to the lane is drawn towards it (LOOK §4, review befund 5). Stretches close to the
   * river are left out, so bridges and banks keep their own shape.
   */
  setPaths(samples: Point2[]): void {
    const raw = samples.map((p) => this.carvedHeight(p.x, p.z));
    samples.forEach((p, i) => {
      if (this.riverDistance(p.x, p.z) < 6) return;
      let sum = 0;
      let n = 0;
      for (let k = Math.max(0, i - 3); k <= Math.min(raw.length - 1, i + 3); k++) {
        sum += raw[k];
        n++;
      }
      const key = this.cellKey(p.x, p.z);
      const bucket = this.pathGrid.get(key) ?? [];
      bucket.push({ x: p.x, z: p.z, h: sum / n });
      this.pathGrid.set(key, bucket);
    });
  }

  private cellKey(x: number, z: number): string {
    return `${Math.floor(x / 4)},${Math.floor(z / 4)}`;
  }

  /**
   * Pulls the height towards the path within 2.6 m. The target is a weighted mean of the path points
   * nearby, so it changes smoothly and there is no step between two samples.
   */
  private pathBlend(x: number, z: number, v: number): number {
    const cx = Math.floor(x / 4);
    const cz = Math.floor(z / 4);
    let best = Infinity;
    let sumW = 0;
    let sumWh = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of this.pathGrid.get(`${cx + i},${cz + j}`) ?? []) {
          const d = Math.hypot(p.x - x, p.z - z);
          if (d < best) best = d;
          if (d >= 2.6) continue;
          const w = (2.6 - d) ** 2;
          sumW += w;
          sumWh += w * p.h;
        }
      }
    }
    if (sumW === 0) return v;
    return lerp(v, sumWh / sumW, smooth(2.6, 1.0, best));
  }

  /** Height at (x, z) including levelled areas. */
  groundHeight(x: number, z: number): number {
    let v = this.pathBlend(x, z, this.carvedHeight(x, z));
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
