import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../../src/render/kenney', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/render/kenney')>()),
  kenneyModel: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../src/render/textures', () => ({ pavingTexture: () => new THREE.Texture() }));
import {
  createMarketShop,
  marketShopPlacement,
  MARKET_SHOP_RADIUS,
  DECOR_STALL_OFFSETS,
} from '../../src/render/marketShop';
import { buildPlaza } from '../../src/render/plaza';
import { buildLayout } from '../../src/world/layout';
import { bakeStatic } from '../../src/render/merge';
import { kenneyModel } from '../../src/render/kenney';

function keeper() {
  const root = new THREE.Group();
  for (const name of ['Body', 'Head', 'Eyes', 'Mouth', 'Arm_L', 'Arm_R']) {
    const node = new THREE.Group();
    node.name = name;
    root.add(node);
  }
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()));
  return root;
}

describe('permanent Ollie shop', () => {
  it('keeps named animation nodes and actual click targets through the global bake', async () => {
    const source = keeper();
    const shop = createMarketShop(buildLayout(11, 4), { loadKeeper: async () => source });
    await shop.ready;
    bakeStatic(shop.root);
    expect(shop.root.userData.bakeStatic).toBe(false);
    for (const name of ['Head', 'Eyes', 'Mouth', 'Arm_L', 'Arm_R'])
      expect(shop.root.getObjectByName(name)).toBeDefined();
    let hits = 0;
    shop.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.kind === 'marketShop') hits++;
    });
    expect(hits).toBeGreaterThan(0);
    const head = shop.root.getObjectByName('Head')!;
    shop.update(0.016, 1, false);
    expect(head.rotation.y).not.toBe(0);
    expect(source.getObjectByName('Head')!.rotation.y).toBe(0);
    shop.update(0.016, 1, true);
    expect(head.rotation.y).toBe(0);
    expect(shop.root.getObjectByName('Eyes')!.scale.y).toBe(1);
    shop.dispose();
  });

  it('disposes owned Kenney instance wrappers while retaining the shared model and texture', async () => {
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    const sourceGeo = vi.spyOn(geometry, 'dispose');
    const sourceMat = vi.spyOn(material, 'dispose');
    const sourceTexture = vi.spyOn(texture, 'dispose');
    vi.mocked(kenneyModel).mockResolvedValueOnce({ geometry, material, plain: null });
    const shop = createMarketShop(buildLayout(11, 4), { loadKeeper: async () => keeper() });
    await shop.ready;
    const instance = shop.root.children.find((o) => o instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
    expect(instance).toBeDefined();
    const instanceGeo = vi.spyOn(instance.geometry, 'dispose');
    const instanceMat = vi.spyOn(instance.material as THREE.Material, 'dispose');
    shop.dispose();
    expect(instanceGeo).toHaveBeenCalledOnce();
    expect(instanceMat).toHaveBeenCalledOnce();
    expect(sourceGeo).not.toHaveBeenCalled();
    expect(sourceMat).not.toHaveBeenCalled();
    expect(sourceTexture).not.toHaveBeenCalled();
  });

  it('does not duplicate Ollie or the replaced stall after repeated theme switches', () => {
    const plaza = bakeStatic(buildPlaza(buildLayout(11, 4)));
    const shop = plaza.getObjectByName('marketShop')!;
    expect(shop).toBeDefined();
    expect(plaza.userData.marketShopReady).toBeInstanceOf(Promise);
    const normal = plaza.getObjectByName('normalSeasonPlaza')!;
    expect(normal.children.filter((o) => o.name === 'decorMarketStall')).toHaveLength(2);
    for (let i = 0; i < 5; i++) {
      plaza.userData.setSeasonTheme('halloween');
      expect(shop.visible).toBe(true);
      expect(plaza.getObjectByName('halloweenStalls')!.children).toHaveLength(2);
      plaza.userData.setSeasonTheme('normal');
    }
    const shops: THREE.Object3D[] = [];
    plaza.traverse((o) => {
      if (o.name === 'marketShop') shops.push(o);
    });
    expect(shops).toEqual([shop]);
    plaza.userData.disposeMarketShop();
  });

  it.each(['tal', 'bach_norden', 'fluss_mitte'])(
    'uses a clear deterministic placement in %s for both seeds',
    (map) => {
      for (const seed of [11, 91]) {
        const layout = buildLayout(seed, 34, map);
        const p = marketShopPlacement(layout);
        expect(p).toEqual(marketShopPlacement(buildLayout(seed, 34, map)));
        expect(p.clearance).toBeGreaterThanOrEqual(0);
        expect(Math.hypot(p.x - layout.plaza.x, p.z - layout.plaza.z)).toBeLessThan(7);
        expect(Math.hypot(p.x - layout.plaza.x, p.z - layout.plaza.z)).toBeGreaterThan(
          2.3 + MARKET_SHOP_RADIUS,
        );
        for (let i = 0; i < 3; i++)
          if (i !== p.replacesStall) {
            const a = layout.map.boardAngle + DECOR_STALL_OFFSETS[i];
            expect(
              Math.hypot(p.x - layout.plaza.x - Math.cos(a) * 5, p.z - layout.plaza.z - Math.sin(a) * 5),
            ).toBeGreaterThan(MARKET_SHOP_RADIUS + 1.55);
          }
        for (const plot of layout.plots)
          expect(Math.hypot(p.x - plot.x, p.z - plot.z)).toBeGreaterThan(plot.rad + MARKET_SHOP_RADIUS);
        for (const sample of layout.laneSamples)
          expect(Math.hypot(p.x - sample.x, p.z - sample.z)).toBeGreaterThan(MARKET_SHOP_RADIUS + 1.1);
      }
    },
  );

  it.each(['tal', 'bach_norden', 'fluss_mitte'])(
    'finds a safe permanent location across 100 valid seeds in %s',
    (map) => {
      for (let seed = 1; seed <= 100; seed++) {
        const placement = marketShopPlacement(buildLayout(seed, 34, map));
        expect(placement.clearance, `${map} seed ${seed}`).toBeGreaterThanOrEqual(0);
      }
    },
    30000,
  );

  it('ignores late loads and never disposes shared keeper assets', async () => {
    let resolve!: (root: THREE.Object3D) => void;
    const source = keeper();
    const mesh = source.children.find((o) => o instanceof THREE.Mesh) as THREE.Mesh;
    const geo = vi.spyOn(mesh.geometry, 'dispose');
    const mat = vi.spyOn(mesh.material as THREE.Material, 'dispose');
    const shop = createMarketShop(buildLayout(11, 4), {
      loadKeeper: () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    shop.dispose();
    shop.dispose();
    resolve(source);
    await shop.ready;
    expect(shop.root.children).toHaveLength(0);
    expect(geo).not.toHaveBeenCalled();
    expect(mat).not.toHaveBeenCalled();
    shop.update(0.1, 5, false);
    expect(shop.root.children).toHaveLength(0);
  });
});
