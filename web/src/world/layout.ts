/**
 * Deterministic village layout for one class: plots, bridges and the walking graph.
 * Same map + same seed + same plot count => identical result on every device.
 * No rendering here; the 3D code reads this data.
 */
import * as THREE from 'three';
import { createRng, type Rng } from './rng';
import { dist, yawTo, type Point2 } from './geometry';
import { Terrain, riverCenterline } from './terrain';
import { PLAZA_RADIUS, VALLEY_RADIUS } from './constants';
import { getMap, type MapDef } from './maps';

export interface Plot {
  index: number;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Radius of the plot's bounding circle. */
  rad: number;
  big: boolean;
  /** Ground height of the levelled plot. */
  h: number;
  /** Rotation of the plot (house faces its lane). */
  face: number;
  /** Lane sample the plot is attached to. */
  link: Point2;
  /** Front gate, world coordinates. */
  gate: Point2;
  /** Front door, world coordinates. */
  door: Point2;
}

export interface Bridge {
  a: Point2;
  b: Point2;
  y: number;
}

export type NodeTag = 'path' | 'plaza' | 'bench' | 'board' | 'fountain' | 'gate' | 'home' | 'landmark';

export interface WalkNode extends Point2 {
  tag: NodeTag;
  /** Facing direction for benches, fountains, boards and homes. */
  face?: number;
}

export interface WalkGraph {
  nodes: WalkNode[];
  adj: number[][];
  /** Node index of each plot's home door, indexed like `plots`. */
  homes: number[];
  benches: number[];
  fountains: number[];
  board: number;
  /** Nodes on the lanes; villagers wander between them. */
  wander: number[];
  /** Landmarks of the map (SPEC §10.6): walkers visit them. */
  landmarks: number[];
}

export interface Layout {
  seed: number;
  plotCount: number;
  /** Map template this layout was built from. */
  map: MapDef;
  plaza: Point2;
  plazaHeight: number;
  plots: Plot[];
  bridges: Bridge[];
  terrain: Terrain;
  graph: WalkGraph;
  /** Sample points along all lanes, used for distance tests. */
  laneSamples: Point2[];
  /** Position of the quest board (in front of the plaza). */
  board: Point2;
}

const plazaPoint = (plaza: Point2, angle: number, r: number): Point2 => ({
  x: plaza.x + Math.cos(angle) * r,
  z: plaza.z + Math.sin(angle) * r,
});

function laneCurvesOf(map: MapDef): THREE.CatmullRomCurve3[] {
  return map.lanes.map(
    (pts) =>
      new THREE.CatmullRomCurve3(
        pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
        false,
        'centripetal',
      ),
  );
}

function nearPath(samples: Point2[], x: number, z: number, r: number): boolean {
  for (const s of samples) {
    if (Math.abs(s.x - x) < r && Math.abs(s.z - z) < r && Math.hypot(s.x - x, s.z - z) < r) return true;
  }
  return false;
}

function scatterPlots(rng: Rng, nPlots: number, terrain: Terrain, samples: Point2[], plaza: Point2): Plot[] {
  const plots: Array<Omit<Plot, 'h' | 'face' | 'link' | 'gate' | 'door' | 'index'>> = [];
  let tries = 0;
  while (plots.length < nPlots && tries++ < 20000) {
    const relax = Math.max(0.25, 1 - tries / 6000); // loosen the rules if the valley fills up
    const s = samples[Math.floor(rng() * samples.length)];
    const ang = rng() * Math.PI * 2;
    const dd = 6 + rng() * rng() * (18 + (1 - relax) * 8); // mostly close, sometimes far out
    const x = s.x + Math.cos(ang) * dd;
    const z = s.z + Math.sin(ang) * dd;
    const big = rng() < 0.3;
    const w = big ? 9.4 : 7.6 + rng() * 1.0; // plots are larger than the house (LOOK §6 keeps the house size)
    const d = big ? 8.0 : 6.2 + rng() * 0.8;
    const rad = Math.hypot(w, d) / 2;
    if (Math.hypot(x, z) > VALLEY_RADIUS + (1 - relax) * 10) continue;
    if (terrain.riverDistance(x, z) < rad + 5) continue;
    if (Math.hypot(x - plaza.x, z - plaza.z) < PLAZA_RADIUS + rad + 4) continue;
    if (nearPath(samples, x, z, rad + 0.6)) continue;
    // hang rule (SPEC §10.5): the ground under a plot may differ by at most 1.5 m
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const h = terrain.naturalHeight(x + Math.cos(a) * rad * 0.45, z + Math.sin(a) * rad * 0.45);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
    // after 8000 tries the rule is relaxed to 2.5 m, so that all 34 plots still fit (see PLAN L.5)
    const maxRange = tries < 8000 ? 1.5 : 2.5;
    if (hi - lo > maxRange) continue;
    const minGap = (2.5 + rng() * 3.8) * relax; // more space between neighbours, but the valley must still hold 34 plots
    if (plots.some((p) => Math.hypot(p.x - x, p.z - z) < p.rad + rad + minGap)) continue;
    plots.push({ x, z, w, d, rad, big });
  }
  return plots.map((p, index) => {
    const h = Math.max(0.5, terrain.naturalHeight(p.x, p.z));
    terrain.flats.push({ x: p.x, z: p.z, r: p.rad + 0.6, h });
    return {
      ...p,
      index,
      h,
      face: 0,
      link: { x: 0, z: 0 },
      gate: { x: 0, z: 0 },
      door: { x: 0, z: 0 },
    };
  });
}

