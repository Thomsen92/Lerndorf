// Edge cases for the Season I RPCs: states, season end, selling, tier-40 choice, streak reset,
// shop window and the chest odds. Complements season-rpc.test.ts (smoke) as package S4.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

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
  '0028_seasons.sql', '0029_season_rpc.sql', '0030_season_content.sql',
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

describe('season edge cases', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;
      insert into auth.users values('${A}'),('${T}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index) values('${A}','anna','8a',0) on conflict do nothing;
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher') on conflict do nothing;`);
  }, 60000);

  beforeEach(async () => {
    await db.exec(`reset role;
      delete from public.season_claims; delete from public.season_chests; delete from public.season_streaks;
      delete from public.player_rewards; delete from public.inventory; delete from public.placements;
      delete from public.coin_ledger; delete from public.xp_ledger;
      update public.profiles set coins = 0 where id = '${A}';
      update public.seasons set starts_on = date '2026-10-22', ends_on = date '2026-11-01', closed_at = null;`);
  });

  afterEach(async () => {
    await db.exec('reset role;');
  });

  afterAll(async () => {
    await db?.close();
  });

  it('reports upcoming and refuses claims before the start', async () => {
    await db.exec("update public.seasons set starts_on = date '2026-11-05', ends_on = date '2026-11-08';");
    await db.exec(`insert into public.xp_ledger(player_id,delta,reason,ref) values('${A}',300,'quest','seed');`);
    await asAnna();
    const s = (await db.query<{ v: any }>('select public.season_state() v')).rows[0].v;
    expect(s.season.state).toBe('upcoming');
    // XP only counts inside the season window (plan E3).
    expect(s.tier).toBe(0);
    await expect(db.query('select public.claim_season_tier(5)')).rejects.toThrow(/season not started/);
  });

  it('credits reached tiers once when the season has ended', async () => {
    await db.exec("update public.seasons set starts_on = date '2026-10-19', ends_on = date '2026-10-25';");
    await db.exec(`insert into public.xp_ledger(player_id,delta,reason,ref,created_at)
      values('${A}',300,'quest','seed','2026-10-20 12:00+02');`);
    await asAnna();
    const first = (await db.query<{ v: any }>('select public.season_state() v')).rows[0].v;
    expect(first.season.state).toBe('ended');
    const claims = (await db.query<{ n: number }>(
      "select count(*)::int n from public.season_claims where player_id = $1 and season = '2026-11-halloween'",
      [A],
    )).rows[0].n;
    expect(claims).toBe(10);
    const coins = (await db.query<{ coins: number }>('select coins from public.profiles where id = $1', [A])).rows[0]
      .coins;
    await db.query('select public.season_state()');
    const claimsAgain = (await db.query<{ n: number }>(
      "select count(*)::int n from public.season_claims where player_id = $1",
      [A],
    )).rows[0].n;
    expect(claimsAgain).toBe(10);
    expect(
      (await db.query<{ coins: number }>('select coins from public.profiles where id = $1', [A])).rows[0].coins,
    ).toBe(coins);
  });

  it('refuses to sell placed copies, non-season items and too many copies', async () => {
    await db.exec(`insert into public.inventory(player_id,item_id,qty) values('${A}','season_bat',1);
      insert into public.placements(player_id,item_id,slot) values('${A}','season_bat','deco_1');`);
    await asAnna();
    await expect(db.query("select public.sell_item('season_bat',1)")).rejects.toThrow(/placed/);
    await db.exec('reset role; delete from public.placements;');
    await asAnna();
    await expect(db.query("select public.sell_item('deco_flowerbed_red',1)")).rejects.toThrow(/not sellable/);
    await expect(db.query("select public.sell_item('season_bat',5)")).rejects.toThrow(/not owned/);
    const r = (await db.query<{ v: any }>("select public.sell_item('season_bat',1) v")).rows[0].v;
    expect(r.coins).toBe(15);
  });

  it('pays coins instead of a second copy for an owned tier-40 pick', async () => {
    await db.exec(`insert into public.xp_ledger(player_id,delta,reason,ref) values('${A}',3000,'quest','bulk');`);
    await asAnna();
    await db.query('select public.claim_season_tier(40)');
    const item = (await db.query<{ id: string }>(
      "select id from public.items where season = '2026-11-halloween' and lootbox_weight > 0 and rarity = 'common' limit 1",
    )).rows[0].id;
    await db.exec(`reset role; insert into public.inventory(player_id,item_id,qty) values('${A}','${item}',1);`);
    await asAnna();
    const r = (await db.query<{ v: any }>('select public.choose_season_item($1) v', [item])).rows[0].v;
    expect(r.duplicate).toBe(true);
    expect(r.coins).toBe(15);
    await expect(db.query('select public.choose_season_item($1)', [item])).rejects.toThrow(/already chosen/);
  });

  it('resets the chest streak after a missed day and awards on day three', async () => {
    await db.exec(`reset role;
      select public.season_streak_touch('${A}', date '2026-10-24');
      select public.season_streak_touch('${A}', date '2026-10-26');
      select public.season_streak_touch('${A}', date '2026-10-27');`);
    expect(
      (await db.query<{ n: number }>("select count(*)::int n from public.season_chests where player_id = $1", [A]))
        .rows[0].n,
    ).toBe(0);
    await db.exec(`select public.season_streak_touch('${A}', date '2026-10-28');`);
    const s = (await db.query<{ current: number; best: number }>(
      "select current, best from public.season_streaks where player_id = $1",
      [A],
    )).rows[0];
    expect(s).toMatchObject({ current: 3, best: 3 });
    expect(
      (await db.query<{ n: number }>("select count(*)::int n from public.season_chests where player_id = $1", [A]))
        .rows[0].n,
    ).toBe(1);
  });

  it('refuses shop chests outside the season window', async () => {
    await db.exec("update public.seasons set starts_on = date '2026-10-19', ends_on = date '2026-10-25';");
    await asAnna();
    await expect(db.query('select public.buy_season_chest()')).rejects.toThrow(/season not running/);
  });

  it('rolls the four rarities roughly at 55/30/12/3', async () => {
    await db.exec(`reset role; update public.profiles set coins = 100000 where id = '${A}';
      insert into public.season_chests(player_id,season,source,ref)
      select '${A}','2026-11-halloween','shop','shop-test-' || g from generate_series(1, 400) g;`);
    await asAnna();
    const ids = (await db.query<{ id: string }>(
      "select id from public.season_chests where source = 'shop' and player_id = $1",
      [A],
    )).rows.map((r) => Number(r.id));
    for (const id of ids) await db.query('select public.open_season_chest($1)', [id]);
    const counts = (await db.query<{ rarity: string; n: number }>(
      "select rarity, count(*)::int n from public.season_chests where source = 'shop' group by rarity",
    )).rows;
    const by = Object.fromEntries(counts.map((c) => [c.rarity, c.n]));
    expect(by.common).toBeGreaterThan(180);
    expect(by.common).toBeLessThan(270);
    expect(by.rare).toBeGreaterThan(80);
    expect(by.rare).toBeLessThan(170);
    expect(by.epic).toBeGreaterThan(15);
    expect(by.epic).toBeLessThan(85);
    expect(by.legendary).toBeLessThan(35);
  }, 60000);
});
