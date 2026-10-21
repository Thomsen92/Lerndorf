// SQL tests for daily quests (migration 0015): schema, RLS and the import RPCs, against PGlite.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
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
  '0016_daily_quests_rpc.sql',
  '0017_daily_quests_teacher.sql',
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

describe('pupil quests', () => {
  const T1 = '2026-11-10-tue-1'; // order, reward 15
  const T2 = '2026-11-10-tue-2'; // listening/choice, reward 5
  const T3 = '2026-11-10-tue-3'; // choice, reward 10
  const W1 = '2026-11-11-wed-1'; // listening/gap
  const ORDER_OK = ['the', 'dog', 'sees', 'the', 'cat'];
  type Q = {
    key: string;
    day: string;
    catch_up: boolean;
    reward: number;
    reward_left: number;
    solved: boolean;
    attempts: number;
    [k: string]: unknown;
  };
  type R = {
    correct: boolean;
    already_solved: boolean;
    coins: number;
    reward: number;
    reward_left: number;
    hint: string | null;
    [k: string]: unknown;
  };
  const mine = async (uid: string): Promise<Q[]> => {
    await asUser(uid);
    const r = await db.query<{ q: Q[] }>('select public.my_daily_quests() as q');
    return r.rows[0].q;
  };
  const submit = async (uid: string, key: string, answer: unknown): Promise<R> => {
    await asUser(uid);
    const r = await db.query<{ r: R }>('select public.submit_quest_answer($1, $2::jsonb) as r', [
      key,
      JSON.stringify(answer),
    ]);
    return r.rows[0].r;
  };
  const coinsOf = async (uid: string): Promise<number> => {
    await asSuperuser('');
    return (await db.query<{ coins: number }>(`select coins from profiles where id = '${uid}'`))
      .rows[0].coins;
  };
  const ledgerCount = (uid: string, key: string) =>
    count(
      `select 1 from coin_ledger where player_id = '${uid}' and reason = 'quest' and ref = '${key}'`,
    );

  // invariant after every test (and its real bookings): coins = sum of the ledger
  afterEach(async () => {
    await asSuperuser('');
    for (const uid of [ANNA, BEN]) {
      const r = await db.query<{ coins: number; s: number }>(
        `select p.coins, coalesce((select sum(delta) from coin_ledger where player_id = p.id), 0)::int as s
         from profiles p where p.id = '${uid}'`,
      );
      expect(r.rows[0].coins).toBe(r.rows[0].s);
    }
  });

  beforeEach(async () => {
    await asSuperuser('delete from coin_ledger; update profiles set coins = 0;');
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests, solutions);
  });

  it('shows the three quests of today to both classes, no other day, no hint or solution', async () => {
    await setToday('2026-11-10');
    const a = await mine(ANNA);
    const c = await mine(CARLA);
    const todayOnly = (l: Q[]) => l.filter((q) => !q.catch_up);
    expect(todayOnly(a).map((q) => q.key)).toEqual([T1, T2, T3]);
    expect(todayOnly(c).map((q) => q.key)).toEqual([T1, T2, T3]);
    expect(todayOnly(a).every((q) => q.day === '2026-11-10')).toBe(true);
    // yesterday's (Monday) unsolved quests are catch-up; tomorrow's never appear
    expect(a.filter((q) => q.catch_up).every((q) => q.day === '2026-11-09')).toBe(true);
    expect(a.some((q) => q.day === '2026-11-11')).toBe(false);
    for (const q of a) {
      expect(q).not.toHaveProperty('hint');
      expect(q).not.toHaveProperty('solution');
    }
    expect(JSON.stringify(a)).not.toContain('The sentence starts');
    await expectError(submit(ANNA, W1, 'x'), /quest not available/);
  });

  it('wrong answers give the hint but no solution; unlimited tries; late correct pays nothing', async () => {
    await setToday('2026-11-10');
    const before = await coinsOf(ANNA);
    let r: R | undefined;
    for (let i = 0; i < 10; i++) r = await submit(ANNA, T1, ['x']);
    expect(r).toMatchObject({
      correct: false,
      reward: 0,
      reward_left: 0,
      hint: 'The sentence starts with the.',
    });
    expect(r).not.toHaveProperty('solution');
    const ok = await submit(ANNA, T1, ORDER_OK);
    expect(ok).toMatchObject({ correct: true, already_solved: false, reward: 0 });
    expect(await coinsOf(ANNA)).toBe(before);
    expect(await ledgerCount(ANNA, T1)).toBe(0);
    // another quest, correct on the first try: full reward and a ledger row
    const ok3 = await submit(ANNA, T3, 'apple');
    expect(ok3).toMatchObject({ correct: true, already_solved: false, reward: 10, hint: null });
    expect(ok3.coins).toBe(before + 10);
    expect(await coinsOf(ANNA)).toBe(before + 10);
    expect(await ledgerCount(ANNA, T3)).toBe(1);
  });

  it('D11: after 2 wrong answers the 3rd (correct) one still pays in full', async () => {
    await setToday('2026-11-10');
    const before = await coinsOf(ANNA);
    const w1 = await submit(ANNA, T3, 'chair');
    expect(w1.reward_left).toBe(10);
    await submit(ANNA, T3, 'window');
    const ok = await submit(ANNA, T3, 'apple');
    expect(ok).toMatchObject({ correct: true, reward: 10 });
    expect(await coinsOf(ANNA)).toBe(before + 10);
  });

  it('D11: 3 wrong answers then correct is solved without coins; reward_left is 0', async () => {
    await setToday('2026-11-10');
    const before = await coinsOf(ANNA);
    await submit(ANNA, T3, 'a');
    await submit(ANNA, T3, 'b');
    const w3 = await submit(ANNA, T3, 'c');
    expect(w3.reward_left).toBe(0);
    const list = await mine(ANNA);
    expect(list.find((q) => q.key === T3)).toMatchObject({
      reward_left: 0,
      attempts: 3,
      solved: false,
    });
    expect(list.find((q) => q.key === T2)?.reward_left).toBe(5);
    const ok = await submit(ANNA, T3, 'apple');
    expect(ok).toMatchObject({ correct: true, already_solved: false, reward: 0 });
    expect(await ledgerCount(ANNA, T3)).toBe(0);
    expect(await coinsOf(ANNA)).toBe(before);
    expect((await mine(ANNA)).find((q) => q.key === T3)).toMatchObject({
      solved: true,
      reward_left: 0,
    });
  });

  it('a correct answer submitted twice books once', async () => {
    await setToday('2026-11-10');
    const before = await coinsOf(ANNA);
    const first = await submit(ANNA, T2, 'the station');
    expect(first).toMatchObject({ correct: true, already_solved: false, reward: 5 });
    const second = await submit(ANNA, T2, 'the station');
    expect(second).toMatchObject({ correct: true, already_solved: true, reward: 0 });
    expect(await ledgerCount(ANNA, T2)).toBe(1);
    expect(await coinsOf(ANNA)).toBe(before + 5);
    await asSuperuser('');
    const att = await db.query<{ attempts: number }>(
      `select attempts from daily_quest_results where player_id = '${ANNA}' and quest_key = '${T2}'`,
    );
    expect(att.rows[0].attempts).toBe(1);
  });

  it('catch-up: the next day shows unsolved quests of yesterday at half reward', async () => {
    await setToday('2026-11-10');
    await submit(BEN, T3, 'apple');
    await setToday('2026-11-11');
    const list = await mine(BEN);
    const cu = list.filter((q) => q.catch_up);
    expect(cu.map((q) => [q.key, q.reward])).toEqual([
      [T1, 8],
      [T2, 3],
    ]);
    expect(list.slice(0, 3).every((q) => !q.catch_up)).toBe(true);
    expect(list).toHaveLength(5);
    const before = await coinsOf(BEN);
    const r = await submit(BEN, T1, ORDER_OK);
    expect(r).toMatchObject({ correct: true, reward: 8 });
    expect(await coinsOf(BEN)).toBe(before + 8);
  });

  it('attempts carry over from today into the catch-up day', async () => {
    await setToday('2026-11-10');
    await submit(BEN, T3, 'a');
    await submit(BEN, T3, 'b');
    await submit(BEN, T3, 'c');
    await setToday('2026-11-11');
    expect((await mine(BEN)).find((q) => q.key === T3)).toMatchObject({
      attempts: 3,
      reward_left: 0,
    });
    expect(await submit(BEN, T3, 'apple')).toMatchObject({ correct: true, reward: 0 });
  });

  it('expiry: a quest two days old is gone', async () => {
    await setToday('2026-11-12');
    await expectError(submit(BEN, T1, ORDER_OK), /quest not available/);
    expect((await mine(BEN)).some((q) => q.day === '2026-11-10')).toBe(false);
  });

  it('a Sunday quest is catch-up on the following Monday', async () => {
    await setToday('2026-11-16');
    const list = await mine(ANNA);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((q) => q.catch_up && q.day === '2026-11-15')).toBe(true);
  });

  it('listening in gap mode normalises the answer', async () => {
    await setToday('2026-11-11');
    expect(await submit(ANNA, W1, '  The Station ')).toMatchObject({ correct: true, reward: 10 });
  });

  it('order quest with duplicate words accepts the exact sequence only', async () => {
    await setToday('2026-11-10');
    expect((await submit(ANNA, T1, ['the', 'the', 'dog', 'sees', 'cat'])).correct).toBe(false);
    expect((await submit(ANNA, T1, ORDER_OK)).correct).toBe(true);
  });

  it('a deactivated quest is not listed and cannot be answered', async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(
      WEEK,
      false,
      quests.filter((q) => q.key !== T3),
      solutions.filter((s) => s.quest_key !== T3),
    );
    await setToday('2026-11-10');
    expect((await mine(ANNA)).filter((q) => !q.catch_up).map((q) => q.key)).toEqual([T1, T2]);
    await expectError(submit(ANNA, T3, 'apple'), /quest not available/);
  });

  it('teacher and anonymous callers are refused', async () => {
    await setToday('2026-11-10');
    await expectError(submit(TEACHER, T1, ORDER_OK), /only pupils/);
    await asSuperuser(`select set_config('request.jwt.claim.sub', '', false); set role authenticated;`);
    await expectError(db.query(`select public.submit_quest_answer('${T1}', '"x"')`), /not logged in/);
    await asSuperuser('set role anon;');
    await expectError(db.query(`select public.my_daily_quests()`), /permission denied/);
  });
});

