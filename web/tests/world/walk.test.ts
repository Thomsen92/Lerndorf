import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { shortestPath, walkHeight } from '../../src/world/walk';

describe('shortestPath', () => {
  const layout = buildLayout(11, 24);
  const { graph } = layout;

  it('returns a path where every step is a real edge', () => {
    const from = graph.wander[0];
    const to = graph.homes[0];
    const path = shortestPath(graph, from, to);
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toBe(from);
    expect(path[path.length - 1]).toBe(to);
    for (let i = 1; i < path.length; i++) {
      expect(graph.adj[path[i - 1]]).toContain(path[i]);
    }
  });

  it('returns [from] when start and goal are the same node', () => {
    expect(shortestPath(graph, graph.board, graph.board)).toEqual([graph.board]);
  });

  it('reaches every home from the plaza ring', () => {
    const start = graph.wander[graph.wander.length - 1];
    for (const home of graph.homes) {
      expect(shortestPath(graph, start, home).length).toBeGreaterThan(0);
    }
  });
});

describe('walkHeight', () => {
  it('stands on ground away from bridges', () => {
    const layout = buildLayout(11, 24);
    const p = { x: layout.plaza.x, z: layout.plaza.z };
    expect(walkHeight(layout, p)).toBeCloseTo(layout.terrain.groundHeight(p.x, p.z), 6);
  });

  it('stands on the deck height on a bridge', () => {
    const layout = buildLayout(11, 24);
    const b = layout.bridges[0];
    const mid = { x: (b.a.x + b.b.x) / 2, z: (b.a.z + b.b.z) / 2 };
    expect(walkHeight(layout, mid)).toBe(b.y);
  });
});
