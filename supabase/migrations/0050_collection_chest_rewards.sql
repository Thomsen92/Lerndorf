-- Pass cards and the chest card bonus (plan package 9, migration slot 0050).
-- Coins, XP thresholds, village items and their 55/30/12/3 odds stay exactly as before.
-- The chest card chances are deliberately unset; the bonus stays disabled until the teacher
-- decides them (plan r11). The pass cards are fixed and independent of that decision.

create table public.season_tier_card_rewards (
  season text not null references public.seasons(id) on delete cascade,
  tier int not null,
  card_id text not null references public.season_card_definitions(id) on delete cascade,
  primary key (season, tier, card_id),
  foreign key (season, tier) references public.season_tiers(season, tier) on delete cascade
);

create table public.season_chest_card_config (
  season text primary key references public.seasons(id) on delete cascade,
  enabled boolean not null default false,
  hit_rate numeric check (hit_rate is null or (hit_rate >= 0 and hit_rate <= 1)),
  epic_weight numeric check (epic_weight is null or epic_weight >= 0),
  legendary_weight numeric check (legendary_weight is null or legendary_weight >= 0)
);

alter table public.season_chests
  add column card_id text references public.season_card_definitions(id),
  add column card_status text check (
    card_status in ('awarded', 'no-hit', 'complete', 'disabled', 'legacy')
  );

alter table public.season_tier_card_rewards enable row level security;
alter table public.season_chest_card_config enable row level security;
create policy season_tier_card_rewards_read on public.season_tier_card_rewards
  for select to authenticated using (true);
create policy season_chest_card_config_read on public.season_chest_card_config
  for select to authenticated using (true);
revoke all on public.season_tier_card_rewards from public, anon, authenticated;
revoke all on public.season_chest_card_config from public, anon, authenticated;
grant select on public.season_tier_card_rewards to authenticated;
grant select on public.season_chest_card_config to authenticated;

-- 35 normal/rare cards on the 24 coin tiers, generated from catalog.json passCardRewards.
insert into public.season_tier_card_rewards(season, tier, card_id) values
  ('2026-11-halloween', 1, 'pumpkin-comparisons'),
  ('2026-11-halloween', 2, 'haunted-prepositions'),
  ('2026-11-halloween', 3, 'night-light'),
  ('2026-11-halloween', 3, 'bat-cat'),
  ('2026-11-halloween', 4, 'moon-spoon'),
  ('2026-11-halloween', 5, 'book-look'),
  ('2026-11-halloween', 5, 'adjective-key'),
  ('2026-11-halloween', 6, 'past-footsteps'),
  ('2026-11-halloween', 7, 'talking-pumpkin'),
  ('2026-11-halloween', 7, 'time-for-tea'),
  ('2026-11-halloween', 8, 'midnight-focus-card'),
  ('2026-11-halloween', 9, 'two-ways-boo-card'),
  ('2026-11-halloween', 9, 'become-go-grow-card'),
  ('2026-11-halloween', 10, 'spooky-sounds-card'),
  ('2026-11-halloween', 11, 'spooky-as-as-card'),
  ('2026-11-halloween', 11, 'school-rules-card'),
  ('2026-11-halloween', 12, 'forgotten-homework-card'),
  ('2026-11-halloween', 13, 'toilet-question-card'),
  ('2026-11-halloween', 14, 'lantern-verbs'),
  ('2026-11-halloween', 14, 'ghost-questions'),
  ('2026-11-halloween', 15, 'better-late'),
  ('2026-11-halloween', 16, 'two-heads'),
  ('2026-11-halloween', 16, 'practice-perfect'),
  ('2026-11-halloween', 17, 'friend-in-need'),
  ('2026-11-halloween', 18, 'hidden-key'),
  ('2026-11-halloween', 18, 'slow-steady'),
  ('2026-11-halloween', 19, 'rain-train'),
  ('2026-11-halloween', 20, 'quiet-mouse'),
  ('2026-11-halloween', 20, 'empire-state-postcard'),
  ('2026-11-halloween', 25, 'midnight-map-card'),
  ('2026-11-halloween', 30, 'midnight-bird-card'),
  ('2026-11-halloween', 30, 'haunted-definitions-card'),
  ('2026-11-halloween', 35, 'official-reprimand-card'),
  ('2026-11-halloween', 40, 'cool-box-card'),
  ('2026-11-halloween', 40, 'cuess-digga-card');

-- The bonus is off until Thomas fixes the hit rate and weights (r11). No invented default.
insert into public.season_chest_card_config(season, enabled, hit_rate, epic_weight, legendary_weight)
values ('2026-11-halloween', false, null, null, null);

-- Books every reward of one tier exactly once. Cards are granted in the same transaction.
create or replace function public.season_book_tier(p_uid uuid, p_tier public.season_tiers)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_cards jsonb := '[]'::jsonb;
  v_card record;
  v_grant jsonb;
