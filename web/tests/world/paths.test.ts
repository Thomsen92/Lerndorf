import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { MAP_IDS } from '../../src/world/maps';

// LOOK §4, review befund 5: the ground next to a path is level with the path, so no path floats or sinks.
for (const mapId of MAP_IDS) {
  describe(`paths on ${mapId}`, () => {
    const layout = buildLayout(11, 34, mapId);
    const s = layout.laneSamples;

    it('the ground 0.8 m beside a path is level with the path', () => {
      let checked = 0;
      for (let i = 2; i < s.length - 2; i += 7) {
        const p = s[i];
        if (layout.terrain.riverDistance(p.x, p.z) < 7) continue;
        // levelled plots ramp into the slope over 4 m; that is not the path's doing
        if (layout.plots.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < q.rad + 6)) continue;
        const tx = s[i + 1].x - s[i - 1].x;
        const tz = s[i + 1].z - s[i - 1].z;
        const l = Math.hypot(tx, tz) || 1;
        const sx = p.x - (tz / l) * 0.8;
        const sz = p.z + (tx / l) * 0.8;
        const diff = Math.abs(layout.terrain.groundHeight(sx, sz) - layout.terrain.groundHeight(p.x, p.z));
        expect(diff).toBeLessThan(0.6);
        checked++;
      }
      expect(checked).toBeGreaterThan(4);
    });
  });
}
