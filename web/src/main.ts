// Entry point. Without a session: login. With a session: the village (placeholder models).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabase } from './api/client';
import { AutoLogout, AUTO_LOGOUT_MS } from './auth/autoLogout';
import { buildLayout } from './world/layout';
import { buildVillage } from './render/village';
import { renderLogin } from './ui/loginView';

// Class layout seed and plot count come from the database later (SPEC §5, §10).
const CLASS_SEED = 11;
const PLOT_COUNT = 24;

function mountVillage(root: HTMLElement, supabase: SupabaseClient): void {
  root.innerHTML = `
    <div class="village-hud">
      <button type="button" id="logout" class="primary">Abmelden</button>
    </div>
  `;
  const hud = root.querySelector<HTMLDivElement>('.village-hud');
  const logoutBtn = root.querySelector<HTMLButtonElement>('#logout');
  if (!hud || !logoutBtn) return;

  const stage = document.createElement('div');
  stage.className = 'stage';
  root.appendChild(stage);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  stage.appendChild(renderer.domElement);

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
  scene.add(buildVillage(buildLayout(CLASS_SEED, PLOT_COUNT)));

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
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  let running = true;
  renderer.setAnimationLoop(() => {
    if (!running) return;
    controls.update();
    renderer.render(scene, camera);
  });

  // Logout: manual button, or automatically after 15 minutes without interaction (SPEC §4).
  const logout = async (): Promise<void> => {
    autoLogout.stop();
    running = false;
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    await supabase.auth.signOut();
    // the auth state change in main() shows the login screen again
  };
  const autoLogout = new AutoLogout(AUTO_LOGOUT_MS, () => void logout());
  for (const ev of ['pointerdown', 'keydown', 'touchstart'] as const) {
    window.addEventListener(ev, () => autoLogout.touch(), { passive: true });
  }
  autoLogout.touch();
  logoutBtn.addEventListener('click', () => void logout());
}

async function main(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) return;

  let supabase: SupabaseClient;
  try {
    supabase = createSupabase();
  } catch (err) {
    root.textContent = 'Die Verbindung zum Server ist nicht eingerichtet. Bitte die Lehrkraft fragen.';
    console.error(err);
    return;
  }

  const show = async (): Promise<void> => {
    const { data } = await supabase.auth.getSession();
    if (data.session) mountVillage(root, supabase);
    else renderLogin(root, supabase, () => void show());
  };

  // Login/logout in another tab or the session expiring also switches the screen.
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') void show();
  });
  await show();
}

void main();
