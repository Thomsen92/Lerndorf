// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    setMeshoptDecoder(): void {}
    loadAsync(): Promise<{ scene: THREE.Group }> {
      return Promise.resolve({ scene: new THREE.Group() });
    }
  },
}));
import { legendaryGlow } from '../../src/render/legendaryGlow';
import { glbAsset } from '../../src/render/glbItems';

describe('legendary Horror-Haus light cone', () => {
  it('is additive, never hit by a tap and shared between houses', () => {
    const a = legendaryGlow();
    const b = legendaryGlow();
    const meshes = a.children as THREE.Mesh[];
    expect(meshes).toHaveLength(3);
    for (const mesh of meshes) {
      expect((mesh.material as THREE.Material).blending).toBe(THREE.AdditiveBlending);
      expect((mesh.material as THREE.Material).depthWrite).toBe(false);
      expect(mesh.raycast).not.toBe(THREE.Mesh.prototype.raycast);
    }
    // geometry and materials are shared, so many houses cost no extra memory
    expect((b.children[0] as THREE.Mesh).geometry).toBe(meshes[0].geometry);
    expect((b.children[0] as THREE.Mesh).material).toBe(meshes[0].material);
  });

  it('only the legendary house carries it', () => {
    expect(glbAsset('season_house_horror', 'house').getObjectByName('legendaryGlow')).toBeTruthy();
    expect(glbAsset('season_pumpkin_patch', 'deco').getObjectByName('legendaryGlow')).toBeFalsy();
  });
});
