import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { closeUpPath, introPath } from '../../src/render/introCamera';
import { buildLayout } from '../../src/world/layout';
import { SLOTS, rectCentre } from '../../src/world/plotPlan';

const layout = buildLayout(7, 12);

function slotCentre(i: number): THREE.Vector3 {
  const p = layout.plots[i];
  const c = rectCentre(SLOTS[0]);
  const cos = Math.cos(p.face);
  const sin = Math.sin(p.face);
  return new THREE.Vector3(p.x + c.lx * cos + c.lz * sin, p.h + 1.5, p.z - c.lx * sin + c.lz * cos);
}

describe.each([0, 5, 11])('introPath, plot %i', (i) => {
  const plot = layout.plots[i];
  const flat = (v: THREE.Vector3): number => Math.hypot(v.x - plot.x, v.z - plot.z);

  it('lasts 5-8 s, or at most 3 s with reduced motion', () => {
    const d = introPath(layout, i, false).duration;
    expect(d).toBeGreaterThanOrEqual(5);
    expect(d).toBeLessThanOrEqual(8);
    expect(introPath(layout, i, true).duration).toBeLessThanOrEqual(3);
  });

  it.each([false, true])('starts far away and ends near, looking at the house slot centre (reduced %s)', (red) => {
    const path = introPath(layout, i, red);
    const start = path.at(0);
    const end = path.at(path.duration);
    expect(start.position.distanceTo(new THREE.Vector3(plot.x, plot.h, plot.z))).toBeGreaterThan(40);
    const dist = end.position.distanceTo(end.target);
    expect(dist).toBeGreaterThanOrEqual(6);
    expect(dist).toBeLessThanOrEqual(12);
    expect(end.target.distanceTo(slotCentre(i))).toBeLessThan(0.01);
    // the camera stands on the street side (+Z of the plot)
    expect(flat(end.position)).toBeGreaterThan(4);
  });

  it.each([false, true])('is continuous (reduced %s)', (red) => {
    const path = introPath(layout, i, red);
    for (let t = 0; t < path.duration; t += 0.016) {
      const a = path.at(t);
      const b = path.at(t + 0.016);
      expect(a.position.distanceTo(b.position)).toBeLessThan(3);
      expect(a.target.distanceTo(b.target)).toBeLessThan(3);
    }
  });

  it('is deterministic and clamps outside the range', () => {
    const a = introPath(layout, i, false);
    const b = introPath(layout, i, false);
    for (const t of [0, 1.3, 4, a.duration]) {
      expect(a.at(t).position.toArray()).toEqual(b.at(t).position.toArray());
    }
    expect(a.at(a.duration + 5).position.toArray()).toEqual(a.at(a.duration).position.toArray());
    expect(a.at(-1).position.toArray()).toEqual(a.at(0).position.toArray());
  });
});

describe('closeUpPath', () => {
  it('is 2-3 s, or 1 s with reduced motion', () => {
    const d = closeUpPath(layout, 3, false).duration;
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(3);
    expect(closeUpPath(layout, 3, true).duration).toBe(1);
  });

  it('starts at the intro end and ends nearer the figure', () => {
    const intro = introPath(layout, 3, false);
    const close = closeUpPath(layout, 3, false);
    const introEnd = intro.at(intro.duration);
    const s = close.at(0);
    expect(s.position.distanceTo(introEnd.position)).toBeLessThan(0.01);
    const e = close.at(close.duration);
    expect(e.position.distanceTo(e.target)).toBeLessThan(s.position.distanceTo(s.target));
    expect(e.position.distanceTo(e.target)).toBeLessThan(7);
  });

  it('is continuous and deterministic', () => {
    const p = closeUpPath(layout, 3, false);
    for (let t = 0; t < p.duration; t += 0.016) {
      expect(p.at(t).position.distanceTo(p.at(t + 0.016).position)).toBeLessThan(3);
    }
    expect(closeUpPath(layout, 3, false).at(1).position.toArray()).toEqual(p.at(1).position.toArray());
  });
});
