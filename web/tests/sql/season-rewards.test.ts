// 0033: season titles and frames need ownership; level rewards still unlock by level.
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
  '0032_season_teacher.sql', '0033_season_rewards.sql',
];
const dir = new URL('../../../supabase/migrations/', import.meta.url);
const A = '00000000-0000-0000-0000-000000000031';

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

async function asStudent(): Promise<void> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
}

describe('season rewards', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    await db.exec(PIN_SEASON_CLOCK);
    await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;
      grant usage, select on all sequences in schema public to anon, authenticated;
      insert into auth.users values('${A}') on conflict do nothing;
      insert into public.profiles(id,nickname,class_id,plot_index,level,coins) values('${A}','anna','8a',0,50,0);`);
  }, 90000);

  afterAll(async () => {
    await db?.close();
  });

  it('refuses a season title without ownership', async () => {
    await asStudent();
    await expect(db.query("select public.set_title('title_season_pumpkin_rookie')")).rejects.toThrow(/locked/);
  });

  it('allows the season title after it was granted', async () => {
    await db.exec(`reset role; insert into public.player_rewards(player_id,reward_id)
      values('${A}','title_season_pumpkin_rookie') on conflict do nothing;`);
    await asStudent();
    await db.query("select public.set_title('title_season_pumpkin_rookie')");
    const row = (await db.query<{ title_id: string }>('select title_id from public.profiles where id = $1', [A])).rows[0];
    expect(row.title_id).toBe('title_season_pumpkin_rookie');
  });

  it('refuses a season frame without ownership and allows it afterwards', async () => {
    await asStudent();
    await expect(db.query("select public.set_frame('frame_season_web')")).rejects.toThrow(/locked/);
    await db.exec(`reset role; insert into public.player_rewards(player_id,reward_id)
      values('${A}','frame_season_web') on conflict do nothing;`);
    await asStudent();
    await db.query("select public.set_frame('frame_season_web')");
    const row = (await db.query<{ frame_id: string }>('select frame_id from public.profiles where id = $1', [A])).rows[0];
    expect(row.frame_id).toBe('frame_season_web');
  });

  it('keeps level titles level-based', async () => {
    await asStudent();
    await db.query("select public.set_title('title_newcomer')");
    const row = (await db.query<{ title_id: string }>('select title_id from public.profiles where id = $1', [A])).rows[0];
    expect(row.title_id).toBe('title_newcomer');
  });
});
