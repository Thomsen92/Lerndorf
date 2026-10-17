// Layout-Galerie (SPEC §10.12, PLAN L.1). Development page only, not part of the app build.
// Shows one map and seed from fixed viewpoints with sample residents, so the layout can be
// judged from pictures. `scripts/galerie.ts` drives it with Playwright.
import * as THREE from 'three';
import { buildLayout } from '../src/world/layout';
import { buildVillage } from '../src/render/village';
import { Crowd } from '../src/render/crowd';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 11);
const map = params.get('map') ?? 'tal';
const viewName = params.get('view') ?? 'overview';
document.title = `Galerie ${map} ${seed} ${viewName}`;
const PLOTS = 34;
const RESIDENTS = 24;
const NAMES = [
  'anna',
  'ben',
  'mia',
  'jonas',
  'lena',
  'omar',
  'sara',
  'tim',
  'emma',
  'paul',
  'lea',
  'max',
  'ida',
  'noah',
  'zoe',
  'elif',
  'finn',
  'hanna',
  'leon',
  'nora',
  'yusuf',
  'mila',
  'tom',
  'eva',
];

const app = document.getElementById('app') as HTMLElement;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1280, 800);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#33405e');
scene.fog = new THREE.Fog('#33405e', 80, 170);
scene.add(new THREE.HemisphereLight('#a9b8e8', '#3a5a3a', 1.15));
const sun = new THREE.DirectionalLight('#ffd2a1', 1.6);
sun.position.set(-40, 55, 25);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -62, right: 62, top: 62, bottom: -62, near: 1, far: 180 });
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

// the map template of this picture (SPEC §10.1)
const layout = buildLayout(seed, PLOTS, map);
const members = Array.from({ length: RESIDENTS }, (_, i) => ({
  plotIndex: (i * 7) % PLOTS, // spread over the village
  nickname: NAMES[i % NAMES.length],
}));
const village = buildVillage(layout, members, null);
scene.add(village);
const crowd = new Crowd(
  scene,
  layout,
  members.map((m) => ({ nickname: m.nickname })),
);

const camera = new THREE.PerspectiveCamera(38, 1280 / 800, 0.1, 400);
const VIEWS: Record<string, { target: THREE.Vector3; offset: THREE.Vector3 }> = {
  overview: { target: new THREE.Vector3(-2, 0, 2), offset: new THREE.Vector3(34, 46, 62) },
  topdown: { target: new THREE.Vector3(0, 0, 0), offset: new THREE.Vector3(0, 110, 1) },
  marketplace: {
    target: new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z),
    offset: new THREE.Vector3(14, 22, 26),
  },
  plot: {
    target: new THREE.Vector3(layout.plots[0].x, layout.plots[0].h, layout.plots[0].z),
    offset: new THREE.Vector3(14, 22, 26),
  },
  bridge: {
    target: layout.bridges[0]
      ? new THREE.Vector3(
          (layout.bridges[0].a.x + layout.bridges[0].b.x) / 2,
          layout.bridges[0].y,
          (layout.bridges[0].a.z + layout.bridges[0].b.z) / 2,
        )
      : new THREE.Vector3(0, 0, 0),
    offset: new THREE.Vector3(12, 14, 16),
  },
};

function setView(name: string): void {
  const v = VIEWS[name] ?? VIEWS.overview;
  camera.position.copy(v.target).add(v.offset);
  camera.lookAt(v.target);
}

/** Lets the residents walk for `seconds` so the picture shows a living village. */
function step(seconds: number): void {
  const dt = 0.1;
  for (let t = 0; t < seconds; t += dt) crowd.update(dt);
}

/** Draw calls: whole picture, and the world without the residents. */
function drawCalls(): { total: number; world: number } {
  renderer.info.reset();
  renderer.render(scene, camera);
  const total = renderer.info.render.calls;
  crowd.villagers.forEach((v) => (v.group.visible = false));
  renderer.info.reset();
  renderer.render(scene, camera);
  const world = renderer.info.render.calls;
  crowd.villagers.forEach((v) => (v.group.visible = true));
  return { total, world };
}

declare global {
  interface Window {
    galerie: {
      setView(name: string): void;
      step(seconds: number): void;
      drawCalls(): { total: number; world: number };
      ready: boolean;
    };
  }
}

window.galerie = {
  setView,
  step,
  drawCalls,
  ready: true,
};

// first picture: the requested view after the residents have walked for a while
setView(viewName);
step(20);
renderer.render(scene, camera);
