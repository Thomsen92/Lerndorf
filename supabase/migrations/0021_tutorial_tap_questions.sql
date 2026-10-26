-- Three tablet-friendly tutorial questions. Keep rewards server-owned and replay-safe.
-- Preserve existing progress: the first two concepts stay the same; unfinished old quizzes
-- resume at the listening question. Completed tutorials and paid rewards remain untouched.
update tutorial_progress set answered = least(answered, 2) where step = 'quiz';
update tutorial_progress set answered = 3 where step in ('buy', 'place', 'done');
delete from tutorial_questions where nr > 3;
update tutorial_questions set type='choice', data='{"options":["am","is","are"]}'::jsonb where nr=2;
update tutorial_solutions set solution='"is"'::jsonb where nr=2;
update tutorial_questions set type='listening', prompt='Listen. Who is talking?',
  data='{"speak":"Hello! I am your new neighbour. Welcome to the village!","mode":"choice","options":["your new neighbour","your teacher","your mum"]}'::jsonb,
  hint='Listen to the second sentence.' where nr=3;
update tutorial_solutions set solution='"your new neighbour"'::jsonb where nr=3;

create or replace function public.tutorial_question() returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text;
  v_answered int;
  v_q tutorial_questions%rowtype;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step, answered into v_step, v_answered from tutorial_progress where player_id = v_uid;
  if v_step is distinct from 'quiz' then
    raise exception 'not in the quiz' using errcode = '22023';
  end if;
  select * into v_q from tutorial_questions where nr = v_answered + 1;
  return jsonb_build_object('nr', v_q.nr, 'total', 3, 'type', v_q.type, 'prompt', v_q.prompt, 'data', v_q.data);
end $$;

-- tutorial_answer(nr, answer): wrong answers cost nothing and may be repeated, the hint comes with
-- them. The third correct answer pays the reward once (row lock + unique ledger index).
-- Repeating the third answer after the quiz is a harmless replay (reward 0).
create or replace function public.tutorial_answer(p_nr int, p_answer jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text;
  v_answered int;
  v_paid boolean;
  v_q tutorial_questions%rowtype;
  v_sol jsonb;
  v_correct boolean;
  v_reward int := 0;
  v_coins int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step, answered, reward_paid into v_step, v_answered, v_paid
    from tutorial_progress where player_id = v_uid for update;
  if v_step is null or v_step = 'intro' then
    raise exception 'not in the quiz' using errcode = '22023';
  end if;

  select coins into v_coins from profiles where id = v_uid;
  select * into v_q from tutorial_questions where nr = p_nr;
  select solution into v_sol from tutorial_solutions where nr = p_nr;

  -- replay of the last question after the quiz is over (e.g. a lost response)
  if v_step <> 'quiz' then
    if v_answered = 3 and p_nr = 3 then
      v_correct := public.quest_answer_matches(v_q.type, v_q.data, v_sol, p_answer);
      return jsonb_build_object('correct', v_correct, 'hint', case when v_correct then null else nullif(v_q.hint, '') end,
                                'answered', 3, 'done', true, 'coins', v_coins, 'reward', 0);
    end if;
    raise exception 'not the current question' using errcode = '22023';
  end if;

  if p_nr is distinct from v_answered + 1 then
    raise exception 'not the current question' using errcode = '22023';
  end if;

  v_correct := public.quest_answer_matches(v_q.type, v_q.data, v_sol, p_answer);
  if not v_correct then
    return jsonb_build_object('correct', false, 'hint', nullif(v_q.hint, ''), 'answered', v_answered,
                              'done', false, 'coins', v_coins, 'reward', 0);
  end if;

  v_answered := v_answered + 1;
  if v_answered < 3 then
    update tutorial_progress set answered = v_answered where player_id = v_uid;
  else
    if not v_paid then
      v_reward := public.tutorial_reward();
      insert into coin_ledger (player_id, delta, reason, ref, created_by)
        values (v_uid, v_reward, 'tutorial', 'tutorial', null);
      update profiles set coins = coins + v_reward where id = v_uid returning coins into v_coins;
    end if;
    update tutorial_progress set answered = 3, step = 'buy', reward_paid = true where player_id = v_uid;
  end if;
  return jsonb_build_object('correct', true, 'hint', null, 'answered', v_answered,
                            'done', v_answered = 3, 'coins', v_coins, 'reward', v_reward);
end $$;


-- Existing grants on replaced functions remain in effect.
