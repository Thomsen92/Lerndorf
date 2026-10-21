// SQL tests for daily quests (migration 0015): schema, RLS and the import RPCs, against PGlite.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { packageToRows, type WeekPackage } from '../../scripts/quests';

const MIGRATIONS = [
  '0001_schema.sql',
  '0002_rls.sql',
  '0003_seed.sql',
  '0004_rpc_teacher.sql',
  '0005_grants_hardening.sql',
  '0006_avatar_shop_build.sql',
  '0007_tasks_rpc.sql',
  '0008_teacher_stats_catalog.sql',
  '0009_instances.sql',
  '0010_layout_maps.sql',
  '0011_instance_rules.sql',
  '0012_claim_plot.sql',
  '0013_plot_slots.sql',
  '0014_cat_sign_shop_asset.sql',
  '0015_daily_quests.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const fixtureDir = new URL('../fixtures/quests/', import.meta.url);
const fixture = (name: string): WeekPackage =>
  JSON.parse(readFileSync(new URL(name, fixtureDir), 'utf8')) as WeekPackage;

const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';
const CARLA = '00000000-0000-0000-0000-000000000013';
const WEEK = '2026-11-09';
const HOLIDAY_WEEK = '2026-11-02';

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;
// Real Supabase grants every new public table to anon/authenticated by default privileges.
// Set before 0015 so the migration's own revokes are exercised.
const SUPABASE_DEFAULT_PRIVILEGES = `
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated;
`;

let db: PGlite;

async function asSuperuser(sql: string): Promise<void> {
  await db.exec(`reset role; ${sql}`);
}
async function asUser(uid: string): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
}
async function asService(): Promise<void> {
  await db.exec('reset role; set role service_role;');
}
async function expectError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(promise).rejects.toThrow(pattern);
}
async function setToday(date: string): Promise<void> {
  await asSuperuser(`create or replace function public.quest_today() returns date
    language sql stable as $$ select '${date}'::date $$;`);
}

const rowsOf = (name: string) => packageToRows(fixture(name));
const importWeek = (week: string, holiday: boolean, quests: unknown[], solutions: unknown[]) =>
  db.query<{ n: number }>(
    `select public.import_quest_week($1::date, $2, $3::jsonb, $4::jsonb) as n`,
    [week, holiday, JSON.stringify(quests), JSON.stringify(solutions)],
  );

async function count(sql: string): Promise<number> {
  await asSuperuser('');
  const r = await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`);
  return r.rows[0].n;
}

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    if (file === '0002_rls.sql') await db.exec(SUPABASE_DEFAULT_GRANTS);
    if (file === '0015_daily_quests.sql') await db.exec(SUPABASE_DEFAULT_PRIVILEGES);
    await db.exec(sql);
  }
  await asSuperuser(`
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}'), ('${BEN}'), ('${CARLA}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', 0, 0),
      ('${BEN}', 'ben', 'student', '8a', 1, 0),
      ('${CARLA}', 'carla', 'student', '8b', 0, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await asSuperuser(`
    delete from coin_ledger where reason = 'quest';
    delete from daily_quest_results;
    delete from daily_quests;
    delete from quest_imports;
  `);
});

describe('access control', () => {
  beforeEach(async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests, solutions);
  });

  it('pupil sees no quests and cannot read solutions', async () => {
    await asUser(ANNA);
    expect((await db.query('select * from daily_quests')).rows).toHaveLength(0);
    expect((await db.query('select * from quest_imports')).rows).toHaveLength(0);
    await expectError(db.query('select * from daily_quest_solutions'), /permission denied/);
  });

  it('pupil cannot write any quest table', async () => {
    await asUser(ANNA);
    await expectError(
      db.query(`insert into daily_quest_results (player_id, quest_key) values ('${ANNA}', 'x')`),
      /permission denied/,
    );
    await expectError(db.query(`update daily_quests set reward = 20`), /permission denied/);
    await expectError(db.query(`delete from daily_quests`), /permission denied/);
    await expectError(
      db.query(`insert into quest_imports (week) values ('2026-01-05')`),
      /permission denied/,
    );
  });

  it('pupil sees only the own result; teacher sees all and can read quests', async () => {
    const key = rowsOf('2026-11-09.json').quests[0].key;
    await asSuperuser(`insert into daily_quest_results (player_id, quest_key, attempts)
      values ('${ANNA}', '${key}', 1), ('${BEN}', '${key}', 2);`);
    await asUser(ANNA);
    const own = await db.query<{ player_id: string }>('select player_id from daily_quest_results');
    expect(own.rows.map((r) => r.player_id)).toEqual([ANNA]);
    await asUser(TEACHER);
    expect((await db.query('select * from daily_quest_results')).rows).toHaveLength(2);
    expect((await db.query('select * from daily_quests')).rows).toHaveLength(21);
    expect((await db.query('select * from quest_imports')).rows).toHaveLength(1);
  });

  it('pupil and anon cannot call the import functions', async () => {
    await asUser(ANNA);
    await expectError(importWeek(WEEK, false, [], []), /permission denied/);
    await expectError(
      db.query(`select public.record_quest_import('${WEEK}'::date, false, '{"x"}')`),
      /permission denied/,
    );
    await asSuperuser('set role anon;');
    await expectError(importWeek(WEEK, false, [], []), /permission denied/);
  });
});

