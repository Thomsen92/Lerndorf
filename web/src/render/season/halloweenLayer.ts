/** Seasonal dressing of the current layout, never a second world or a replacement plot. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Layout } from '../../world/layout';
import { createRng } from '../../world/rng';
import { kenneyModel, type KenneyModel, type Pack } from '../kenney';
import { createBloodFountain } from './bloodFountain';
import { placePlotBorderDecor, publicDecorAllowed } from './placement';

export interface HalloweenLayer {
  root: THREE.Group;
  ready: Promise<void>;
  update(dt: number, elapsed: number, reducedMotion: boolean): void;
  dispose(): void;
}
interface Placement {
  x: number;
  y: number;
  z: number;
  h: number;
  rot: number;
}
interface Actor {
  root: THREE.Group;
  legs: THREE.Group[];
  x: number;
  z: number;
  phase: number;
  kind: string;
}

export function createHalloweenLayer(layout: Layout): HalloweenLayer {
  const root = new THREE.Group();
  root.name = 'halloweenLayer';
  root.userData.bakeStatic = false;
  root.userData.assetFailures = [] as string[];
  const rng = createRng(layout.seed * 131 + 311026);
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>();
  const actors: Actor[] = [],
    pending: Promise<void>[] = [];
  const instanceBuffers = new Set<THREE.InstancedMesh>();
  let disposed = false;
  function geo<T extends THREE.BufferGeometry>(g: T): T {
    geometries.add(g);
    return g;
  }
  function mat(color: string): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true });
    materials.add(m);
    return m;
  }
  const wood = mat('#644936'),
    stone = mat('#85839a'),
    iron = mat('#444451'),
    orange = mat('#d7833d');
  const warm = new THREE.MeshBasicMaterial({ color: '#ffc56b', toneMapped: false });
  materials.add(warm);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function shape(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, ry = 0): void {
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    const flat = g.index ? g.toNonIndexed() : g;
    if (flat !== g) g.dispose();
    for (const key of Object.keys(flat.attributes))
      if (!['position', 'normal'].includes(key)) flat.deleteAttribute(key);
    const list = batches.get(m) ?? [];
    list.push(flat);
    batches.set(m, list);
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    ry = 0,
  ): void {
    shape(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
  }
  function beam(a: THREE.Vector3, b: THREE.Vector3, r: number): void {
    const delta = b.clone().sub(a),
      g = new THREE.CylinderGeometry(r, r, delta.length(), 5);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()),
    );
    const mid = a.clone().add(b).multiplyScalar(0.5);
    shape(g, wood, mid.x, mid.y, mid.z);
  }
  function instances(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    placements: Placement[],
    height = 1,
  ): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(g, m, placements.length),
      obj = new THREE.Object3D();
    instanceBuffers.add(mesh);
    placements.forEach((p, i) => {
      obj.position.set(p.x, p.y, p.z);
      obj.rotation.set(0, p.rot, 0);
      obj.scale.setScalar(p.h / height);
      obj.updateMatrix();
      mesh.setMatrixAt(i, obj.matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }
  /** Cached Kenney GPU data is borrowed. Only instance buffers belong to this layer. */
  function asset(pack: Pack, name: string, positions: Placement[], fallback?: THREE.Object3D): void {
    pending.push(
      kenneyModel(pack, name)
        .then((model) => {
          if (disposed) return;
          if (!model) {
            root.userData.assetFailures.push(`${pack}/${name}`);
            return;
          }
          model.geometry.computeBoundingBox();
          const bounds = model.geometry.boundingBox!,
            size = bounds.getSize(new THREE.Vector3());
          const norm = new THREE.Matrix4().makeTranslation(
            -(bounds.min.x + bounds.max.x) / 2,
            -bounds.min.y,
            -(bounds.min.z + bounds.max.z) / 2,
          );
          const mesh = new THREE.InstancedMesh(model.geometry, model.material, positions.length),
            obj = new THREE.Object3D();
          instanceBuffers.add(mesh);
          positions.forEach((p, i) => {
            obj.position.set(p.x, p.y, p.z);
            obj.rotation.set(0, p.rot, 0);
            obj.scale.setScalar(p.h / size.y);
            obj.updateMatrix();
            mesh.setMatrixAt(i, obj.matrix.clone().multiply(norm));
          });
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          root.add(mesh);
          fallback?.removeFromParent();
        })
        .catch(() => {
          if (!disposed) root.userData.assetFailures.push(`${pack}/${name}`);
        }),
    );
  }

  const border = placePlotBorderDecor(layout);
  const pumpkins: Placement[] = border.filter((p) => p.kind === 'pumpkin').map((p) => ({ ...p, h: 0.7 }));
  const lampPositions: Placement[] = border.filter((p) => p.kind === 'lantern').map((p) => ({ ...p, h: 1 }));
  const graves: Placement[] = [];
  // Preserve all build rectangles, river, entrances and the real lane network in every map.
  for (let n = 0; n < 140; n++) {
    const a = rng() * Math.PI * 2,
      r = 10 + rng() * 28;
    const x = layout.plaza.x + Math.cos(a) * r,
      z = layout.plaza.z + Math.sin(a) * r;
    if (!publicDecorAllowed(layout, x, z, n % 3 === 0 ? 1.1 : 0.55)) continue;
    const y = layout.terrain.groundHeight(x, z),
      rot = rng() * 6.28;
    if (n % 7 === 0 && graves.length < 14) graves.push({ x, y, z, h: 0.85 + rng() * 0.3, rot });
    else if (n % 3 === 0) {
      const h = 3 + rng() * 2.4;
      const base = new THREE.Vector3(x, y, z),
        top = new THREE.Vector3(x + 0.25, y + h, z);
      beam(base, top, 0.16);
      for (let k = 0; k < 3; k++) {
        const angle = rot + k * 2.4,
          branch = new THREE.Vector3(
            x + Math.cos(angle) * 1.1,
            y + h * (0.65 + k * 0.12),
            z + Math.sin(angle) * 0.95,
          );
        beam(new THREE.Vector3(x, y + h * (0.38 + k * 0.15), z), branch, 0.09);
        beam(branch, branch.clone().add(new THREE.Vector3(0.2, 0.7, -0.1)), 0.045);
      }
    } else if (pumpkins.length < 90) pumpkins.push({ x, y, z, h: 0.4 + rng() * 0.4, rot });
  }

  const fountain = createBloodFountain();
  fountain.root.position.set(layout.plaza.x, layout.plazaHeight + 0.1, layout.plaza.z);
  // Frame the central fountain's front with one large carved pumpkin and three candles.
  const front = layout.map.boardAngle;
  fountain.root.rotation.y = Math.PI / 2 - front;
  root.add(fountain.root);
  pumpkins.push({
    x: layout.plaza.x + Math.cos(front) * 3.25,
    z: layout.plaza.z + Math.sin(front) * 3.25,
    y: layout.plazaHeight + 0.15,
    h: 1.15,
    rot: Math.PI / 2 - front,
  });

  // The market keeps its Kenney stalls (plaza.ts shows them in season colours with pumpkins);
  // this layer only hangs two lampions at the front posts of each stall (same places, r = 5).
  for (const delta of [1.4, 2.6, 3.8]) {
    const angle = layout.map.boardAngle + delta,
      x = layout.plaza.x + Math.cos(angle) * 5.0,
      z = layout.plaza.z + Math.sin(angle) * 5.0;
    const ry = Math.atan2(layout.plaza.x - x, layout.plaza.z - z);
    for (const lx of [-1.0, 1.0]) {
      const p = new THREE.Vector3(lx, 1.85, 0.72)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), ry)
        .add(new THREE.Vector3(x, layout.plazaHeight + 0.1, z));
      lampPositions.push({ x: p.x, y: p.y, z: p.z, h: 1, rot: 0 });
    }
  }
  // Cheap, recognisable fallback pumpkins are available even offline.
  const pumpkinGeometry = geo(new THREE.IcosahedronGeometry(0.5, 1));
  pumpkinGeometry.scale(1, 0.8, 1);
  pumpkinGeometry.translate(0, 0.4, 0);
  const fallbackPumpkins = instances(pumpkinGeometry, orange, pumpkins);
  asset('graveyard', 'pumpkin-carved', pumpkins, fallbackPumpkins);
  const fallbackGraves = instances(
    geo(new THREE.BoxGeometry(0.65, 1, 0.18).translate(0, 0.5, 0)),
    stone,
    graves,
  );
  asset('graveyard', 'gravestone-round', graves, fallbackGraves);
  const lamps = instances(geo(new THREE.SphereGeometry(0.22, 8, 5)), warm, lampPositions);
  lamps.castShadow = false;
  // Lamps at plot edges have short iron stakes; market lampions hang from the awning posts.
  border
    .filter((p) => p.kind === 'lantern')
    .forEach((p) => box(p.x, p.y + 0.55, p.z, 0.065, 1.1, 0.065, iron));
  lampPositions.forEach((p, i) => {
    if (i < border.filter((b) => b.kind === 'lantern').length) p.y += 1.15;
  });
  // Rebuild after the height offset so the pumpkin-side lanterns stand above the ground.
  const dummy = new THREE.Object3D();
  lampPositions.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    lamps.setMatrixAt(i, dummy.matrix);
  });

  // Static primitives are merged by material, including all dead branches and market details.
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(geo(mergeGeometries(parts)!), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    parts.forEach((p) => p.dispose());
  }

  const actorKinds = [
    'character-zombie',
    'character-skeleton',
    'character-vampire',
    'character-keeper',
    'character-zombie',
  ];
  actorKinds.forEach((kind, i) => {
    const angle = layout.map.boardAngle + 0.7 + i * 1.2,
      r = 4.1;
    pending.push(
      kenneyModel('graveyard', kind)
        .then((model) => {
          if (!model || disposed) {
            if (!disposed) root.userData.assetFailures.push(kind);
            return;
          }
          addActor(
            model,
            kind,
            layout.plaza.x + Math.cos(angle) * r,
            layout.plaza.z + Math.sin(angle) * r,
            i * 1.4,
          );
        })
        .catch(() => {
          if (!disposed) root.userData.assetFailures.push(kind);
        }),
    );
  });
  function addActor(model: KenneyModel, kind: string, x: number, z: number, phase: number): void {
    const body = new THREE.Group(),
      legs = [new THREE.Group(), new THREE.Group()],
      h = 1.5;
    body.name = kind;
    model.geometry.computeBoundingBox();
    const bounds = model.geometry.boundingBox!,
      size = bounds.getSize(new THREE.Vector3()),
      scale = h / size.y;
    const normalized = model.geometry.index ? model.geometry.toNonIndexed() : model.geometry.clone();
    normalized.translate(
      -(bounds.min.x + bounds.max.x) / 2,
      -bounds.min.y,
      -(bounds.min.z + bounds.max.z) / 2,
    );
    normalized.scale(scale, scale, scale);
    const p = normalized.getAttribute('position'),
      triangles: number[][] = [[], [], []];
    legs.forEach((leg, i) => {
      leg.position.set((i ? 1 : -1) * h * 0.13, h * 0.4, 0);
      body.add(leg);
    });
    for (let i = 0; i < p.count; i += 3) {
      const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
        lx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      triangles[y < h * 0.39 ? (lx < 0 ? 1 : 2) : 0].push(i, i + 1, i + 2);
    }
    triangles.forEach((indices, i) => {
      if (!indices.length) return;
      const part = geo(normalized.clone());
      part.setIndex(indices);
      if (i) part.translate(-legs[i - 1].position.x, -legs[i - 1].position.y, 0);
      const mesh = new THREE.Mesh(part, model.material);
      mesh.castShadow = true;
      (i ? legs[i - 1] : body).add(mesh);
    });
    normalized.dispose();
    body.position.set(x, layout.plazaHeight + 0.12, z);
    root.add(body);
    actors.push({ root: body, legs, x, z, phase, kind });
  }

  // Camera-facing moon and halo, plus a single instanced veil of low drifting mist.
  function radialTexture(moon: boolean): THREE.DataTexture {
    const n = moon ? 256 : 128,
      data = new Uint8Array(n * n * 4);
    const half = n / 2;
    const craters = moon
      ? Array.from({ length: 42 }, () => ({
          x: rng() * 1.7 - 0.85,
          y: rng() * 1.7 - 0.85,
          r: 0.025 + rng() * 0.14,
        }))
      : [];
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const nx = (x - half) / (half - 1),
          ny = (y - half) / (half - 1);
        const r = Math.hypot(nx, ny),
          k = (y * n + x) * 4;
        if (moon) {
          const light = Math.max(0, 1 - Math.hypot(nx + 0.35, ny + 0.35) * 0.53);
          let shade = 0.98 + (rng() - 0.5) * 0.045;
          for (const crater of craters) {
            const d = Math.hypot(nx - crater.x, ny - crater.y) / crater.r;
            if (d < 1) shade *= 0.85 + 0.13 * d;
          }
          data[k] = (103 + 134 * light) * shade;
          data[k + 1] = (31 + 73 * light) * shade;
          data[k + 2] = (55 + 26 * light) * shade;
          data[k + 3] = r <= 1 ? 255 : 0;
        } else {
          data[k] = 190;
          data[k + 1] = 153;
          data[k + 2] = 167;
          data[k + 3] = Math.max(0, (1 - r) ** 2) * (r < 1 ? 150 : 0);
        }
      }
    const texture = new THREE.DataTexture(data, n, n);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    textures.add(texture);
    return texture;
  }
  const mistTexture = radialTexture(false);
  for (const halo of [true, false]) {
    const material = new THREE.SpriteMaterial({
      map: halo ? mistTexture : radialTexture(true),
      color: halo ? '#dd344b' : '#ffffff',
      transparent: true,
      opacity: halo ? 0.7 : 1,
      fog: false,
      depthWrite: false,
      toneMapped: false,
      blending: halo ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    materials.add(material);
    const moon = new THREE.Sprite(material);
    moon.name = halo ? 'bloodMoonHalo' : 'bloodMoon';
    moon.position.set(layout.plaza.x - 34, 18, layout.plaza.z - 90 + (halo ? -0.1 : 0));
    moon.scale.setScalar(halo ? 43 : 21);
    root.add(moon);
  }
  const fogMaterial = new THREE.MeshBasicMaterial({
    map: mistTexture,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  // Billboard the whole instanced veil in view space: low horizontal wisps remain visible
  // from both the overview camera and a lower market angle without eighteen sprite draws.
  fogMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vec4 mvPosition;
      #ifdef USE_INSTANCING
        mvPosition = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvPosition.xy += transformed.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
      #else
        mvPosition = modelViewMatrix * vec4(transformed, 1.0);
      #endif
      gl_Position = projectionMatrix * mvPosition;
    `,
    );
  };
  fogMaterial.customProgramCacheKey = () => 'halloween-low-mist-v1';
  materials.add(fogMaterial);
  const fog = new THREE.InstancedMesh(geo(new THREE.PlaneGeometry(1, 1)), fogMaterial, 18);
  instanceBuffers.add(fog);
  fog.name = 'lowMist';
  fog.frustumCulled = false;
  root.add(fog);
  const wisps = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2,
      r = 9 + rng() * 23;
    const x = layout.plaza.x + Math.cos(a) * r,
      z = layout.plaza.z + Math.sin(a) * r;
    return { x, z, y: layout.terrain.groundHeight(x, z) + 0.7, width: 11 + rng() * 12, phase: rng() * 6.28 };
  });
  const lampColor = new THREE.Color('#ffc56b');
  function update(_dt: number, elapsed: number, reducedMotion: boolean): void {
    if (disposed) return;
    const t = reducedMotion ? 0 : elapsed;
    fountain.update(t, reducedMotion);
    actors.forEach((actor) => {
      const path = t * 0.1 + actor.phase,
        step = t * 1.65 + actor.phase,
        shuffling = actor.kind.includes('zombie') || actor.kind.includes('skeleton');
      actor.root.position.set(
        actor.x + (reducedMotion ? 0 : Math.sin(path) * 0.65),
        layout.plazaHeight + 0.12 - (reducedMotion ? 0 : Math.abs(Math.sin(step)) * 0.009),
        actor.z + (reducedMotion ? 0 : Math.cos(path) * 0.35),
      );
      actor.root.rotation.set(
        reducedMotion ? 0 : shuffling ? 0.1 : 0.025,
        reducedMotion ? actor.phase : Math.atan2(Math.cos(path) * 0.65, -Math.sin(path) * 0.35),
        reducedMotion ? 0 : Math.sin(step) * 0.025,
      );
      actor.legs.forEach((leg, i) => {
        leg.rotation.x = reducedMotion
          ? 0
          : Math.sin(step + i * Math.PI) * (shuffling ? (i ? 0.065 : 0.19) : 0.12);
      });
    });
    lampPositions.forEach((_, i) =>
      lamps.setColorAt(
        i,
        lampColor
          .clone()
          .multiplyScalar(
            reducedMotion ? 1 : 0.91 + Math.sin(t * 3.1 + i) * 0.055 + Math.sin(t * 7.3 + i * 4) * 0.025,
          ),
      ),
    );
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
    wisps.forEach((w, i) => {
      dummy.position.set(w.x + Math.sin(t * 0.08 + w.phase) * (reducedMotion ? 0 : 1.4), w.y, w.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(w.width, 1.5 + 0.4 * Math.sin(w.phase), 1);
      dummy.updateMatrix();
      fog.setMatrixAt(i, dummy.matrix);
    });
    fog.instanceMatrix.needsUpdate = true;
  }
  update(0, 0, true);
  return {
    root,
    ready: Promise.all(pending).then(() => undefined),
    update,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      fountain.dispose();
      // Only resources registered as owned are disposed. Kenney cache data remains reusable.
      instanceBuffers.forEach((mesh) => mesh.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      root.clear();
      root.removeFromParent();
    },
  };
}
