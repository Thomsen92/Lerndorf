// SQL tests for migration 0013: fixed plot slots (docs/ASSET_VERTRAG.md).
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
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
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
const asSuperuser = async (sql: string): Promise<void> => {
  await db.exec(`reset role; ${sql}`);
};
const asUser = async (uid: string): Promise<void> => {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
};

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    if (file === '0002_rls.sql') await db.exec(SUPABASE_DEFAULT_GRANTS);
    await db.exec(sql);
  }
  await asSuperuser(`
    insert into auth.users (id) values ('${ANNA}'), ('${BEN}'), ('${CARLA}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${ANNA}', 'anna', 'student', '8a', 0, 2000),
      ('${BEN}', 'ben', 'student', '8a', 1, 0),
      ('${CARLA}', 'carla', 'student', '8b', 0, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

const fail = (sql: string, pattern: RegExp): Promise<void> => expect(db.query(sql)).rejects.toThrow(pattern);
const slotsOf = async (uid: string): Promise<Record<string, string>> => {
  await asSuperuser('');
  const r = await db.query<{ slot: string; item_id: string }>(
    `select slot, item_id from placements where player_id = '${uid}'`,
  );
  return Object.fromEntries(r.rows.map((x) => [x.slot, x.item_id]));
};

describe('catalogue', () => {
  it('has starter house and garage, cars and 3x3 decorations', async () => {
    await asSuperuser('');
    const r = await db.query<{ id: string; kind: string; starter: boolean; footprint: number[] }>(
      `select id, kind, starter, footprint from items where kind in ('house', 'garage', 'car', 'deco')`,
    );
    const by = new Map(r.rows.map((x) => [x.id, x]));
    expect(by.get('house_fachwerk')?.starter).toBe(true);
    expect(by.get('garage_holz')?.starter).toBe(true);
    expect(r.rows.filter((x) => x.kind === 'car').length).toBeGreaterThan(0);
    for (const x of r.rows.filter((x) => x.kind === 'deco')) expect(x.footprint).toEqual([3, 3]);
  });
});

describe('place_in_slot', () => {
  it('sets the starter house without owning a copy', async () => {
    await asUser(ANNA);
    await db.query(`select place_in_slot('house_fachwerk', 'house', 0)`);
    expect((await slotsOf(ANNA)).house).toBe('house_fachwerk');
  });

  it('refuses an item that does not fit the slot', async () => {
    await asUser(ANNA);
    await asSuperuser(
      `insert into inventory (player_id, item_id, qty) values ('${ANNA}', 'deco_bench', 2), ('${ANNA}', 'car_kleinwagen', 1)`,
    );
    await asUser(ANNA);
    await fail(`select place_in_slot('deco_bench', 'car', 0)`, /does not fit/);
    await fail(`select place_in_slot('car_kleinwagen', 'deco_1', 0)`, /does not fit/);
    await fail(`select place_in_slot('garage_holz', 'house', 0)`, /does not fit/);
    await fail(`select place_in_slot('hair_01', 'deco_1', 0)`, /does not fit/);
    await fail(`select place_in_slot('deco_bench', 'garden', 0)`, /unknown slot/);
  });

  it('turns decorations in quarter turns, but nothing else', async () => {
    await asUser(ANNA);
    await db.query(`select place_in_slot('deco_bench', 'deco_1', 3)`);
    await fail(`select place_in_slot('car_kleinwagen', 'car', 1)`, /rotation/);
    await fail(`select place_in_slot('deco_bench', 'deco_2', 4)`, /rotation/);
  });

  it('needs a free copy for every pedestal', async () => {
    await asUser(ANNA);
    await db.query(`select place_in_slot('deco_bench', 'deco_2', 0)`); // second copy
    await fail(`select place_in_slot('deco_bench', 'deco_3', 0)`, /no free copy/);
    // turning the same item on its own pedestal does not need another copy
    await db.query(`select place_in_slot('deco_bench', 'deco_2', 1)`);
  });

  it('exchanging a slot gives the old item back and keeps the other slots', async () => {
    await asUser(ANNA);
    await db.query(`select buy_item('house_villa')`);
    await db.query(`select place_in_slot('car_kleinwagen', 'car', 0)`);
    const before = await slotsOf(ANNA);
    await asUser(ANNA);
    await db.query(`select place_in_slot('house_villa', 'house', 0)`);
    const after = await slotsOf(ANNA);
    expect(after.house).toBe('house_villa');
    expect({ ...after, house: undefined }).toEqual({ ...before, house: undefined });
    await asUser(ANNA);
    await db.query(`select place_in_slot('house_fachwerk', 'house', 0)`); // starter again: no copy needed
  });

  it('a slot holds one item only', async () => {
    await asSuperuser('');
    const r = await db.query<{ n: number }>(
      `select count(*)::int as n from placements where player_id = '${ANNA}' and slot = 'house'`,
    );
    expect(r.rows[0].n).toBe(1);
  });

  it('refuses items the pupil does not own and works only on the own plot', async () => {
    await asUser(BEN);
    await fail(`select place_in_slot('car_camper', 'car', 0)`, /no free copy/);
    await db.query(`select place_in_slot('garage_holz', 'garage', 0)`);
    expect((await slotsOf(ANNA)).garage).toBeUndefined();
  });

  it('refuses building while the build mode is closed', async () => {
    await asSuperuser(`update classes set build_open = false where id = '8a'`);
    await asUser(ANNA);
    await fail(`select place_in_slot('deco_bench', 'deco_4', 0)`, /building is closed/);
    await asSuperuser(`update classes set build_open = true where id = '8a'`);
  });
});

describe('clear_slot', () => {
  it('clears a decoration and the car, never house or garage', async () => {
    await asUser(ANNA);
    await db.query(`select clear_slot('deco_1')`);
    await db.query(`select clear_slot('car')`);
    await fail(`select clear_slot('house')`, /cannot be empty/);
    await fail(`select clear_slot('garage')`, /cannot be empty/);
    const s = await slotsOf(ANNA);
    expect(s.deco_1).toBeUndefined();
    expect(s.car).toBeUndefined();
    expect(s.house).toBe('house_fachwerk');
  });
});

describe('buy_item', () => {
  it('sells a house, a garage or a car only once, decorations many times', async () => {
    await asUser(ANNA);
    await fail(`select buy_item('house_villa')`, /already owned/);
    await db.query(`select buy_item('deco_gnome')`);
    await db.query(`select buy_item('deco_gnome')`);
    await fail(`select buy_item('house_fachwerk')`, /starter/);
  });
});

describe('placements are shared in the class', () => {
  it('classmates see each other, the other class sees nothing', async () => {
    await asUser(BEN);
    const r = await db.query<{ player_id: string }>('select distinct player_id from placements');
    expect(r.rows.map((x) => x.player_id).sort()).toEqual([ANNA, BEN].sort());
    await asUser(CARLA);
    const c = await db.query('select * from placements');
    expect(c.rows.length).toBe(0);
  });
});
