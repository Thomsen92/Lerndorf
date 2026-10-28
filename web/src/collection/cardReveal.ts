// A card was just drawn in the LearnPass (teacher, 28.10.2026): a short mystery with its sound,
// the card appears face down as a 3D model, then it turns over with a flash and a chime. Afterwards
// it can be turned and looked at; "Weiter" shows the next new card, "Zum Almanach" opens the book.
// The grant already happened on the server; this view only shows it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { tr, msg } from '../i18n';
import { openModal, type ModalHandle } from '../ui/dialog';
import type { SoundName } from '../ui/sound';
import { catalogAssetUrl } from './catalog';
import { createCardModelCache, frameObject, type CardModelCache } from './cardModel';
import { rarityLabel } from './collectionView';
import type { CardDefinition } from './types';
import '../season/spookyFont.css';
import './cardReveal.css';

export interface CardRevealOptions {
  /** The newly drawn cards, shown one after another. */
  cards: CardDefinition[];
  reducedMotion: boolean;
  sound?: { play(name: SoundName, delayMs?: number): void } | null;
  /** Opens the almanach at this card; the reveal closes first. */
  onAlmanac?: (cardId: string) => void;
  onDone?: () => void;
  resolve?: (path: string) => string;
  cache?: CardModelCache;
  /** Test seam; null means no WebGL (the picture fallback is used). */
  createRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer | null;
}

export interface CardRevealHandle {
  close(): void;
  readonly isOpen: boolean;
}

/** Suspense before the card turns over, and how long the turn takes. */
export const MYSTERY_MS = 1900;
export const FLIP_MS = 650;
const COLOURS: Record<CardDefinition['rarity'], string> = {
  normal: '#c9d2df',
  rare: '#4aa3ff',
  epic: '#b16cff',
  legendary: '#ffb02e',
};

