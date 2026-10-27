import * as T from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { createFountainEffects } from './fountain.js';
import { createExamplePlot } from './plot.js';

export const SEED = 131026;
export function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
    n = n + Math.imul(n ^ n >>> 7, 61 | n) ^ n;
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

export const ASSETS = {
  pumpkin: 'kenney/graveyard/pumpkin.glb', carved: 'kenney/graveyard/pumpkin-carved.glb',
  headstone: 'kenney/graveyard/gravestone-round.glb', lantern: 'kenney/graveyard/lantern-candle.glb',
  candles: 'kenney/graveyard/candle-multiple.glb', candle: 'kenney/graveyard/candle.glb', fence: 'kenney/graveyard/fence-damaged.glb',
  rubble: 'kenney/graveyard/debris.glb', bowl: 'kenney/graveyard/detail-bowl.glb',
  zombie: 'kenney/graveyard/character-zombie.glb', skeleton: 'kenney/graveyard/character-skeleton.glb',
  vampire: 'kenney/graveyard/character-vampire.glb', keeper: 'kenney/graveyard/character-keeper.glb',
  bench: 'kenney/graveyard/bench.glb', iron: 'kenney/graveyard/iron-fence.glb',
  grave: 'kenney/graveyard/grave.glb', pine: 'kenney/graveyard/pine-crooked.glb',
  stall: 'kenney/town/stall-green.glb', fountain: 'kenney/town/fountain-round-detail.glb',
  rock: 'kenney/town/rock-small.glb', tree: 'season1/jack-o-lantern-tree.glb',
  cauldron: 'season1/kit-cauldron.glb', cat: 'season1/spooky-pumpkin-cat.glb',
  candy: 'season1/candy-pile.glb',
};

const UP = new T.Vector3(0, 1, 0);
const object = new T.Object3D();
function matrix(x, y, z, sx = 1, sy = sx, sz = sx, ry = 0, rz = 0) {
  object.position.set(x, y, z); object.rotation.set(0, ry, rz); object.scale.set(sx, sy, sz);
  object.updateMatrix(); return object.matrix.clone();
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function radialTexture(color = '255,190,110') {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, `rgba(${color},.55)`); g.addColorStop(.3, `rgba(${color},.28)`);
    g.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });
}

