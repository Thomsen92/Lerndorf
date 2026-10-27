// Smoke tests for the Season I RPCs (0029). The full 10-case suite follows in S4.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import type { ClaimResult, SeasonState } from '../../src/api/season';
import { PIN_SEASON_CLOCK, type Obj } from './seasonClock';
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
  '0029_season_rpc.sql',
  '0030_season_content.sql',
];

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const A = '00000000-0000-0000-0000-000000000011';
const T = '00000000-0000-0000-0000-000000000001';

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

async function asAnna(): Promise<void> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
}

describe('season RPCs', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(PIN_SEASON_CLOCK);
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;`);
    // Put the season around "today" so the running state can be tested deterministically.
    await db.exec(`update public.seasons set starts_on = date '2026-10-22', ends_on = date '2026-11-01';`);
    await db.exec(`insert into auth.users values('${A}'),('${T}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index) values('${A}','anna','8a',0) on conflict do nothing;
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher') on conflict do nothing;
      insert into public.xp_ledger(player_id,delta,reason,ref) values('${A}',300,'quest','seed');`);
  }, 60000);

  afterEach(async () => {
    await db.exec('reset role;');
  });

  afterAll(async () => {
    await db?.close();
  });

  it('reports state, xp and tier', async () => {
    await asAnna();
    const r = await db.query<{ v: SeasonState }>('select public.season_state() v');
    const s = r.rows[0].v;
    expect(s.season.state).toBe('running');
    expect(s.xp).toBe(300);
    expect(s.tier).toBe(10);
    expect(s.tiers).toHaveLength(40);
    expect(s.next?.tier).toBe(11);
  });

  it('claims a tier once with all rewards', async () => {
    await asAnna();
    const r = await db.query<{ v: ClaimResult }>('select public.claim_season_tier(5) v');
    expect(r.rows[0].v.rewards.coins).toBe(30);
    expect(r.rows[0].v.rewards.chest).toBe(true);
    await expect(db.query('select public.claim_season_tier(5)')).rejects.toThrow(/already claimed/);
    const state = (await db.query<{ v: SeasonState }>('select public.season_state() v')).rows[0].v;
    expect(state.chests.pass).toBe(1);
  });

  it('refuses a claim below the xp threshold', async () => {
    await asAnna();
    await expect(db.query('select public.claim_season_tier(20)')).rejects.toThrow(/xp missing/);
  });

  it('sells a chest twice a week and refuses the third', async () => {
    await db.exec(`reset role; update public.profiles set coins = 200 where id = '${A}';`);
    await asAnna();
    expect((await db.query<{ v: Obj }>('select public.buy_season_chest() v')).rows[0].v.left).toBe(1);
    expect((await db.query<{ v: Obj }>('select public.buy_season_chest() v')).rows[0].v.left).toBe(0);
    await expect(db.query('select public.buy_season_chest()')).rejects.toThrow(/weekly limit/);
  });

  it('opens a chest once and returns the same result afterwards', async () => {
    await asAnna();
    const id = (await db.query<{ id: string }>("select id from public.season_chests where player_id = $1 limit 1", [A]))
      .rows[0].id;
    const first = (await db.query<{ v: Obj }>('select public.open_season_chest($1) v', [Number(id)])).rows[0].v;
    expect(['common', 'rare', 'epic', 'legendary']).toContain(first.rarity);
    const again = (await db.query<{ v: Obj }>('select public.open_season_chest($1) v', [Number(id)])).rows[0].v;
    expect(again.reopened).toBe(true);
    expect(again.item_id).toBe(first.item_id);
  });

  it('chooses a tier-40 item once', async () => {
    await db.exec(`reset role; insert into public.xp_ledger(player_id,delta,reason,ref)
      values('${A}',2700,'quest','bulk');`);
    await asAnna();
    await db.query('select public.claim_season_tier(40)');
    const item = (await db.query<{ id: string }>(
      "select id from public.items where season = '2026-11-halloween' and lootbox_weight > 0 limit 1",
    )).rows[0].id;
    const r = (await db.query<{ v: Obj }>('select public.choose_season_item($1) v', [item])).rows[0].v;
    expect(r.chosen).toBe(item);
    await expect(db.query('select public.choose_season_item($1)', [item])).rejects.toThrow(/already chosen/);
  });

  it('counts the chest streak on three calendar days', async () => {
    await db.exec(`reset role; select public.season_streak_touch('${A}', date '2026-10-24');
      select public.season_streak_touch('${A}', date '2026-10-25');
      select public.season_streak_touch('${A}', date '2026-10-26');`);
    const n = (await db.query<{ n: number }>(
      "select count(*)::int n from public.season_chests where player_id = $1 and source = 'streak'",
      [A],
    )).rows[0].n;
    expect(n).toBe(1);
    await db.exec(`select public.season_streak_touch('${A}', date '2026-10-26');`);
    const again = (await db.query<{ n: number }>(
      "select count(*)::int n from public.season_chests where player_id = $1 and source = 'streak'",
      [A],
    )).rows[0].n;
    expect(again).toBe(1);
  });
});
