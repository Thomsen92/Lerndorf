import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { MODEL_IDS, plotAsset } from '../../src/render/plotAssets';
import { MAX_SIZE, type SlotKind } from '../../src/world/plotPlan';

// Asset contract (docs/ASSET_VERTRAG.md B): every model stays inside the highest visible size of its
// kind, stands on the ground (y = 0) and has its origin in the middle of its footprint.
describe('placeholder models follow the asset contract', () => {
  for (const kind of Object.keys(MODEL_IDS) as SlotKind[]) {
    for (const id of MODEL_IDS[kind]) {
      it(`${id} fits the ${kind} slot`, () => {
        const box = new THREE.Box3().setFromObject(plotAsset(kind, id), true); // precise: vertices, not boxes
        const max = MAX_SIZE[kind];
        const tol = 0.001;
        // symmetric around the origin: the footprint is centred, so each half may use half the size
        expect(Math.max(-box.min.x, box.max.x)).toBeLessThanOrEqual(max.w / 2 + tol);
        expect(Math.max(-box.min.z, box.max.z)).toBeLessThanOrEqual(max.d / 2 + tol);
        expect(box.max.y).toBeLessThanOrEqual(max.h + tol);
        expect(box.min.y).toBeGreaterThanOrEqual(-0.05);
      });
    }
  }
});

// Every plot item of the catalogue (migrations) has a model, so no slot shows a stand-in.
describe('every catalogue item of the plot kinds has a model', () => {
  const sql = ['0008_teacher_stats_catalog.sql', '0013_plot_slots.sql']
    .map((f) => readFileSync(new URL(`../../../supabase/migrations/${f}`, import.meta.url), 'utf8'))
    .join('\n');
  const ids = [...sql.matchAll(/\('((?:deco|house|garage|car)_[a-z_]+)',\s*'(deco|house|garage|car)'/g)];
  it('finds the catalogue entries', () => {
    expect(ids.length).toBeGreaterThan(15);
  });
  for (const [, id, kind] of ids) {
    it(`${id} has a ${kind} model`, () => {
      expect(MODEL_IDS[kind as SlotKind]).toContain(id);
    });
  }
});
