-- Spooky English Quiz (Prototyp/marktplatz/DEEPSEEK_SPOOKY_STARTER.md §3–§7, package S2).
-- Ten tap questions per season; 10 XP for each first correct answer plus a 50 XP completion bonus,
-- exactly once per pupil and season (150 XP = tier 5 without a stamp). No coins, no chests.
-- Solutions and hints live only here; pupils read the questions through my_season_starter().

create table public.season_starter_questions (
  season_id text not null references public.seasons(id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position int not null check (position > 0),
  kind text not null,
  type text not null check (type in ('choice', 'listening')),
  prompt text not null,
  data jsonb not null,
  solution jsonb not null,
  hint text not null,
  content_version text not null,
  primary key (season_id, id),
  unique (season_id, position),
  check (jsonb_typeof(data -> 'options') = 'array'),
  check (type <> 'listening' or (data ->> 'mode' = 'choice' and coalesce(data ->> 'speak', '') <> ''))
);

create table public.season_starter_results (
  player_id uuid not null references public.profiles(id) on delete cascade,
  season_id text not null,
  question_id text not null,
  attempts int not null default 0 check (attempts >= 0),
  solved_at timestamptz,
  primary key (player_id, season_id, question_id),
  foreign key (season_id, question_id)
    references public.season_starter_questions(season_id, id) on delete cascade
);

alter table public.season_starter_questions enable row level security;
alter table public.season_starter_results enable row level security;
revoke all on public.season_starter_questions from public, anon, authenticated;
revoke all on public.season_starter_results from public, anon, authenticated;

-- The fixed rules: never a value from the client.
create or replace function public.season_starter_xp() returns int
language sql immutable as $$ select 10 $$;
create or replace function public.season_starter_bonus() returns int
language sql immutable as $$ select 50 $$;

-- XP already booked by the quiz in this season (its own refs; never all quest XP).
create or replace function public.season_starter_awarded(p_uid uuid, p_season text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from xp_ledger
  where player_id = p_uid and reason = 'quest' and ref like 'season-starter:' || p_season || ':%'
$$;

create or replace function public.my_season_starter(p_season text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_questions jsonb;
  v_total int;
  v_solved int;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play the season quiz' using errcode = '42501';
  end if;
  select * into v_season from seasons where id = p_season;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', q.id, 'kind', q.kind, 'type', q.type, 'prompt', q.prompt,
             'options', q.data -> 'options',
             'solved', r.solved_at is not null,
             'attempts', coalesce(r.attempts, 0))
           || case when q.type = 'listening'
                   then jsonb_build_object('speak', q.data ->> 'speak') else '{}'::jsonb end
           order by q.position), '[]'::jsonb),
         count(*)::int,
         count(r.solved_at)::int
    into v_questions, v_total, v_solved
  from season_starter_questions q
  left join season_starter_results r
    on r.player_id = v_uid and r.season_id = q.season_id and r.question_id = q.id
  where q.season_id = p_season;

  return jsonb_build_object(
    'seasonId', p_season,
    'state', public.season_state_of(v_season, public.season_today()),
    'solved', v_solved,
    'total', v_total,
    'awardedXp', public.season_starter_awarded(v_uid, p_season),
    'completed', v_total > 0 and v_solved = v_total,
    'questions', v_questions);
end $$;

create or replace function public.submit_season_starter_answer(
  p_season text, p_question text, p_answer text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_season seasons%rowtype;
  v_q season_starter_questions%rowtype;
  v_attempts int;
  v_solved_at timestamptz;
  v_correct boolean;
  v_grant jsonb;
  v_award int := 0;
  v_bonus int := 0;
  v_solved int;
  v_total int;
  v_before int; v_ledger bigint; v_chest bigint;
begin
  if v_uid is null then raise exception 'not logged in' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play the season quiz' using errcode = '42501';
  end if;
  -- Lock order shared with the pass, chests and daily quests: the player row first, then results.
  -- Two last answers at the same time are serialized here, so the bonus is booked at most once.
  select level into v_before from profiles where id = v_uid for update;
  select coalesce(max(id), 0) into v_ledger from xp_ledger where player_id = v_uid;
  select coalesce(max(id), 0) into v_chest from chests where player_id = v_uid;

  select * into v_season from seasons where id = p_season;
  if not found then raise exception 'season not found' using errcode = 'P0002'; end if;
  if public.season_state_of(v_season, public.season_today()) <> 'running' then
    raise exception 'season not running' using errcode = 'P0001';
  end if;
  select * into v_q from season_starter_questions where season_id = p_season and id = p_question;
  if not found then raise exception 'unknown question' using errcode = 'P0002'; end if;

  insert into season_starter_results (player_id, season_id, question_id)
    values (v_uid, p_season, p_question) on conflict do nothing;
  select attempts, solved_at into v_attempts, v_solved_at from season_starter_results
    where player_id = v_uid and season_id = p_season and question_id = p_question for update;

  if v_solved_at is not null then
    v_correct := true;
  else
    v_correct := public.quest_answer_matches(v_q.type, v_q.data, v_q.solution, to_jsonb(p_answer));
    update season_starter_results
      set attempts = v_attempts + 1, solved_at = case when v_correct then now() end
      where player_id = v_uid and season_id = p_season and question_id = p_question;
    if v_correct then
      v_grant := public.grant_xp(v_uid, public.season_starter_xp(), 'quest',
                                 'season-starter:' || p_season || ':' || p_question);
      v_award := (v_grant ->> 'granted')::int;
    end if;
  end if;

  select count(*)::int into v_total from season_starter_questions where season_id = p_season;
  select count(*)::int into v_solved from season_starter_results
    where player_id = v_uid and season_id = p_season and solved_at is not null;
  if v_correct and v_solved_at is null and v_total > 0 and v_solved = v_total then
    v_grant := public.grant_xp(v_uid, public.season_starter_bonus(), 'quest',
                               'season-starter:' || p_season || ':complete');
    v_bonus := (v_grant ->> 'granted')::int;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'alreadySolved', v_solved_at is not null,
    'hint', case when v_correct then null else nullif(v_q.hint, '') end,
    'solved', v_solved,
    'total', v_total,
    'completed', v_total > 0 and v_solved = v_total,
    'awardedXp', v_award + v_bonus,
    'completionBonusXp', v_bonus,
    'seasonXp', public.season_xp(v_uid, v_season),
    'reachedTier', public.season_reached_tier(v_uid, v_season),
    'progress', public.progress_result(v_uid, v_before, v_ledger, v_chest));
