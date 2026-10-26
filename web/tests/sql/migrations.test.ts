// SQL tests against a real Postgres (PGlite, in memory). They run the migrations in order,
// then check RLS, grants and the teacher RPCs as the roles the app uses.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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
  '0016_daily_quests_rpc.sql',
  '0017_daily_quests_teacher.sql',
  '0018_character_choice.sql',
  '0019_first_login_tutorial.sql',
  '0020_xp_levels.sql',
  '0021_tutorial_tap_questions.sql',
  '0022_teacher_overhaul.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);

const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011'; // 8a
const BEN = '00000000-0000-0000-0000-000000000012'; // 8a
const CARLA = '00000000-0000-0000-0000-000000000013'; // 8b

let db: PGlite;

/** Minimal stand-in for Supabase's auth schema: auth.uid() reads the JWT subject setting. */
const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

/** Supabase grants full table access by default; RLS and the revokes in 0002 narrow it. */
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;

async function asSuperuser(sql: string): Promise<void> {
  await db.exec(`reset role; ${sql}`);
}

async function asUser(uid: string | null): Promise<void> {
  const role = uid ? 'authenticated' : 'anon';
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role};`,
  );
}

async function expectError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(promise).rejects.toThrow(pattern);
}

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
    insert into placements (player_id, item_id, slot, rot)
      values ('${BEN}', null, 'deco_1', 0), ('${CARLA}', null, 'deco_1', 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('schema and seed', () => {
  it('seeds both classes with layout seeds', async () => {
    await asSuperuser('');
    const r = await db.query<{ id: string; layout_seed: number }>(
      'select id, layout_seed from classes order by id',
    );
    expect(r.rows).toEqual([
      { id: '8a', layout_seed: 11 },
      { id: '8b', layout_seed: 23 },
    ]);
  });

  it('has exactly one settings row', async () => {
    const r = await db.query<{ n: number }>('select count(*)::int as n from settings');
    expect(r.rows[0].n).toBe(1);
  });

  it('rejects nicknames with umlauts or spaces', async () => {
    await asSuperuser(`insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1')`);
    await expectError(
      db.exec(
        `insert into profiles (id, nickname, role, class_id) values ('00000000-0000-0000-0000-0000000000f1', 'Jörg', 'student', '8a')`,
      ),
      /check constraint/,
    );
  });
});

describe('row level security: pupils', () => {
  it('sees only own profile row', async () => {
    await asUser(ANNA);
    const r = await db.query<{ id: string }>('select id from profiles order by nickname');
    expect(r.rows.map((x) => x.id)).toEqual([ANNA]);
  });

  it('can not write profiles directly', async () => {
    await asUser(ANNA);
    await expectError(db.exec(`update profiles set coins = 999 where id = '${ANNA}'`), /permission denied/);
    await expectError(
      db.exec(`insert into coin_ledger (player_id, delta, reason) values ('${ANNA}', 500, 'task')`),
      /permission denied/,
    );
  });

  it('can not read task solutions', async () => {
    await asUser(ANNA);
    await expectError(db.query('select * from task_solutions'), /permission denied/);
  });

  it('sees placements of classmates only', async () => {
    await asUser(ANNA);
    const r = await db.query<{ player_id: string }>('select player_id from placements');
    const owners = new Set(r.rows.map((x) => x.player_id));
    expect(owners.has(BEN)).toBe(true);
    expect(owners.has(CARLA)).toBe(false);
  });

  it('village_members lists only own class and never coins', async () => {
    await asUser(ANNA);
    const r = await db.query<{ nickname: string }>(
      'select nickname from village_members() order by nickname',
    );
    expect(r.rows.map((x) => x.nickname)).toEqual(['anna', 'ben']);
    await expectError(db.query('select coins from village_members()'), /column "coins" does not exist/);
  });

  it('can not call teacher RPCs', async () => {
    await asUser(ANNA);
    await expectError(
      db.query(`select add_stamps('8a', '2026-11-09', array['${ANNA}']::uuid[])`),
      /forbidden/,
    );
    await expectError(db.query(`select adjust_coins('${ANNA}', 50, 'selbst')`), /forbidden/);
    await expectError(db.query(`select set_class_flags('8a', false, false)`), /forbidden/);
  });
});

describe('row level security: anonymous', () => {
  it('sees nothing in profiles and can not call RPCs', async () => {
    await asUser(null);
    const r = await db.query('select id from profiles');
    expect(r.rows).toEqual([]);
    await expectError(db.query(`select add_stamps('8a', '2026-11-09', '{}'::uuid[])`), /permission denied/);
  });
});

describe('teacher RPCs', () => {
  it('add_stamps books one stamp per pupil and week, only for the given class', async () => {
    await asUser(TEACHER);
    const first = await db.query<{ n: number }>(
      `select add_stamps('8a', '2026-11-09', array['${ANNA}', '${BEN}', '${CARLA}']::uuid[]) as n`,
    );
    expect(first.rows[0].n).toBe(2); // Carla is in 8b, not booked

    const second = await db.query<{ n: number }>(
      `select add_stamps('8a', '2026-11-09', array['${ANNA}', '${BEN}']::uuid[]) as n`,
    );
    expect(second.rows[0].n).toBe(0); // already booked this week

    await asSuperuser('');
    const coins = await db.query<{ coins: number }>(`select coins from profiles where id = '${ANNA}'`);
    expect(coins.rows[0].coins).toBe(100);
  });

  it('add_stamps rejects a week that does not start on a Monday', async () => {
    await asUser(TEACHER);
    await expectError(db.query(`select add_stamps('8a', '2026-11-10', array['${ANNA}']::uuid[])`), /Monday/);
  });

  it('adjust_coins corrects coins with a note and keeps the ledger in sync', async () => {
    await asUser(TEACHER);
    const r = await db.query<{ n: number }>(`select adjust_coins('${ANNA}', -15, 'Abzug Hausaufgabe') as n`);
    expect(r.rows[0].n).toBe(85);
  });

  it('adjust_coins requires a note and rejects a negative balance', async () => {
    await asUser(TEACHER);
    await expectError(db.query(`select adjust_coins('${ANNA}', 5, '  ')`), /note is required/);
    await expectError(db.query(`select adjust_coins('${ANNA}', -1000, 'zu viel')`), /check constraint/);
  });

  it('ledger sum equals coins for every pupil', async () => {
    await asSuperuser('');
    const r = await db.query<{ ok: boolean }>(`
      select bool_and(p.coins = coalesce(l.total, 0)) as ok
      from profiles p
      left join (select player_id, sum(delta) as total from coin_ledger group by player_id) l
        on l.player_id = p.id
      where p.role = 'student'
    `);
    expect(r.rows[0].ok).toBe(true);
  });

  it('set_class_flags switches shop and build mode', async () => {
    await asUser(TEACHER);
    await db.query(`select set_class_flags('8a', false, true)`);
    await asSuperuser('');
    const r = await db.query<{ shop_open: boolean; build_open: boolean }>(
      `select shop_open, build_open from classes where id = '8a'`,
    );
    expect(r.rows[0]).toEqual({ shop_open: false, build_open: true });
  });
});
