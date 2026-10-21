import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadVoices, pickEnglishVoice, speakEnglish } from '../../src/quests/speech';

const v = (lang: string, name = lang) => ({ lang, name });

describe('pickEnglishVoice', () => {
  it('prefers en-GB, then any English', () => {
    expect(pickEnglishVoice([v('de-DE'), v('en-US'), v('en-GB')])?.lang).toBe('en-GB');
    expect(pickEnglishVoice([v('de-DE'), v('en-US')])?.lang).toBe('en-US');
  });
  it('accepts the Android spelling en_GB', () => {
    expect(pickEnglishVoice([v('en-US'), v('en_GB')])?.lang).toBe('en_GB');
  });
  it('returns null without English', () => {
    expect(pickEnglishVoice([v('de-DE')])).toBeNull();
    expect(pickEnglishVoice([])).toBeNull();
  });
});

function fakeSynth(voices: Array<{ lang: string; name: string }>) {
  const listeners: Array<() => void> = [];
  const synth = {
    getVoices: vi.fn(() => voices),
    cancel: vi.fn(),
    speak: vi.fn(),
    addEventListener: vi.fn((_: string, f: () => void) => listeners.push(f)),
    removeEventListener: vi.fn(),
  };
  return { synth: synth as unknown as SpeechSynthesis, raw: synth, listeners };
}

beforeEach(() => {
  class FakeUtterance {
    text: string;
    voice: unknown = null;
    lang = '';
    rate = 1;
    constructor(text: string) {
      this.text = text;
    }
  }
  (globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = FakeUtterance;
});

describe('loadVoices', () => {
  it('resolves immediately when voices exist', async () => {
    const { synth } = fakeSynth([v('en-GB')]);
    expect(await loadVoices(synth)).toHaveLength(1);
  });
  it('waits for voiceschanged', async () => {
    const voices: Array<{ lang: string; name: string }> = [];
    const { synth, listeners } = fakeSynth(voices);
    const p = loadVoices(synth, 1000);
    voices.push(v('en-US'));
    listeners.forEach((f) => f());
    expect(await p).toHaveLength(1);
  });
  it('gives up after the timeout', async () => {
    const { synth } = fakeSynth([]);
    expect(await loadVoices(synth, 10)).toEqual([]);
  });
});

describe('speakEnglish', () => {
  it('returns false without a synth', async () => {
    expect(await speakEnglish('Hi', undefined)).toBe(false);
  });
  it('returns false with only German voices', async () => {
    const { synth, raw } = fakeSynth([v('de-DE')]);
    expect(await speakEnglish('Hi', synth)).toBe(false);
    expect(raw.speak).not.toHaveBeenCalled();
  });
  it('speaks with the English voice, normalised lang and rate 0.9', async () => {
    const { synth, raw } = fakeSynth([v('de-DE'), v('en_GB')]);
    expect(await speakEnglish('Hi', synth)).toBe(true);
    expect(raw.cancel).toHaveBeenCalledTimes(1);
    expect(raw.speak).toHaveBeenCalledTimes(1);
    const u = raw.speak.mock.calls[0][0] as { lang: string; rate: number; text: string };
    expect(u.lang).toBe('en-GB');
    expect(u.rate).toBe(0.9);
    expect(u.text).toBe('Hi');
  });
  it('returns false when speak throws', async () => {
    const { synth, raw } = fakeSynth([v('en-US')]);
    raw.speak.mockImplementation(() => {
      throw new Error('x');
    });
    expect(await speakEnglish('Hi', synth)).toBe(false);
  });
});
