// Entry point. Stufe 1: village with placeholder models. Login and data come in later steps.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildLayout } from './world/layout';
import { buildVillage } from './render/village';

// Class layout seed and plot count come from the database later (SPEC §5, §10).
const CLASS_SEED = 11;
const PLOT_COUNT = 24;

function start(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  const layout = buildLayout(CLASS_SEED, PLOT_COUNT);
  scene.add(buildVillage(layout));

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(34, 46, 62);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(-2, 0, 2);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 110;
  controls.maxPolarAngle = 1.2;
  controls.update();

  const resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });
}

start();
