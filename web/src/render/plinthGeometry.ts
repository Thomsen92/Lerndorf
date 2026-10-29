import * as THREE from 'three';
import type { PlinthKind } from './decoStyles';

/** Unit footprint and height; baked vertex colors keep each plinth to one draw call. */
export function plinthGeometry(kind: PlinthKind, round: boolean, fullTop = false): THREE.BufferGeometry {
  const outline = round
    ? Array.from({ length: 16 }, (_, i) => [Math.cos((i * Math.PI) / 8) / 2, Math.sin((i * Math.PI) / 8) / 2])
    : [
        [-0.43, -0.5],
        [0.43, -0.5],
        [0.5, -0.43],
        [0.5, 0.43],
        [0.43, 0.5],
        [-0.43, 0.5],
        [-0.5, 0.43],
        [-0.5, -0.43],
      ];
  const profile =
    kind === 'meadow'
      ? [
          [0, 0.96],
          [0.2, 1],
          [0.75, 1],
          [1, 0.94],
        ]
      : kind === 'display'
        ? [
            [0, 0.98],
            [0.12, 1],
            [0.2, 0.92],
            [0.28, 0.78],
            [0.78, 0.78],
            [0.86, 0.92],
            [0.92, 1],
            [1, 0.96],
          ]
        : fullTop
          ? [
              [0, 0.94],
              [0.12, 1],
              [0.8, 1],
              [1, 1],
            ]
          : [
              [0, 0.98],
              [0.12, 1],
              [0.38, 1],
              [0.46, 0.94],
              [0.5, 0.88],
              [0.85, 0.88],
              [1, 0.84],
            ];
  const palette = kind === 'meadow' ? ['#70583e', '#638653', '#6a9c58'] : ['#59665f', '#77847c', '#939f95'];
  const positions: number[] = [],
    colors: number[] = [];
  function triangle(a: number[], b: number[], c: number[], color: THREE.Color): void {
    positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) colors.push(color.r, color.g, color.b);
  }
  const point = (i: number, level: number) => {
    const [y, scale] = profile[level],
      p = outline[i % outline.length];
    return [p[0] * scale, y, p[1] * scale];
  };
  for (let level = 0; level < profile.length - 1; level++) {
    const color = new THREE.Color(palette[Math.min(1, Math.floor(level / 2))]);
    for (let i = 0; i < outline.length; i++) {
      triangle(point(i, level), point(i, level + 1), point(i + 1, level), color);
      triangle(point(i + 1, level), point(i, level + 1), point(i + 1, level + 1), color);
    }
  }
  for (let i = 0; i < outline.length; i++) {
    const tint = new THREE.Color(palette[2]).multiplyScalar(0.96 + (i % 3) * 0.025);
    triangle([0, 1, 0], point(i + 1, profile.length - 1), point(i, profile.length - 1), tint);
  }
  if (kind === 'stone') {
    const end = fullTop ? 0.45 : 0.37,
      gap = 0.004;
    const seam = new THREE.Color('#657169');
    for (const rotate of [false, true]) {
      const p = (x: number, z: number) => (rotate ? [z, 1.001, -x] : [x, 1.001, z]);
      triangle(p(-end, -gap), p(-end, gap), p(end, -gap), seam);
      triangle(p(end, -gap), p(-end, gap), p(end, gap), seam);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Unit radial contour shared by the ring shader, ray origins and particle emitters. */
export function contourPoint(angle: number, rectangular: boolean): [number, number] {
  const x = Math.cos(angle),
    z = Math.sin(angle);
  const stretch = rectangular
    ? 1 / Math.max(Math.abs(x), Math.abs(z), (Math.abs(x) + Math.abs(z)) / 1.86)
    : 1;
  return [x * stretch, z * stretch];
}
