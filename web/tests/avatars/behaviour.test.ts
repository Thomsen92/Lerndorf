import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { createRng } from '../../src/world/rng';
import {
  arrivalAction,
  greetingFor,
  GREETINGS,
  nextAction,
  PLAZA_SHARE_MAX,
  Walker,
} from '../../src/avatars/behaviour';

describe('nextAction', () => {
  const layout = buildLayout(11, 24);
  const { graph } = layout;

  it('always returns a walk on real edges or a pause', () => {
    const rng = createRng(5);
    const start = graph.wander[0];
    for (let i = 0; i < 200; i++) {
      const a = nextAction(rng, graph, start);
      if (a.kind === 'walk') {
        expect(a.path[0]).toBe(start);
        for (let k = 1; k < a.path.length; k++) {
          expect(graph.adj[a.path[k - 1]]).toContain(a.path[k]);
        }
      } else {
        expect(a.kind).toBe('idle');
      }
    }
  });

  it('a full plaza sends nobody to the fountain or the board', () => {
    const rng = createRng(3);
    const start = graph.wander[0];
    for (let i = 0; i < 300; i++) {
      const a = nextAction(rng, graph, start, true);
      if (a.kind === 'walk') {
        const end = a.path[a.path.length - 1];
        expect(graph.nodes[end].tag).not.toBe('fountain');
        expect(graph.nodes[end].tag).not.toBe('board');
      }
    }
    expect(PLAZA_SHARE_MAX).toBe(0.4);
  });

  it('sometimes sends villagers to a landmark', () => {
    const rng = createRng(21);
    const reached = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const a = nextAction(rng, graph, graph.wander[0]);
      if (a.kind === 'walk') reached.add(a.path[a.path.length - 1]);
    }
    expect(graph.landmarks.some((n) => reached.has(n))).toBe(true);
  });

  it('is deterministic for the same random sequence', () => {
    const a = nextAction(createRng(9), graph, graph.wander[0]);
    const b = nextAction(createRng(9), graph, graph.wander[0]);
    expect(a).toEqual(b);
  });
});

describe('arrivalAction', () => {
  const layout = buildLayout(11, 24);
  const { graph } = layout;

  it('sits on a bench for a while', () => {
    const a = arrivalAction(createRng(1), graph, graph.benches[0]);
    expect(a.kind).toBe('sit');
    if (a.kind === 'sit') expect(a.seconds).toBeGreaterThanOrEqual(6);
  });

  it('waits at the fountain and at the board', () => {
    const f = arrivalAction(createRng(1), graph, graph.fountains[0]);
    const b = arrivalAction(createRng(1), graph, graph.board);
    expect(f).toMatchObject({ kind: 'idle', reason: 'fountain' });
    expect(b).toMatchObject({ kind: 'idle', reason: 'board' });
  });
});

describe('greetings', () => {
  it('only uses the fixed English words', () => {
    const rng = createRng(3);
    for (let i = 0; i < 50; i++) expect(GREETINGS).toContain(greetingFor(rng));
  });
});

describe('Walker', () => {
  const line = [
    { x: 0, z: 0 },
    { x: 10, z: 0 },
    { x: 10, z: 10 },
  ];

  it('moves at constant speed along the path and ends at the last point', () => {
    const w = new Walker(line, 2);
    w.advance(2.5); // 5 units: halfway along the first leg
    expect(w.position().x).toBeCloseTo(5, 6);
    expect(w.position().z).toBeCloseTo(0, 6);
    expect(w.done).toBe(false);
    w.advance(100);
    expect(w.done).toBe(true);
    expect(w.position().x).toBeCloseTo(10, 6);
    expect(w.position().z).toBeCloseTo(10, 6);
  });

  it('turns the heading at a corner', () => {
    const w = new Walker(line, 2);
    w.advance(6); // 12 units: past the corner, 2 units up the second leg
    expect(w.position().heading).toBeCloseTo(0, 6); // +z direction
  });
});
