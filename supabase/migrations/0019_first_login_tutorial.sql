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
