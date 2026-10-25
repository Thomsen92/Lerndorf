// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createSound, readSoundSetting, writeSoundSetting } from '../../src/ui/sound';
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
  expect(f.fetchFn).toHaveBeenCalledTimes(3);
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
