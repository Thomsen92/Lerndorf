// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createVoicePlayer } from '../../src/mascot/voice';

it.each([undefined, 'assets/shopkeeper/voice'])(
  'requires a gesture, cancels late audio and supports directory %s',
  async (clipDirectory) => {
    const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
    const ctx = {
      currentTime: 1,
      state: 'running',
      destination: {},
      resume: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
      createGain: () => ({ gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() }),
      createAnalyser: () => ({
        fftSize: 32,
        connect: vi.fn(),
        disconnect: vi.fn(),
        getByteTimeDomainData: vi.fn(),
      }),
      decodeAudioData: async () => ({ duration: 3 }),
      createBufferSource: () => {
        const s = {
          start: vi.fn(),
          stop: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          buffer: null,
          onended: null,
        };
        sources.push(s);
        return s;
      },
    };
    const sound = { enabled: true };
    const fetchFn = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
    const voice = createVoicePlayer({
      sound,
      createContext: () => ctx as unknown as AudioContext,
      fetchFn: fetchFn as unknown as typeof fetch,
      autoUnlock: false,
      clipDirectory,
    });
    expect(await voice.play('idle')).toBeNull();
    voice.unlock();
    expect(await voice.play('idle')).toBe(3);
    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining(`${clipDirectory ?? 'assets/sir-byte/voice'}/`),
    );
    expect(voice.frame().speaking).toBe(true);
    await voice.play('celebrate');
    expect(sources[0].stop).toHaveBeenCalled();
    sound.enabled = false;
    expect(voice.frame().speaking).toBe(false);
    expect(await voice.play('idle')).toBeNull();
    sound.enabled = true;
    let finish!: (value: unknown) => void;
    fetchFn.mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }) as never,
    );
    const pending = voice.play('support');
    voice.stop();
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    expect(await pending).toBeNull();
    expect(sources).toHaveLength(2);
    voice.dispose();
  },
);
