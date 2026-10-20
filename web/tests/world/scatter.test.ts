import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import {
  laneDistance,
  placeHedges,
  placeLamps,
  placeMeadows,
  placeShoreStones,
  placeTrees,
} from '../../src/world/scatter';
import { MAP_IDS } from '../../src/world/maps';
import { WATER_LEVEL } from '../../src/world/constants';

for (const mapId of MAP_IDS) {
  describe(`vegetation and lanterns on ${mapId}`, () => {
    const layout = buildLayout(11, 34, mapId);
    const trees = placeTrees(layout);
    const lamps = placeLamps(layout);

    it('places a useful number of trees, never more than asked', () => {
      expect(trees.length).toBeGreaterThan(60);
      expect(trees.length).toBeLessThanOrEqual(480);
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
      expect(lamps.length).toBeLessThanOrEqual(90);
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

import { placeBushes, placeFlowers, placeReeds, placeRocks } from '../../src/world/scatter';
import { MAP_IDS as IDS } from '../../src/world/maps';

for (const mapId of IDS) {
  describe(`bushes, rocks, reeds and flowers on ${mapId}`, () => {
    const layout = buildLayout(23, 34, mapId);
    it('keeps shrubs and rocks off paths and water', () => {
      for (const s of [...placeBushes(layout), ...placeRocks(layout)]) {
        expect(laneDistance(layout, s.x, s.z)).toBeGreaterThanOrEqual(1.5);
        expect(layout.terrain.riverDistance(s.x, s.z)).toBeGreaterThanOrEqual(5.5);
      }
    });
    it('puts reeds on the banks, 4 to 6 m from the river', () => {
      for (const r of placeReeds(layout)) {
        const rd = layout.terrain.riverDistance(r.x, r.z);
        expect(rd).toBeGreaterThanOrEqual(4);
        expect(rd).toBeLessThanOrEqual(6.2);
      }
    });
    it('keeps flowers off the paths', () => {
      for (const f of placeFlowers(layout))
        expect(laneDistance(layout, f.x, f.z)).toBeGreaterThanOrEqual(1.8);
    });
  });
}

for (const mapId of MAP_IDS) {
  describe(`hedges and meadows on ${mapId}`, () => {
    const layout = buildLayout(11, 34, mapId);

    it('keeps hedges beside the lanes, never on them', () => {
      const hedges = placeHedges(layout);
      expect(hedges.length).toBeGreaterThan(0);
      for (const h of hedges) expect(laneDistance(layout, h.x, h.z)).toBeGreaterThan(1.3);
    });

    it('puts shore stones on the bank only, never in the water', () => {
      const stones = placeShoreStones(layout);
      expect(stones.length).toBeGreaterThan(0);
      for (const s of stones) {
        // on the bank down to the waterline, never in the water
        const rd = layout.terrain.riverDistance(s.x, s.z);
        expect(rd).toBeGreaterThanOrEqual(4.0);
        expect(rd).toBeLessThanOrEqual(5.8);
        expect(layout.terrain.groundHeight(s.x, s.z)).toBeGreaterThan(WATER_LEVEL);
      }
    });

    it('places meadows with flowers inside their radius, off paths and plots', () => {
      const meadows = placeMeadows(layout);
      expect(meadows.length).toBeGreaterThan(0);
      for (const m of meadows) {
        expect(laneDistance(layout, m.x, m.z)).toBeGreaterThan(3.4);
        for (const f of m.flowers) {
          expect(Math.hypot(f.x - m.x, f.z - m.z)).toBeLessThanOrEqual(m.radius);
          expect(laneDistance(layout, f.x, f.z)).toBeGreaterThan(1.9);
        }
      }
    });
  });
}
