import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { stripRootMotion } from '../../src/render/character';

describe('stripRootMotion', () => {
  it('freezes hips x/z, keeps y and other tracks', () => {
    const hips = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 1], [1, 2, 3, 5, 6, 7]);
    const arm = new THREE.VectorKeyframeTrack('mixamorigArm.position', [0, 1], [1, 2, 3, 5, 6, 7]);
    stripRootMotion(new THREE.AnimationClip('walk', 1, [hips, arm]));
    expect(Array.from(hips.values)).toEqual([1, 2, 3, 1, 6, 3]);
    expect(Array.from(arm.values)).toEqual([1, 2, 3, 5, 6, 7]);
  });
});

describe('rootTravel', () => {
  it('forward distance as a share of the hips height', async () => {
    const { rootTravel } = await import('../../src/render/character');
    const hips = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 8], [0, 0.35, 0, 0, 0.35, 1.4]);
    expect(rootTravel(new THREE.AnimationClip('catwalk', 8, [hips]))).toBeCloseTo(4, 5);
    expect(rootTravel(new THREE.AnimationClip('none', 1, []))).toBe(0);
  });
});
