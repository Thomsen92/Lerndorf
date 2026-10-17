import { describe, it, expect } from 'vitest';
import { buildLayout, reachableFrom } from '../../src/world/layout';
import { MAP_IDS } from '../../src/world/maps';

for (const mapId of MAP_IDS) {
  describe(`landmarks on ${mapId}`, () => {
    it('every landmark is reachable from the plaza', () => {
      const layout = buildLayout(11, 34, mapId);
      const start = layout.graph.wander[layout.graph.wander.length - 1];
      const reach = reachableFrom(layout.graph, start);
      expect(layout.graph.landmarks.length).toBe(layout.map.landmarks.length);
      for (const lm of layout.graph.landmarks) expect(reach.has(lm)).toBe(true);
    });
  });
}
