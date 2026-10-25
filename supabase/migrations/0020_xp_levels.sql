-- XP is append-only. Only server RPCs may change progress or reward balances.
create table public.level_rewards (
 id text primary key, kind text not null check(kind in ('title','frame')),
 level int not null check(level>=1), label text not null, sort int not null
);
insert into level_rewards(id,kind,level,label,sort) values
 ('title_newcomer','title',1,'Newcomer',1),('title_word_collector','title',3,'Word Collector',3),
 ('title_quest_rookie','title',5,'Quest Rookie',5),('title_busy_bee','title',7,'Busy Bee',7),
 ('title_grammar_explorer','title',10,'Grammar Explorer',10),('title_verb_tamer','title',12,'Verb Tamer',12),
 ('title_vocab_hero','title',15,'Vocab Hero',15),('title_storyteller','title',18,'Storyteller',18),
 ('title_village_star','title',20,'Village Star',20),('title_english_wizard','title',23,'English Wizard',23),
 ('title_quest_master','title',25,'Quest Master',25),('title_village_legend','title',28,'Village Legend',28),
 ('title_lerndorf_champion','title',30,'Lerndorf Champion',30),
 ('frame_wood','frame',1,'Holz',1),('frame_bronze','frame',5,'Bronze',5),('frame_silver','frame',10,'Silber',10),
 ('frame_gold','frame',15,'Gold',15),('frame_emerald','frame',20,'Smaragd',20),
 ('frame_sapphire','frame',25,'Saphir',25),('frame_rainbow','frame',30,'Regenbogen',30);
alter table profiles add column xp int not null default 0 check(xp>=0),
 add column level int not null default 1 check(level>=1),
 add column title_id text references level_rewards(id),
 add column frame_id text not null default 'frame_wood' references level_rewards(id),
 add column progress_seen_id bigint not null default 0;
create table public.xp_ledger (
 id bigserial primary key, player_id uuid not null references profiles on delete cascade,
 delta int not null check(delta>0), reason text not null check(reason in ('quest','day_goal','streak','stamp','tutorial','first_place','backfill')),
 ref text not null, created_at timestamptz not null default now(), unique(player_id,reason,ref)
);
create table public.chests (
 id bigserial primary key, player_id uuid not null references profiles on delete cascade,
 size text not null check(size in ('normal','big')), source text not null check(source in ('level','streak','backfill')),
 ref text not null, created_at timestamptz not null default now(), opened_at timestamptz,
 roll text check(roll in ('normal','double','triple')), coins int check(coins>0),
 unique(player_id,source,ref), check((opened_at is null and roll is null and coins is null) or (opened_at is not null and roll is not null and coins is not null))
);
create table public.streaks (
 player_id uuid primary key references profiles on delete cascade,
 current int not null default 0 check(current>=0), best int not null default 0 check(best>=current),
 last_day date, shield_week date not null, shield_left int not null default 1 check(shield_left in (0,1))
);
alter table level_rewards enable row level security;
alter table xp_ledger enable row level security;
alter table chests enable row level security;
alter table streaks enable row level security;
create policy level_rewards_read on level_rewards for select to authenticated using(true);
create policy xp_ledger_read on xp_ledger for select to authenticated using(player_id=auth.uid() or public.is_teacher());
create policy chests_read on chests for select to authenticated using(player_id=auth.uid() or public.is_teacher());
create policy streaks_read on streaks for select to authenticated using(player_id=auth.uid() or public.is_teacher());
revoke all on level_rewards,xp_ledger,chests,streaks from public,anon,authenticated;
grant select on level_rewards,xp_ledger,chests,streaks to authenticated;
revoke all on sequence xp_ledger_id_seq,chests_id_seq from public,anon,authenticated;
alter table coin_ledger drop constraint coin_ledger_reason_check;
alter table coin_ledger add constraint coin_ledger_reason_check check(reason in ('task','stamp','purchase','refund','teacher','quest','tutorial','chest'));
create unique index coin_ledger_chest_once on coin_ledger(player_id,ref) where reason='chest';

