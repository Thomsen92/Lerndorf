/**
 * Procedural textures, drawn on a canvas once and shared (no image files, no network).
 * The textures are grey: the vertex colours of the terrain carry the hue, so the colours of
 * LOOK §4 stay where they are, and the texture only adds the grain.
 */
import * as THREE from 'three';
import { createRng } from '../world/rng';

function canvasTexture(
  size: number,
  draw: (cx: CanvasRenderingContext2D, rnd: () => number) => void,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const cx = cv.getContext('2d');
  if (cx) draw(cx, createRng(4242));
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Grass grain: many short strokes in light and dark grey on a mid-grey base. */
export const grassTexture = (): THREE.CanvasTexture =>
  canvasTexture(512, (cx, rnd) => {
    cx.fillStyle = '#f2f2f2'; // near white: the vertex colours carry the green (LOOK §4)
    cx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * 512;
      const y = rnd() * 512;
      const light = rnd() < 0.5;
      cx.strokeStyle = light ? 'rgba(255,255,255,0.22)' : 'rgba(60,60,60,0.10)';
      cx.lineWidth = 1 + rnd() * 1.5;
      cx.beginPath();
      cx.moveTo(x, y);
      cx.lineTo(x + (rnd() - 0.5) * 5, y - 3 - rnd() * 5);
      cx.stroke();
    }
    // soft blotches for variation on the large scale
    for (let i = 0; i < 40; i++) {
      const x = rnd() * 512;
      const y = rnd() * 512;
      const r = 20 + rnd() * 50;
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g;
      cx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });

/** Paving: light grey base with thin joints, used for the plaza. */
export const pavingTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, (cx, rnd) => {
    cx.fillStyle = '#c4c4c4';
    cx.fillRect(0, 0, 256, 256);
    cx.strokeStyle = 'rgba(60,60,60,0.35)';
    cx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 32) {
      cx.beginPath();
      cx.moveTo(0, y);
      cx.lineTo(256, y);
      cx.stroke();
    }
    for (let row = 0; row < 8; row++) {
      const offset = (row % 2) * 32;
      for (let x = offset; x <= 256 + 32; x += 64) {
        cx.beginPath();
        cx.moveTo(x, row * 32);
        cx.lineTo(x, row * 32 + 32);
        cx.stroke();
      }
    }
    for (let i = 0; i < 300; i++) {
      cx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      cx.fillRect(rnd() * 256, rnd() * 256, 3, 3);
    }
  });

/** Dirt path: packed earth with darker speckles and a few pebbles, for the lanes and garden paths. */
export const dirtTexture = (): THREE.CanvasTexture =>
  canvasTexture(256, (cx, rnd) => {
    cx.fillStyle = '#d6d0c4';
    cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      cx.fillStyle = rnd() < 0.6 ? 'rgba(90,70,40,0.18)' : 'rgba(255,255,255,0.20)';
      const r = 0.6 + rnd() * 1.8;
      cx.beginPath();
      cx.arc(rnd() * 256, rnd() * 256, r, 0, Math.PI * 2);
      cx.fill();
    }
    // wheel-worn ruts and sandy patches: soft blotches of two warm tones
    for (let i = 0; i < 34; i++) {
      const x = rnd() * 256;
      const y = rnd() * 256;
      const r = 10 + rnd() * 24;
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      const warm = rnd() < 0.5;
      g.addColorStop(0, warm ? 'rgba(150,108,62,0.22)' : 'rgba(205,190,160,0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g;
      cx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // a few tufts of grass at the edges of the strip
    for (let i = 0; i < 40; i++) {
      cx.fillStyle = 'rgba(110,140,70,0.45)';
      cx.beginPath();
      cx.ellipse(rnd() * 256, rnd() * 256, 1 + rnd() * 1.5, 0.8 + rnd(), rnd() * Math.PI, 0, Math.PI * 2);
      cx.fill();
    }
    for (let i = 0; i < 26; i++) {
      cx.fillStyle = 'rgba(120,110,100,0.35)';
      cx.beginPath();
      cx.ellipse(rnd() * 256, rnd() * 256, 2 + rnd() * 2, 1.5 + rnd(), rnd() * Math.PI, 0, Math.PI * 2);
      cx.fill();
    }
  });

/** Evening sky for reflections: deep blue at the top, warm horizon, dark green below (cheap env map). */
export const skyTexture = (): THREE.CanvasTexture => {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const cx = cv.getContext('2d');
  if (cx) {
    const g = cx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#33405e');
    g.addColorStop(0.5, '#8f7f8f');
    g.addColorStop(0.56, '#d9a77a');
    g.addColorStop(1, '#2a3a2a');
    cx.fillStyle = g;
    cx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

/** Water: soft wave bands, tiled and scrolled over the river so it looks like it moves. */
export const waterTexture = (): THREE.CanvasTexture => {
  const tex = canvasTexture(256, (cx, rnd) => {
    cx.fillStyle = '#c9dfe8';
    cx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      const y = rnd() * 256;
      cx.strokeStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(30,70,100,0.18)';
      cx.lineWidth = 2 + rnd() * 3;
      cx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const yy = y + Math.sin((x / 256) * Math.PI * 4 + i) * 4;
        if (x === 0) cx.moveTo(x, yy);
        else cx.lineTo(x, yy);
      }
      cx.stroke();
    }
  });
  tex.repeat.set(6, 3);
  return tex;
};
