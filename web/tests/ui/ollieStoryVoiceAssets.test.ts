import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
it('delivers twenty active English story clips with opaque names and verified audio hashes', () => {
  const story = JSON.parse(
    readFileSync(new URL('../../../content/quests/ollie-roadtrip.json', import.meta.url), 'utf8'),
  );
  const manifest = JSON.parse(
    readFileSync(new URL('../../../content/quests/ollie-story-audio.json', import.meta.url), 'utf8'),
  );
  const folder = new URL('../../public/assets/shopkeeper/story-voice/', import.meta.url);
  const expected = [
    { key: 'intro', text: story.intro },
    { key: 'wrong', text: story.wrong },
    ...story.questions.flatMap((q: { id: string; narrative: string; reply: string }) => [
      { key: `${q.id}:question`, text: q.narrative },
      { key: `${q.id}:reply`, text: q.reply },
    ]),
  ];
  expect(manifest.clips).toHaveLength(21);
  expect(manifest.voiceId).toBe('IKne3meq5aSn9XLyUdCD');
  for (const job of expected) {
    const file = `${sha(`ollie-roadtrip-${job.key === 'intro' ? 'v2' : 'v1'}:${job.key}`).slice(0, 24)}.mp3`;
    const clip = manifest.clips.find((c: { file: string }) => c.file === file);
    expect(clip.text).toBe(job.text);
    expect(clip.language).toBe('en');
    const bytes = readFileSync(new URL(file, folder));
    expect(bytes.length).toBeGreaterThan(1500);
    expect(bytes.length).toBe(clip.bytes);
    expect(sha(bytes)).toBe(clip.sha256);
    expect(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff).toBe(true);
  }
  expect(readdirSync(folder).filter((name) => !name.endsWith('.mp3'))).toEqual(['README.md']);
  expect(manifest.charactersGenerated).toBe(
    manifest.clips.reduce((sum: number, clip: { text: string }) => sum + clip.text.length, 0),
  );
  expect(manifest.attempts).toHaveLength(21);
  expect(manifest.attempts.every((a: { status: string }) => a.status === 'delivered')).toBe(true);
});

it('retains the original fourteen deliveries and caps the explicitly approved extension', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../../../content/quests/ollie-story-audio.json', import.meta.url), 'utf8'),
  );
  expect(manifest.clips.slice(0, 14).reduce((n: number, c: { text: string }) => n + c.text.length, 0)).toBe(
    1646,
  );
  expect(manifest.clips.slice(14)).toHaveLength(7);
  const originalIntro = manifest.clips.find(
    (c: { file: string }) => c.file === 'c491a688ea58073852c75dec.mp3',
  );
  expect(originalIntro.text).toContain('six missing words');
  expect(
    sha(
      readFileSync(
        new URL('../../public/assets/shopkeeper/story-voice/c491a688ea58073852c75dec.mp3', import.meta.url),
      ),
    ),
  ).toBe('0770802217a17053565d00d79ed3a9f3bcbb8e568332bd549f18216da8f26168');
  for (const clip of manifest.clips) {
    expect(
      sha(readFileSync(new URL(`../../public/assets/shopkeeper/story-voice/${clip.file}`, import.meta.url))),
    ).toBe(clip.sha256);
  }
  expect(new Set(manifest.clips.map((c: { file: string }) => c.file)).size).toBe(21);
  expect(
    manifest.clips.slice(14).reduce((n: number, c: { text: string }) => n + c.text.length, 0),
  ).toBeLessThanOrEqual(1500);
  expect(manifest.charactersGenerated).toBeLessThanOrEqual(4000);
});