create or replace function public.xp_rule(p_key text) returns int language plpgsql immutable set search_path=public as $$
begin
 case p_key when 'quest_first' then return 15; when 'quest_early' then return 10; when 'quest_late' then return 5;
 when 'day_goal' then return 15; when 'streak_step' then return 5; when 'streak_cap' then return 5;
 when 'stamp' then return 100; when 'tutorial' then return 50; when 'first_place' then return 10;
 else raise exception 'unknown XP rule: %',p_key using errcode='22023'; end case;
end $$;
create or replace function public.xp_for_level(p_level int) returns int language plpgsql immutable set search_path=public as $$
begin
 if p_level is null or p_level<1 then raise exception 'invalid level' using errcode='22023'; end if;
 return (25::bigint*(p_level-1)*(p_level+2)/2)::int;
end $$;
create or replace function public.level_for_xp(p_xp int) returns int language plpgsql immutable set search_path=public as $$
begin
 if p_xp is null or p_xp<0 then raise exception 'invalid XP' using errcode='22023'; end if;
 return floor((sqrt(9::numeric+8::numeric*p_xp/25)-1)/2)::int;
end $$;
create or replace function public.grant_xp(p_player uuid,p_delta int,p_reason text,p_ref text) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare v_xp int; v_before int; v_level int; v_granted int:=0; v_chests int:=0; v_rows int;
begin
 if p_delta is null or p_delta<=0 then raise exception 'XP grant must be positive' using errcode='22023'; end if;
 select xp,level into v_xp,v_before from profiles where id=p_player and role='student' for update;
 if not found then raise exception 'forbidden: pupils only' using errcode='42501'; end if;
 insert into xp_ledger(player_id,delta,reason,ref) values(p_player,p_delta,p_reason,p_ref) on conflict do nothing;
 get diagnostics v_rows=row_count;
 if v_rows>0 then
  v_granted:=p_delta; v_xp:=v_xp+p_delta;
 end if;
 v_level:=public.level_for_xp(v_xp);
 update profiles set xp=v_xp,level=v_level where id=p_player;
 if v_rows>0 then
  insert into chests(player_id,size,source,ref)
   select p_player,case when l%5=0 then 'big' else 'normal' end,'level',l::text from generate_series(v_before+1,v_level) l on conflict do nothing;
  get diagnostics v_chests=row_count;
 end if;
 return jsonb_build_object('granted',v_granted,'xp',v_xp,'level',v_level,'level_before',v_before,'new_chests',v_chests);
end $$;
revoke execute on function public.grant_xp(uuid,int,text,text) from public,anon,authenticated;
revoke execute on function public.xp_rule(text), public.xp_for_level(int), public.level_for_xp(int) from public,anon;
grant execute on function public.xp_rule(text), public.xp_for_level(int), public.level_for_xp(int) to authenticated;

-- Internal snapshot response; callers serialize on the profile before taking their cursors.
create or replace function public.progress_result(p_player uuid,p_before int,p_ledger bigint,p_chest bigint) returns jsonb
 language sql stable security definer set search_path=public as $$
 select jsonb_build_object('gained',coalesce((select jsonb_agg(jsonb_build_object('reason',reason,'xp',delta) order by id) from xp_ledger where player_id=p_player and id>p_ledger),'[]'::jsonb),
 'xp',p.xp,'level',p.level,'level_before',p_before,'new_chests',(select count(*) from chests where player_id=p_player and id>p_chest),
 'streak',jsonb_build_object('current',coalesce(s.current,0),'best',coalesce(s.best,0),'shield_left',case when s.shield_week=date_trunc('week',quest_today())::date then s.shield_left else 1 end,'restarted',false))
 from profiles p left join streaks s on s.player_id=p.id where p.id=p_player
$$;
revoke execute on function public.progress_result(uuid,int,bigint,bigint) from public,anon,authenticated;

