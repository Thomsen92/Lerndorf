/**
 * Grass tufts from Kenney's "Foliage Sprites" (CC0, blender/sources/LICENSES.md).
 * Eight white grass silhouettes sit in one atlas (public/foliage/grass-atlas.png); each tuft is two
 * crossed cards that pick one cell of the atlas and are tinted per instance with the meadow greens
 * of LOOK §4. Normals point straight up, so a tuft is lit exactly like the lawn it stands on and
 * only its silhouette stands out. All tufts are one InstancedMesh (one draw call); the tips sway
 * slightly in the wind (vertex shader only, no extra cost on the CPU).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Scatter } from '../world/scatter';

const ATLAS_URL = `${import.meta.env.BASE_URL}foliage/grass-atlas.png`;
const ATLAS_COLS = 4;
const ATLAS_ROWS = 2;
/** Empty rows of pixels under each silhouette in the atlas (10 of 256), so the card is lowered. */
const ATLAS_FOOT = 10 / 256;

/** Card size in metres before the per-tuft scale. */
export const GRASS_WIDTH = 0.85;
export const GRASS_HEIGHT = 0.7;

// greens around the meadow colours of LOOK §4, a little darker and a little more yellow,
// so the tufts read against the lawn without looking like a different plant
export const GRASS_TINTS = ['#4e7a45', '#5f8f52', '#6c9a50', '#7aa35c', '#58884a', '#8fae5c', '#9db863', '#3f6e3c'];

// along the lanes the grass is trampled and dry: lighter, more yellow
export const EDGE_TINTS = ['#8fae5c', '#9db863', '#a7b86a', '#7f9f55', '#b3bd72'];

let atlas: THREE.Texture | null = null;
let atlasReady: Promise<boolean> | null = null;

function loadAtlas(): THREE.Texture {
  if (atlas) return atlas;
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  atlasReady = new Promise<boolean>((resolve) => {
    new THREE.ImageLoader().load(
      ATLAS_URL,
      (img) => {
        tex.image = img;
        tex.needsUpdate = true;
        resolve(true);
      },
      undefined,
      () => resolve(false), // no image: the tufts stay invisible (alphaTest), nothing breaks
    );
  });
  atlas = tex;
  return tex;
}

/** Resolves once the grass atlas is loaded (false if it failed). */
export function grassReady(): Promise<boolean> {
  loadAtlas();
  return atlasReady ?? Promise.resolve(false);
}

/** Two crossed cards, base on the ground, darker at the foot and lighter at the tips. */
function tuftGeometry(): THREE.BufferGeometry {
  const card = (angle: number): THREE.BufferGeometry => {
    const g = new THREE.PlaneGeometry(GRASS_WIDTH, GRASS_HEIGHT, 1, 2);
    g.translate(0, GRASS_HEIGHT / 2 - ATLAS_FOOT * GRASS_HEIGHT, 0);
    g.rotateY(angle);
    return g;
  };
  const geo = mergeGeometries([card(0), card(Math.PI / 2)]);
  const pos = geo.getAttribute('position');
  const uv = geo.getAttribute('uv');
  const colours = new Float32Array(pos.count * 3);
  const normals = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const shade = 0.55 + uv.getY(i) * 0.65; // foot 0.55 → tip 1.2
    colours.set([shade, shade, shade], i * 3);
    normals.set([0, 1, 0], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geo;
}

function grassMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: loadAtlas(),
    vertexColors: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.88, // LOOK §3
  });
  const time = { value: 0 };
  mat.userData.time = time;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aCell;\nuniform float uTime;',
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        vMapUv = (uv + vec2(mod(aCell, ${ATLAS_COLS}.0), floor(aCell / ${ATLAS_COLS}.0)))
          * vec2(${1 / ATLAS_COLS}, ${1 / ATLAS_ROWS});`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 rootW = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float bend = uv.y * uv.y;
        transformed.x += sin(uTime * 1.7 + rootW.x * 0.35 + rootW.z * 0.21) * 0.05 * bend;
        transformed.z += cos(uTime * 1.3 + rootW.z * 0.31) * 0.03 * bend;`,
      );
    // both sides of a card face the sky: no dark back faces, also for the mirrored tufts
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace(
        'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;',
        'float faceDirection = 1.0;',
      ),
    );
  };
  mat.customProgramCacheKey = () => 'kenney-grass';
  return mat;
}

/** All grass tufts as one InstancedMesh; `edge` tufts (along the lanes) get the dry tints. */
export function buildGrass(lawn: Scatter[], edge: Scatter[] = []): THREE.InstancedMesh {
  const tufts = [...lawn, ...edge];
  const geo = tuftGeometry();
  const cells = new Float32Array(tufts.length);
  const mesh = new THREE.InstancedMesh(geo, grassMaterial(), tufts.length);
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  tufts.forEach((t, i) => {
    // cell and tint follow from the rotation, which the seeded scatter already chose
    const k = Math.floor((t.rot / (Math.PI * 2)) * 997);
    cells[i] = k % (ATLAS_COLS * ATLAS_ROWS);
    s.set(t.scale * (k % 2 ? 1 : -1), t.scale, t.scale); // mirror every other tuft
    m.makeRotationY(t.rot).scale(s).setPosition(t.x, t.y - 0.02, t.z);
    mesh.setMatrixAt(i, m);
    const tints = i < lawn.length ? GRASS_TINTS : EDGE_TINTS;
    mesh.setColorAt(i, c.set(tints[k % tints.length]));
  });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 1));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; // the unit geometry does not cover the instances
  mesh.receiveShadow = true;
  mesh.castShadow = false; // cut-out shadows would cost a lot and add little
  const time = (mesh.material as THREE.Material).userData.time as { value: number };
  mesh.onBeforeRender = () => {
    time.value = performance.now() / 1000;
  };
  return mesh;
}
