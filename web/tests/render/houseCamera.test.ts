import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { houseView, lerpPose, onPlot } from '../../src/render/houseCamera';
import type { Plot } from '../../src/world/layout';

const plot = (o: Partial<Plot> = {}): Plot =>
  ({ index: 0, x: 10, z: -20, w: 20, d: 10, rad: 11, big: false, h: 1.5, face: 0, ...o }) as Plot;

describe('houseView', () => {
  it('keeps the plot in the uncovered part of a slot sheet', () => {
    expect(sheetViewOffset(1180, 820)).toEqual({ x: 236, y: 0 });
    expect(sheetViewOffset(820, 1180)).toEqual({ x: 0, y: 236 });
    expect(sheetViewOffset(800, 800)).toEqual({ x: 160, y: 0 });
  });
  it('targets the plot centre at house height, 26 away', () => {
    const p = plot();
    const v = houseView(p);
    expect(v.target.toArray()).toEqual([p.x, p.h + 2, p.z]);
    expect(v.position.distanceTo(v.target)).toBeCloseTo(26, 2);
    expect(v.position.y).toBeCloseTo(v.target.y + 13, 2);
  });
  it('sits on +Z for face 0', () => {
    const p = plot();
    const v = houseView(p);
    expect(v.position.z).toBeGreaterThan(p.z);
    expect(v.position.x).toBeCloseTo(p.x, 6);
  });
  it('rotates with the plot', () => {
    const p = plot({ face: Math.PI / 2 });
    const v = houseView(p);
    expect(v.position.x).toBeGreaterThan(p.x + 20);
    expect(v.position.z).toBeCloseTo(p.z, 6);
  });
});

describe('lerpPose', () => {
  const a = { position: new THREE.Vector3(0, 0, 0), target: new THREE.Vector3(0, 0, 10) };
  const b = { position: new THREE.Vector3(10, 20, 30), target: new THREE.Vector3(5, 5, 5) };
  it('hits the ends', () => {
    expect(lerpPose(a, b, 0).position.toArray()).toEqual([0, 0, 0]);
    expect(lerpPose(a, b, 1).position.toArray()).toEqual([10, 20, 30]);
    expect(lerpPose(a, b, 2).target.toArray()).toEqual([5, 5, 5]);
  });
  it('is between at 0.5', () => {
    const m = lerpPose(a, b, 0.5);
    expect(m.position.x).toBeGreaterThan(0);
    expect(m.position.x).toBeLessThan(10);
    expect(m.target.z).toBeGreaterThan(5);
    expect(m.target.z).toBeLessThan(10);
  });
});

describe('onPlot', () => {
  it('centre in, 1 m beyond half width out', () => {
    const p = plot();
    expect(onPlot(p, new THREE.Vector3(p.x, 0, p.z))).toBe(true);
    expect(onPlot(p, new THREE.Vector3(p.x + p.w / 2 + 1, 0, p.z))).toBe(false);
  });
  it('handles a rotated plot', () => {
    const p = plot({ face: Math.PI / 2 });
    // rotated by 90°: the 20 m width runs along world Z
    expect(onPlot(p, new THREE.Vector3(p.x, 0, p.z + 9))).toBe(true);
    expect(onPlot(p, new THREE.Vector3(p.x + 9, 0, p.z))).toBe(false);
  });
});
import { sheetViewOffset } from '../../src/render/houseCamera';
