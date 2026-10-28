import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';
import { ASSETS, SEED, seeded, canvasTexture, radialTexture, buildWorld } from './world.js';

const $ = id => document.getElementById(id);
const started = performance.now(), failures = [];
let renderer;
function fail(error) {
  console.error(error); $('loading').hidden = true; $('loading').style.display = 'none';
  $('error').hidden = false;
  $('error-message').textContent = `Please open this folder through a static server (for example: npx serve Prototyp/marktplatz). ${error.message || error}`;
}

try { await main(); } catch (error) { fail(error); }

async function main() {
  await document.fonts.ready;
  const scene = new T.Scene(); scene.background = new T.Color('#493847');
  scene.fog = new T.Fog('#493847', 38, 80);
  renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .78; renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  // Count the initial shadow-map pass too; Three normally resets after that pass.
  renderer.info.autoReset = false;
  const stage = $('stage'); stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const camera = new T.PerspectiveCamera(38, 1, .15, 240);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .055; controls.enablePan = false;
  controls.minDistance = 17; controls.maxDistance = 68;
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.32;
  controls.autoRotateSpeed = .18; controls.rotateSpeed = .5; controls.zoomSpeed = .7;
  controls.target.set(0, 1.8, 0);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  $('less-motion').checked = media.matches;
  let reduced = media.matches, tourRequested = !reduced, time = 0, lastFrame = performance.now(), raf = 0;
  let previousSize = '', quality = innerWidth < 900 ? 1 : Math.min(devicePixelRatio, 1.5);
  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    const size = `${width},${height},${quality}`;
    if (size === previousSize) return;
    previousSize = size; camera.aspect = width / height; camera.fov = width < height ? 52 : 38;
    camera.updateProjectionMatrix(); renderer.setPixelRatio(quality); renderer.setSize(width, height);
  }
  function resetCamera() {
    controls.target.set(0, 1.8, 0);
    camera.position.set(25, 21, 31); controls.update();
    $('plot-view').setAttribute('aria-pressed', 'false'); $('plot-view').textContent = 'Example plot ↗';
  }
  resetCamera(); resize(); addEventListener('resize', resize);

  scene.add(new T.HemisphereLight('#a18aab', '#654548', .60));
  const moonlight = new T.DirectionalLight('#db6466', .95); moonlight.position.set(-24, 36, -16);
  moonlight.castShadow = true; moonlight.shadow.mapSize.set(1024, 1024);
  Object.assign(moonlight.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: .5, far: 95 });
  moonlight.shadow.bias = -.0006; moonlight.shadow.normalBias = .04; scene.add(moonlight);
  const warmFill = new T.DirectionalLight('#d78a68', .22); warmFill.position.set(12, 18, 26); scene.add(warmFill);
  const lights = [];
  for (const [x, y, z, intensity, distance] of [[-1, 3, -6, 18, 13], [0, 3.4, 1, 16, 13], [8, 2.8, 3, 13, 11]]) {
    const light = new T.PointLight('#ff9c62', intensity, distance, 1.6); light.position.set(x, y, z); scene.add(light); lights.push(light);
  }
  const atmosphere = createAtmosphere(scene);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  await MeshoptDecoder.ready;
  const templates = new Map(); let loaded = 0;
  await Promise.all(Object.entries(ASSETS).map(async ([name, path]) => {
    try {
      const gltf = await loader.loadAsync(`./assets/${path}`), root = gltf.scene;
      root.updateMatrixWorld(true);
      const bounds = new T.Box3().setFromObject(root), size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
      root.traverse(child => {
        if (!child.isMesh) return;
        for (const material of [].concat(child.material)) {
          material.roughness = .88; material.metalness = Math.min(material.metalness || 0, .15);
          material.flatShading = true;
          if (material.map) material.map.anisotropy = 4;
        }
      });
      templates.set(name, { root, size, center, minY: bounds.min.y });
      loaded++; $('loading-progress').textContent = `${loaded} / ${Object.keys(ASSETS).length} little pieces of the market`;
    } catch (error) { failures.push(`${path}: ${error.message}`); }
  }));
  if (failures.length) throw new Error(`Some models could not load: ${failures.join('; ')}`);
  const world = buildWorld(scene, templates);
  const glow = makeGlows(scene, world.glowPositions);
  renderer.shadowMap.needsUpdate = true;

  function updateTourButton() {
    const playing = tourRequested && !reduced && !$('season-dialog').open;
    controls.autoRotate = playing;
    $('tour').setAttribute('aria-pressed', String(playing));
    $('tour').querySelector('span').textContent = playing ? 'Pause tour' : 'Start tour';
    $('tour').querySelector('path').setAttribute('d', playing ? 'M8 6v12M16 6v12' : 'm8 5 11 7-11 7Z');
    $('tour').disabled = reduced;
    $('tour').title = reduced ? 'Turn off “Weniger Bewegung” to start the tour.' : '';
  }
  controls.addEventListener('start', () => { tourRequested = false; updateTourButton(); });
  $('tour').addEventListener('click', () => { tourRequested = !tourRequested; updateTourButton(); });
  $('reset').addEventListener('click', resetCamera);
  $('plot-view').addEventListener('click', () => setView($('plot-view').getAttribute('aria-pressed') === 'true' ? 'overview' : 'plot'));
  $('less-motion').addEventListener('change', () => { reduced = $('less-motion').checked; updateTourButton(); });
  media.addEventListener('change', event => {
    reduced = event.matches; $('less-motion').checked = reduced; updateTourButton();
  });
  updateTourButton();
  $('welcome-button').addEventListener('click', showWelcome);
  function showWelcome() { if (!$('season-dialog').open) $('season-dialog').showModal(); updateTourButton(); }
  $('season-dialog').addEventListener('click', event => { if (event.target === $('season-dialog')) $('season-dialog').close(); });
  $('season-dialog').addEventListener('close', () => { updateTourButton(); $('welcome-button').focus({ preventScroll: true }); });
  const raycaster = new T.Raycaster(), pointer = new T.Vector2(); let down;
  renderer.domElement.addEventListener('pointerdown', event => { down = { x: event.clientX, y: event.clientY }; });
  function signAt(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects([world.seasonSign, world.seasonButton]).length > 0;
  }
  renderer.domElement.addEventListener('pointerup', event => {
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 5 && signAt(event)) showWelcome();
    down = null;
  });
  renderer.domElement.addEventListener('pointermove', event => { renderer.domElement.style.cursor = signAt(event) ? 'pointer' : down ? 'grabbing' : 'grab'; });
  stage.addEventListener('keydown', event => {
    const delta = { ArrowLeft: -.08, ArrowRight: .08, ArrowUp: -.06, ArrowDown: .06 }[event.key];
    if (delta === undefined) return;
    event.preventDefault(); tourRequested = false; updateTourButton();
    const spherical = new T.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') spherical.theta += delta;
    else spherical.phi = T.MathUtils.clamp(spherical.phi + delta, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new T.Vector3().setFromSpherical(spherical)); controls.update();
  });

  const metrics = { fps: 0, calls: 0, triangles: 0, maxCalls: 0, maxTriangles: 0, loadMs: Math.round(performance.now() - started), quality, renderer: '', frames: 0 };
  const gl = renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
  metrics.renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  let measuredAt = performance.now(), frames = 0;
  const frameTimes = [];
  function frame(now) {
    const rawDt = Math.max(.0001, (now - lastFrame) / 1000), dt = Math.min(rawDt, .05); lastFrame = now;
    time += dt; frames++; metrics.frames++;
    if (frameTimes.length >= 600) frameTimes.shift(); frameTimes.push(rawDt * 1000);
    controls.update(dt);
    atmosphere.update(camera, reduced ? 0 : time);
    glow.update(camera);
    for (let i = 0; i < world.lanterns.length; i++) {
      const p = world.lanterns[i];
      const flicker = reduced ? 1 : .91 + Math.sin(time * 3.1 + p.phase) * .055 + Math.sin(time * 7.3 + p.phase * 4) * .025;
      world.lamps.setColorAt(i, new T.Color('#ffc56b').multiplyScalar(flicker));
    }
    world.lamps.instanceColor.needsUpdate = true;
    lights.forEach((light, i) => { light.intensity = [18, 16, 13][i] * (reduced ? 1 : .97 + Math.sin(time * 3.1 + i) * .03); });
    for (const actor of world.actors) {
      const shuffling = actor.kind === 'zombie' || actor.kind === 'skeleton';
      const path = time * .10 + actor.phase, step = time * (shuffling ? 1.65 : 1.9) + actor.phase;
      // Low, uneven steps with one dragging foot; no floating or springy bounce.
      actor.root.position.x = actor.x + (reduced ? 0 : Math.sin(path) * 1.15);
      actor.root.position.z = actor.z + (reduced ? 0 : Math.cos(path) * .60);
      actor.root.rotation.y = reduced ? actor.phase : Math.atan2(Math.cos(path) * 1.15, -Math.sin(path) * .60);
      actor.root.rotation.x = reduced ? 0 : actor.kind === 'zombie' ? .13 : shuffling ? .055 : .025;
      actor.root.rotation.z = reduced ? 0 : Math.sin(step) * (shuffling ? .035 : .018);
      actor.root.position.y = .13 - (reduced ? 0 : Math.abs(Math.sin(step)) * .009);
      actor.legs.forEach((leg, i) => {
        leg.rotation.x = reduced ? 0 : Math.sin(step + i * Math.PI) * (shuffling ? (i ? .075 : .20) : .14);
      });
    }
    world.water.emissiveIntensity = reduced ? .24 : .24 + Math.sin(time * .7) * .02;
    world.fountain.update(time, reduced);
    renderer.info.reset(); renderer.render(scene, camera);
    metrics.calls = renderer.info.render.calls; metrics.triangles = renderer.info.render.triangles;
    metrics.maxCalls = Math.max(metrics.maxCalls, metrics.calls); metrics.maxTriangles = Math.max(metrics.maxTriangles, metrics.triangles);
    if (now - measuredAt > 1000) {
      metrics.fps = Math.round(frames * 1000 / (now - measuredAt)); measuredAt = now; frames = 0;
      $('fps').textContent = metrics.fps; $('calls').textContent = metrics.calls;
      $('triangles').textContent = metrics.triangles.toLocaleString('en-GB'); $('quality').textContent = `${quality.toFixed(2)}×`;
      // Reduce fill cost once if sustained performance is low; never changes layout.
      if (metrics.frames > 180 && metrics.fps < 28 && quality > 1) { quality = 1; metrics.quality = quality; resize(); }
    }
    raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { lastFrame = performance.now(); measuredAt = lastFrame; frames = 0; raf = requestAnimationFrame(frame); }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); cancelAnimationFrame(raf); fail(new Error('WebGL paused. Reload the page to open the market again.'));
  });
  const uniqueTriangles = (() => {
    let total = 0;
    scene.traverse(mesh => { if (mesh.isMesh && mesh.geometry && mesh.visible) total += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3 * (mesh.isInstancedMesh ? mesh.count : 1); });
    return Math.round(total);
  })();
  function setView(name) {
    tourRequested = false; updateTourButton();
    const views = { overview: [25, 21, 31], season: [13, 10, 20], cemetery: [-23, 16, 24], reverse: [-28, 23, -32] };
    if (name === 'plot') {
      const { x, z } = world.plot.center;
      controls.target.set(x, .8, z); camera.position.set(x + 13, 12, z + 17);
    } else { camera.position.set(...(views[name] || views.overview)); controls.target.set(0, 1.8, 0); }
    controls.update(); $('plot-view').setAttribute('aria-pressed', String(name === 'plot'));
    $('plot-view').textContent = name === 'plot' ? 'Back to market ↶' : 'Example plot ↗';
  }
  window.market = {
    ready: true, seed: SEED, stats: () => ({ ...metrics, sceneTriangles: uniqueTriangles, reducedMotion: reduced, tour: controls.autoRotate, failures: [...failures] }),
    placements: () => world.placements.map(p => [...p]), assetCounts: () => ({ ...world.assetCounts }),
    frameTimes: () => [...frameTimes],
    fountain: () => world.fountain.details(),
    plot: () => world.plot.details(),
    camera: () => ({ position: camera.position.toArray(), target: controls.target.toArray(), distance: camera.position.distanceTo(controls.target) }),
    setView,
    seasonScreen: () => { const p = world.seasonButton.position.clone().project(camera); return { x: (p.x + 1) * stage.clientWidth / 2, y: (1 - p.y) * stage.clientHeight / 2 }; },
    motionSnapshot: () => ({ actors: world.actors.map(a => [...a.root.position.toArray(), ...a.root.rotation.toArray(), ...a.legs.map(leg => leg.rotation.x)]), fogTime: atmosphere.time, lamps: Array.from(world.lamps.instanceColor.array), fountain: world.fountain.snapshot() }),
  };
  frame(performance.now()); $('loading').classList.add('done');
  setTimeout(() => { $('loading').hidden = true; $('loading').style.display = 'none'; }, 650);
}

