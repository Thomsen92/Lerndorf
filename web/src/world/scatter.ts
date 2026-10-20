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
export function placeTrees(layout: Layout, maxTrees = 480): Tree[] {
  const rng = createRng(layout.seed * 131 + 7);
  const trees: Tree[] = [];
  // up to the rim of the map, so the valley wall is forest and the ridge is not a bare line
  const span = VALLEY_RADIUS + 26;
  for (let tries = 0; tries < 16000 && trees.length < maxTrees; tries++) {
    const x = (rng() - 0.5) * span * 2;
    const z = (rng() - 0.5) * span * 2;
    const r = Math.hypot(x, z);
    if (r > span) continue;
    // forest belt towards the wall, sparse groups in the valley
    const density = r > VALLEY_RADIUS - 8 ? 0.9 : 0.3;
    if (rng() > density) continue;
    if (!freeForNature(layout, x, z, 2.2)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.6)) continue;
    const scale = 0.9 + rng() * 0.9;
    // stand on the lowest point under the trunk, so no tree floats on a slope
    const g = layout.terrain;
    const rr = 0.3 * scale;
    const y = Math.min(
      g.groundHeight(x, z),
      g.groundHeight(x + rr, z),
      g.groundHeight(x - rr, z),
      g.groundHeight(x, z + rr),
      g.groundHeight(x, z - rr),
    );
    trees.push({
      x,
      z,
      y,
      scale,
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
export function placeBushes(layout: Layout, maxBushes = 130): Scatter[] {
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
export function placeRocks(layout: Layout, maxRocks = 70): Scatter[] {
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
export function placeReeds(layout: Layout, maxReeds = 120): Scatter[] {
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

/** Stones on the river banks, 4.6 to 5.8 m from the centre line, sunk halfway (LOOK §4). */
export function placeShoreStones(layout: Layout, maxStones = 120): Scatter[] {
  const rng = createRng(layout.seed * 239 + 31);
  const river = layout.terrain.river;
  const out: Scatter[] = [];
  for (let tries = 0; tries < 5000 && out.length < maxStones; tries++) {
    const p = river[Math.floor(rng() * river.length)];
    const a = rng() * Math.PI * 2;
    const d = 4.6 + rng() * 1.2;
    const x = p.x + Math.cos(a) * d;
    const z = p.z + Math.sin(a) * d;
    if (nearBridge(layout, x, z, 2.5)) continue;
    const rd = layout.terrain.riverDistance(x, z);
    if (rd < 4.6 || rd > 5.8) continue;
    if (Math.hypot(x - layout.plaza.x, z - layout.plaza.z) < PLAZA_RADIUS + 2) continue;
    out.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 0.25 + rng() * 0.35,
      rot: rng() * Math.PI * 2,
    });
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

/** A clipped hedge beside a lane: a short row, turned along the lane. */
export interface Hedge extends Scatter {
  len: number;
}

/**
 * Hedges along the lanes (LOOK §8): about every 3.6 m of lane, on one side, 1.6 m from the centre line.
 * Half of the spots stay empty, so the hedges come in short rows.
 */
export function placeHedges(layout: Layout, maxHedges = 70): Hedge[] {
  const rng = createRng(layout.seed * 223 + 23);
  const s = layout.laneSamples;
  const out: Hedge[] = [];
  const step = 3;
  for (let i = 4; i < s.length - 4 && out.length < maxHedges; i += step) {
    if (rng() < 0.5) continue;
    const a = s[i - 1];
    const b = s[i + 1];
    const tx = b.x - a.x;
    const tz = b.z - a.z;
    const l = Math.hypot(tx, tz) || 1;
    const side = rng() < 0.5 ? 1 : -1;
    const off = 1.6 + rng() * 0.3;
    const x = s[i].x - (tz / l) * off * side;
    const z = s[i].z + (tx / l) * off * side;
    if (!freeForNature(layout, x, z, 1.4)) continue;
    out.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 1,
      rot: Math.atan2(tx, tz),
      len: 2.4 + rng() * 1.2,
    });
  }
  return out;
}

/** A blossom meadow: a flat patch on free ground with a few flowers scattered on it. */
export interface Meadow {
  x: number;
  z: number;
  y: number;
  radius: number;
  flowers: Array<{ x: number; y: number; z: number; colour: number }>;
}

/** Meadows on free ground away from paths, plots and water. Flowers stay inside the radius. */
export function placeMeadows(layout: Layout, maxMeadows = 30): Meadow[] {
  const rng = createRng(layout.seed * 229 + 29);
  const out: Meadow[] = [];
  for (let tries = 0; tries < 4000 && out.length < maxMeadows; tries++) {
    const x = (rng() - 0.5) * VALLEY_RADIUS * 2;
    const z = (rng() - 0.5) * VALLEY_RADIUS * 2;
    if (!freeForNature(layout, x, z, 3.5)) continue;
    if (out.some((m) => Math.hypot(m.x - x, m.z - z) < 9)) continue;
    const radius = 2.2 + rng() * 1.2;
    // flat ground only: the flat patch would sink into a slope
    const h0 = layout.terrain.groundHeight(x, z);
    const level = [0, 1, 2, 3].every((k) => {
      const q = (k * Math.PI) / 2 + 0.4;
      const h = layout.terrain.groundHeight(x + Math.cos(q) * radius * 0.9, z + Math.sin(q) * radius * 0.9);
      return Math.abs(h - h0) < 0.2;
    });
    if (!level) continue;
    const count = 9 + Math.floor(rng() * 6);
    const flowers: Meadow['flowers'] = [];
    for (let k = 0; k < count; k++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius * 0.9;
      const fx = x + Math.cos(a) * r;
      const fz = z + Math.sin(a) * r;
      if (!freeForNature(layout, fx, fz, 2.0)) continue;
      flowers.push({ x: fx, y: layout.terrain.groundHeight(fx, fz), z: fz, colour: Math.floor(rng() * 5) });
    }
    if (flowers.length < 4) continue;
    out.push({ x, z, y: layout.terrain.groundHeight(x, z), radius, flowers });
  }
  return out;
}

/**
 * Grass tufts and wild flowers on open ground (LOOK §2.1 "nie leer"): many tiny instances, so the
 * large lawns between the plots get texture without a texture image.
 */
export function placeTufts(layout: Layout, maxTufts = 1100): Scatter[] {
  const rng = createRng(layout.seed * 257 + 37);
  const out: Scatter[] = [];
  const span = VALLEY_RADIUS + 10;
  for (let tries = 0; tries < 9000 && out.length < maxTufts; tries++) {
    const x = (rng() - 0.5) * span * 2;
    const z = (rng() - 0.5) * span * 2;
    if (Math.hypot(x, z) > span) continue;
    if (!freeForNature(layout, x, z, 1.2)) continue;
    out.push({
      x,
      z,
      y: layout.terrain.groundHeight(x, z),
      scale: 0.6 + rng() * 0.7,
      rot: rng() * Math.PI * 2,
    });
  }
  return out;
}
