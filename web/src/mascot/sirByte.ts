import * as THREE from 'three';
import { createSirByte, type Reaction } from './vendor/sir-byte.mjs';
import { CLIPS, LINES, VOICE, bubbleSeconds, type LineKey } from './lines';
import type { VoicePlayer } from './voice';
import { nextPraise, type Praise } from './praise';
export interface Say {
  text: string;
  voiced: boolean;
  seconds: number;
}
export type MascotReaction = Exclude<Reaction, 'dry' | 'smug'>;
export type Mascot = ReturnType<typeof createMascot>;
export function createMascot(opts: { voice: VoicePlayer; quality?: 'high' | 'low'; lift?: boolean }) {
  const byte = createSirByte();
  const mistakes = new Map<string, number>();
  const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const low = new Set<THREE.Material>();
  const lifted = new Set<THREE.Material>();
  const lift = opts.lift ?? false;
  /** Brighter base colour plus a faint self-glow, so he reads in the village shade. */
  const brighten = <T extends THREE.MeshStandardMaterial>(m: T): T => {
    m.color.multiplyScalar(1.12);
    m.emissive.add(m.color.clone().multiplyScalar(0.1));
    return m;
  };
  let disposed = false,
    revision = 0,
    textStart = 0,
    textDuration = 0;
  const meshes: THREE.Mesh[] = [];
  byte.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      meshes.push(o);
      originals.set(o, o.material);
      o.userData.kind = 'byte';
    }
  });
  const setQuality = (quality: 'high' | 'low'): void => {
    low.forEach((m) => m.dispose());
    low.clear();
    lifted.forEach((m) => m.dispose());
    lifted.clear();
    for (const mesh of meshes) {
      const convert = (m: THREE.Material): THREE.Material => {
        if (quality === 'high') {
          if (!lift || !(m instanceof THREE.MeshStandardMaterial)) return m;
          const copy = brighten(m.clone());
          lifted.add(copy);
          return copy;
        }
        if (!(m instanceof THREE.MeshPhysicalMaterial)) {
          if (!lift || !(m instanceof THREE.MeshStandardMaterial)) return m;
          const copy = brighten(m.clone());
          lifted.add(copy);
          return copy;
        }
        const simple = new THREE.MeshStandardMaterial({
          color: m.color,
          roughness: m.roughness,
          metalness: m.metalness,
          emissive: m.emissive,
          emissiveIntensity: m.emissiveIntensity,
        });
        low.add(simple);
        return lift ? brighten(simple) : simple;
      };
      const material = originals.get(mesh)!;
      mesh.material = Array.isArray(material) ? material.map(convert) : convert(material);
      mesh.castShadow = quality === 'high';
    }
  };
  setQuality(opts.quality ?? 'high');
  const sayText = (text: string, clip: number | null): Say => {
    textStart = performance.now() / 1000;
    textDuration = clip ?? Math.min(5, 1 + text.length * 0.045);
    return { text, voiced: clip !== null, seconds: bubbleSeconds(text, clip) };
  };
  const react = async (
    reaction: MascotReaction,
    options?: { silent?: boolean; spoken?: boolean },
  ): Promise<Say | null> => {
    if (!['idle', 'point', 'cheeky', 'celebrate', 'think', 'support', 'surprise'].includes(reaction))
      throw Error('Unsupported mascot reaction');
    if (disposed) return null;
    const token = ++revision;
    opts.voice.stop();
    byte.behavior.react(reaction);
    if (options?.silent || reaction === 'point') return null;
    const clip = options?.spoken === false ? null : await opts.voice.play(reaction);
    if (token !== revision || disposed) return null;
    return sayText(VOICE[reaction].line, clip);
  };
  const praise = async (choice: Praise = nextPraise()): Promise<Say | null> => {
    const token = revision + 1;
    const result = await react(choice.reaction, { spoken: !!choice.voice });
    return result && !disposed && token === revision
      ? sayText(choice.text, result.voiced ? result.seconds - 1.5 : null)
      : null;
  };
  return {
    root: byte.root,
    react,
    praise,
    async feedback(key: string, correct: boolean): Promise<Say> {
      const count = correct ? 0 : (mistakes.get(key) ?? 0) + 1;
      mistakes.set(key, count);
      return (
        (await (correct ? praise() : react(count === 1 ? 'cheeky' : 'support'))) ?? {
          text: '',
          voiced: false,
          seconds: 0,
        }
      );
    },
    async say(key: LineKey): Promise<Say> {
      const token = ++revision;
      opts.voice.stop();
      const file = CLIPS[key];
      const clip = file ? await opts.voice.playFile(file) : null;
      if (token !== revision || disposed)
        return { text: LINES[key], voiced: clip !== null, seconds: bubbleSeconds(LINES[key], clip) };
      return sayText(LINES[key], clip);
    },
    point(target: THREE.Vector3) {
      byte.pointAtTask(target);
    },
    gaze(x: number, y: number) {
      byte.behavior.lookAt(x, y);
    },
    pop() {
      byte.playCane();
    },
    setQuality,
    update(dt: number, options: { reducedMotion: boolean; viewer?: THREE.Vector3 | null }) {
      if (disposed) return;
      const voice = opts.voice.frame(),
        elapsed = performance.now() / 1000 - textStart;
      byte.update(dt, {
        ...voice,
        ...(voice.speaking
          ? {}
          : { speaking: elapsed < textDuration, speechTime: elapsed, speechDuration: textDuration }),
        reducedMotion: options.reducedMotion,
        viewerPosition: options.viewer,
      });
    },
    stopVoice() {
      revision++;
      textDuration = 0;
      opts.voice.stop();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      revision++;
      opts.voice.dispose();
      const materials = new Set<THREE.Material>([...low, ...lifted]),
        geometries = new Set<THREE.BufferGeometry>();
      originals.forEach((ms, mesh) => {
        geometries.add(mesh.geometry);
        (Array.isArray(ms) ? ms : [ms]).forEach((m) => materials.add(m));
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      byte.root.removeFromParent();
    },
  };
}
