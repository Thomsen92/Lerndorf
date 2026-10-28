import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { setLocale } from '../../src/i18n';
import { OLLIE_LINE_IDS, ollieLine } from '../../src/shopkeeper/lines';

it('ships all twelve real MP3s matching visible dialogue and their delivery hashes', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../public/assets/shopkeeper/voice/manifest.json', import.meta.url), 'utf8'),
  ) as { clips: Array<{ file: string; text: string; bytes: number; sha256: string }> };
  expect(manifest.clips).toHaveLength(12);
  try {
    for (const language of ['en', 'de'] as const) {
      setLocale(language);
      for (const id of OLLIE_LINE_IDS) {
        const clip = manifest.clips.find((c) => c.file === `${language}-${id}.mp3`)!;
        expect(clip).toBeDefined();
        expect(clip.text).toBe(ollieLine(id));
        const bytes = readFileSync(
          new URL(`../../public/assets/shopkeeper/voice/${clip.file}`, import.meta.url),
        );
        expect(bytes.length).toBeGreaterThan(1500);
        expect(bytes.length).toBe(clip.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(clip.sha256);
        expect(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff).toBe(true);
      }
    }
  } finally {
    setLocale('de');
  }
});
