// Imports content/tasks/<Montag>.json into the database (SPEC §9). Run by the GitHub Action
// import-content.yml with the service role key from the secrets. Never run it in the browser.
//   node scripts/import-content.ts           (from the web folder)
import { readdirSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { toRows, validateWeek, type WeekSpec } from './content.ts';

const CONTENT_DIR = new URL('../../content/tasks/', import.meta.url);

function loadWeeks(): WeekSpec[] {
  const files = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const weeks: WeekSpec[] = [];
  let failed = false;
  for (const file of files) {
    const text = readFileSync(new URL(file, CONTENT_DIR), 'utf8');
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error(`${file}: kein gültiges JSON (${(err as Error).message})`);
      failed = true;
      continue;
    }
    const errors = validateWeek(json);
    const week = (json as WeekSpec).week;
    if (week && file !== `${week}.json`) errors.push(`Dateiname muss ${week}.json sein`);
    if (errors.length) {
      failed = true;
      for (const e of errors) console.error(`${file}: ${e}`);
      continue;
    }
    weeks.push(json as WeekSpec);
  }
  if (failed) process.exit(1);
  return weeks;
}

async function main(): Promise<void> {
  const weeks = loadWeeks();
  if (weeks.length === 0) {
    console.log('Keine Wochen-Dateien gefunden, nichts zu importieren.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.');
    process.exit(1);
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });

  for (const week of weeks) {
    const { tasks, solutions } = toRows(week);
    // tasks first: task_solutions references them
    const t = await admin.from('tasks').upsert(tasks, { onConflict: 'id' });
    if (t.error) throw new Error(`tasks ${week.week}: ${t.error.message}`);
    const s = await admin.from('task_solutions').upsert(solutions, { onConflict: 'task_id' });
    if (s.error) throw new Error(`task_solutions ${week.week}: ${s.error.message}`);
    console.log(`${week.week}: ${tasks.length} Aufgaben importiert`);
  }
}

await main();
