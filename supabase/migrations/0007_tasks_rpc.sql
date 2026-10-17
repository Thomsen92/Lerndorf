-- Lerndorf: answering tasks (SPEC §8 submit_answer, §9, §14). The check happens on the server only.

-- Normalisation (SPEC §8): trim, lower case, several spaces become one, typographic apostrophes
-- become a plain one. chr(8217) and chr(8216) are the right and left single quotation marks.
create or replace function public.normalize_answer(t text) returns text
  language sql immutable as $$
  select lower(regexp_replace(
           replace(replace(trim(t), chr(8217), ''''), chr(8216), ''''),
           '\s+', ' ', 'g'))
$$;

-- Checks an answer against the solution, by task type (SPEC §8).
-- choice: one string. gap: a list of accepted strings. match: a list of [english, german] pairs,
-- order does not matter. order: the exact sequence.
create or replace function public.answer_matches(p_type text, p_solution jsonb, p_answer jsonb)
  returns boolean
  language plpgsql immutable as $$
declare
  n int;
begin
  if p_solution is null then
    raise exception 'task has no solution' using errcode = 'P0002';
  end if;

  if p_type = 'choice' then
    return public.normalize_answer(p_answer #>> '{}') = public.normalize_answer(p_solution #>> '{}');
  elsif p_type = 'gap' then
    if jsonb_typeof(p_answer) <> 'string' then return false; end if;
    return exists (
      select 1 from jsonb_array_elements_text(p_solution) s
      where public.normalize_answer(s) = public.normalize_answer(p_answer #>> '{}')
    );
  elsif p_type = 'match' then
    if jsonb_typeof(p_answer) <> 'array' then return false; end if;
    if jsonb_array_length(p_answer) <> jsonb_array_length(p_solution) then return false; end if;
    return not exists (
      select 1 from jsonb_array_elements(p_solution) s
      where not exists (
        select 1 from jsonb_array_elements(p_answer) a
        where public.normalize_answer(a->>0) = public.normalize_answer(s->>0)
          and public.normalize_answer(a->>1) = public.normalize_answer(s->>1)
      )
    );
  elsif p_type = 'order' then
    if jsonb_typeof(p_answer) <> 'array' then return false; end if;
    n := jsonb_array_length(p_solution);
    if jsonb_array_length(p_answer) <> n then return false; end if;
    return not exists (
      select 1 from generate_series(0, n - 1) i
      where public.normalize_answer(p_answer->>i) <> public.normalize_answer(p_solution->>i)
    );
  end if;
  raise exception 'unknown task type %', p_type using errcode = '22023';
end $$;

-- submit_answer(task, answer). Books the reward only once per task and day, and only if the
-- daily limit allows. The solution comes back only after the last wrong attempt (SPEC §8).
create or replace function public.submit_answer(p_task_id text, p_answer jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Berlin')::date;
  v_week_now date := v_day - (extract(isodow from v_day)::int - 1);
  v_task tasks%rowtype;
  v_class text;
  v_sol jsonb;
  v_max int;
  v_cap int;
  v_attempts int;
  v_solved boolean;
  v_reward int;
  v_used int;
  v_correct boolean;
  v_left int;
  v_coins int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can answer' using errcode = '42501';
  end if;

  select * into v_task from tasks where id = p_task_id and active;
  if not found then
    raise exception 'task not found' using errcode = 'P0002';
  end if;
  if v_task.class_id is not null and v_task.class_id <> v_class then
    raise exception 'task is not for your class' using errcode = '42501';
  end if;
  if v_task.week > v_day then
    raise exception 'task is not available yet' using errcode = '42501';
  end if;

  select max_attempts, daily_task_cap into v_max, v_cap from settings where id = 1;

  insert into task_results (player_id, task_id, day) values (v_uid, p_task_id, v_day)
    on conflict do nothing;
  select attempts, solved into v_attempts, v_solved from task_results
    where player_id = v_uid and task_id = p_task_id and day = v_day
    for update;

  if v_solved then
    raise exception 'already solved today' using errcode = '22023';
  end if;
  if v_attempts >= v_max then
    raise exception 'no attempts left today' using errcode = '22023';
  end if;

  select solution into v_sol from task_solutions where task_id = p_task_id;
  v_correct := public.answer_matches(v_task.type, v_sol, p_answer);

  -- full reward in the current week, half for older weeks (SPEC §9)
  v_reward := case when v_task.week >= v_week_now then v_task.reward else v_task.reward / 2 end;
  v_left := v_max - (v_attempts + 1);

  update task_results set attempts = attempts + 1
    where player_id = v_uid and task_id = p_task_id and day = v_day;

  if v_correct then
    select coalesce(sum(delta), 0) into v_used from coin_ledger
      where player_id = v_uid and reason = 'task'
        and (created_at at time zone 'Europe/Berlin')::date = v_day;
    if v_used + v_reward > v_cap then
      raise exception 'daily limit of task coins reached' using errcode = '22023';
    end if;
    update task_results set solved = true
      where player_id = v_uid and task_id = p_task_id and day = v_day;
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_uid, v_reward, 'task', p_task_id, null);
    update profiles set coins = coins + v_reward where id = v_uid returning coins into v_coins;
  else
    select coins into v_coins from profiles where id = v_uid;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'coins', v_coins,
    'attempts_left', case when v_correct then v_left else greatest(v_left, 0) end,
    'solution', case when not v_correct and v_left <= 0 then v_sol else null end
  );
end $$;

revoke execute on function public.normalize_answer(text) from public, anon;
revoke execute on function public.answer_matches(text, jsonb, jsonb) from public, anon;
revoke execute on function public.submit_answer(text, jsonb) from public, anon;
grant execute on function public.submit_answer(text, jsonb) to authenticated;
