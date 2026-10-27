-- 0033: season titles and frames are owned through the pass (player_rewards), not through a level.
-- Level rewards keep working as before.
create or replace function public.set_title(p_id text) returns void
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); v_level int; v_required int; v_season text;
begin
 select level into v_level from profiles where id=v_uid for update;
 if p_id is not null then
  select level, season into v_required, v_season from level_rewards where id=p_id and kind='title';
  if not found then raise exception 'unknown title' using errcode='22023'; end if;
  if v_season is not null then
   if not exists (select 1 from player_rewards where player_id=v_uid and reward_id=p_id) then
    raise exception 'locked' using errcode='42501';
   end if;
  elsif v_level<v_required then
   raise exception 'locked' using errcode='42501';
  end if;
 end if;
 update profiles set title_id=p_id where id=v_uid;
end $$;
create or replace function public.set_frame(p_id text) returns void
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); v_level int; v_required int; v_season text;
begin
 select level into v_level from profiles where id=v_uid for update;
 select level, season into v_required, v_season from level_rewards where id=p_id and kind='frame';
 if not found then raise exception 'unknown frame' using errcode='22023'; end if;
 if v_season is not null then
  if not exists (select 1 from player_rewards where player_id=v_uid and reward_id=p_id) then
   raise exception 'locked' using errcode='42501';
  end if;
 elsif v_level<v_required then
  raise exception 'locked' using errcode='42501';
 end if;
 update profiles set frame_id=p_id where id=v_uid;
end $$;
revoke execute on function public.set_title(text),public.set_frame(text) from public,anon;
grant execute on function public.set_title(text),public.set_frame(text) to authenticated;
