// Migration guard (plan 2026-10-27-beta-betrieb, B2). Runs in `npm test` and in the release.
//
// 1. Migrations that are live are frozen: supabase/migrations.lock holds their SHA-256; changing one
//    would be skipped silently by `db push`, so test and live would drift apart.
// 2. New migrations must not take anything away: no dropped tables, columns or schemas, no
//    truncate, no delete without where, no type changes or renames, no dropped function that is
//    not created again in the same file. A line `-- destructive-ok: <reason>` allows it on purpose;
//    the release shows that line before the approval.
// 3. Numbers run 0001, 0002, … without gaps or doubles.
//
// `node scripts/check-migrations.ts` checks; `--update-lock` freezes every migration (the release
// does this after `db push`).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Migration {
  file: string;
  sql: string;
}

export interface GuardResult {
  problems: string[];
  /** New (not yet frozen) migrations and their `destructive-ok` reasons. */
  fresh: Array<{ file: string; allowed: string[] }>;
}

const RULES: Array<[RegExp, string]> = [
  [/\bdrop\s+table\b/i, 'löscht eine Tabelle (drop table)'],
  [/\balter\s+table\b[^;]*\bdrop\s+column\b/i, 'löscht eine Spalte (drop column)'],
  [/\bdrop\s+schema\b/i, 'löscht ein Schema (drop schema)'],
  [/\btruncate\b/i, 'leert eine Tabelle (truncate)'],
  [/\bdelete\s+from\s+[\w."]+\s*;/i, 'löscht Zeilen ohne where (delete)'],
  [/\balter\s+column\s+[\w"]+\s+(?:set\s+data\s+)?type\b/i, 'ändert einen Spaltentyp (alter column … type)'],
  [/\balter\s+table\s+[\w."]+\s+rename\b/i, 'benennt eine Tabelle oder Spalte um (rename)'],
];

/** Line endings differ between Windows checkouts and CI; the hash must not. */
export function hashSql(sql: string): string {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
}

/**
 * SQL without comments and without function bodies (`as $$ … $$` runs when called, not when
 * migrating), so the rules see what the migration itself executes. DO blocks stay in.
 */
function statements(sql: string): string {
  return sql
    .replace(/(\bas\s+)\$\$[\s\S]*?\$\$/gi, '$1$$$$')
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

export function checkMigrations(migrations: Migration[], lock: Record<string, string>): GuardResult {
  const problems: string[] = [];
  const fresh: GuardResult['fresh'] = [];
  const sorted = [...migrations].sort((a, b) => a.file.localeCompare(b.file));

  sorted.forEach((m, index) => {
    const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(m.file);
    if (!match) {
      problems.push(`${m.file}: Name passt nicht zu NNNN_name.sql`);
      return;
    }
    if (Number(match[1]) !== index + 1) problems.push(`${m.file}: erwartet wird Nummer ${String(index + 1).padStart(4, '0')}`);
  });
  for (const file of Object.keys(lock)) {
    if (!migrations.some((m) => m.file === file)) problems.push(`${file}: eingespielte Migration fehlt`);
  }

  for (const m of sorted) {
    const locked = lock[m.file];
    if (locked) {
      if (locked !== hashSql(m.sql)) problems.push(`${m.file}: ist schon live und wurde geändert`);
      continue;
    }
    const allowed = [...m.sql.matchAll(/--\s*destructive-ok:\s*(.+)/gi)].map((x) => x[1].trim());
    fresh.push({ file: m.file, allowed });
    if (allowed.length > 0) continue;
    const body = statements(m.sql);
    for (const [rule, text] of RULES) if (rule.test(body)) problems.push(`${m.file}: ${text}`);
    for (const drop of body.matchAll(/\bdrop\s+function\s+(?:if\s+exists\s+)?([\w."]+)/gi)) {
      const name = drop[1].replace(/"/g, '').replace(/^public\./, '');
      const recreated = new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public\\.)?"?${name}"?\\s*\\(`, 'i');
      if (!recreated.test(body)) problems.push(`${m.file}: löscht die Funktion ${name}, ohne sie neu anzulegen`);
    }
  }
  return { problems, fresh };
}

const ROOT = new URL('../../supabase/', import.meta.url);

export function readMigrations(dir: URL = new URL('migrations/', ROOT)): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .map((file) => ({ file, sql: readFileSync(new URL(file, dir), 'utf8') }));
}

export function readLock(file: URL = new URL('migrations.lock', ROOT)): Record<string, string> {
  return JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const migrations = readMigrations();
  if (process.argv.includes('--update-lock')) {
    const lock = Object.fromEntries(
      [...migrations].sort((a, b) => a.file.localeCompare(b.file)).map((m) => [m.file, hashSql(m.sql)]),
    );
    writeFileSync(new URL('migrations.lock', ROOT), `${JSON.stringify(lock, null, 2)}\n`);
    console.log(`migrations.lock: ${migrations.length} Migrationen eingefroren`);
  } else {
    const result = checkMigrations(migrations, readLock());
    for (const f of result.fresh) {
      console.log(`neu: ${f.file}${f.allowed.length ? ` – destructive-ok: ${f.allowed.join('; ')}` : ''}`);
    }
    for (const p of result.problems) console.error(`FEHLER ${p}`);
    process.exit(result.problems.length > 0 ? 1 : 0);
  }
}
