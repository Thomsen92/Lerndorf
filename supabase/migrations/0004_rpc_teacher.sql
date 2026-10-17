-- Lerndorf: teacher RPCs (SPEC §8). Each one checks the role, then writes.
-- Clients call them with the anon key and a logged-in session; they never write tables directly.

-- Throws unless the caller is a teacher.
create or replace function public.require_teacher() returns void
  language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_teacher() then
    raise exception 'forbidden: teacher role required' using errcode = '42501';
  end if;
end $$;

-- Stamps for a complete weekly plan. One stamp per pupil and week.
-- week must be a Monday. Returns how many stamps were booked (already booked ones are skipped).
create or replace function public.add_stamps(p_class_id text, p_week date, p_player_ids uuid[])
  returns int
  language plpgsql security definer set search_path = public as $$
declare
  v_reward int;
  v_pid uuid;
  v_booked int := 0;
begin
  perform public.require_teacher();
  if extract(isodow from p_week) <> 1 then
    raise exception 'week must be a Monday' using errcode = '22023';
  end if;
  select stamp_reward into v_reward from settings where id = 1;

  foreach v_pid in array p_player_ids loop
    -- only pupils of this class
    perform 1 from profiles
      where id = v_pid and class_id = p_class_id and role = 'student';
    continue when not found;

    -- at most one stamp per pupil and week
    continue when exists (
      select 1 from coin_ledger
      where player_id = v_pid and reason = 'stamp' and ref = p_week::text
    );

    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_pid, v_reward, 'stamp', p_week::text, auth.uid());
    update profiles set coins = coins + v_reward where id = v_pid;
    v_booked := v_booked + 1;
  end loop;

  return v_booked;
end $$;

-- Manual correction of coins, with a note. The result may not go below zero.
create or replace function public.adjust_coins(p_player_id uuid, p_delta int, p_note text)
  returns int
  language plpgsql security definer set search_path = public as $$
declare
  v_new int;
begin
  perform public.require_teacher();
  if p_delta = 0 then
    raise exception 'delta must not be 0' using errcode = '22023';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'a note is required' using errcode = '22023';
  end if;

  update profiles set coins = coins + p_delta
    where id = p_player_id and role = 'student'
    returning coins into v_new;
  if not found then
    raise exception 'pupil not found' using errcode = 'P0002';
  end if;

  insert into coin_ledger (player_id, delta, reason, ref, created_by)
    values (p_player_id, p_delta, 'teacher', left(trim(p_note), 200), auth.uid());
  return v_new;
end $$;

-- Switches for the shop and the build mode of a class.
create or replace function public.set_class_flags(p_class_id text, p_shop_open boolean, p_build_open boolean)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  update classes set shop_open = p_shop_open, build_open = p_build_open where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
end $$;

-- Only logged-in users may call these; anon may not.
revoke execute on function public.require_teacher() from public, anon;
revoke execute on function public.add_stamps(text, date, uuid[]) from public, anon;
revoke execute on function public.adjust_coins(uuid, int, text) from public, anon;
revoke execute on function public.set_class_flags(text, boolean, boolean) from public, anon;
grant execute on function public.add_stamps(text, date, uuid[]) to authenticated;
grant execute on function public.adjust_coins(uuid, int, text) to authenticated;
grant execute on function public.set_class_flags(text, boolean, boolean) to authenticated;
