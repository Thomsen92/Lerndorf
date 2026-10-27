import { expect, it, vi } from 'vitest';
import { statSync } from 'node:fs';
import * as THREE from 'three';
import { createSirByte } from '../../src/mascot/vendor/sir-byte.mjs';
import { createMascot } from '../../src/mascot/sirByte';
import { CLIPS, LINES, VOICE, bubbleSeconds } from '../../src/mascot/lines';

function fakeVoice(played: string[] = []) {
  return {
    play: vi.fn(async () => 3.4),
    playFile: vi.fn(async (file: string) => {
      played.push(file);
      return 3.4;
    }),
    stop: vi.fn(),
    frame: () => ({ speaking: false, speechTime: 0, speechDuration: 0, speechLevel: 0 }),
    unlock: vi.fn(),
    dispose: vi.fn(),
  };
}

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
  const voice = fakeVoice();
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

it('plays the matching recording for a tutorial line', async () => {
  const played: string[] = [];
  const byte = createMascot({ voice: fakeVoice(played), quality: 'low' });
  const say = await byte.say('hello');
  expect(played).toEqual(['hello']);
  expect(say.text).toBe(LINES.hello);
  expect(say.voiced).toBe(true);
  expect(say.seconds).toBeCloseTo(4.9);
  byte.dispose();
});

it('ships every tutorial clip below the size limit', () => {
  const files = new Set(Object.values(CLIPS));
  expect(files.size).toBe(12);
  for (const file of files) {
    const size = statSync(
      new URL(`../../public/assets/sir-byte/voice/${file}.mp3`, import.meta.url),
    ).size;
    expect(size, file).toBeGreaterThan(5_000);
    expect(size, file).toBeLessThan(120_000);
  }
});

it('lifts the market materials only when asked', () => {
  const sums = (byte: ReturnType<typeof createMascot>) => {
    let colour = 0,
      glow = 0;
    byte.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        colour += o.material.color.r + o.material.color.g + o.material.color.b;
        glow += o.material.emissive.r + o.material.emissive.g + o.material.emissive.b;
      }
    });
    return { colour, glow };
  };
  const plain = sums(createMascot({ voice: fakeVoice(), quality: 'low' }));
  const lifted = sums(createMascot({ voice: fakeVoice(), quality: 'low', lift: true }));
  expect(lifted.colour).toBeGreaterThan(plain.colour * 1.05);
  expect(lifted.glow).toBeGreaterThan(plain.glow);
});
