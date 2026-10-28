import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSpookyStand } from '../../src/season/spookyStand';
import { buildLayout } from '../../src/world/layout';
describe('independent supplied shop teaser', () => {
  it('keeps a broad click target and its original physical scale', async () => {
    const model = new THREE.Group(),
      geometry = new THREE.BoxGeometry(4, 3, 2);
    model.add(new THREE.Mesh(geometry));
    const stand = createSpookyStand(buildLayout(11, 34, 'tal'), { load: async () => model });
    await stand.ready;
    expect(model.parent).toBe(stand.root);
    expect(model.scale.toArray()).toEqual([1, 1, 1]);
    expect(stand.root.userData.assetReady).toBe(true);
    let clicks = 0;
    stand.root.traverse((o) => {
      if (o.userData.kind === 'seasonStand') clicks++;
    });
    expect(clicks).toBeGreaterThan(1);
    stand.dispose();
  });
  it('disposes a load arriving after logout instead of attaching it', async () => {
    let resolve!: (o: THREE.Object3D) => void;
    const model = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const dispose = vi.spyOn(model.geometry, 'dispose');
    const stand = createSpookyStand(buildLayout(11, 34, 'tal'), {
      load: () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    stand.dispose();
    resolve(model);
    await stand.ready;
    expect(model.parent).toBe(null);
    expect(dispose).toHaveBeenCalledOnce();
  });
  it('retains a clickable fallback after a failed asset download', async () => {
    const stand = createSpookyStand(buildLayout(11, 34, 'tal'), {
      load: async () => {
        throw Error('offline');
      },
    });
    await stand.ready;
    expect(stand.root.userData.assetError).toBe(true);
    expect(stand.root.getObjectByName('spookyStandFallback')).toBeDefined();
    stand.dispose();
  });
});
