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
