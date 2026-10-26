import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLIP_NAMES } from '../../src/render/character';

describe('modular animated wardrobe assets', () => {
  for (const kind of ['boy', 'girl'] as const)
    it(`${kind} retains animation, rig and color metadata`, () => {
      const b = readFileSync(
        new URL(`../../public/assets/characters/wardrobe/${kind}/character.glb`, import.meta.url),
      );
      const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
      expect(j.skins[0].joints).toHaveLength(65);
      for (const name of [CLIP_NAMES[kind].walk, CLIP_NAMES[kind].catwalk, ...CLIP_NAMES[kind].dances])
        expect(j.animations.map((a: { name: string }) => a.name)).toContain(name);
      expect(
        j.materials.some(
          (m: { extras?: { customizationChannel?: string } }) => m.extras?.customizationChannel,
        ),
      ).toBe(true);
      if (kind === 'boy')
        expect(j.nodes.some((n: { name?: string }) => n.name === 'tripo_part_0_short')).toBe(true);
    });
});
