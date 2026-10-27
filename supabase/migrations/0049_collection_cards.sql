-- Halloween collection ownership (plan package 8, migration slot 0049).
-- Card definitions and ownership are separate from the 28 village items and their chest odds.
-- Clients never write: every card arrives through grant_season_card, which only server RPCs call.

create table public.season_card_definitions (
  id text primary key,
  season_id text not null references public.seasons(id) on delete cascade,
  rarity text not null check (rarity in ('normal', 'rare', 'epic', 'legendary')),
  active boolean not null default true,
  content_version text not null,
  constraint season_card_definitions_legendary check (
    rarity <> 'legendary' or id = 'highlight-halloween-card'
  )
);

create table public.player_season_cards (
  player_id uuid not null references public.profiles(id) on delete cascade,
  card_id text not null references public.season_card_definitions(id) on delete cascade,
  quantity integer not null default 1 check (quantity = 1),
  first_acquired_at timestamptz not null default now(),
  last_acquired_at timestamptz not null default now(),
  primary key (player_id, card_id)
);

create table public.season_card_grants (
  player_id uuid not null references public.profiles(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  source text not null check (source in ('learnpass', 'season_chest')),
  source_ref text not null,
  card_id text not null references public.season_card_definitions(id) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (player_id, season_id, source, source_ref),
  unique (player_id, card_id)
);

create index player_season_cards_player on public.player_season_cards (player_id);

alter table public.season_card_definitions enable row level security;
alter table public.player_season_cards enable row level security;
alter table public.season_card_grants enable row level security;
create policy season_card_definitions_read on public.season_card_definitions
  for select to authenticated using (active);
create policy player_season_cards_read on public.player_season_cards
  for select to authenticated using (player_id = auth.uid() or public.is_teacher());
create policy season_card_grants_read on public.season_card_grants
  for select to authenticated using (player_id = auth.uid() or public.is_teacher());
revoke all on public.season_card_definitions from public, anon, authenticated;
revoke all on public.player_season_cards from public, anon, authenticated;
revoke all on public.season_card_grants from public, anon, authenticated;
grant select on public.season_card_definitions to authenticated;
grant select on public.player_season_cards to authenticated;
grant select on public.season_card_grants to authenticated;

-- Public definitions of the 50 active cards, generated from the runtime catalogue
-- web/public/assets/collection/catalog.json (content e42d4c79…). A test compares both.
insert into public.season_card_definitions(id, season_id, rarity, active, content_version) values
  ('actions-words', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('adjective-key', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('bat-cat', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('become-go-grow-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('better-late', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('birds-feather', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('blood-moon-story', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('bloody-friday-card', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('book-cover', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('book-look', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('cool-box-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('cuess-digga-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('echo-verse', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('empire-state-postcard', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('forgotten-homework-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('fortune-brave', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('friend-in-need', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('ghost-questions', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('haunted-definitions-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('haunted-prepositions', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('hidden-key', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('highlight-halloween-card', '2026-11-halloween', 'legendary', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('knowledge-power', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('lantern-verbs', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('manhattan-postcard', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('midnight-bird-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('midnight-focus-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('midnight-map-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('moon-spoon', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('night-light', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('official-reprimand-card', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('past-footsteps', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('practice-perfect', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('pumpkin-comparisons', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('quiet-mouse', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('rain-train', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('school-rules-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('silver-lining', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('sleepy-skeletons', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('slow-steady', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('spooky-as-as-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('spooky-sounds-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('talking-pumpkin', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('time-for-tea', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('toilet-question-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('towers-after-dark-card', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('two-heads', '2026-11-halloween', 'rare', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('two-ways-boo-card', '2026-11-halloween', 'normal', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('vaping-reprimand-card', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664'),
  ('witch-recipe', '2026-11-halloween', 'epic', true, 'e42d4c79c8503240f8d189d668684c8b2d80776d9230433452adab9b89c71664');

-- Idempotent, duplikatfreie Vergabe. Only server RPCs call it; clients have no EXECUTE right.
create function public.grant_season_card(
  p_player uuid,
  p_season text,
  p_card text,
  p_source text,
  p_ref text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_def public.season_card_definitions%rowtype;
  v_grant public.season_card_grants%rowtype;
begin
  if p_player is null or p_season is null or p_card is null or p_source is null or p_ref is null then
    raise exception 'grant needs player, season, card, source and ref' using errcode = '22023';
  end if;
  if p_source not in ('learnpass', 'season_chest') then
    raise exception 'unknown card source' using errcode = '22023';
  end if;
  select * into v_def from public.season_card_definitions where id = p_card;
  if not found then raise exception 'unknown card' using errcode = 'P0002'; end if;
  if not v_def.active or v_def.season_id <> p_season then
    raise exception 'card is not available in this season' using errcode = 'P0001';
  end if;
  if (v_def.rarity in ('normal', 'rare')) <> (p_source = 'learnpass') then
    raise exception 'wrong source for card rarity' using errcode = 'P0001';
  end if;

  -- One lock order for every card grant: profile row first, then grant/ownership rows.
  perform 1 from public.profiles where id = p_player for update;
  if not found then raise exception 'player not found' using errcode = 'P0002'; end if;

  select * into v_grant from public.season_card_grants
    where player_id = p_player and season_id = p_season and source = p_source and source_ref = p_ref;
  if found then
    return jsonb_build_object('cardId', v_grant.card_id, 'granted', false,
      'alreadyOwned', true, 'reason', 'already-granted');
  end if;
  if exists (select 1 from public.player_season_cards where player_id = p_player and card_id = p_card) then
    return jsonb_build_object('cardId', p_card, 'granted', false,
      'alreadyOwned', true, 'reason', 'owned');
  end if;

  insert into public.season_card_grants(player_id, season_id, source, source_ref, card_id)
  values (p_player, p_season, p_source, p_ref, p_card);
  insert into public.player_season_cards(player_id, card_id) values (p_player, p_card);
  return jsonb_build_object('cardId', p_card, 'granted', true, 'alreadyOwned', false);
end $$;

create function public.my_season_cards(p_season text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  if not exists (select 1 from public.seasons where id = p_season) then
    raise exception 'season not found' using errcode = 'P0002';
  end if;
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

create function public.teacher_player_cards(p_player uuid, p_season text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_teacher();
  if not exists (select 1 from public.seasons where id = p_season) then
    raise exception 'season not found' using errcode = 'P0002';
  end if;
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
      where c.player_id = p_player and d.season_id = p_season
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.grant_season_card(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.my_season_cards(text) from public, anon;
revoke execute on function public.teacher_player_cards(uuid, text) from public, anon;
grant execute on function public.my_season_cards(text) to authenticated;
grant execute on function public.teacher_player_cards(uuid, text) to authenticated;
