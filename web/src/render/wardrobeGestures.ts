/** Local to the canvas: menus retain native scrolling and browser zoom. */
export function bindWardrobeGestures(
  canvas: HTMLElement,
  callbacks: {
    rotate: (angle: number) => void;
    zoom: (factor: number) => void;
    active: (on: boolean) => void;
  },
): { dispose(): void } {
  const pointers = new Map<number, { x: number; y: number }>();
  const distance = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture?.(event.pointerId);
    callbacks.active(true);
  };
  const move = (event: PointerEvent) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const before = distance(),
      dx = event.clientX - previous.x;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) callbacks.rotate((dx * 2 * Math.PI) / Math.max(360, canvas.clientWidth));
    else if (pointers.size === 2 && before > 8) {
      const after = distance();
      if (after > 8) callbacks.zoom(after / before);
    }
  };
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    callbacks.active(pointers.size > 0);
  };
  const clear = () => {
    pointers.clear();
    callbacks.active(false);
  };
  const visibility = () => {
    if (document.hidden) clear();
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    callbacks.zoom(Math.exp(-event.deltaY * 0.001));
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    canvas.addEventListener(type, up as EventListener);
  canvas.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility);
  return {
    dispose() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
        canvas.removeEventListener(type, up as EventListener);
      canvas.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
      clear();
    },
  };
}
