// SQL tests for migration 0019 (part 4): tutorial_buy_house, tutorial_place_house, tutorial_finish.
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
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011'; // step buy, 50 coins
const BEN = '00000000-0000-0000-0000-000000000012'; // step quiz
const CARLA = '00000000-0000-0000-0000-000000000013'; // classmate, finished
const DAN = '00000000-0000-0000-0000-000000000014'; // step buy, 0 coins
const EVA = '00000000-0000-0000-0000-000000000015'; // not a tutorial pupil, 50 coins, tries the shop
const FINN = '00000000-0000-0000-0000-000000000016'; // 8b, classmate of nobody

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
const SUPABASE_DEFAULT_PRIVILEGES = `
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated;
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
const expectError = async (sql: string, message: RegExp, code?: string): Promise<void> => {
  try {
    await db.query(sql);
  } catch (e) {
    expect((e as Error).message).toMatch(message);
    if (code) expect((e as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected an error for: ${sql}`);
};
const step = async (uid: string): Promise<string> => {
  await asSuperuser('');
  const r = await db.query<{ step: string }>(`select step from tutorial_progress where player_id = '${uid}'`);
  return r.rows[0].step;
};
const coins = async (uid: string): Promise<number> => {
  await asSuperuser('');
  const r = await db.query<{ coins: number }>(`select coins from profiles where id = '${uid}'`);
  return r.rows[0].coins;
};

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
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}'), ('${BEN}'), ('${CARLA}'),
      ('${DAN}'), ('${EVA}'), ('${FINN}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', 0, 50),
      ('${BEN}', 'ben', 'student', '8a', 1, 0),
      ('${CARLA}', 'carla', 'student', '8a', 2, 0),
      ('${DAN}', 'dan', 'student', '8a', 3, 0),
      ('${EVA}', 'eva', 'student', '8a', 4, 50),
      ('${FINN}', 'finn', 'student', '8b', 0, 0);
    insert into tutorial_progress (player_id, step, answered, reward_paid) values
      ('${ANNA}', 'buy', 5, true), ('${BEN}', 'quiz', 2, false), ('${DAN}', 'buy', 5, true),
      ('${EVA}', 'intro', 0, false);
    update classes set shop_open = false, build_open = false;
  `);
});

afterAll(async () => {
  await db.close();
});

describe('tutorial_buy_house', () => {
  it('is refused outside the buy step', async () => {
    await asUser(BEN);
    await expectError('select tutorial_buy_house()', /not at this step/, '22023');
    await asUser(EVA);
    await expectError('select tutorial_buy_house()', /not at this step/, '22023');
  });

  it('the teacher cannot buy', async () => {
    await asUser(TEACHER);
    await expectError('select tutorial_buy_house()', /forbidden/, '42501');
  });

  it('refuses without enough coins and changes nothing', async () => {
    await asUser(DAN);
    await expectError('select tutorial_buy_house()', /not enough coins/, '22023');
    expect(await step(DAN)).toBe('buy');
  });

  it('buys the house for 50 with the shop closed: coins 0, inventory 1, step place', async () => {
    await asUser(ANNA);
    const r = await db.query<{ r: { coins: number; qty: number } }>('select tutorial_buy_house() as r');
    expect(r.rows[0].r).toEqual({ coins: 0, qty: 1 });
    expect(await coins(ANNA)).toBe(0);
    expect(await step(ANNA)).toBe('place');
    const inv = await db.query<{ qty: number }>(
      `select qty from inventory where player_id = '${ANNA}' and item_id = 'house_fachwerk'`,
    );
    expect(inv.rows[0].qty).toBe(1);
    const l = await db.query<{ delta: number; reason: string; ref: string }>(
      `select delta, reason, ref from coin_ledger where player_id = '${ANNA}' and reason = 'purchase'`,
    );
    expect(l.rows).toEqual([{ delta: -50, reason: 'purchase', ref: 'house_fachwerk' }]);
    const t = await db.query<{ house_bought: boolean }>(
      `select house_bought from tutorial_progress where player_id = '${ANNA}'`,
    );
    expect(t.rows[0].house_bought).toBe(true);
  });

  it('a second call charges nothing and keeps one copy', async () => {
    await asSuperuser(`update profiles set coins = 50 where id = '${ANNA}'`); // would be charged if buggy
    await asUser(ANNA);
    const r = await db.query<{ r: { coins: number; qty: number } }>('select tutorial_buy_house() as r');
    expect(r.rows[0].r).toEqual({ coins: 50, qty: 1 });
    await asSuperuser(`update profiles set coins = 0 where id = '${ANNA}'`);
    const l = await db.query(`select 1 from coin_ledger where player_id = '${ANNA}' and reason = 'purchase'`);
    expect(l.rows).toHaveLength(1);
    expect(await step(ANNA)).toBe('place');
  });

  it('the narrow exception stays narrow: buy_item still refuses with the shop closed', async () => {
    await asUser(EVA);
    await expectError(`select buy_item('house_fachwerk')`, /shop is closed/, '42501');
    await asUser(DAN);
    await expectError(`select buy_item('house_fachwerk')`, /shop is closed/, '42501');
  });
});

describe('tutorial_place_house', () => {
  it('is refused before the house is bought', async () => {
    await asUser(DAN);
    await expectError('select tutorial_place_house()', /not at this step/, '22023');
    await asUser(BEN);
    await expectError('select tutorial_place_house()', /not at this step/, '22023');
  });

  it('is refused without an assigned plot (22023), even with a bought house', async () => {
    await asSuperuser(`
      update profiles set plot_index = null where id = '${FINN}';
      insert into tutorial_progress (player_id, step, answered, reward_paid, house_bought)
        values ('${FINN}', 'place', 5, true, true);
      insert into inventory (player_id, item_id, qty) values ('${FINN}', 'house_fachwerk', 1);
    `);
    await asUser(FINN);
    await expectError('select tutorial_place_house()', /not at this step/, '22023');
    await asSuperuser(`
      delete from inventory where player_id = '${FINN}';
      delete from tutorial_progress where player_id = '${FINN}';
      update profiles set plot_index = 0 where id = '${FINN}';
    `);
  });

  it('place_in_slot and clear_slot stay closed while building is closed', async () => {
    await asUser(ANNA);
    await expectError(`select place_in_slot('house_fachwerk', 'house', 0)`, /building is closed/, '42501');
    await expectError(`select clear_slot('house')`, /building is closed/, '42501');
    await expectError(`select clear_slot('deco_1')`, /building is closed/, '42501');
  });

  it('places the house in slot house with building closed: step done, completed_at set', async () => {
    await asUser(ANNA);
    const r = await db.query<{ id: string }>('select tutorial_place_house() as id');
    expect(Number(r.rows[0].id)).toBeGreaterThan(0);
    await asSuperuser('');
    const p = await db.query<{ item_id: string; slot: string; rot: number }>(
      `select item_id, slot, rot from placements where player_id = '${ANNA}'`,
    );
    expect(p.rows).toEqual([{ item_id: 'house_fachwerk', slot: 'house', rot: 0 }]);
    const t = await db.query<{ step: string; completed_at: unknown }>(
      `select step, completed_at from tutorial_progress where player_id = '${ANNA}'`,
    );
    expect(t.rows[0].step).toBe('done');
    expect(t.rows[0].completed_at).not.toBeNull();
  });

  it('the ruin disappears for classmates: the placement row is readable through RLS', async () => {
    await asUser(CARLA);
    const r = await db.query<{ player_id: string; item_id: string; slot: string }>(
      `select player_id, item_id, slot from placements where player_id = '${ANNA}'`,
    );
    expect(r.rows).toEqual([{ player_id: ANNA, item_id: 'house_fachwerk', slot: 'house' }]);
    // the other class sees nothing of it
    await asUser(FINN);
    const other = await db.query(`select 1 from placements where player_id = '${ANNA}'`);
    expect(other.rows).toHaveLength(0);
  });

  it('placing again is a harmless repeat (same placement, still one row)', async () => {
    await asUser(ANNA);
    await db.query('select tutorial_place_house()');
    await asSuperuser('');
    const p = await db.query(`select 1 from placements where player_id = '${ANNA}' and slot = 'house'`);
    expect(p.rows).toHaveLength(1);
  });

  it('afterwards tutorial_state says not needed, and building stays closed', async () => {
    await asUser(ANNA);
    const s = await db.query<{ s: { needed: boolean; step: string } }>('select tutorial_state() as s');
    expect(s.rows[0].s).toMatchObject({ needed: false, step: 'done' });
    await expectError(`select place_in_slot('house_fachwerk', 'house', 0)`, /building is closed/, '42501');
    await expectError(`select clear_slot('house')`, /building is closed/, '42501');
  });
});

describe('tutorial_finish', () => {
  it('is refused before the tutorial is done', async () => {
    await asUser(BEN);
    await expectError('select tutorial_finish()', /not at this step/, '22023');
  });

  it('is idempotent once done', async () => {
    await asUser(ANNA);
    const a = await db.query<{ s: { needed: boolean; step: string } }>('select tutorial_finish() as s');
    const b = await db.query<{ s: { needed: boolean; step: string } }>('select tutorial_finish() as s');
    expect(a.rows[0].s).toMatchObject({ needed: false, step: 'done' });
    expect(b.rows[0].s).toEqual(a.rows[0].s);
  });
});
