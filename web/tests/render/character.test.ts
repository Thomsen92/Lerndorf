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
