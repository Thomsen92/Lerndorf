import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Layout } from '../world/layout';
import { dist, segmentDistance, type Point2 } from '../world/geometry';
import { PLAZA_RADIUS } from '../world/constants';
import { instancedModel, kenneyModel, type KenneyModel } from './kenney';

export const DECOR_STALL_OFFSETS = [1.4, 2.6, 3.8] as const;
/** Conservative footprint including Ollie in front of the counter. */
export const MARKET_SHOP_RADIUS = 1.8;
export interface MarketShopPlacement extends Point2 {
  face: number;
  replacesStall: number;
  /** Smallest free gap after all reserved footprints and access widths. */
  clearance: number;
}

const at = (layout: Layout, angle: number, radius: number): Point2 => ({
  x: layout.plaza.x + Math.cos(angle) * radius,
  z: layout.plaza.z + Math.sin(angle) * radius,
});

/** Choose a clear replacement near an existing stall, never a fixed world coordinate. */
export function marketShopPlacement(layout: Layout): MarketShopPlacement {
  const boardFace = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  // Keep the same reserved Sir Byte position as mascot/marketByte.marketPose.
  const byte = {
    x: layout.board.x - 3.5 * Math.cos(boardFace) + Math.sin(boardFace),
    z: layout.board.z + 3.5 * Math.sin(boardFace) + Math.cos(boardFace),
  };
  const obstacles: Array<[Point2, number]> = [
    [layout.plaza, 2.3],
    [layout.board, 2.1],
    [byte, 1.1],
    [at(layout, layout.map.boardAngle + 5.1, 7.6), 2.8],
    ...layout.map.benchAngles.map((a) => [at(layout, a, PLAZA_RADIUS - 0.4), 0.95] as [Point2, number]),
    [at(layout, layout.map.benchAngles[0] + 0.7, PLAZA_RADIUS - 1.2), 0.6],
    [at(layout, layout.map.benchAngles[2] - 0.6, PLAZA_RADIUS - 1.2), 0.6],
    ...layout.plots.map((p) => [p, p.rad] as [Point2, number]),
  ];
  let best: MarketShopPlacement | undefined;
  for (let replacesStall = 0; replacesStall < DECOR_STALL_OFFSETS.length; replacesStall++) {
    const otherStalls = DECOR_STALL_OFFSETS.flatMap((a, i) =>
      i === replacesStall ? [] : [[at(layout, layout.map.boardAngle + a, 5), 1.55] as [Point2, number]],
    );
    for (const radius of [5, 5.3, 5.6, 5.9, 6.1]) {
      for (const offset of [0, -0.15, 0.15, -0.3, 0.3, -0.45, 0.45, -0.6, 0.6]) {
        const p = at(layout, layout.map.boardAngle + DECOR_STALL_OFFSETS[replacesStall] + offset, radius);
        let clearance = Math.min(
          ...[...obstacles, ...otherStalls].map(([o, r]) => dist(p, o) - r - MARKET_SHOP_RADIUS),
        );
        // Samples are 1.2 m apart: reserve the complete lane width, including between samples.
        for (const sample of layout.laneSamples)
          clearance = Math.min(clearance, dist(p, sample) - MARKET_SHOP_RADIUS - 1.3);
        // Reserve the approach from each plaza lane endpoint to the inner circulation area.
        for (const lane of layout.map.lanes)
          for (const end of [lane[0], lane[lane.length - 1]]) {
            const d = dist(end, layout.plaza);
            if (d > PLAZA_RADIUS + 3) continue;
            const inner = {
              x: layout.plaza.x + ((end.x - layout.plaza.x) * 3.3) / d,
              z: layout.plaza.z + ((end.z - layout.plaza.z) * 3.3) / d,
            };
            clearance = Math.min(clearance, segmentDistance(p.x, p.z, end, inner) - MARKET_SHOP_RADIUS - 1.1);
          }
        const candidate = {
          ...p,
          face: Math.atan2(layout.plaza.x - p.x, layout.plaza.z - p.z),
          replacesStall,
          clearance,
        };
        if (!best || clearance > best.clearance) best = candidate;
      }
    }
  }
  if (!best || best.clearance < 0) throw new Error(`No clear market shop placement for ${layout.map.id}`);
  return best;
}

