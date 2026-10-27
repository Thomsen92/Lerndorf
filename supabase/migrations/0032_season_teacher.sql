-- 0032: season control for the teacher area (plan §3.6, L1). Every function requires a teacher,
-- locks the season row and never writes outside the existing season tables.

create or replace function public.teacher_seasons() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_today date := public.season_today();
begin
  perform public.require_teacher();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'label', s.label, 'theme', s.theme,
      'starts_on', s.starts_on, 'ends_on', s.ends_on,
      'state', case public.season_state_of(s, v_today) when 'upcoming' then 'planned' else public.season_state_of(s, v_today) end,
      'days_left', greatest(0, s.ends_on - v_today),
      'tiers', (select count(*) from season_tiers t where t.season = s.id),
      'items', (select count(*) from items i where i.season = s.id),
      'closed_at', s.closed_at)
      order by s.starts_on desc) from seasons s), '[]'::jsonb);
end $$;

create or replace function public.teacher_set_season_dates(
  p_season text, p_starts_on date, p_ends_on date
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_today date := public.season_today();
begin
  perform public.require_teacher();
  select * into v_season from seasons where id = p_season for update;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  if v_season.closed_at is not null then raise exception 'season closed' using errcode = 'P0001'; end if;
  if p_starts_on is null or p_ends_on is null then raise exception 'dates missing' using errcode = '22023'; end if;
  if p_ends_on <= p_starts_on then raise exception 'end before start' using errcode = '22023'; end if;
  if extract(dow from p_ends_on) <> 0 then raise exception 'end must be Sunday' using errcode = '22023'; end if;
  if p_starts_on <= v_today and v_season.ends_on >= v_today and p_ends_on < v_today then
    raise exception 'end before today' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from seasons o
    where o.id <> v_season.id and p_starts_on <= o.ends_on and p_ends_on >= o.starts_on
  ) then
    raise exception 'overlap' using errcode = 'P0001';
  end if;
  update seasons set starts_on = p_starts_on, ends_on = p_ends_on where id = p_season;
  insert into season_changes (season, teacher_id, action, detail)
  values (p_season, auth.uid(), 'dates', jsonb_build_object(
    'from_start', v_season.starts_on, 'from_end', v_season.ends_on,
    'to_start', p_starts_on, 'to_end', p_ends_on));
  return public.teacher_seasons();
end $$;

create or replace function public.teacher_start_season_now(p_season text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_today date := public.season_today();
begin
  perform public.require_teacher();
  select * into v_season from seasons where id = p_season for update;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  if public.season_state_of(v_season, v_today) <> 'upcoming' then
    raise exception 'only planned seasons can start' using errcode = 'P0001';
  end if;
  if v_season.ends_on <= v_today then raise exception 'end before today' using errcode = 'P0001'; end if;
  if exists (
    select 1 from seasons o
    where o.id <> v_season.id and o.starts_on <= v_today and o.ends_on >= v_today
  ) then
    raise exception 'another season runs' using errcode = 'P0001';
  end if;
  update seasons set starts_on = v_today where id = p_season;
  insert into season_changes (season, teacher_id, action, detail)
  values (p_season, auth.uid(), 'start', jsonb_build_object('starts_on', v_today));
  return public.teacher_seasons();
end $$;

create or replace function public.teacher_end_season_now(p_season text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_today date := public.season_today();
begin
  perform public.require_teacher();
  select * into v_season from seasons where id = p_season for update;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  if public.season_state_of(v_season, v_today) <> 'running' then
    raise exception 'only running seasons can end' using errcode = 'P0001';
  end if;
  -- Yesterday is the last day; a season that started today or yesterday keeps one day (review W5).
  update seasons set ends_on = greatest(v_today - 1, v_season.starts_on) where id = p_season;
  insert into season_changes (season, teacher_id, action, detail)
  values (p_season, auth.uid(), 'end', jsonb_build_object('ends_on', greatest(v_today - 1, v_season.starts_on)));
  perform public.season_close_now(p_season, auth.uid());
  return public.teacher_seasons();
end $$;

create or replace function public.teacher_season_overview(p_class text, p_season text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_season seasons%rowtype;
  v_today date := public.season_today();
begin
  perform public.require_teacher();
  select * into v_season from seasons where id = p_season;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  return jsonb_build_object(
    'season', jsonb_build_object(
      'id', v_season.id, 'label', v_season.label,
      'starts_on', v_season.starts_on, 'ends_on', v_season.ends_on,
      'state', public.season_state_of(v_season, v_today)),
    'pupils', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nickname', p.nickname,
        'xp', public.season_xp(p.id, v_season),
        'tier', public.season_reached_tier(p.id, v_season),
        'claims', (select count(*) from season_claims c where c.player_id = p.id and c.season = v_season.id),
        'chests_open', (select count(*) from season_chests ch where ch.player_id = p.id and ch.season = v_season.id and ch.opened_at is not null),
        'chests_waiting', (select count(*) from season_chests ch where ch.player_id = p.id and ch.season = v_season.id and ch.opened_at is null),
        'streak', coalesce((select st.current from season_streaks st where st.player_id = p.id and st.season = v_season.id), 0))
        order by p.nickname) from profiles p where p.role = 'student' and p.class_id = p_class), '[]'::jsonb));
end $$;

create or replace function public.teacher_season_changes(p_season text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'action', c.action, 'detail', c.detail, 'created_at', c.created_at,
      'teacher', coalesce(p.nickname, 'Lehrkraft'))
      order by c.created_at desc, c.id desc)
    from season_changes c left join profiles p on p.id = c.teacher_id
    where c.season = p_season), '[]'::jsonb);
end $$;

revoke all on function public.teacher_seasons() from public, anon;
revoke all on function public.teacher_set_season_dates(text, date, date) from public, anon;
revoke all on function public.teacher_start_season_now(text) from public, anon;
revoke all on function public.teacher_end_season_now(text) from public, anon;
revoke all on function public.teacher_season_overview(text, text) from public, anon;
revoke all on function public.teacher_season_changes(text) from public, anon;
grant execute on function public.teacher_seasons() to authenticated;
grant execute on function public.teacher_set_season_dates(text, date, date) to authenticated;
grant execute on function public.teacher_start_season_now(text) to authenticated;
grant execute on function public.teacher_end_season_now(text) to authenticated;
grant execute on function public.teacher_season_overview(text, text) to authenticated;
grant execute on function public.teacher_season_changes(text) to authenticated;
