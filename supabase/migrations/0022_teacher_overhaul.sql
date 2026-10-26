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

create table class_notices (
 class_id text primary key references classes on delete cascade,
 text text not null check(length(text) between 1 and 140),valid_until date not null,
 created_by uuid references profiles on delete set null,created_at timestamptz not null default now()
);
alter table class_notices enable row level security;
revoke all on class_notices from anon,authenticated;
grant select on class_notices to authenticated;
create policy class_notices_read on class_notices for select to authenticated using (
 public.is_teacher() or (class_id=public.current_class() and valid_until>=public.quest_today())
);
create function public.set_class_notice(p_class_id text,p_text text,p_valid_until date default null) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform public.require_teacher();
 if p_text is null then delete from class_notices where class_id=p_class_id; return; end if;
 if length(trim(p_text)) not between 1 and 140 then raise exception 'notice must have 1 to 140 characters' using errcode='22023'; end if;
 insert into class_notices(class_id,text,valid_until,created_by) values(p_class_id,trim(p_text),coalesce(p_valid_until,quest_today()+7),auth.uid())
 on conflict(class_id) do update set text=excluded.text,valid_until=excluded.valid_until,created_by=excluded.created_by,created_at=clock_timestamp();
end $$;
create function public.class_board(p_class_id text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_today date:=quest_today(); v_week date:=date_trunc('week',v_today)::date;
 v_pupils int; v_streak int:=0; v_day date; v_solved int;
begin
 perform public.require_teacher();
 select count(*) into v_pupils from profiles where role='student' and class_id=p_class_id;
 -- Only school days with offered quests participate, so holidays/weekends do not break a run.
 if v_pupils>0 then
  for v_day in select distinct day from daily_quests where active and day<=v_today and extract(isodow from day)<=5 order by day desc loop
   select count(distinct r.player_id) into v_solved from daily_quest_results r
    join profiles p on p.id=r.player_id join daily_quests q on q.key=r.quest_key
    where p.role='student' and p.class_id=p_class_id and q.active and q.day=v_day
    and (r.solved_at at time zone 'Europe/Berlin')::date=v_day;
   exit when v_solved*2<v_pupils;
   v_streak:=v_streak+1;
  end loop;
 end if;
 return jsonb_build_object('week',v_week,
  'solved_week',(select count(*) from daily_quest_results r join daily_quests q on q.key=r.quest_key join profiles p on p.id=r.player_id
   where p.role='student' and p.class_id=p_class_id and r.solved_at is not null and q.active and q.day between v_week and v_today),
  'goal_week',v_pupils*(select count(*) from daily_quests where active and day between v_week and v_today),
  'solved_today',(select count(*) from daily_quest_results r join daily_quests q on q.key=r.quest_key join profiles p on p.id=r.player_id
   where p.role='student' and p.class_id=p_class_id and r.solved_at is not null and q.active and q.day=v_today),
  'class_streak',v_streak,
  'stamps_week',(select count(*) from coin_ledger l join profiles p on p.id=l.player_id where p.class_id=p_class_id and p.role='student' and l.reason='stamp' and l.ref=v_week::text),
  'notice',(select text from class_notices where class_id=p_class_id and valid_until>=v_today));
end $$;
create function public.teacher_village_members(p_class_id text)
returns table(id uuid,nickname text,plot_index int,avatar jsonb,class_id text,level int,title_label text,frame_id text)
language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_teacher();
 return query select p.id,p.nickname,p.plot_index,p.avatar,p.class_id,p.level,r.label,p.frame_id
  from profiles p left join level_rewards r on r.id=p.title_id where p.role='student' and p.class_id=p_class_id;
end $$;
create function public.teacher_pupil_quests(p_player_id uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
 perform public.require_teacher();
 if not exists(select 1 from profiles where id=p_player_id and role='student') then raise exception 'pupil not found' using errcode='P0002'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('key',q.key,'day',q.day,'catch_up',q.day<quest_today(),'type',q.type,'prompt',q.prompt,'solved',r.solved_at is not null,'attempts',coalesce(r.attempts,0)) order by q.day desc,q.slot)
  from daily_quests q left join daily_quest_results r on r.quest_key=q.key and r.player_id=p_player_id
  where q.active and q.day between quest_today()-1 and quest_today()),'[]'::jsonb);
end $$;
revoke execute on function public.set_class_notice(text,text,date),public.class_board(text),public.teacher_village_members(text),public.teacher_pupil_quests(uuid) from public,anon;
grant execute on function public.set_class_notice(text,text,date),public.class_board(text),public.teacher_village_members(text),public.teacher_pupil_quests(uuid) to authenticated;
