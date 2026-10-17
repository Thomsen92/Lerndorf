// SQL tests for migration 0011: the teacher sets rules and shop switches per instance.
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
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011';

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
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', 0, 500);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('instance rules', () => {
  it('the teacher sets the rules of one class only', async () => {
    await asUser(TEACHER);
    await db.query(`select set_class_rules('8a', 80, 40, 2, 8, 6)`);
    await asSuperuser('');
    const r = await db.query<Record<string, number>>(
      `select stamp_reward, daily_task_cap, max_attempts, plot_cols, plot_rows from classes where id = '8a'`,
    );
    expect(r.rows[0]).toEqual({
      stamp_reward: 80,
      daily_task_cap: 40,
      max_attempts: 2,
      plot_cols: 8,
      plot_rows: 6,
    });
    const other = await db.query<{ stamp_reward: number }>(
      `select stamp_reward from classes where id = '8b'`,
    );
    expect(other.rows[0].stamp_reward).toBe(100);
  });

  it('refuses out-of-range values and pupils', async () => {
    await asUser(TEACHER);
    await expect(db.query(`select set_class_rules('8a', 80, 40, 0, 8, 6)`)).rejects.toThrow(/attempts/);
    await expect(db.query(`select set_class_rules('8a', 80, 40, 2, 2, 6)`)).rejects.toThrow(/grid/);
    await asUser(ANNA);
    await expect(db.query(`select set_class_rules('8a', 999, 40, 2, 8, 6)`)).rejects.toThrow(/forbidden/);
  });

  it('a hidden item cannot be bought in that instance, and showing it again works', async () => {
    await asUser(TEACHER);
    await db.query(`select set_item_sold('8a', 'deco_bench', false)`);
    await asUser(ANNA);
    await expect(db.query(`select buy_item('deco_bench')`)).rejects.toThrow(/not sold in this class/);
    await asUser(TEACHER);
    await db.query(`select set_item_sold('8a', 'deco_bench', true)`);
    await asUser(ANNA);
    await db.query(`select buy_item('deco_bench')`);
  });

  it('a pupil cannot change the shop', async () => {
    await asUser(ANNA);
    await expect(db.query(`select set_item_sold('8a', 'deco_bench', false)`)).rejects.toThrow(/forbidden/);
  });
});
