/** Rendering only: no Supabase client and no pupil action controller enter this module. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Member, ClassSettings } from '../api/village';
import { PLOT_COUNT } from '../api/village';
import type { SlotMap } from '../api/build';
import { buildLayout } from '../world/layout';
import { buildVillage } from '../render/village';
import { setupScene } from '../render/scene';
import { Crowd } from '../render/crowd';
import { setBoardNote } from '../render/plaza';
import { createMarketByte } from '../mascot/marketByte';
import type { ReadOnlyView } from './readOnlyVillage';
import { createWorldAppearance, isWorldObjectVisible } from '../season/worldAppearance';
import type { WorldTheme } from '../api/worldTheme';
export function createReadOnlyScene(
  host: HTMLElement,
  members: Member[],
  cls: ClassSettings,
  slots: Map<string, SlotMap>,
  view: ReadOnlyView,
  onQuests: () => void,
  notice: string | null,
) {
  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.05;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
  gl.shadowMap.enabled = true;
  gl.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
  host.append(gl.domElement);
  const scene = new THREE.Scene(),
    rig = setupScene(scene),
    layout = buildLayout(cls.layoutSeed, PLOT_COUNT, cls.mapId);
  const village = buildVillage(
    layout,
    members
      .filter((m) => m.plotIndex !== null)
      .map((m) => ({
        plotIndex: m.plotIndex!,
        nickname: m.nickname,
        level: m.level,
        titleLabel: m.titleLabel,
        slots: slots.get(m.id) ?? {},
      })),
    view.plotIndex,
  );
  scene.add(village);
  const appearance = createWorldAppearance({ scene, village, layout, rig, renderer: gl });
  setBoardNote(village, notice);
  const crowd = new Crowd(
    scene,
    layout,
    members.map((m) => ({
      nickname: m.nickname,
      own: m.id === view.pupilId,
      character: m.character,
      look: m.wardrobe?.[m.character ?? 'boy'],
      level: m.level,
    })),
  );
  const byte = createMarketByte({ scene, layout, sound: { enabled: false }, openQuests: onQuests });
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 600),
    home = view.plotIndex === null ? null : layout.plots[view.plotIndex];
  const target = home
    ? new THREE.Vector3(home.x, home.h, home.z)
    : new THREE.Vector3(layout.plaza.x, layout.plazaHeight, layout.plaza.z);
  camera.position.copy(target).add(new THREE.Vector3(14, 22, 26));
  const controls = new OrbitControls(camera, gl.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.minDistance = 12;
  controls.maxDistance = 150;
  controls.maxPolarAngle = 1.2;
  controls.update();
  const resize = () => {
    gl.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  let disposed = false,
    paused = false,
    last = performance.now();
  void rig.skyReady.then((sky) => {
    if (disposed) {
      sky?.dispose();
      return;
    }
    if (sky) (village.userData.setSky as ((t: THREE.Texture) => void) | undefined)?.(sky);
  });
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;
  const start = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const tap = (e: PointerEvent) => {
    if (!down) return;
    const moved = Math.hypot(down.x - e.clientX, down.y - e.clientY);
    down = null;
    if (moved > 8 || paused) return;
    const rect = gl.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(scene.children, true).find((h) => isWorldObjectVisible(h.object));
    if (hit?.object.userData.kind === 'board') onQuests();
    if (hit?.object.userData.kind === 'byte') void byte.tap();
  };
  gl.domElement.addEventListener('pointerdown', start);
  gl.domElement.addEventListener('pointerup', tap);
  gl.setAnimationLoop(() => {
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (disposed || paused || document.hidden) return;
    crowd.update(dt);
    crowd.updateLabels(camera);
    byte.update(dt, camera, matchMedia('(prefers-reduced-motion: reduce)').matches);
    appearance.update(dt, now / 1000, matchMedia('(prefers-reduced-motion: reduce)').matches);
    controls.update();
    rig.follow(controls.target);
    (village.userData.animate as ((t: number) => void) | undefined)?.(now / 1000);
    (village.userData.labelUpdate as ((c: THREE.Camera) => void) | undefined)?.(camera);
    gl.render(scene, camera);
  });
  return {
    setWorldTheme(theme: WorldTheme) {
      appearance.setTheme(theme);
    },
    setPaused(on: boolean) {
      paused = on;
      controls.enabled = !on;
      byte.setCovered(on);
    },
    dispose() {
      disposed = true;
      appearance.dispose();
      gl.setAnimationLoop(null);
      controls.dispose();
      crowd.dispose();
      byte.dispose();
      setBoardNote(village, null);
      gl.dispose();
      gl.domElement.remove();
      window.removeEventListener('resize', resize);
      gl.domElement.removeEventListener('pointerdown', start);
      gl.domElement.removeEventListener('pointerup', tap);
      scene.clear();
    },
  };
}
