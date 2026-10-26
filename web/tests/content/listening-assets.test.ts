import { readdirSync, readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { packageToRows, validatePackage, type WeekPackage } from '../../scripts/quests';
import { missingListening, QUEST_DIR, PUBLIC_DIR, TUTORIAL_LISTENING } from '../../scripts/listening';
import { listeningPath } from '../../src/quests/listening';
it('ships nonempty MP3s for every listening quest on disk and the tutorial', () => {
  const paths = new Set([listeningPath(TUTORIAL_LISTENING)]);
  for (const name of readdirSync(QUEST_DIR).filter((f) => f.endsWith('.json'))) {
    const pkg = JSON.parse(readFileSync(new URL(name, QUEST_DIR), 'utf8')) as WeekPackage;
    expect(validatePackage(pkg, name)).toEqual([]);
    const { quests } = packageToRows(pkg);
    expect(missingListening(quests), name).toEqual([]);
    for (const q of quests) if (q.type === 'listening') paths.add(listeningPath(String(q.data.speak)));
  }
  for (const path of paths) {
    const bytes = readFileSync(new URL(path, PUBLIC_DIR));
    expect(bytes.length, path).toBeGreaterThan(1000);
    expect(
      bytes.subarray(0, 4096).some((byte, i) => byte === 0xff && (bytes[i + 1] & 0xe0) === 0xe0),
      path,
    ).toBe(true);
  }
});
