// Layout-Galerie (SPEC §10.12, PLAN L.1). Development page only, not part of the app build.
// Shows one map and seed from fixed viewpoints with sample residents, so the layout can be
// judged from pictures. `scripts/galerie.ts` drives it with Playwright.
import * as THREE from 'three';
import { bridgeHeight, buildLayout } from '../src/world/layout';
import { setBoardNote } from '../src/render/plaza';
import { buildVillage } from '../src/render/village';
import { createMarketByte } from '../src/mascot/marketByte';
import { Crowd } from '../src/render/crowd';
import { loadCharacter } from '../src/render/character';
import { avatarCatalog } from '../src/avatars/catalog';
import { setupScene } from '../src/render/scene';
import { grassReady } from '../src/render/grass';
import { kenneyReady } from '../src/render/kenney';
import { MODEL_IDS } from '../src/render/plotAssets';
import type { SlotMap } from '../src/api/build';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') ?? 11);
const map = params.get('map') ?? 'tal';
const viewName = params.get('view') ?? 'overview';
document.title = `Galerie ${map} ${seed} ${viewName}`;
const PLOTS = 34;
const RESIDENTS = params.has('wardrobe') ? 32 : 24;
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
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const rig = setupScene(scene);

// the map template of this picture (SPEC §10.1)
const layout = buildLayout(seed, PLOTS, map);
// sample plots: different houses, garages, cars and decorations, so the pictures show the slot plan
const HOUSES = ['house_fachwerk', 'house_fachwerk', 'house_landhaus', 'house_villa'];
const GARAGES = ['garage_holz', 'garage_stein'];
const CARS = [null, 'car_kleinwagen', null, 'car_camper'];
const DECOS = MODEL_IDS.deco;
const members = Array.from({ length: RESIDENTS }, (_, i) => {
  const slots: SlotMap = {
    house: { itemId: HOUSES[i % HOUSES.length], rot: 0 },
    garage: { itemId: GARAGES[(i >> 1) % GARAGES.length], rot: 0 },
  };
  const car = CARS[i % CARS.length];
  if (car) slots.car = { itemId: car, rot: 0 };
  (['deco_1', 'deco_2', 'deco_3', 'deco_4'] as const).forEach((id, k) => {
    if ((i + k) % 3 !== 0) slots[id] = { itemId: DECOS[(i * 5 + k * 3) % DECOS.length], rot: (i + k) % 4 };
  });
  return {
    plotIndex: (i * 7) % PLOTS, // spread over the village
    nickname: NAMES[i % NAMES.length] + (i >= NAMES.length ? String(i) : ''),
    level: params.get('xp') === '1' ? [7, 15, 20, 30][i % 4] : undefined,
    titleLabel:
      params.get('xp') === '1'
        ? ['Busy Bee', 'Vocab Hero', 'Village Star', 'Lerndorf Champion'][i % 4]
        : undefined,
    slots,
  };
});
// ?ruin=1: the first plot still shows the ruin of the first-login tutorial
if (params.get('ruin') === '1')
  members.find((m) => m.plotIndex === 0)!.slots.house = { itemId: 'ruin', rot: 0 };
const village = buildVillage(layout, members, null);
if (params.has('notice')) setBoardNote(village, 'Bring your English folder on Monday. Let’s learn together!');
scene.add(village);
const byte = createMarketByte({ scene, layout, sound: { enabled: false }, openQuests: () => undefined });
if (params.get('byte') === '0') byte.root.visible = false;
const crowd = new Crowd(
  scene,
  layout,
  members.map((m, i) => ({
    nickname: m.nickname,
    level: m.level,
    character: i % 2 === 0 ? ('boy' as const) : ('girl' as const),
  })),
);

