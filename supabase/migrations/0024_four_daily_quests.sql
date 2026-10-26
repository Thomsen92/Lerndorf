-- Allow a fourth daily quest; retain all answer, reward, locking and idempotency checks.
alter table public.daily_quests drop constraint daily_quests_slot_check;
alter table public.daily_quests add constraint daily_quests_slot_check check (slot between 1 and 4);

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
      if (select count(*) from daily_quests where day=v_today and active)>0
         and (select count(*) from daily_quests where day=v_today and active)
           = (select count(*) from daily_quests q join daily_quest_results r on r.quest_key=q.key and r.player_id=v_uid where q.day=v_today and q.active and r.solved_at is not null) then
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
