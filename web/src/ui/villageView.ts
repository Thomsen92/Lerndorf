import { tr } from '../i18n';
/**
 * The village screen for a logged-in pupil: 3D village, villagers, own house marked,
 * main navigation (Dorf / Aufgaben / Mein Haus), the areas behind it (house menu, shop, inventory,
 * build mode, daily quests), settings menu, and automatic logout after 15 minutes.
 * A pupil who has not finished the first-login tutorial gets it first (ui/tutorial/flow.ts); meanwhile
 * the main navigation is locked, the account menu (logout) stays usable.
 * Glue only: the area logic lives in ui/areas.ts.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  configureTabletCamera,
  bindVillageTwist,
  limitVillagePan,
  stopOrbitMotion,
  zoomVillageCamera,
} from '../render/tabletCamera';
import { createCameraTools } from './cameraTools';
import { createHouseCards } from './houseCards';
import { createQuestBoardCue } from './questBoardCue';
import { questBoardView } from '../render/questBoardCamera';
import { openVisitorProfile } from './visitorProfile';
import { loadPublicProfile } from '../api/publicProfile';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AutoLogout, AUTO_LOGOUT_MS } from '../auth/autoLogout';
import {
  PLOT_COUNT,
  loadClass,
  loadMembers,
  loadMyProfile,
  saveCharacter,
  type Member,
  type MyProfile,
} from '../api/village';
import { buildLayout } from '../world/layout';
import { buildVillage } from '../render/village';
import { loadClassSlots, type SlotMap } from '../api/build';
import { Crowd } from '../render/crowd';
import { createDoubleTap } from '../avatars/doubleTap';
import { setupScene } from '../render/scene';
import { worldThemeApi, type WorldThemeState } from '../api/worldTheme';
import { collectionApi } from '../api/collection';
import { collectionCatalog } from '../collection/catalog';
import { openCollection } from '../collection/collectionView';
import { createWorldThemeController, type WorldThemeController } from '../season/worldThemeController';
import { createWorldAppearance, isWorldObjectVisible, type WorldAppearance } from '../season/worldAppearance';
import { createSeasonHub } from '../season/seasonHub';
import { openSpookyQuiz } from '../season/spookyQuizView';
import { seasonStarterApi } from '../api/seasonStarter';
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
import { openWardrobe } from './wardrobeView';
import { supabaseWardrobeApi } from '../api/wardrobe';
import { emptyLook, readWardrobe } from '../avatars/look';
import { openShop } from './shopView';
import { openInventory } from './inventoryView';
import { seasonApi } from '../api/season';
import { avatarPortrait } from './frames';
import { openLearnPass } from './learnpass/openLearnPass';
import { openDailyQuests } from './dailyQuestsView';
import { loadDailyQuests } from '../api/quests';
import { openLedger } from './ledgerView';
import { openAccountMenu } from './accountMenu';
import { openCharacterPicker } from './characterPicker';
import { BuildMode, type EnterOptions } from '../render/buildMode';
import { BuildFx, loadPuffTexture } from '../render/buildFx';
import { createSound } from './sound';
import { createMarketByte, marketBoardPose, marketStopPose, type MarketByte } from '../mascot/marketByte';
import { silenceSirByte } from '../mascot/voice';
import { acquireSessionThumbs } from '../render/itemThumbs';
import type { SlotId } from '../world/plotPlan';
import { sheetViewOffset } from '../render/houseCamera';
import { FLIGHT_SECONDS, houseView, lerpPose, onPlot, type CameraPose } from '../render/houseCamera';
import { closeUpPath, introPath, type CameraPath } from '../render/introCamera';
import { frameTutorialSubjects } from '../render/tutorialFraming';
import { runComicWipe } from './comicWipe';
import { finishTutorial, getTutorialState, type TutorialState } from '../api/tutorial';
import { runTutorial, type TutorialVillage } from './tutorial/flow';
import { PLACE_BUTTON, PLACE_HINT } from './tutorial/messages';
import { supabaseProgressApi, type ProgressDelta } from '../api/progress';
import { createAvatarBadge } from './avatarBadge';
import { createProgressFlow } from './progressFlow';
import { loadClassNotice } from '../api/notice';
import { openNoticeCard } from './noticeCard';
import { setBoardNote } from '../render/plaza';
import type { ReadOnlyView } from './readOnlyVillage';
import { openProfile } from './profileView';
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

/** Tutorial state; null when no tutorial is needed. Throws when it cannot be read. */
async function loadTutorial(supabase: SupabaseClient): Promise<TutorialState | null> {
  const res = await getTutorialState(supabase);
  if (!res.ok) throw new Error(res.message);
  if (!res.value.needed && res.value.step === 'done') {
    // A reload after placement may have interrupted finish. The server grants XP only once.
    await finishTutorial(supabase).catch(() => undefined);
  }
  return res.value.needed ? res.value : null;
}

/** A camera path from `from` to the end pose of `path`, same duration. */
function pathFrom(from: CameraPose, path: CameraPath): CameraPath {
  const to = path.at(path.duration);
  return { duration: path.duration, at: (t) => lerpPose(from, to, Math.min(1, t / path.duration)) };
}

