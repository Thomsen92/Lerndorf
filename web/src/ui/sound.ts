export type SoundName =
  | 'place'
  | 'ding'
  | 'remove'
  | 'xp'
  | 'levelup'
  | 'chest'
  | 'coins'
  | 'correct'
  | 'wrong'
  | 'blip'
  | 'typing'
  | 'victory'
  | 'mystery'
  | 'cardFlip'
  | 'giggle'
  | 'shopClick' | 'shopOpen' | 'shopSave' | 'shopPage' | 'shopConfirm'
  | 'shopCancel' | 'shopCoin' | 'shopHover' | 'ollieBlip' | 'ollieTyping';
export const SOUND_FILES: Record<SoundName, string> = {
  shopClick: 'assets/audio/ollie-ui/sfx_clicks_pops_01_soft_click.ogg',
  shopOpen: 'assets/audio/ollie-ui/sfx_clicks_pops_12_pop_medium.ogg',
  shopSave: 'assets/audio/ollie-ui/sfx_bubble_pluck_13_pluck_kalimba.ogg',
  shopPage: 'assets/audio/ollie-ui/sfx_page_paper_01_page_flip.ogg',
  shopConfirm: 'assets/audio/ollie-ui/sfx_confirm_cancel_01_confirm_up_two.ogg',
  shopCancel: 'assets/audio/ollie-ui/sfx_confirm_cancel_09_cancel_down_two.ogg',
  shopCoin: 'assets/audio/ollie-ui/sfx_coin_pickup_01_coin_soft.ogg',
  shopHover: 'assets/audio/ollie-ui/sfx_hover_soft_tick_01_tick_soft.ogg',
  ollieBlip: 'assets/audio/ollie-ui/sfx_bubble_pluck_02_bubble_medium.ogg',
  ollieTyping: 'assets/audio/ollie-ui/sfx_typing_blips_02_blip_mid.ogg',
  xp: 'assets/kenney/fx/xp.mp3',
  // supplied by the teacher (28.10.2026), the Kenney sounds stay in the repo as fallback
  levelup: 'assets/audio/sfx/level-up.mp3',
  chest: 'assets/audio/sfx/chest-open.mp3',
  coins: 'assets/kenney/fx/coins.mp3',
  place: 'assets/kenney/fx/place.mp3',
  ding: 'assets/kenney/fx/ding.mp3',
  remove: 'assets/kenney/fx/remove.mp3',
  // supplied by the teacher (28.10.2026): answers and Sir Byte's speech bubbles
  correct: 'assets/audio/sfx/success.mp3',
  wrong: 'assets/audio/sfx/error.mp3',
  blip: 'assets/audio/sfx/dialog-blip.mp3',
  typing: 'assets/audio/sfx/dialog-typing.mp3',
  // a whole quiz done: own composition (scripts/audio/make-victory-fanfare.py), CC0
  victory: 'assets/audio/sfx/victory-fanfare.mp3',
  // almanac and card draw: own synthesis (scripts/audio/make-almanac-sounds.py), CC0
  mystery: 'assets/audio/sfx/mystery.mp3',
  cardFlip: 'assets/audio/sfx/card-flip.mp3',
  giggle: 'assets/audio/sfx/giggle.mp3',
};
/** Per-sound loudness; the speech sounds sit below the game effects. */
/** Sounds that pause the background music while they play (a fanfare over a loop sounds messy). */
const DUCK: ReadonlySet<SoundName> = new Set(['victory', 'mystery', 'giggle']);
const VOLUME: Partial<Record<SoundName, number>> = {
  shopClick: .12, shopOpen: .12, shopSave: .10, shopPage: .10,
  shopConfirm: .10, shopCancel: .08, shopCoin: .14, shopHover: .035,
  ollieBlip: .12, ollieTyping: .035,
  blip: 0.3,
  typing: 0.22,
  correct: 0.4,
  wrong: 0.35,
  victory: 0.3,
};

