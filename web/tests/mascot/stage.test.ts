// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { createCompanion } from '../../src/mascot/mascotStage';
import { createSound } from '../../src/ui/sound';
it('varies consecutive successful answers instead of repeating Splendid', async () => {
  const byte = createCompanion({ createRenderer: () => null });
  try {
    const phrases: string[] = [];
    for (let i = 0; i < 8; i++) {
      await byte.answer(`praise-${i}`, true);
      phrases.push(byte.el.querySelector('[role=status]')!.textContent!);
    }
    expect(new Set(phrases).size).toBe(8);
  } finally {
    byte.dispose();
  }
});
it('does not queue an old all-done line after a newer listening action', async () => {
  vi.useFakeTimers();
  const byte = createCompanion({ createRenderer: () => null });
  try {
    const result = byte.answer('last', true, true);
    byte.listen();
    await result;
    await vi.advanceTimersByTimeAsync(7000);
    expect(byte.el.textContent).not.toContain("That's all for today.");
    expect(byte.el.textContent).not.toContain('Rather impressive.');
  } finally {
    byte.dispose();
    vi.useRealTimers();
  }
});
it('releases the renderer and context exactly once when closed', () => {
  const renderer = { dispose: vi.fn(), forceContextLoss: vi.fn() };
  const byte = createCompanion({ createRenderer: () => renderer as unknown as THREE.WebGLRenderer });
  byte.dispose();
  byte.dispose();
  expect(renderer.dispose).toHaveBeenCalledOnce();
  expect(renderer.forceContextLoss).toHaveBeenCalledOnce();
});
it('keeps English feedback usable without WebGL and counts mistakes per question', async () => {
  const byte = createCompanion({ createRenderer: () => null });
  document.body.append(byte.el);
  expect(byte.el.querySelector('img')?.alt).toBe('Sir Byte');
  byte.say('quiz');
  await vi.waitFor(() => expect(byte.el.textContent).toContain('Three little questions.'));
  await byte.answer('q1', false);
  expect(byte.el.textContent).toContain('Nearly. Have another go!');
  await byte.answer('q1', false);
  expect(byte.el.textContent).toContain("Take your time. You've got this.");
  await byte.answer('q2', false);
  expect(byte.el.textContent).toContain('Nearly. Have another go!');
  byte.dispose();
  expect(document.querySelector('.byte-stage')).toBeNull();
});

it('plays the answer sounds and the quiz loop only while Sir Byte keeps the quiz company', async () => {
  const made: Array<{ src: string; paused: boolean }> = [];
  const createAudio = (src: string) => {
    const el = {
      src,
      paused: true,
      loop: false,
      currentTime: 0,
      play: () => {
        el.paused = false;
        return Promise.resolve();
      },
      pause: () => {
        el.paused = true;
      },
      removeAttribute: () => undefined,
    };
    made.push(el);
    return el as unknown as HTMLAudioElement;
  };
  const doc = { hidden: false, addEventListener: () => undefined, removeEventListener: () => undefined };
  const sound = createSound({ createContext: () => null, store: null, createAudio, doc });
  const play = vi.spyOn(sound, 'play');
  sound.setMusic('village');
  sound.unlock();
  const village = made[0];
  expect(village.paused).toBe(false);
  const byte = createCompanion({ createRenderer: () => null });
  const quiz = made.find((m) => m.src.includes('quiz-thinking-loop'))!;
  expect(quiz.paused).toBe(false);
  expect(village.paused).toBe(true);
  await byte.answer('a', false);
  await byte.answer('a', true);
  expect(play.mock.calls.map((c) => c[0]).filter((n) => n !== 'blip')).toEqual(['wrong', 'correct']);
  byte.dispose();
  expect(quiz.paused).toBe(true);
  expect(village.paused).toBe(false);
  sound.dispose();
});
