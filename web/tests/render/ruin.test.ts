import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { RUIN_PARTS } from '../../src/render/ruin';

// Footprint contract for house models: 6.0 x 4.0 m, 6.0 m high (docs/ASSET_VERTRAG.md B.1).
const HALF_W = 3.0;
const HALF_D = 2.0;
const MAX_H = 6.0;
const TOL = 0.05;

function glbPath(pack: string, name: string): string {
  return resolve(__dirname, '../../public/assets/kenney', pack, `${name}.glb`);
}

/** Min/max of the POSITION accessor of all primitives, read from the GLB's JSON chunk. */
function glbBounds(file: string): { min: number[]; max: number[] } {
  const buf = readFileSync(file);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of json.meshes) {
    for (const prim of mesh.primitives) {
      const acc = json.accessors[prim.attributes.POSITION];
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], acc.min[i]);
        max[i] = Math.max(max[i], acc.max[i]);
      }
    }
  }
  return { min, max };
}

describe('ruin parts', () => {
  it('has parts', () => {
    expect(RUIN_PARTS.length).toBeGreaterThan(0);
  });

  it.each(RUIN_PARTS.map((p, i) => [i, `${p.pack}/${p.name}`, p] as const))(
    'part %i %s stays inside the 6 x 4 m footprint',
    (_i, _label, part) => {
      // tile centre
      expect(Math.abs(part.x)).toBeLessThanOrEqual(HALF_W);
      expect(Math.abs(part.z)).toBeLessThanOrEqual(HALF_D);
      expect(part.y ?? 0).toBeGreaterThanOrEqual(0);

      const file = glbPath(part.pack, part.name);
      expect(existsSync(file), file).toBe(true);

      // real extent: all 8 corners of the model's bounding box, scaled, turned and tilted like buildRuin does
      const { min, max } = glbBounds(file);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(part.x, part.y ?? 0, part.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(part.tilt?.[0] ?? 0, part.rot, part.tilt?.[1] ?? 0, 'YXZ')),
        new THREE.Vector3().setScalar(part.scale),
      );
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          for (const z of [min[2], max[2]]) {
            const p = new THREE.Vector3(x, y, z).applyMatrix4(m);
            expect(Math.abs(p.x)).toBeLessThanOrEqual(HALF_W + TOL);
            expect(Math.abs(p.z)).toBeLessThanOrEqual(HALF_D + TOL);
            expect(p.y).toBeLessThanOrEqual(MAX_H + TOL);
            expect(p.y).toBeGreaterThanOrEqual(-TOL);
          }
    },
  );
});