function createAtmosphere(scene) {
  const random = seeded(SEED + 1);
  // Identical material/fog colours let the finite ground dissolve into the sky.
  const sky = new T.Mesh(new T.SphereGeometry(170, 24, 12), new T.MeshBasicMaterial({
    color: '#493847', side: T.BackSide, depthWrite: false, fog: false,
  })); scene.add(sky);
  const stars = [], starColors = [];
  for (let i = 0; i < 180; i++) {
    const a = random() * Math.PI * 2, y = -.22 + random() * .48, r = Math.sqrt(1 - y * y) * 145;
    stars.push(Math.cos(a) * r, y * 145, Math.sin(a) * r);
    const c = new T.Color('#d5c5bb').multiplyScalar(.45 + random() * .45); starColors.push(c.r, c.g, c.b);
  }
  const starGeo = new T.BufferGeometry(); starGeo.setAttribute('position', new T.Float32BufferAttribute(stars, 3)); starGeo.setAttribute('color', new T.Float32BufferAttribute(starColors, 3));
  scene.add(new T.Points(starGeo, new T.PointsMaterial({ size: .14, vertexColors: true, fog: false, depthWrite: false })));
  const moonTexture = canvasTexture(512, 512, ctx => {
    const g = ctx.createRadialGradient(200, 165, 10, 256, 256, 252);
    g.addColorStop(0, '#ed6851'); g.addColorStop(.45, '#bf303c'); g.addColorStop(1, '#671f37');
    ctx.beginPath(); ctx.arc(256, 256, 249, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 65; i++) {
      const x = random() * 512, y = random() * 512, r = 3 + random() * 28;
      ctx.fillStyle = i % 2 ? '#451c3930' : '#f48b7017'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    const pixels = ctx.getImageData(0, 0, 512, 512);
    for (let k = 0; k < pixels.data.length; k += 4) { const n = (random() - .5) * 10; for (let j = 0; j < 3; j++) pixels.data[k + j] += n; }
    ctx.putImageData(pixels, 0, 0);
  });
  const moon = new T.Mesh(new T.PlaneGeometry(22, 22), new T.MeshBasicMaterial({ map: moonTexture, transparent: true, fog: false, depthWrite: false, toneMapped: false }));
  moon.position.set(-24, -3, -75); scene.add(moon);
  const halo = new T.Mesh(new T.PlaneGeometry(47, 47), new T.MeshBasicMaterial({ map: radialTexture('213,35,54'), transparent: true, opacity: .95, blending: T.AdditiveBlending, fog: false, depthWrite: false, toneMapped: false }));
  halo.position.copy(moon.position).add(new T.Vector3(0, 0, -.12)); scene.add(halo);
  const fogTexture = canvasTexture(256, 128, (ctx) => {
    ctx.scale(1, .5);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 126);
    g.addColorStop(0, '#b994aa44'); g.addColorStop(.42, '#b994aa2b'); g.addColorStop(1, '#b994aa00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  const wisps = new T.InstancedMesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: fogTexture, transparent: true, opacity: .45, depthWrite: false, fog: false }), 18);
  const fogs = Array.from({ length: 18 }, (_, i) => {
    const a = i / 18 * Math.PI * 2, r = 7 + random() * 18;
    return { x: Math.sin(a) * r, y: .5 + random() * 1.4, z: Math.cos(a) * r, phase: random() * 6, width: 10 + random() * 8 };
  });
  wisps.frustumCulled = false; wisps.renderOrder = 4; scene.add(wisps);
  const obj = new T.Object3D();
  const result = { time: 0, update(camera, time) {
    result.time = time;
    // Reframe the sky ornament in portrait, where the horizontal field is narrow.
    moon.position.set(...(camera.aspect < .8 ? [-41, -4, -62] : [-24, -3, -75]));
    halo.position.copy(moon.position).add(new T.Vector3(0, 0, -.12));
    moon.quaternion.copy(camera.quaternion); halo.quaternion.copy(camera.quaternion);
    fogs.forEach((p, i) => {
      obj.position.set(p.x + Math.sin(time * .04 + p.phase) * 1.2, p.y, p.z + Math.cos(time * .035 + p.phase) * .6);
      obj.quaternion.copy(camera.quaternion); obj.scale.set(p.width, 2.2, 1); obj.updateMatrix(); wisps.setMatrixAt(i, obj.matrix);
    }); wisps.instanceMatrix.needsUpdate = true;
  } };
  return result;
}

function makeGlows(scene, positions) {
  const material = new T.MeshBasicMaterial({ map: radialTexture('255,183,91'), transparent: true, opacity: .45, blending: T.AdditiveBlending, depthWrite: false, fog: false });
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), material, positions.length); mesh.frustumCulled = false; scene.add(mesh);
  const obj = new T.Object3D();
  return { update(camera) {
    positions.forEach(([x, y, z], i) => { obj.position.set(x, y, z); obj.quaternion.copy(camera.quaternion); obj.scale.set(1.6, 1.6, 1); obj.updateMatrix(); mesh.setMatrixAt(i, obj.matrix); });
    mesh.instanceMatrix.needsUpdate = true;
  } };
}
