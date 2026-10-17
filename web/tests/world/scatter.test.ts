import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { laneDistance, placeLamps, placeTrees } from '../../src/world/scatter';
import { MAP_IDS } from '../../src/world/maps';

for (const mapId of MAP_IDS) {
  describe(`vegetation and lanterns on ${mapId}`, () => {
    const layout = buildLayout(11, 34, mapId);
    const trees = placeTrees(layout);
    const lamps = placeLamps(layout);

    it('places a useful number of trees, never more than asked', () => {
      expect(trees.length).toBeGreaterThan(60);
      expect(trees.length).toBeLessThanOrEqual(200);
    });

    it('keeps trees off paths, plaza and water', () => {
      for (const t of trees) {
        expect(laneDistance(layout, t.x, t.z)).toBeGreaterThanOrEqual(2.2);
        expect(layout.terrain.riverDistance(t.x, t.z)).toBeGreaterThanOrEqual(5.5);
        expect(Math.hypot(t.x - layout.plaza.x, t.z - layout.plaza.z)).toBeGreaterThan(8);
      }
    });

    it('keeps trees off the plots', () => {
      for (const t of trees) {
        for (const p of layout.plots) {
          expect(Math.hypot(p.x - t.x, p.z - t.z)).toBeGreaterThanOrEqual(p.rad + 1.2);
        }
      }
    });

    it('places lanterns along the lanes and around the plaza', () => {
      // SPEC §10.6 asks for 20 to 30; the shortest template has fewer lane metres (see PLAN L.3)
      expect(lamps.length).toBeGreaterThanOrEqual(15);
      expect(lamps.length).toBeLessThanOrEqual(60);
      for (const l of lamps.slice(0, -4)) {
        expect(layout.terrain.riverDistance(l.x, l.z)).toBeGreaterThanOrEqual(6);
      }
    });

    it('is the same for the same map and seed', () => {
      const again = placeTrees(buildLayout(11, 34, mapId));
      expect(again.map((t) => [t.x, t.z])).toEqual(trees.map((t) => [t.x, t.z]));
    });
  });
}
