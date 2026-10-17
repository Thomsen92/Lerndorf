import { describe, it, expect } from 'vitest';
import { buildLayout } from '../../src/world/layout';
import { MAP_IDS } from '../../src/world/maps';

// Review befund 8: plots on slopes are levelled with embankments, and these must not be steep.
// The steepest slope in the 6 m ring around each plot, in metres of height per metre of ground.
function steepestRing(layout: ReturnType<typeof buildLayout>): number[] {
  const out: number[] = [];
  for (const p of layout.plots) {
    let worst = 0;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      for (let d = p.rad + 1; d < p.rad + 6; d += 0.5) {
        const x = p.x + Math.cos(a) * d;
        const z = p.z + Math.sin(a) * d;
        if (layout.terrain.riverDistance(x, z) < 7) continue;
        const g = Math.abs(
          layout.terrain.groundHeight(x + Math.cos(a) * 0.5, z + Math.sin(a) * 0.5) -
            layout.terrain.groundHeight(x, z),
        );
        worst = Math.max(worst, g / 0.5);
      }
    }
    out.push(worst);
  }
  return out;
}

for (const mapId of MAP_IDS) {
  describe(`embankments on ${mapId}`, () => {
    it('plot embankments stay gentle: no steeper than 1.2 m per m (measured max 1.1)', () => {
      const layout = buildLayout(11, 34, mapId);
      const worst = steepestRing(layout);
      expect(Math.max(...worst)).toBeLessThan(1.2);
    });
  });
}