begin
  if p_tier.coins > 0 then
    insert into coin_ledger (player_id, delta, reason, ref)
    values (p_uid, p_tier.coins, 'season', 'season:' || p_tier.season || ':tier-' || p_tier.tier);
    update profiles set coins = coins + p_tier.coins where id = p_uid;
    v_result := v_result || jsonb_build_object('coins', p_tier.coins);
  end if;
  if p_tier.chest then
    insert into season_chests (player_id, season, source, ref)
    values (p_uid, p_tier.season, 'pass', 'tier-' || p_tier.tier)
    on conflict do nothing;
    v_result := v_result || jsonb_build_object('chest', true);
  end if;
  if p_tier.title_id is not null then
    insert into player_rewards (player_id, reward_id) values (p_uid, p_tier.title_id)
    on conflict do nothing;
    v_result := v_result || jsonb_build_object('title_id', p_tier.title_id);
  end if;
  if p_tier.frame_id is not null then
    insert into player_rewards (player_id, reward_id) values (p_uid, p_tier.frame_id)
    on conflict do nothing;
    v_result := v_result || jsonb_build_object('frame_id', p_tier.frame_id);
  end if;
  if p_tier.item_id is not null then
    v_result := v_result || jsonb_build_object('item', public.season_add_item(p_uid, p_tier.item_id));
  end if;
  if p_tier.choice then
    v_result := v_result || jsonb_build_object('choice', true);
  end if;
  for v_card in
    select r.card_id, d.rarity
    from public.season_tier_card_rewards r
    join public.season_card_definitions d on d.id = r.card_id
    where r.season = p_tier.season and r.tier = p_tier.tier
    order by r.card_id
  loop
    v_grant := public.grant_season_card(
      p_uid, p_tier.season, v_card.card_id, 'learnpass',
      'tier:' || p_tier.tier || ':' || v_card.card_id
    );
    v_cards := v_cards || jsonb_build_array(
      jsonb_build_object('id', v_card.card_id, 'rarity', v_card.rarity) ||
      jsonb_build_object('granted', v_grant -> 'granted')
    );
  end loop;
  if jsonb_array_length(v_cards) > 0 then
    v_result := v_result || jsonb_build_object('cards', v_cards);
  end if;
  return v_result;
end $$;

-- Backfill for tiers claimed before this migration. Idempotent, only adds missing cards.
create function public.season_reconcile_pass_cards(p_player uuid, p_season text) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_count int := 0;
  v_card record;
  v_grant jsonb;
begin
  if not exists (
    select 1
    from public.season_claims c
    join public.season_tier_card_rewards r on r.season = c.season and r.tier = c.tier
    where c.player_id = p_player and c.season = p_season
      and not exists (
        select 1 from public.season_card_grants g
        where g.player_id = p_player and g.season_id = p_season
          and g.source = 'learnpass'
          and g.source_ref = 'tier:' || r.tier || ':' || r.card_id
      )
  ) then
    return 0;
  end if;
  for v_card in
    select r.tier, r.card_id
    from public.season_claims c
    join public.season_tier_card_rewards r on r.season = c.season and r.tier = c.tier
    where c.player_id = p_player and c.season = p_season
      and not exists (
        select 1 from public.season_card_grants g
        where g.player_id = p_player and g.season_id = p_season
          and g.source = 'learnpass'
          and g.source_ref = 'tier:' || r.tier || ':' || r.card_id
      )
    order by r.tier, r.card_id
  loop
    v_grant := public.grant_season_card(
      p_player, p_season, v_card.card_id, 'learnpass',
      'tier:' || v_card.tier || ':' || v_card.card_id
    );
    if (v_grant ->> 'granted')::boolean then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end $$;

-- Reading the collection also completes a missing pass backfill for this pupil.
create or replace function public.my_season_cards(p_season text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  if not exists (select 1 from public.seasons where id = p_season) then
    raise exception 'season not found' using errcode = 'P0002';
  end if;
  perform public.season_reconcile_pass_cards(v_uid, p_season);
  return jsonb_build_object(
    'seasonId', p_season,
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cardId', c.card_id,
        'quantity', c.quantity,
        'firstAcquiredAt', c.first_acquired_at
      ) order by c.first_acquired_at)
      from public.player_season_cards c
      join public.season_card_definitions d on d.id = c.card_id
      where c.player_id = v_uid and d.season_id = p_season
    ), '[]'::jsonb)
  );
end $$;

