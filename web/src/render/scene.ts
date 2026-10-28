/**
 * Sky, fog and light of the village (LOOK §3), shared by the app and the layout gallery.
 * The sky is Kenney's "Skyboxes" night panorama (CC0, blender/sources/LICENSES.md), an
 * equirectangular image; the fog fades into its horizon colour, so the valley edge melts into it.
 */
import * as THREE from 'three';
import { MAP_SIZE } from '../world/constants';

/** Horizon colour of the night panorama: fog and clear colour use it (measured from the image). */
export const SKY_HORIZON = '#2d3a67';
const SKY_URL = `${import.meta.env.BASE_URL}sky/skybox-night.jpg`;

/** Half width of the area that gets sharp shadows; the shadow box follows the camera target. */
const SHADOW_HALF = 58;

export interface SceneRig {
  sun: THREE.DirectionalLight;
  setTheme(theme: 'normal' | 'halloween'): void;
  /** Moves the shadow box with the camera target, so shadows stay sharp on the larger map. */
  follow(target: THREE.Vector3): void;
  /** Resolves with the sky panorama once it is on screen (null if it failed: the plain colour stays). */
  skyReady: Promise<THREE.Texture | null>;
}

export function setupScene(scene: THREE.Scene): SceneRig {
  scene.background = new THREE.Color(SKY_HORIZON);
  scene.fog = new THREE.Fog(SKY_HORIZON, MAP_SIZE * 0.42, MAP_SIZE * 1.05);
  const hemisphere = new THREE.HemisphereLight('#a9b8e8', '#3a5a3a', 1.15);
  scene.add(hemisphere);
  let theme: 'normal' | 'halloween' = 'normal';
  let normalSky: THREE.Texture | null = null;

  const sun = new THREE.DirectionalLight('#ffd2a1', 1.6);
  const sunOffset = new THREE.Vector3(-40, 55, 25);
  sun.position.copy(sunOffset);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_HALF,
    right: SHADOW_HALF,
    top: SHADOW_HALF,
    bottom: -SHADOW_HALF,
    near: 1,
    far: 200,
  });
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006; // LOOK §3: no shadow acne on the grass
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);

  const skyReady = new Promise<THREE.Texture | null>((resolve) => {
    new THREE.TextureLoader().load(
      SKY_URL,
      (tex) => {
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        normalSky = tex;
        if (theme === 'normal') {
          scene.background = tex;
          scene.backgroundIntensity = 0.95;
        }
        resolve(tex);
      },
      undefined,
      () => resolve(null), // offline or blocked: the horizon colour stays as background
    );
  });

  const snapped = new THREE.Vector3();
  return {
    sun,
    skyReady,
    setTheme(next): void {
      theme = next;
      const halloween = next === 'halloween';
      scene.background = halloween ? new THREE.Color('#493847') : (normalSky ?? new THREE.Color(SKY_HORIZON));
      scene.backgroundIntensity = halloween ? 1 : 0.95;
      scene.fog = new THREE.Fog(
        halloween ? '#493847' : SKY_HORIZON,
        MAP_SIZE * (halloween ? 0.25 : 0.42),
        MAP_SIZE * (halloween ? 0.76 : 1.05),
      );
      hemisphere.color.set(halloween ? '#b9a1b5' : '#a9b8e8');
      hemisphere.groundColor.set(halloween ? '#423946' : '#3a5a3a');
      hemisphere.intensity = halloween ? 0.95 : 1.15;
      sun.color.set(halloween ? '#e3a0a0' : '#ffd2a1');
      sun.intensity = halloween ? 1.25 : 1.6;
      sunOffset.set(...((halloween ? [-32, 32, 15] : [-40, 55, 25]) as [number, number, number]));
      sun.position.copy(sun.target.position).add(sunOffset);
    },
    follow(target: THREE.Vector3): void {
      // snap to 4 m steps so the shadow edges do not shimmer while the camera glides
      snapped.set(Math.round(target.x / 4) * 4, 0, Math.round(target.z / 4) * 4);
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).add(sunOffset);
    },
  };
}
