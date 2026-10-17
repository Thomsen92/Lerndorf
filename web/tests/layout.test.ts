import { describe, expect, it } from 'vitest';
import { buildLayout, reachableFrom } from '../src/world/layout';
import { createRng } from '../src/world/rng';

const SEEDS = [1, 2, 7, 42, 99];
// 34 = 32 pupils + 2 reserve (SPEC §9/§19). 40 is not reliably placeable, see notes.
const COUNTS = [8, 24, 34];

describe('rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('never gets stuck at zero', () => {
    const r = createRng(0);
    expect(r()).toBeGreaterThan(0);
  });
});

describe('layout determinism', () => {
  it('same seed and plot count give identical plots', () => {
    for (const seed of SEEDS) {
      const a = buildLayout(seed, 24);
      const b = buildLayout(seed, 24);
      expect(a.plots.map(({ x, z, w, d, face }) => [x, z, w, d, face])).toEqual(
        b.plots.map(({ x, z, w, d, face }) => [x, z, w, d, face]),
      );
    }
  });

  it('different seeds give different villages', () => {
    const a = buildLayout(1, 24);
    const b = buildLayout(2, 24);
    expect(a.plots[0].x).not.toBe(b.plots[0].x);
  });
});

describe('plot placement', () => {
  for (const seed of SEEDS) {
    for (const count of COUNTS) {
      it(`seed ${seed}, ${count} plots: places all plots without overlap`, () => {
        const layout = buildLayout(seed, count);
        expect(layout.plots.length).toBe(count);
        for (let i = 0; i < layout.plots.length; i++) {
          for (let j = i + 1; j < layout.plots.length; j++) {
            const p = layout.plots[i];
            const q = layout.plots[j];
            expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(p.rad + q.rad);
          }
        }
      });

      it(`seed ${seed}, ${count} plots: no plot in the river`, () => {
        const layout = buildLayout(seed, count);
        for (const p of layout.plots) {
          expect(layout.terrain.riverDistance(p.x, p.z)).toBeGreaterThanOrEqual(p.rad + 5);
        }
      });
    }
  }
});

describe('walking network', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: every home door is reachable from the plaza`, () => {
      const layout = buildLayout(seed, 40);
      const { graph } = layout;
      const start = graph.wander[graph.wander.length - 1]; // a plaza ring node
      expect(graph.nodes[start].tag).toBe('plaza');
      const reach = reachableFrom(graph, start);
      for (const home of graph.homes) {
        expect(reach.has(home)).toBe(true);
      }
    });
  }
});
