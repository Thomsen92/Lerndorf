// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import {
  activeSound,
  createSound,
  readMusicSetting,
  readSoundSetting,
  writeSoundSetting,
  SOUND_FILES,
} from '../../src/ui/sound';
const flush = () => new Promise((r) => setTimeout(r, 0));
function fake() {
  const start = vi.fn(),
    gain = { gain: { value: 0 }, connect: vi.fn() };
  const ctx = {
    state: 'running',
    currentTime: 3,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue({}),
    createGain: vi.fn(() => gain),
    createBufferSource: vi.fn(() => ({ connect: vi.fn(), start, stop: vi.fn() })),
  };
  const fetchFn = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) });
  const factory = vi.fn(() => ctx as unknown as AudioContext);
  return { ctx, start, gain, fetchFn, factory };
}
it('defaults on and tolerates blocked or absent storage', () => {
  expect(readSoundSetting(null)).toBe(true);
  expect(readSoundSetting({ getItem: () => '0', setItem() {} })).toBe(false);
  const store = {
    getItem: () => {
      throw Error();
    },
    setItem: () => {
      throw Error();
    },
  };
  expect(readSoundSetting(store)).toBe(true);
  expect(() => writeSoundSetting(false, store)).not.toThrow();
});
it('loads once after a gesture, plays quietly with the ding delay, and remembers mute', async () => {
  const f = fake(),
    setItem = vi.fn();
  const sound = createSound({
    createContext: f.factory,
    fetchFn: f.fetchFn,
    store: { getItem: () => null, setItem },
  });
  sound.play('place');
  expect(f.ctx.createBufferSource).not.toHaveBeenCalled();
  sound.unlock();
  sound.unlock();
  await flush();
  expect(f.factory).toHaveBeenCalledTimes(1);
  expect(f.fetchFn).toHaveBeenCalledTimes(Object.keys(SOUND_FILES).length);
  sound.play('place');
  expect(f.gain.gain.value).toBe(0.35);
  expect(f.start).toHaveBeenLastCalledWith(3);
  sound.play('ding', 120);
  expect(f.start).toHaveBeenLastCalledWith(3.12);
  sound.setEnabled(false);
  sound.play('remove');
  expect(f.ctx.createBufferSource).toHaveBeenCalledTimes(2);
  expect(setItem).toHaveBeenCalledWith('lerndorf.sound', '0');
  sound.dispose();
  expect(f.ctx.close).toHaveBeenCalled();
});
it('silently handles absent audio, failed fetch, failed decoding and suspended devices', async () => {
  const absent = createSound({ createContext: () => null });
  absent.unlock();
  absent.play('place');
  absent.dispose();
  for (const failure of ['fetch', 'decode', 'suspended', '404']) {
    const f = fake();
    if (failure === 'fetch') f.fetchFn.mockRejectedValue(Error());
    if (failure === 'decode') f.ctx.decodeAudioData.mockRejectedValue(Error());
    if (failure === 'suspended') f.ctx.state = 'suspended';
    if (failure === '404') f.fetchFn.mockResolvedValue({ ok: false });
    const sound = createSound({ createContext: f.factory, fetchFn: f.fetchFn, store: null });
    sound.unlock();
    await flush();
    sound.play('place');
    expect(f.ctx.createBufferSource).not.toHaveBeenCalled();
    sound.dispose();
  }
});

function audioFake() {
  const made: Array<{
    src: string;
    paused: boolean;
    loop: boolean;
    currentTime: number;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
  }> = [];
  const createAudio = (src: string) => {
    const el = {
      src,
      paused: true,
      loop: false,
      preload: '',
      volume: 1,
      currentTime: 0,
      play: vi.fn(() => {
        el.paused = false;
        return Promise.resolve();
      }),
      pause: vi.fn(() => {
        el.paused = true;
      }),
      removeAttribute: vi.fn(),
    };
    made.push(el);
    return el as unknown as HTMLAudioElement;
  };
  return { made, createAudio };
}
function docFake() {
  let listener: (() => void) | null = null;
  return {
    hidden: false,
    addEventListener: (_: string, fn: () => void) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
    fire() {
      listener?.();
    },
  };
}

