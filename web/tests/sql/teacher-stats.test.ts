// SQL tests for migration 0008: attempt log, task statistics, layout seed, catalogue.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mondayOf } from '../../src/teacher/week';

const MIGRATIONS = [
  '0001_schema.sql',
  '0002_rls.sql',
  '0003_seed.sql',
  '0004_rpc_teacher.sql',
  '0005_grants_hardening.sql',
  '0006_avatar_shop_build.sql',
  '0007_tasks_rpc.sql',
  '0008_teacher_stats_catalog.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);

const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';
const CARLA = '00000000-0000-0000-0000-000000000013';

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;

let db: PGlite;
const asSuperuser = (sql: string): Promise<void> => db.exec(`reset role; ${sql}`);
const asUser = (uid: string): Promise<void> =>
  db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);

const MONDAY_NOW = mondayOf(new Date().toISOString().slice(0, 10)) as string;

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    if (file === '0002_rls.sql') await db.exec(SUPABASE_DEFAULT_GRANTS);
    await db.exec(sql);
  }
  await asSuperuser(`
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}'), ('${BEN}'), ('${CARLA}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', 0, 0),
      ('${BEN}', 'ben', 'student', '8a', 1, 0),
      ('${CARLA}', 'carla', 'student', '8b', 0, 0);
    insert into tasks (id, week, class_id, type, prompt, data, reward) values
      ('s-choice', '${MONDAY_NOW}', null, 'choice', 'Fahrkarte?', '{"options":["ticket","card"]}', 10),
      ('s-gap', '${MONDAY_NOW}', null, 'gap', 'went?', '{}', 10);
    insert into task_solutions (task_id, solution) values ('s-choice', '"ticket"'), ('s-gap', '["went"]');
  `);
});

afterAll(async () => {
  await db.close();
});

describe('attempt log', () => {
  it('writes one row per counted attempt', async () => {
    await asUser(ANNA);
    await db.query(`select submit_answer('s-choice', '"card"')`);
    await db.query(`select submit_answer('s-choice', '"ticket"')`);
    await asSuperuser('');
    const r = await db.query<{ n: number; c: number }>(
      `select count(*)::int as n, count(*) filter (where correct)::int as c from task_attempts where player_id = '${ANNA}'`,
    );
    expect(r.rows[0]).toEqual({ n: 2, c: 1 });
  });

  it('pupils see only their own attempts', async () => {
    await asUser(BEN);
    const r = await db.query<{ player_id: string }>('select player_id from task_attempts');
    expect(r.rows.every((x) => x.player_id === BEN)).toBe(true);
  });

  it('pupils cannot write the log directly', async () => {
    await asUser(BEN);
    await expect(
      db.exec(
        `insert into task_attempts (player_id, task_id, day, correct) values ('${BEN}', 's-choice', current_date, true)`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('task statistics', () => {
  it('gives the share of correct answers per task for the teacher', async () => {
    await asUser(TEACHER);
    const r = await db.query<{ task_id: string; answers: number; correct: number; share: string | null }>(
      `select task_id, answers::int, correct::int, share::text from task_stats('${MONDAY_NOW}')`,
    );
    const choice = r.rows.find((x) => x.task_id === 's-choice');
    expect(choice).toEqual({ task_id: 's-choice', answers: 2, correct: 1, share: '50.0' });
    const gap = r.rows.find((x) => x.task_id === 's-gap');
    expect(gap).toEqual({ task_id: 's-gap', answers: 0, correct: 0, share: null });
  });

  it('is closed for pupils', async () => {
    await asUser(ANNA);
    await expect(db.query(`select * from task_stats('${MONDAY_NOW}')`)).rejects.toThrow(/forbidden/);
  });
});

describe('layout seed', () => {
  it('lets the teacher set the seed of a class', async () => {
    await asUser(TEACHER);
    await db.query(`select set_layout_seed('8a', 4242)`);
    await asSuperuser('');
    const r = await db.query<{ layout_seed: number }>(`select layout_seed from classes where id = '8a'`);
    expect(r.rows[0].layout_seed).toBe(4242);
  });

  it('refuses a seed out of range and pupils', async () => {
    await asUser(TEACHER);
    await expect(db.query(`select set_layout_seed('8a', 0)`)).rejects.toThrow(/between 1 and 99999/);
    await asUser(ANNA);
    await expect(db.query(`select set_layout_seed('8a', 5)`)).rejects.toThrow(/forbidden/);
  });
});

describe('catalogue', () => {
  it('has the new items with prices in the SPEC ranges', async () => {
    await asSuperuser('');
    const r = await db.query<{ n: number; min: number; max: number }>(
      `select count(*)::int as n, min(price)::int as min, max(price)::int as max from items where starter = false`,
    );
    expect(r.rows[0].n).toBeGreaterThanOrEqual(30);
    expect(r.rows[0].min).toBeGreaterThanOrEqual(15);
    expect(r.rows[0].max).toBe(500);
  });
});
