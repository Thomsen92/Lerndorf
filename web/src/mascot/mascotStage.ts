import { tr } from '../i18n';
import * as THREE from 'three';
import { configurePreviewRenderer } from '../render/itemPreview';
import { readSoundSetting, type Sound } from '../ui/sound';
import { createMascot } from './sirByte';
import { createVoicePlayer } from './voice';
import { createByteBubble } from './bubble';
import { VOICE, bubbleSeconds, type LineKey, type VoicedReaction } from './lines';
import { nextPraise } from './praise';
export type Companion = ReturnType<typeof createCompanion>;
export function createCompanion(
  opts: {
    sound?: Pick<Sound, 'enabled'>;
    reducedMotion?: () => boolean;
    createRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer | null;
  } = {},
) {
  const el = document.createElement('figure');
  el.className = 'byte-stage';
  el.setAttribute('aria-label', tr('Sir Byte begleitet dich'));
  const picture = document.createElement('div');
  picture.className = 'byte-picture';
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('img');
  fallback.src = `${import.meta.env.BASE_URL}assets/sir-byte/preview.png`;
  fallback.alt = 'Sir Byte';
  fallback.hidden = true;
  picture.append(canvas, fallback);
  el.append(picture);
  const bubble = createByteBubble(el);
  const voice = createVoicePlayer({
    sound: opts.sound ?? {
      get enabled() {
        return readSoundSetting();
      },
    },
  });
  const mascot = createMascot({ voice, quality: 'low' });
  const scene = new THREE.Scene();
  scene.add(mascot.root, new THREE.HemisphereLight('#d7ecff', '#6e788d', 2.5));
  const light = new THREE.DirectionalLight('#fff0d8', 3.5);
  light.position.set(-3, 5, 5);
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 2.2, 7.4);
  camera.lookAt(0, 1.95, 0);
  let renderer: THREE.WebGLRenderer | null = null,
    frame = 0,
    disposed = false,
    revision = 0,
    last = performance.now(),
    lastSize = 0,
    lastRatio = 0;
  const mistakes = new Map<string, number>();
  const showFallback = (): void => {
    canvas.hidden = true;
    fallback.hidden = false;
    el.dataset.renderer = 'fallback';
  };
  try {
    renderer = opts.createRenderer
      ? opts.createRenderer(canvas)
      : typeof WebGLRenderingContext === 'undefined'
        ? null
        : new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    if (renderer) {
      configurePreviewRenderer(renderer);
      el.dataset.renderer = 'webgl';
      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        showFallback();
      });
    } else showFallback();
  } catch {
    showFallback();
  }
  const tick = (now: number): void => {
    if (disposed) return;
    const dt = Math.min(0.08, (now - last) / 1000);
    last = now;
    if (el.isConnected && !canvas.hidden && renderer && document.visibilityState !== 'hidden') {
      const size = Math.max(120, picture.clientWidth || 180);
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      if (size !== lastSize || ratio !== lastRatio) {
        renderer.setPixelRatio(ratio);
        renderer.setSize(size, size, false);
        lastSize = size;
        lastRatio = ratio;
      }
      mascot.update(dt, {
        reducedMotion:
          opts.reducedMotion?.() ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
      });
      renderer.render(scene, camera);
      canvas.dataset.ready = 'true';
    }
    frame = window.requestAnimationFrame(tick);
  };
  if (renderer) frame = window.requestAnimationFrame(tick);
  const react = async (reaction: VoicedReaction): Promise<void> => {
    const token = ++revision;
    bubble.show({
      text: VOICE[reaction].line,
      voiced: false,
      seconds: bubbleSeconds(VOICE[reaction].line, null),
    });
    const said = await mascot.react(reaction);
    if (!disposed && token === revision && said) bubble.show(said);
  };
  return {
    el,
    mascot,
    bubble,
    lookAt(target: HTMLElement | null) {
      if (!target) {
        mascot.gaze(0, 0);
        return;
      }
      const at = target.getBoundingClientRect(),
        own = picture.getBoundingClientRect();
      mascot.gaze(
        (at.left + at.width / 2 - own.left - own.width / 2) / 500,
        (own.top + own.height / 2 - at.top - at.height / 2) / 500,
      );
    },
    say(key: LineKey) {
      revision++;
      bubble.show(mascot.say(key), true);
    },
    react,
    async answer(key: string, correct: boolean, allDone = false) {
      const count = correct ? 0 : (mistakes.get(key) ?? 0) + 1;
      mistakes.set(key, count);
      const requested = revision + 1;
      let seconds = 2.5;
      if (correct) {
        const choice = nextPraise();
        const token = ++revision;
        bubble.show({ text: choice.text, voiced: false, seconds: bubbleSeconds(choice.text, null) });
        const said = await mascot.praise(choice);
        if (!disposed && token === revision && said) {
          bubble.show(said);
          seconds = said.seconds;
        }
      } else await react(count === 1 ? 'cheeky' : 'support');
      if (allDone && !disposed && revision === requested) {
        const token = revision;
        window.setTimeout(
          () => {
            if (!disposed && revision === token) {
              void mascot.react('surprise', { silent: true });
              bubble.show(mascot.say('allDone'));
            }
          },
          Math.max(2300, seconds * 1000),
        );
      }
    },
    thinking() {
      revision++;
      mascot.stopVoice();
      void mascot.react('think', { silent: true });
    },
    listen() {
      revision++;
      mascot.stopVoice();
    },
    greet() {
      try {
        const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
        if (localStorage.getItem('lerndorf.byteGreeted') === today) return;
        localStorage.setItem('lerndorf.byteGreeted', today);
      } catch {
        /* Storage is optional. */
      }
      void react('idle');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision++;
      window.cancelAnimationFrame(frame);
      bubble.dispose();
      mascot.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      el.remove();
    },
  };
}
