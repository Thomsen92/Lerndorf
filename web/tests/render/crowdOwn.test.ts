// @vitest-environment happy-dom
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Crowd } from '../../src/render/crowd';
import { buildLayout } from '../../src/world/layout';

vi.mock('../../src/render/character', async (orig) => ({
  ...(await orig<typeof import('../../src/render/character')>()),
  loadCharacter: async () => null,
}));

describe('Crowd own figure (tutorial)', () => {
  const layout = buildLayout(7, 12);
  const make = (): Crowd =>
    new Crowd(new THREE.Scene(), layout, [{ nickname: 'Ich', own: true }, { nickname: 'Anna' }]);

  it('stands in front of the house slot, facing the street, and stays there', () => {
    const crowd = make();
    crowd.placeOwnInFrontOfHouse(2);
    const v = crowd.villagers[0];
    const plot = layout.plots[2];
    const before = v.group.position.clone();
    expect(v.group.rotation.y).toBeCloseTo(plot.face, 6);
    expect(Math.hypot(before.x - plot.x, before.z - plot.z)).toBeLessThan(5);
    for (let i = 0; i < 600; i++) crowd.update(0.1);
    expect(v.group.position.distanceTo(before)).toBeLessThan(1e-6);
  });

  it('resolves playDanceOnce after about 2 s without a loaded model', async () => {
    vi.useFakeTimers();
    const crowd = make();
    const p = crowd.playDanceOnce();
    await vi.advanceTimersByTimeAsync(2100);
    await expect(p).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
