import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  cameraDistance,
  createCardModelCache,
  frameObject,
  type CardModelLoader,
} from '../../src/collection/cardModel';

function card(): THREE.Group {
  const group = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1.4, 0.04);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  group.add(mesh);
  return group;
}

describe('card model fitting and cache', () => {
  it('frames wide and tall models without cutting them off', () => {
    const camera = new THREE.PerspectiveCamera(36, 0.75, 0.01, 100);
    const target = new THREE.Vector3();
    const controls = { target, update: vi.fn() };
    const wide = card();
    wide.scale.set(3, 1, 1);
    frameObject(wide, camera, controls);
    const wideDistance = camera.position.distanceTo(target);
    const tall = card();
    tall.scale.set(1, 3, 1);
    frameObject(tall, camera, controls);
    const tallDistance = camera.position.distanceTo(target);
    expect(wideDistance).toBeGreaterThan(0);
    expect(tallDistance).toBeGreaterThan(0);
    expect(controls.update).toHaveBeenCalled();
    expect(camera.fov).toBe(36);
  });

  it('uses the canvas aspect for portrait screens', () => {
    const size = new THREE.Vector3(2, 2, 0.1);
    const landscape = cameraDistance(size, 36, 1.6);
    const portrait = cameraDistance(size, 36, 0.6);
    expect(portrait).toBeGreaterThan(landscape);
  });

  it('keeps the four most recent models and reloads an evicted one', async () => {
    const load = vi.fn(async () => card()) as CardModelLoader;
    const cache = createCardModelCache(load, 4);
    const first = await cache.load('a.glb');
    for (const url of ['b.glb', 'c.glb', 'd.glb', 'e.glb']) await cache.load(url);
    expect(load).toHaveBeenCalledTimes(5);
    // The newest entry stays cached; the oldest non-active one is gone and loads again.
    expect(await cache.load('e.glb')).toBeInstanceOf(THREE.Object3D);
    expect(load).toHaveBeenCalledTimes(5);
    expect(await cache.load('a.glb')).not.toBe(first);
    expect(load).toHaveBeenCalledTimes(6);
    cache.dispose();
  });

  it('reports loader errors and retries on the next load', async () => {
    const loader = vi.fn<CardModelLoader>().mockRejectedValueOnce(new Error('404')).mockResolvedValue(card());
    const cache = createCardModelCache(loader, 4);
    await expect(cache.load('broken.glb')).rejects.toThrow('404');
    await expect(cache.load('broken.glb')).resolves.toBeInstanceOf(THREE.Object3D);
    cache.dispose();
  });
});