/** Front gate and door for a plot, plus the facing rotation towards the nearest lane sample. */
function orientPlot(plot: Plot, rng: Rng, samples: Point2[]): void {
  let best = samples[0];
  let bestD = Infinity;
  for (const s of samples) {
    const d = Math.hypot(s.x - plot.x, s.z - plot.z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  plot.link = best;
  plot.face = yawTo({ x: plot.x, z: plot.z }, best) + (rng() - 0.5) * 0.35;
  const cos = Math.cos(plot.face);
  const sin = Math.sin(plot.face);
  const toWorld = (lx: number, lz: number): Point2 => ({
    x: plot.x + lx * cos + lz * sin,
    z: plot.z - lx * sin + lz * cos,
  });
  plot.gate = toWorld(0, plot.d / 2 + 0.6);
  plot.door = toWorld(0, -plot.d / 2 + 2.5);
}

function findBridges(terrain: Terrain, laneCurves: THREE.CatmullRomCurve3[]): Bridge[] {
  const bridges: Bridge[] = [];
  for (const curve of laneCurves) {
    const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 0.5));
    let start: Point2 | null = null;
    pts.forEach((v, i) => {
      const wet = terrain.riverDistance(v.x, v.z) < 5.2;
      if (wet && !start) start = pts[Math.max(0, i - 1)];
      if (!wet && start) {
        const y = Math.max(terrain.groundHeight(start.x, start.z), terrain.groundHeight(v.x, v.z)) + 0.25;
        bridges.push({ a: start, b: { x: v.x, z: v.z }, y });
        start = null;
      }
    });
  }
  return bridges;
}

function buildGraph(plots: Plot[], map: MapDef, laneCurves: THREE.CatmullRomCurve3[]): WalkGraph {
  const plaza = map.plaza;
  const nodes: WalkNode[] = [];
  const adj: number[][] = [];
  const add = (p: Point2, tag: NodeTag, face?: number): number => {
    nodes.push({ x: p.x, z: p.z, tag, face });
    adj.push([]);
    return nodes.length - 1;
  };
  const link = (a: number, b: number): void => {
    if (a !== b && !adj[a].includes(b)) {
      adj[a].push(b);
      adj[b].push(a);
    }
  };
  const nearest = (p: Point2, filter: (n: WalkNode, i: number) => boolean): number => {
    let best = -1;
    let bd = Infinity;
    nodes.forEach((n, i) => {
      if (!filter(n, i)) return;
      const d = dist(n, p);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };

  // lanes: a chain of nodes each
  const laneNodes = laneCurves.map((c) => {
    const n = Math.max(2, Math.round(c.getLength() / 2.4));
    const ids: number[] = [];
    for (let i = 0; i <= n; i++) {
      const v = c.getPointAt(i / n);
      ids.push(add(v, 'path'));
    }
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
    return ids;
  });

  // join lane ends to nearby lane nodes (junctions)
  laneNodes.forEach((ids) => {
    [ids[0], ids[ids.length - 1]].forEach((e) => {
      const j = nearest(nodes[e], (o, i) => i !== e && o.tag === 'path' && !ids.includes(i));
      if (j >= 0 && dist(nodes[j], nodes[e]) < 9) link(e, j); // lane ends join a nearby path (no dead ends)
    });
  });
  const wander = laneNodes.flat();

  // plaza ring
  const ring: number[] = [];
  for (let k = 0; k < 14; k++) {
    const p = plazaPoint(plaza, (k / 14) * Math.PI * 2, PLAZA_RADIUS - 1.6);
    ring.push(add(p, 'plaza'));
  }
  ring.forEach((id, k) => link(id, ring[(k + 1) % ring.length]));
  const nearestPlaza = (p: Point2): number => nearest(p, (o) => o.tag === 'plaza');
  laneNodes.forEach((ids) => {
    [ids[0], ids[ids.length - 1]].forEach((e) => {
      if (dist(nodes[e], plaza) < PLAZA_RADIUS + 6) link(e, nearestPlaza(nodes[e]));
    });
  });
  wander.push(...ring);

  const benches = map.benchAngles.map((a) => {
    const p = plazaPoint(plaza, a, PLAZA_RADIUS - 1.3);
    const seat = plazaPoint(plaza, a, PLAZA_RADIUS - 0.4);
    const id = add(p, 'bench', yawTo(seat, plaza));
    link(id, nearestPlaza(p));
    return id;
  });

  const boardPos = plazaPoint(plaza, map.boardAngle, 6.0);
  const board = add(boardPos, 'board', yawTo(boardPos, plazaPoint(plaza, map.boardAngle, 4.4)));
  link(board, nearestPlaza(boardPos));

  const fountains = [0.2, 3.6].map((a) => {
    const p = plazaPoint(plaza, a, 3.4);
    const id = add(p, 'fountain', yawTo(p, plaza));
    link(id, nearestPlaza(p));
    return id;
  });

  const homes = plots.map((p) => {
    const lane = nearest(p.link, (o) => o.tag === 'path');
    const gate = add(p.gate, 'gate');
    link(gate, lane);
    const home = add(p.door, 'home', p.face);
    link(home, gate);
    return home;
  });

  // landmarks are destinations at the end of a path (SPEC §10.6)
  const landmarks = map.landmarks.map((lm) => {
    const id = add({ x: lm.x, z: lm.z }, 'landmark');
    const j = nearest(nodes[id], (o, i) => i !== id && o.tag === 'path');
    if (j >= 0 && dist(nodes[j], nodes[id]) < 14) link(id, j);
    return id;
  });

  return { nodes, adj, homes, benches, fountains, board, wander, landmarks };
}

/** Steps (edges) from `from` to every node; Infinity if unreachable. */
export function hopsFrom(graph: WalkGraph, from: number): number[] {
  const hops = new Array<number>(graph.nodes.length).fill(Infinity);
  hops[from] = 0;
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of graph.adj[u]) {
      if (hops[v] === Infinity) {
        hops[v] = hops[u] + 1;
        queue.push(v);
      }
    }
  }
  return hops;
}

