// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { bindWardrobeGestures } from '../../src/render/wardrobeGestures';
function pointer(canvas: HTMLElement, type: string, id: number, x: number, y = 0) {
  canvas.dispatchEvent(
    new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0 }),
  );
}
it('rotates with one finger, pinches with two, and rebases cleanly after lifting a finger', () => {
  const canvas = document.createElement('canvas'),
    rotate = vi.fn(),
    zoom = vi.fn();
  const handle = bindWardrobeGestures(canvas, { rotate, zoom, active: vi.fn() });
  pointer(canvas, 'pointerdown', 1, 0);
  pointer(canvas, 'pointermove', 1, 20);
  expect(rotate).toHaveBeenCalledTimes(1);
  pointer(canvas, 'pointerdown', 2, 120);
  pointer(canvas, 'pointermove', 2, 220);
  expect(zoom).toHaveBeenCalledWith(2);
  expect(rotate).toHaveBeenCalledTimes(1);
  pointer(canvas, 'pointerup', 2, 220);
  pointer(canvas, 'pointermove', 1, 30);
  expect(rotate).toHaveBeenCalledTimes(2);
  handle.dispose();
});
it('cancels stuck touches, limits input to the canvas, and removes listeners on disposal', () => {
  const canvas = document.createElement('canvas'),
    rotate = vi.fn(),
    active = vi.fn();
  const handle = bindWardrobeGestures(canvas, { rotate, zoom: vi.fn(), active });
  pointer(canvas, 'pointerdown', 1, 0);
  pointer(canvas, 'pointercancel', 1, 0);
  expect(active).toHaveBeenLastCalledWith(false);
  pointer(canvas, 'pointermove', 1, 50);
  expect(rotate).not.toHaveBeenCalled();
  handle.dispose();
  pointer(canvas, 'pointerdown', 2, 0);
  pointer(canvas, 'pointermove', 2, 50);
  expect(rotate).not.toHaveBeenCalled();
});
