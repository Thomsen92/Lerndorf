-- Lerndorf: pupils pick their figure (boy or girl) on first login and may change it later in the
-- settings. Stored as avatar.character; village_members() already returns avatar to classmates.
create or replace function public.set_character(p_character text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_avatar jsonb;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if p_character is null or p_character not in ('boy', 'girl') then
    raise exception 'unknown character' using errcode = '22023';
  end if;
  update profiles
    set avatar = coalesce(avatar, '{}'::jsonb) || jsonb_build_object('character', p_character)
    where id = v_uid and role = 'student'
    returning avatar into v_avatar;
  if not found then
    raise exception 'only pupils can pick a figure' using errcode = '42501';
  end if;
  return v_avatar;
end $$;

revoke execute on function public.set_character(text) from public, anon;
grant execute on function public.set_character(text) to authenticated;
