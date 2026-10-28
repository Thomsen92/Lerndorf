-- Class-scoped world atmosphere and the season welcome acknowledgement.
-- Plan: Prototyp/marktplatz/DEEPSEEK_UMSETZUNGSPLAN.md §5 (package 2), r14 for the welcome key.
-- The theme only changes the village look. It never touches seasons, XP, coins or placements.

create table public.class_world_theme (
  class_id text primary key references public.classes(id) on delete cascade,
  theme text not null default 'normal' check (theme in ('normal', 'halloween')),
  season_id text references public.seasons(id),
  revision integer not null default 0 check (revision >= 0),
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles(id) on delete set null,
  -- Halloween is always tied to a season; Normal never keeps a stale season.
  check (
    (theme = 'normal' and season_id is null)
    or (theme = 'halloween' and season_id is not null)
  )
);

-- The welcome text belongs to the season, not to the optical revision (r14).
alter table public.seasons add column if not exists welcome_version text not null default 'r14';

create table public.season_welcome_seen (
  player_id uuid not null references public.profiles(id) on delete cascade,
  class_id text not null references public.classes(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  content_version text not null,
  seen_at timestamptz not null default now(),
  primary key (player_id, season_id, content_version)
);

create index season_welcome_seen_player on public.season_welcome_seen (player_id, season_id);

alter table public.class_world_theme enable row level security;
alter table public.season_welcome_seen enable row level security;
create policy class_world_theme_read on public.class_world_theme for select to authenticated
  using (class_id = public.current_class() or public.is_teacher());
create policy season_welcome_seen_read on public.season_welcome_seen for select to authenticated
  using (player_id = auth.uid() or public.is_teacher());
revoke all on public.class_world_theme from public, anon, authenticated;
revoke all on public.season_welcome_seen from public, anon, authenticated;
grant select on public.class_world_theme to authenticated;
grant select on public.season_welcome_seen to authenticated;

-- Shared state builder. Internal only: clients call world_theme_state or the teacher variants.
create function public.world_theme_state_for(p_uid uuid, p_class text, p_welcome boolean)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_theme text := 'normal';
  v_revision integer := 0;
  v_theme_season text;
  v_season public.seasons%rowtype;
  v_state text;
  v_effective text := 'normal';
  v_welcome boolean := false;
  v_today date := public.season_today();
begin
  select coalesce(w.theme, 'normal'), coalesce(w.revision, 0), w.season_id
    into v_theme, v_revision, v_theme_season
    from public.classes c
    left join public.class_world_theme w on w.class_id = c.id
    where c.id = p_class;

  if v_theme = 'halloween' and v_theme_season is not null then
    select * into v_season from public.seasons where id = v_theme_season;
    if found then
      v_state := public.season_state_of(v_season, v_today);
      if v_state = 'running' then v_effective := 'halloween'; end if;
    end if;
  else
    -- Normal keeps the current season in view: pupils only need it while it runs (welcome),
    -- teachers also need a planned season to pre-book Halloween.
    v_season := public.season_current();
    if v_season.id is not null
       and public.season_state_of(v_season, v_today) = 'running' then
      v_state := 'running';
    elsif p_welcome then
      v_season := null;
      v_state := null;
    elsif v_season.id is not null then
      v_state := public.season_state_of(v_season, v_today);
    end if;
  end if;

  if p_welcome and v_state = 'running' and v_season.id is not null then
    select exists (
      select 1 from public.season_welcome_seen s
      where s.player_id = p_uid
        and s.season_id = v_season.id
        and s.content_version = v_season.welcome_version
    ) into v_welcome;
  end if;

  return jsonb_build_object(
    'classId', p_class,
    'requestedTheme', v_theme,
    'effectiveTheme', v_effective,
    'revision', v_revision,
    'seasonId', v_season.id,
    'seasonLabel', v_season.label,
    'seasonState', v_state,
    'welcomeSeen', v_welcome
  );
end $$;

create function public.world_theme_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_class text := public.current_class();
begin
  if v_uid is null or v_class is null then
    raise exception 'forbidden: class membership required' using errcode = '42501';
  end if;
  return public.world_theme_state_for(v_uid, v_class, true);
end $$;

create function public.teacher_world_theme_state(p_class text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_teacher();
  if not exists (select 1 from public.classes where id = p_class) then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
  return public.world_theme_state_for(auth.uid(), p_class, false);
end $$;

create function public.teacher_set_world_theme(p_class text, p_theme text, p_season text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_old_theme text;
  v_old_season text;
  v_season text := null;
begin
  perform public.require_teacher();
  if not exists (select 1 from public.classes where id = p_class) then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
  if p_theme is null or p_theme not in ('normal', 'halloween') then
    raise exception 'invalid world theme' using errcode = '22023';
  end if;
  if p_theme = 'halloween' then
    if p_season is null or not exists (select 1 from public.seasons where id = p_season) then
      raise exception 'halloween needs an existing season' using errcode = '22023';
    end if;
    v_season := p_season;
  end if;

  -- Concurrent first saves serialize on the unique class row, later saves on FOR UPDATE.
  insert into public.class_world_theme(class_id) values (p_class) on conflict (class_id) do nothing;
  select theme, season_id into v_old_theme, v_old_season
    from public.class_world_theme where class_id = p_class for update;
  if v_old_theme is distinct from p_theme or v_old_season is distinct from v_season then
    update public.class_world_theme
       set theme = p_theme, season_id = v_season, revision = revision + 1,
           changed_at = clock_timestamp(), changed_by = auth.uid()
     where class_id = p_class;
  end if;
  return public.teacher_world_theme_state(p_class);
end $$;

create function public.ack_season_welcome(p_season text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_class text := public.current_class();
  v_season public.seasons%rowtype;
begin
  if v_uid is null or v_class is null then
    raise exception 'forbidden: class membership required' using errcode = '42501';
  end if;
  select * into v_season from public.seasons where id = p_season;
  if not found then
    raise exception 'season not found' using errcode = 'P0002';
  end if;
  if public.season_state_of(v_season, public.season_today()) <> 'running' then
    raise exception 'season not running' using errcode = '22023';
  end if;
  insert into public.season_welcome_seen(player_id, class_id, season_id, content_version)
  values (v_uid, v_class, v_season.id, v_season.welcome_version)
  on conflict (player_id, season_id, content_version) do nothing;
end $$;

revoke execute on function public.world_theme_state_for(uuid, text, boolean) from public, anon, authenticated;
revoke execute on function public.world_theme_state() from public, anon;
revoke execute on function public.teacher_world_theme_state(text) from public, anon;
revoke execute on function public.teacher_set_world_theme(text, text, text) from public, anon;
revoke execute on function public.ack_season_welcome(text) from public, anon;
grant execute on function public.world_theme_state() to authenticated;
grant execute on function public.teacher_world_theme_state(text) to authenticated;
grant execute on function public.teacher_set_world_theme(text, text, text) to authenticated;
grant execute on function public.ack_season_welcome(text) to authenticated;
