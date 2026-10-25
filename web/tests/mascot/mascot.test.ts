import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSirByte } from '../../src/mascot/vendor/sir-byte.mjs';
import { createMascot } from '../../src/mascot/sirByte';
import { VOICE, bubbleSeconds } from '../../src/mascot/lines';

it('keeps the original robot and animations compatible with the pinned Three version', () => {
  const byte = createSirByte();
  expect(byte.triangles).toBeGreaterThan(26000);
  expect(byte.triangles).toBeLessThan(28000);
  for (let i = 0; i < 200; i++) byte.update(1 / 60);
  byte.pointAtTask(new THREE.Vector3(3, 1, 2));
  byte.update(1 / 60);
  expect(new THREE.Box3().setFromObject(byte.root).isEmpty()).toBe(false);
});

it('encourages per quest, rejects mocking reactions and disposes its resources', async () => {
  const voice = {
    play: vi.fn(async () => 3.4),
    stop: vi.fn(),
    frame: () => ({ speaking: false, speechTime: 0, speechDuration: 0, speechLevel: 0 }),
    unlock: vi.fn(),
    dispose: vi.fn(),
  };
  const byte = createMascot({ voice });
  expect((await byte.feedback('q1', false)).text).toBe(VOICE.cheeky.line);
  expect((await byte.feedback('q1', false)).text).toBe(VOICE.support.line);
  expect((await byte.feedback('q2', false)).text).toBe(VOICE.cheeky.line);
  expect((await byte.feedback('q1', true)).seconds).toBeCloseTo(4.9);
  await expect(byte.react('dry' as never)).rejects.toThrow();
  byte.setQuality('low');
  byte.root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      expect(o.castShadow).toBe(false);
      expect(o.userData.kind).toBe('byte');
      expect(o.material).not.toBeInstanceOf(THREE.MeshPhysicalMaterial);
    }
  });
  expect(bubbleSeconds('x'.repeat(200), null)).toBe(8);
  byte.dispose();
  expect(voice.dispose).toHaveBeenCalledOnce();
});
