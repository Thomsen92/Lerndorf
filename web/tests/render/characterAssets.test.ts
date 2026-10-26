import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CLIP_NAMES, CHARACTER_KINDS } from '../../src/render/character';
it('uses the new standard boy with its happy jumping celebration', () => {
  expect(CLIP_NAMES.boy.dances).toEqual(['froehliches springen hopsen']);
});
it('ships the rig and every animation requested by the character loader', () => {
  for (const kind of CHARACTER_KINDS) {
    const b = readFileSync(new URL(`../../public/assets/characters/${kind}.glb`, import.meta.url));
    const gltf = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as {
      skins: unknown[];
      animations: Array<{ name: string }>;
    };
    const names = gltf.animations.map((a) => a.name),
      clips = CLIP_NAMES[kind];
    expect(gltf.skins.length).toBeGreaterThan(0);
    for (const clip of [clips.walk, clips.catwalk, ...clips.dances]) expect(names).toContain(clip);
  }
});
