// SQL tests for the Season I schema and content (0028, 0030).
// Plan: docs/superpowers/plans/2026-10-27-season-und-learnpass.md §3.1, §7.1
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';

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
  '0020_xp_levels.sql',
  '0021_tutorial_tap_questions.sql',
  '0022_teacher_overhaul.sql',
  '0023_avatar_wardrobe.sql',
  '0024_four_daily_quests.sql',
  '0025_economy_balance.sql',
  '0026_shared_avatar_accessories.sql',
  '0027_public_visitor_profiles.sql',
  '0028_seasons.sql',
  '0030_season_content.sql',
];

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const ANNA = '00000000-0000-0000-0000-000000000011';

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
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;

let db: PGlite;

describe('season schema and content', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) {
      await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    }
    await db.exec(SUPABASE_DEFAULT_GRANTS);
  }, 60000);

  afterEach(async () => {
    await db.exec('reset role;');
  });

  afterAll(async () => {
    await db?.close();
  });

  it('creates the season with a Sunday end inside the window', async () => {
    const rows = await db.query<{ id: string; starts_on: string; ends_on: string }>(
      'select id, starts_on::text, ends_on::text from public.seasons',
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].id).toBe('2026-11-halloween');
    expect(rows.rows[0].starts_on).toBe('2026-10-28');
    expect(rows.rows[0].ends_on).toBe('2026-12-06');
  });

  it('keeps the end after the start (Sunday is enforced by the teacher RPC)', async () => {
    await expect(
      db.query(
        "insert into public.seasons(id,label,theme,starts_on,ends_on) values('x','x','x','2026-12-05','2026-12-04')",
      ),
    ).rejects.toThrow();
    await db.exec(
      "insert into public.seasons(id,label,theme,starts_on,ends_on) values('x','x','x','2026-11-01','2026-11-04')",
    );
    await db.exec("delete from public.seasons where id = 'x'");
  });

  it('has 40 tiers ending at 3000 XP with 300 coins and 8 chests', async () => {
    const r = await db.query<{ tiers: number; max_xp: number; coins: number; chests: number }>(
      `select count(*)::int as tiers, max(xp)::int as max_xp,
              sum(coins)::int as coins, count(*) filter (where chest)::int as chests
       from public.season_tiers where season = '2026-11-halloween'`,
    );
    expect(r.rows[0]).toMatchObject({ tiers: 40, max_xp: 3000, coins: 300, chests: 8 });
  });

  it('carries 12 scenes, 4 titles, 4 frames and the free choice on tier 40', async () => {
    const r = await db.query<{
      scenes: number;
      titles: number;
      frames: number;
      choices: number;
      tier40: string;
    }>(
      `select
         (select count(*)::int from public.items where season = '2026-11-halloween' and model like 'scene/%') as scenes,
         (select count(*)::int from public.season_tiers where season = '2026-11-halloween' and title_id is not null) as titles,
         (select count(*)::int from public.season_tiers where season = '2026-11-halloween' and frame_id is not null) as frames,
         (select count(*)::int from public.season_tiers where season = '2026-11-halloween' and choice) as choices,
         (select to_char(xp, 'FM9999') from public.season_tiers where season = '2026-11-halloween' and tier = 40) as tier40`,
    );
    expect(r.rows[0]).toMatchObject({ scenes: 12, titles: 4, frames: 4, choices: 1, tier40: '3000' });
  });

  it('puts exactly 28 items into the chest pool', async () => {
    const r = await db.query<{ pool: number }>(
      `select count(*)::int as pool from public.items
       where season = '2026-11-halloween' and lootbox_weight > 0 and shop_visible = false`,
    );
    expect(r.rows[0].pool).toBe(28);
  });

  it('gives every chest pool item an existing model file path', async () => {
    const r = await db.query<{ model: string }>(
      `select model from public.items where season = '2026-11-halloween' and lootbox_weight > 0`,
    );
    for (const row of r.rows) expect(row.model).toMatch(/^season1\/[a-z0-9-]+\.glb$/);
  });

  it('does not let an authenticated user write season tables directly', async () => {
    await db.exec(`insert into auth.users values('${ANNA}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index) values('${ANNA}','anna','8a',0)
      on conflict do nothing;
      select set_config('request.jwt.claim.sub','${ANNA}',false); set role authenticated;`);

    const before = await db.query<{ coins: number }>(
      "select coins from public.season_tiers where season = '2026-11-halloween' and tier = 1",
    );
    const updated = await db.query(
      "update public.season_tiers set coins = 999 where season = '2026-11-halloween' and tier = 1",
    );
    expect(updated.affectedRows ?? 0).toBe(0);
    const after = await db.query<{ coins: number }>(
      "select coins from public.season_tiers where season = '2026-11-halloween' and tier = 1",
    );
    expect(after.rows[0].coins).toBe(before.rows[0].coins);

    await expect(
      db.query(
        "insert into public.season_chests(player_id,season,source,ref) values($1,'2026-11-halloween','shop','x')",
        [ANNA],
      ),
    ).rejects.toThrow();
  });

  it('keeps the coin ledger able to book season and sell entries', async () => {
    await db.exec('reset role;');
    await db.query(
      "insert into public.coin_ledger(player_id,delta,reason,ref) values($1,40,'season','season_chest:1')",
      [ANNA],
    );
    await db.query("insert into public.coin_ledger(player_id,delta,reason,ref) values($1,15,'sell','season_bat')", [
      ANNA,
    ]);
    const r = await db.query<{ n: number }>(
      "select count(*)::int as n from public.coin_ledger where player_id = $1 and reason in ('season','sell')",
      [ANNA],
    );
    expect(r.rows[0].n).toBe(2);
  });
});
