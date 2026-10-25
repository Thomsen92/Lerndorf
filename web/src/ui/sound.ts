export type SoundName = 'place' | 'ding' | 'remove' | 'xp' | 'levelup' | 'chest' | 'coins';
export const SOUND_FILES: Record<SoundName, string> = {
  xp: 'assets/kenney/fx/xp.mp3',
  levelup: 'assets/kenney/fx/levelup.mp3',
  chest: 'assets/kenney/fx/chest.mp3',
  coins: 'assets/kenney/fx/coins.mp3',
  place: 'assets/kenney/fx/place.mp3',
  ding: 'assets/kenney/fx/ding.mp3',
  remove: 'assets/kenney/fx/remove.mp3',
};
export const SOUND_KEY = 'lerndorf.sound';
type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
export function readSoundSetting(store?: Store): boolean {
  try {
    return (store === undefined ? localStorage : store)?.getItem(SOUND_KEY) !== '0';
  } catch {
    return true;
  }
}
export function writeSoundSetting(on: boolean, store?: Store): void {
  try {
    (store === undefined ? localStorage : store)?.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* Storage is optional. */
  }
}
export interface Sound {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  unlock(): void;
  play(name: SoundName, delayMs?: number): void;
  dispose(): void;
}
export function createSound(
  opts: {
    createContext?: () => AudioContext | null;
    fetchFn?: typeof fetch;
    base?: string;
    store?: Store;
  } = {},
): Sound {
  let enabled = readSoundSetting(opts.store);
  let context: AudioContext | null = null;
  let attempted = false;
  let disposed = false;
  const buffers = new Map<SoundName, AudioBuffer>();
  const sources = new Set<AudioBufferSourceNode>();
  const stop = (): void => {
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    sources.clear();
  };
  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      writeSoundSetting(on, opts.store);
      if (!on) stop();
    },
    unlock() {
      if (disposed) return;
      try {
        if (!attempted) {
          attempted = true;
          context = opts.createContext ? opts.createContext() : new AudioContext();
          const ctx = context;
          if (ctx)
            for (const name of Object.keys(SOUND_FILES) as SoundName[]) {
              void Promise.resolve()
                .then(async () => {
                  const response = await (opts.fetchFn ?? fetch)(
                    (opts.base ?? import.meta.env.BASE_URL) + SOUND_FILES[name],
                  );
                  if (!response.ok) return;
                  const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
                  if (!disposed) buffers.set(name, buffer);
                })
                .catch(() => undefined);
            }
        }
        void context?.resume().catch(() => undefined);
      } catch {
        /* Audio is optional, including on older tablets. */
      }
    },
    play(name, delayMs = 0) {
      const buffer = buffers.get(name);
      if (!enabled || disposed || !context || context.state !== 'running' || !buffer) return;
      try {
        const source = context.createBufferSource();
        const gain = context.createGain();
        gain.gain.value = 0.35;
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(context.destination);
        sources.add(source);
        source.onended = () => {
          sources.delete(source);
          source.disconnect();
          gain.disconnect();
        };
        source.start(context.currentTime + Math.max(0, delayMs) / 1000);
      } catch {
        /* A suspended or closed device must never block building. */
      }
    },
    dispose() {
      disposed = true;
      stop();
      buffers.clear();
      try {
        void context?.close().catch(() => undefined);
      } catch {
        /* Already closed. */
      }
    },
  };
}