export function revealCards(opts: CardRevealOptions): CardRevealHandle {
  const resolve = opts.resolve ?? ((path: string) => catalogAssetUrl(path));
  const cache = opts.cache ?? createCardModelCache();
  let closed = false;
  let index = 0;
  let timers: Array<ReturnType<typeof setTimeout>> = [];
  const modal: ModalHandle = openModal({
    title: opts.cards.length > 1 ? tr('Neue Sammelkarten') : tr('Neue Sammelkarte!'),
    wide: true,
    onClose: () => cleanup(),
  });
  modal.body.closest('.overlay')?.classList.add('reveal-overlay');
  modal.body.classList.add('card-reveal');

  const stage = document.createElement('div');
  stage.className = 'reveal-stage';
  const swirl = document.createElement('div');
  swirl.className = 'reveal-swirl';
  swirl.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'reveal-canvas';
  canvas.setAttribute('role', 'img');
  const fallback = document.createElement('div');
  fallback.className = 'reveal-fallback';
  fallback.hidden = true;
  const flash = document.createElement('div');
  flash.className = 'reveal-flash';
  flash.setAttribute('aria-hidden', 'true');
  const sparks = document.createElement('div');
  sparks.className = 'reveal-sparks';
  sparks.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const spark = document.createElement('i');
    const angle = (i / 14) * Math.PI * 2;
    spark.style.setProperty('--sx', `${Math.round(Math.cos(angle) * 170)}px`);
    spark.style.setProperty('--sy', `${Math.round(Math.sin(angle) * 150)}px`);
    spark.style.setProperty('--d', `${(i % 4) * 60}ms`);
    sparks.append(spark);
  }
  stage.append(swirl, canvas, fallback, flash, sparks);

  const caption = document.createElement('div');
  caption.className = 'reveal-caption';
  caption.setAttribute('role', 'status');
  caption.setAttribute('aria-live', 'polite');
  const actions = document.createElement('div');
  actions.className = 'reveal-actions';
  const next = button('', () => advance(), 'primary reveal-next');
  const almanac = button(tr('Zum Almanach'), () => {
    const id = opts.cards[index]?.id;
    modal.close();
    if (id) opts.onAlmanac?.(id);
  });
  actions.append(next);
  if (opts.onAlmanac) actions.append(almanac);
  modal.body.append(stage, caption, actions);

  // 3D: one renderer for the whole reveal, released on close
  const renderer = (opts.createRenderer ?? createRenderer)(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  scene.add(new THREE.HemisphereLight('#fff4e2', '#3a2a4a', 2.2));
  const key = new THREE.DirectionalLight('#ffffff', 1.8);
  key.position.set(1.4, 2.2, 2.4);
  scene.add(key);
  const rim = new THREE.PointLight('#ffffff', 0, 6);
  rim.position.set(0, 0, 0.6);
  scene.add(rim);
  const holder = new THREE.Group();
  scene.add(holder);
  const controls = renderer ? new OrbitControls(camera, canvas) : null;
  if (controls) {
    controls.enabled = false;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.001;
    controls.maxDistance = 20;
  }
  let phase: 'mystery' | 'flip' | 'shown' = 'mystery';
  /** The card stays a dark, glowing shape until it turns; its own materials come back mid-turn. */
  const mysteryMaterial = new THREE.MeshStandardMaterial({
    color: '#120a1a',
    emissive: '#3a1458',
    emissiveIntensity: 0.6,
    roughness: 0.6,
  });
  let originals: Array<{ mesh: THREE.Mesh; material: THREE.Mesh['material'] }> = [];
  const shade = (dark: boolean): void => {
    for (const { mesh, material } of originals) mesh.material = dark ? mysteryMaterial : material;
  };
  let phaseStart = performance.now();
  const clock = new THREE.Clock();

  function resize(): void {
    if (!renderer) return;
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (holder.children.length) frameObject(holder, camera, controls, 1.6);
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(stage);

  renderer?.setAnimationLoop(() => {
    if (closed || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = (performance.now() - phaseStart) / 1000;
    const model = holder.children[0];
    if (model) {
      if (phase === 'mystery') {
        // face down, it grows out of the swirl and trembles
        const grow = Math.min(1, t / 0.6);
        model.scale.setScalar(0.2 + 0.8 * easeOut(grow));
        model.rotation.set(0, Math.PI + Math.sin(t * 2.4) * 0.35, Math.sin(t * 23) * 0.02 * grow);
      } else if (phase === 'flip') {
        const k = Math.min(1, t / (FLIP_MS / 1000));
        model.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.18);
        model.rotation.set(0, Math.PI + easeOutBack(k) * Math.PI, 0);
        rim.intensity = 6 * Math.sin(k * Math.PI);
        shade(k < 0.45);
      } else {
        if (rim.intensity > 0) shade(false);
        rim.intensity = Math.max(0, rim.intensity - dt * 6);
      }
    }
    controls?.update();
    renderer.render(scene, camera);
  });

  function show(): void {
    const card = opts.cards[index];
    if (!card) return modal.close();
    phase = 'mystery';
    phaseStart = performance.now();
    modal.body.style.setProperty('--tone', COLOURS[card.rarity]);
    modal.body.classList.remove('revealed');
    modal.body.classList.add('mystery');
    actions.hidden = true;
    caption.replaceChildren(line('p', tr('Eine Karte wird gezogen …'), 'reveal-drawing'));
    canvas.setAttribute('aria-label', tr('Eine Karte wird gezogen …'));
    opts.sound?.play('mystery');
    shade(false); // give the cache its own materials back before it releases them
    originals = [];
    holder.clear();
    cache.release();
    if (controls) controls.enabled = false;
    fallback.hidden = true;
    fallback.replaceChildren();
    if (renderer) {
      void cache
        .load(resolve(card.model))
        .then((object) => {
          if (closed || opts.cards[index] !== card) return;
          holder.add(object);
          object.rotation.y = Math.PI;
          originals = [];
          object.traverse((part) => {
            if (part instanceof THREE.Mesh) originals.push({ mesh: part, material: part.material });
          });
          shade(phase === 'mystery');
          resize();
        })
        .catch(() => usePicture(card));
    } else usePicture(card);
    const wait = opts.reducedMotion ? 300 : MYSTERY_MS;
    timers.push(setTimeout(() => flip(card), wait));
  }

  /** Without WebGL or model: the printed card, turned with CSS. */
  function usePicture(card: CardDefinition): void {
    if (closed) return;
    canvas.hidden = true;
    fallback.hidden = false;
    const back = document.createElement('div');
    back.className = 'reveal-fallback-back';
    back.textContent = '?';
    const front = document.createElement('img');
    front.className = 'reveal-fallback-front';
    front.src = resolve(card.front);
    front.alt = card.name;
    fallback.replaceChildren(back, front);
  }

  function flip(card: CardDefinition): void {
    if (closed) return;
    phase = 'flip';
    phaseStart = performance.now();
    opts.sound?.play('cardFlip');
    modal.body.classList.remove('mystery');
    modal.body.classList.add('revealed');
    fallback.classList.add('flipped');
    timers.push(
      setTimeout(
        () => {
          if (closed) return;
          phase = 'shown';
          if (controls) {
            controls.enabled = true;
            controls.autoRotate = !opts.reducedMotion;
            controls.autoRotateSpeed = 0.8;
          }
          const badge = line('span', tr('Neu entdeckt!'), 'reveal-new');
          const name = line('h3', card.name, 'reveal-name');
          const meta = line(
            'p',
            `#${card.number} · ${rarityLabel(card.rarity)} · ${card.topic}`,
            'reveal-meta',
          );
          const keyLine = line('p', card.key, 'reveal-key');
          const hint = line('p', tr('Ziehe die Karte, um sie von allen Seiten anzusehen.'), 'reveal-hint');
          caption.replaceChildren(badge, name, meta, keyLine);
          if (renderer && !canvas.hidden) caption.append(hint);
          canvas.setAttribute('aria-label', msg`Karte ${card.name}`);
          const more = index < opts.cards.length - 1;
          next.textContent = more ? tr('Nächste Karte') : tr('Weiter');
          actions.hidden = false;
          next.focus();
        },
        opts.reducedMotion ? 0 : FLIP_MS,
      ),
    );
  }

  function advance(): void {
    if (index < opts.cards.length - 1) {
      index += 1;
      canvas.hidden = false;
      fallback.classList.remove('flipped');
      show();
    } else modal.close();
  }

  function cleanup(): void {
    if (closed) return;
    closed = true;
    timers.forEach(clearTimeout);
    timers = [];
    observer?.disconnect();
    renderer?.setAnimationLoop(null);
    controls?.dispose();
    shade(false);
    mysteryMaterial.dispose();
    holder.clear();
    cache.release();
    cache.dispose();
    renderer?.dispose();
    opts.onDone?.();
  }

  show();
  return {
    close: () => modal.close(),
    get isOpen() {
      return modal.isOpen;
    },
  };
}

function easeOut(k: number): number {
  return 1 - (1 - k) ** 3;
}

function easeOutBack(k: number): number {
  const c = 1.7;
  return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2;
}

function line(tag: string, text: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function button(label: string, action: () => void, className = ''): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  if (className) el.className = className;
  el.addEventListener('click', action);
  return el;
}

function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer | null {
  try {
    if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return null;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    return renderer;
  } catch {
    return null;
  }
}
