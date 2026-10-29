import { it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { BuildFx } from '../../src/render/buildFx';
for (const reduced of [true, false]) it(`releases removed decoration exactly once (reduced=${reduced})`, () => {
  const scene = new THREE.Scene(), object = new THREE.Group(), release = vi.fn();
  object.userData.onBuildRemoved = release; scene.add(object);
  const fx = new BuildFx(scene, {texture:null, reducedMotion:()=>reduced});
  fx.remove(object,'deco');
  if (!reduced) { expect(release).not.toHaveBeenCalled(); fx.update(0.6,new THREE.PerspectiveCamera()); }
  fx.clear(); fx.dispose();
  expect(release).toHaveBeenCalledTimes(1);
});
