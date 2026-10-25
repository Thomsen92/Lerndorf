import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('ships small MP3 sounds and one transparent 128px smoke texture', () => {
  for (const name of ['place', 'ding', 'remove']) {
    const bytes = readFileSync(new URL(`../../public/assets/kenney/fx/${name}.mp3`, import.meta.url));
    expect(bytes.length).toBeLessThan(40000);
    expect(bytes.subarray(0, 3).toString() === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224)).toBe(
      true,
    );
  }
  const png = readFileSync(new URL('../../public/assets/kenney/fx/puff.png', import.meta.url));
  expect(png.length).toBeLessThan(30000);
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBe(128);
  expect(png.readUInt32BE(20)).toBe(128);
  expect(png[25]).toBe(6);
});
