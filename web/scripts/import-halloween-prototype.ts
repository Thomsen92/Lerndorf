// `npm run import:collection`: copies only the runtime assets of the Halloween collection from
// Prototyp/marktplatz into web/public/assets/collection and writes the validated runtime
// catalogue plus an idempotent import manifest (plan package 1).
//
// The prototype stays the single content source. This script never builds models or images.
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assetPaths, validateCollectionCatalog } from '../src/collection/catalog.ts';
import type { CollectionCatalog } from '../src/collection/types.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = join(ROOT, 'Prototyp/marktplatz/assets/collection');
const TARGET = join(ROOT, 'web/public/assets/collection');
const BASELINE = join(ROOT, 'Prototyp/marktplatz/tools/protected-baseline.json');

function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function checkProtectedBaseline(): void {
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, string>;
  const changed: string[] = [];
  for (const [path, expected] of Object.entries(baseline)) {
    const file = join(ROOT, path);
    if (!existsSync(file)) {
      changed.push(`${path} is missing`);
      continue;
    }
    // The licence file legitimately grows when new CC0 sources arrive; only its presence and
    // non-empty content are fixed. The prototype and the style guide must stay byte-identical.
    if (path === 'blender/sources/LICENSES.md') {
      if (!readFileSync(file, 'utf8').trim()) changed.push(`${path} is empty`);
      continue;
    }
    const actual = sha256(readFileSync(file));
    if (actual !== expected) changed.push(`${path} changed (${actual})`);
  }
  if (changed.length) throw new Error(`protected files changed:\n${changed.join('\n')}`);
}

function writeIfChanged(file: string, data: Buffer): void {
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file) && readFileSync(file).equals(data)) return;
  writeFileSync(file, data);
}

function main(): void {
  checkProtectedBaseline();
  const sourceCatalogPath = join(SOURCE, 'catalog.json');
  const raw = JSON.parse(readFileSync(sourceCatalogPath, 'utf8')) as Record<string, unknown>;
  const catalog = validateCollectionCatalog(raw, { requireContentVersion: false });
  const canonical = {
    schemaVersion: catalog.schemaVersion,
    season: catalog.season,
    name: catalog.name,
    license: catalog.license,
    cards: catalog.cards,
    archivedCards: catalog.archivedCards,
    rarityOrder: catalog.rarityOrder,
    almanacCover: catalog.almanacCover,
    bookStudy: catalog.bookStudy,
    rarityPolicy: catalog.rarityPolicy,
    acquisitionPolicy: catalog.acquisitionPolicy,
    passCardRewards: catalog.passCardRewards,
  };
  const contentVersion = sha256(stable(canonical));
  const runtime: CollectionCatalog = { ...canonical, contentVersion };
  validateCollectionCatalog(runtime);

  const files = assetPaths(catalog);
  const manifestEntries: Array<{ path: string; sha256: string; bytes: number }> = [];
  for (const path of files) {
    const source = join(SOURCE, path);
    if (!existsSync(source) || !statSync(source).isFile())
      throw new Error(`missing prototype asset: ${relative(ROOT, source)}`);
    const data = readFileSync(source);
    writeIfChanged(join(TARGET, path), data);
    manifestEntries.push({ path, sha256: sha256(data), bytes: data.length });
  }
  for (const doc of ['LICENSES.md', 'LITERARY_SOURCES.md']) {
    const source = join(SOURCE, doc);
    if (existsSync(source)) {
      const data = readFileSync(source);
      writeIfChanged(join(TARGET, doc), data);
      manifestEntries.push({ path: doc, sha256: sha256(data), bytes: data.length });
    }
  }

  // Remove files that a previous run copied but the current catalogue no longer needs.
  const manifestPath = join(TARGET, 'import-manifest.json');
  if (existsSync(manifestPath)) {
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      files?: Array<{ path: string }>;
    };
    const keep = new Set(manifestEntries.map((entry) => entry.path));
    for (const entry of previous.files ?? []) {
      if (!keep.has(entry.path)) rmSync(join(TARGET, entry.path), { force: true });
    }
  }

  writeIfChanged(
    join(TARGET, 'catalog.json'),
    Buffer.from(`${JSON.stringify(runtime, null, 2)}\n`),
  );
  writeIfChanged(
    manifestPath,
    Buffer.from(
      `${JSON.stringify(
        {
          source: 'Prototyp/marktplatz/assets/collection',
          contentVersion,
          files: manifestEntries.sort((a, b) => a.path.localeCompare(b.path)),
        },
        null,
        2,
      )}\n`,
    ),
  );

  const bytes = manifestEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(
    `collection: ${runtime.cards.length} cards, ${manifestEntries.length} files, ` +
      `${(bytes / 1024 / 1024).toFixed(1)} MB, content ${contentVersion.slice(0, 12)}`,
  );
}

main();
