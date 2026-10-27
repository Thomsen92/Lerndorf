-- Season I RPCs (plan §3.2, §3.5). All writes go through these security-definer functions.
-- Students never write tables directly; internal helpers are not executable by clients.

-- Sell value by rarity (plan E11: single pieces use the rarity value, no special prices).
create or replace function public.season_sell_value(p_item public.items) returns int
language sql immutable as $$
  select coalesce(p_item.sell_price,
    case p_item.rarity when 'rare' then 40 when 'epic' then 100 when 'legendary' then 250 else 15 end)
$$;

-- Latest season row (there is exactly one running at a time, but several may be planned).
create or replace function public.season_latest() returns public.seasons
language sql stable security definer set search_path = public as $$
  select * from seasons order by starts_on desc limit 1
$$;

create or replace function public.season_state_of(p_season public.seasons, p_today date)
returns text language sql immutable as $$
  select case
    when p_season.closed_at is not null then 'closed'
    when p_today < p_season.starts_on then 'upcoming'
    when p_today > p_season.ends_on then 'ended'
    else 'running' end
$$;

create or replace function public.season_xp(p_uid uuid, p_season public.seasons) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from xp_ledger
  where player_id = p_uid
    and (created_at at time zone 'Europe/Berlin')::date between p_season.starts_on and p_season.ends_on
$$;

create or replace function public.season_reached_tier(p_uid uuid, p_season public.seasons) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(max(tier), 0)::int from season_tiers
  where season = p_season.id and xp <= public.season_xp(p_uid, p_season)
$$;

