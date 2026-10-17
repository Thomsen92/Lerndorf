/**
 * Deterministic placement of trees and lanterns (SPEC §10.4, §10.6, LOOK §7/§8).
 * Same map + seed => same trees and lanterns. Nothing on paths, plaza, plots, bridges or water.
 * Pure functions, tested in Node.
 */
import { createRng } from './rng';
import { segmentDistance } from './geometry';
import type { Layout } from './layout';
import { PLAZA_RADIUS, VALLEY_RADIUS } from './constants';

export interface Tree {
  x: number;
  z: number;
  y: number;
  scale: number;
  kind: 'pine' | 'round';
  rot: number;
}

export interface Lamp {
  x: number;
  z: number;
  y: number;
  /** Tangent direction of the lane at this point (radians, same convention as yawTo). */
  face: number;
}

/** Distance from a point to the nearest lane sample. */
export function laneDistance(layout: Layout, x: number, z: number): number {
  let best = Infinity;
  for (const s of layout.laneSamples) {
    const d = Math.hypot(s.x - x, s.z - z);
    if (d < best) best = d;
  }
  return best;
}

/** True if a point is on or next to a bridge deck. */
function nearBridge(layout: Layout, x: number, z: number, r: number): boolean {
  return layout.bridges.some((b) => segmentDistance(x, z, b.a, b.b) < r);
}

/** True if a point lies inside the footprint circle of a plot (plus margin). */
function onPlot(layout: Layout, x: number, z: number, margin: number): boolean {
  return layout.plots.some((p) => Math.hypot(p.x - x, p.z - z) < p.rad + margin);
}

/** A free spot for vegetation: off the paths, plaza, plots, bridges and water. */
function freeForNature(layout: Layout, x: number, z: number, pathClear: number): boolean {
  if (laneDistance(layout, x, z) < pathClear) return false;
  if (layout.terrain.riverDistance(x, z) < 5.5) return false;
  if (Math.hypot(x - layout.plaza.x, z - layout.plaza.z) < PLAZA_RADIUS + 3) return false;
  if (nearBridge(layout, x, z, 2.5)) return false;
  return !onPlot(layout, x, z, 1.2);
}

/**
 * Trees: a dense forest belt towards the valley wall, scattered groups in the valley.
 * The target count keeps the draw calls low (instanced meshes).
 */
export function placeTrees(layout: Layout, maxTrees = 200): Tree[] {
  const rng = createRng(layout.seed * 131 + 7);
  const trees: Tree[] = [];
  const span = VALLEY_RADIUS + 14;
  for (let tries = 0; tries < 9000 && trees.length < maxTrees; tries++) {
    const x = (rng() - 0.5) * span * 2;
    const z = (rng() - 0.5) * span * 2;
    const r = Math.hypot(x, z);
    if (r > span) continue;
    // forest belt towards the wall, sparse groups in the valley
    const density = r > VALLEY_RADIUS - 8 ? 0.9 : 0.3;
    if (rng() > density) continue;
    if (!freeForNature(layout, x, z, 2.2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.6)) continue;
    trees.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 0.9 + rng() * 0.9,
      kind: rng() < 0.5 ? 'pine' : 'round',
      rot: rng() * Math.PI * 2,
    });
  }
  return trees;
}

/**
 * Lanterns along the lanes: about every 11 m, alternating left and right 1.6 m from the centre,
 * not near water, bridges or plots. Four more stand around the plaza.
 */
export function placeLamps(layout: Layout): Lamp[] {
  const lamps: Lamp[] = [];
  const s = layout.laneSamples;
  const step = 9; // samples are about 1.2 m apart
  for (let i = step; i < s.length - step; i += step) {
    const a = s[i - 1];
    const b = s[i + 1];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    const side = (i / step) % 2 === 0 ? 1 : -1;
    const x = s[i].x - (tz / l) * 1.6 * side;
    const z = s[i].z + (tx / l) * 1.6 * side;
    if (layout.terrain.riverDistance(x, z) < 6) continue;
    if (nearBridge(layout, x, z, 2.5)) continue;
    if (Math.hypot(x - layout.plaza.x, z - layout.plaza.z) < PLAZA_RADIUS + 1) continue;
    if (onPlot(layout, x, z, 0.5)) continue;
    lamps.push({ x, z, y: layout.terrain.groundHeight(x, z), face: Math.atan2(tx, tz) });
  }
  for (const angle of [0.9, 2.6, 4.0, 5.4]) {
    const r = PLAZA_RADIUS + 0.3;
    const x = layout.plaza.x + Math.cos(angle) * r;
    const z = layout.plaza.z + Math.sin(angle) * r;
    lamps.push({ x, z, y: layout.plazaHeight, face: angle });
  }
  return lamps;
}

