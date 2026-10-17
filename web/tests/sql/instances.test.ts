// SQL tests for migration 0009 (SPEC §1a): instances 8a and 8b are separate worlds.
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
  '0009_instances.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);

const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011'; // 8a
const BEN = '00000000-0000-0000-0000-000000000012'; // 8a
const CARLA = '00000000-0000-0000-0000-000000000013'; // 8b

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
const asSuperuser = async (sql: string): Promise<void> => {
  await db.exec(`reset role; ${sql}`);
};
const asUser = async (uid: string): Promise<void> => {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
};
const coinsOf = async (uid: string): Promise<number> => {
  await asSuperuser('');
  const r = await db.query<{ coins: number }>(`select coins from profiles where id = '${uid}'`);
  return r.rows[0].coins;
};
const MONDAY = mondayOf(new Date().toISOString().slice(0, 10)) as string;

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
    insert into inventory (player_id, item_id, qty) values
      ('${ANNA}', 'deco_bench', 3), ('${CARLA}', 'deco_bench', 3), ('${CARLA}', 'deco_flowerbed', 1);
    insert into tasks (id, week, class_id, type, prompt, data, reward) values
      ('i-both', '${MONDAY}', null, 'choice', 'both', '{"options":["a","b"]}', 10),
      ('i-8a', '${MONDAY}', '8a', 'choice', 'only 8a', '{"options":["a","b"]}', 10);
    insert into task_solutions (task_id, solution) values ('i-both', '"a"'), ('i-8a', '"a"');
  `);
});

afterAll(async () => {
  await db.close();
});

describe('rules per instance', () => {
  it("a stamp uses the reward of the pupil's own instance", async () => {
    await asSuperuser(`update classes set stamp_reward = 50 where id = '8a'`);
    await asUser(TEACHER);
    await db.query(`select add_stamps('8a', '2026-10-05', array['${ANNA}']::uuid[])`);
    await db.query(`select add_stamps('8b', '2026-10-05', array['${CARLA}']::uuid[])`);
    expect(await coinsOf(ANNA)).toBe(50);
    expect(await coinsOf(CARLA)).toBe(100);
  });

  it('attempts come from the own instance', async () => {
    await asSuperuser(`update classes set max_attempts = 1 where id = '8a'`);
    await asUser(ANNA);
    const first = await db.query<{ r: { attempts_left: number; solution: unknown } }>(
      `select submit_answer('i-both', '"b"') as r`,
    );
    expect(first.rows[0].r).toMatchObject({ attempts_left: 0, solution: 'a' });
    await expect(db.query(`select submit_answer('i-both', '"a"')`)).rejects.toThrow(/no attempts left/);

    await asUser(CARLA); // 8b keeps 3 attempts
    const carla = await db.query<{ r: { attempts_left: number } }>(
      `select submit_answer('i-both', '"b"') as r`,
    );
    expect(carla.rows[0].r.attempts_left).toBe(2);
  });

  it('a class can refuse a shop item without affecting the other class', async () => {
    await asSuperuser(
      `insert into class_items (class_id, item_id, enabled) values ('8a', 'deco_flowerbed', false)`,
    );
    await asSuperuser(`update classes set shop_open = true where id = '8a'`);
    await asUser(ANNA);
    await expect(db.query(`select buy_item('deco_flowerbed')`)).rejects.toThrow(/not sold in this class/);
    await asUser(CARLA);
    await db.query(`select buy_item('deco_bench')`); // 8b sells it, carla pays 30
    expect(await coinsOf(CARLA)).toBe(70);
  });

  it('the grid comes from the own instance', async () => {
    await asSuperuser(`update classes set plot_cols = 5 where id = '8b'`);
    await asUser(CARLA);
    // a 2 x 1 bench at x = 4 covers cells 4 and 5; 8b has only 5 columns (0..4)
    await expect(db.query(`select place_item('deco_bench', 4, 3, 0)`)).rejects.toThrow(
      /outside the free plot/,
    );
    await asUser(ANNA); // 8a still has 7 columns
    await db.query(`select place_item('deco_bench', 4, 3, 0)`);
  });
});

describe('separation of pupils', () => {
  it('a pupil of 8b cannot answer a task that belongs to 8a', async () => {
    await asUser(CARLA);
    await expect(db.query(`select submit_answer('i-8a', '"a"')`)).rejects.toThrow(/not for your class/);
  });

  it('a pupil of 8b sees no placement of 8a', async () => {
    await asUser(CARLA);
    const r = await db.query<{ player_id: string }>('select player_id from placements');
    expect(r.rows.some((x) => x.player_id === ANNA)).toBe(false);
  });
});

describe('move_student_class (I.2)', () => {
  it('moves a pupil: coins stay, placements go back, the next free plot in the new class', async () => {
    await asUser(ANNA);
    const coinsBefore = await coinsOf(ANNA);
    await asUser(TEACHER);
    const plot = await db.query<{ n: number }>(`select move_student_class('${ANNA}', '8b') as n`);
    expect(plot.rows[0].n).toBe(1); // Carla holds plot 0 in 8b
    await asSuperuser('');
    const after = await db.query<{ class_id: string; plot_index: number; n: number }>(
      `select p.class_id, p.plot_index, (select count(*)::int from placements where player_id = p.id) as n
       from profiles p where p.id = '${ANNA}'`,
    );
    expect(after.rows[0]).toEqual({ class_id: '8b', plot_index: 1, n: 0 });
    expect(await coinsOf(ANNA)).toBe(coinsBefore);
    const inv = await db.query<{ qty: number }>(
      `select qty from inventory where player_id = '${ANNA}' and item_id = 'deco_bench'`,
    );
    expect(inv.rows[0].qty).toBe(3);
  });

  it('is teacher only', async () => {
    await asUser(BEN);
    await expect(db.query(`select move_student_class('${BEN}', '8b')`)).rejects.toThrow(
      /forbidden|permission denied/,
    );
  });
});
