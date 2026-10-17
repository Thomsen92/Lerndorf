// SQL tests for migration 0010 (SPEC §10.1): template per instance, set_layout.
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
      ('${ANNA}', 'anna', 'student', '8a', 0, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('map templates', () => {
  it('both classes start with the template tal', async () => {
    await asSuperuser('');
    const r = await db.query<{ map_id: string }>(`select map_id from classes order by id`);
    expect(r.rows.map((x) => x.map_id)).toEqual(['tal', 'tal']);
  });

  it('set_layout sets template and seed of one class', async () => {
    await asUser(TEACHER);
    await db.query(`select set_layout('8a', 'fluss_mitte', 77)`);
    await db.query(`select set_layout('8b', 'bach_norden', 88)`);
    await asSuperuser('');
    const r = await db.query<{ id: string; map_id: string; layout_seed: number }>(
      `select id, map_id, layout_seed from classes order by id`,
    );
    expect(r.rows).toEqual([
      { id: '8a', map_id: 'fluss_mitte', layout_seed: 77 },
      { id: '8b', map_id: 'bach_norden', layout_seed: 88 },
    ]);
  });

  it('refuses an unknown template', async () => {
    await asUser(TEACHER);
    await expect(db.query(`select set_layout('8a', 'gibt_es_nicht', 5)`)).rejects.toThrow(
      /foreign key|violates/,
    );
  });

  it('refuses a bad seed and pupils', async () => {
    await asUser(TEACHER);
    await expect(db.query(`select set_layout('8a', 'tal', 0)`)).rejects.toThrow(/between 1 and 99999/);
    await asUser(ANNA);
    await expect(db.query(`select set_layout('8a', 'tal', 5)`)).rejects.toThrow(/forbidden/);
  });
});
