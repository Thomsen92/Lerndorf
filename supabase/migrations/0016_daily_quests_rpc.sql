-- Lerndorf: daily quests, pupil side. Today's quests plus yesterday's unsolved ones (catch-up, half
-- reward). Pupils never read the quest tables; these security definer RPCs are the only way.
-- Solutions stay on the server; the hint is returned only together with a wrong answer.

-- D11: attempts are unlimited, but coins are paid only if the correct answer comes within the
-- first N attempts of a pupil on a quest. N lives here and nowhere else.
create or replace function public.quest_paid_attempts() returns int
  language sql immutable as $$ select 3 $$;

-- A listening quest is checked like its answer mode (choice or gap); everything else by its type.
create or replace function public.quest_answer_matches(
  p_type text, p_data jsonb, p_solution jsonb, p_answer jsonb
) returns boolean
  language sql immutable as $$
  select coalesce(public.answer_matches(
    case when p_type = 'listening' then p_data->>'mode' else p_type end,
    p_solution, p_answer), false)
$$;

-- my_daily_quests(): array of quests the pupil can work on right now. No hint, no solution.
-- reward is the nominal reward of the day; reward_left is what a correct answer would pay now.
create or replace function public.my_daily_quests() returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_today date := public.quest_today();
  v_paid int := public.quest_paid_attempts();
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
           case when r.solved_at is null and coalesce(r.attempts, 0) < v_paid
                then case when q.day = v_today then q.reward else (q.reward + 1) / 2 end
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
-- locked, and the unique ledger index is a second safety net.
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
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles p where p.id = v_uid and p.role = 'student') then
    raise exception 'only pupils can answer' using errcode = '42501';
  end if;

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
                              'reward', 0, 'reward_left', 0, 'hint', null);
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

  return jsonb_build_object(
    'correct', v_correct,
    'already_solved', false,
    'coins', v_coins,
    'reward', v_pay,
    'reward_left', v_left,
    'hint', case when v_correct then null else nullif(v_q.hint, '') end
  );
end $$;

revoke execute on function public.quest_paid_attempts() from public, anon;
revoke execute on function public.quest_answer_matches(text, jsonb, jsonb, jsonb) from public, anon;
revoke execute on function public.my_daily_quests() from public, anon;
revoke execute on function public.submit_quest_answer(text, jsonb) from public, anon;
grant execute on function public.my_daily_quests() to authenticated;
grant execute on function public.submit_quest_answer(text, jsonb) to authenticated;
