// SQL tests for migration 0012: a pupil without a plot chooses a free one, once.
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
      ('${ANNA}', 'anna', 'student', '8a', 0, 0),
      ('${BEN}', 'ben', 'student', '8a', null, 0),
      ('${CARLA}', 'carla', 'student', '8b', null, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('claim_plot', () => {
  it('a pupil without a plot takes a free one', async () => {
    await asUser(BEN);
    await db.query(`select claim_plot(5)`);
    await asSuperuser('');
    const r = await db.query<{ plot_index: number }>(`select plot_index from profiles where id = '${BEN}'`);
    expect(r.rows[0].plot_index).toBe(5);
  });

  it('the choice is final: a second claim is refused', async () => {
    await asUser(BEN);
    await expect(db.query(`select claim_plot(6)`)).rejects.toThrow(/already chosen/);
  });

  it('a taken plot cannot be claimed by someone else of the class', async () => {
    await asSuperuser(`update profiles set plot_index = null where id = '${BEN}'`);
    await asUser(BEN);
    await expect(db.query(`select claim_plot(0)`)).rejects.toThrow(/taken/);
  });

  it('plots outside the village are refused', async () => {
    await asUser(BEN);
    await expect(db.query(`select claim_plot(34)`)).rejects.toThrow(/out of range/);
    await expect(db.query(`select claim_plot(-1)`)).rejects.toThrow(/out of range/);
  });

  it('a plot of the other class is not taken: 8b can choose plot 0', async () => {
    await asUser(CARLA);
    await db.query(`select claim_plot(0)`);
    await asSuperuser('');
    const r = await db.query<{ plot_index: number }>(`select plot_index from profiles where id = '${CARLA}'`);
    expect(r.rows[0].plot_index).toBe(0);
  });

  it('the teacher role cannot claim', async () => {
    await asSuperuser(`insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001')`);
    await asSuperuser(
      `insert into profiles (id, nickname, role, class_id, plot_index, coins) values ('00000000-0000-0000-0000-000000000001', 'lehrkraft', 'teacher', null, null, 0)`,
    );
    await asUser('00000000-0000-0000-0000-000000000001');
    await expect(db.query(`select claim_plot(9)`)).rejects.toThrow(/forbidden/);
  });
});
