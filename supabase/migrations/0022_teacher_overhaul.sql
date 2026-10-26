-- Teacher workspaces. Pupil writes remain exclusively inside role-checked RPCs.
-- A timestamp records future attempts, including unsuccessful ones. Historic unsolved
-- attempts have no reliable timestamp and must not appear as active on migration day.
alter table daily_quest_results add column updated_at timestamptz;
create function public.touch_quest_result() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at := now(); return new; end $$;
create trigger daily_quest_result_activity before insert or update on daily_quest_results
  for each row execute function public.touch_quest_result();
revoke execute on function public.touch_quest_result() from public,anon,authenticated;

create function public.teacher_class_pupils(p_class_id text,p_week date)
returns table(id uuid,nickname text,coins int,plot_index int,tutorial_step text,
 last_sign_in_at timestamptz,last_answer_at timestamptz,quests_solved_week int,
 quests_offered_week int,holiday_week boolean,level int,xp int,streak int)
language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_teacher();
 if p_week is null or extract(isodow from p_week)<>1 then raise exception 'week must be a Monday' using errcode='22023'; end if;
 return query select p.id,p.nickname,p.coins,p.plot_index,
   case when t.step='done' then null when t.step is not null then t.step
     when exists(select 1 from placements pl where pl.player_id=p.id and pl.slot='house') then null else 'not_started' end,
   u.last_sign_in_at,(select max(coalesce(r.updated_at,r.solved_at)) from daily_quest_results r where r.player_id=p.id),
   (select count(*)::int from daily_quest_results r join daily_quests q on q.key=r.quest_key
     where r.player_id=p.id and r.solved_at is not null and q.active and q.day between p_week and least(p_week+6,quest_today())),
   (select count(*)::int from daily_quests q where q.active and q.day between p_week and least(p_week+6,quest_today())),
   not exists(select 1 from daily_quests q where q.active and q.day between p_week and p_week+6),
   p.level,p.xp,coalesce(s.current,0)
 from profiles p join auth.users u on u.id=p.id left join tutorial_progress t on t.player_id=p.id
 left join streaks s on s.player_id=p.id where p.role='student' and p.class_id=p_class_id order by p.nickname;
end $$;

create function public.teacher_pupil_detail(p_player_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_week date:=date_trunc('week',quest_today())::date; v_step text;
begin
 perform public.require_teacher();
 if not exists(select 1 from profiles where id=p_player_id and role='student') then raise exception 'pupil not found' using errcode='P0002'; end if;
 select case when t.step='done' then null else t.step end into v_step from tutorial_progress t where t.player_id=p_player_id;
 if not found and not exists(select 1 from placements where player_id=p_player_id and slot='house') then v_step:='not_started'; end if;
 return jsonb_build_object('tutorial_step',v_step,
 'slots',coalesce((select jsonb_agg(jsonb_build_object('slot',pl.slot,'item_id',pl.item_id,'name_de',i.name_de,'rot',pl.rot) order by pl.slot)
   from placements pl join items i on i.id=pl.item_id where pl.player_id=p_player_id),'[]'::jsonb),
 'unplaced',coalesce((select jsonb_agg(jsonb_build_object('item_id',iv.item_id,'name_de',i.name_de,'qty',iv.qty-(select count(*) from placements pl where pl.player_id=iv.player_id and pl.item_id=iv.item_id)))
   from inventory iv join items i on i.id=iv.item_id where iv.player_id=p_player_id and iv.qty>(select count(*) from placements pl where pl.player_id=iv.player_id and pl.item_id=iv.item_id)),'[]'::jsonb),
 'week',coalesce((select jsonb_agg(jsonb_build_object('day',q.day,'key',q.key,'solved',r.solved_at is not null,'catch_up',r.solved_at is not null and (r.solved_at at time zone 'Europe/Berlin')::date>q.day,'attempts',coalesce(r.attempts,0)) order by q.day,q.slot)
   from daily_quests q left join daily_quest_results r on r.quest_key=q.key and r.player_id=p_player_id where q.active and q.day between v_week and least(v_week+6,quest_today())),'[]'::jsonb),
 'ledger',coalesce((select jsonb_agg(jsonb_build_object('at',l.created_at,'delta',l.delta,'reason',l.reason,'ref',l.ref) order by l.created_at desc,l.id desc)
   from (select * from coin_ledger where player_id=p_player_id order by created_at desc,id desc limit 50) l),'[]'::jsonb));
end $$;

create function public.adjust_coins_many(p_player_ids uuid[],p_delta int,p_note text) returns int
language plpgsql security definer set search_path=public as $$
declare v_count int; v_p profiles%rowtype;
begin
 perform public.require_teacher();
 if p_delta is null or p_delta=0 then raise exception 'delta must not be 0' using errcode='22023'; end if;
 if nullif(trim(p_note),'') is null then raise exception 'a note is required' using errcode='22023'; end if;
 v_count:=coalesce(cardinality(p_player_ids),0);
 if v_count=0 or v_count<>(select count(distinct v) from unnest(p_player_ids) v) then raise exception 'empty or duplicate pupil ids' using errcode='22023'; end if;
 -- Deterministic locking order avoids deadlocks between overlapping selections.
 perform id from profiles where id=any(p_player_ids) order by id for update;
 if (select count(*) from profiles where id=any(p_player_ids) and role='student')<>v_count then raise exception 'pupil not found' using errcode='P0002'; end if;
 for v_p in select * from profiles where id=any(p_player_ids) order by id loop
   if v_p.coins::bigint+p_delta<0 then raise exception 'insufficient coins: %',v_p.nickname using errcode='22023'; end if;
 end loop;
 update profiles set coins=coins+p_delta where id=any(p_player_ids);
 insert into coin_ledger(player_id,delta,reason,ref,created_by)
   select id,p_delta,'teacher',left(trim(p_note),200),auth.uid() from profiles where id=any(p_player_ids);
 return v_count;
end $$;
revoke execute on function public.teacher_class_pupils(text,date),public.teacher_pupil_detail(uuid),public.adjust_coins_many(uuid[],int,text) from public,anon;
grant execute on function public.teacher_class_pupils(text,date),public.teacher_pupil_detail(uuid),public.adjust_coins_many(uuid[],int,text) to authenticated;