describe('teacher quest RPCs', () => {
  type Status = {
    today: string;
    covered_until: string | null;
    today_missing: boolean;
    tomorrow_missing: boolean;
    imports: { week: string; ok: boolean; holiday: boolean; errors: string[]; quest_count: number }[];
  };
  const status = async (uid = TEACHER): Promise<Status> => {
    await asUser(uid);
    return (await db.query<{ s: Status }>('select public.quest_status() as s')).rows[0].s;
  };

  beforeEach(async () => {
    const { quests, solutions } = rowsOf('2026-11-09.json');
    await asService();
    await importWeek(WEEK, false, quests, solutions);
  });

  it('refuses pupils', async () => {
    await expectError(status(ANNA), /42501|only the teacher|not allowed/i);
    await asUser(ANNA);
    await expectError(
      db.query(`select public.teacher_quest_preview('${WEEK}'::date, 1)`),
      /42501|only the teacher|not allowed/i,
    );
  });

  it('mid-week: covered until Sunday, nothing missing', async () => {
    await setToday('2026-11-10');
    expect(await status()).toMatchObject({
      today: '2026-11-10',
      covered_until: '2026-11-15',
      today_missing: false,
      tomorrow_missing: false,
    });
  });

  it('on the last day tomorrow is missing', async () => {
    await setToday('2026-11-15');
    expect(await status()).toMatchObject({
      covered_until: '2026-11-15',
      today_missing: false,
      tomorrow_missing: true,
    });
  });

  it('no package for today: today missing, not covered', async () => {
    await setToday('2026-11-16');
    expect(await status()).toMatchObject({
      covered_until: null,
      today_missing: true,
      tomorrow_missing: true,
    });
  });

  it('a holiday week counts as covered', async () => {
    await asService();
    await importWeek('2026-11-16', true, [], []);
    await setToday('2026-11-16');
    expect(await status()).toMatchObject({
      covered_until: '2026-11-22',
      today_missing: false,
      tomorrow_missing: false,
    });
  });

  it('lists imports from last week on, with failed ones and their errors', async () => {
    await asService();
    await db.query(`select public.record_quest_import('2026-11-23'::date, false, '{"days: kaputt"}')`);
    await setToday('2026-11-10');
    const s = await status();
    expect(s.imports.map((i) => i.week)).toEqual([WEEK, '2026-11-23']);
    expect(s.imports[1]).toMatchObject({ ok: false, errors: ['days: kaputt'] });
    expect(s.imports[0]).toMatchObject({ ok: true, quest_count: 21 });
  });

  it('preview returns the quests with solutions, ordered', async () => {
    await asUser(TEACHER);
    const r = await db.query<{ p: { key: string; day: string; slot: number; solution: unknown }[] }>(
      `select public.teacher_quest_preview('${WEEK}'::date, 7) as p`,
    );
    const p = r.rows[0].p;
    expect(p).toHaveLength(21);
    expect(p.every((q) => 'solution' in q && 'hint' in q)).toBe(true);
    expect(p[0].day).toBe(WEEK);
    expect(p[20].day).toBe('2026-11-15');
    const one = await db.query<{ p: unknown[] }>(
      `select public.teacher_quest_preview('${WEEK}'::date, 1) as p`,
    );
    expect(one.rows[0].p).toHaveLength(3);
  });

  it('preview rejects p_days outside 1..14', async () => {
    await asUser(TEACHER);
    await expectError(db.query(`select public.teacher_quest_preview('${WEEK}'::date, 15)`), /p_days/);
    await expectError(db.query(`select public.teacher_quest_preview('${WEEK}'::date, 0)`), /p_days/);
  });
});
