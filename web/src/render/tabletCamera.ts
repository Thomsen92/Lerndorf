import { TOUCH, Vector3, type Camera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VALLEY_RADIUS } from '../world/constants';
export function configureTabletCamera(controls: OrbitControls, reducedMotion: boolean): void {
  controls.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_PAN };
  controls.screenSpacePanning = false;
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.22;
  controls.panSpeed = 0.8;
  controls.zoomSpeed = 0.8;
  controls.rotateSpeed = 0.6;
  controls.minDistance = 12;
  controls.maxDistance = 130;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.2;
}
/** Drain OrbitControls' pending deltas, then restore the visible pose, without using private fields. */
export function stopOrbitMotion(controls: OrbitControls): void {
  const position = controls.object.position.clone(),
    target = controls.target.clone(),
    damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.object.position.copy(position);
  controls.target.copy(target);
  controls.update();
  controls.enableDamping = damping;
}
export function zoomVillageCamera(controls: OrbitControls, factor: number): void {
  stopOrbitMotion(controls);
  const offset = controls.object.position.clone().sub(controls.target);
  offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor)));
  controls.object.position.copy(controls.target).add(offset);
  controls.update();
}
export function limitVillagePan(
  camera: Camera,
  target: Vector3,
  ground: (x: number, z: number) => number,
  radius = VALLEY_RADIUS + 12,
  targetElevation = 0,
): void {
  const previous = target.clone(),
    distance = Math.hypot(target.x, target.z);
  if (distance > radius) {
    target.x *= radius / distance;
    target.z *= radius / distance;
  }
  target.y = ground(target.x, target.z) + targetElevation;
  camera.position.add(target.clone().sub(previous));
  camera.position.y = Math.max(camera.position.y, ground(camera.position.x, camera.position.z) + 2.5);
}
/** Two-finger twist changes yaw; OrbitControls retains pinch zoom and ground-plane pan. */
export function bindVillageTwist(canvas: HTMLElement, controls: OrbitControls): () => void {
  const pointers = new Map<number, { x: number; y: number }>(),
    upAxis = new Vector3(0, 1, 0);
  let angle = 0,
    twisting = false;
  const current = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.atan2(b.y - a.y, b.x - a.x) : 0;
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch' || !controls.enabled) return;
    if (e.isPrimary) pointers.clear();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture?.(e.pointerId);
    angle = current();
    twisting = false;
  };
  const move = (e: PointerEvent) => {
    if (!controls.enabled) {
      pointers.clear();
      return;
    }
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size !== 2 || !controls.enableRotate) return;
    const next = current(),
      delta = Math.atan2(Math.sin(next - angle), Math.cos(next - angle));
    if (!twisting && Math.abs(delta) < 0.06) return;
    twisting = true;
    angle = next;
    const offset = controls.object.position.clone().sub(controls.target).applyAxisAngle(upAxis, -delta);
    controls.object.position.copy(controls.target).add(offset);
    controls.update();
  };
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    angle = current();
    twisting = false;
  };
  const clear = () => {
    pointers.clear();
    twisting = false;
  };
  const start = () => stopOrbitMotion(controls);
  controls.addEventListener?.('start', start);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, up as EventListener);
  window.addEventListener('blur', clear);
  return () => {
    controls.removeEventListener?.('start', start);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      canvas.removeEventListener(type, up as EventListener);
    window.removeEventListener('blur', clear);
    clear();
  };
}
