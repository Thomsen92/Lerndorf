import { it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { MAP_IDS } from '../../src/world/maps';

// SPEC §10.4: every way ends at a crossing, the plaza, a plot or a landmark. No dead ends.
for (const mapId of MAP_IDS) {
  for (const seed of [11, 23]) {
    it(`${mapId}, seed ${seed}: no dead ends`, () => {
      const layout = buildLayout(seed, 34, mapId);
      const dead = layout.graph.nodes.filter((n, i) => n.tag === 'path' && layout.graph.adj[i].length <= 1);
      expect(dead.length).toBe(0);
    });
  }
}
