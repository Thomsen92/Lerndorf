-- A narrowly scoped, read-only visitor card. Existing profile/streak RLS stays unchanged.
create function public.public_profile(p_player_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_class text; result jsonb;
begin
  select class_id into v_class from profiles where id=auth.uid() and role='student';
  if v_class is null then raise exception 'only pupils can view profiles' using errcode='42501'; end if;
  select jsonb_build_object(
    'id',p.id,'nickname',p.nickname,'level',p.level,'title_label',r.label,'frame_id',p.frame_id,
    'current_streak',coalesce(s.current,0),'character',p.avatar->'character',
    'look',coalesce(p.avatar #> array['wardrobe',p.avatar->>'character'],'{"items":[],"colors":{}}'::jsonb)
  ) into result
  from profiles p left join level_rewards r on r.id=p.title_id left join streaks s on s.player_id=p.id
  where p.id=p_player_id and p.role='student' and p.class_id=v_class;
  if result is null then raise exception 'profile unavailable' using errcode='P0002'; end if;
  return result;
end $$;
revoke all on function public.public_profile(uuid) from public,anon;
grant execute on function public.public_profile(uuid) to authenticated;
