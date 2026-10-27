-- Season I content: season row, 28 chest items, 12 pass scenes, 40 tiers, titles/frames.
-- Plan: docs/superpowers/plans/2026-10-27-season-und-learnpass.md §3.3, §4.1, §6.1, §12.3.
-- Idempotent: safe to run again (on conflict do nothing / upsert).

insert into public.seasons (id, label, theme, starts_on, ends_on)
values ('2026-11-halloween', 'Season I – Halloween', 'halloween', date '2026-10-28', date '2026-12-06')
on conflict (id) do nothing;

-- Chest pool (28). Rarity uses the database word 'common' for "Normal".
insert into public.items
  (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model)
values
  ('season_warlock', 'deco', null, 'Warlock', 0, '{3,3}', false, true, 'legendary', 1, false, '2026-11-halloween', 'season1/warlock.glb'),
  ('season_house_horror', 'house', null, 'Horror-Haus', 0, '{6,4}', false, true, 'legendary', 1, false, '2026-11-halloween', 'season1/house-horror.glb'),
  ('season_pumpkin_patch', 'deco', null, 'Kürbisfeld', 0, '{3,3}', false, true, 'epic', 1, false, '2026-11-halloween', 'season1/pumpkin-patch.glb'),
  ('season_clock_tower', 'deco', null, 'Spuk-Uhrturm', 0, '{3,3}', false, true, 'epic', 1, false, '2026-11-halloween', 'season1/clock-tower.glb'),
  ('season_dodge', 'car', null, 'Dodge Pickup', 0, '{3,5}', false, true, 'epic', 1, false, '2026-11-halloween', 'season1/dodge-pickup.glb'),
  ('season_monster_plant', 'deco', null, 'Monsterpflanze', 0, '{3,3}', false, true, 'epic', 1, false, '2026-11-halloween', 'season1/kit-monster-plant.glb'),
  ('season_pumpkin_tree', 'deco', null, 'Kürbisbaum', 0, '{3,3}', false, true, 'epic', 1, false, '2026-11-halloween', 'season1/jack-o-lantern-tree.glb'),
  ('season_candy_pile', 'deco', null, 'Süßigkeitenhaufen', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/candy-pile.glb'),
  ('season_graveyard_corner', 'deco', null, 'Friedhofsecke', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/graveyard-corner.glb'),
  ('season_fence_lantern', 'deco', null, 'Zaun mit Laterne', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/fence-lamp.glb'),
  ('season_witch_statue', 'deco', null, 'Hexe (Statue)', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/witch.glb'),
  ('season_pumpkin_girl', 'deco', null, 'Kürbismädchen', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/pumpkin-girl.glb'),
  ('season_witch_figure', 'deco', null, 'Hexe (Figur)', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-witch.glb'),
  ('season_mummy', 'deco', null, 'Mumie', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-mummy.glb'),
  ('season_skeleton', 'deco', null, 'Skelett', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-skeleton.glb'),
  ('season_zombie', 'deco', null, 'Zombie', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-zombie.glb'),
  ('season_witch_cat', 'deco', null, 'Hexenkatze', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-witch-cat.glb'),
  ('season_cauldron', 'deco', null, 'Hexenkessel', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/kit-cauldron.glb'),
  ('season_pumpkin_cat', 'deco', null, 'Kürbiskatze', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/spooky-pumpkin-cat.glb'),
  ('season_ghost_kitty', 'deco', null, 'Geisterkatze', 0, '{3,3}', false, true, 'rare', 1, false, '2026-11-halloween', 'season1/ghost-kitty.glb'),
  ('season_candy_bucket', 'deco', null, 'Süßigkeiteneimer', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-candy-bucket.glb'),
  ('season_bat', 'deco', null, 'Fledermaus', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-bat.glb'),
  ('season_candle', 'deco', null, 'Grablicht', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-candle.glb'),
  ('season_ghost', 'deco', null, 'Kleiner Geist', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-ghost.glb'),
  ('season_gravestone', 'deco', null, 'Grabstein', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-gravestone.glb'),
  ('season_jack_o_lantern', 'deco', null, 'Kürbislaterne', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-jack-o-lantern.glb'),
  ('season_broom', 'deco', null, 'Besen', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-broom.glb'),
  ('season_sign', 'deco', null, 'Halloween-Schild', 0, '{3,3}', false, true, 'common', 1, false, '2026-11-halloween', 'season1/kit-sign.glb')
on conflict (id) do nothing;

-- Pass-exclusive garden scenes (12). Rendered from the Kenney graveyard kit (package A3).
insert into public.items
  (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model)
values
  ('scene_pumpkin_bed', 'deco', null, 'Kürbisbeet', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/pumpkin-bed'),
  ('scene_fire_basket', 'deco', null, 'Feuerkorb', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/fire-basket'),
  ('scene_autumn_pine', 'deco', null, 'Herbsttanne', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/autumn-pine'),
  ('scene_lantern_path', 'deco', null, 'Laternenweg', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/lantern-path'),
  ('scene_graveyard_gate', 'deco', null, 'Friedhofstor', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/graveyard-gate'),
  ('scene_candle_altar', 'deco', null, 'Altar mit Kerzen', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/candle-altar'),
  ('scene_ghost_grave', 'deco', null, 'Gespenst am Grab', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/ghost-grave'),
  ('scene_skeleton_bench', 'deco', null, 'Skelett auf der Bank', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/skeleton-bench'),
  ('scene_zombie_garden', 'deco', null, 'Zombie im Beet', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/zombie-garden'),
  ('scene_little_crypt', 'deco', null, 'Kleine Gruft', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/little-crypt'),
  ('scene_vampire_coffin', 'deco', null, 'Vampir am Sarg', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/vampire-coffin'),
  ('scene_gravedigger', 'deco', null, 'Totengräber', 0, '{3,3}', false, true, 'common', 0, false, '2026-11-halloween', 'scene/gravedigger')
on conflict (id) do nothing;

-- Season titles and frames (owned via player_rewards).
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'title_season_pumpkin_rookie', 'title', 1, 'Pumpkin Rookie',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'title_season_ghost_hunter', 'title', 1, 'Ghost Hunter',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'title_season_witch_friend', 'title', 1, 'Witch''s Friend',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'title_season_halloween_legend', 'title', 1, 'Halloween Legend',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;

insert into public.level_rewards (id, kind, level, label, sort, season)
select 'frame_season_pumpkin', 'frame', 1, 'Pumpkin',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'frame_season_web', 'frame', 1, 'Spider web',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'frame_season_grave', 'frame', 1, 'Gravestone',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;
insert into public.level_rewards (id, kind, level, label, sort, season)
select 'frame_season_cauldron', 'frame', 1, 'Cauldron',
       coalesce((select max(sort) from public.level_rewards), 0) + 1, '2026-11-halloween'
on conflict (id) do nothing;

-- 40 tiers: 30/60/90/120 XP per decade, 5 coins on 1-20, +25 per milestone, chest on milestones.
insert into public.season_tiers (season, tier, xp, coins, chest, title_id, frame_id, item_id, choice)
select
  '2026-11-halloween',
  t,
  case when t <= 10 then t * 30
       when t <= 20 then 300 + (t - 10) * 60
       when t <= 30 then 900 + (t - 20) * 90
       else 1800 + (t - 30) * 120 end,
  (case when t <= 20 then 5 else 0 end)
    + (case when t in (5, 10, 15, 20, 25, 30, 35, 40) then 25 else 0 end),
  t in (5, 10, 15, 20, 25, 30, 35, 40),
  case t when 12 then 'title_season_pumpkin_rookie'
         when 22 then 'title_season_ghost_hunter'
         when 32 then 'title_season_witch_friend'
         when 40 then 'title_season_halloween_legend' end,
  case t when 8 then 'frame_season_pumpkin'
         when 18 then 'frame_season_web'
         when 28 then 'frame_season_grave'
         when 38 then 'frame_season_cauldron' end,
  case t when 21 then 'scene_pumpkin_bed'
         when 23 then 'scene_fire_basket'
         when 24 then 'scene_autumn_pine'
         when 26 then 'scene_lantern_path'
         when 27 then 'scene_graveyard_gate'
         when 29 then 'scene_candle_altar'
         when 31 then 'scene_ghost_grave'
         when 33 then 'scene_skeleton_bench'
         when 34 then 'scene_zombie_garden'
         when 36 then 'scene_little_crypt'
         when 37 then 'scene_vampire_coffin'
         when 39 then 'scene_gravedigger' end,
  t = 40
from generate_series(1, 40) as t
on conflict (season, tier) do nothing;

-- Backfill the chest streak from quests solved since the season start (plan E24). Idempotent:
-- chests use unique(player, season, source, ref); the streak row is recomputed as a whole.
do $$
declare
  r record;
  d date;
  prev date;
  run int;
  best int;
  last_day date;
begin
  for r in select distinct player_id from public.daily_quest_results where solved_at is not null loop
    run := 0;
    best := 0;
    prev := null;
    last_day := null;
    for d in
      select distinct (solved_at at time zone 'Europe/Berlin')::date
      from public.daily_quest_results
      where player_id = r.player_id
        and solved_at is not null
        and (solved_at at time zone 'Europe/Berlin')::date between date '2026-10-28' and date '2026-12-06'
      order by 1
    loop
      if prev is not null and d = prev + 1 then
        run := run + 1;
      else
        run := 1;
      end if;
      if run % 3 = 0 then
        insert into public.season_chests (player_id, season, source, ref, created_at)
        values (r.player_id, '2026-11-halloween', 'streak', 'streak-' || d,
                (d + time '12:00') at time zone 'Europe/Berlin')
        on conflict do nothing;
      end if;
      if run > best then best := run; end if;
      prev := d;
      last_day := d;
    end loop;
    if last_day is not null then
      insert into public.season_streaks (player_id, season, current, best, last_day)
      values (r.player_id, '2026-11-halloween', run, best, last_day)
      on conflict (player_id, season) do update
        set current = excluded.current, best = excluded.best, last_day = excluded.last_day;
    end if;
  end loop;
end $$;
