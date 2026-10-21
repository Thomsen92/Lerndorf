// Imports content/daily-quests/<Montag>.json into the database. Run by the GitHub Action
// import-content.yml with the service role key from the secrets. Never run it in the browser.
//   node scripts/import-quests.ts           (from the web folder)
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { isMonday } from '../src/teacher/week.ts';
import { packageToRows, validatePackage, type WeekPackage } from './quests.ts';

export interface QuestRpc {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
}

export interface ImportReport {
  imported: string[];
  failed: Array<{ file: string; errors: string[] }>;
}

const DEFAULT_DIR = new URL('../../content/daily-quests/', import.meta.url);

/** The Monday in a file name like 2026-11-09.json, or null. */
function weekFromFileName(file: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file);
  return m && isMonday(m[1]) ? m[1] : null;
}

export async function importQuestDir(dir: URL, client: QuestRpc): Promise<ImportReport> {
  const report: ImportReport = { imported: [], failed: [] };
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return report;
    throw err;
  }

  for (const file of files) {
    const week = weekFromFileName(file);
    const fail = async (errors: string[]): Promise<void> => {
      report.failed.push({ file, errors });
      if (week) {
        // best effort: the teacher sees the errors in the app; a failure here is not fatal
        await client.rpc('record_quest_import', { p_week: week, p_ok: false, p_errors: errors });
      }
    };

    let json: unknown;
    try {
      json = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    } catch (err) {
      await fail([`kein gültiges JSON (${(err as Error).message})`]);
      continue;
    }
    const errors = validatePackage(json, file);
    if (errors.length) {
      await fail(errors);
      continue;
    }
    const pkg = json as WeekPackage;
    const { quests, solutions } = packageToRows(pkg);
    const { error } = await client.rpc('import_quest_week', {
      p_week: pkg.week,
      p_holiday: 'holiday' in pkg,
      p_quests: quests,
      p_solutions: solutions,
    });
    if (error) report.failed.push({ file, errors: [error.message] });
    else report.imported.push(file);
  }
  return report;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.');
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const report = await importQuestDir(DEFAULT_DIR, {
    rpc: async (fn, args) => {
      const { error } = await admin.rpc(fn, args);
      return { error };
    },
  });

  if (report.imported.length === 0 && report.failed.length === 0) {
    console.log('Keine Quest-Dateien gefunden, nichts zu importieren.');
  }
  for (const f of report.imported) console.log(`${f}: importiert`);
  for (const f of report.failed) for (const e of f.errors) console.error(`${f.file}: ${e}`);
  if (report.failed.length) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
