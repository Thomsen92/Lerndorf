/**
 * GLB items for the season and shop catalogue (plan A1, §6.3).
 * The models are meshopt-compressed; without the decoder they never finish loading.
 * Every model is normalised once (plan §6.3): turned so its front faces +Z, centred on the origin,
 * standing on y = 0 and only ever shrunk into the MAX_SIZE box of its kind; tiny decorations grow to
 * 0.8 m. The cache keeps that template and every caller gets its own clone, because a three.js
 * object can only have one parent (review B1). Placeholders stay until the model is there.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MAX_SIZE, type SlotKind } from '../world/plotPlan';
import { legendaryGlow } from './legendaryGlow';

export interface GlbItem {
  /** Path below assets/, e.g. 'season1/warlock.glb'. */
  file: string;
  kind: SlotKind;
  /** Extra yaw for models whose front does not face +Z. */
  yaw?: number;
  /** Height cap in metres for models whose file size is wrong (plan §6.2), below MAX_SIZE. */
  maxHeight?: number;
  /** Upscale the model so it fills the MAX_SIZE footprint (new shop decorations, 0035). */
  fill?: boolean;
  /** Already low-poly: use the high template at every distance, without a separate LOD request. */
  lod?: false;
}

/**
 * Item id -> model. Kept in sync with supabase/migrations/0030 and 0031 by
 * web/tests/render/glbItems.test.ts (which reads both manifests).
 */
