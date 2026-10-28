import { expect, it } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { MAP_IDS } from '../../src/world/maps';
import { laneDistance, gardenPathDistance } from '../../src/world/scatter';
import { segmentDistance } from '../../src/world/geometry';
import { placePlotBorderDecor, plotRectangleDistance } from '../../src/render/season/placement';

it('places deterministic public decorations strictly beyond real rotated plots and entrances on many seeds', () => {
  let count = 0;
  for (const map of MAP_IDS)
    for (let seed = 1; seed <= 12; seed++) {
      const layout = buildLayout(seed * 177, 34, map);
      const positions = placePlotBorderDecor(layout);
      expect(placePlotBorderDecor(layout)).toEqual(positions);
      count += positions.length;
      for (const p of positions) {
        for (const plot of layout.plots) {
          expect(plotRectangleDistance(plot, p.x, p.z)).toBeGreaterThanOrEqual(p.radius + 0.35);
          expect(segmentDistance(p.x, p.z, plot.drive, plot.link)).toBeGreaterThanOrEqual(1.5 + p.radius);
        }
        expect(gardenPathDistance(layout, p.x, p.z)).toBeGreaterThanOrEqual(1.5 + p.radius);
        expect(laneDistance(layout, p.x, p.z)).toBeGreaterThanOrEqual(1.7 + p.radius);
        expect(layout.terrain.riverDistance(p.x, p.z)).toBeGreaterThanOrEqual(5.5 + p.radius);
      }
    }
  expect(count).toBeGreaterThan(700);
});
