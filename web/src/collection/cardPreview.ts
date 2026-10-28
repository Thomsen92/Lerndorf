// Large interactive 3D preview of one collection card (plan package 6).
// Own renderer per open preview, one active model, tab pause, request token for fast switches.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tr } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import { catalogAssetUrl } from './catalog';
import type { CardDefinition } from './types';
import { createCardModelCache, frameObject, type CardModelCache } from './cardModel';
import './cardPreview.css';

export interface CardPreviewOptions {
  card: CardDefinition;
  opener?: HTMLElement | null;
  reducedMotion: boolean;
  /** Injected in tests; defaults to the public asset root. */
  resolve?: (path: string) => string;
  cache?: CardModelCache;
}

export interface CardPreviewHandle {
  close(): void;
  readonly isOpen: boolean;
}

const FOV = 36;

export function openCardPreview(opts: CardPreviewOptions): CardPreviewHandle {
  const resolve = opts.resolve ?? ((path: string) => catalogAssetUrl(path));
  const cache = opts.cache ?? createCardModelCache();
  let release: () => void = () => undefined;
  const modal: ModalHandle = openModal({
    title: opts.card.name,
    opener: opts.opener,
    wide: true,
    onClose: () => release(),
  });
  modal.body.classList.add('card-preview');
  const stage = document.createElement('div');
  stage.className = 'card-preview-stage';
  const canvas = document.createElement('canvas');
  canvas.className = 'card-preview-canvas';
  canvas.setAttribute('aria-label', tr('3D-Modell der Karte'));
  canvas.setAttribute('role', 'img');
  const status = document.createElement('p');
  status.className = 'card-preview-status';
  status.setAttribute('role', 'status');
  status.textContent = tr('Modell wird geladen …');
  stage.append(canvas, status);

  const side = document.createElement('div');
  side.className = 'card-preview-side';
  const meta = document.createElement('p');
  meta.className = 'card-preview-meta';
  meta.textContent = `${opts.card.rarity} · ${opts.card.topic}`;
  const key = document.createElement('strong');
  key.className = 'card-preview-key';
  key.textContent = opts.card.key;
  const text = document.createElement('p');
  text.className = 'card-preview-text';
  text.textContent = opts.card.example;
  const tip = document.createElement('p');
  tip.className = 'card-preview-tip';
  tip.textContent = opts.card.tip;
  side.append(meta, key, text, tip);

  const actions = document.createElement('div');
  actions.className = 'card-preview-actions';
  const flip = button(tr('Umdrehen'));
  const reset = button(tr('Ansicht zurücksetzen'));
  const motif = button(tr('Motiv zeigen'));
  const print = button(tr('Druckbild ansehen'));
  actions.append(flip, reset);
  if (opts.card.format === 'printed-surface') {
    motif.remove();
    print.addEventListener('click', () => openPrint(opts.card.front, opts.card.name));
    actions.append(print);
  } else if (opts.card.motifModel !== opts.card.model) {
    actions.append(motif);
  } else {
    motif.remove();
  }

  modal.body.append(stage, side, actions);

  const renderer = createRenderer(canvas);
  if (!renderer) {
    status.textContent = tr('3D-Ansicht ist auf diesem Gerät nicht verfügbar.');
    return {
      close: () => modal.close(),
      get isOpen() {
        return modal.isOpen;
      },
    };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#241a2e');
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 100);
  camera.position.set(0, 0, 3);
  scene.add(new THREE.HemisphereLight('#fff4e2', '#4a3a52', 2.1));
  const keyLight = new THREE.DirectionalLight('#ffffff', 1.7);
  keyLight.position.set(1.5, 2.4, 2.2);
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight('#c9b6ff', 0.7);
  fill.position.set(-2, -1, 1.5);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = !opts.reducedMotion;
  controls.autoRotateSpeed = 0.6;
  controls.minDistance = 0.001;
  controls.maxDistance = 20;

  let closed = false,
    token = 0,
    mode: 'card' | 'motif' = 'card',
    yaw = 0,
    targetYaw = 0,
    retry: HTMLButtonElement | null = null;
  const clock = new THREE.Clock();

  function resize(): void {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    const aspect = width / height;
    renderer!.setSize(width, height, false);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    if (!root.children.length) return;
    frameObject(root, camera, controls);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(stage);

  async function show(which: 'card' | 'motif'): Promise<void> {
    const current = ++token;
    retry?.remove();
    retry = null;
    status.hidden = false;
    status.classList.remove('error');
    status.textContent = tr('Modell wird geladen …');
    const path = which === 'motif' ? opts.card.motifModel : opts.card.model;
    try {
      const object = await cache.load(resolve(path));
      if (closed || current !== token) return;
      root.clear();
      cache.release();
      root.add(object);
      yaw = 0;
      targetYaw = 0;
      root.rotation.set(0, 0, 0);
      resize();
      status.hidden = true;
    } catch {
      if (closed || current !== token) return;
      status.hidden = false;
      status.classList.add('error');
      status.textContent = tr('Das Modell konnte nicht geladen werden.');
      retry = button(tr('Erneut versuchen'));
      retry.addEventListener('click', () => {
        retry?.remove();
        retry = null;
        void show(which);
      });
      status.after(retry);
    }
  }

  flip.addEventListener('click', () => {
    targetYaw += Math.PI;
  });
  reset.addEventListener('click', () => {
    targetYaw = 0;
    root.rotation.set(0, 0, 0);
    yaw = 0;
    if (root.children.length) frameObject(root, camera, controls);
  });
  motif.addEventListener('click', () => {
    mode = mode === 'card' ? 'motif' : 'card';
    motif.textContent = mode === 'card' ? tr('Motiv zeigen') : tr('Karte zeigen');
    void show(mode);
  });

  const onVisibility = (): void => {
    if (document.hidden) clock.stop();
    else clock.start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  renderer.setAnimationLoop(() => {
    if (closed || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    if (Math.abs(yaw - targetYaw) > 0.001) {
      yaw += (targetYaw - yaw) * Math.min(1, dt * 8);
      root.rotation.y = yaw;
    }
    controls.update();
    renderer!.render(scene, camera);
  });

  release = cleanup;
  void show('card');

  return {
    close: () => modal.close(),
    get isOpen() {
      return modal.isOpen;
    },
  };

  function cleanup(): void {
    if (closed) return;
    closed = true;
    token += 1;
    document.removeEventListener('visibilitychange', onVisibility);
    observer.disconnect();
    renderer!.setAnimationLoop(null);
    controls.dispose();
    cache.release();
    cache.dispose();
    renderer!.dispose();
  }
}

function button(label: string): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'card-preview-button';
  el.textContent = label;
  return el;
}

function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer | null {
  try {
    return new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return null;
  }
}

/** Opens the full print source without a 3D perspective (plan §10.6). */
function openPrint(path: string, title: string): void {
  const modal = openModal({ title, wide: true });
  const image = document.createElement('img');
  image.className = 'card-preview-print';
  image.src = catalogAssetUrl(path);
  image.alt = title;
  modal.body.append(image);
}