/** Breadth-first search: all nodes reachable from `from`. */
export function reachableFrom(graph: WalkGraph, from: number): Set<number> {
  const seen = new Set<number>([from]);
  const queue = [from];
  while (queue.length) {
    const u = queue.shift() as number;
    for (const v of graph.adj[u]) {
      if (!seen.has(v)) {
        seen.add(v);
        queue.push(v);
      }
    }
  }
  return seen;
}

/** Builds the full layout for one class from a map template and a seed. */
export function buildLayout(layoutSeed: number, plotCount: number, mapId = 'tal'): Layout {
  const map = getMap(mapId);
  const rng = createRng(1000 + layoutSeed * 7919);
  const terrain = new Terrain(layoutSeed * 1.7, riverCenterline(map.river));
  const laneCurves = laneCurvesOf(map);
  const plaza = { ...map.plaza };

  const plazaHeight = Math.max(0.6, terrain.naturalHeight(plaza.x, plaza.z));
  terrain.flats.push({ x: plaza.x, z: plaza.z, r: PLAZA_RADIUS + 1.5, h: plazaHeight });

  const laneSamples: Point2[] = [];
  for (const c of laneCurves) {
    c.getSpacedPoints(Math.ceil(c.getLength() / 1.2)).forEach((v) => laneSamples.push({ x: v.x, z: v.z }));
  }

  const plots = scatterPlots(rng, plotCount, terrain, laneSamples, plaza);
  for (const p of plots) orientPlot(p, rng, laneSamples);
  const bridges = findBridges(terrain, laneCurves);
  const graph = buildGraph(plots, { ...map, plaza }, laneCurves);

  // numbers from the inside out (SPEC §10.5): index 0 is the plot with the shortest walk to the plaza
  const hops = hopsFrom(graph, graph.wander[graph.wander.length - 1]);
  const order = plots
    .map((_, i) => i)
    .sort((a, b) => {
      const byWalk = hops[graph.homes[a]] - hops[graph.homes[b]];
      if (byWalk !== 0) return byWalk;
      return (
        Math.hypot(plots[a].x - plaza.x, plots[a].z - plaza.z) -
        Math.hypot(plots[b].x - plaza.x, plots[b].z - plaza.z)
      );
    });
  const numbered = order.map((oldIndex, newIndex) => ({ ...plots[oldIndex], index: newIndex }));
  graph.homes = order.map((i) => graph.homes[i]);

  return {
    seed: layoutSeed,
    plotCount,
    map,
    plaza,
    plazaHeight,
    plots: numbered,
    bridges,
    terrain,
    graph,
    laneSamples,
    board: plazaPoint(plaza, map.boardAngle, 4.4),
  };
}