export interface Scatter {
  x: number;
  z: number;
  y: number;
  scale: number;
  rot: number;
}

/** Shrubs and rocks in the valley, off paths, plaza, bridges and water; shrubs may stand next to plots. */
export function placeBushes(layout: Layout, maxBushes = 50): Scatter[] {
  const rng = createRng(layout.seed * 151 + 11);
  const out: Scatter[] = [];
  const span = VALLEY_RADIUS;
  for (let tries = 0; tries < 6000 && out.length < maxBushes; tries++) {
    const x = (rng() - 0.5) * span * 2;
    const z = (rng() - 0.5) * span * 2;
    if (!freeForNature(layout, x, z, 2.0)) continue;
    if (out.some((b) => Math.hypot(b.x - x, b.z - z) < 1.8)) continue;
    out.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 0.6 + rng() * 0.6,
      rot: rng() * Math.PI * 2,
    });
  }
  return out;
}

/** Rocks: sunk halfway into the ground, anywhere free. */
export function placeRocks(layout: Layout, maxRocks = 30): Scatter[] {
  const rng = createRng(layout.seed * 173 + 13);
  const out: Scatter[] = [];
  for (let tries = 0; tries < 6000 && out.length < maxRocks; tries++) {
    const x = (rng() - 0.5) * VALLEY_RADIUS * 2.4;
    const z = (rng() - 0.5) * VALLEY_RADIUS * 2.4;
    if (!freeForNature(layout, x, z, 1.5)) continue;
    out.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 0.3 + rng() * 0.6,
      rot: rng() * Math.PI * 2,
    });
  }
  return out;
}

/** Reeds along the river banks, 4.2 to 5.6 m from the centre line, not at bridges. */
export function placeReeds(layout: Layout, maxReeds = 80): Scatter[] {
  const rng = createRng(layout.seed * 191 + 17);
  const river = layout.terrain.river;
  const out: Scatter[] = [];
  for (let tries = 0; tries < 4000 && out.length < maxReeds; tries++) {
    const p = river[Math.floor(rng() * river.length)];
    const a = rng() * Math.PI * 2;
    const d = 4.2 + rng() * 1.4;
    const x = p.x + Math.cos(a) * d;
    const z = p.z + Math.sin(a) * d;
    if (nearBridge(layout, x, z, 2.5)) continue;
    const rd = layout.terrain.riverDistance(x, z);
    if (rd < 4 || rd > 6.2) continue; // on the bank, not in the water
    if (Math.hypot(x - layout.plaza.x, z - layout.plaza.z) < PLAZA_RADIUS + 2) continue;
    out.push({ x, z, y: layout.terrain.groundHeight(x, z), scale: 0.9 + rng() * 0.6, rot: 0 });
  }
  return out;
}

/** Flower patches just outside the plots (garden edges and free plots). */
export function placeFlowers(layout: Layout, maxFlowers = 120): Scatter[] {
  const rng = createRng(layout.seed * 211 + 19);
  const out: Scatter[] = [];
  for (const p of layout.plots) {
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n && out.length < maxFlowers; k++) {
      const a = rng() * Math.PI * 2;
      const r = p.rad + 0.8 + rng() * 1.2;
      const x = p.x + Math.cos(a) * r;
      const z = p.z + Math.sin(a) * r;
      if (laneDistance(layout, x, z) < 1.8) continue;
      if (layout.terrain.riverDistance(x, z) < 5.5) continue;
      out.push({
        x,
        z,
        y: layout.terrain.groundHeight(x, z),
        scale: 0.8 + rng() * 0.4,
        rot: rng() * Math.PI * 2,
      });
    }
  }
  return out;
}