end $$;

revoke all on function public.season_starter_xp(), public.season_starter_bonus() from public, anon, authenticated;
revoke all on function public.season_starter_awarded(uuid, text) from public, anon, authenticated;
revoke all on function public.my_season_starter(text) from public, anon;
revoke all on function public.submit_season_starter_answer(text, text, text) from public, anon;
grant execute on function public.my_season_starter(text) to authenticated;
grant execute on function public.submit_season_starter_answer(text, text, text) to authenticated;

-- BEGIN season-starter seed (generated by web/scripts/import-season-starter.ts)
insert into public.season_starter_questions
  (season_id, id, position, kind, type, prompt, data, solution, hint, content_version)
values
  ('2026-11-halloween', 'odd-characters', 1, 'odd-one-out', 'choice',
   'Odd one out: three are spooky characters. Which one is different?',
   '{"options":["ghost","witch","bicycle","vampire"]}'::jsonb,
   '"bicycle"'::jsonb,
   'You can ride one of these.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'odd-animals', 2, 'odd-one-out', 'choice',
   'Odd one out: three are animals. Which one is different?',
   '{"options":["spider","pumpkin","bat","owl"]}'::jsonb,
   '"pumpkin"'::jsonb,
   'Think of the orange Halloween decoration.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'scarier-than', 3, 'comparative', 'choice',
   'The haunted house is ___ than our school.',
   '{"options":["scary","scariest","scarier"]}'::jsonb,
   '"scarier"'::jsonb,
   'You are comparing two places. Look for the -er form.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'biggest-pumpkin', 4, 'superlative', 'choice',
   'Of all the pumpkins, this is the ___ one.',
   '{"options":["bigger","biggest","big"]}'::jsonb,
   '"biggest"'::jsonb,
   'You are choosing one from the whole group. Look for -est.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'british-american-sweets', 5, 'british-american', 'choice',
   'British English: sweets. What is the usual American English word?',
   '{"options":["biscuits","chips","candy"]}'::jsonb,
   '"candy"'::jsonb,
   'It is the sweet food children collect at Halloween.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'british-american-colour', 6, 'british-american', 'choice',
   'Which sentence uses American English spelling?',
   '{"options":["The ghost''s favourite colour is green.","The ghost''s favorite color is green.","The ghost''s favourit colur is green."]}'::jsonb,
   '"The ghost''s favorite color is green."'::jsonb,
   'American spelling usually leaves out the u in these two words.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'listen-trick-or-treat', 7, 'listening-meaning', 'listening',
   'Listen. Welche deutsche Bedeutung passt?',
   '{"options":["Süßes, sonst gibt''s Saures!","Pass auf den Verkehr auf!","Mach bitte die Tür zu!"],"mode":"choice","speak":"Trick or treat!"}'::jsonb,
   '"Süßes, sonst gibt''s Saures!"'::jsonb,
   'Children say this when they knock on doors at Halloween.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'listen-happy-halloween', 8, 'listening-meaning', 'listening',
   'Listen. Welche deutsche Bedeutung passt?',
   '{"options":["Alles Gute zum Geburtstag!","Fröhliches Halloween!","Guten Rutsch ins neue Jahr!"],"mode":"choice","speak":"Happy Halloween!"}'::jsonb,
   '"Fröhliches Halloween!"'::jsonb,
   'It is a greeting for this spooky celebration.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'listen-dressing-up', 9, 'listening-meaning', 'listening',
   'Listen. Welche deutsche Bedeutung passt?',
   '{"options":["Wo hast du deine Jacke gekauft?","Warum ziehst du deine Schuhe aus?","Als was verkleidest du dich?"],"mode":"choice","speak":"What are you dressing up as?"}'::jsonb,
   '"Als was verkleidest du dich?"'::jsonb,
   'The speaker is asking about your costume.', '7d09894a4327c7f2'),
  ('2026-11-halloween', 'listen-sweets', 10, 'listening-meaning', 'listening',
   'Listen. Welche deutsche Bedeutung passt?',
   '{"options":["Möchtest du ein paar Süßigkeiten?","Kannst du die Kerzen anzünden?","Hast du Angst vor Spinnen?"],"mode":"choice","speak":"Would you like some sweets?"}'::jsonb,
   '"Möchtest du ein paar Süßigkeiten?"'::jsonb,
   'The speaker is offering you something sweet.', '7d09894a4327c7f2');
-- END season-starter seed
