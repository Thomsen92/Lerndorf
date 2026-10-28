import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { bakeStatic } from '../../src/render/merge';
import { setupScene, SKY_HORIZON } from '../../src/render/scene';

afterEach(() => vi.restoreAllMocks());

it('keeps replaceable descendants out of the static bake while merging permanent scenery', () => {
  const root = new THREE.Group(),
    seasonal = new THREE.Group(),
    nested = new THREE.Group();
  seasonal.userData.bakeStatic = false;
  root.add(seasonal);
  seasonal.add(nested);
  const moving = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  const permanent = moving.clone();
  nested.add(moving);
  root.add(permanent);
  bakeStatic(root);
  expect(moving.parent).toBe(nested);
  expect(permanent.parent).toBeNull();
  seasonal.visible = false;
  expect(root.children.filter((o) => o instanceof THREE.Mesh)).toHaveLength(1);
});

it('restores the normal panorama after it finishes loading during Halloween', async () => {
  let finish!: (texture: THREE.Texture) => void;
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((_url, onLoad) => {
    finish = onLoad!;
    return new THREE.Texture();
  }) as THREE.TextureLoader['load']);
  const scene = new THREE.Scene(),
    rig = setupScene(scene);
  rig.setTheme('halloween');
  const holidayColour = (scene.background as THREE.Color).getHex();
  const sky = new THREE.Texture();
  finish(sky);
  await rig.skyReady;
  expect((scene.background as THREE.Color).getHex()).toBe(holidayColour);
  rig.follow(new THREE.Vector3(9, 0, 7));
  expect(rig.sun.position.y).toBe(32);
  rig.setTheme('normal');
  expect(scene.background).toBe(sky);
  expect((scene.fog as THREE.Fog).color.getHexString()).toBe(new THREE.Color(SKY_HORIZON).getHexString());
  expect(rig.sun.color.getHexString()).toBe('ffd2a1');
  rig.follow(new THREE.Vector3(9, 0, 7));
  expect(rig.sun.position.toArray()).toEqual([-32, 55, 33]);
});
