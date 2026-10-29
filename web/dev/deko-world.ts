import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLayout } from '../src/world/layout';
import { buildVillage } from '../src/render/village';
import { setupScene } from '../src/render/scene';
import type { DecoRarity } from '../src/render/decoPresentation';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const rig = setupScene(scene); rig.setTheme('halloween');
const layout = buildLayout(11, 34, 'tal'), plot = layout.plots[0];
const ids = ['shop_evening_lantern', 'shop_one_more_chapter', 'reward_ollie_nyc_postcard', 'shop_pocket_meadow'];
const rarities: DecoRarity[] = ['common', 'rare', 'legendary', 'epic'];
const village = buildVillage(layout, [{plotIndex: 0, nickname: 'Demo', slots: {
  house: { itemId: 'house_fachwerk', rot: 0 },
  garage: { itemId: 'garage_stein', rot: 0 },
  car: { itemId: 'car_camper', rot: 0 },
  deco_1: {itemId: ids[0], rot: 0}, deco_2: {itemId: ids[1], rot: 0},
  deco_3: {itemId: ids[2], rot: 0}, deco_4: {itemId: ids[3], rot: 0},
}}], 0, new Map([...ids.map((id, i) => [id, rarities[i]] as [string, DecoRarity]), ['car_camper', 'rare']]));
scene.add(village);
const target = new THREE.Vector3(plot.x, plot.h + 1, plot.z);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
camera.position.copy(new THREE.Vector3(12, 14, 17).applyAxisAngle(new THREE.Vector3(0,1,0), plot.face).add(target));
const controls = new OrbitControls(camera, renderer.domElement); controls.target.copy(target); controls.update();
const quality = document.querySelector<HTMLSelectElement>('#quality')!;
const reduced = document.querySelector<HTMLInputElement>('#reduced')!;
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
function resize(): void {
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality.value === 'high' ? 1.5 : 1));
  renderer.shadowMap.enabled = quality.value === 'high';
  renderer.setSize(innerWidth, innerHeight - document.querySelector('header')!.getBoundingClientRect().height);
  camera.aspect = renderer.domElement.width / renderer.domElement.height;
  camera.fov = innerWidth < 800 ? 52 : 42;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); quality.addEventListener('change', resize); resize();
let last = 0;
function frame(now: number): void {
  requestAnimationFrame(frame);
  if (document.hidden || now - last < 33) return;
  last = now;
  village.userData.updateDecoEffects(now / 1000, camera, quality.value, reduced.checked || systemMotion.matches);
  rig.follow(controls.target);
  renderer.render(scene, camera);
  document.querySelector('#status')!.textContent = `Echte Spielmodelle · ${renderer.info.render.calls} Draw Calls · vier Seltenheiten`;
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => { village.userData.disposeDecoEffects(); controls.dispose(); renderer.dispose(); });
