// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildLayout } from '../../src/world/layout';
import { createMarketByte, marketPose } from '../../src/mascot/marketByte';
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
  expect(document.querySelector('.byte-world-bubble')?.textContent).toContain(
    "You can still do yesterday's quests.",
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
