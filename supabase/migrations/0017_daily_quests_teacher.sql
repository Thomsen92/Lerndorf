-- Lerndorf: daily quests, teacher side. Status of the import (is the next day covered?) and a
-- preview of upcoming quests including solutions. Solutions are unreadable for authenticated
-- roles, so both functions are security definer and check is_teacher() themselves.

-- A day is covered if it has an active quest or lies in a successfully imported holiday week.
-- covered_until is the end of the unbroken run of covered days starting today (null if today is
-- not covered); the scan stops after 60 days.
create or replace function public.quest_status() returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := public.quest_today();
  v_d date := v_today;
  v_until date := null;
  v_imports jsonb;
  v_tomorrow date := v_today + 1;
  v_covered boolean;
begin
  if not public.is_teacher() then
    raise exception 'only the teacher may call this' using errcode = '42501';
  end if;

  while v_d < v_today + 60 loop
    select exists (select 1 from daily_quests q where q.day = v_d and q.active)
        or exists (select 1 from quest_imports i
                   where i.week = v_d - (extract(isodow from v_d)::int - 1)
                     and i.holiday and i.ok)
      into v_covered;
    exit when not v_covered;
    v_until := v_d;
    v_d := v_d + 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'week', i.week, 'ok', i.ok, 'holiday', i.holiday, 'errors', to_jsonb(i.errors),
           'quest_count', i.quest_count, 'imported_at', i.imported_at) order by i.week), '[]'::jsonb)
    into v_imports
  from quest_imports i
  where i.week >= (v_today - (extract(isodow from v_today)::int - 1)) - 7;

  return jsonb_build_object(
    'today', v_today,
    'covered_until', v_until,
    'today_missing', v_until is null,
    'tomorrow_missing', v_until is null or v_until < v_tomorrow,
    'imports', v_imports);
end $$;

create or replace function public.teacher_quest_preview(p_from date, p_days int) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_res jsonb;
begin
  if not public.is_teacher() then
    raise exception 'only the teacher may call this' using errcode = '42501';
  end if;
  if p_days is null or p_days < 1 or p_days > 14 then
    raise exception 'p_days must be between 1 and 14' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'key', q.key, 'day', q.day, 'slot', q.slot, 'type', q.type, 'prompt', q.prompt,
           'data', q.data, 'hint', q.hint, 'reward', q.reward, 'solution', s.solution)
           order by q.day, q.slot), '[]'::jsonb)
    into v_res
  from daily_quests q
  left join daily_quest_solutions s on s.quest_key = q.key
  where q.active and q.day >= p_from and q.day < p_from + p_days;
  return v_res;
end $$;

revoke execute on function public.quest_status() from public, anon;
revoke execute on function public.teacher_quest_preview(date, int) from public, anon;
grant execute on function public.quest_status() to authenticated;
grant execute on function public.teacher_quest_preview(date, int) to authenticated;