/** Shows the village. Calls `onLogout` after a manual or automatic logout. */
export async function mountVillage(
  root: HTMLElement,
  supabase: SupabaseClient,
  onLogout: () => void,
  opts: { readOnly?: ReadOnlyView } = {},
): Promise<VillageHandle> {
  if (opts.readOnly) {
    const { mountReadOnlyVillage } = await import('./readOnlyVillage');
    return mountReadOnlyVillage(root, supabase, opts.readOnly);
  }
  root.innerHTML = `
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
  let buildMode: BuildMode | null = null;
  const sound = createSound();
  // background loop everywhere in the village; it starts with the first tap (browser rule)
  sound.setMusic('village');
  let marketByte: MarketByte | null = null;
  const unlockSound = (): void => sound.unlock();
  window.addEventListener('pointerdown', unlockSound);
  window.addEventListener('keydown', unlockSound);
  let fx: BuildFx | null = null;
  let puffTexture: THREE.Texture | null = null;
  const thumbs = acquireSessionThumbs();
  /** true while the first-login tutorial runs: no areas, no camera control */
  let inTutorial = false;
  const tutorialAbort = new AbortController();
  const modals = createModalTracker();
  // Escape leaves the house menu even when focus is not inside it; a modal handles its own Escape first
  const onEscape = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.defaultPrevented || modals.anyOpen || inTutorial) return;
    if (areas?.current === 'haus') void areas.select('dorf');
  };
  document.addEventListener('keydown', onEscape);

  let removeWindowPointer: (() => void) | null = null;
  let disposeCameraControls = () => {};
  let disposeHouseCards = () => {};
  let disposeBoardCue = () => {};
  let disposeCrowd = () => {};
  let worldAppearance: WorldAppearance | null = null;
  let worldThemes: WorldThemeController | null = null;
  let seasonHub: ReturnType<typeof createSeasonHub> | null = null;
  let worldThemeState: WorldThemeState | null = null;
  const stop = (): void => {
    tutorialAbort.abort();
    worldThemes?.dispose();
    worldAppearance?.dispose();
    seasonHub?.dispose();
    disposeCrowd();
    // close the current area (the build preview reverts via exit) and every open modal, so no `inert` is left behind
    void areas?.select('dorf');
    buildMode?.dispose();
    fx?.dispose();
    puffTexture?.dispose();
    thumbs.release();
    sound.dispose();
    marketByte?.dispose();
    window.removeEventListener('pointerdown', unlockSound);
    window.removeEventListener('keydown', unlockSound);
    modals.closeAll();
    document
      .querySelectorAll('.overlay:not(.modal), .house-menu, .xp-toasts, .xp-fly')
      .forEach((el) => el.remove());
    nav?.el.remove();
    document.removeEventListener('keydown', onEscape);
    removeWindowPointer?.();
    autoLogout.stop();
    running = false;
    disposeCameraControls();
    disposeHouseCards();
    disposeBoardCue();
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
  const applySheetOffset = (open: boolean): void => {
    if (!open) {
      cameraRef.clearViewOffset();
      return;
    }
    const w = window.innerWidth,
      h = window.innerHeight;
    const off = sheetViewOffset(w, h);
    // Navigation also occupies space: centre the plot in the actually usable area.
    const navBounds = nav?.el.getBoundingClientRect();
    if (w >= h) off.x -= (navBounds?.width ?? 0) / 2;
    else off.y += (navBounds?.height ?? 0) / 2;
    cameraRef.setViewOffset(w, h, off.x, off.y, w, h);
  };
  const resize = (): void => {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    cameraRef.aspect = w / h;
    cameraRef.fov = w < h ? 52 : 38;
    if (buildMode?.sheetOpen) applySheetOffset(true);
    cameraRef.updateProjectionMatrix();
    renderOnce?.();
  };
  // while an area covers the canvas, a resize or quality change still repaints one frame
  let renderOnce: (() => void) | null = null;

  // auto-logout also runs on the error screen
  for (const ev of activity) window.addEventListener(ev, onActivity, { passive: true });
  autoLogout.touch();

  // The tutorial gives the pupil a plot (after the figure choice), so the village is built only when
  // the tutorial asks for it. It then receives the village's tutorial side.
  let villageReady: (v: TutorialVillage) => void = () => undefined;
  let villageFailed: (err: unknown) => void = () => undefined;
  const tutorialVillage = new Promise<TutorialVillage>((resolve, reject) => {
    villageReady = resolve;
    villageFailed = reject;
  });
  tutorialVillage.catch(() => undefined);
  let worldOnCoins: (c: number) => void = () => undefined;
  let worldOnProgress: (delta: ProgressDelta, from?: HTMLElement | null) => Promise<void> = async () =>
    undefined;
  let endTutorial: (openQuests: boolean) => void = () => undefined;
  let tutorialOver = false;

  let loaded: Loaded;
  try {
    const tutorial = await loadTutorial(supabase);
    if (tutorial) {
      inTutorial = true;
      // nothing of the game shows behind the figure choice
      let wantVillage: () => void = () => undefined;
      const villageWanted = new Promise<void>((r) => (wantVillage = r));
      const run = runTutorial({
        supabase,
        state: tutorial,
        signal: tutorialAbort.signal,
        sound,
        village: () => {
          wantVillage();
          return tutorialVillage;
        },
        onCoins: (c) => worldOnCoins(c),
        onProgress: (delta) => worldOnProgress(delta),
        openDailyQuests: () => endTutorial(true),
      });
      // whatever happens in the tutorial, the game is unlocked afterwards
      void run.finally(() => {
        tutorialOver = true;
        endTutorial(false);
      });
      await Promise.race([villageWanted, run]);
      if (!running) return { dispose: stop };
    }
    loaded = await load(supabase);
  } catch (err) {
    villageFailed(err);
    console.error(err);
    if (notice) {
      notice.hidden = false;
      notice.textContent = tr('Das Dorf konnte nicht geladen werden. Bitte die Seite neu laden.');
    }
    // the session must stay endable on a shared tablet
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'primary load-logout';
    out.textContent = tr('Abmelden');
    out.addEventListener('click', () => void logout());
    root.appendChild(out);
    return { dispose: stop };
  }

  // the tutorial may have ended before the village stood (e.g. an error): then play normally
  if (tutorialOver) {
    inTutorial = false;
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
  // the plot is assigned by the server in the tutorial (tutorial_start); there is no manual choice
  const ownPlot = profile.plotIndex;
  const labels = members
    .filter((m) => m.plotIndex !== null)
    .map((m) => ({
      plotIndex: m.plotIndex as number,
      nickname: m.nickname,
      slots: slots.get(m.id) ?? {},
      level: m.level,
      titleLabel: m.titleLabel,
    }));
  const village = buildVillage(layout, labels, ownPlot);
  scene.add(village);
  village.userData.externalHouseCards = true;
  village.traverse((object) => {
    if (object instanceof THREE.Sprite && object.userData.house) {
      object.visible = false;
      object.raycast = () => {};
    }
  });
  const showVisitor = (id: string, opener?: HTMLElement) => {
    stopOrbitMotion(controls);
    modals.track(
      openVisitorProfile({
        id,
        opener,
        load: async (playerId) => {
          const result = await loadPublicProfile(supabase, playerId);
          if (result.ok && running) houseCards.updateMember(result.value);
          return result;
        },
      }),
    );
  };
  const houseCards = createHouseCards({
    host: root,
    plots: layout.plots,
    members,
    ownId: profile.id,
    onOwn: () => void areas?.select('haus'),
    onVisit: showVisitor,
  });
  houseCards.setVisible(!inTutorial);
  disposeHouseCards = () => houseCards.dispose();
  const classNotice = loadClassNotice(supabase, profile.classId).then((n) => {
    if (running) setBoardNote(village, n?.text ?? null);
    return n;
  });
  const showClassNotice = async (): Promise<void> => {
    const n = await classNotice;
    if (!n || !running) return;
    await new Promise<void>((resolve) => {
      const card = openNoticeCard(n, { onDone: resolve });
      if (card) modals.track(card);
      else resolve();
    });
  };
  marketByte = createMarketByte({
    scene,
    layout,
    sound,
    openQuests: () => void areas?.select('aufgaben'),
    questState: async () => {
      const result = await loadDailyQuests(supabase);
      return result.ok
        ? {
            todayOpen: result.value.some((q) => !q.catchUp && !q.solved),
            catchUpOpen: result.value.some((q) => q.catchUp && !q.solved),
          }
        : { todayOpen: true, catchUpOpen: false };
    },
  });
  const byte = marketByte;
  // the river reflects the sky panorama once it has loaded
  void rig.skyReady.then((sky) => {
    if (sky) (village.userData.setSky as ((t: THREE.Texture) => void) | undefined)?.(sky);
  });

  const figureTap = createDoubleTap(350);
  const crowd = new Crowd(
    scene,
    layout,
    members.map((m) => ({
      nickname: m.nickname,
      own: m.id === profile.id,
      character: m.character,
      look: m.wardrobe?.[m.character ?? 'boy'],
      level: m.level,
      titleLabel: m.titleLabel,
    })),
  );

  // quality: applied now, and again when Auto has measured
  disposeCrowd = () => crowd.dispose();
  const applyQuality = (): void => {
    const level = effectiveLevel(choice, autoResult);
    const s = settingsFor(level);
    gl.shadowMap.enabled = s.shadows;
    sun.castShadow = s.shadows;
    byte.setQuality(level);
    gl.setPixelRatio(Math.min(window.devicePixelRatio, s.maxPixelRatio));
    resize();
  };

  // camera: start on the own house; the market button jumps, house areas fly to the fixed house view
  const home = ownPlot !== null ? layout.plots[ownPlot] : undefined;
  const homeTarget = home ? new THREE.Vector3(home.x, home.h, home.z) : new THREE.Vector3(-2, 0, 2);
  const marketTarget = new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z);
  const camera = cameraRef;
  let marketCameraElevation = 0;
  let marketFocused = false;
  camera.position.copy(homeTarget).add(new THREE.Vector3(14, 22, 26));
  const controls = new OrbitControls(camera, gl.domElement);
  controls.target.copy(homeTarget);
  configureTabletCamera(controls, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  controls.update();
  const releaseTwist = bindVillageTwist(gl.domElement, controls);
  controls.addEventListener?.('start', () => {
    if (marketFocused) {
      marketFocused = false;
      houseCards.setVisible(!inTutorial && (areas?.current ?? 'dorf') === 'dorf');
    }
  });
  const cameraTools = createCameraTools({
    home: !!home,
    zoom: (factor) => zoomVillageCamera(controls, factor),
    reset: () => {
      byte.guide.hideBubble();
      marketCameraElevation = 0;
      marketFocused = false;
      houseCards.setVisible(!inTutorial);
      stopOrbitMotion(controls);
      flight = null;
      camera.position.copy(homeTarget).add(new THREE.Vector3(14, 22, 26));
      controls.target.copy(homeTarget);
      controls.enabled = true;
      controls.enablePan = true;
      controls.update();
    },
  });
  cameraTools.hidden = inTutorial;
  root.append(cameraTools);
  disposeCameraControls = () => {
    releaseTwist();
    cameraTools.remove();
    controls.dispose?.();
  };

  // camera flight into the house view (animation loop advances it)
  let flight: { from: CameraPose; to: CameraPose; t: number; onArrive?: () => void } | null = null;
  let paused = false;
  const boardObject = village.getObjectByName('questBoard');
  const boardCue = createQuestBoardCue({
    host: root,
    board: boardObject,
    layout,
    onOpen: () => {
      if (!inTutorial && !flight) void areas?.select('aufgaben');
    },
  });
  boardCue.setVisible(!inTutorial);
  disposeBoardCue = () => boardCue.dispose();
  const reducedMotion = (): boolean =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  puffTexture = loadPuffTexture();
  fx = new BuildFx(scene, { texture: puffTexture, reducedMotion });

  // The shop, HUD ticket and profile all enter the same existing LearnPass.
  const openSeasonPass = (): void => {
    modals.track(
      openLearnPass({
        api: seasonApi(supabase),
        getCoins: () => coinsNow,
        onCoins,
        reducedMotion: reducedMotion(),
        onOpenInventory: () => void areas?.select('inventar'),
        // frame rewards show the player's own portrait in the season frame (plan §14.2)
        portrait: (frameId) =>
          avatarPortrait({
            character: myCharacter,
            look: myWardrobe[myCharacter ?? 'boy'],
            frameId,
            size: 'small',
          }),
      }),
    );
  };
  // The almanach is a separate, personal view; it never grants or changes anything.
  const openCollectionAlmanach = async (): Promise<void> => {
    try {
      const [catalog, season] = await Promise.all([collectionCatalog(), seasonApi(supabase).state()]);
      if (!running) return;
      openCollection({
        api: collectionApi(supabase),
        seasonId: season.season.id,
        catalog,
        reducedMotion: reducedMotion(),
      });
    } catch {
      showNotice(tr('Die Sammlung konnte nicht geladen werden.'));
    }
  };
  worldAppearance = createWorldAppearance({ scene, village, layout, rig, renderer: gl });
  worldThemes = createWorldThemeController({
    classId: profile.classId,
    read: () => worldThemeApi(supabase).state(),
    apply: (state) => {
      worldThemeState = state;
      worldAppearance?.setTheme(state.effectiveTheme);
      seasonHub?.setState(state);
      seasonHub?.maybeAutoOpen();
      renderOnce?.();
    },
  });
  void worldThemes.refresh();
  seasonHub = createSeasonHub({
    host: root,
    openLearnPass: openSeasonPass,
    openQuiz: () => {
      const seasonId = worldThemeState?.seasonId;
      if (!seasonId || !running) return;
      openSpookyQuiz({
        api: seasonStarterApi(supabase),
        seasonId,
        opener: seasonHub?.el ?? null,
        openLearnPass: openSeasonPass,
        // XP badge, level-up and pass refresh run through the same flow as daily quests
        onProgress: (delta) => void worldOnProgress(delta),
        track: (handle) => modals.track(handle),
      });
    },
    canOpen: () =>
      running && !inTutorial && !modals.anyOpen && !flight && (areas?.current ?? 'dorf') === 'dorf',
    track: (handle) => {
      modals.track(handle);
    },
    onAcknowledge: (seasonId) => {
      void worldThemeApi(supabase)
        .acknowledgeWelcome(seasonId)
        .catch(() => {
          // The dialog stays usable; the server retries on the next entry.
        });
    },
  });
  seasonHub.setState(worldThemeState);
  seasonHub.setVisible(!inTutorial);
  const applyControls = (area: NavArea): void => {
    cameraTools.hidden = inTutorial || area !== 'dorf';
    houseCards.setVisible(!inTutorial && area === 'dorf' && !marketFocused);
    boardCue.setVisible(!inTutorial && area === 'dorf');
    seasonHub?.setVisible(!inTutorial && area === 'dorf');
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
    const arrived = flight;
    setPose(lerpPose(arrived.from, arrived.to, 1));
    flight = null;
    arrived.onArrive?.();
  };
  const onAreaChange = (area: NavArea, previous: NavArea): void => {
    if (!running) return;
    if (inTutorial) return;
    nav?.setActive(area);
    if (home && HOUSE_AREAS.has(area) && !HOUSE_AREAS.has(previous)) {
      byte.guide.hideBubble();
      marketCameraElevation = 0;
      marketFocused = false;
      stopOrbitMotion(controls);
      const from: CameraPose = { position: camera.position.clone(), target: controls.target.clone() };
      flight = { from, to: houseView(home), t: 0 };
      if (reducedMotion()) finishFlight();
    }
    paused =
      area === 'shop' ||
      area === 'inventar' ||
      area === 'aufgaben' ||
      area === 'profil' ||
      area === 'kleiderschrank';
    if (nav) {
      nav.el.inert = area === 'kleiderschrank';
      nav.el.style.visibility = area === 'kleiderschrank' ? 'hidden' : '';
    }
    byte.setCovered(paused);
    if (paused) finishFlight(); // the camera is in place before rendering stops
    applyControls(area);
  };

  // tap a villager: it waves. A drag (camera move) is not a tap.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  gl.domElement.addEventListener('pointermove', (ev) => {
    if (inTutorial || paused || flight || ev.buttons || !boardObject) {
      boardCue.setHovered(false);
      return;
    }
    const rect = gl.domElement.getBoundingClientRect();
    pointer.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hovered = raycaster.intersectObject(boardObject, true).length > 0;
    boardCue.setHovered(hovered);
    gl.domElement.style.cursor = hovered ? 'pointer' : '';
  });
  gl.domElement.addEventListener('pointerleave', () => {
    boardCue.setHovered(false);
    gl.domElement.style.cursor = '';
  });
  const taps = createTapDetector(8);
  gl.domElement.addEventListener('pointerdown', (ev) =>
    taps.down(ev.pointerId, ev.clientX, ev.clientY, ev.isPrimary),
  );
  gl.domElement.addEventListener('pointermove', (ev) => taps.move(ev.pointerId, ev.clientX, ev.clientY));
  gl.domElement.addEventListener('lostpointercapture', (ev) => taps.cancel(ev.pointerId));
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
    // in build mode a tap picks a cell of the own plot; otherwise a villager dances (tap: catwalk, double tap: dance)
    if (buildMode?.isActive) {
      buildMode.handleTap(pointer, camera);
      return;
    }
    // the tutorial leads; taps on the village do nothing meanwhile
    if (inTutorial) return;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, true).find((h) => isWorldObjectVisible(h.object));
    const v = hit ? crowd.findByObject(hit.object) : null;
    if (v) {
      crowd.react(v, figureTap(v.nickname, performance.now()));
      return;
    }
    if (hit?.object.userData.kind === 'seasonStand') {
      seasonHub?.open();
      return;
    }
    // the task board: tap the board in the market
    if (hit && hit.object.userData.kind === 'board') {
      void areas?.select('aufgaben');
      return;
    }
    if (hit && hit.object.userData.kind === 'byte') {
      void byte.tap();
      return;
    }
    // the own house: tap opens the house menu
    if (hit && home && onPlot(home, hit.point)) {
      void areas?.select('haus');
      return;
    }
    if (hit) {
      const owner = members.find(
        (m) =>
          m.id !== profile.id &&
          m.plotIndex !== null &&
          layout.plots[m.plotIndex] &&
          onPlot(layout.plots[m.plotIndex], hit.point),
      );
      if (owner) showVisitor(owner.id);
    }
  });

  // build mode: only on the own plot
  if (home) {
    buildMode = new BuildMode({
      scene,
      plot: home,
      supabase,
      uid: profile.id,
      onProgress: (delta) => void worldOnProgress(delta),
      reducedMotion,
      thumbs: thumbs.source,
      onShop: () => void areas?.select('shop'),
      onSheet: applySheetOffset,
      onFx: (event) => {
        if (!running) return;
        const object = (
          village.userData.ownSlotObject as ((slot: SlotId) => THREE.Object3D | null) | undefined
        )?.(event.slot);
        if (event.type === 'remove') {
          if (object) fx?.remove(object, event.kind);
          sound.play('remove');
        } else if (event.type === 'place') {
          if (object) fx?.place(object, event.kind);
          sound.play('place');
          sound.play('ding', 120);
        } else sound.play('ding');
      },
      onSlots: (s) => (village.userData.updateOwnPlot as ((s: SlotMap) => void) | undefined)?.(s),
      onDone: () => void areas?.select('haus'),
    });
  }
  const enterBuild = async (opts?: EnterOptions): Promise<AreaHandle | null> => {
    if (!buildMode) {
      showNotice(tr('Du hast noch kein Grundstück.'));
      return null;
    }
    if (!buildOpen) {
      showNotice(tr('Das Bauen ist gerade geschlossen.'));
      return null;
    }
    const err = await buildMode.enter(opts);
    if (err) {
      showNotice(err);
      return null;
    }
    const mode = buildMode;
    return {
      close: () => {
        mode.exit();
        fx?.clear();
      },
    };
  };
  const showNotice = (text: string): void => {
    if (!notice) return;
    notice.hidden = false;
    notice.textContent = text;
    window.setTimeout(() => (notice.hidden = true), 3000);
  };

  // figure choice: part of the tutorial on the first login, later from the settings
  let myCharacter = profile.character;
  let myWardrobe = profile.wardrobe ?? readWardrobe(null);
  const pickCharacter = (required: boolean, opener: HTMLElement | null): void => {
    modals.track(
      openCharacterPicker({
        required,
        current: myCharacter,
        opener,
        onPick: async (kind) => {
          const res = await saveCharacter(supabase, kind);
          if (!res.ok) return res.message;
          myCharacter = kind;
          crowd.setCharacter(profile.nickname, kind);
          crowd.setLook(profile.nickname, myWardrobe[kind]);
          badge.updateCharacter?.(kind);
          badge.updateLook?.(myWardrobe[kind]);
          return null;
        },
      }),
    );
  };

  // settings menu and ledger are modals; tracked so logout can close them properly
  const openSettings = (opener: HTMLElement): void => {
    modals.track(
      openAccountMenu({
        opener,
        nickname: profile.nickname,
        coins: coinsNow,
        quality: choice,
        sound: {
          on: sound.enabled,
          onChange: (on) => {
            sound.setEnabled(on);
            if (!on) silenceSirByte();
          },
        },
        music: { on: sound.musicOn, onChange: (on) => sound.setMusicOn(on) },
        onQuality: (q) => {
          choice = q;
          applyQuality();
        },
        onCharacter: () => pickCharacter(false, opener),
        onLogout: () => void logout(),
      }),
    );
  };

  const categories: Partial<Record<'shop' | 'inventar', ItemKind | null>> = {};
  let wardrobeItem: string | undefined;
  let shopFromWardrobe = false;
  const itemOptions = (area: 'shop' | 'inventar') => ({
    api: supabaseItemApi(supabase, profile.id),
    season: seasonApi(supabase),
    getCoins: () => coinsNow,
    onCoins,
    shopOpen,
    buildOpen,
    category: categories[area] ?? null,
    character: myCharacter ?? 'boy',
    onWardrobe: (itemId?: string) => {
      wardrobeItem = itemId;
      void areas?.select('kleiderschrank');
    },
    onCategory: (k: ItemKind) => {
      categories[area] = k;
    },
    onBuild: (itemId: string) => void areas?.open('bauen', () => enterBuild({ itemId })),
    onShowSlot: (slotId: EnterOptions['slotId']) => void areas?.open('bauen', () => enterBuild({ slotId })),
    onClose: () => {
      if (area === 'shop' && shopFromWardrobe) {
        shopFromWardrobe = false;
        void areas?.select('kleiderschrank');
      } else void areas?.select('haus');
    },
  });

  const ctl = createAreaController({
    openers: {
      aufgaben: async () =>
        openDailyQuests({
          supabase,
          coins: coinsNow,
          sound,
          onCoins,
          onProgress: (delta, from) => void worldOnProgress(delta, from),
          onClose: () => void areas?.select('dorf'),
        }),
      profil: async () =>
        openProfile({
          api: progressApi,
          nickname: profile.nickname,
          character: myCharacter,
          look: myWardrobe[myCharacter ?? 'boy'],
          getCoins: () => coinsNow,
          onCoins: (c) => {
            onCoins(c);
            void progressFlow.refresh();
          },
          onFrame: (id) => progressFlow.frameChanged(id),
          onTitle: (label) => progressFlow.titleChanged(label),
          onSettings: openSettings,
          onQuests: () => void areas?.select('aufgaben'),
          season: { api: seasonApi(supabase), onOpen: openSeasonPass },
          collection: { open: () => void openCollectionAlmanach() },
          onClose: () => void areas?.select('dorf'),
          sound,
          reducedMotion: reducedMotion(),
        }),
      haus: async () => {
        if (!home) {
          showNotice(tr('Du hast noch kein Grundstück.'));
          return null;
        }
        const season = await seasonApi(supabase)
          .state()
          .catch(() => null);
        const waiting = season ? season.chests.pass + season.chests.streak + season.chests.shop : 0;
        return openHouseMenu({
          onBuild: () => void areas?.select('bauen'),
          onShop: () => void areas?.select('shop'),
          onInventory: () => void areas?.select('inventar'),
          inventoryBadge: waiting,
          onWardrobe: () => void areas?.select('kleiderschrank'),
          onSettings: openSettings,
          onBack: () => void areas?.select('dorf'),
        });
      },
      shop: async () =>
        openShop({ ...itemOptions('shop'), onOpenInventory: () => void areas?.select('inventar') }),
      inventar: async () => openInventory(itemOptions('inventar')),
      bauen: () => enterBuild(),
      kleiderschrank: async () => {
        if (!home || inTutorial) return null;
        const initialItem = wardrobeItem;
        wardrobeItem = undefined;
        return openWardrobe({
          api: supabaseWardrobeApi(supabase, profile.id),
          maxPixelRatio: settingsFor(effectiveLevel(choice, autoResult)).maxPixelRatio,
          initialItem,
          onClose: () => void areas?.select('haus'),
          onShop: () => {
            shopFromWardrobe = true;
            categories.shop = 'avatar';
            void areas?.select('shop');
          },
          onSaved: (d) => {
            myWardrobe = d.wardrobe;
            crowd.setLook(profile.nickname, d.wardrobe[d.character]);
            badge.updateLook?.(d.wardrobe[d.character]);
          },
        });
      },
    },
    onChange: onAreaChange,
  });
  areas = ctl;

  const progressApi = supabaseProgressApi(supabase);
  const badge = createAvatarBadge({
    nickname: profile.nickname,
    character: myCharacter,
    look: myWardrobe[myCharacter ?? 'boy'] ?? emptyLook(),
    onOpen: (b) => {
      if (inTutorial) openSettings(b);
      else void ctl.select('profil');
    },
    reducedMotion,
  });
  badge.update({
    level: 1,
    xp: 0,
    levelXp: 0,
    nextLevelXp: 50,
    coins: coinsNow,
    streak: 0,
    chests: 0,
    frameId: 'frame_wood',
  });
  nav = createGameNav({
    nickname: profile.nickname,
    coins: coinsNow,
    badge,
    sound,
    reducedMotion,
    onSelect: (area) => void ctl.select(area),
    onAccount: openSettings,
    onNews: () => modals.track(openLedger(supabase, nav?.el ?? document.body)),
    onByte: () => {
      if (inTutorial) return;
      void ctl.select('dorf').then(() => {
        if (!running || inTutorial || ctl.current !== 'dorf') return;
        stopOrbitMotion(controls);
        marketFocused = true;
        houseCards.setVisible(false);
        byte.restore();
        byte.guide.pointBoard();
        const to = questBoardView(layout, camera.aspect, camera.fov);
        marketCameraElevation = to.target.y - layout.terrain.groundHeight(to.target.x, to.target.z);
        flight = {
          from: { position: camera.position.clone(), target: controls.target.clone() },
          to,
          t: 0,
          onArrive: () => {
            if (running && !inTutorial && !paused && !modals.anyOpen && ctl.current === 'dorf')
              byte.guide.say('board');
          },
        };
        controls.enabled = false;
        if (reducedMotion()) {
          finishFlight();
          applyControls('dorf');
        }
      });
    },
  });
  root.appendChild(nav.el);
  nav.setActive('dorf');
  const xpLive = document.createElement('p');
  xpLive.className = 'sr-only';
  xpLive.setAttribute('role', 'status');
  root.append(xpLive);
  const progressFlow = createProgressFlow({
    api: progressApi,
    badge,
    getCoins: () => coinsNow,
    onCoins,
    updateTag: (info) => {
      const tag = { nickname: profile.nickname, ...info };
      (village.userData.updateOwnTag as ((info: typeof tag) => void) | undefined)?.(tag);
      houseCards.updateMember({ id: profile.id, ...tag });
      crowd.setOwnTag?.(tag);
    },
    setQuestBadge: (n) => nav?.setQuestBadge(n),
    live: xpLive,
    sound,
    reducedMotion,
    track: (h) => modals.track(h),
    isActive: () => running,
  });
  worldOnProgress = (delta, from) => progressFlow.onProgress(delta, from);
  if (!inTutorial)
    void showClassNotice().then(async () => {
      if (running) await progressFlow.start();
    });
  // fallback for a pupil without a figure who needs no tutorial; in the tutorial the choice is its first step
  if (myCharacter === null && !inTutorial) pickCharacter(true, null);

  // ---- first-login tutorial: the village side (camera paths, own figure, guided build mode)
  let camPath: { path: CameraPath; t: number; done: () => void } | null = null;
  const playPath = (path: CameraPath): Promise<void> =>
    new Promise<void>((resolve) => {
      camPath?.done();
      setPose(path.at(0));
      camPath = { path, t: 0, done: resolve };
    });
  const currentPose = (): CameraPose => ({
    position: camera.position.clone(),
    target: controls.target.clone(),
  });
  const headPoint = new THREE.Vector3();
  const withByte = (path: CameraPath, overview = false): CameraPath => {
    const pose = path.at(path.duration);
    const second = new THREE.Vector3();
    if (!crowd.ownHeadPoint(second)) return path;
    second.y -= 0.6;
    const framed = frameTutorialSubjects(pose, {
      first: byte.root.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
      second,
      aspect: camera.aspect,
      fov: camera.fov,
      overview,
    });
    return { duration: path.duration, at: () => framed };
  };
  const tutorialSide: TutorialVillage = {
    byte: {
      ...byte.guide,
      atPlot: () => {
        if (home) byte.atPlot(home);
      },
    },
    pauseForQuiz: (on) => {
      paused = on;
      byte.setCovered(on);
    },
    flyMarket: (reduced) => {
      const to = marketStopPose(byte.root.position, byte.root.rotation.y);
      const from = {
        position: marketTarget.clone().add(new THREE.Vector3(25, 35, 30)),
        target: marketTarget.clone(),
      };
      const duration = reduced ? 0.5 : 3;
      return playPath({ duration, at: (t) => lerpPose(from, to, Math.min(1, t / duration)) });
    },
    flyIntro: (reduced) =>
      ownPlot === null
        ? Promise.resolve()
        : playPath(pathFrom(currentPose(), withByte(introPath(layout, ownPlot, reduced), true))),
    showPlot: (reduced) => {
      if (ownPlot === null) return Promise.resolve();
      const path = withByte(introPath(layout, ownPlot, reduced), true);
      const pose = path.at(path.duration);
      return runComicWipe(() => setPose(pose), reduced);
    },
    showMarketBoard: (reduced) =>
      runComicWipe(() => {
        byte.restore();
        setPose(marketBoardPose(byte.root.position, byte.root.rotation.y, layout));
      }, reduced),
    zoomBoard: (reduced) => {
      const from = currentPose();
      const target = new THREE.Vector3(layout.board.x, layout.plazaHeight + 1.6, layout.board.z);
      const dir = from.position.clone().sub(from.target).normalize();
      const to = { position: target.clone().addScaledVector(dir, 3.2), target };
      const duration = reduced ? 0.2 : 0.45;
      return playPath({ duration, at: (t) => lerpPose(from, to, Math.min(1, t / duration)) });
    },
    flyCloseUp: (reduced) =>
      ownPlot === null
        ? Promise.resolve()
        : playPath(pathFrom(currentPose(), withByte(closeUpPath(layout, ownPlot, reduced)))),
    placeFigure: () => {
      if (ownPlot !== null) crowd.placeOwnInFrontOfHouse(ownPlot);
    },
    releaseFigure: () => crowd.standStill(false),
    danceOnce: () => crowd.playDanceOnce(),
    figureScreen: () => {
      if (!crowd.ownHeadPoint(headPoint)) return null;
      headPoint.project(camera);
      if (headPoint.z < -1 || headPoint.z > 1 || Math.abs(headPoint.x) > 1.2 || Math.abs(headPoint.y) > 1.2)
        return null;
      const rect = gl.domElement.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || window.innerHeight;
      return { x: rect.left + ((headPoint.x + 1) / 2) * w, y: rect.top + ((1 - headPoint.y) / 2) * h };
    },
    placeHouse: async (place) => {
      const mode = buildMode;
      if (!mode || !home) return { ok: false, message: tr('Du hast noch kein Grundstück.') };
      const seconds = reducedMotion() ? 0.01 : FLIGHT_SECONDS;
      const from = currentPose();
      const to = houseView(home);
      await playPath({ duration: seconds, at: (t) => lerpPose(from, to, Math.min(1, t / seconds)) });
      return new Promise((resolve) => {
        void mode
          .enter({
            guided: {
              itemId: 'house_fachwerk',
              slotId: 'house',
              place,
              hint: PLACE_HINT,
              button: PLACE_BUTTON,
              onPlaced: () => {
                // a moment to see the house standing, then the closing scene
                window.setTimeout(() => {
                  mode.exit();
                  resolve({ ok: true, value: true });
                }, 900);
              },
            },
          })
          .then((err) => {
            if (err) resolve({ ok: false, message: err });
          });
      });
    },
  };
  worldOnCoins = onCoins;
  const setTutorialMode = (on: boolean): void => {
    inTutorial = on;
    cameraTools.hidden = on || (areas?.current ?? 'dorf') !== 'dorf';
    houseCards.setVisible(!on && (areas?.current ?? 'dorf') === 'dorf');
    boardCue.setVisible(!on && (areas?.current ?? 'dorf') === 'dorf');
    seasonHub?.setVisible(!on && (areas?.current ?? 'dorf') === 'dorf');
    nav?.setLocked(on);
    controls.enabled = !on;
  };
  endTutorial = (openQuests) => {
    if (!inTutorial || !running) return;
    camPath?.done();
    camPath = null;
    if (buildMode?.isActive) buildMode.exit();
    fx?.clear();
    setTutorialMode(false);
    void showClassNotice().then(async () => {
      if (running && openQuests) await ctl.select('aufgaben');
    });
  };
  if (inTutorial) {
    setTutorialMode(true);
    villageReady(tutorialSide);
  }

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
    if (camPath) {
      camPath.t += dt;
      const { path } = camPath;
      setPose(path.at(Math.min(camPath.t, path.duration)));
      if (camPath.t >= path.duration) {
        const finished = camPath.done;
        camPath = null;
        finished();
      }
    }
    if (flight) {
      flight.t += dt;
      if (flight.t >= FLIGHT_SECONDS) finishFlight();
      else setPose(lerpPose(flight.from, flight.to, flight.t / FLIGHT_SECONDS));
      if (!flight) applyControls(areas?.current ?? 'dorf');
    }
    // covered by an area: no rendering and no Auto measurement
    if (paused || document.hidden || modals.anyOpen) return;
    byte.update(dt, camera, reducedMotion());
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
    worldAppearance?.update(dt, now / 1000, reducedMotion());
    seasonHub?.maybeAutoOpen();
    (village.userData.animate as ((t: number) => void) | undefined)?.(performance.now() / 1000);
    (village.userData.labelUpdate as ((c: THREE.Camera) => void) | undefined)?.(camera);
    crowd.updateLabels(camera);
    controls.update();
    if (!inTutorial && !flight && (areas?.current ?? 'dorf') === 'dorf') {
      limitVillagePan(
        camera,
        controls.target,
        (x, z) => layout.terrain.groundHeight(x, z),
        undefined,
        marketCameraElevation,
      );
    }
    rig.follow(controls.target);
    houseCards.update(camera);
    boardCue.update(camera);
    buildMode?.update(now / 1000);
    fx?.update(dt, camera);
    gl.render(scene, camera);
  });

  return { dispose: stop };
}
