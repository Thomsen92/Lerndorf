// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { PerspectiveCamera, TOUCH, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  configureTabletCamera,
  limitVillagePan,
  zoomVillageCamera,
  bindVillageTwist,
} from '../../src/render/tabletCamera';
it('maps one finger to ground panning and two to zoom/rotation, retaining bounded angles', () => {
  const camera = new PerspectiveCamera(),
    controls = new OrbitControls(camera, document.createElement('canvas'));
  configureTabletCamera(controls, false);
  expect(controls.touches).toEqual({ ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN });
  expect(controls.screenSpacePanning).toBe(false);
  expect(controls.minPolarAngle).toBeGreaterThan(0);
  expect(controls.maxPolarAngle).toBeLessThan(Math.PI / 2);
  configureTabletCamera(controls, true);
  expect(controls.enableDamping).toBe(false);
  controls.dispose();
});
it('keeps the pan target in the village and camera above the terrain', () => {
  const camera = new PerspectiveCamera();
  camera.position.set(150, 1, 10);
  const target = new Vector3(130, 0, 0);
  limitVillagePan(camera, target, () => 5, 90);
  expect(Math.hypot(target.x, target.z)).toBeLessThanOrEqual(90);
  expect(target.y).toBe(5);
  expect(camera.position.y).toBeGreaterThanOrEqual(7.5);
  // Market focus stays on the subjects instead of snapping down to the ground on the next frame.
  const before = camera.position.y;
  limitVillagePan(camera, target, () => 5, 90, 2.2);
  expect(target.y).toBeCloseTo(7.2);
  expect(camera.position.y - before).toBeCloseTo(2.2);
});
it('clamps button zoom at the same limits as gestures', () => {
  const camera = new PerspectiveCamera();
  camera.position.set(0, 20, 20);
  const controls = new OrbitControls(camera, document.createElement('canvas'));
  configureTabletCamera(controls, false);
  zoomVillageCamera(controls, 0.0001);
  expect(camera.position.distanceTo(controls.target)).toBeCloseTo(controls.minDistance);
  zoomVillageCamera(controls, 10000);
  expect(camera.position.distanceTo(controls.target)).toBeCloseTo(controls.maxDistance);
  controls.dispose();
});
it('twists the camera with two fingers, suppresses jitter and stops on cancellation or disposal', () => {
  const canvas = document.createElement('canvas'),
    camera = new PerspectiveCamera();
  camera.position.set(0, 10, 20);
  const controls = {
    object: camera,
    target: new Vector3(),
    enabled: true,
    enableRotate: true,
    update: vi.fn(),
  } as unknown as OrbitControls;
  const dispose = bindVillageTwist(canvas, controls);
  const touch = (type: string, id: number, x: number, y: number) =>
    canvas.dispatchEvent(
      new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }),
    );
  touch('pointerdown', 1, 0, 0);
  touch('pointerdown', 2, 100, 0);
  touch('pointermove', 2, 100, 1);
  expect(camera.position.x).toBe(0);
  touch('pointermove', 2, 0, 100);
  expect(Math.abs(camera.position.x)).toBeCloseTo(20);
  const position = camera.position.clone();
  touch('pointercancel', 2, 0, 100);
  touch('pointermove', 1, 60, 60);
  expect(camera.position.equals(position)).toBe(true);
  dispose();
  touch('pointerdown', 3, 0, 0);
  touch('pointerdown', 4, 100, 0);
  touch('pointermove', 4, 0, 100);
  expect(camera.position.equals(position)).toBe(true);
});