describe('import_quest_week', () => {
  it('imports a full week and records it', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    const r = await importWeek(WEEK, false, quests, solutions);
    expect(r.rows[0].n).toBe(21);
    await asSuperuser('');
    const imp = await db.query<{ ok: boolean; quest_count: number; holiday: boolean }>(
      `select ok, quest_count, holiday from quest_imports where week = '${WEEK}'`,
    );
    expect(imp.rows[0]).toEqual({ ok: true, quest_count: 21, holiday: false });
    expect(await count(`select 1 from daily_quests where active`)).toBe(21);
    expect(await count(`select 1 from daily_quest_solutions`)).toBe(21);
  });

  it('is all-or-nothing when a solution has an unknown quest key', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    const bad = [...solutions, { quest_key: 'no-such-quest', solution: 'x' }];
    await asService();
    await expectError(importWeek(WEEK, false, quests, bad), /./);
    expect(await count(`select 1 from daily_quests where week = '${WEEK}'`)).toBe(0);
    expect(await count(`select 1 from quest_imports`)).toBe(0);
  });

  it('imports a holiday week with no quests', async () => {
    await asService();
    const r = await importWeek(HOLIDAY_WEEK, true, [], []);
    expect(r.rows[0].n).toBe(0);
    await asSuperuser('');
    const imp = await db.query<{ ok: boolean; holiday: boolean; quest_count: number }>(
      `select ok, holiday, quest_count from quest_imports where week = '${HOLIDAY_WEEK}'`,
    );
    expect(imp.rows[0]).toEqual({ ok: true, holiday: true, quest_count: 0 });
    expect(await count(`select 1 from daily_quests`)).toBe(0);
  });

  it('re-import deactivates dropped quests, keeps results and ledger, updates solutions', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests, solutions);
    const K = quests[0].key;
    const L = quests[1].key;
    await asSuperuser(`
      insert into daily_quest_results (player_id, quest_key, attempts, solved_at, reward_paid)
        values ('${BEN}', '${K}', 1, now(), 5);
      insert into coin_ledger (player_id, delta, reason, ref) values ('${BEN}', 5, 'quest', '${K}');
    `);
    const newSolutions = solutions
      .filter((s) => s.quest_key !== K)
      .map((s) => (s.quest_key === L ? { ...s, solution: 'CHANGED' } : s));
    await asService();
    const r = await importWeek(
      WEEK,
      false,
      quests.filter((q) => q.key !== K),
      newSolutions,
    );
    expect(r.rows[0].n).toBe(20);
    await asSuperuser('');
    const k = await db.query<{ active: boolean }>(
      `select active from daily_quests where key = '${K}'`,
    );
    expect(k.rows).toEqual([{ active: false }]);
    expect(await count(`select 1 from daily_quests where active`)).toBe(20);
    expect(
      await count(
        `select 1 from daily_quest_results where player_id = '${BEN}' and quest_key = '${K}' and reward_paid = 5`,
      ),
    ).toBe(1);
    expect(await count(`select 1 from coin_ledger where reason = 'quest' and ref = '${K}'`)).toBe(1);
    const sol = await db.query<{ solution: unknown }>(
      `select solution from daily_quest_solutions where quest_key = '${L}'`,
    );
    expect(sol.rows[0].solution).toBe('CHANGED');
  });

  it('re-import can reactivate a dropped quest', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests.slice(1), solutions.slice(1));
    await importWeek(WEEK, false, quests, solutions);
    expect(await count(`select 1 from daily_quests where active`)).toBe(21);
  });
});

describe('record_quest_import', () => {
  it('stores a failed import and leaves the live week untouched', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests, solutions);
    await db.query(`select public.record_quest_import($1::date, false, $2::text[])`, [
      WEEK,
      ['days: genau 7 Tage'],
    ]);
    await asSuperuser('');
    const imp = await db.query<{ ok: boolean; errors: string[] }>(
      `select ok, errors from quest_imports where week = '${WEEK}'`,
    );
    expect(imp.rows[0].ok).toBe(false);
    expect(imp.rows[0].errors).toEqual(['days: genau 7 Tage']);
    expect(await count(`select 1 from daily_quests where week = '${WEEK}' and active`)).toBe(21);
  });

  it('creates the import row when none exists yet', async () => {
    await asService();
    await db.query(`select public.record_quest_import('2026-12-07'::date, false, '{"boom"}')`);
    expect(await count(`select 1 from quest_imports where week = '2026-12-07' and not ok`)).toBe(1);
  });
});

describe('coin ledger', () => {
  it('allows each quest to be paid out only once per player', async () => {
    const key = 'some-quest';
    await asSuperuser(`insert into coin_ledger (player_id, delta, reason, ref)
      values ('${BEN}', 5, 'quest', '${key}');`);
    await expectError(
      db.query(
        `insert into coin_ledger (player_id, delta, reason, ref) values ('${BEN}', 5, 'quest', '${key}')`,
      ),
      /unique|duplicate/,
    );
    // another player, and another reason with the same ref, are fine
    await db.query(
      `insert into coin_ledger (player_id, delta, reason, ref) values ('${ANNA}', 5, 'quest', '${key}')`,
    );
    await db.query(
      `insert into coin_ledger (player_id, delta, reason, ref) values ('${BEN}', 5, 'task', '${key}')`,
    );
  });
});

describe('quest_today', () => {
  it('can be overridden for tests', async () => {
    await setToday('2026-11-10');
    const r = await db.query<{ d: string }>(`select quest_today()::text as d`);
    expect(r.rows[0].d).toBe('2026-11-10');
  });
});
