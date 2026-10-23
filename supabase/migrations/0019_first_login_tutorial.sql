-- Lerndorf: first-login tutorial (docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md).
-- Part 1: tables, the five fixed questions, the ledger reason and the new price of the Fachwerkhaus.
-- The tutorial RPCs follow in later parts of this migration. Clients never write these tables.

-- ---------------------------------------------------------------- tables
create table tutorial_progress (
  player_id uuid primary key references profiles on delete cascade,
  step text not null default 'intro' check (step in ('intro', 'quiz', 'buy', 'place', 'done')),
  answered int not null default 0 check (answered between 0 and 5),
  reward_paid boolean not null default false,
  house_bought boolean not null default false,
  completed_at timestamptz
);

create table tutorial_questions (
  nr int primary key check (nr between 1 and 5),
  type text not null check (type in ('choice', 'gap', 'match', 'listening')),
  prompt text not null,
  data jsonb not null default '{}',      -- public part, same shapes as daily_quests.data
  hint text not null default ''
);

create table tutorial_solutions (
  nr int primary key references tutorial_questions on delete cascade,
  solution jsonb not null
);

-- ---------------------------------------------------------------- coin ledger
alter table coin_ledger drop constraint coin_ledger_reason_check;
alter table coin_ledger add constraint coin_ledger_reason_check
  check (reason in ('task','stamp','purchase','refund','teacher','quest','tutorial'));
-- the tutorial reward is paid at most once per player, whatever the application code does
create unique index coin_ledger_tutorial_once on coin_ledger (player_id) where reason = 'tutorial';

-- ---------------------------------------------------------------- RLS and grants
alter table tutorial_progress enable row level security;
alter table tutorial_questions enable row level security;
alter table tutorial_solutions enable row level security;

create policy tutorial_progress_read on tutorial_progress for select using (player_id = auth.uid());

-- Supabase grants new tables to anon/authenticated by default; leave only the own-row read.
revoke insert, update, delete on tutorial_progress from anon, authenticated;
revoke all on tutorial_progress from anon;
-- Questions and solutions: no client role may touch them (questions come via RPC, one at a time).
revoke all on tutorial_questions, tutorial_solutions from anon, authenticated;

-- ---------------------------------------------------------------- the five questions
-- choice: data.options; gap: no data; match: data.left / data.right (right is shuffled);
-- listening: data.speak is read aloud, data.mode 'choice' with data.options.
insert into tutorial_questions (nr, type, prompt, data, hint) values
  (1, 'choice', 'What is ''Haus'' in English?',
     '{"options": ["house", "mouse", "horse"]}', 'You live in it.'),
  (2, 'gap', 'My name ___ Tom.', '{}', 'Use a form of ''be''.'),
  (3, 'choice', 'Which word is a colour?',
     '{"options": ["red", "run", "rain"]}', 'Think of a tomato.'),
  (4, 'match', 'Match the animals.',
     '{"left": ["dog", "cat", "bird"], "right": ["Vogel", "Hund", "Katze"]}', 'Think of animals.'),
  (5, 'listening', 'Listen. Who is talking?',
     '{"speak": "Hello! I am your new neighbour. Welcome to the village!", "mode": "choice", "options": ["your new neighbour", "your teacher", "your mum"]}',
     'Listen to the second sentence.');

insert into tutorial_solutions (nr, solution) values
  (1, '"house"'),
  (2, '["is"]'),
  (3, '"red"'),
  (4, '[["dog", "Hund"], ["cat", "Katze"], ["bird", "Vogel"]]'),
  (5, '"your new neighbour"');

-- ---------------------------------------------------------------- catalogue
-- The Fachwerkhaus is bought in the tutorial (50 coins) and is no free starter any more.
-- Existing placements and inventory rows are untouched.
update items set starter = false, price = 50 where id = 'house_fachwerk';

-- ================================================================ Part 2: state, start, automatic plot
-- Internal helper: the tutorial state of one player as jsonb. Not callable by clients.
-- needed = the pupil has not finished the tutorial; a pupil without a progress row is at 'intro'.
create or replace function public.tutorial_state_of(p_uid uuid) returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_role text;
  v_plot int;
  v_char text;
  v_step text;
  v_answered int;
begin
  select role, plot_index, avatar->>'character' into v_role, v_plot, v_char from profiles where id = p_uid;
  if v_role is distinct from 'student' then
    return jsonb_build_object('needed', false, 'step', 'done', 'plot_index', v_plot,
                              'character', v_char, 'answered', 0);
  end if;
  select step, answered into v_step, v_answered from tutorial_progress where player_id = p_uid;
  v_step := coalesce(v_step, 'intro');
  v_answered := coalesce(v_answered, 0);
  return jsonb_build_object('needed', v_step <> 'done', 'step', v_step, 'plot_index', v_plot,
                            'character', v_char, 'answered', v_answered);