create or replace function public.touch_streak(p_player uuid,p_day date) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare s streaks%rowtype; v_day date; v_week date; v_restarted boolean:=false; v_xp int:=0; v_milestone int;
begin
 perform 1 from profiles where id=p_player and role='student' for update;
 if not found then raise exception 'forbidden: pupils only' using errcode='42501'; end if;
 v_week:=date_trunc('week',p_day)::date;
 insert into streaks(player_id,shield_week) values(p_player,v_week) on conflict do nothing;
 select * into s from streaks where player_id=p_player for update;
 if p_day is null or p_day<=s.last_day or extract(isodow from p_day)>5 or not exists(select 1 from daily_quests where day=p_day and active) then
  return jsonb_build_object('current',s.current,'best',s.best,'shield_left',case when s.shield_week<v_week then 1 else s.shield_left end,'counted',false,'restarted',false,'xp',0,'milestone',null);
 end if;
 -- Process missed days in their own weeks so Monday's shield never shields last week's absence.
 for v_day in select d::date from generate_series(s.last_day+1,p_day-1,'1 day') d
  where extract(isodow from d)<=5 and exists(select 1 from daily_quests where day=d::date and active) order by d loop
  if date_trunc('week',v_day)::date>s.shield_week then s.shield_week:=date_trunc('week',v_day)::date; s.shield_left:=1; end if;
  if s.shield_left=1 then s.shield_left:=0; else s.current:=0; v_restarted:=true; end if;
 end loop;
 if v_week>s.shield_week then s.shield_week:=v_week; s.shield_left:=1; end if;
 s.current:=s.current+1; s.best:=greatest(s.best,s.current); s.last_day:=p_day;
 update streaks set current=s.current,best=s.best,last_day=s.last_day,shield_week=s.shield_week,shield_left=s.shield_left where player_id=p_player;
 v_xp:=xp_rule('streak_step')*least(s.current,xp_rule('streak_cap'));
 perform grant_xp(p_player,v_xp,'streak',p_day::text);
 if s.current=any(array[5,10,20,30,50,75,100]) then
  insert into chests(player_id,size,source,ref) values(p_player,'big','streak',s.current::text) on conflict do nothing;
  if found then v_milestone:=s.current; end if;
 end if;
 return jsonb_build_object('current',s.current,'best',s.best,'shield_left',s.shield_left,'counted',true,'restarted',v_restarted,'xp',v_xp,'milestone',v_milestone);
end $$;
revoke execute on function public.touch_streak(uuid,date) from public,anon,authenticated;
create or replace function public.submit_quest_answer(p_key text, p_answer jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.quest_today();
  v_paid int := public.quest_paid_attempts();
  v_q daily_quests%rowtype;
  v_sol jsonb;
  v_attempts int;
  v_solved_at timestamptz;
  v_nominal int;
  v_pay int := 0;
  v_correct boolean;
  v_left int;
  v_coins int;
  v_before int; v_ledger bigint; v_chest bigint; v_delta int; v_streak jsonb; v_progress jsonb;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles p where p.id = v_uid and p.role = 'student') then
    raise exception 'only pupils can answer' using errcode = '42501';
  end if;

  select level into v_before from profiles where id=v_uid for update;
  select coalesce(max(id),0) into v_ledger from xp_ledger where player_id=v_uid;
  select coalesce(max(id),0) into v_chest from chests where player_id=v_uid;
  select * into v_q from daily_quests
    where key = p_key and active and day in (v_today, v_today - 1);
  if not found then
    raise exception 'quest not available' using errcode = 'P0002';
  end if;

  insert into daily_quest_results (player_id, quest_key) values (v_uid, p_key)
    on conflict do nothing;
  select attempts, solved_at into v_attempts, v_solved_at from daily_quest_results
    where player_id = v_uid and quest_key = p_key
    for update;

  if v_solved_at is not null then
    select coins into v_coins from profiles where id = v_uid;
    return jsonb_build_object('correct', true, 'already_solved', true, 'coins', v_coins,
                              'reward', 0, 'reward_left', 0, 'hint', null, 'progress',progress_result(v_uid,v_before,v_ledger,v_chest));
  end if;

  v_nominal := case when v_q.day = v_today then v_q.reward else (v_q.reward + 1) / 2 end;
  select solution into v_sol from daily_quest_solutions where quest_key = p_key;
  v_correct := public.quest_answer_matches(v_q.type, v_q.data, v_sol, p_answer);
  v_attempts := v_attempts + 1;

  if v_correct then
    if v_attempts <= v_paid then v_pay := v_nominal; end if;
    update daily_quest_results set attempts = v_attempts, solved_at = now(), reward_paid = v_pay
      where player_id = v_uid and quest_key = p_key;
    if v_pay > 0 then
      insert into coin_ledger (player_id, delta, reason, ref, created_by)
        values (v_uid, v_pay, 'quest', p_key, null);
      update profiles set coins = coins + v_pay where id = v_uid returning coins into v_coins;
    else
      select coins into v_coins from profiles where id = v_uid;
    end if;
    v_left := 0;
  else
    update daily_quest_results set attempts = v_attempts
      where player_id = v_uid and quest_key = p_key;
    select coins into v_coins from profiles where id = v_uid;
    v_left := case when v_attempts < v_paid then v_nominal else 0 end;
  end if;

  if v_correct then
    v_delta:=xp_rule(case when v_attempts=1 then 'quest_first' when v_attempts<=3 then 'quest_early' else 'quest_late' end);
    if v_q.day<>v_today then v_delta:=(v_delta+1)/2; end if;
    perform grant_xp(v_uid,v_delta,'quest',p_key);
    if v_q.day=v_today then
      if (select count(*) from daily_quests where day=v_today and active)=3
         and (select count(*) from daily_quests q join daily_quest_results r on r.quest_key=q.key and r.player_id=v_uid where q.day=v_today and q.active and r.solved_at is not null)=3 then
        perform grant_xp(v_uid,xp_rule('day_goal'),'day_goal',v_today::text);
      end if;
      v_streak:=touch_streak(v_uid,v_today);
    end if;
  end if;
  v_progress:=progress_result(v_uid,v_before,v_ledger,v_chest);
  if v_streak is not null then v_progress:=jsonb_set(v_progress,'{streak,restarted}',v_streak->'restarted'); end if;
  return jsonb_build_object(
    'correct', v_correct,
    'already_solved', false,
    'coins', v_coins,
    'reward', v_pay,
    'reward_left', v_left,
    'progress',v_progress,
    'hint', case when v_correct then null else nullif(v_q.hint, '') end
  );
