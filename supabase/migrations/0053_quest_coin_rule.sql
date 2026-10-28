-- Daily quests, coin rule D11 changed by the teacher (28.10.2026): the 1st and 2nd attempt pay the
-- full reward, every later correct answer pays half (rounded up). Before, only the first three
-- attempts paid and later ones paid nothing. Catch-up quests are halved first, then the rule applies.
-- XP rules (quest_first / quest_early / quest_late) stay as they are. Attempts stay unlimited.

-- How many attempts pay in full; the single place for this number.
create or replace function public.quest_full_attempts() returns int
  language sql immutable as $$ select 2 $$;

-- Coins a correct answer on attempt number p_attempt (1-based) pays for a nominal reward.
create or replace function public.quest_reward_for(p_nominal int, p_attempt int) returns int
  language sql immutable as $$
  select case when p_nominal <= 0 then 0
              when p_attempt <= public.quest_full_attempts() then p_nominal
              else (p_nominal + 1) / 2 end
$$;

-- my_daily_quests(): array of quests the pupil can work on right now. No hint, no solution.
-- reward is the nominal reward of the day; reward_left is what a correct answer would pay now.
create or replace function public.my_daily_quests() returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.quest_today();
  v_res jsonb;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles p where p.id = v_uid and p.role = 'student') then
    raise exception 'only pupils can answer' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) - 'sort_slot' order by x.catch_up, x.day, x.sort_slot), '[]'::jsonb)
    into v_res
  from (
    select q.key, q.day, (q.day <> v_today) as catch_up, q.type, q.prompt, q.data,
           case when q.day = v_today then q.reward else (q.reward + 1) / 2 end as reward,
           (r.solved_at is not null) as solved,
           coalesce(r.attempts, 0) as attempts,
           case when r.solved_at is null
                then public.quest_reward_for(
                  case when q.day = v_today then q.reward else (q.reward + 1) / 2 end,
                  coalesce(r.attempts, 0) + 1)
                else 0 end as reward_left,
           q.slot as sort_slot
    from daily_quests q
    left join daily_quest_results r on r.quest_key = q.key and r.player_id = v_uid
    where q.active
      and (q.day = v_today or (q.day = v_today - 1 and r.solved_at is null))
  ) x;
  return v_res;
end $$;

-- submit_quest_answer(key, answer). Books at most once per pupil and quest: the results row is

create or replace function public.submit_quest_answer(p_key text, p_answer jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.quest_today();
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
    v_pay := public.quest_reward_for(v_nominal, v_attempts);
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
    v_left := public.quest_reward_for(v_nominal, v_attempts + 1);
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

revoke execute on function public.quest_full_attempts(), public.quest_reward_for(int, int) from public, anon;
