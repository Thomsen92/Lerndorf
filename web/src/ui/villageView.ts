/**
 * The village screen for a logged-in pupil: 3D village, villagers, own house marked,
 * HUD with nickname and coins, quality choice, camera buttons, logout and automatic
 * logout after 15 minutes.
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
import { buildPlacements } from '../render/placements';
import { loadClassPlacements, loadGrid, type ClassPlacement } from '../api/build';
import type { GridSize } from '../build/grid';
import { Crowd } from '../render/crowd';
import { openShop } from './shopView';
import { openTaskBoard } from './taskBoardView';
import { openLedger } from './ledgerView';
import { BuildMode } from '../render/buildMode';
import {
  AUTO_MEASURE_SECONDS,
  decideAuto,
  effectiveLevel,
  settingsFor,
  type QualityChoice,
  type QualityLevel,
} from '../render/quality';

export interface VillageHandle {
  dispose(): void;
}

interface Loaded {
  profile: MyProfile;
  layoutSeed: number;
  mapId: string;
  shopOpen: boolean;
  buildOpen: boolean;
  members: Member[];
  placements: ClassPlacement[];
  grid: GridSize;
}

async function load(supabase: SupabaseClient): Promise<Loaded> {
  const profile = await loadMyProfile(supabase);
  const cls = await loadClass(supabase, profile.classId);
  const members = await loadMembers(supabase);
  const placements = await loadClassPlacements(supabase);
  const grid = await loadGrid(supabase);
  return {
    profile,
    layoutSeed: cls.layoutSeed,
    mapId: cls.mapId,
    shopOpen: cls.shopOpen,
    buildOpen: cls.buildOpen,
    members,
    placements,
    grid,
  };
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
      <div class="seg" role="group" aria-label="Grafik-Qualität">
        <button type="button" data-q="auto" aria-pressed="true">Auto</button>
        <button type="button" data-q="high" aria-pressed="false">Hoch</button>
        <button type="button" data-q="low" aria-pressed="false">Niedrig</button>
      </div>
      <button type="button" id="taskBoard">Aufgaben</button>
      <button type="button" id="ledger">Konto</button>
      <button type="button" id="shop">Shop</button>
      <button type="button" id="build">Bauen</button>
      <button type="button" id="toMarket">Marktplatz</button>
      <button type="button" id="toHouse">Mein Haus</button>
      <button type="button" id="logout" class="primary">Abmelden</button>
    </div>
    <p class="notice" id="notice" hidden></p>
  `;
  const notice = root.querySelector<HTMLParagraphElement>('#notice');
  const logoutBtn = root.querySelector<HTMLButtonElement>('#logout');

  let renderer: THREE.WebGLRenderer | null = null;
  let running = true;
  let frames: number[] = [];
  let autoResult: QualityLevel | null = null;
  let choice: QualityChoice = 'auto';

  const stop = (): void => {
    buildMode?.dispose();
    document.querySelectorAll('.overlay').forEach((el) => el.remove());
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
  const cameraRef = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  const resize = (): void => {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    cameraRef.aspect = w / h;
    cameraRef.updateProjectionMatrix();
  };

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

  const { profile, layoutSeed, mapId, shopOpen, buildOpen, members, placements, grid } = loaded;
  const who = root.querySelector<HTMLSpanElement>('#who');
  const coins = root.querySelector<HTMLSpanElement>('#coins');
  if (who) who.textContent = profile.nickname;
  let coinsNow = profile.coins;
  const showCoins = (): void => {
    if (coins) coins.textContent = `${coinsNow} Münzen`;
  };
  showCoins();

  // shop and task board open as overlays above the village
  const onCoins = (c: number): void => {
    if (c > coinsNow) showGain(c - coinsNow);
    coinsNow = c;
    showCoins();
  };
  // short '+10' next to the coins, so the pupil sees what the answer or the shop changed
  const showGain = (amount: number): void => {
    if (!coins?.parentElement) return;
    const tag = document.createElement('span');
    tag.className = 'gain';
    tag.textContent = `+${amount}`;
    coins.parentElement.appendChild(tag);
    window.setTimeout(() => tag.remove(), 1400);
  };
  root
    .querySelector<HTMLButtonElement>('#shop')
    ?.addEventListener(
      'click',
      () => void openShop({ supabase, shopOpen, coins: coinsNow, onCoins, onClose: () => undefined }),
    );
  root
    .querySelector<HTMLButtonElement>('#ledger')
    ?.addEventListener('click', () => void openLedger(supabase, () => undefined));
  root
    .querySelector<HTMLButtonElement>('#taskBoard')
    ?.addEventListener(
      'click',
      () => void openTaskBoard({ supabase, coins: coinsNow, onCoins, onClose: () => undefined }),
    );

  const stage = document.createElement('div');
  stage.className = 'stage';
  root.appendChild(stage);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  const gl = renderer;

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

  const layout = buildLayout(layoutSeed, PLOT_COUNT, mapId);
  const ownPlot = profile.plotIndex;
  const labels = members
    .filter((m) => m.plotIndex !== null)
    .map((m) => ({ plotIndex: m.plotIndex as number, nickname: m.nickname }));
  const village = buildVillage(layout, labels, ownPlot);
  scene.add(village);
  // decorations of the whole class (PLAN 4.5), one instanced mesh per item type
  const plotOf = new Map(
    members.filter((m) => m.plotIndex !== null).map((m) => [m.id, m.plotIndex as number]),
  );
  scene.add(buildPlacements(layout, placements, plotOf, grid));

  const crowd = new Crowd(
    scene,
    layout,
    members.map((m) => ({ nickname: m.nickname, own: m.id === profile.id })),
  );

  // quality: applied now, and again when Auto has measured
  const applyQuality = (): void => {
    const level = effectiveLevel(choice, autoResult);
    const s = settingsFor(level);
    gl.shadowMap.enabled = s.shadows;
    sun.castShadow = s.shadows;
    gl.setPixelRatio(Math.min(window.devicePixelRatio, s.maxPixelRatio));
    resize();
    root
      .querySelectorAll<HTMLButtonElement>('[data-q]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.q === choice)));
  };
  root.querySelectorAll<HTMLButtonElement>('[data-q]').forEach((b) =>
    b.addEventListener('click', () => {
      choice = b.dataset.q as QualityChoice;
      applyQuality();
    }),
  );

  // camera: start on the own house, buttons jump to the market or the house
  const home = ownPlot !== null ? layout.plots[ownPlot] : undefined;
  const homeTarget = home ? new THREE.Vector3(home.x, home.h, home.z) : new THREE.Vector3(-2, 0, 2);
  const marketTarget = new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z);
  const camera = cameraRef;
  camera.position.copy(homeTarget).add(new THREE.Vector3(14, 22, 26));
  const controls = new OrbitControls(camera, gl.domElement);
  controls.target.copy(homeTarget);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 110;
  controls.maxPolarAngle = 1.2;
  const jumpTo = (t: THREE.Vector3): void => {
    const offset = camera.position.clone().sub(controls.target);
    controls.target.copy(t);
    camera.position.copy(t).add(offset);
  };
  root.querySelector<HTMLButtonElement>('#toMarket')?.addEventListener('click', () => jumpTo(marketTarget));
  root.querySelector<HTMLButtonElement>('#toHouse')?.addEventListener('click', () => jumpTo(homeTarget));
  controls.update();

  // tap a villager: it waves. A drag (camera move) is not a tap.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;
  gl.domElement.addEventListener('pointerdown', (ev) => (down = { x: ev.clientX, y: ev.clientY }));
  gl.domElement.addEventListener('pointerup', (ev) => {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 8) return;
    const rect = gl.domElement.getBoundingClientRect();
    pointer.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    // in build mode a tap picks a cell of the own plot; otherwise a villager waves
    if (buildMode?.isActive) {
      buildMode.handleTap(pointer, camera);
      return;
    }
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true)[0];
    const v = hit ? crowd.findByObject(hit.object) : null;
    if (v) {
      crowd.wave(v);
      return;
    }
    // the task board: tap the board in the market
    if (hit && hit.object.userData.kind === 'board' && !buildMode?.isActive) {
      void openTaskBoard({ supabase, coins: coinsNow, onCoins, onClose: () => undefined });
    }
  });

  // build mode: only on the own plot; the camera comes back when the pupil is done
  let buildMode: BuildMode | null = null;
  const exitBuild = (): void => {
    buildMode?.exit();
    jumpTo(homeTarget);
  };
  if (home) {
    buildMode = new BuildMode({ scene, plot: home, supabase, uid: profile.id, onChange: () => exitBuild() });
  }
  root.querySelector<HTMLButtonElement>('#build')?.addEventListener('click', async () => {
    if (!buildMode) return showNotice('Du hast noch kein Grundstück.');
    if (!buildOpen) return showNotice('Das Bauen ist gerade geschlossen.');
    const err = await buildMode.enter();
    if (err) return showNotice(err);
    jumpTo(homeTarget);
  });
  const showNotice = (text: string): void => {
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = text;
    window.setTimeout(() => (notice.hidden = true), 3000);
  };

  window.addEventListener('resize', resize);
  applyQuality();

  // animation loop: frames for Auto, then Auto decides once
  let last = performance.now();
  let elapsed = 0;
  gl.setAnimationLoop(() => {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    const frameMs = now - last;
    last = now;
    if (autoResult === null) {
      elapsed += dt;
      frames.push(frameMs);
      if (elapsed >= AUTO_MEASURE_SECONDS) {
        autoResult = decideAuto(frames);
        frames = [];
        applyQuality();
      }
    }
    crowd.update(dt);
    (village.userData.animate as ((t: number) => void) | undefined)?.(performance.now() / 1000);
    controls.update();
    gl.render(scene, camera);
  });

  for (const ev of activity) window.addEventListener(ev, onActivity, { passive: true });
  autoLogout.touch();

  return { dispose: stop };
}