it('plays the village loop after the first gesture and switches to the quiz loop while held', async () => {
  const f = fake(),
    a = audioFake(),
    doc = docFake();
  const sound = createSound({
    createContext: f.factory,
    fetchFn: f.fetchFn,
    store: null,
    createAudio: a.createAudio,
    doc,
  });
  sound.setMusic('village');
  expect(a.made).toHaveLength(0);
  sound.unlock();
  expect(a.made.map((m) => m.src)).toEqual(['/assets/audio/music/mischief-managed-loop.mp3']);
  expect(a.made[0].loop).toBe(true);
  expect(a.made[0].paused).toBe(false);
  const release = sound.pushMusic('quiz');
  expect(a.made[0].paused).toBe(true);
  expect(a.made[1].src).toContain('quiz-thinking-loop.mp3');
  expect(a.made[1].paused).toBe(false);
  release();
  release();
  expect(a.made[1].paused).toBe(true);
  expect(a.made[0].paused).toBe(false);
  doc.hidden = true;
  doc.fire();
  expect(a.made[0].paused).toBe(true);
  doc.hidden = false;
  doc.fire();
  expect(a.made[0].paused).toBe(false);
  sound.dispose();
  expect(a.made[0].paused).toBe(true);
});

it('keeps the music silent when music or all sounds are switched off, and remembers it', () => {
  const f = fake(),
    a = audioFake(),
    setItem = vi.fn();
  const sound = createSound({
    createContext: f.factory,
    fetchFn: f.fetchFn,
    store: { getItem: () => null, setItem },
    createAudio: a.createAudio,
    doc: docFake(),
  });
  sound.setMusic('village');
  sound.unlock();
  sound.setMusicOn(false);
  expect(a.made[0].paused).toBe(true);
  expect(setItem).toHaveBeenCalledWith('lerndorf.music', '0');
  sound.setMusicOn(true);
  expect(a.made[0].paused).toBe(false);
  sound.setEnabled(false);
  expect(a.made[0].paused).toBe(true);
  expect(readMusicSetting({ getItem: () => '0', setItem() {} })).toBe(false);
  sound.dispose();
});

it('limits the typing sound to the given seconds and exposes the running sound', async () => {
  const f = fake();
  const stop = vi.fn();
  f.ctx.createBufferSource = vi.fn(() => ({ connect: vi.fn(), start: f.start, stop }));
  const sound = createSound({ createContext: f.factory, fetchFn: f.fetchFn, store: null, doc: docFake() });
  expect(activeSound()).toBe(sound);
  sound.unlock();
  await flush();
  const end = sound.playFor('typing', 2);
  expect(f.start).toHaveBeenLastCalledWith(3);
  expect(stop).toHaveBeenLastCalledWith(5);
  end();
  expect(stop).toHaveBeenCalledTimes(2);
  sound.dispose();
  expect(activeSound()).toBe(null);
});

it('pauses the music while the victory fanfare plays and resumes it afterwards', async () => {
  const f = fake(),
    a = audioFake();
  const sources: Array<{ onended: (() => void) | null }> = [];
  Object.assign(f.gain, { disconnect: vi.fn() });
  f.ctx.createBufferSource = vi.fn(() => {
    const src = { connect: vi.fn(), disconnect: vi.fn(), start: f.start, stop: vi.fn(), onended: null };
    sources.push(src);
    return src;
  });
  const sound = createSound({
    createContext: f.factory,
    fetchFn: f.fetchFn,
    store: null,
    createAudio: a.createAudio,
    doc: docFake(),
  });
  sound.setMusic('village');
  sound.unlock();
  await flush();
  expect(SOUND_FILES.victory).toBe('assets/audio/sfx/victory-fanfare.mp3');
  sound.play('correct');
  expect(a.made[0].paused).toBe(false);
  sound.play('victory', 450);
  expect(a.made[0].paused).toBe(true);
  sources.at(-1)?.onended?.();
  expect(a.made[0].paused).toBe(false);
  sound.dispose();
});

it('turns the music down while something is listened to and back up on release', () => {
  const f = fake(),
    a = audioFake();
  const sound = createSound({
    createContext: () => null,
    fetchFn: f.fetchFn,
    store: null,
    createAudio: a.createAudio,
    doc: docFake(),
  });
  sound.setMusic('village');
  sound.unlock();
  const el = a.made[0] as unknown as { volume: number };
  expect(el.volume).toBeCloseTo(0.11);
  const release = sound.quiet();
  expect(el.volume).toBeCloseTo(0.0275);
  release();
  release();
  expect(el.volume).toBeCloseTo(0.11);
  const quiz = sound.pushMusic('quiz');
  expect((a.made[1] as unknown as { volume: number }).volume).toBeCloseTo(0.06);
  quiz();
  sound.dispose();
});

it('pauses the music while hushed and resumes it on release', () => {
  const f = fake(),
    a = audioFake();
  const sound = createSound({
    createContext: () => null,
    fetchFn: f.fetchFn,
    store: null,
    createAudio: a.createAudio,
    doc: docFake(),
  });
  sound.setMusic('village');
  sound.unlock();
  expect(a.made[0].paused).toBe(false);
  const release = sound.hush();
  expect(a.made[0].paused).toBe(true);
  release();
  release();
  expect(a.made[0].paused).toBe(false);
  sound.dispose();
});