-- Chest opening: the existing village item roll is untouched, the card bonus is additive.
create or replace function public.open_season_chest(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_chest season_chests%rowtype;
  v_roll double precision;
  v_rarity text;
  v_item items%rowtype;
  v_add jsonb;
  v_cfg season_chest_card_config%rowtype;
  v_has_config boolean := false;
  v_status text := 'disabled';
  v_card_id text;
  v_owned int;
  v_available int;
  v_rarities text[];
  v_weights numeric[];
  v_total numeric;
  v_pick numeric;
  v_choice text;
  v_i int;
  v_card_rarity text;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_chest from season_chests where id = p_id and player_id = v_uid for update;
  if not found then raise exception 'chest not found' using errcode = 'P0002'; end if;
  if v_chest.opened_at is not null then
    select rarity into v_card_rarity from season_card_definitions where id = v_chest.card_id;
    return jsonb_build_object('rarity', v_chest.rarity, 'item_id', v_chest.item_id,
      'duplicate', v_chest.duplicate, 'coins', v_chest.coins, 'reopened', true,
      'card', case when v_chest.card_id is null then null
                   else jsonb_build_object('id', v_chest.card_id, 'rarity', v_card_rarity) end,
      'cardStatus', coalesce(v_chest.card_status, 'legacy'));
  end if;

  v_roll := random() * 100;
  v_rarity := case
    when v_roll < 3 then 'legendary'
    when v_roll < 15 then 'epic'
    when v_roll < 45 then 'rare'
    else 'common' end;

  select * into v_item from items
    where season = v_chest.season and lootbox_weight > 0 and rarity = v_rarity
    order by random() limit 1;
  if not found then
    select * into v_item from items
      where season = v_chest.season and lootbox_weight > 0
      order by random() limit 1;
    v_rarity := v_item.rarity;
  end if;

  v_add := public.season_add_item(v_uid, v_item.id);

  select * into v_cfg from season_chest_card_config where season = v_chest.season;
  v_has_config := found;
  if v_has_config and v_cfg.enabled then
    select count(*) into v_available
      from season_card_definitions d
      where d.season_id = v_chest.season and d.active
        and d.rarity in ('epic', 'legendary')
        and not exists (select 1 from player_season_cards c
                        where c.player_id = v_uid and c.card_id = d.id);
    select count(*) into v_owned
      from season_card_definitions d
      where d.season_id = v_chest.season and d.active
        and d.rarity in ('epic', 'legendary');
    if v_owned = 0 or v_available = 0 then
      v_status := 'complete';
    elsif v_cfg.hit_rate is null or random() >= v_cfg.hit_rate then
      v_status := 'no-hit';
    else
      select array_agg(rarity order by rarity), array_agg(weight order by rarity)
        into v_rarities, v_weights
        from (
          select d.rarity,
                 count(*)::numeric * case d.rarity
                   when 'legendary' then coalesce(v_cfg.legendary_weight, 0)
                   else coalesce(v_cfg.epic_weight, 0) end as weight
          from season_card_definitions d
          where d.season_id = v_chest.season and d.active
            and d.rarity in ('epic', 'legendary')
            and not exists (select 1 from player_season_cards c
                            where c.player_id = v_uid and c.card_id = d.id)
          group by d.rarity
          having case d.rarity
                   when 'legendary' then coalesce(v_cfg.legendary_weight, 0)
                   else coalesce(v_cfg.epic_weight, 0) end > 0
        ) s;
      if v_rarities is null then
        v_status := 'complete';
      else
        v_total := 0;
        for v_i in 1 .. array_length(v_weights, 1) loop
          v_total := v_total + greatest(v_weights[v_i], 0);
        end loop;
        v_pick := random() * v_total;
        v_choice := v_rarities[array_length(v_rarities, 1)];
        for v_i in 1 .. array_length(v_rarities, 1) loop
          v_pick := v_pick - greatest(v_weights[v_i], 0);
          if v_pick < 0 then v_choice := v_rarities[v_i]; exit; end if;
        end loop;
        select d.id into v_card_id from season_card_definitions d
          where d.season_id = v_chest.season and d.active and d.rarity = v_choice
            and not exists (select 1 from player_season_cards c
                            where c.player_id = v_uid and c.card_id = d.id)
          order by random() limit 1;
        if v_card_id is null then
          v_status := 'complete';
        else
          perform public.grant_season_card(
            v_uid, v_chest.season, v_card_id, 'season_chest', p_id::text
          );
          v_status := 'awarded';
        end if;
      end if;
    end if;
  end if;

  update season_chests set opened_at = now(), rarity = v_rarity, item_id = v_item.id,
    duplicate = (v_add ->> 'duplicate')::boolean, coins = (v_add ->> 'coins')::int,
    card_id = v_card_id, card_status = v_status
    where id = p_id;
  select rarity into v_card_rarity from season_card_definitions where id = v_card_id;
  return jsonb_build_object('rarity', v_rarity, 'item_id', v_item.id, 'name_de', v_item.name_de,
    'duplicate', (v_add ->> 'duplicate')::boolean, 'coins', (v_add ->> 'coins')::int, 'reopened', false,
    'card', case when v_card_id is null then null
                 else jsonb_build_object('id', v_card_id, 'rarity', v_card_rarity) end,
    'cardStatus', v_status);
end $$;

revoke execute on function public.season_reconcile_pass_cards(uuid, text)
  from public, anon, authenticated;