-- Grants one item: single pieces (house/garage/car) already owned become coins (plan E11).
create or replace function public.season_add_item(p_uid uuid, p_item_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_item items%rowtype;
  v_qty int;
  v_placed int;
  v_dup boolean;
begin
  select * into v_item from items where id = p_item_id;
  if not found then raise exception 'item not found' using errcode = 'P0002'; end if;

  if v_item.kind in ('house', 'garage', 'car') then
    select coalesce((select qty from inventory where player_id = p_uid and item_id = p_item_id), 0) into v_qty;
    select count(*) into v_placed from placements where player_id = p_uid and item_id = p_item_id;
    if v_qty > 0 or v_placed > 0 then
      insert into coin_ledger (player_id, delta, reason, ref)
      values (p_uid, public.season_sell_value(v_item), 'season', 'season_dup:' || p_item_id);
      update profiles set coins = coins + public.season_sell_value(v_item) where id = p_uid;
      return jsonb_build_object('item_id', p_item_id, 'duplicate', true,
                                'coins', public.season_sell_value(v_item));
    end if;
  end if;

  insert into inventory (player_id, item_id, qty) values (p_uid, p_item_id, 1)
  on conflict (player_id, item_id) do update set qty = inventory.qty + 1;
  select qty > 1 into v_dup from inventory where player_id = p_uid and item_id = p_item_id;
  return jsonb_build_object('item_id', p_item_id, 'duplicate', coalesce(v_dup, false), 'coins', 0);
end $$;

-- Books all rewards of one tier exactly once (claims guard the caller).
create or replace function public.season_book_tier(p_uid uuid, p_tier public.season_tiers) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb := '{}'::jsonb;
begin
  if p_tier.coins > 0 then
    insert into coin_ledger (player_id, delta, reason, ref)
    values (p_uid, p_tier.coins, 'season', 'tier-' || p_tier.tier);
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
  return v_result;
end $$;

-- Credits every reached but unclaimed tier (season end, plan E14). Idempotent.
create or replace function public.season_finish_player(p_uid uuid, p_season_id text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_reached int;
  v_tier season_tiers%rowtype;
  v_count int := 0;
begin
  select * into v_season from seasons where id = p_season_id;
  if not found then return 0; end if;
  v_reached := public.season_reached_tier(p_uid, v_season);
  for v_tier in
    select * from season_tiers where season = v_season.id and tier <= v_reached order by tier
  loop
    insert into season_claims (player_id, season, tier, auto)
    values (p_uid, v_season.id, v_tier.tier, true)
    on conflict (player_id, season, tier) do nothing;
    if found then
      perform public.season_book_tier(p_uid, v_tier);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

create or replace function public.season_state() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_state text;
  v_xp int;
  v_reached int;
  v_tiers jsonb;
  v_streak season_streaks%rowtype;
  v_current int := 0;
  v_shop_left int;
  v_week_start date;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_season from seasons order by starts_on desc limit 1;
  if not found then raise exception 'no season' using errcode = 'P0002'; end if;

  v_state := public.season_state_of(v_season, v_today);
  if v_state in ('ended', 'closed') then
    perform public.season_finish_player(v_uid, v_season.id);
  end if;

  v_xp := public.season_xp(v_uid, v_season);
  v_reached := public.season_reached_tier(v_uid, v_season);

  select jsonb_agg(jsonb_build_object(
    'tier', t.tier, 'xp', t.xp, 'coins', t.coins, 'chest', t.chest,
    'title_id', t.title_id, 'frame_id', t.frame_id, 'item_id', t.item_id, 'choice', t.choice,
    'state', case
      when c.player_id is not null then 'claimed'
      when v_xp >= t.xp then 'ready'
      when t.tier = v_reached + 1 then 'next'
      else 'locked' end)
    order by t.tier)
  into v_tiers
  from season_tiers t
  left join season_claims c on c.player_id = v_uid and c.season = t.season and c.tier = t.tier
  where t.season = v_season.id;

  select * into v_streak from season_streaks where player_id = v_uid and season = v_season.id;
  if found and v_streak.last_day >= v_today - 1 then
    v_current := v_streak.current;
  end if;

  v_week_start := date_trunc('week', v_today)::date;
  select 2 - count(*) into v_shop_left from season_chests
  where player_id = v_uid and season = v_season.id and source = 'shop'
    and ref like 'shop-' || v_week_start || '-%';

  return jsonb_build_object(
    'season', jsonb_build_object(
      'id', v_season.id, 'label', v_season.label, 'theme', v_season.theme,
      'starts_on', v_season.starts_on, 'ends_on', v_season.ends_on,
      'state', v_state, 'days_left', greatest(0, v_season.ends_on - v_today)),
    'xp', v_xp, 'tier', v_reached, 'tiers', coalesce(v_tiers, '[]'::jsonb),
    'next', case when v_reached < 40 then jsonb_build_object(
      'tier', v_reached + 1,
      'xp', (select xp from season_tiers where season = v_season.id and tier = v_reached + 1),
      'missing', greatest(0, (select xp from season_tiers where season = v_season.id and tier = v_reached + 1) - v_xp))
      else null end,
    'chests', jsonb_build_object(
      'pass', (select count(*) from season_chests where player_id = v_uid and season = v_season.id and opened_at is null and source = 'pass'),
      'streak', (select count(*) from season_chests where player_id = v_uid and season = v_season.id and opened_at is null and source = 'streak'),
      'shop', (select count(*) from season_chests where player_id = v_uid and season = v_season.id and opened_at is null and source = 'shop')),
    'shop', jsonb_build_object('price', 50, 'left', greatest(0, v_shop_left), 'week_start', v_week_start),
    'streak', jsonb_build_object('current', v_current, 'best', coalesce(v_streak.best, 0),
      'last_day', v_streak.last_day, 'to_chest', 3 - (v_current % 3)),
    'choice', jsonb_build_object(
      'open', exists (select 1 from season_claims where player_id = v_uid and season = v_season.id
                      and tier = 40 and choice_item_id is null),
      'item_id', (select choice_item_id from season_claims where player_id = v_uid and season = v_season.id and tier = 40)));
end $$;

create or replace function public.claim_season_tier(p_tier int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_state text;
  v_row season_tiers%rowtype;
  v_xp int;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_season from seasons order by starts_on desc limit 1;
  if not found then raise exception 'no season' using errcode = 'P0002'; end if;
  v_state := public.season_state_of(v_season, v_today);
  if v_state = 'upcoming' then raise exception 'season not started' using errcode = 'P0001'; end if;
  if v_state <> 'running' then
    perform public.season_finish_player(v_uid, v_season.id);
    raise exception 'season ended' using errcode = 'P0001';
  end if;
  select * into v_row from season_tiers where season = v_season.id and tier = p_tier;
  if not found then raise exception 'unknown tier' using errcode = 'P0002'; end if;
  v_xp := public.season_xp(v_uid, v_season);
  if v_xp < v_row.xp then raise exception 'xp missing' using errcode = 'P0001'; end if;
  insert into season_claims (player_id, season, tier) values (v_uid, v_season.id, p_tier)
  on conflict do nothing;
  if not found then raise exception 'already claimed' using errcode = 'P0001'; end if;
  return jsonb_build_object('tier', p_tier, 'rewards', public.season_book_tier(v_uid, v_row));
end $$;

create or replace function public.choose_season_item(p_item_id text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_claim season_claims%rowtype;
  v_item items%rowtype;
  v_result jsonb;
  v_qty int;
  v_placed int;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_season from seasons order by starts_on desc limit 1;
  select * into v_claim from season_claims
    where player_id = v_uid and season = v_season.id and tier = 40 for update;
  if not found then raise exception 'tier not claimed' using errcode = 'P0001'; end if;
  if v_claim.choice_item_id is not null then raise exception 'already chosen' using errcode = 'P0001'; end if;
  select * into v_item from items
    where id = p_item_id and season = v_season.id and lootbox_weight > 0;
  if not found then raise exception 'not in pool' using errcode = 'P0002'; end if;
  select coalesce((select qty from inventory where player_id = v_uid and item_id = p_item_id), 0) into v_qty;
  select count(*) into v_placed from placements where player_id = v_uid and item_id = p_item_id;
  if v_qty > 0 or v_placed > 0 then
    insert into coin_ledger (player_id, delta, reason, ref)
    values (v_uid, public.season_sell_value(v_item), 'season', 'season_choice:' || p_item_id);
    update profiles set coins = coins + public.season_sell_value(v_item) where id = v_uid;
    v_result := jsonb_build_object('item_id', p_item_id, 'duplicate', true,
                                  'coins', public.season_sell_value(v_item));
  else
    v_result := public.season_add_item(v_uid, p_item_id);
  end if;
  update season_claims set choice_item_id = p_item_id
    where player_id = v_uid and season = v_season.id and tier = 40;
  return v_result || jsonb_build_object('chosen', p_item_id);
end $$;

create or replace function public.buy_season_chest() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_week_start date := date_trunc('week', (now() at time zone 'Europe/Berlin')::date)::date;
  v_count int;
  v_coins int;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_season from seasons order by starts_on desc limit 1;
  if public.season_state_of(v_season, v_today) <> 'running' then
    raise exception 'season not running' using errcode = 'P0001';
  end if;
  select count(*) into v_count from season_chests
    where player_id = v_uid and season = v_season.id and source = 'shop'
      and ref like 'shop-' || v_week_start || '-%';
  if v_count >= 2 then raise exception 'weekly limit' using errcode = 'P0001'; end if;
  select coins into v_coins from profiles where id = v_uid for update;
  if v_coins < 50 then raise exception 'not enough coins' using errcode = 'P0001'; end if;
  update profiles set coins = coins - 50 where id = v_uid;
  insert into coin_ledger (player_id, delta, reason, ref)
  values (v_uid, -50, 'purchase', 'season_shop:' || v_week_start || ':' || (v_count + 1));
  insert into season_chests (player_id, season, source, ref)
  values (v_uid, v_season.id, 'shop', 'shop-' || v_week_start || '-' || (v_count + 1))
  on conflict do nothing;
  return jsonb_build_object('ok', true, 'left', 2 - (v_count + 1), 'price', 50);
end $$;

create or replace function public.open_season_chest(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_chest season_chests%rowtype;
  v_roll double precision;
  v_rarity text;
  v_item items%rowtype;
  v_add jsonb;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  select * into v_chest from season_chests where id = p_id and player_id = v_uid for update;
  if not found then raise exception 'chest not found' using errcode = 'P0002'; end if;
  if v_chest.opened_at is not null then
    return jsonb_build_object('rarity', v_chest.rarity, 'item_id', v_chest.item_id,
      'duplicate', v_chest.duplicate, 'coins', v_chest.coins, 'reopened', true);
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
  update season_chests set opened_at = now(), rarity = v_rarity, item_id = v_item.id,
    duplicate = (v_add ->> 'duplicate')::boolean, coins = (v_add ->> 'coins')::int
    where id = p_id;
  return jsonb_build_object('rarity', v_rarity, 'item_id', v_item.id, 'name_de', v_item.name_de,
    'duplicate', (v_add ->> 'duplicate')::boolean, 'coins', (v_add ->> 'coins')::int, 'reopened', false);
end $$;

create or replace function public.sell_item(p_item_id text, p_qty int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_qty int;
  v_placed int;
  v_total int;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  if p_qty is null or p_qty < 1 then raise exception 'bad quantity' using errcode = '22023'; end if;
  select * into v_item from items where id = p_item_id and season is not null;
  if not found then raise exception 'not sellable' using errcode = 'P0001'; end if;
  select qty into v_qty from inventory where player_id = v_uid and item_id = p_item_id for update;
  if not found or v_qty < p_qty then raise exception 'not owned' using errcode = 'P0001'; end if;
  select count(*) into v_placed from placements where player_id = v_uid and item_id = p_item_id;
  if v_qty - v_placed < p_qty then raise exception 'placed' using errcode = 'P0001'; end if;
  v_total := p_qty * public.season_sell_value(v_item);
  update inventory set qty = qty - p_qty where player_id = v_uid and item_id = p_item_id;
  delete from inventory where player_id = v_uid and item_id = p_item_id and qty <= 0;
  insert into coin_ledger (player_id, delta, reason, ref)
  values (v_uid, v_total, 'sell', p_item_id || ':' || p_qty);
  update profiles set coins = coins + v_total where id = v_uid;
  return jsonb_build_object('coins', v_total, 'qty', p_qty);
end $$;

-- Teacher: close a season after its end, crediting all players (plan E14).
create or replace function public.close_season(p_season text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_today date := (now() at time zone 'Europe/Berlin')::date;
  v_player uuid;
  v_n int := 0;
begin
  perform public.require_teacher();
  select * into v_season from seasons where id = p_season for update;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  if v_season.closed_at is not null then return jsonb_build_object('closed', false, 'players', 0); end if;
  if v_today <= v_season.ends_on then raise exception 'season not over' using errcode = 'P0001'; end if;
  for v_player in select id from profiles where role = 'student' loop
    v_n := v_n + public.season_finish_player(v_player, p_season);
  end loop;
  update seasons set closed_at = now() where id = p_season;
  insert into season_changes (season, teacher_id, action, detail)
  values (p_season, v_uid, 'close', jsonb_build_object('credited', v_n));
  return jsonb_build_object('closed', true, 'players', v_n);
end $$;

-- Chest streak: one calendar day counts if at least one quest was solved (plan E12).
create or replace function public.season_streak_touch(p_uid uuid, p_day date) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_row season_streaks%rowtype;
  v_current int;
begin
  select * into v_season from seasons
    where p_day between starts_on and ends_on order by starts_on desc limit 1;
  if v_season.id is null then return; end if;
  select * into v_row from season_streaks
    where player_id = p_uid and season = v_season.id for update;
  if v_row.player_id is not null and v_row.last_day = p_day then return; end if;
  if v_row.player_id is null then
    v_current := 1;
    insert into season_streaks (player_id, season, current, best, last_day)
    values (p_uid, v_season.id, 1, 1, p_day);
  else
    v_current := case when v_row.last_day = p_day - 1 then v_row.current + 1 else 1 end;
    update season_streaks set current = v_current,
      best = greatest(best, v_current), last_day = p_day
      where player_id = p_uid and season = v_season.id;
  end if;
  if v_current % 3 = 0 then
    insert into season_chests (player_id, season, source, ref)
    values (p_uid, v_season.id, 'streak', 'streak-' || p_day) on conflict do nothing;
  end if;
end $$;

create or replace function public.season_quest_streak_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.solved_at is not null and (old.solved_at is null or old.solved_at <> new.solved_at) then
    perform public.season_streak_touch(new.player_id, (new.solved_at at time zone 'Europe/Berlin')::date);
  end if;
  return new;
end $$;

drop trigger if exists season_quest_streak on public.daily_quest_results;
create trigger season_quest_streak
  after insert or update of solved_at on public.daily_quest_results
  for each row execute function public.season_quest_streak_trigger();

-- Grants: students use the five RPCs; close_season is for teachers; helpers stay internal.
revoke all on function public.season_sell_value(public.items) from public, anon, authenticated;
revoke all on function public.season_latest() from public, anon, authenticated;
revoke all on function public.season_state_of(public.seasons, date) from public, anon, authenticated;
revoke all on function public.season_xp(uuid, public.seasons) from public, anon, authenticated;
revoke all on function public.season_reached_tier(uuid, public.seasons) from public, anon, authenticated;
revoke all on function public.season_add_item(uuid, text) from public, anon, authenticated;
revoke all on function public.season_book_tier(uuid, public.season_tiers) from public, anon, authenticated;
revoke all on function public.season_finish_player(uuid, text) from public, anon, authenticated;
revoke all on function public.season_streak_touch(uuid, date) from public, anon, authenticated;
revoke all on function public.season_quest_streak_trigger() from public, anon, authenticated;

revoke all on function public.season_state() from public, anon;
revoke all on function public.claim_season_tier(int) from public, anon;
revoke all on function public.choose_season_item(text) from public, anon;
revoke all on function public.buy_season_chest() from public, anon;
revoke all on function public.open_season_chest(bigint) from public, anon;
revoke all on function public.sell_item(text, int) from public, anon;
revoke all on function public.close_season(text) from public, anon;

grant execute on function public.season_state() to authenticated;
grant execute on function public.claim_season_tier(int) to authenticated;
grant execute on function public.choose_season_item(text) to authenticated;
grant execute on function public.buy_season_chest() to authenticated;
grant execute on function public.open_season_chest(bigint) to authenticated;
grant execute on function public.sell_item(text, int) to authenticated;
grant execute on function public.close_season(text) to authenticated;
