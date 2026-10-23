// SQL tests for migration 0018: a pupil picks boy or girl; classmates see the choice.
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
  '0018_character_choice.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';
const CARLA = '00000000-0000-0000-0000-000000000013';
const TEACHER = '00000000-0000-0000-0000-000000000001';

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
    insert into auth.users (id) values ('${ANNA}'), ('${BEN}'), ('${CARLA}'), ('${TEACHER}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${ANNA}', 'anna', 'student', '8a', 0, 0),
      ('${BEN}', 'ben', 'student', '8a', null, 0),
      ('${CARLA}', 'carla', 'student', '8b', null, 0),
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0);
    update profiles set avatar = '{"skin": 2}' where id = '${ANNA}';
  `);
});

afterAll(async () => {
  await db.close();
});

describe('set_character', () => {
  it('stores the choice and keeps the rest of the avatar', async () => {
    await asUser(ANNA);
    const r = await db.query<{ a: Record<string, unknown> }>("select public.set_character('girl') as a");
    expect(r.rows[0].a).toEqual({ skin: 2, character: 'girl' });
  });
  it('can be changed later', async () => {
    await asUser(ANNA);
    await db.query("select public.set_character('boy')");
    await asSuperuser('');
    const r = await db.query<{ c: string }>(`select avatar->>'character' as c from profiles where id = '${ANNA}'`);
    expect(r.rows[0].c).toBe('boy');
  });
  it('classmates see it in village_members', async () => {
    await asUser(BEN);
    const r = await db.query<{ nickname: string; c: string | null }>(
      "select nickname, avatar->>'character' as c from public.village_members() order by nickname",
    );
    expect(r.rows.find((x) => x.nickname === 'anna')?.c).toBe('boy');
  });
  it('rejects unknown figures, teachers and anonymous calls', async () => {
    await asUser(BEN);
    await expect(db.query("select public.set_character('robot')")).rejects.toThrow(/unknown character/);
    await asUser(TEACHER);
    await expect(db.query("select public.set_character('boy')")).rejects.toThrow(/only pupils/);
    await db.exec('reset role; set role anon;');
    await expect(db.query("select public.set_character('boy')")).rejects.toThrow(/permission denied/);
  });
});