/** Background loops: the village everywhere, the thinking loop while a quiz window is open. */
export type MusicTrack = 'village' | 'quiz';
export const MUSIC_FILES: Record<MusicTrack, string> = {
  village: 'assets/audio/music/mischief-managed-loop.mp3',
  quiz: 'assets/audio/music/quiz-thinking-loop.mp3',
};
// the quiz loop sits well below speech and answers (teacher, 28.10.2026)
const MUSIC_VOLUME: Record<MusicTrack, number> = { village: 0.22, quiz: 0.1 };
/** While something is being listened to, the music drops to this share of its volume. */
const QUIET_SHARE = 0.25;

export const SOUND_KEY = 'lerndorf.sound';
export const MUSIC_KEY = 'lerndorf.music';
type Store = Pick<Storage, 'getItem' | 'setItem'> | null;
function readFlag(key: string, store?: Store): boolean {
  try {
    return (store === undefined ? localStorage : store)?.getItem(key) !== '0';
  } catch {
    return true;
  }
}
function writeFlag(key: string, on: boolean, store?: Store): void {
  try {
    (store === undefined ? localStorage : store)?.setItem(key, on ? '1' : '0');
  } catch {
    /* Storage is optional. */
  }
}
export function readSoundSetting(store?: Store): boolean {
  return readFlag(SOUND_KEY, store);
}
export function writeSoundSetting(on: boolean, store?: Store): void {
  writeFlag(SOUND_KEY, on, store);
}
export function readMusicSetting(store?: Store): boolean {
  return readFlag(MUSIC_KEY, store);
}
export function writeMusicSetting(on: boolean, store?: Store): void {
  writeFlag(MUSIC_KEY, on, store);
}

export interface Sound {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  /** Background music on/off; off also when all sounds are off. */
  readonly musicOn: boolean;
  setMusicOn(on: boolean): void;
  unlock(): void;
  play(name: SoundName, delayMs?: number): void;
  /** Plays a sound for at most `seconds` (the typing loop under unvoiced speech); returns stop. */
  playFor(name: SoundName, seconds: number): () => void;
  /** The base track (the village). null stops the music. */
  setMusic(track: MusicTrack | null): void;
  /** Overlays a track while held (a quiz window); the returned release restores the base track. */
  pushMusic(track: MusicTrack): () => void;
  /** Turns the music down while held (a listening text plays); the returned release restores it. */
  quiet(): () => void;
  dispose(): void;
}

/** The game's sound while a village runs; views without a handle (speech bubbles) use it. */
let active: Sound | null = null;
export function activeSound(): Sound | null {
  return active;
}

