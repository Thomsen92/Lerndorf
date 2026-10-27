// 0039: mascot, smartphone, moai and four farm buildings — English descriptions, prices 40–180.
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync } from 'node:fs';
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
  '0032_season_teacher.sql', '0033_season_rewards.sql', '0035_shop_deko.sql',
  '0036_shop_monitors.sql', '0037_shop_tvs.sql', '0038_shop_misc.sql', '0039_shop_farm.sql',
];
const dir = new URL('../../../supabase/migrations/', import.meta.url);
const assets = new URL('../../public/assets/', import.meta.url);
const A = '00000000-0000-0000-0000-000000000045';

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

describe('farm and figure decorations', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;
      insert into auth.users values('${A}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index,coins) values('${A}','anna','8a',0,1000);`);
  }, 90000);

  afterAll(async () => {
    await db?.close();
  });

  it('adds the seven items with English descriptions', async () => {
    const rows = (
      await db.query<{ id: string; price: number; model: string; description: string }>(
        "select id, price, model, description from public.items where id in ('shop_mascot','shop_smartphone','shop_moai','shop_water_tower','shop_chicken_coop','shop_windmill','shop_barn') order by price",
      )
    ).rows;
    expect(rows.map((r) => [r.id, r.price])).toEqual([
      ['shop_smartphone', 60],
      ['shop_chicken_coop', 80],
      ['shop_mascot', 120],
      ['shop_moai', 140],
      ['shop_barn', 150],
      ['shop_windmill', 160],
      ['shop_water_tower', 180],
    ]);
    expect(rows[0].description).toBe('A modern smartphone with a glossy screen.');
    for (const row of rows) {
      expect(existsSync(new URL(row.model, assets)), row.model).toBe(true);
      expect(existsSync(new URL(row.model.replace(/\.glb$/, '.lod.glb'), assets)), `${row.model} lod`).toBe(true);
      expect(row.price).toBeGreaterThanOrEqual(40);
      expect(row.price).toBeLessThanOrEqual(180);
    }
  });

  it('sells the smartphone through buy_item', async () => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
    await db.query("select public.buy_item('shop_smartphone')");
    const row = (
      await db.query<{ qty: number; coins: number }>(
        "select i.qty, p.coins from public.inventory i join public.profiles p on p.id = i.player_id where i.player_id = $1 and i.item_id = 'shop_smartphone'",
        [A],
      )
    ).rows[0];
    expect(row.qty).toBe(1);
    expect(row.coins).toBe(940);
    await db.exec('reset role;');
  });
});
