/** Public seasonal decorations. Never consume a house/build slot or the plot's rectangle. */
import type { Layout, Plot } from '../../world/layout';
import { createRng } from '../../world/rng';
import { segmentDistance } from '../../world/geometry';
import { gardenPathDistance, laneDistance } from '../../world/scatter';

export interface BorderDecor {
  x: number;
  y: number;
  z: number;
  radius: number;
  kind: 'pumpkin' | 'lantern';
  rot: number;
}

/** Euclidean distance to the actual rotated buildable rectangle (zero inside it). */
export function plotRectangleDistance(plot: Plot, x: number, z: number): number {
  const dx = x - plot.x,
    dz = z - plot.z,
    c = Math.cos(plot.face),
    s = Math.sin(plot.face);
  const lx = dx * c - dz * s,
    lz = dx * s + dz * c;
  return Math.hypot(Math.max(0, Math.abs(lx) - plot.w / 2), Math.max(0, Math.abs(lz) - plot.d / 2));
}

export function publicDecorAllowed(layout: Layout, x: number, z: number, radius: number): boolean {
  if (laneDistance(layout, x, z) < 1.7 + radius || gardenPathDistance(layout, x, z) < 1.5 + radius)
    return false;
  if (layout.terrain.riverDistance(x, z) < 5.5 + radius) return false;
  return layout.plots.every(
    (p) =>
      plotRectangleDistance(p, x, z) >= radius + 0.35 &&
      segmentDistance(x, z, p.drive, p.link) >= 1.5 + radius,
  );
}

export function placePlotBorderDecor(layout: Layout): BorderDecor[] {
  const rng = createRng(layout.seed * 811 + 3110),
    result: BorderDecor[] = [];
  for (const p of layout.plots) {
    // Side/rear corners only: leave the gate and car driveway in the front completely open.
    for (const side of [-1, 1]) {
      const radius = 0.48,
        lx = side * (p.w / 2 + 1.05),
        lz = -p.d / 2 + 1 + rng() * 3;
      const c = Math.cos(p.face),
        s = Math.sin(p.face);
      const x = p.x + lx * c + lz * s,
        z = p.z - lx * s + lz * c;
      if (!publicDecorAllowed(layout, x, z, radius)) continue;
      if (result.some((q) => Math.hypot(q.x - x, q.z - z) < q.radius + radius + 0.3)) continue;
      result.push({
        x,
        z,
        y: layout.terrain.groundHeight(x, z),
        radius,
        kind: side < 0 ? 'pumpkin' : 'lantern',
        rot: rng() * Math.PI * 2,
      });
    }
  }
  return result;
}