export interface MarketShop {
  root: THREE.Group;
  ready: Promise<void>;
  update(dt: number, elapsed: number, reducedMotion: boolean): void;
  dispose(): void;
}

// Immutable source is loaded once; each village clones only the animation hierarchy.
let keeperSource: Promise<THREE.Object3D> | undefined;
function loadKeeper(): Promise<THREE.Object3D> {
  keeperSource ??= new GLTFLoader()
    .loadAsync(`${import.meta.env.BASE_URL}assets/shopkeeper/ollie-shopkeeper.glb`)
    .then((gltf) => gltf.scene);
  return keeperSource;
}

/** Permanent display only. All purchase and tap policy belongs to the player view. */
export function createMarketShop(
  layout: Layout,
  opts: { loadKeeper?: () => Promise<THREE.Object3D> } = {},
): MarketShop {
  const root = new THREE.Group();
  root.name = 'marketShop';
  root.userData.bakeStatic = false;
  const placement = marketShopPlacement(layout);
  root.userData.placement = placement;
  root.position.set(placement.x, layout.plazaHeight + 0.1, placement.z);
  root.rotation.y = placement.face;
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const ownedMaterials = new Set<THREE.Material>();
  const ownedTextures = new Set<THREE.Texture>();
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a36', roughness: 0.88, flatShading: true });
  const teal = new THREE.MeshStandardMaterial({ color: '#347b78', roughness: 0.88, flatShading: true });
  ownedMaterials.add(wood);
  ownedMaterials.add(teal);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    host: THREE.Object3D,
  ): THREE.Mesh {
    ownedGeometries.add(geometry);
    const result = new THREE.Mesh(geometry, material);
    result.position.set(x, y, z);
    result.castShadow = result.receiveShadow = true;
    result.userData.kind = 'marketShop';
    host.add(result);
    return result;
  }
  const fallback = new THREE.Group();
  fallback.name = 'marketShopFallback';
  mesh(new THREE.BoxGeometry(2.3, 0.82, 0.8), wood, 0, 0.41, -0.25, fallback);
  for (const x of [-1.05, 1.05]) mesh(new THREE.BoxGeometry(0.1, 2.1, 0.1), wood, x, 1.05, -0.75, fallback);
  mesh(new THREE.BoxGeometry(2.4, 0.12, 1.5), teal, 0, 2.15, -0.25, fallback);
  root.add(fallback);
  // A static sign is one small texture, no extra WebGL renderer or game loop.
  const signMaterial = new THREE.MeshBasicMaterial({ color: '#e2bd78' });
  ownedMaterials.add(signMaterial);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#28635e';
      ctx.fillRect(0, 0, 768, 160);
      ctx.strokeStyle = '#e2bd78';
      ctx.lineWidth = 5;
      ctx.strokeRect(9, 9, 750, 142);
      ctx.fillStyle = '#f5e8c8';
      ctx.font = 'bold 54px "Comic Neue", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OLLIE’S ODDS & ENDS', 384, 82);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      ownedTextures.add(texture);
      signMaterial.map = texture;
      signMaterial.color.set('#ffffff');
    }
  }
  mesh(new THREE.BoxGeometry(2.3, 0.48, 0.07), signMaterial, 0, 2.85, 0.15, root);
  const pivot = new THREE.Group();
  pivot.name = 'olliePivot';
  pivot.position.set(0.55, 0, 1);
  pivot.rotation.y = -0.14;
  pivot.scale.setScalar(0.8);
  root.add(pivot);
  let disposed = false;
  let keeper: THREE.Object3D | undefined;
  let head: THREE.Object3D | undefined;
  let eyes: THREE.Object3D | undefined;
  let armL: THREE.Object3D | undefined;
  let armR: THREE.Object3D | undefined;
  function addBorrowed(
    model: KenneyModel,
    matrix: THREE.Matrix4 | THREE.Matrix4[],
    tint?: THREE.Color,
  ): void {
    const result = instancedModel(
      model,
      Array.isArray(matrix) ? matrix : [matrix],
      tint ? [tint] : undefined,
    );
    ownedGeometries.add(result.geometry);
    for (const material of Array.isArray(result.material) ? result.material : [result.material])
      ownedMaterials.add(material);
    result.userData.kind = 'marketShop';
    root.add(result);
  }
  const standReady = Promise.all([
    kenneyModel('town', 'stall-green'),
    kenneyModel('town', 'lantern'),
    kenneyModel('survival', 'barrel'),
    kenneyModel('food', 'apple'),
    kenneyModel('food', 'loaf-round'),
  ])
    .then(([stand, lantern, barrel, apple, bread]) => {
      if (disposed) return;
      if (stand) {
        const matrix = new THREE.Matrix4()
          .makeRotationY(Math.PI / 2)
          .scale(new THREE.Vector3(2.15, 2.15, 2.15))
          .setPosition(0, 0, -0.25);
        addBorrowed(stand, matrix, new THREE.Color('#347b78'));
        fallback.removeFromParent();
      }
      if (lantern)
        addBorrowed(lantern, new THREE.Matrix4().makeScale(0.65, 0.65, 0.65).setPosition(-0.95, 0.84, -0.15));
      if (barrel)
        addBorrowed(barrel, new THREE.Matrix4().makeScale(1.8, 1.8, 1.8).setPosition(1.05, 0, -0.6));
      if (apple)
        addBorrowed(
          apple,
          [-0.65, -0.35].map((x) => new THREE.Matrix4().makeScale(1.4, 1.4, 1.4).setPosition(x, 0.76, 0.1)),
        );
      if (bread) addBorrowed(bread, new THREE.Matrix4().makeScale(0.7, 0.7, 0.7).setPosition(0.2, 0.76, 0.1));
    })
    .catch(() => {
      /* Keep the useful loading fallback. */
    });
  const keeperReady = (opts.loadKeeper ?? loadKeeper)()
    .then((source) => {
      if (disposed) return;
      keeper = source.clone(true);
      keeper.name = 'Ollie_Shopkeeper';
      keeper.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = o.receiveShadow = true;
          o.userData.kind = 'marketShop';
        }
      });
      head = keeper.getObjectByName('Head');
      eyes = keeper.getObjectByName('Eyes');
      armL = keeper.getObjectByName('Arm_L');
      armR = keeper.getObjectByName('Arm_R');
      pivot.add(keeper);
      root.userData.assetReady = true;
    })
    .catch(() => {
      if (!disposed) root.userData.assetError = true;
    });
  return {
    root,
    ready: Promise.all([standReady, keeperReady]).then(() => undefined),
    update(_dt, elapsed, reducedMotion) {
      if (disposed || !keeper) return;
      keeper.position.y = reducedMotion ? 0 : Math.sin(elapsed * 1.6) * 0.012;
      if (head) {
        head.rotation.y = reducedMotion ? 0 : Math.sin(elapsed * 0.7) * 0.07;
        head.rotation.z = reducedMotion ? 0 : Math.sin(elapsed * 0.9) * 0.025;
      }
      if (eyes) eyes.scale.y = !reducedMotion && elapsed % 4.7 > 4.57 ? 0.09 : 1;
      if (armL) armL.rotation.z = 0.1;
      if (armR) armR.rotation.z = -0.1;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.clear();
      root.removeFromParent();
      ownedGeometries.forEach((g) => g.dispose());
      ownedMaterials.forEach((m) => m.dispose());
      ownedTextures.forEach((t) => t.dispose());
      ownedGeometries.clear();
      ownedMaterials.clear();
      ownedTextures.clear();
    },
  };
}
