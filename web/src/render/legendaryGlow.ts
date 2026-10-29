import * as THREE from 'three';

/**
 * Light pillar for the legendary Horror-Haus (teacher, 29.10.2026, reference picture: violet and
 * magenta beams, thin light streaks rising and a glowing ring on the ground). A soft curtain of
 * violet light, a brighter magenta core, streaks of light that climb through it and a ring with
 * tick marks that turns slowly on the ground. Purely visual: additive, no depth write, never hit by
 * a tap. Geometry and materials are shared by all houses; everything moves from the draw call (no
 * extra loop) and stands still with reduced motion. The ground sign is a slowly turning pentagram.
 */
const HEIGHT = 16;
const STREAKS = 44;
const VIOLET = new THREE.Color('#8a4dff');
const MAGENTA = new THREE.Color('#ff3df0');

interface GlowParts {
  curtain: THREE.BufferGeometry;
  core: THREE.BufferGeometry;
  streaks: THREE.BufferGeometry;
  ring: THREE.BufferGeometry;
  curtainMat: THREE.MeshBasicMaterial;
  coreMat: THREE.MeshBasicMaterial;
  streakMat: THREE.LineBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
  /** Per streak: x, z, speed, length, phase. */
  seeds: Float32Array;
  lastFrame: number;
}
let parts: GlowParts | null = null;

/** Deterministic pseudo random numbers, so every house looks the same. */
function prng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An open tube that is brightest at the ground and fades into the sky (additive: black = no light). */
function fadedTube(bottom: number, top: number, colour: THREE.Color, strength: number): THREE.BufferGeometry {
  const geometry = new THREE.CylinderGeometry(top, bottom, HEIGHT, 40, 8, true);
  geometry.translate(0, HEIGHT / 2, 0);
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const h = position.getY(i) / HEIGHT; // 0 on the ground, 1 at the top
    const k = strength * Math.pow(1 - h, 1.4);
    colours[i * 3] = colour.r * k;
    colours[i * 3 + 1] = colour.g * k;
    colours[i * 3 + 2] = colour.b * k;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

function ringTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const c = size / 2;
    const glow = ctx.createRadialGradient(c, c, 4, c, c, c);
    glow.addColorStop(0, 'rgba(255,90,240,0.75)');
    glow.addColorStop(0.45, 'rgba(160,70,255,0.28)');
    glow.addColorStop(1, 'rgba(120,60,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    // a pentagram in its circle (the outer ring and the tick marks are gone, teacher 29.10.2026)
    const radius = c * 0.84;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(255,120,245,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,70,200,0.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // every second corner of the five points, so the lines cross into a star
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + ((i * 2) % 5) * ((Math.PI * 2) / 5);
      const x = c + Math.cos(a) * radius;
      const y = c + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140,150,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c, c, radius * 0.38, 0, Math.PI * 2);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function build(): GlowParts {
  const additive = {
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  } as const;
  // back faces only: the far wall glows behind the house, the house itself stays clean
  const curtainMat = new THREE.MeshBasicMaterial({ ...additive, side: THREE.BackSide, vertexColors: true });
  const coreMat = new THREE.MeshBasicMaterial({ ...additive, side: THREE.BackSide, vertexColors: true });
  const streakMat = new THREE.LineBasicMaterial({ ...additive, color: '#ff9af6', opacity: 0.9 });
  const ringMat = new THREE.MeshBasicMaterial({
    ...additive,
    side: THREE.DoubleSide,
    map: ringTexture(),
    opacity: 0.9,
  });
  const ring = new THREE.PlaneGeometry(9, 9);
  ring.rotateX(-Math.PI / 2);
  const rand = prng(2910);
  const seeds = new Float32Array(STREAKS * 5);
  for (let i = 0; i < STREAKS; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * 2.0;
    seeds.set(
      [Math.cos(angle) * radius, Math.sin(angle) * radius, 1.5 + rand() * 3.5, 0.8 + rand() * 2.6, rand()],
      i * 5,
    );
  }
  const streaks = new THREE.BufferGeometry();
  streaks.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STREAKS * 6), 3));
  const made: GlowParts = {
    // compact: the wide outer curtain was too big (teacher, 29.10.2026)
    curtain: fadedTube(3.2, 2.2, VIOLET, 0.28),
    core: fadedTube(2.0, 0.9, MAGENTA, 0.5),
    streaks,
    ring,
    curtainMat,
    coreMat,
    streakMat,
    ringMat,
    seeds,
    lastFrame: -1,
  };
  moveStreaks(made, 0);
  return made;
}

/** Every streak climbs at its own speed and starts again at the bottom. */
function moveStreaks(p: GlowParts, t: number): void {
  const position = p.streaks.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < STREAKS; i++) {
    const [x, z, speed, length, phase] = p.seeds.subarray(i * 5, i * 5 + 5);
    const y = ((t * speed + phase * HEIGHT) % (HEIGHT - length)) + 0.2;
    position.setXYZ(i * 2, x, y, z);
    position.setXYZ(i * 2 + 1, x, y + length, z);
  }
  position.needsUpdate = true;
}

/** Slow pulse, 0.8 to 1.0, with a little flicker. */
function pulse(t: number): number {
  return 0.9 + 0.08 * Math.sin(t * 1.7) + 0.03 * Math.sin(t * 7.3 + 1);
}

export function legendaryGlow(): THREE.Group {
  parts ??= build();
  const shared = parts;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const group = new THREE.Group();
  group.name = 'legendaryGlow';
  const curtain = new THREE.Mesh(shared.curtain, shared.curtainMat);
  const core = new THREE.Mesh(shared.core, shared.coreMat);
  const streaks = new THREE.LineSegments(shared.streaks, shared.streakMat);
  const ring = new THREE.Mesh(shared.ring, shared.ringMat);
  ring.position.y = 0.12;
  [curtain, core, streaks, ring].forEach((object, i) => {
    object.raycast = () => undefined; // never blocks a tap on the house
    object.frustumCulled = false; // the streaks move outside their first bounding box
    object.renderOrder = 4 + i;
    group.add(object);
  });
  if (!reduced) {
    // one update per frame for all houses (the first draw call of a frame does it)
    curtain.onBeforeRender = () => {
      const t = performance.now() / 1000;
      if (shared.lastFrame === Math.floor(t * 60)) return;
      shared.lastFrame = Math.floor(t * 60);
      const k = pulse(t);
      shared.curtainMat.opacity = k;
      shared.coreMat.opacity = k;
      shared.ringMat.opacity = 0.9 * k;
      moveStreaks(shared, t);
    };
    ring.onBeforeRender = () => {
      ring.rotation.y = (performance.now() / 1000) * 0.07; // one turn in about 90 s
    };
  }
  return group;
}
