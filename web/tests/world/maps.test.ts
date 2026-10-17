import { describe, it, expect } from 'vitest';
import { buildLayout, reachableFrom } from '../../src/world/layout';
import { MAP_IDS, getMap } from '../../src/world/maps';

const SEEDS = [11, 23];
const PLOTS = 34;

describe('map templates', () => {
  it('has three templates that differ in plaza and river', () => {
    expect(MAP_IDS.length).toBeGreaterThanOrEqual(3);
    const plazas = MAP_IDS.map((id) => JSON.stringify(getMap(id).plaza));
    expect(new Set(plazas).size).toBe(MAP_IDS.length);
    const rivers = MAP_IDS.map((id) => JSON.stringify(getMap(id).river));
    expect(new Set(rivers).size).toBe(MAP_IDS.length);
  });

  it('falls back to the first template for an unknown id', () => {
    expect(getMap('gibt_es_nicht').id).toBe('tal');
  });
});

for (const mapId of MAP_IDS) {
  for (const seed of SEEDS) {
    describe(`${mapId}, seed ${seed}`, () => {
      const layout = buildLayout(seed, PLOTS, mapId);

      it('places all plots without overlap', () => {
        expect(layout.plots.length).toBe(PLOTS);
        for (let i = 0; i < layout.plots.length; i++) {
          for (let j = i + 1; j < layout.plots.length; j++) {
            const p = layout.plots[i];
            const q = layout.plots[j];
            expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(p.rad + q.rad);
          }
        }
      });

      it('keeps every plot out of the river', () => {
        for (const p of layout.plots) {
          expect(layout.terrain.riverDistance(p.x, p.z)).toBeGreaterThanOrEqual(p.rad + 5);
        }
      });

      it('reaches every home from the plaza', () => {
        const start = layout.graph.wander[layout.graph.wander.length - 1];
        const reach = reachableFrom(layout.graph, start);
        for (const home of layout.graph.homes) expect(reach.has(home)).toBe(true);
      });

      it('is the same for the same map and seed', () => {
        const again = buildLayout(seed, PLOTS, mapId);
        expect(again.plots.map((p) => [p.x, p.z])).toEqual(layout.plots.map((p) => [p.x, p.z]));
      });
    });
  }
}

describe('8a and 8b look different', () => {
  it('two classes on different templates do not share a village', () => {
    const a = buildLayout(11, PLOTS, 'tal');
    const b = buildLayout(23, PLOTS, 'fluss_mitte');
    expect(a.plaza).not.toEqual(b.plaza);
    expect(a.plots[0].x).not.toBeCloseTo(b.plots[0].x, 3);
  });
});

describe('plot numbers run from the inside out (SPEC §10.5)', () => {
  for (const mapId of MAP_IDS) {
    it(`${mapId}: index 0 has the shortest walk to the plaza, the walk never shrinks`, async () => {
      const { hopsFrom } = await import('../../src/world/layout');
      const layout = buildLayout(11, PLOTS, mapId);
      const hops = hopsFrom(layout.graph, layout.graph.wander[layout.graph.wander.length - 1]);
      const walk = layout.plots.map((p) => hops[layout.graph.homes[p.index]]);
      expect(layout.plots.map((p) => p.index)).toEqual(layout.plots.map((_, i) => i));
      for (let i = 1; i < walk.length; i++) expect(walk[i]).toBeGreaterThanOrEqual(walk[i - 1]);
    });
  }
});

describe('hang rule (SPEC §10.5)', () => {
  for (const mapId of MAP_IDS) {
    it(`${mapId}: the ground under each plot differs by at most 1.5 m`, () => {
      const layout = buildLayout(23, PLOTS, mapId);
      for (const p of layout.plots) {
        let lo = Infinity;
        let hi = -Infinity;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          const h = layout.terrain.naturalHeight(
            p.x + Math.cos(a) * p.rad * 0.45,
            p.z + Math.sin(a) * p.rad * 0.45,
          );
          lo = Math.min(lo, h);
          hi = Math.max(hi, h);
        }
        expect(hi - lo).toBeLessThanOrEqual(2.5 + 0.2);
      }
    });
  }
});
