import type { PreviewFactory } from './itemPreview';
import { createItemOrbitView } from './itemOrbitView';

/** Shop adapter uses the same actual models and camera fitting as the chest's large 3D view. */
export const createShopItemPreview: PreviewFactory = (canvas, opts) => {
  const view = createItemOrbitView(canvas, opts);
  if (!view) return null;
  let disposed = false;
  const onLost = (event: Event): void => {
    event.preventDefault();
    if (!disposed) opts.onError();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  return {
    show(kind, id) {
      void view.load(kind, id).catch(() => {
        if (!disposed) opts.onError();
      });
    },
    reset() {
      if (!disposed) view.reset();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      view.dispose();
    },
  };
};
