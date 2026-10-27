// L1: season control for teachers — listing, date rules, start/end and the class overview.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { PIN_SEASON_CLOCK, type Obj } from './seasonClock';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const MIGRATIONS = [
  '0001_schema.sql', '0002_rls.sql', '0003_seed.sql', '0004_rpc_teacher.sql',
  '0005_grants_hardening.sql', '0006_avatar_shop_build.sql', '0007_tasks_rpc.sql',
  '0008_teacher_stats_catalog.sql', '0009_instances.sql', '0010_layout_maps.sql',
  '0011_instance_rules.sql', '0012_claim_plot.sql', '0013_plot_slots.sql',
  '0014_cat_sign_shop_asset.sql', '0015_daily_quests.sql', '0016_daily_quests_rpc.sql',
  '0017_daily_quests_teacher.sql', '0018_character_choice.sql', '0019_first_login_tutorial.sql',
  '0020_xp_levels.sql', '0021_tutorial_tap_questions.sql', '0022_teacher_overhaul.sql',
  '0023_avatar_wardrobe.sql', '0024_four_daily_quests.sql', '0025_economy_balance.sql',
  '0026_shared_avatar_accessories.sql', '0027_public_visitor_profiles.sql',
  '0028_seasons.sql', '0029_season_rpc.sql', '0030_season_content.sql', '0031_season_shop.sql',
  '0032_season_teacher.sql',
];
const dir = new URL('../../../supabase/migrations/', import.meta.url);
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000021';
const B = '00000000-0000-0000-0000-000000000022';
const SEASON = '2026-11-halloween';

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

let db: PGlite;

async function asTeacher(): Promise<void> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${T}',false); set role authenticated;`);
}

describe('teacher season control', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(PIN_SEASON_CLOCK);
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;
      insert into auth.users values('${T}'),('${A}'),('${B}') on conflict do nothing;
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index) values
        ('${A}','anna','8a',0),('${B}','ben','8a',1) on conflict do nothing;
      update public.seasons set starts_on = date '2026-10-28', ends_on = date '2026-12-06';`);
  }, 90000);

  afterAll(async () => {
    await db?.close();
  });

  it('lists seasons and rejects invalid dates', async () => {
    await asTeacher();
    const list = (await db.query<{ v: Obj[] }>('select public.teacher_seasons() v')).rows[0].v;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: SEASON, state: 'planned', tiers: 40, items: 40 });
    await expect(
      db.query("select public.teacher_set_season_dates($1, date '2026-10-22', date '2026-10-28')", [SEASON]),
    ).rejects.toThrow(/Sunday/);
    await expect(db.query('select public.teacher_start_season_now($1)', ['nope'])).rejects.toThrow(/not found/);
  });

  it('starts a planned season today', async () => {
    await asTeacher();
    const list = (await db.query<{ v: Obj[] }>('select public.teacher_start_season_now($1) v', [SEASON])).rows[0].v;
    expect(list[0].state).toBe('running');
    const row = (await db.query<{ starts_on: string }>('select starts_on::text from public.seasons where id = $1', [SEASON]))
      .rows[0];
    expect(row.starts_on).toBe('2026-10-27');
  });

  it('reports the class overview and ends the season with automatic credit', async () => {
    await asTeacher();
    await db.query("select public.teacher_set_season_dates($1, date '2026-10-22', date '2026-11-01')", [SEASON]);
    await db.exec(`reset role;
      insert into public.xp_ledger(player_id,delta,reason,ref,created_at)
      values('${A}',300,'quest','teacher-seed','2026-10-25 12:00+02');`);
    await asTeacher();
    const overview = (await db.query<{ v: { season: Obj; pupils: Obj[] } }>('select public.teacher_season_overview($1,$2) v', ['8a', SEASON]))
      .rows[0].v;
    expect(overview.season.state).toBe('running');
    const anna = overview.pupils.find((p: Obj) => p.nickname === 'anna');
    expect(anna).toMatchObject({ xp: 300, tier: 10, claims: 0 });
    expect(overview.pupils.find((p: Obj) => p.nickname === 'ben')).toMatchObject({ xp: 0, tier: 0 });

    const ended = (await db.query<{ v: Obj[] }>('select public.teacher_end_season_now($1) v', [SEASON])).rows[0].v;
    expect(ended[0].state).toBe('closed');
    const claims = (await db.query<{ n: number }>(
      "select count(*)::int n from public.season_claims where player_id = $1 and season = $2",
      [A, SEASON],
    )).rows[0].n;
    expect(claims).toBe(10);
    await expect(
      db.query("select public.teacher_set_season_dates($1, date '2026-10-22', date '2026-11-08')", [SEASON]),
    ).rejects.toThrow(/closed/);
    const log = (await db.query<{ v: Obj[] }>('select public.teacher_season_changes($1) v', [SEASON])).rows[0].v;
    const actions = log.map((entry) => entry.action);
    expect(actions).toEqual(expect.arrayContaining(['start', 'dates', 'end', 'close']));
  });

  it('ends a season on its start day without a date error (review W5)', async () => {
    await db.exec(`reset role;
      insert into public.seasons(id,label,theme,starts_on,ends_on)
      values('2027-test','Test','test',date '2026-10-27',date '2026-11-29');`);
    await asTeacher();
    const list = (await db.query<{ v: Obj[] }>('select public.teacher_end_season_now($1) v', ['2027-test'])).rows[0].v;
    expect(list.find((s) => s.id === '2027-test')).toMatchObject({ state: 'closed', ends_on: '2026-10-27' });
    await db.exec(`reset role; delete from public.seasons where id = '2027-test';`);
  });
});