end $$;
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
  select stamp_reward into v_reward from classes where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;

  foreach v_pid in array p_player_ids loop
    perform 1 from profiles
      where id = v_pid and class_id = p_class_id and role = 'student' for update;
    continue when not found;
    continue when exists (
      select 1 from coin_ledger
      where player_id = v_pid and reason = 'stamp' and ref = p_week::text
    );
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_pid, v_reward, 'stamp', p_week::text, auth.uid());
    update profiles set coins = coins + v_reward where id = v_pid;
    perform grant_xp(v_pid,xp_rule('stamp'),'stamp',p_week::text);
    v_booked := v_booked + 1;
  end loop;
  return v_booked;
end $$;

create or replace function public.tutorial_finish() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text; v_before int; v_ledger bigint; v_chest bigint;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select level into v_before from profiles where id=v_uid for update;
  select coalesce(max(id),0) into v_ledger from xp_ledger where player_id=v_uid;
  select coalesce(max(id),0) into v_chest from chests where player_id=v_uid;
  select step into v_step from tutorial_progress where player_id = v_uid for update;
  if v_step is distinct from 'done' then
    raise exception 'not at this step' using errcode = '22023';
  end if;
  update tutorial_progress set completed_at = coalesce(completed_at, now()) where player_id = v_uid;
  if not exists(select 1 from xp_ledger where player_id=v_uid and reason='backfill' and ref='tutorial') then
    perform grant_xp(v_uid,xp_rule('tutorial'),'tutorial','tutorial');
  end if;
  return public.tutorial_state_of(v_uid) || jsonb_build_object('progress',progress_result(v_uid,v_before,v_ledger,v_chest));
