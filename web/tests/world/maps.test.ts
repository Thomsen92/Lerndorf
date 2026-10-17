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
