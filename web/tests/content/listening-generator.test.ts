import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { generateListening } from '../../scripts/generate-listening';
import { listeningPath } from '../../src/quests/listening';
let dir: string, weeksDir: URL, publicDir: URL;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'listening-'));
  mkdirSync(join(dir, 'weeks'));
  mkdirSync(join(dir, 'public'));
  weeksDir = pathToFileURL(join(dir, 'weeks') + '/');
  publicDir = pathToFileURL(join(dir, 'public') + '/');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
function source() {
  writeFileSync(
    new URL('2026-11-09.json', weeksDir),
    JSON.stringify({
      week: '2026-11-09',
      days: [
        {
          quests: [
            { type: 'listening', speak: 'Hello!' },
            { type: 'listening', speak: 'Hello!' },
          ],
        },
      ],
    }),
  );
}
it('deduplicates texts, skips existing audio and writes files atomically', () => {
  source();
  const run = vi.fn((_text: string, file: string) => writeFileSync(file, 'ID3audio'));
  const opts = { weeksDir, publicDir, run, extraTexts: [] };
  expect(generateListening(opts)).toEqual({ created: 1, skipped: 0 });
  expect(generateListening(opts)).toEqual({ created: 0, skipped: 1 });
  expect(run).toHaveBeenCalledTimes(1);
  expect(existsSync(new URL(listeningPath('Hello!'), publicDir))).toBe(true);
});
it('removes partial files after failure and retries cleanly', () => {
  source();
  const opts = { weeksDir, publicDir, extraTexts: [] };
  expect(() =>
    generateListening({
      ...opts,
      run: (_t: string, file: string) => {
        writeFileSync(file, 'partial');
        throw Error('network');
      },
    }),
  ).toThrow(/network/);
  expect(existsSync(new URL(listeningPath('Hello!'), publicDir))).toBe(false);
  expect(readdirSync(fileURLToPath(new URL('assets/listening/', publicDir)))).toEqual([]);
  expect(
    generateListening({ ...opts, run: (_t: string, file: string) => writeFileSync(file, 'ID3audio') }),
  ).toEqual({ created: 1, skipped: 0 });
});
it('rejects empty generated files and malformed listening text', () => {
  source();
  expect(() =>
    generateListening({
      weeksDir,
      publicDir,
      extraTexts: [],
      run: (_t: string, file: string) => writeFileSync(file, ''),
    }),
  ).toThrow(/leer/);
  writeFileSync(
    new URL('broken.json', weeksDir),
    JSON.stringify({ days: [{ quests: [{ type: 'listening', speak: null }] }] }),
  );
  expect(() => generateListening({ weeksDir, publicDir, extraTexts: [], run: vi.fn() })).toThrow(/speak/);
});
