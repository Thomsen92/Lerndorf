import * as THREE from 'three';

/**
 * An eerie light cone for the legendary Horror-Haus (teacher, 29.10.2026): a pale green cone of light
 * falls from the night sky onto the house, with a violet core and a glowing ring on the ground.
 * Purely visual: additive, no depth write, never hit by a tap. One geometry/material set is shared by
 * all houses; the pulse runs from the draw call (no extra loop) and stands still with reduced motion.
 */
const HEIGHT = 13;
const RADIUS = 3.6;

interface GlowParts {
  outer: THREE.BufferGeometry;
  core: THREE.BufferGeometry;
  ring: THREE.BufferGeometry;
  outerMat: THREE.MeshBasicMaterial;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
}
let parts: GlowParts | null = null;

/** Brightest at the ground, fading towards the sky; additive blending reads black as "no light". */
function fadedCone(radius: number, colour: THREE.Color, strength: number): THREE.BufferGeometry {
  const geometry = new THREE.ConeGeometry(radius, HEIGHT, 40, 1, true);
  geometry.translate(0, HEIGHT / 2, 0);
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const h = position.getY(i) / HEIGHT; // 0 on the ground, 1 at the apex
    const k = strength * Math.pow(1 - h, 1.3);
    colours[i * 3] = colour.r * k;
    colours[i * 3 + 1] = colour.g * k;
    colours[i * 3 + 2] = colour.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

function ringTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.65, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(canvas);
}

function build(): GlowParts {
  const additive = {
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
  } as const;
  // back faces only: the far wall of the cone glows behind the house, the house itself stays clean
  const outerMat = new THREE.MeshBasicMaterial({ ...additive, side: THREE.BackSide, vertexColors: true });
  const coreMat = new THREE.MeshBasicMaterial({ ...additive, side: THREE.BackSide, vertexColors: true });
  const ringMat = new THREE.MeshBasicMaterial({
    ...additive,
    map: ringTexture(),
    color: new THREE.Color('#7dffa8'),
    opacity: 0.55,
  });
  const ring = new THREE.PlaneGeometry(RADIUS * 2.3, RADIUS * 2.3);
  ring.rotateX(-Math.PI / 2);
  return {
    outer: fadedCone(RADIUS, new THREE.Color('#6bff9e'), 0.3),
    core: fadedCone(RADIUS * 0.5, new THREE.Color('#b16cff'), 0.35),
    ring,
    outerMat,
    coreMat,
    ringMat,
  };
}

/** Pulse of the shared materials, 0.8 to 1.0 with a little flicker. */
function pulse(t: number): number {
  return 0.9 + 0.08 * Math.sin(t * 1.7) + 0.03 * Math.sin(t * 7.3 + 1);
}

export function legendaryGlow(): THREE.Group {
  parts ??= build();
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const group = new THREE.Group();
  group.name = 'legendaryGlow';
  const meshes = [
    new THREE.Mesh(parts.outer, parts.outerMat),
    new THREE.Mesh(parts.core, parts.coreMat),
    new THREE.Mesh(parts.ring, parts.ringMat),
  ];
  meshes[2].position.y = 0.12;
  meshes.forEach((mesh, i) => {
    mesh.raycast = () => undefined; // never blocks a tap on the house
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.renderOrder = 4 + i;
    group.add(mesh);
  });
  if (!reduced) {
    const mats = parts;
    meshes[0].onBeforeRender = () => {
      const k = pulse(performance.now() / 1000);
      mats.outerMat.opacity = k;
      mats.coreMat.opacity = k;
      mats.ringMat.opacity = 0.55 * k;
    };
  }
  return group;
}
