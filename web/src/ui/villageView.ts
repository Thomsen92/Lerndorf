/**
 * The village screen for a logged-in pupil: 3D village, own house marked, classmates labelled,
 * HUD with nickname and coins, logout and automatic logout after 15 minutes.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AutoLogout, AUTO_LOGOUT_MS } from '../auth/autoLogout';
import {
  PLOT_COUNT,
  loadClass,
  loadMembers,
  loadMyProfile,
  type Member,
  type MyProfile,
} from '../api/village';
import { buildLayout } from '../world/layout';
import { buildVillage } from '../render/village';

export interface VillageHandle {
  dispose(): void;
}

interface Loaded {
  profile: MyProfile;
  layoutSeed: number;
  members: Member[];
}

async function load(supabase: SupabaseClient): Promise<Loaded> {
  const profile = await loadMyProfile(supabase);
  const cls = await loadClass(supabase, profile.classId);
  const members = await loadMembers(supabase);
  return { profile, layoutSeed: cls.layoutSeed, members };
}

/** Shows the village. Calls `onLogout` after a manual or automatic logout. */
export async function mountVillage(
  root: HTMLElement,
  supabase: SupabaseClient,
  onLogout: () => void,
): Promise<VillageHandle> {
  root.innerHTML = `
    <div class="village-hud">
      <span class="coins" id="coins"></span>
      <span class="who" id="who"></span>
      <button type="button" id="logout" class="primary">Abmelden</button>
    </div>
    <p class="notice" id="notice" hidden></p>
  `;
  const notice = root.querySelector<HTMLParagraphElement>('#notice');
  const logoutBtn = root.querySelector<HTMLButtonElement>('#logout');

  const stop = (): void => {
    autoLogout.stop();
    running = false;
    renderer?.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    for (const ev of activity) window.removeEventListener(ev, onActivity);
  };
  const logout = async (): Promise<void> => {
    stop();
    await supabase.auth.signOut();
    onLogout();
  };
  const autoLogout = new AutoLogout(AUTO_LOGOUT_MS, () => void logout());
  const activity = ['pointerdown', 'keydown', 'touchstart'] as const;
  const onActivity = (): void => autoLogout.touch();
  let running = true;
  let renderer: THREE.WebGLRenderer | null = null;
  const resize = (): void => {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    cameraRef.aspect = w / h;
    cameraRef.updateProjectionMatrix();
  };
  const cameraRef = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

  logoutBtn?.addEventListener('click', () => void logout());

  let loaded: Loaded;
  try {
    loaded = await load(supabase);
  } catch (err) {
    console.error(err);
    if (notice) {
      notice.hidden = false;
      notice.textContent = 'Das Dorf konnte nicht geladen werden. Bitte die Seite neu laden.';
    }
    return { dispose: stop };
  }

  const { profile, layoutSeed, members } = loaded;
  const who = root.querySelector<HTMLSpanElement>('#who');
  const coins = root.querySelector<HTMLSpanElement>('#coins');
  if (who) who.textContent = profile.nickname;
  if (coins) coins.textContent = `${profile.coins} Münzen`;

  const stage = document.createElement('div');
  stage.className = 'stage';
  root.appendChild(stage);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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

  const layout = buildLayout(layoutSeed, PLOT_COUNT);
  const ownPlot = profile.plotIndex;
  const labels = members
    .filter((m) => m.plotIndex !== null)
    .map((m) => ({ plotIndex: m.plotIndex as number, nickname: m.nickname }));
  scene.add(buildVillage(layout, labels, ownPlot));

  // start the camera on the pupil's own house
  const home = ownPlot !== null ? layout.plots[ownPlot] : undefined;
  const target = home ? new THREE.Vector3(home.x, home.h, home.z) : new THREE.Vector3(-2, 0, 2);
  const camera = cameraRef;
  camera.position.copy(target).add(new THREE.Vector3(14, 22, 26));
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 110;
  controls.maxPolarAngle = 1.2;
  controls.update();

  window.addEventListener('resize', resize);
  resize();

  const r = renderer;
  r.setAnimationLoop(() => {
    if (!running) return;
    controls.update();
    r.render(scene, camera);
  });

  for (const ev of activity) window.addEventListener(ev, onActivity, { passive: true });
  autoLogout.touch();

  return { dispose: stop };
}
