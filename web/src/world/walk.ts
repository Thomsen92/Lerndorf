/**
 * Walking helpers: shortest route on the walking graph, and the height a figure stands on
 * (ground, or bridge deck). Pure functions, tested in Node.
 */
import { segmentDistance, type Point2 } from './geometry';
import type { Layout, WalkGraph } from './layout';

/**
 * Shortest route in number of steps (breadth-first search) from node `from` to node `to`.
 * Returns the node indexes including both ends, or [] if there is no route.
 */
export function shortestPath(graph: WalkGraph, from: number, to: number): number[] {
  if (from === to) return [from];
  const prev = new Array<number>(graph.nodes.length).fill(-1);
  prev[from] = from;
  const queue: number[] = [from];
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of graph.adj[u]) {
      if (prev[v] !== -1) continue;
      prev[v] = u;
      if (v === to) return buildPath(prev, from, to);
      queue.push(v);
    }
  }
  return [];
}

function buildPath(prev: number[], from: number, to: number): number[] {
  const path: number[] = [];
  for (let u = to; u !== from; u = prev[u]) path.push(u);
  path.push(from);
  return path.reverse();
}

/**
 * Height a figure stands on at (x, z): the bridge deck if it is on a bridge, otherwise the ground.
 */
export function walkHeight(layout: Layout, p: Point2): number {
  for (const b of layout.bridges) {
    if (segmentDistance(p.x, p.z, b.a, b.b) < 1.6) return b.y;
  }
  return layout.terrain.groundHeight(p.x, p.z);
}