end $$;

-- tutorial_state(): {needed, step, plot_index, character, answered}. A pupil who already has a house
-- in the house slot never needs the tutorial; the row is then set to 'done' (no data migration needed).
create or replace function public.tutorial_state() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where id = v_uid and role = 'student')
     and exists (select 1 from placements where player_id = v_uid and slot = 'house') then
    insert into tutorial_progress (player_id, step, completed_at) values (v_uid, 'done', now())
      on conflict (player_id) do update
        set step = 'done', completed_at = coalesce(tutorial_progress.completed_at, now())
        where tutorial_progress.step <> 'done' or tutorial_progress.completed_at is null;
  end if;
  return public.tutorial_state_of(v_uid);
end $$;

-- tutorial_start(): gives the pupil the lowest free plot of the class (atomic per class) and creates
-- the progress row. Calling it again changes nothing. The step stays 'intro' until tutorial_continue.
create or replace function public.tutorial_start() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_class text;
  v_plot int;
  v_free int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select class_id, plot_index into v_class, v_plot from profiles where id = v_uid and role = 'student';
  if v_class is null then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  -- a pupil with a placed house is finished (and gets no plot change)
  if (public.tutorial_state() ->> 'needed')::boolean is not true then
    return public.tutorial_state_of(v_uid);
  end if;

  perform pg_advisory_xact_lock(hashtext('plots:' || v_class));
  select plot_index into v_plot from profiles where id = v_uid;
  if v_plot is null then
    select min(g) into v_free from generate_series(0, 33) g
      where not exists (select 1 from profiles p where p.class_id = v_class and p.plot_index = g);
    if v_free is null then
      raise exception 'village is full' using errcode = '53400';
    end if;
    update profiles set plot_index = v_free where id = v_uid;
  end if;
  insert into tutorial_progress (player_id) values (v_uid) on conflict (player_id) do nothing;
  return public.tutorial_state_of(v_uid);
end $$;

-- Pupils no longer pick a plot: the server assigns it in tutorial_start().
create or replace function public.claim_plot(p_index int) returns int
  language plpgsql security definer set search_path = public as $$
begin
  raise exception 'forbidden: plot is assigned automatically' using errcode = '42501';
end $$;

revoke execute on function public.tutorial_state_of(uuid) from public, anon, authenticated;
revoke execute on function public.tutorial_state() from public, anon;
revoke execute on function public.tutorial_start() from public, anon;
grant execute on function public.tutorial_state() to authenticated;
grant execute on function public.tutorial_start() to authenticated;

-- ================================================================ Part 3: quiz and the one-time reward
-- The reward lives here and nowhere else.
create or replace function public.tutorial_reward() returns int
  language sql immutable as $$ select 50 $$;

