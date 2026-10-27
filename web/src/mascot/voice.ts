import type { Sound } from '../ui/sound';
import { VOICE, type VoicedReaction } from './lines';
export interface SpeechFrame {
  speaking: boolean;
  speechTime: number;
  speechDuration: number;
  speechLevel: number;
}
export interface VoicePlayer {
  play(reaction: VoicedReaction): Promise<number | null>;
  /** Plays one recording by file name (without folder and extension). */
  playFile(file: string): Promise<number | null>;
  unlock(): void;
  stop(): void;
  frame(): SpeechFrame;
  dispose(): void;
}
let active: VoicePlayer | null = null;
let gestureSeen = false;
export function silenceSirByte(): void {
  active?.stop();
}
if (typeof document !== 'undefined') {
  for (const event of ['pointerdown', 'keydown'])
    document.addEventListener(
      event,
      () => {
        gestureSeen = true;
      },
      { capture: true },
    );
}
/** One voice across all hosts. A sequence token cancels responses that arrive after a close/new line. */
export function createVoicePlayer(opts: {
  sound: Pick<Sound, 'enabled'>;
  base?: string;
  createContext?: () => AudioContext | null;
  fetchFn?: typeof fetch;
  autoUnlock?: boolean;
}): VoicePlayer {
  let ctx: AudioContext | null = null,
    unlocked = false,
    disposed = false,
    sequence = 0;
  let source: AudioBufferSourceNode | null = null,
    analyser: AnalyserNode | null = null,
    gain: GainNode | null = null,
    started = 0,
    duration = 0;
  const buffers = new Map<string, AudioBuffer>();
  const unlock = (): void => {
    if (disposed) return;
    unlocked = true;
    try {
      ctx ??= opts.createContext ? opts.createContext() : new AudioContext();
      void ctx?.resume().catch(() => undefined);
    } catch {
      /* Audio is optional. */
    }
  };
  const onGesture = (): void => unlock();
  if (opts.autoUnlock !== false && typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onGesture, true);
    document.addEventListener('keydown', onGesture, true);
    if (gestureSeen) unlock();
  }
  const stop = (): void => {
    sequence++;
    const old = source;
    source = null;
    try {
      old?.stop();
    } catch {
      /* Already ended. */
    }
    old?.disconnect();
    analyser?.disconnect();
    gain?.disconnect();
    analyser = null;
    gain = null;
    if (active === player) active = null;
  };
  const playFile = async (file: string): Promise<number | null> => {
    active?.stop();
    stop();
    if (!unlocked || !opts.sound.enabled || disposed || !ctx) return null;
    active = player;
    const token = sequence,
      context = ctx;
    try {
      let buffer = buffers.get(file);
      if (!buffer) {
        const response = await (opts.fetchFn ?? fetch)(
          `${opts.base ?? import.meta.env.BASE_URL}assets/sir-byte/voice/${file}.mp3`,
        );
        if (!response.ok) return null;
        buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (disposed) return null;
        buffers.set(file, buffer);
      }
      if (token !== sequence || disposed || !opts.sound.enabled || context.state !== 'running') return null;
      const node = context.createBufferSource();
      source = node;
      gain = context.createGain();
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      node.buffer = buffer;
      gain.gain.value = 0.8;
      node.connect(analyser);
      analyser.connect(gain);
      gain.connect(context.destination);
      started = context.currentTime;
      duration = buffer.duration;
      node.onended = () => {
        if (source === node) stop();
      };
      node.start();
      return duration;
    } catch {
      if (token === sequence) stop();
      return null;
    }
  };
  const player: VoicePlayer = {
    unlock,
    stop,
    play: (reaction) => playFile(VOICE[reaction].file),
    playFile,
    frame() {
      if (!opts.sound.enabled && (source || active === player)) stop();
      let level = 0;
      if (analyser) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        level = Math.min(
          1,
          Math.sqrt(data.reduce((s, x) => s + ((x - 128) / 128) ** 2, 0) / data.length) * 3,
        );
      }
      return {
        speaking: source !== null,
        speechTime: ctx ? ctx.currentTime - started : 0,
        speechDuration: duration,
        speechLevel: level,
      };
    },
    dispose() {
      disposed = true;
      stop();
      buffers.clear();
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerdown', onGesture, true);
        document.removeEventListener('keydown', onGesture, true);
      }
      void ctx?.close().catch(() => undefined);
      ctx = null;
    },
  };
  return player;
}
