// SQL tests for avatar, shop, building and tasks (migrations 0006 and 0007), against PGlite.
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

async function asSuperuser(sql: string): Promise<void> {
  await db.exec(`reset role; ${sql}`);
}
async function asUser(uid: string): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
}
async function expectError(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(promise).rejects.toThrow(pattern);
}
const coinsOf = async (uid: string): Promise<number> => {
  await asSuperuser('');
  const r = await db.query<{ coins: number }>(`select coins from profiles where id = '${uid}'`);
  return r.rows[0].coins;
};

const MONDAY_NOW = mondayOf(new Date().toISOString().slice(0, 10)) as string;
const MONDAY_OLD = '2026-10-05';
const MONDAY_FUTURE = '2099-01-05';

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
      ('${ANNA}', 'anna', 'student', '8a', 0, 500),
      ('${BEN}', 'ben', 'student', '8a', 1, 0),
      ('${CARLA}', 'carla', 'student', '8b', 0, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('avatar', () => {
  const recipe = (over: Record<string, unknown> = {}) => ({
    v: 1,
    skin: 2,
    hair: 'hair_01',
    hairColor: '#c0502f',
    top: 'top_02',
    topColor: '#4b7bec',
    pants: 'pants_01',
    hat: null,
    acc: null,
    pet: null,
    eyes: 1,
    ...over,
  });

  it('stores a recipe with starter parts and palette colours', async () => {
    await asUser(ANNA);
    await db.query(`select save_avatar('${JSON.stringify(recipe())}'::jsonb)`);
    await asSuperuser('');
    const r = await db.query<{ hair: string }>(
      `select avatar->>'hair' as hair from profiles where id = '${ANNA}'`,
    );
    expect(r.rows[0].hair).toBe('hair_01');
  });

  it('rejects a colour outside the palette', async () => {
    await asUser(ANNA);
    await expectError(
      db.query(`select save_avatar('${JSON.stringify(recipe({ hairColor: '#ff00ff' }))}'::jsonb)`),
      /palette/,
    );
  });

  it('rejects a paid part the pupil does not own', async () => {
    await asUser(ANNA);
    await expectError(
      db.query(`select save_avatar('${JSON.stringify(recipe({ hat: 'hat_01' }))}'::jsonb)`),
      /not allowed/,
    );
  });

  it('rejects a part in the wrong slot', async () => {
    await asUser(ANNA);
    await expectError(
      db.query(`select save_avatar('${JSON.stringify(recipe({ hair: 'top_01' }))}'::jsonb)`),
      /not allowed/,
    );
  });
});

describe('shop', () => {
  it('rejects starter items and unknown items', async () => {
    await asUser(ANNA);
    await expectError(db.query(`select buy_item('hair_01')`), /not sold/);
    await expectError(db.query(`select buy_item('gibt_es_nicht')`), /not found/);
  });

  it('buys an item, charges the coins and books the ledger', async () => {
    await asUser(ANNA);
    const r = await db.query<{ r: { coins: number; qty: number } }>(`select buy_item('deco_bench') as r`);
    expect(r.rows[0].r).toEqual({ coins: 470, qty: 1 });
    expect(await coinsOf(ANNA)).toBe(470);
    await asSuperuser('');
    const sum = await db.query<{ s: number }>(
      `select coalesce(sum(delta), 0)::int as s from coin_ledger where player_id = '${ANNA}'`,
    );
    expect(sum.rows[0].s).toBe(-30);
  });

  it('refuses a purchase without enough coins', async () => {
    await asUser(BEN);
    await expectError(db.query(`select buy_item('deco_fountain')`), /not enough coins/);
  });

  it('refuses a purchase while the shop is closed', async () => {
    await asSuperuser(`update classes set shop_open = false where id = '8a'`);
    await asUser(ANNA);
    await expectError(db.query(`select buy_item('deco_flowerbed')`), /shop is closed/);
    await asSuperuser(`update classes set shop_open = true where id = '8a'`);
  });
});

describe('building', () => {
  // bench: 2 wide, 1 deep. Plot grid is 7 x 6; rows 0 and 1 are the house, the gate is (3,5).
  it('places a decoration on the free front area', async () => {
    // Anna owns five benches for the building tests
    await asSuperuser(`update inventory set qty = 5 where player_id = '${ANNA}' and item_id = 'deco_bench'`);
    await asUser(ANNA);
    const id = await db.query<{ id: number }>(`select place_item('deco_bench', 0, 3, 0) as id`);
    expect(Number(id.rows[0].id)).toBeGreaterThan(0);
  });

  it('refuses cells in the house area', async () => {
    await asUser(ANNA);
    await expectError(db.query(`select place_item('deco_bench', 0, 0, 0)`), /outside the free plot/);
  });

  it('refuses the gate cell', async () => {
    await asUser(ANNA);
    await expectError(db.query(`select place_item('deco_bench', 3, 5, 0)`), /outside the free plot/);
  });

  it('refuses an overlap with an existing decoration', async () => {
    await asUser(ANNA);
    await expectError(db.query(`select place_item('deco_bench', 1, 3, 0)`), /already occupied/);
  });

  it('refuses a second copy when the pupil owns only one', async () => {
    // one owned, one already placed: no copy left
    await asSuperuser(`update inventory set qty = 1 where player_id = '${ANNA}' and item_id = 'deco_bench'`);
    await asUser(ANNA);
    await expectError(db.query(`select place_item('deco_bench', 0, 4, 0)`), /no free copy/);
    await asSuperuser(`update inventory set qty = 5 where player_id = '${ANNA}' and item_id = 'deco_bench'`);
  });

  it('refuses placing without owning the item', async () => {
    await asUser(BEN);
    await expectError(db.query(`select place_item('deco_bench', 0, 3, 0)`), /no free copy/);
  });

  it('removes only own placements', async () => {
    // Classmates can see each other's placements (RLS), but only the owner may remove them.
    await asSuperuser('');
    const pl = await db.query<{ id: number }>(
      `select id from placements where player_id = '${ANNA}' limit 1`,
    );
    await asUser(BEN);
    await expectError(db.query(`select remove_placement(${pl.rows[0].id})`), /not found/);
    await asUser(ANNA);
    await db.query(`select remove_placement(${pl.rows[0].id})`);
    await asSuperuser('');
    const after = await db.query(`select id from placements where player_id = '${ANNA}'`);
    expect(after.rows.length).toBe(0);
  });

  it('refuses building while the build mode is closed', async () => {
    await asSuperuser(`update classes set build_open = false where id = '8a'`);
    await asUser(ANNA);
    await expectError(db.query(`select place_item('deco_bench', 0, 3, 0)`), /building is closed/);
    await asSuperuser(`update classes set build_open = true where id = '8a'`);
  });
});

describe('tasks', () => {
  beforeAll(async () => {
    await asSuperuser(`
      insert into tasks (id, week, class_id, type, prompt, data, reward) values
        ('t-choice', '${MONDAY_NOW}', null, 'choice', 'Fahrkarte?', '{"options":["ticket","card"]}', 10),
        ('t-gap', '${MONDAY_NOW}', null, 'gap', 'Yesterday we ___.', '{}', 10),
        ('t-match', '${MONDAY_NOW}', null, 'match', 'Pairs', '{}', 10),
        ('t-order', '${MONDAY_NOW}', null, 'order', 'Order', '{}', 10),
        ('t-old', '${MONDAY_OLD}', null, 'choice', 'Old', '{}', 10),
        ('t-future', '${MONDAY_FUTURE}', null, 'choice', 'Future', '{}', 10),
        ('t-8b', '${MONDAY_NOW}', '8b', 'choice', 'only 8b', '{}', 10);
      insert into task_solutions (task_id, solution) values
        ('t-choice', '"ticket"'),
        ('t-gap', '["went", "gone"]'),
        ('t-match', '[["subway","U-Bahn"],["block","Häuserblock"]]'),
        ('t-order', '["a","b","c"]'),
        ('t-old', '"x"'),
        ('t-future', '"x"'),
        ('t-8b', '"x"');
    `);
  });

  it('accepts a correct choice answer with normalisation and pays the reward', async () => {
    await asUser(BEN);
    const before = await coinsOf(BEN);
    const r = await db.query<{ r: { correct: boolean; coins: number } }>(
      `select submit_answer('t-choice', '"  TICKET  "') as r`,
    );
    expect(r.rows[0].r.correct).toBe(true);
    expect(await coinsOf(BEN)).toBe(before + 10);
  });

  it('refuses a second solution of the same task on the same day', async () => {
    await asUser(BEN);
    await expectError(db.query(`select submit_answer('t-choice', '"ticket"')`), /already solved/);
  });

  it('accepts any of several gap solutions', async () => {
    await asUser(BEN);
    const r = await db.query<{ r: { correct: boolean } }>(`select submit_answer('t-gap', '"gone"') as r`);
    expect(r.rows[0].r.correct).toBe(true);
  });

  it('match ignores the order of the pairs', async () => {
    await asUser(BEN);
    const r = await db.query<{ r: { correct: boolean } }>(
      `select submit_answer('t-match', '[["block","Häuserblock"],["subway","U-Bahn"]]') as r`,
    );
    expect(r.rows[0].r.correct).toBe(true);
  });

  it('order must be exact', async () => {
    await asUser(BEN);
    const wrong = await db.query<{ r: { correct: boolean } }>(
      `select submit_answer('t-order', '["b","a","c"]') as r`,
    );
    expect(wrong.rows[0].r.correct).toBe(false);
    const right = await db.query<{ r: { correct: boolean } }>(
      `select submit_answer('t-order', '["a","b","c"]') as r`,
    );
    expect(right.rows[0].r.correct).toBe(true);
  });

  it('shows the solution only after the last wrong attempt', async () => {
    await asUser(CARLA);
    const first = await db.query<{ r: { correct: boolean; solution: unknown; attempts_left: number } }>(
      `select submit_answer('t-choice', '"no"') as r`,
    );
    expect(first.rows[0].r).toMatchObject({ correct: false, solution: null, attempts_left: 2 });
    await db.query(`select submit_answer('t-choice', '"no"')`);
    const last = await db.query<{ r: { correct: boolean; solution: unknown; attempts_left: number } }>(
      `select submit_answer('t-choice', '"no"') as r`,
    );
    expect(last.rows[0].r).toMatchObject({ correct: false, solution: 'ticket', attempts_left: 0 });
    await expectError(db.query(`select submit_answer('t-choice', '"ticket"')`), /no attempts left/);
  });

  it('pays half the reward for an older week', async () => {
    await asUser(BEN);
    const before = await coinsOf(BEN);
    await db.query(`select submit_answer('t-old', '"x"')`);
    expect(await coinsOf(BEN)).toBe(before + 5);
  });

  it('refuses tasks of the future and of the other class', async () => {
    await asUser(ANNA);
    await expectError(db.query(`select submit_answer('t-future', '"x"')`), /not available/);
    await expectError(db.query(`select submit_answer('t-8b', '"x"')`), /not for your class/);
  });

  it('stops at the daily task limit', async () => {
    await asSuperuser(`update settings set daily_task_cap = 15 where id = 1`);
    await asUser(CARLA);
    await db.query(`select submit_answer('t-gap', '"went"')`); // 10 coins today
    await expectError(db.query(`select submit_answer('t-order', '["a","b","c"]')`), /daily limit/);
    await asSuperuser(`update settings set daily_task_cap = 60 where id = 1`);
  });

  it('never returns the solution to a client that reads the table directly', async () => {
    await asUser(ANNA);
    await expectError(db.query('select solution from task_solutions'), /permission denied/);
  });
});