-- tutorial_continue(p_from): intro -> quiz. Only valid at step 'intro' with p_from = 'intro'
-- and an assigned plot.
create or replace function public.tutorial_continue(p_from text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_plot int;
  v_step text;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select plot_index into v_plot from profiles where id = v_uid and role = 'student';
  if not found then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step into v_step from tutorial_progress where player_id = v_uid for update;
  if v_step is distinct from 'intro' or p_from is distinct from 'intro' or v_plot is null then
    raise exception 'not at this step' using errcode = '22023';
  end if;
  update tutorial_progress set step = 'quiz' where player_id = v_uid;
  return public.tutorial_state_of(v_uid);
end $$;

-- tutorial_question(): the current question (number answered + 1), never the solution or the hint.
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
  return jsonb_build_object('nr', v_q.nr, 'total', 5, 'type', v_q.type, 'prompt', v_q.prompt, 'data', v_q.data);
end $$;

-- tutorial_answer(nr, answer): wrong answers cost nothing and may be repeated, the hint comes with
-- them. The fifth correct answer pays the reward once (row lock + unique ledger index).
-- Repeating the fifth answer after the quiz is a harmless replay (reward 0).
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
    if v_answered = 5 and p_nr = 5 then
      v_correct := public.quest_answer_matches(v_q.type, v_q.data, v_sol, p_answer);
      return jsonb_build_object('correct', v_correct, 'hint', case when v_correct then null else nullif(v_q.hint, '') end,
                                'answered', 5, 'done', true, 'coins', v_coins, 'reward', 0);
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
  if v_answered < 5 then
    update tutorial_progress set answered = v_answered where player_id = v_uid;
  else
    if not v_paid then
      v_reward := public.tutorial_reward();
      insert into coin_ledger (player_id, delta, reason, ref, created_by)
        values (v_uid, v_reward, 'tutorial', 'tutorial', null);
      update profiles set coins = coins + v_reward where id = v_uid returning coins into v_coins;
    end if;
    update tutorial_progress set answered = 5, step = 'buy', reward_paid = true where player_id = v_uid;
  end if;
  return jsonb_build_object('correct', true, 'hint', null, 'answered', v_answered,
                            'done', v_answered = 5, 'coins', v_coins, 'reward', v_reward);
end $$;

revoke execute on function public.tutorial_reward() from public, anon;
revoke execute on function public.tutorial_continue(text) from public, anon;
revoke execute on function public.tutorial_question() from public, anon;
revoke execute on function public.tutorial_answer(int, jsonb) from public, anon;
grant execute on function public.tutorial_continue(text) to authenticated;
grant execute on function public.tutorial_question() to authenticated;
grant execute on function public.tutorial_answer(int, jsonb) to authenticated;

-- ================================================================ Part 4: buy and place the house
-- These are the only exceptions to the closed shop / closed build switch, and only for the
-- Fachwerkhaus in slot 'house' at the matching step. buy_item, place_in_slot and clear_slot stay strict.

-- tutorial_buy_house(): step 'buy' -> 'place'. The price comes from the catalogue (50).
-- A house that is already bought is not charged again; the step just moves on.
create or replace function public.tutorial_buy_house() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text;
  v_bought boolean;
  v_price int;
  v_coins int;
  v_qty int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step, house_bought into v_step, v_bought from tutorial_progress where player_id = v_uid for update;
  if v_step is null or v_step not in ('buy', 'place') then
    raise exception 'not at this step' using errcode = '22023';
  end if;

  select coalesce(sum(qty), 0) into v_qty from inventory where player_id = v_uid and item_id = 'house_fachwerk';
  if not v_bought and v_qty = 0 then
    select price into v_price from items where id = 'house_fachwerk' and active;
    if v_price is null then
      raise exception 'item not found' using errcode = 'P0002';
    end if;
    update profiles set coins = coins - v_price
      where id = v_uid and coins >= v_price
      returning coins into v_coins;
    if not found then
      raise exception 'not enough coins' using errcode = '22023';
    end if;
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_uid, -v_price, 'purchase', 'house_fachwerk', null);
    insert into inventory (player_id, item_id, qty) values (v_uid, 'house_fachwerk', 1)
      on conflict (player_id, item_id) do update set qty = inventory.qty + 1;
    v_qty := 1;
  else
    select coins into v_coins from profiles where id = v_uid;
  end if;
  update tutorial_progress set house_bought = true, step = 'place' where player_id = v_uid;
  return jsonb_build_object('coins', v_coins, 'qty', v_qty);
end $$;

-- tutorial_place_house(): puts the bought Fachwerkhaus into the house slot (rotation 0), step -> 'done'.
-- Repeating the call after 'done' returns the existing placement.
create or replace function public.tutorial_place_house() returns bigint
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text;
  v_bought boolean;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step, house_bought into v_step, v_bought from tutorial_progress where player_id = v_uid for update;
  if v_step = 'done' then
    select id into v_id from placements where player_id = v_uid and slot = 'house' and item_id = 'house_fachwerk';
    if v_id is not null then
      return v_id;
    end if;
  end if;
  if v_step is distinct from 'place' or not v_bought then
    raise exception 'not at this step' using errcode = '22023';
  end if;
  if not exists (select 1 from inventory where player_id = v_uid and item_id = 'house_fachwerk' and qty > 0) then
    raise exception 'no free copy in the inventory' using errcode = '22023';
  end if;

  delete from placements where player_id = v_uid and slot = 'house';
  insert into placements (player_id, item_id, slot, rot) values (v_uid, 'house_fachwerk', 'house', 0)
    returning id into v_id;
  update tutorial_progress set step = 'done', completed_at = now() where player_id = v_uid;
  return v_id;
end $$;

-- tutorial_finish(): the closing call of the client; idempotent, only valid once the step is 'done'.
create or replace function public.tutorial_finish() returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_step text;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  select step into v_step from tutorial_progress where player_id = v_uid for update;
  if v_step is distinct from 'done' then
    raise exception 'not at this step' using errcode = '22023';
  end if;
  update tutorial_progress set completed_at = coalesce(completed_at, now()) where player_id = v_uid;
  return public.tutorial_state_of(v_uid);
end $$;

revoke execute on function public.tutorial_buy_house() from public, anon;
revoke execute on function public.tutorial_place_house() from public, anon;
revoke execute on function public.tutorial_finish() from public, anon;
grant execute on function public.tutorial_buy_house() to authenticated;
grant execute on function public.tutorial_place_house() to authenticated;
grant execute on function public.tutorial_finish() to authenticated;