const camera = new THREE.PerspectiveCamera(38, 1280 / 800, 0.1, 400);
const VIEWS: Record<string, { target: THREE.Vector3; offset: THREE.Vector3 }> = {
  byte: {
    target: byte.root.position.clone().add(new THREE.Vector3(0, 1, 0)),
    offset: new THREE.Vector3(Math.sin(byte.root.rotation.y) * 8, 4, Math.cos(byte.root.rotation.y) * 8),
  },
  xp_tag: {
    target: new THREE.Vector3(layout.plots[0].x, layout.plots[0].h + 5, layout.plots[0].z),
    offset: new THREE.Vector3(9, 7, 12),
  },
  overview: { target: new THREE.Vector3(-2, 0, 2), offset: new THREE.Vector3(34, 46, 62) },
  topdown: { target: new THREE.Vector3(0, 0, 0), offset: new THREE.Vector3(0, 110, 1) },
  marketplace: {
    target: new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z),
    offset: new THREE.Vector3(14, 22, 26),
  },
  // low view towards the valley wall: shows the sky panorama and the fog at the horizon
  horizon: {
    target: new THREE.Vector3(layout.plaza.x, layout.plazaHeight + 4, layout.plaza.z),
    offset: new THREE.Vector3(30, 9, 44),
  },
  plot: {
    target: new THREE.Vector3(layout.plots[0].x, layout.plots[0].h, layout.plots[0].z),
    offset: new THREE.Vector3(14, 22, 26),
  },
  // close-up of the house slot of plot 0 from the street (the ruin of the first-login tutorial)
  ruin: (() => {
    const p = layout.plots[0];
    const toWorld = (lx: number, lz: number): THREE.Vector3 =>
      new THREE.Vector3(
        p.x + lx * Math.cos(p.face) + lz * Math.sin(p.face),
        p.h,
        p.z - lx * Math.sin(p.face) + lz * Math.cos(p.face),
      );
    const c = toWorld(-1.5, -3.5);
    const cam = toWorld(1.5, 7.5);
    return { target: c.clone().setY(p.h + 1.2), offset: cam.sub(c).setY(5.5) };
  })(),
  bridge: {
    target: layout.bridges[0]
      ? new THREE.Vector3(
          (layout.bridges[0].a.x + layout.bridges[0].b.x) / 2,
          bridgeHeight(layout.bridges[0], 0.5),
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
  rig.follow(v.target);
}

/** Lets the residents walk for `seconds` so the picture shows a living village. */
function step(seconds: number): void {
  const dt = 0.1;
  for (let t = 0; t < seconds; t += dt) {
    crowd.update(dt);
    if (params.get('byte') !== '0') byte.update(dt, camera, true);
    (village.userData.animate as ((t: number) => void) | undefined)?.(t);
  }
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

/** Development-only same-frame measurement isolates the mascot from moving residents. */
function byteCost(reaction: 'idle' | 'celebrate') {
  void byte.mascot.react(reaction, { silent: true });
  for (let i = 0; i < 10; i++) byte.update(0.08, camera, false);
  const prior = byte.root.visible;
  byte.root.visible = true;
  renderer.info.reset();
  renderer.render(scene, camera);
  const calls = renderer.info.render.calls,
    triangles = renderer.info.render.triangles;
  byte.root.visible = false;
  renderer.info.reset();
  renderer.render(scene, camera);
  const cost = {
    calls: calls - renderer.info.render.calls,
    triangles: triangles - renderer.info.render.triangles,
  };
  byte.root.visible = prior;
  renderer.render(scene, camera);
  return cost;
}

declare global {
  interface Window {
    galerie: {
      setView(name: string): void;
      step(seconds: number): void;
      drawCalls(): { total: number; world: number };
      byteCost(reaction: 'idle' | 'celebrate'): { calls: number; triangles: number };
      appearanceCost(): {
        residents: number;
        calls: number;
        triangles: number;
        geometries: number;
        textures: number;
      };
      ready: boolean;
    };
  }
}

window.galerie = {
  setView,
  step,
  drawCalls,
  byteCost,
  appearanceCost() {
    crowd.updateLabels(camera);
    renderer.info.reset();
    renderer.render(scene, camera);
    return {
      residents: crowd.villagers.length,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    };
  },
  ready: false,
};

// first picture: the requested view after the residents have walked for a while
setView(viewName);
step(20);
renderer.render(scene, camera);
// the picture is ready once the sky panorama is loaded
void Promise.all([
  rig.skyReady,
  grassReady(),
  kenneyReady().then(() => new Promise((r) => setTimeout(r, 0))),
  Promise.all([loadCharacter('boy'), loadCharacter('girl')]),
]).then(async ([sky]) => {
  if (params.has('wardrobe'))
    await Promise.all(
      crowd.villagers.map(async (v, i) => {
        const allowed = avatarCatalog.filter((p) => p.character === v.character);
        const items =
          v.character === 'boy'
            ? allowed.map((p) => p.id)
            : [
                'avatar_girl_daisy_bucket',
                'avatar_girl_heart_pop',
                'avatar_girl_starpack',
                'avatar_girl_candy_orbit',
                'avatar_girl_bloom',
                i % 4 === 1 ? 'avatar_girl_slim_jeans' : 'avatar_girl_pleated_skirt',
              ];
        v.look = { items, colors: { hair: i % 3 === 0 ? '#5b3a29' : '#2b2118' } };
        await v.style?.applyLook(v.look);
      }),
    );
  if (sky) (village.userData.setSky as ((t: THREE.Texture) => void) | undefined)?.(sky);
  renderer.render(scene, camera);
  crowd.updateLabels(camera);
  renderer.render(scene, camera);
  window.galerie.ready = true;
});
