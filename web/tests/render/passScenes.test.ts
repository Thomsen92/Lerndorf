// A3: the 12 pass scenes must match migration 0030, use only assets that exist in the repo,
// and normalise into the 3 x 3 decoration pedestal.
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import * as THREE from 'three';
import { PASS_SCENES, normaliseScene } from '../../src/render/passScenes';
import { MAX_SIZE } from '../../src/world/plotPlan';

const SCENE_IDS = [
  'scene_pumpkin_bed',
  'scene_fire_basket',
  'scene_autumn_pine',
  'scene_lantern_path',
  'scene_graveyard_gate',
  'scene_candle_altar',
  'scene_ghost_grave',
  'scene_skeleton_bench',
  'scene_zombie_garden',
  'scene_little_crypt',
  'scene_vampire_coffin',
  'scene_gravedigger',
];

describe('pass scenes', () => {
  it('defines exactly the twelve scene ids from 0030', () => {
    expect(Object.keys(PASS_SCENES).sort()).toEqual([...SCENE_IDS].sort());
  });

  it('uses at least two parts and only existing Kenney models', () => {
    for (const [id, parts] of Object.entries(PASS_SCENES)) {
      expect(parts.length, id).toBeGreaterThanOrEqual(2);
      for (const part of parts) {
        const file = new URL(`../../public/assets/kenney/graveyard/${part.name}.glb`, import.meta.url);
        expect(existsSync(file), `${id}: ${part.name}`).toBe(true);
      }
    }
  });

  it('normalises a wide scene into the pedestal', () => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2));
    mesh.position.y = 1;
    group.add(mesh);
    const result = normaliseScene(group);
    const box = new THREE.Box3().setFromObject(result);
    const size = box.getSize(new THREE.Vector3());
    expect(Math.max(size.x, size.z)).toBeCloseTo(2.4, 1);
    expect(size.x).toBeLessThanOrEqual(MAX_SIZE.deco.w + 0.01);
    expect(size.z).toBeLessThanOrEqual(MAX_SIZE.deco.d + 0.01);
    expect(box.min.y).toBeCloseTo(0, 2);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 2);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 2);
  });
});