export const GLB_ITEMS: Record<string, GlbItem> = {
  // 28 chest items (season 0030)
  season_warlock: { file: 'season1/warlock.glb', kind: 'deco' },
  // The legendary house is the fantasy tree house now (BUG-011); it comes in at about 1 m and fills the plot.
  season_house_horror: { file: 'season1/house-horror.glb', kind: 'house', fill: true },
  season_pumpkin_patch: { file: 'season1/pumpkin-patch.glb', kind: 'deco' },
  season_clock_tower: { file: 'season1/clock-tower.glb', kind: 'deco' },
  season_dodge: { file: 'season1/dodge-pickup.glb', kind: 'car' },
  season_monster_plant: { file: 'season1/kit-monster-plant.glb', kind: 'deco' },
  season_pumpkin_tree: { file: 'season1/jack-o-lantern-tree.glb', kind: 'deco' },
  season_candy_pile: { file: 'season1/candy-pile.glb', kind: 'deco' },
  season_graveyard_corner: { file: 'season1/graveyard-corner.glb', kind: 'deco' },
  season_fence_lantern: { file: 'season1/fence-lamp.glb', kind: 'deco' },
  season_witch_statue: { file: 'season1/witch.glb', kind: 'deco' },
  season_pumpkin_girl: { file: 'season1/pumpkin-girl.glb', kind: 'deco' },
  season_witch_figure: { file: 'season1/kit-witch.glb', kind: 'deco' },
  season_mummy: { file: 'season1/kit-mummy.glb', kind: 'deco' },
  season_skeleton: { file: 'season1/kit-skeleton.glb', kind: 'deco' },
  season_zombie: { file: 'season1/kit-zombie.glb', kind: 'deco' },
  season_witch_cat: { file: 'season1/kit-witch-cat.glb', kind: 'deco' },
  season_cauldron: { file: 'season1/kit-cauldron.glb', kind: 'deco' },
  // Both cats come in at the wrong scale (203 m and 4 m); as rare props they stand about 1 m high.
  season_pumpkin_cat: { file: 'season1/spooky-pumpkin-cat.glb', kind: 'deco', maxHeight: 1.0 },
  season_ghost_kitty: { file: 'season1/ghost-kitty.glb', kind: 'deco', maxHeight: 1.2 },
  season_candy_bucket: { file: 'season1/kit-candy-bucket.glb', kind: 'deco' },
  season_bat: { file: 'season1/kit-bat.glb', kind: 'deco' },
  season_candle: { file: 'season1/kit-candle.glb', kind: 'deco' },
  season_ghost: { file: 'season1/kit-ghost.glb', kind: 'deco' },
  season_gravestone: { file: 'season1/kit-gravestone.glb', kind: 'deco' },
  season_jack_o_lantern: { file: 'season1/kit-jack-o-lantern.glb', kind: 'deco' },
  season_broom: { file: 'season1/kit-broom.glb', kind: 'deco' },
  season_sign: { file: 'season1/kit-sign.glb', kind: 'deco' },
  // 6 shop items (season 0031)
  shop_cabin: { file: 'shop/cabin.glb', kind: 'house' },
  shop_white_house: { file: 'shop/white-house.glb', kind: 'house' },
  shop_family_house: { file: 'shop/family-house.glb', kind: 'house' },
  shop_low_poly_house: { file: 'shop/low-poly-house.glb', kind: 'house' },
  shop_neuschwanstein: { file: 'shop/neuschwanstein.glb', kind: 'house', fill: true },
  // Six more houses (0047).
  shop_panel_house: { file: 'shop/panel-house.glb', kind: 'house', fill: true },
  shop_forest_cabin: { file: 'shop/forest-cabin.glb', kind: 'house', fill: true },
  shop_classroom: { file: 'shop/classroom.glb', kind: 'house', fill: true },
  shop_house_3: { file: 'shop/house-3.glb', kind: 'house', fill: true },
  shop_home_1: { file: 'shop/home-1.glb', kind: 'house', fill: true },
  shop_home_2: { file: 'shop/home-2.glb', kind: 'house', fill: true },
  // Landmarks and village church (0048).
  shop_burj_khalifa: { file: 'shop/burj-khalifa.glb', kind: 'house', fill: true },
  shop_empire_state: { file: 'shop/empire-state.glb', kind: 'house', fill: true },
  shop_church: { file: 'shop/church.glb', kind: 'house', fill: true },
  shop_president_car: { file: 'shop/president-car.glb', kind: 'car' },
  shop_trump: { file: 'shop/trump-statue.glb', kind: 'deco' },
  // Both cars are modelled along X; a quarter turn puts the length on Z like all cars (plan §6.2).
  shop_toyoyo: { file: 'shop/toyoyo-highlight.glb', kind: 'car', yaw: Math.PI / 2, fill: true },
  shop_beatall: { file: 'shop/beatall.glb', kind: 'car', yaw: Math.PI / 2, fill: true },
  // Three more cars from the same pack (0041), textured with their .fbm maps.
  shop_delorean: { file: 'shop/delorean.glb', kind: 'car', yaw: Math.PI / 2, fill: true },
  shop_landyroamer: { file: 'shop/landyroamer.glb', kind: 'car', yaw: Math.PI / 2, fill: true },
  shop_tristar: { file: 'shop/tristar.glb', kind: 'car', yaw: Math.PI / 2, fill: true },
  // Low-poly car pack with colour variants (0042); these are modelled along Z already.
  shop_car5: { file: 'shop/car5.glb', kind: 'car', fill: true },
  shop_car5_green: { file: 'shop/car5-green.glb', kind: 'car', fill: true },
  shop_car5_grey: { file: 'shop/car5-grey.glb', kind: 'car', fill: true },
  shop_car5_police: { file: 'shop/car5-police.glb', kind: 'car', fill: true },
  shop_car5_police_la: { file: 'shop/car5-police-la.glb', kind: 'car', fill: true },
  shop_car8: { file: 'shop/car8.glb', kind: 'car', fill: true },
  shop_car8_grey: { file: 'shop/car8-grey.glb', kind: 'car', fill: true },
  shop_car8_mail: { file: 'shop/car8-mail.glb', kind: 'car', fill: true },
  shop_car8_purple: { file: 'shop/car8-purple.glb', kind: 'car', fill: true },
  // Sedans and estate car (0043).
  shop_car2: { file: 'shop/car2.glb', kind: 'car', fill: true },
  shop_car2_black: { file: 'shop/car2-black.glb', kind: 'car', fill: true },
  shop_car2_red: { file: 'shop/car2-red.glb', kind: 'car', fill: true },
  shop_car6: { file: 'shop/car6.glb', kind: 'car', fill: true },
  // Roadside fast-food sign (0044).
  shop_fast_food_sign: { file: 'shop/fast-food-sign.glb', kind: 'deco', fill: true },
  // Halloween decorations (0035): both fill the 3 x 3 pedestal when normalised.
  shop_candy_cauldron: { file: 'shop/candy-cauldron.glb', kind: 'deco', fill: true },
  shop_chibi_trick_or_treater: { file: 'shop/chibi-trick-or-treater.glb', kind: 'deco', fill: true },
  // Retro monitor decorations (0036): imported from FBX, they fill the 3 x 3 pedestal too.
  shop_monitor_01: { file: 'shop/monitor-01.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  shop_monitor_02: { file: 'shop/monitor-02.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  shop_monitor_05: { file: 'shop/monitor-05.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  shop_monitor_06: { file: 'shop/monitor-06.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  // CRT televisions (0037): same FBX pack, textured with the MasterMaterial palette.
  shop_tv_crt_07: { file: 'shop/tv-crt-07.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  shop_tv_crt_09: { file: 'shop/tv-crt-09.glb', kind: 'deco', fill: true, yaw: -Math.PI / 2 },
  // Game cases, figurines and a little blue engine (0038); ids exactly as in the migration, or the
  // shop shows the orange placeholder box (teacher, 28.10.2026).
  shop_game_case: { file: 'shop/gta6-ps5-case.glb', kind: 'deco', fill: true },
  shop_phone_case: { file: 'shop/gta6-phone-case.glb', kind: 'deco', fill: true },
  shop_round_frog: { file: 'shop/cute-round-frog.glb', kind: 'deco', fill: true },
  shop_cute_fox: { file: 'shop/cute-fox.glb', kind: 'deco', fill: true },
  shop_blue_engine: { file: 'shop/blue-engine.glb', kind: 'deco', fill: true },
  // Mascot, phone, statue and farm buildings (0039).
  shop_mascot: { file: 'shop/mascot.glb', kind: 'deco', fill: true },
  shop_smartphone: { file: 'shop/smartphone.glb', kind: 'deco', fill: true },
  shop_moai: { file: 'shop/moai.glb', kind: 'deco', fill: true },
  shop_water_tower: { file: 'shop/water-tower.glb', kind: 'deco', fill: true },
  shop_chicken_coop: { file: 'shop/chicken-coop.glb', kind: 'deco', fill: true },
  shop_windmill: { file: 'shop/windmill.glb', kind: 'deco', fill: true },
  shop_barn: { file: 'shop/barn.glb', kind: 'deco', fill: true },
  // Stone well (0040), imported from the FBX farm pack.
  shop_well: { file: 'shop/well.glb', kind: 'deco', fill: true },
  // Approved own/Kenney catalogue (0054). Preserve authored metre scale and silhouettes.
  shop_evening_lantern: { file: 'shop/evening-lantern.glb', kind: 'deco', lod: false },
  shop_sunday_bench: { file: 'shop/sunday-bench.glb', kind: 'deco', lod: false },
  shop_pocket_meadow: { file: 'shop/pocket-meadow.glb', kind: 'deco', lod: false },
  shop_one_more_chapter: { file: 'shop/one-more-chapter.glb', kind: 'deco', lod: false },
  shop_little_big_oak: { file: 'shop/little-big-oak.glb', kind: 'deco', lod: false },
  shop_support_duck: { file: 'shop/support-duck.glb', kind: 'deco', lod: false },
  shop_rainy_day_barrel: { file: 'shop/rainy-day-barrel.glb', kind: 'deco', lod: false },
  shop_apple_of_my_eye: { file: 'shop/apple-of-my-eye.glb', kind: 'deco', lod: false },
  shop_little_blue_cottage: { file: 'shop/little-blue-cottage.glb', kind: 'house', lod: false },
  shop_apple_gable_cottage: { file: 'shop/apple-gable-cottage.glb', kind: 'house', lod: false },
  shop_moss_corner_cottage: { file: 'shop/moss-corner-cottage.glb', kind: 'house', lod: false },
  shop_lantern_house: { file: 'shop/lantern-house.glb', kind: 'house', lod: false },
  shop_apple_gable_garage: { file: 'shop/apple-gable-garage.glb', kind: 'garage', lod: false },
  shop_moss_workshop: { file: 'shop/moss-workshop.glb', kind: 'garage', lod: false },
  // Tripo models (0058): textures and meshes trimmed by web/scripts/assets/optimize-tripo-decos.mjs.
  // The vehicles are authored at real size along X, so they keep it (no `fill`) and turn a quarter.
  shop_medieval_castle: { file: 'shop/medieval-castle.glb', kind: 'house', fill: true },
  // Two more Tripo houses (0062).
  shop_fairytale_castle: { file: 'shop/fairytale-castle.glb', kind: 'house', fill: true },
  shop_haunted_mansion: { file: 'shop/haunted-mansion.glb', kind: 'house', fill: true },
  shop_exosuit_robot: { file: 'shop/exosuit-robot.glb', kind: 'deco', fill: true },
  shop_obama_statue: { file: 'shop/obama-statue.glb', kind: 'deco', fill: true },
  shop_simson_motorcycle: { file: 'shop/simson-motorcycle.glb', kind: 'car', yaw: Math.PI / 2 },
  shop_moped: { file: 'shop/moped.glb', kind: 'car', yaw: Math.PI / 2 },
  shop_scooter: { file: 'shop/scooter.glb', kind: 'car', yaw: Math.PI / 2 },
  shop_fendt_tractor: { file: 'shop/fendt-tractor.glb', kind: 'car', yaw: Math.PI / 2 },
  // Stable reward ID preserves existing ownership; the souvenir is now the supplied Empire State model.
  reward_ollie_nyc_postcard:{file:'shop/ollie-empire-state.glb',kind:'deco'},
  // Retain the original own postcard model as an archive asset, without a new catalogue item.
  archive_ollie_nyc_postcard:{file:'shop/ollie-nyc-postcard.glb',kind:'deco'},
};

const BASE = `${import.meta.env.BASE_URL}assets/`;
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Group>>();

export function isGlbItem(itemId: string): boolean {
  return Object.prototype.hasOwnProperty.call(GLB_ITEMS, itemId);
}

/** Smallest decoration size: below it a prop vanishes on its 3 x 3 pedestal. */
export const MIN_DECO_SIZE = 0.8;

/** Normalises a loaded scene into a group that fits MAX_SIZE and stands on y = 0. */
export function normaliseGlb(scene: THREE.Object3D, spec: GlbItem): THREE.Group {
  const holder = new THREE.Group();
  const turned = new THREE.Group();
  const inner = scene.clone(true);
  turned.add(inner);
  // The yaw is part of the model, so the box below measures the turned model.
  if (spec.yaw) turned.rotation.y = spec.yaw;
  turned.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(turned, true);
  const size = box.getSize(new THREE.Vector3());
  const max = MAX_SIZE[spec.kind];
  const safe = (n: number) => Math.max(n, 0.001);
  const height = Math.min(max.h, spec.maxHeight ?? max.h);
  const fit = Math.min(max.w / safe(size.x), max.d / safe(size.z), height / safe(size.y));
  // Never larger than modelled: a grave candle stays a candle. A broken unit (203 m cat) still shrinks.
  // Items marked `fill` are the exception: they grow until the footprint (or height) fills MAX_SIZE.
  let scale = spec.fill ? fit : Math.min(1, fit);
  const longest = Math.max(size.x, size.y, size.z);
  if (!spec.fill && spec.kind === 'deco' && longest * scale < MIN_DECO_SIZE) {
    scale = Math.min(MIN_DECO_SIZE / safe(longest), fit);
  }
  turned.scale.setScalar(scale);
  const centre = box.getCenter(new THREE.Vector3());
  turned.position.set(-centre.x * scale, -box.min.y * scale, -centre.z * scale);
  holder.add(turned);
  holder.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return holder;
}

/**
 * Loads one item and resolves to a clone of the cached, normalised template. Geometry and materials
 * are shared between clones: callers must never dispose them.
 */
export function loadGlbItem(itemId: string, variant: 'high' | 'lod' = 'high'): Promise<THREE.Group> {
  if (variant === 'lod' && GLB_ITEMS[itemId]?.lod === false) variant = 'high';
  const cacheKey = `${itemId}:${variant}`;
  let template = cache.get(cacheKey);
  if (!template) {
    const spec = GLB_ITEMS[itemId];
    if (!spec) return Promise.reject(new Error(`unknown glb item ${itemId}`));
    const file = variant === 'lod' ? spec.file.replace(/\.glb$/, '.lod.glb') : spec.file;
    template = loader
      .loadAsync(`${BASE}${file}`)
      .then((gltf) => normaliseGlb(gltf.scene, spec))
      .catch((err) => {
        // Keep the placeholder instead of breaking the village; a missing LOD is expected.
        if (variant === 'high') console.warn('season model failed', itemId, err);
        return new THREE.Group();
      });
    cache.set(cacheKey, template);
  }
  return template.then((group) => group.clone(true));
}

/** Distance at which the simplified far version takes over (plan §6.3). */
export const LOD_DISTANCE = 26;

/** Placeholder + async model, so callers can add it synchronously like the procedural assets. */
export function glbAsset(itemId: string, kind: string): THREE.Group {
  const holder = new THREE.Group();
  const spec = GLB_ITEMS[itemId];
  const max = MAX_SIZE[(spec?.kind ?? kind) as SlotKind] ?? MAX_SIZE.deco;
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(Math.min(max.w, 1.2), Math.min(max.h, 1.0), Math.min(max.d, 1.2)),
    new THREE.MeshStandardMaterial({ color: 0x4a3a5a, roughness: 1, transparent: true, opacity: 0.55 }),
  );
  placeholder.position.y = placeholder.geometry.parameters.height / 2;
  holder.add(placeholder);

  // The legendary Horror-Haus carries an eerie light cone (teacher, 29.10.2026).
  if (itemId === 'season_house_horror') holder.add(legendaryGlow());

  // One LOD node per item: the full model up close, the simplified far version beyond the distance.
  // The far version is added only after the full one, so the LOD never shows it up close.
  const lod = new THREE.LOD();
  holder.add(lod);
  const ready = loadGlbItem(itemId, 'high')
    .then((model) => {
      holder.remove(placeholder);
      placeholder.geometry.dispose();
      (placeholder.material as THREE.Material).dispose();
      lod.addLevel(model, 0);
      return model;
    });
  holder.userData.modelReady = ready;
  void ready.then(() => spec?.lod === false ? new THREE.Group() : loadGlbItem(itemId, 'lod')).then((far) => {
      if (far.children.length > 0) lod.addLevel(far, LOD_DISTANCE);
    });
  return holder;
}
