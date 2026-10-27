// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildLayout } from '../../src/world/layout';
import { createMarketByte, marketPose, marketStopPose } from '../../src/mascot/marketByte';
it('offers the recorded ready greeting with Weiter and stops it when the pupil continues', async () => {
  const byte = createMarketByte({
    scene: new THREE.Scene(),
    layout: buildLayout(11, 34, 'tal'),
    sound: { enabled: false },
    openQuests: vi.fn(),
  });
  const stop = vi.spyOn(byte.mascot, 'stopVoice');
  const ready = byte.guide.ask('ready');
  expect(document.querySelector('.byte-world-bubble')?.textContent).toContain('Ready when you are.');
  document.querySelector<HTMLButtonElement>('.byte-world-bubble button')!.click();
  await ready;
  expect(stop).toHaveBeenCalled();
  byte.dispose();
});
it('points first, opens quests on the second tap and handles catch-up independently', async () => {
  const openQuests = vi.fn();
  const byte = createMarketByte({
    scene: new THREE.Scene(),
    layout: buildLayout(11, 34, 'tal'),
    sound: { enabled: false },
    openQuests,
    questState: async () => ({ todayOpen: false, catchUpOpen: true }),
  });
  await byte.tap();
  await vi.waitFor(() =>
    expect(document.querySelector('.byte-world-bubble')?.textContent).toContain(
      "You can still do yesterday's quests.",
    ),
  );
  expect(openQuests).not.toHaveBeenCalled();
  await byte.tap();
  expect(openQuests).toHaveBeenCalledOnce();
  byte.dispose();
});
it('places one robot beside the board, moves it for the tutorial and returns it on cleanup', async () => {
  const layout = buildLayout(11, 34, 'tal'),
    scene = new THREE.Scene();
  const byte = createMarketByte({ scene, layout, sound: { enabled: false }, openQuests: vi.fn() });
  const market = marketPose(layout);
  expect(byte.root.position.distanceTo(market.position)).toBeLessThan(0.01);
  byte.atPlot(layout.plots[0]);
  expect(byte.root.position.distanceTo(market.position)).toBeGreaterThan(3);
  byte.restore();
  expect(byte.root.position.distanceTo(market.position)).toBeLessThan(0.01);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(500, 500, 500);
  byte.update(0.1, camera, false);
  expect(byte.root.visible).toBe(false);
  byte.dispose();
  expect(scene.children).toHaveLength(0);
});
it('stands further from the board and a little closer to the plaza', () => {
  const layout = buildLayout(11, 34, 'tal');
  const { position } = marketPose(layout);
  const dx = position.x - layout.board.x,
    dz = position.z - layout.board.z;
  const face = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  expect(dx * Math.sin(face) + dz * Math.cos(face)).toBeCloseTo(1.0, 1);
  expect(-dx * Math.cos(face) + dz * Math.sin(face)).toBeCloseTo(3.5, 1);
});
it('frames the market stop from 5.5 m at a lower angle', () => {
  const at = new THREE.Vector3(1, 2, 3);
  const { position, target } = marketStopPose(at, 0);
  expect(Math.hypot(position.x - at.x, position.z - at.z)).toBeCloseTo(5.5, 5);
  expect(position.y - at.y).toBeCloseTo(2.6, 5);
  expect(target.y - at.y).toBeCloseTo(1.35, 5);
});