export function buildWorld(scene, templates) {
  const random = seeded(SEED), batches = new Map(), copies = new Map(), assetCounts = {};
  const actors = [], glowPositions = [], pools = [], shadowSpots = [], placements = [];
  const materials = {
    wood: standard('#8a5a36'), darkwood: standard('#644936'), trim: standard('#ba8352'),
    stone: standard('#85839a'), paving: standard('#aaa092'), earth: standard('#524a58'),
    iron: standard('#444451'), orange: standard('#d7833d'), cream: standard('#e5dac2'),
    purple: standard('#75618b'), teal: standard('#537a77'), leaf: standard('#84744d'),
    warm: new T.MeshBasicMaterial({ color: '#ffc56b' }),
    water: new T.MeshStandardMaterial({ color: '#9f2635', emissive: '#aa1d2c', emissiveIntensity: .24, roughness: .22 }),
    ritual: new T.MeshBasicMaterial({ color: '#c34b51', transparent: true, opacity: .55, depthWrite: false }),
  };
  const box = new T.BoxGeometry(1, 1, 1), cylinder = new T.CylinderGeometry(1, 1, 1, 12);
  function standard(color) { return new T.MeshStandardMaterial({ color, roughness: .88, flatShading: true }); }
  function geometry(geo, material, transform) {
    const g = geo.clone().applyMatrix4(transform);
    if (g.index) { const non = g.toNonIndexed(); g.dispose(); return geometryReady(non, material); }
    geometryReady(g, material);
  }
  function geometryReady(g, material) {
    // All primitive batches use the same attributes, including cones/rings.
    if (!g.getAttribute('uv')) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g);
  }
  function cube(x, y, z, w, h, d, mat = materials.wood, ry = 0) { geometry(box, mat, matrix(x, y, z, w, h, d, ry)); }
  function beam(a, b, radius, mat = materials.wood) {
    const av = new T.Vector3(...a), bv = new T.Vector3(...b), delta = bv.clone().sub(av);
    const q = new T.Quaternion().setFromUnitVectors(UP, delta.clone().normalize());
    geometry(cylinder, mat, new T.Matrix4().compose(av.add(bv).multiplyScalar(.5), q, new T.Vector3(radius, delta.length(), radius)));
  }
  function asset(key, x, z, height, rotation = 0, y = .07, variant = '') {
    const source = templates.get(key), s = height / source.size.y;
    const norm = new T.Matrix4().makeTranslation(-source.center.x, -source.minY, -source.center.z);
    const world = matrix(x, y, z, s, s, s, rotation).multiply(norm);
    const id = `${key}:${variant}`;
    if (!copies.has(id)) copies.set(id, { key, variant, matrices: [] });
    copies.get(id).matrices.push(world); assetCounts[key] = (assetCounts[key] || 0) + 1;
    placements.push([key, x, y, z, height, rotation]);
    return { size: source.size.clone().multiplyScalar(s), world };
  }
  function label(text, x, y, z, width, height, rotation = 0, sub = '') {
    const texture = canvasTexture(1024, 256, (ctx) => {
      ctx.fillStyle = '#694a39'; ctx.fillRect(0, 0, 1024, 256);
      ctx.strokeStyle = '#b88953'; ctx.lineWidth = 8; ctx.strokeRect(12, 12, 1000, 232);
      ctx.fillStyle = '#edc48a'; ctx.textAlign = 'center';
      ctx.font = `bold ${sub ? 62 : 76}px "Comic Neue", sans-serif`;
      ctx.fillText(text, 512, sub ? 110 : 155, 940);
      if (sub) { ctx.font = '34px "Comic Neue", sans-serif'; ctx.fillStyle = '#ecdfc9'; ctx.fillText(sub, 512, 184, 930); }
      for (const xx of [35, 989]) for (const yy of [35, 221]) { ctx.fillStyle = '#d6ae72'; ctx.beginPath(); ctx.arc(xx, yy, 4, 0, 7); ctx.fill(); }
    });
    texture.anisotropy = 4;
    const m = new T.MeshStandardMaterial({ map: texture, roughness: 1, emissive: '#d1a177', emissiveIntensity: .19 });
    const sign = new T.Mesh(new T.PlaneGeometry(width, height), m); sign.position.set(x, y, z); sign.rotation.y = rotation;
    scene.add(sign); return sign;
  }

  // A faceted woodland floor, with a clear central ring and open entrance.
  const terrain = new T.RingGeometry(0, 55, 96, 18).toNonIndexed();
  terrain.rotateX(-Math.PI / 2);
  const pos = terrain.getAttribute('position'), colors = [];
  for (let i = 0; i < pos.count; i += 3) {
    const shade = new T.Color('#596350').multiplyScalar(.85 + random() * .25);
    for (let k = 0; k < 3; k++) { colors.push(shade.r, shade.g, shade.b); }
  }
  terrain.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  const terrainMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, transparent: true, depthWrite: false });
  terrainMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vFloor;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloor = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 vFloor;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= 1.0 - smoothstep(35.0, 53.0, length(vFloor.xz));');
  };
  const floor = new T.Mesh(terrain, terrainMaterial);
  floor.position.y = -.12; floor.receiveShadow = true; scene.add(floor);
  geometry(new T.CylinderGeometry(12.4, 12.7, .25, 64), materials.stone, matrix(0, -.08, 0));
  geometry(new T.CylinderGeometry(12.05, 12.05, .08, 64), materials.paving, matrix(0, .065, 0));
  for (const r of [2.6, 4.4, 6.2, 8, 9.8, 11.6]) {
    const ring = new T.RingGeometry(r, r + .035, 80); ring.rotateX(-Math.PI / 2);
    geometry(ring, materials.stone, matrix(0, .111, 0));
  }
  // Individually offset pavers at the outside and small radial joints.
  for (let i = 0; i < 84; i++) {
    const a = i / 84 * Math.PI * 2;
    cube(Math.sin(a) * 12.22, .11, Math.cos(a) * 12.22, .7, .18, .3, materials.stone, a);
  }
  for (let ring = 0; ring < 5; ring++) {
    const r = 3.5 + ring * 1.8, count = 20 + ring * 6;
    for (let i = 0; i < count; i++) {
      const a = (i + (ring % 2) * .5) / count * Math.PI * 2;
      cube(Math.sin(a) * r, .115, Math.cos(a) * r, .025, .006, 1.65, materials.stone, a);
    }
  }
  for (let i = 0; i < 16; i++) {
    const z = 12.7 + i * .65, x = Math.sin(i * .16) * .55;
    cube(x, -.015, z, 3.4, .05, .7, i % 3 ? materials.paving : materials.stone, Math.sin(i) * .035);
  }

  // Stone fountain: a seasonal centrepiece, the village silhouette retained.
  const fountainHeight = 1.72;
  const fountainSize = asset('fountain', 0, 1, fountainHeight, 0);
  const fountainScale = fountainHeight / templates.get('fountain').size.y;
  const waterY = .07 + .14 * fountainScale;
  const candles = [
    { x: -.82, z: 7.1, height: .58 },
    { x: 0, z: 7.55, height: .76 },
    { x: .82, z: 7.1, height: .48 },
  ];
  asset('carved', 0, 5.55, 1.95, .45, .15);
  pools.push([0, .14, 1, 8.4], [0, .145, 6.6, 4.3]);
  shadowSpots.push([0, .12, 1, fountainSize.size.x * 1.05], [0, .145, 5.55, 2.7]);
  for (const candle of candles) {
    asset('candle', candle.x, candle.z, candle.height, 0, .15);
    candle.flameY = .15 + candle.height;
    glowPositions.push([candle.x, candle.flameY, candle.z]);
  }
  // A restrained red seal and three candles frame the pumpkin at the front.
  for (const [inner, outer] of [[1.83, 1.88], [1.56, 1.58]]) {
    const seal = new T.RingGeometry(inner, outer, 64); seal.rotateX(-Math.PI / 2);
    geometry(seal, materials.ritual, matrix(0, .134, 6.15));
  }
  const sealPoints = Array.from({ length: 5 }, (_, i) => {
    const a = i / 5 * Math.PI * 2;
    return [Math.sin(a) * 1.48, .139, 6.15 + Math.cos(a) * 1.48];
  });
  sealPoints.forEach((p, i) => beam(p, sealPoints[(i + 2) % 5], .018, materials.ritual));
  const upperWaterY = .07 + .38 * fountainScale;
  const fountain = createFountainEffects(scene, { originY: upperWaterY + .012, waterY, waterMaterial: materials.water, candles });
  for (let i = 0; i < 6; i++) {
    const a = [.9, 1.65, 2.5, 3.3, 4.1, 5.15][i];
    asset(i % 2 ? 'pumpkin' : 'carved', Math.sin(a) * 4.15, 1 + Math.cos(a) * 4.15, .42 + random() * .18, a);
  }

  const stalls = [
    { x: -1, z: -8.4, height: 5.1, name: 'Season I – Halloween', sub: 'Welcome to the pumpkin stall', color: 'orange' },
    { x: -8.1, z: -1.4, height: 3.9, name: 'Moonlit potions', color: 'purple' },
    { x: 7.7, z: -3.6, height: 4.0, name: 'Sweet little spells', color: 'teal' },
    { x: 7.6, z: 6.5, height: 3.8, name: 'Pumpkin harvest', color: 'orange' },
  ];
  let seasonSign, seasonButton;
  for (let i = 0; i < stalls.length; i++) {
    const s = stalls[i], angle = Math.atan2(-s.x, -s.z), h = s.height;
    const result = asset('stall', s.x, s.z, h, angle, .12, s.color);
    const local = (x, y, z) => new T.Vector3(x, y, z).applyAxisAngle(UP, angle).add(new T.Vector3(s.x, .12, s.z));
    const p = local(0, h * .80, result.size.z * .5 + .045);
    const sign = label(s.name, p.x, p.y, p.z, result.size.x * .86, i ? .57 : .86, angle, s.sub);
    if (!i) {
      seasonSign = sign;
      const b = local(0, h * .29, result.size.z * .5 + .09);
      seasonButton = label('Welcome ↗', b.x, b.y, b.z, 2.0, .48, angle);
    }
    const front = local(0, 0, result.size.z * .7);
    pools.push([front.x, .15, front.z, i ? 6 : 8]); shadowSpots.push([s.x, .12, s.z, 6]);
    for (let j = 0; j < (i === 2 ? 2 : i ? 4 : 7); j++) {
      const q = local((j - (i ? 1.5 : 3)) * .48, h * .36, .36);
      asset(i === 2 ? 'candy' : 'pumpkin', q.x, q.z, i === 2 ? .42 : .4 + random() * .16, random() * 6.28, q.y);
    }
    for (const side of [-1, 1]) {
      const q = local(side * result.size.x * .48, h * .63, result.size.z * .47);
      asset('lantern', q.x, q.z, .6, angle, q.y); glowPositions.push([q.x, q.y + .28, q.z]);
      const pp = local(side * result.size.x * .65, 0, result.size.z * .45);
      asset('carved', pp.x, pp.z, .62 + random() * .25, angle);
    }
    if (i === 1) {
      const q = local(-.7, h * .36, 0); asset('cauldron', q.x, q.z, .91, 0, q.y);
      const b = local(1.0, h * .36, 0); asset('bowl', b.x, b.z, .4, 0, b.y);
    }
    if (i === 2) { const q = local(.8, 0, result.size.z * .8); asset('cat', q.x, q.z, 1.02, angle + .3); }
    // Wooden pennants under the eaves, in the same muted colours as the cloth.
    for (let j = 0; j < 7; j++) {
      const q = local((j - 3) * .56, h * .72, result.size.z * .5 + .05);
      const shape = new T.Shape(); shape.moveTo(-.15, .07); shape.lineTo(.15, .07); shape.lineTo(0, -.27); shape.closePath();
      geometry(new T.ShapeGeometry(shape), j % 2 ? materials.cream : materials[s.color], matrix(q.x, q.y, q.z, 1, 1, 1, angle));
    }
  }

  // Suspended faceted lanterns trace two curved strings across the square.
  const posts = [[-11, 5], [-10, -7], [10, -7], [12, 5]];
  for (const [x, z] of posts) {
    beam([x, 0, z], [x, 6.8, z], .085, materials.darkwood);
    geometry(new T.SphereGeometry(.15, 6, 4), materials.trim, matrix(x, 6.85, z));
  }
  const lanterns = [];
  for (const [a, b, count] of [[posts[0], posts[2], 13], [posts[1], posts[3], 13]]) {
    for (let i = 0; i < 32; i++) {
      const p = (t) => [T.MathUtils.lerp(a[0], b[0], t), 6.7 - Math.sin(t * Math.PI) * 1.35, T.MathUtils.lerp(a[1], b[1], t)];
      beam(p(i / 32), p((i + 1) / 32), .022, materials.iron);
    }
    for (let i = 1; i < count; i++) {
      const t = i / count, x = T.MathUtils.lerp(a[0], b[0], t), z = T.MathUtils.lerp(a[1], b[1], t);
      const y = 6.45 - Math.sin(t * Math.PI) * 1.35;
      beam([x, y + .25, z], [x, y + .6, z], .018, materials.iron);
      geometry(new T.CylinderGeometry(.19, .19, .12, 6), materials.iron, matrix(x, y + .20, z));
      geometry(new T.CylinderGeometry(.16, .16, .08, 6), materials.iron, matrix(x, y - .28, z));
      lanterns.push({ x, y, z, phase: random() * 6.28 }); glowPositions.push([x, y, z]);
      if (i % 3 === 1) pools.push([x, .14, z, 4.8]);
    }
  }
  const lampMaterial = new T.MeshBasicMaterial({ color: '#ffc56b', vertexColors: false, toneMapped: false, fog: false });
  const lamps = new T.InstancedMesh(new T.SphereGeometry(.28, 8, 5), lampMaterial, lanterns.length);
  lanterns.forEach((p, i) => { lamps.setMatrixAt(i, matrix(p.x, p.y, p.z, .9, 1.3, .9)); lamps.setColorAt(i, new T.Color('#ffc56b')); });
  scene.add(lamps);

  // Bare pumpkin trees reuse the delivered Season I model, with no new motif.
  for (const [x, z, h, r] of [[-14, -7, 8.2, .8], [13, -10, 8.8, -.6], [-14, 9, 6.8, 1.8], [15, 9, 7.2, 2.2]]) {
    asset('tree', x, z, h, r); shadowSpots.push([x, -.04, z, 6]); pools.push([x, .03, z, 5.5]);
  }
  // A small cemetery remains outside the trading ring.
  for (let i = 0; i < 7; i++) {
    const x = -13.7 - i % 2 * 2.4, z = -1 + Math.floor(i / 2) * 2.7;
    asset('headstone', x, z, 1.3 + random() * .4, .3 + random() * .4);
    asset('grave', x + .3, z + 1, .16, .4); shadowSpots.push([x, .015, z, 2.1]);
    if (i % 2 === 0) asset('candles', x + .7, z + .3, .43, i);
  }
  for (let i = 0; i < 6; i++) asset('iron', -17.9, -1.3 + i * 2.1, 1.15, Math.PI / 2);
  for (const [x, z, r] of [[-13, 11, .2], [-16, -4, 0], [10, 13, -.4], [16, 1, 1.5]]) asset('fence', x, z, .97, r);
  asset('bench', -5, 9.4, 1.45, -2.7); asset('bench', 4, -11.1, 1.45, .2);
  asset('rubble', -15, 12, .45, 1); asset('rubble', 17, -1, .6, 2);

  const plot = createExamplePlot(scene, { cube, beam, asset, label, materials, pools, glowPositions });
  // Dense at the square, loose woodland at the fogged edges. Seeded throughout.
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2 + (random() - .5) * .1, r = 22 + random() * 12;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (z > 14 && Math.abs(x) < 5 || plot.reserve(x, z)) continue;
    asset('pine', x, z, 4.5 + random() * 6, random() * 6.28, -.1);
  }
  for (let i = 0; i < 35; i++) {
    const a = random() * Math.PI * 2, r = 13.5 + random() * 6;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (z > 11 && Math.abs(x) < 3 || plot.reserve(x, z)) continue;
    if (i % 3 === 0) asset('rock', x, z, .25 + random() * .5, a);
    else asset(i % 2 ? 'pumpkin' : 'carved', x, z, .32 + random() * .5, a);
  }
  for (let i = 0; i < 160; i++) {
    const a = random() * Math.PI * 2, r = 12.8 + random() * 10;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (plot.reserve(x, z)) continue;
    const leaf = new T.CircleGeometry(.08 + random() * .09, 4); leaf.rotateX(-Math.PI / 2);
    geometry(leaf, i % 3 ? materials.leaf : materials.orange, matrix(x, .035, z, 1, 1, 1, a));
  }

  function actor(key, x, z, height, phase) {
    const source = templates.get(key), root = new T.Group(), legs = [new T.Group(), new T.Group()];
    const s = height / source.size.y;
    const normalized = new T.Matrix4().makeScale(s, s, s).multiply(new T.Matrix4().makeTranslation(-source.center.x, -source.minY, -source.center.z));
    legs.forEach((leg, i) => { leg.position.set((i ? 1 : -1) * height * .13, height * .40, 0); root.add(leg); });
    source.root.traverse(child => {
      if (!child.isMesh) return;
      // Kenney's static mesh is partitioned at the hips; original GLBs stay intact.
      const g = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      g.applyMatrix4(normalized.clone().multiply(child.matrixWorld));
      const p = g.getAttribute('position'), triangles = [[], [], []];
      for (let i = 0; i < p.count; i += 3) {
        const y = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
        const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
        const bucket = y < height * .39 ? (x < 0 ? 1 : 2) : 0;
        triangles[bucket].push(i, i + 1, i + 2);
      }
      triangles.forEach((indices, i) => {
        if (!indices.length) return;
        const part = g.clone(); part.setIndex(indices);
        if (i) part.translate(-legs[i - 1].position.x, -legs[i - 1].position.y, 0);
        const mesh = new T.Mesh(part, child.material);
        (i ? legs[i - 1] : root).add(mesh);
      });
      g.dispose();
    });
    root.position.set(x, .13, z); scene.add(root);
    actors.push({ root, legs, kind: key, x, z, phase }); assetCounts[key] = (assetCounts[key] || 0) + 1;
    shadowSpots.push([x, .14, z, 1.6]);
  }
  actor('zombie', -5.3, 3.3, 1.5, .5); actor('skeleton', 3.6, -4, 1.45, 2.2); actor('zombie', 4.4, 8.8, 1.35, 4.5);
  actor('vampire', -5.1, -4.7, 1.6, 3.1); actor('keeper', -10.1, 4.8, 1.55, 5.4);

  // One static draw per material, one instanced draw per GLB primitive.
  for (const [material, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    const mesh = new T.Mesh(merged, material); mesh.receiveShadow = true;
    mesh.castShadow = material === materials.wood || material === materials.iron;
    scene.add(mesh); geometries.forEach(g => g.dispose());
  }
  const variants = new Map();
  function variantMaterial(original, variant) {
    const id = `${original.uuid}:${variant}`;
    if (variants.has(id)) return variants.get(id);
    const m = original.clone();
    // Repaint only the existing cloth geometry; keep Kenney's wooden frame.
    const source = templates.get('stall');
    const roofY = source.minY + source.size.y * .67;
    const canopy = new T.Color(variant === 'purple' ? '#807097' : variant === 'orange' ? '#c78248' : '#517f80');
    const cream = new T.Color('#e5dac2');
    m.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec3 vClothPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvClothPosition = position;');
      shader.fragmentShader = 'varying vec3 vClothPosition;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        if (vClothPosition.y > ${roofY.toFixed(6)}) {
          float stripe = mod(floor((vClothPosition.x - ${source.center.x.toFixed(6)}) / ${source.size.x.toFixed(6)} * 8.0 + 4.0), 2.0);
          diffuseColor.rgb = mix(vec3(${canopy.toArray().join(',')}), vec3(${cream.toArray().join(',')}), stripe);
        }`);
    };
    m.customProgramCacheKey = () => `market-cloth-${variant}`;
    if (original.map) {
      const image = original.map.image, canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const tint = new T.Color(variant === 'purple' ? '#807097' : variant === 'orange' ? '#c78248' : '#517f80');
      tint.convertLinearToSRGB();
      for (let k = 0; k < pixels.data.length; k += 4) {
        const [r, g, b] = pixels.data.slice(k, k + 3);
        if (g > r * 1.12 && g > b * 1.08) {
          const light = Math.max(r, g, b) / 255;
          pixels.data[k] = tint.r * 255 * light; pixels.data[k + 1] = tint.g * 255 * light; pixels.data[k + 2] = tint.b * 255 * light;
        }
      }
      ctx.putImageData(pixels, 0, 0); m.map = original.map.clone(); m.map.source = new T.Source(canvas); m.map.needsUpdate = true;
    }
    variants.set(id, m); return m;
  }
  for (const { key, variant, matrices } of copies.values()) {
    const source = templates.get(key);
    source.root.traverse(child => {
      if (!child.isMesh) return;
      const mat = key === 'fountain' && child.material.name === 'Water'
        ? materials.water : variant ? variantMaterial(child.material, variant) : child.material;
      const mesh = new T.InstancedMesh(child.geometry, mat, matrices.length);
      matrices.forEach((m, i) => mesh.setMatrixAt(i, m.clone().multiply(child.matrixWorld)));
      mesh.receiveShadow = true;
      mesh.castShadow = ['stall', 'headstone', 'fountain'].includes(key);
      mesh.computeBoundingSphere(); scene.add(mesh);
    });
  }

  const poolMat = new T.MeshBasicMaterial({ map: radialTexture('255,143,91'), transparent: true, opacity: .34, depthWrite: false, blending: T.AdditiveBlending });
  const poolMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), poolMat, pools.length);
  const q = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI / 2);
  pools.forEach(([x, y, z, scale], i) => poolMesh.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, y, z), q, new T.Vector3(scale, scale, 1))));
  scene.add(poolMesh);
  const shadeMat = new T.MeshBasicMaterial({ map: radialTexture('43,43,51'), transparent: true, opacity: .7, depthWrite: false });
  const shadeMesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), shadeMat, shadowSpots.length);
  shadowSpots.forEach(([x, y, z, scale], i) => shadeMesh.setMatrixAt(i, new T.Matrix4().compose(new T.Vector3(x, y, z), q, new T.Vector3(scale, scale * .7, 1))));
  scene.add(shadeMesh);

  return { actors, lamps, lanterns, glowPositions, seasonSign, seasonButton, assetCounts, placements, water: materials.water, fountain, plot };
}
