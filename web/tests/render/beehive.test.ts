import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildLayout } from '../../src/world/layout';
import { BEEHIVE_RADIUS, beehiveSpot, createBeehive, plazaObstacles } from '../../src/render/beehive';

describe('beehive on the market', () => {
  it('stands on the plaza ring, every part is tappable and the bees move', () => {
    const layout = buildLayout(11, 4);
    const hive = createBeehive(layout);
    const spot = beehiveSpot(layout);
    expect(hive.root.position.x).toBeCloseTo(spot.x);
    const meshes: THREE.Mesh[] = [];
    hive.root.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes.push(o);
    });
    expect(meshes.length).toBeGreaterThan(20);
    expect(meshes.every((m) => m.userData.kind === 'spellingBee')).toBe(true);
    const bee = hive.root.children.at(-1)!;
    const before = bee.position.clone();
    hive.update(0.1, 2, false);
    expect(bee.position.distanceTo(before)).toBeGreaterThan(0.01);
    hive.dispose();
    expect(hive.root.parent).toBeNull();
  });

  for (const map of ['tal', 'fluss_mitte', 'bach_norden'])
    for (const seed of [3, 8, 11, 21])
      it(`keeps clear of board, stalls, shops, benches and fountain (${map}, seed ${seed})`, () => {
        const layout = buildLayout(seed, 30, map);
        const spot = beehiveSpot(layout);
        for (const o of plazaObstacles(layout))
          expect(Math.hypot(o.x - spot.x, o.z - spot.z)).toBeGreaterThan(o.r + BEEHIVE_RADIUS);
      });
});
