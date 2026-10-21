/**
 * The village screen for a logged-in pupil: 3D village, villagers, own house marked,
 * main navigation (Dorf / Aufgaben / Mein Haus), the areas behind it (house menu, shop, inventory,
 * build mode, task board), settings menu, and automatic logout after 15 minutes.
 * Glue only: the area logic lives in ui/areas.ts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AutoLogout, AUTO_LOGOUT_MS } from '../auth/autoLogout';
import {
  PLOT_COUNT,
  claimPlot,
  loadClass,
  loadMembers,
  loadMyProfile,
  type Member,
  type MyProfile,
} from '../api/village';
import { buildLayout, type Plot } from '../world/layout';
import { buildVillage } from '../render/village';
import { loadClassSlots, type SlotMap } from '../api/build';
import { Crowd } from '../render/crowd';
import { setupScene } from '../render/scene';
import { supabaseItemApi, type ItemKind } from '../api/items';
import {
  HOUSE_AREAS,
  createAreaController,
  createModalTracker,
  type AreaController,
  type AreaHandle,
} from './areas';
import { createTapDetector } from './tapDetector';
import { createGameNav, type GameNav, type NavArea } from './gameNav';
import { openHouseMenu } from './houseMenu';
import { openShop } from './shopView';
import { openInventory } from './inventoryView';
import { openTaskBoard } from './taskBoardView';
import { openLedger } from './ledgerView';
import { openAccountMenu } from './accountMenu';
import { BuildMode, type EnterOptions } from '../render/buildMode';
import { FLIGHT_SECONDS, houseView, lerpPose, onPlot, type CameraPose } from '../render/houseCamera';
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
  /** Slots of every classmate, by player id. */
  slots: Map<string, SlotMap>;
}

async function load(supabase: SupabaseClient): Promise<Loaded> {
  const profile = await loadMyProfile(supabase);
  const cls = await loadClass(supabase, profile.classId);
  const members = await loadMembers(supabase);
  const slots = await loadClassSlots(supabase);
  return {
    profile,
    layoutSeed: cls.layoutSeed,
    mapId: cls.mapId,
    shopOpen: cls.shopOpen,
    buildOpen: cls.buildOpen,
    members,
    slots,
  };
}

/** Shows the village. Calls `onLogout` after a manual or automatic logout. */
/** The free plot under a point on the ground, if any. Lots are not separate meshes, so the point decides. */
function freePlotAt(plots: Plot[], occupied: Set<number>, p: THREE.Vector3): Plot | undefined {
  return plots.find((q) => {
    if (occupied.has(q.index)) return false;
    return onPlot(q, p);
  });
}

