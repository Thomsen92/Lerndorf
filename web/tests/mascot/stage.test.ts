// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { createCompanion } from '../../src/mascot/mascotStage';
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
  expect(byte.el.textContent).toContain('Answer five easy questions.');
  await byte.answer('q1', false);
  expect(byte.el.textContent).toContain('Nearly. Have another go!');
  await byte.answer('q1', false);
  expect(byte.el.textContent).toContain("Take your time. You've got this.");
  await byte.answer('q2', false);
  expect(byte.el.textContent).toContain('Nearly. Have another go!');
  byte.dispose();
  expect(document.querySelector('.byte-stage')).toBeNull();
});
