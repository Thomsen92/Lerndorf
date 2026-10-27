// S3: the six non-season shop items from 0031 exist, are visible and buyable.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { PIN_SEASON_CLOCK } from './seasonClock';
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
];
const dir = new URL('../../../supabase/migrations/', import.meta.url);
const A = '00000000-0000-0000-0000-000000000012';

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

describe('non-season shop items', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(PIN_SEASON_CLOCK);
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;
      insert into auth.users values('${A}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index,coins)
        values('${A}','anna','8a',0,10000) on conflict do nothing;`);
  }, 90000);

  afterAll(async () => {
    await db?.close();
  });

  it('seeds the six items with prices and models', async () => {
    const rows = (
      await db.query<{ id: string; kind: string; price: number; model: string; shop_visible: boolean; season: string | null }>(
        "select id, kind, price, model, shop_visible, season from public.items where id like 'shop\\_%' order by price",
      )
    ).rows;
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => [r.id, r.price])).toEqual([
      ['shop_cabin', 500],
      ['shop_beatall', 600],
      ['shop_toyoyo', 700],
      ['shop_president_car', 2000],
      ['shop_trump', 2000],
      ['shop_white_house', 5000],
    ]);
    expect(rows.every((r) => r.shop_visible && r.season === null)).toBe(true);
    expect(rows.find((r) => r.id === 'shop_white_house')?.kind).toBe('house');
    expect(rows.find((r) => r.id === 'shop_toyoyo')?.model).toBe('shop/toyoyo-highlight.glb');
  });

  it('sells an item through buy_item and books the coins', async () => {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
    const bought = (
      await db.query<{ v: { ok?: boolean } }>("select public.buy_item('shop_toyoyo') v")
    ).rows[0].v;
    expect(bought).toBeTruthy();
    const row = (
      await db.query<{ qty: number; coins: number }>(
        "select i.qty, p.coins from public.inventory i join public.profiles p on p.id = i.player_id where i.player_id = $1 and i.item_id = 'shop_toyoyo'",
        [A],
      )
    ).rows[0];
    expect(row.qty).toBe(1);
    expect(row.coins).toBe(9300);
    await db.exec('reset role;');
  });
});