export function createSound(
  opts: {
    createContext?: () => AudioContext | null;
    fetchFn?: typeof fetch;
    base?: string;
    store?: Store;
    /** Test seam for the music elements. */
    createAudio?: (src: string) => HTMLAudioElement;
    doc?: {
      readonly hidden: boolean;
      addEventListener(type: 'visibilitychange', listener: () => void): void;
      removeEventListener(type: 'visibilitychange', listener: () => void): void;
    };
  } = {},
): Sound {
  let enabled = readSoundSetting(opts.store);
  let musicOn = readMusicSetting(opts.store);
  let context: AudioContext | null = null;
  let attempted = false;
  let unlocked = false;
  let disposed = false;
  let base: MusicTrack | null = null;
  const overlays: MusicTrack[] = [];
  /** How many ducking sounds are playing right now. */
  let ducked = 0;
  /** How many listening texts hold the music down right now. */
  let quietHolds = 0;
  const musicGains = new Map<MusicTrack, GainNode>();
  /** Sets every track's loudness: its own volume, lower while something is being listened to. */
  const applyVolume = (): void => {
    const share = quietHolds > 0 ? QUIET_SHARE : 1;
    for (const [name, el] of tracks) {
      const gain = musicGains.get(name);
      if (gain) gain.gain.value = MUSIC_VOLUME[name] * share;
      else el.volume = MUSIC_VOLUME[name] * share;
    }
  };
  const buffers = new Map<SoundName, AudioBuffer>();
  const sources = new Set<AudioBufferSourceNode>();
  const tracks = new Map<MusicTrack, HTMLAudioElement>();
  const doc = opts.doc ?? (typeof document === 'undefined' ? null : document);
  const prefix = (): string => opts.base ?? import.meta.env.BASE_URL;

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

  /** One looping element per track, routed through the context so iPads honour the volume. */
  const track = (name: MusicTrack): HTMLAudioElement | null => {
    let el = tracks.get(name) ?? null;
    if (el) return el;
    try {
      el = opts.createAudio
        ? opts.createAudio(prefix() + MUSIC_FILES[name])
        : new Audio(prefix() + MUSIC_FILES[name]);
      el.loop = true;
      el.preload = 'auto';
      const ctx = context as
        (AudioContext & { createMediaElementSource?: AudioContext['createMediaElementSource'] }) | null;
      if (ctx?.createMediaElementSource) {
        const gain = ctx.createGain();
        ctx.createMediaElementSource(el).connect(gain);
        gain.connect(ctx.destination);
        musicGains.set(name, gain);
      }
      tracks.set(name, el);
      applyVolume();
    } catch {
      return null;
    }
    return el;
  };

  /** Plays exactly the wanted track, or nothing (muted, hidden tab, before the first gesture). */
  const applyMusic = (): void => {
    const want = overlays.at(-1) ?? base;
    const audible = enabled && musicOn && unlocked && !disposed && !doc?.hidden && ducked === 0;
    for (const [name, el] of tracks)
      if (name !== want || !audible) {
        if (!el.paused) el.pause();
        if (name !== want) el.currentTime = 0;
      }
    if (!want || !audible) return;
    const el = track(want);
    if (el?.paused) void el.play()?.catch(() => undefined);
  };
  const onVisibility = (): void => applyMusic();
  doc?.addEventListener('visibilitychange', onVisibility);

  /** One buffer play; a finite length stops it early (typing under unvoiced speech). */
  const start = (name: SoundName, seconds: number, delayMs: number): (() => void) => {
    const buffer = buffers.get(name);
    const none = (): void => undefined;
    if (!enabled || disposed || !context || context.state !== 'running' || !buffer || seconds <= 0)
      return none;
    try {
      const source = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = VOLUME[name] ?? 0.35;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(context.destination);
      sources.add(source);
      const duck = DUCK.has(name);
      if (duck) {
        ducked++;
        applyMusic();
      }
      source.onended = () => {
        sources.delete(source);
        source.disconnect();
        gain.disconnect();
        if (duck) {
          ducked = Math.max(0, ducked - 1);
          applyMusic();
        }
      };
      const at = context.currentTime + Math.max(0, delayMs) / 1000;
      source.start(at);
      if (Number.isFinite(seconds)) source.stop(at + seconds);
      return () => {
        try {
          source.stop();
        } catch {
          /* Already ended. */
        }
      };
    } catch {
      /* A suspended or closed device must never block building. */
      return none;
    }
  };

  const sound: Sound = {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      writeSoundSetting(on, opts.store);
      if (!on) stop();
      applyMusic();
    },
    get musicOn() {
      return musicOn;
    },
    setMusicOn(on) {
      musicOn = on;
      writeMusicSetting(on, opts.store);
      applyMusic();
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
                  const response = await (opts.fetchFn ?? fetch)(prefix() + SOUND_FILES[name]);
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
      unlocked = true;
      applyMusic();
    },
    play(name, delayMs = 0) {
      start(name, Infinity, delayMs);
    },
    playFor(name, seconds) {
      return start(name, seconds, 0);
    },
    setMusic(next) {
      base = next;
      applyMusic();
    },
    pushMusic(next) {
      overlays.push(next);
      applyMusic();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const at = overlays.lastIndexOf(next);
        if (at >= 0) overlays.splice(at, 1);
        applyMusic();
      };
    },
    quiet() {
      quietHolds++;
      applyVolume();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        quietHolds = Math.max(0, quietHolds - 1);
        applyVolume();
      };
    },
    dispose() {
      disposed = true;
      if (active === sound) active = null;
      stop();
      applyMusic();
      doc?.removeEventListener('visibilitychange', onVisibility);
      for (const el of tracks.values()) el.removeAttribute('src');
      tracks.clear();
      buffers.clear();
      try {
        void context?.close().catch(() => undefined);
      } catch {
        /* Already closed. */
      }
    },
  };
  active = sound;
  return sound;
}