end $$;
drop function public.place_in_slot(text,text,int);
create or replace function public.place_in_slot(p_item_id text, p_slot text, p_rot int) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_build boolean;
  v_kind text := public.slot_kind(p_slot);
  v_qty int;
  v_placed int;
  v_id bigint; v_before int; v_ledger bigint; v_chest bigint;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select level into v_before from profiles where id=v_uid for update;
  select coalesce(max(id),0) into v_ledger from xp_ledger where player_id=v_uid;
  select coalesce(max(id),0) into v_chest from chests where player_id=v_uid;
  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can build' using errcode = '42501';
  end if;
  select build_open into v_build from classes where id = v_class;
  if not v_build then
    raise exception 'building is closed for this class' using errcode = '42501';
  end if;
  if v_kind is null then
    raise exception 'unknown slot' using errcode = '22023';
  end if;
  select * into v_item from items where id = p_item_id and active;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if v_item.kind <> v_kind then
    raise exception 'item does not fit this slot' using errcode = '22023';
  end if;
  if p_rot is null or p_rot not between 0 and 3 or (v_kind <> 'deco' and p_rot <> 0) then
    raise exception 'rotation not allowed' using errcode = '22023';
  end if;

  -- the old item of this slot goes back first (rolled back if the new one is refused)
  delete from placements where player_id = v_uid and slot = p_slot;

  if not v_item.starter then
    select coalesce(sum(inv.qty), 0) into v_qty from inventory inv
      where inv.player_id = v_uid and inv.item_id = p_item_id;
    select count(*) into v_placed from placements
      where player_id = v_uid and item_id = p_item_id;
    if v_qty - v_placed <= 0 then
      raise exception 'no free copy in the inventory' using errcode = '22023';
    end if;
  end if;

  insert into placements (player_id, item_id, slot, rot)
    values (v_uid, p_item_id, p_slot, p_rot)
    returning id into v_id;
  perform grant_xp(v_uid,xp_rule('first_place'),'first_place',p_item_id);
  return jsonb_build_object('ok',true,'id',v_id,'progress',progress_result(v_uid,v_before,v_ledger,v_chest));
end $$;

revoke execute on function public.place_in_slot(text,text,int) from public,anon;
grant execute on function public.place_in_slot(text,text,int) to authenticated;
-- PostgreSQL requires drop/create when adding columns to a table return type.
drop function public.village_members();
create or replace function public.village_members()
 returns table(id uuid,nickname text,plot_index int,avatar jsonb,class_id text,level int,title_label text,frame_id text)
 language sql stable security definer set search_path=public as $$
 select p.id,p.nickname,p.plot_index,p.avatar,p.class_id,p.level,r.label,p.frame_id
 from profiles p left join level_rewards r on r.id=p.title_id
 where p.role='student' and p.class_id=public.current_class()
$$;
revoke execute on function public.village_members() from public,anon;
grant execute on function public.village_members() to authenticated;

-- XP BACKFILL START
-- Separate immutable history refs keep migration replay safe without generating every level chest.
insert into xp_ledger(player_id,delta,reason,ref)
 select r.player_id,xp_rule('quest_early'),'backfill','quest:'||r.quest_key
 from daily_quest_results r join profiles p on p.id=r.player_id
 where r.solved_at is not null and p.role='student' on conflict do nothing;
insert into xp_ledger(player_id,delta,reason,ref)
 select distinct c.player_id,xp_rule('stamp'),'backfill','stamp:'||c.ref
 from coin_ledger c join profiles p on p.id=c.player_id where c.reason='stamp' and p.role='student' on conflict do nothing;
insert into xp_ledger(player_id,delta,reason,ref)
 select t.player_id,xp_rule('tutorial'),'backfill','tutorial'
 from tutorial_progress t join profiles p on p.id=t.player_id where t.step='done' and p.role='student' on conflict do nothing;
update profiles p set xp=x.total,level=level_for_xp(x.total)
 from (select player_id,sum(delta)::int total from xp_ledger group by player_id) x where p.id=x.player_id;
insert into chests(player_id,size,source,ref)
 select p.id,case when l%5=0 then 'big' else 'normal' end,'backfill',l::text
 from profiles p cross join lateral generate_series(greatest(2,p.level-2),p.level) l
 where p.role='student' and exists(select 1 from xp_ledger x where x.player_id=p.id and x.reason='backfill')
 on conflict do nothing;
-- XP BACKFILL END

create or replace function public.progress_pupil() returns uuid
 language plpgsql stable security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
 if v_uid is null or not exists(select 1 from profiles where id=v_uid and role='student') then
  raise exception 'forbidden: pupils only' using errcode='42501';
 end if;
 return v_uid;
end $$;
revoke execute on function public.progress_pupil() from public,anon,authenticated;

create or replace function public.my_progress() returns jsonb
 language plpgsql stable security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); v_day date:=quest_today(); p profiles%rowtype; s streaks%rowtype;
