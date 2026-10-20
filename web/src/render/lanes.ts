/**
 * Lanes (LOOK §5): one dirt strip per lane, all merged into one mesh. The strip is wider than the
 * solid path and fades into the lawn at both sides; the width of the fade wanders along the lane
 * and is frayed by a little noise, so the border looks trodden rather than cut (no zigzags in the
 * geometry, LOOK §11). Five vertex columns across, so the strip follows the ground.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Layout } from '../world/layout';
import { PLAZA_RADIUS } from '../world/constants';

/** Full width of the strip including both fades, and the width of one fade (metres). */
export const LANE_WIDTH = 2.0;
export const LANE_FADE = 0.5;
const SAMPLE_STEP = 0.7;

interface P2 {
  x: number;
  z: number;
}

/** A dirt strip along `points`: `width` in total, fading out over `fade` at both sides. */
function stripGeometry(
  points: P2[],
  width: number,
  fade: number,
  heightAt: (x: number, z: number) => number,
): THREE.BufferGeometry {
  const half = width / 2;
  const cols = [-half, -half + fade, 0, half - fade, half];
  const pos: number[] = [];
  const cross: number[] = [];
  const edge: number[] = [];
  const fades: number[] = [];
  const side: number[] = [];
  const along: number[] = [];
  const idx: number[] = [];
  let run = 0;
  points.forEach((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tx = next.x - prev.x;
    const tz = next.z - prev.z;
    const l = Math.hypot(tx, tz) || 1;
    const nx = -tz / l;
    const nz = tx / l;
    if (i > 0) run += Math.hypot(p.x - prev.x, p.z - prev.z) || 0;
    for (const c of cols) {
      const x = p.x + nx * c;
      const z = p.z + nz * c;
      const fromEdge = half - Math.abs(c);
      // the solid core lies a little higher than the fading edge, which hugs the ground
      pos.push(x, heightAt(x, z) + (fromEdge > 0 ? 0.11 : 0.07), z);
      cross.push(c); // metres from the centre line
      edge.push(fromEdge);
      fades.push(fade);
      side.push(c < 0 ? -1 : 1);
      along.push(run);
    }
    if (i > 0) {
      const n = cols.length;
      const a = (i - 1) * n;
      const b = i * n;
      for (let k = 0; k + 1 < n; k++) idx.push(a + k + 1, b + k + 1, a + k, a + k, b + k + 1, b + k); // faces up
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCross', new THREE.Float32BufferAttribute(cross, 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  g.setAttribute('aFade', new THREE.Float32BufferAttribute(fades, 1));
  g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * `plaza`/`plazaRadius`: the lanes end at the rim of the market plaza and fade out over its last
 * half metre, so no lane lies on the paving.
 */
function laneMaterial(plaza: P2, plazaRadius: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff', // the colours come from the shader (Kenney Nature Kit sand, LOOK §5)
    roughness: 0.95,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aEdge;
        attribute float aFade;
        attribute float aCross;
        attribute float aSide;
        attribute float aAlong;
        varying float vEdge;
        varying float vFade;
        varying float vSide;
        varying float vAlong;
        varying float vCross;
        varying vec2 vGround;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vEdge = aEdge;
        vFade = aFade;
        vCross = aCross;
        vGround = position.xz; // the lane mesh sits at the origin: local = world
        vSide = aSide;
        vAlong = aAlong;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vEdge;
        varying float vFade;
        varying float vSide;
        varying float vAlong;
        varying float vCross;
        varying vec2 vGround;
        float laneHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float laneNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(laneHash(i), laneHash(i + vec2(1.0, 0.0)), f.x),
                     mix(laneHash(i + vec2(0.0, 1.0)), laneHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          // sand of the Kenney Nature Kit, changing slowly along the lane (lighter and warmer
          // stretches), two faint wheel ruts and a lighter crown in the middle
          float big = laneNoise(vec2(vAlong * 0.12, 3.7)) * 0.6 + laneNoise(vec2(vAlong * 0.45, vCross * 1.2)) * 0.4;
          vec3 sand = mix(vec3(0.62, 0.38, 0.25), vec3(0.86, 0.52, 0.34), big);
          sand = mix(sand, vec3(0.80, 0.58, 0.36), smoothstep(0.55, 0.85, laneNoise(vec2(vAlong * 0.05, 9.1))) * 0.6);
          float rut = smoothstep(0.13, 0.03, abs(abs(vCross) - 0.33));
          rut *= 0.55 + 0.45 * laneNoise(vec2(vAlong * 0.6, vCross));
          sand *= 1.0 - rut * 0.28;
          sand *= 1.0 + smoothstep(0.2, 0.0, abs(vCross)) * 0.05;
          sand *= 0.93 + laneNoise(vec2(vAlong * 2.3, vCross * 2.3)) * 0.14;
          diffuseColor.rgb *= sand;
        }
        {
          // the fade wanders along the lane (each side on its own) and is frayed at small scale
          float s = vAlong + vSide * 17.0;
          float wander = 0.5 + 0.3 * sin(s * 0.55) + 0.2 * sin(s * 1.7 + 1.3);
          float fray = laneNoise(vec2(s * 3.2, vEdge * 7.0)) - 0.5;
          float inner = vFade * (0.45 + 0.55 * wander);
          float a = smoothstep(0.04, inner, vEdge + fray * 0.22);
          diffuseColor.a *= a;
          // end at the plaza rim
          float toPlaza = length(vGround - vec2(${plaza.x.toFixed(3)}, ${plaza.z.toFixed(3)}));
          diffuseColor.a *= smoothstep(${(plazaRadius - 0.15).toFixed(2)}, ${(plazaRadius + 0.45).toFixed(2)}, toPlaza);
        }`,
      );
  };
  mat.customProgramCacheKey = () => `soft-lane-${plaza.x}-${plaza.z}`;
  return mat;
}

/** All lanes of the layout as one soft-edged mesh (one draw call). */
export function buildLanes(layout: Layout): THREE.Mesh {
  const heightAt = (x: number, z: number): number => layout.terrain.groundHeight(x, z);
  const geos = layout.map.lanes.map((pts) => {
    const curve = new THREE.CatmullRomCurve3(
      pts.map((p) => new THREE.Vector3(p.x, 0, p.z)),
      false,
      'centripetal',
    );
    const samples = curve
      .getSpacedPoints(Math.ceil(curve.getLength() / SAMPLE_STEP))
      .map((v) => ({ x: v.x, z: v.z }));
    return stripGeometry(samples, LANE_WIDTH, LANE_FADE, heightAt);
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), laneMaterial(layout.plaza, PLAZA_RADIUS));
  mesh.receiveShadow = true;
  mesh.renderOrder = 1; // after the ground, before other transparent things
  return mesh;
}
