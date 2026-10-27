import { tr } from '../i18n';
import './cameraTools.css';
export function createCameraTools(opts: {
  zoom: (factor: number) => void;
  reset: () => void;
  home: boolean;
}): HTMLElement {
  const el = document.createElement('nav');
  el.className = 'camera-tools';
  el.setAttribute('aria-label', tr('Kamerasteuerung'));
  for (const [symbol, label, run] of [
    ['+', tr('Vergrößern'), () => opts.zoom(0.8)],
    ['−', tr('Verkleinern'), () => opts.zoom(1.25)],
    ['⌖', opts.home ? tr('Zum eigenen Haus') : tr('Ansicht zurücksetzen'), opts.reset],
  ] as const) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = symbol;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.onclick = run;
    el.append(b);
  }
  return el;
}