export async function mountVillage(
  root: HTMLElement,
  supabase: SupabaseClient,
  onLogout: () => void,
): Promise<VillageHandle> {
  root.innerHTML = `
    <div class="dorf-actions"><button type="button" id="toMarket">Marktplatz</button></div>
    <p class="notice" id="notice" hidden></p>
  `;
  const notice = root.querySelector<HTMLParagraphElement>('#notice');

  let renderer: THREE.WebGLRenderer | null = null;
  let running = true;
  let frames: number[] = [];
  let autoResult: QualityLevel | null = null;
  let choice: QualityChoice = 'auto';
  let nav: GameNav | null = null;
  let areas: AreaController | null = null;
  const modals = createModalTracker();
  // Escape leaves the house menu even when focus is not inside it; a modal handles its own Escape first
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented || modals.anyOpen) return;
    if (areas?.current === 'haus') void areas.select('dorf');
  };
  document.addEventListener('keydown', onEscape);

  let removeWindowPointer: (() => void) | null = null;
  const stop = (): void => {
    // close the current area (the build preview reverts via exit) and every open modal, so no `inert` is left behind
    void areas?.select('dorf');
    buildMode?.dispose();
    modals.closeAll();
    document.querySelectorAll('.overlay:not(.modal), .house-menu').forEach((el) => el.remove());
    nav?.el.remove();
    document.removeEventListener('keydown', onEscape);
    removeWindowPointer?.();
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
    renderOnce?.();
  };
  // while an area covers the canvas, a resize or quality change still repaints one frame
  let renderOnce: (() => void) | null = null;

  // auto-logout also runs on the error screen
  for (const ev of activity) window.addEventListener(ev, onActivity, { passive: true });
  autoLogout.touch();

  let loaded: Loaded;
  try {
    loaded = await load(supabase);
  } catch (err) {
    console.error(err);
    if (notice) {
      notice.hidden = false;
      notice.textContent = 'Das Dorf konnte nicht geladen werden. Bitte die Seite neu laden.';
    }
    // the session must stay endable on a shared tablet
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'primary load-logout';
    out.textContent = 'Abmelden';
    out.addEventListener('click', () => void logout());
    root.appendChild(out);
    return { dispose: stop };
  }

  const { profile, layoutSeed, mapId, shopOpen, buildOpen, members, slots } = loaded;
  let coinsNow = profile.coins;
  // single source of truth for the coin value; nav status and item areas read from here
  const onCoins = (c: number): void => {
    coinsNow = c;
    nav?.setCoins(c);
  };

  const stage = document.createElement('div');
  stage.className = 'stage';
  root.appendChild(stage);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);
  const gl = renderer;

  const scene = new THREE.Scene();
  // sky panorama, fog and light (LOOK §3, render/scene.ts)
  const rig = setupScene(scene);
  const sun = rig.sun;

  const layout = buildLayout(layoutSeed, PLOT_COUNT, mapId);
  const ownPlot = profile.plotIndex;
  const occupied = new Set(members.filter((m) => m.plotIndex !== null).map((m) => m.plotIndex as number));
  // a pupil without a plot chooses one of the free lots (SPEC §10.5)
  const chooseLot = async (index: number): Promise<void> => {
    if (!window.confirm('Hier dein Haus bauen? Die Wahl gilt dauerhaft.')) return;
    const r = await claimPlot(supabase, index);
    if (!r.ok) {
      window.alert(
        r.message.includes('taken')
          ? 'Dieses Grundstück ist schon vergeben.'
          : 'Das hat nicht geklappt. Bitte versuche es noch einmal.',
      );
      return;
    }
    window.location.reload();
  };
  if (ownPlot === null) {
    const hint = document.createElement('div');
    hint.textContent =
      'Wähle ein freies Grundstück: tippe auf eine Wiese mit Pflöcken. Die Wahl gilt dauerhaft.';
    hint.style.cssText =
      'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:5;background:#fff;color:#222;padding:8px 14px;border-radius:10px;font-size:14px;max-width:90vw;text-align:center;';
    root.appendChild(hint);
  }
  const labels = members
    .filter((m) => m.plotIndex !== null)
    .map((m) => ({ plotIndex: m.plotIndex as number, nickname: m.nickname, slots: slots.get(m.id) ?? {} }));
  const village = buildVillage(layout, labels, ownPlot);
  scene.add(village);
  // the river reflects the sky panorama once it has loaded
  void rig.skyReady.then((sky) => {
    if (sky) (village.userData.setSky as ((t: THREE.Texture) => void) | undefined)?.(sky);
  });

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
  };

  // camera: start on the own house; the market button jumps, house areas fly to the fixed house view
  const home = ownPlot !== null ? layout.plots[ownPlot] : undefined;
  const homeTarget = home ? new THREE.Vector3(home.x, home.h, home.z) : new THREE.Vector3(-2, 0, 2);
  const marketTarget = new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z);
  const camera = cameraRef;
  camera.position.copy(homeTarget).add(new THREE.Vector3(14, 22, 26));
  const controls = new OrbitControls(camera, gl.domElement);
  controls.target.copy(homeTarget);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 150;
  controls.maxPolarAngle = 1.2;
  const jumpTo = (t: THREE.Vector3): void => {
    const offset = camera.position.clone().sub(controls.target);
    controls.target.copy(t);
    camera.position.copy(t).add(offset);
  };
  root.querySelector<HTMLButtonElement>('#toMarket')?.addEventListener('click', () => jumpTo(marketTarget));
  controls.update();

  // camera flight into the house view (animation loop advances it)
  let flight: { from: CameraPose; to: CameraPose; t: number } | null = null;
  let paused = false;
  const reducedMotion = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const applyControls = (area: NavArea): void => {
    if (!HOUSE_AREAS.has(area)) {
      flight = null; // leaving the house cancels a running flight
      controls.enabled = true;
      controls.enablePan = true;
    } else if (area === 'bauen') {
      controls.enabled = flight === null;
      controls.enablePan = false;
    } else {
      controls.enabled = false;
    }
  };
  const setPose = (pose: CameraPose): void => {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    controls.update();
  };
  renderOnce = () => {
    if (paused && running) gl.render(scene, camera);
  };
  const finishFlight = (): void => {
    if (!flight) return;
    setPose(lerpPose(flight.from, flight.to, 1));
    flight = null;
  };
  const onAreaChange = (area: NavArea, previous: NavArea): void => {
    if (!running) return;
    nav?.setActive(area);
    const dorfActions = root.querySelector<HTMLElement>('.dorf-actions');
    if (dorfActions) dorfActions.hidden = area !== 'dorf';
    if (home && HOUSE_AREAS.has(area) && !HOUSE_AREAS.has(previous)) {
      const from: CameraPose = { position: camera.position.clone(), target: controls.target.clone() };
      flight = { from, to: houseView(home), t: 0 };
      if (reducedMotion()) finishFlight();
    }
    paused = area === 'shop' || area === 'inventar' || area === 'aufgaben';
    if (paused) finishFlight(); // the camera is in place before rendering stops
    applyControls(area);
  };

  // tap a villager: it waves. A drag (camera move) is not a tap.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const taps = createTapDetector(8);
  gl.domElement.addEventListener('pointerdown', (ev) =>
    taps.down(ev.pointerId, ev.clientX, ev.clientY, ev.isPrimary),
  );
  // up/cancel may end outside the canvas (nav, menu): window listeners keep the detector from getting stuck
  const onWindowPointerEnd = (ev: PointerEvent): void => taps.release(ev.pointerId);
  const onWindowPointerCancel = (ev: PointerEvent): void => taps.cancel(ev.pointerId);
  window.addEventListener('pointerup', onWindowPointerEnd);
  window.addEventListener('pointercancel', onWindowPointerCancel);
  removeWindowPointer = () => {
    window.removeEventListener('pointerup', onWindowPointerEnd);
    window.removeEventListener('pointercancel', onWindowPointerCancel);
  };
  gl.domElement.addEventListener('pointerup', (ev) => {
    // a drag, a pinch or a cancelled gesture is not a tap
    if (!taps.up(ev.pointerId, ev.clientX, ev.clientY)) return;
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
    // a pupil without a plot: tap a free lot to build there
    if (hit && ownPlot === null) {
      const lot = freePlotAt(layout.plots, occupied, hit.point);
      if (lot) {
        void chooseLot(lot.index);
        return;
      }
    }
    // the task board: tap the board in the market
    if (hit && hit.object.userData.kind === 'board') {
      void areas?.select('aufgaben');
      return;
    }
    // the own house: tap opens the house menu
    if (hit && home && onPlot(home, hit.point)) void areas?.select('haus');
  });

  // build mode: only on the own plot
  let buildMode: BuildMode | null = null;
  if (home) {
    buildMode = new BuildMode({
      scene,
      plot: home,
      supabase,
      uid: profile.id,
      onSlots: (s) => (village.userData.updateOwnPlot as ((s: SlotMap) => void) | undefined)?.(s),
      onDone: () => void areas?.select('haus'),
    });
  }
  const enterBuild = async (opts?: EnterOptions): Promise<AreaHandle | null> => {
    if (!buildMode) {
      showNotice('Du hast noch kein Grundstück.');
      return null;
    }
    if (!buildOpen) {
      showNotice('Das Bauen ist gerade geschlossen.');
      return null;
    }
    const err = await buildMode.enter(opts);
    if (err) {
      showNotice(err);
      return null;
    }
    const mode = buildMode;
    return { close: () => mode.exit() };
  };
  const showNotice = (text: string): void => {
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = text;
    window.setTimeout(() => (notice.hidden = true), 3000);
  };

  // settings menu and ledger are modals; tracked so logout can close them properly
  const openSettings = (opener: HTMLElement): void => {
    modals.track(
      openAccountMenu({
        opener,
        nickname: profile.nickname,
        coins: coinsNow,
        quality: choice,
        onQuality: (q) => {
          choice = q;
          applyQuality();
        },
        onLedger: () => modals.track(openLedger(supabase, opener)),
        onLogout: () => void logout(),
      }),
    );
  };

  const categories: Partial<Record<'shop' | 'inventar', ItemKind | null>> = {};
  const itemOptions = (area: 'shop' | 'inventar') => ({
    api: supabaseItemApi(supabase, profile.id),
    getCoins: () => coinsNow,
    onCoins,
    shopOpen,
    buildOpen,
    category: categories[area] ?? null,
    onCategory: (k: ItemKind) => {
      categories[area] = k;
    },
    onBuild: (itemId: string) => void areas?.open('bauen', () => enterBuild({ itemId })),
    onShowSlot: (slotId: EnterOptions['slotId']) => void areas?.open('bauen', () => enterBuild({ slotId })),
    onClose: () => void areas?.select('haus'),
  });

  const ctl = createAreaController({
    openers: {
      aufgaben: async () =>
        openTaskBoard({ supabase, coins: coinsNow, onCoins, onClose: () => void areas?.select('dorf') }),
      haus: async () => {
        if (!home) {
          showNotice('Du hast noch kein Grundstück.');
          return null;
        }
        return openHouseMenu({
          onBuild: () => void areas?.select('bauen'),
          onShop: () => void areas?.select('shop'),
          onInventory: () => void areas?.select('inventar'),
          onSettings: openSettings,
          onBack: () => void areas?.select('dorf'),
        });
      },
      shop: async () =>
        openShop({ ...itemOptions('shop'), onOpenInventory: () => void areas?.select('inventar') }),
      inventar: async () => openInventory(itemOptions('inventar')),
      bauen: () => enterBuild(),
    },
    onChange: onAreaChange,
  });
  areas = ctl;

  nav = createGameNav({
    nickname: profile.nickname,
    coins: coinsNow,
    onSelect: (area) => void ctl.select(area),
    onAccount: openSettings,
  });
  root.appendChild(nav.el);
  nav.setActive('dorf');

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
    if (flight) {
      flight.t += dt;
      if (flight.t >= FLIGHT_SECONDS) finishFlight();
      else setPose(lerpPose(flight.from, flight.to, flight.t / FLIGHT_SECONDS));
      if (!flight) applyControls(areas?.current ?? 'dorf');
    }
    // covered by an area: no rendering and no Auto measurement
    if (paused) return;
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
    (village.userData.labelUpdate as ((c: THREE.Camera) => void) | undefined)?.(camera);
    crowd.updateLabels(camera);
    controls.update();
    rig.follow(controls.target);
    gl.render(scene, camera);
  });

  return { dispose: stop };
}