begin
 select * into p from profiles where id=v_uid;
 select * into s from streaks where player_id=v_uid;
 return jsonb_build_object('xp',p.xp,'level',p.level,'level_xp',xp_for_level(p.level),'next_level_xp',xp_for_level(p.level+1),'title_id',p.title_id,'frame_id',p.frame_id,
 'streak',jsonb_build_object('current',coalesce(s.current,0),'best',coalesce(s.best,0),'shield_left',case when s.shield_week=date_trunc('week',v_day)::date then s.shield_left else 1 end,'today_done',coalesce(s.last_day=v_day,false)),
 'today',jsonb_build_object('solved',(select count(*) from daily_quests q join daily_quest_results r on r.quest_key=q.key and r.player_id=v_uid where q.active and q.day=v_day and r.solved_at is not null),'total',(select count(*) from daily_quests where active and day=v_day)),
 'chests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'size',size,'source',source,'ref',ref) order by id) from chests where player_id=v_uid and opened_at is null),'[]'::jsonb),
 'unseen',coalesce((select jsonb_agg(to_jsonb(x) order by id) from (select id,reason,ref,delta,created_at from xp_ledger where player_id=v_uid and id>p.progress_seen_id order by id limit 50) x),'[]'::jsonb),
 'stats',jsonb_build_object('quests',(select count(*) from daily_quest_results where player_id=v_uid and solved_at is not null),'stamps',(select count(*) from coin_ledger where player_id=v_uid and reason='stamp'),'best_streak',coalesce(s.best,0)));
end $$;

create or replace function public.mark_progress_seen(p_id bigint) returns void
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil();
begin
 -- Clamp to the player's own existing ledger: a forged future cursor must not hide future rewards.
 update profiles set progress_seen_id=greatest(progress_seen_id,coalesce((select max(id) from xp_ledger where player_id=v_uid and id<=p_id),0)) where id=v_uid;
end $$;

create or replace function public.open_chest(p_id bigint) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); c chests%rowtype; v_level int; v_balance int; v_roll double precision; v_factor int;
begin
 select level,coins into v_level,v_balance from profiles where id=v_uid for update;
 select * into c from chests where id=p_id and player_id=v_uid for update;
 if not found then raise exception 'chest not found' using errcode='P0002'; end if;
 if c.opened_at is null then
  if c.source='level' then v_level:=c.ref::int; end if;
  v_roll:=random();
  if v_roll<0.70 then c.roll:='normal'; v_factor:=1;
  elsif v_roll<0.95 then c.roll:='double'; v_factor:=2;
  else c.roll:='triple'; v_factor:=3; end if;
  c.coins:=(20+5*v_level)*(case when c.size='big' then 3 else 1 end)*v_factor;
  insert into coin_ledger(player_id,delta,reason,ref,created_by) values(v_uid,c.coins,'chest',c.id::text,null);
  update profiles set coins=coins+c.coins where id=v_uid returning coins into v_balance;
  update chests set opened_at=now(),roll=c.roll,coins=c.coins where id=c.id;
 end if;
 return jsonb_build_object('coins_won',c.coins,'roll',c.roll,'coins',v_balance);
end $$;

create or replace function public.set_title(p_id text) returns void
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); v_level int; v_required int;
begin
 select level into v_level from profiles where id=v_uid for update;
 if p_id is not null then
  select level into v_required from level_rewards where id=p_id and kind='title';
  if not found then raise exception 'unknown title' using errcode='22023'; end if;
  if v_level<v_required then raise exception 'locked' using errcode='42501'; end if;
 end if;
 update profiles set title_id=p_id where id=v_uid;
end $$;
create or replace function public.set_frame(p_id text) returns void
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); v_level int; v_required int;
begin
 select level into v_level from profiles where id=v_uid for update;
 select level into v_required from level_rewards where id=p_id and kind='frame';
 if not found then raise exception 'unknown frame' using errcode='22023'; end if;
 if v_level<v_required then raise exception 'locked' using errcode='42501'; end if;
 update profiles set frame_id=p_id where id=v_uid;
end $$;
revoke execute on function public.my_progress(),public.mark_progress_seen(bigint),public.open_chest(bigint),public.set_title(text),public.set_frame(text) from public,anon;
grant execute on function public.my_progress(),public.mark_progress_seen(bigint),public.open_chest(bigint),public.set_title(text),public.set_frame(text) to authenticated;
