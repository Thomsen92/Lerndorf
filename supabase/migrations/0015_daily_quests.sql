-- Lerndorf: daily quests (3 short tasks per day, imported weekly from content/daily-quests/).
-- Pupils never read these tables directly; the pupil RPCs (later migration) are security definer.
-- Solutions are teacher-readable only and never sent to a client before the quest is closed.

-- ---------------------------------------------------------------- tables
create table daily_quests (
  key text primary key,                  -- "2026-11-10-tue-2"
  week date not null,                    -- Monday of the week
  day date not null,
  slot smallint not null check (slot between 1 and 3),
  qid text not null,                     -- id inside the week file
  type text not null check (type in ('choice','gap','match','order','listening')),
  prompt text not null,
  hint text not null default '',
  data jsonb not null default '{}',      -- public part: options, pairs, speak text ...
  reward int not null check (reward between 1 and 20),
  active boolean not null default true
);
-- one active quest per day and slot; deactivated (replaced) quests stay for history
create unique index daily_quests_day_slot_active on daily_quests (day, slot) where active;
create index daily_quests_week on daily_quests (week);

create table daily_quest_solutions (
  quest_key text primary key references daily_quests on delete cascade,
  solution jsonb not null
);

create table daily_quest_results (
  player_id uuid not null references profiles on delete cascade,
  quest_key text not null references daily_quests,
  attempts int not null default 0,
  solved_at timestamptz,
  reward_paid int,
  primary key (player_id, quest_key)
);

create table quest_imports (
  week date primary key,
  ok boolean not null,
  holiday boolean not null default false,
  errors text[] not null default '{}',
  quest_count int not null default 0,
  imported_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- coin ledger
alter table coin_ledger drop constraint coin_ledger_reason_check;
alter table coin_ledger add constraint coin_ledger_reason_check
  check (reason in ('task','stamp','purchase','refund','teacher','quest'));
-- a quest pays out at most once per player, whatever the application code does
create unique index coin_ledger_quest_once on coin_ledger (player_id, ref) where reason = 'quest';

-- ---------------------------------------------------------------- RLS and grants
alter table daily_quests enable row level security;
alter table daily_quest_solutions enable row level security;
alter table daily_quest_results enable row level security;
alter table quest_imports enable row level security;

create policy daily_quests_read on daily_quests for select using (public.is_teacher());
create policy daily_quest_solutions_read on daily_quest_solutions for select
  using (public.is_teacher());
create policy daily_quest_results_read on daily_quest_results for select
  using (player_id = auth.uid() or public.is_teacher());
create policy quest_imports_read on quest_imports for select using (public.is_teacher());

-- Supabase grants new tables to anon/authenticated by default; take back everything that is not read.
revoke insert, update, delete on daily_quests, daily_quest_solutions, daily_quest_results,
  quest_imports from anon, authenticated;
-- Solutions: no client role may read them at all (a pupil select must be a permission error).
-- The policy above stays as a second layer; teacher access, if ever needed, goes through an RPC.
revoke select on daily_quest_solutions from anon, authenticated;

-- ---------------------------------------------------------------- functions
-- "Today" for quests, Europe/Berlin. A plain function so tests can replace it.
create or replace function public.quest_today() returns date
  language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date $$;

-- import_quest_week: replaces the quests of one week in one transaction (called by the import
-- script with the service key). Quests missing from the new version are deactivated, never
-- deleted, so pupils' results and paid coins stay intact. Returns the number of active quests.
create or replace function public.import_quest_week(
  p_week date, p_holiday boolean, p_quests jsonb, p_solutions jsonb
) returns int
  language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  if p_week is null or extract(isodow from p_week) <> 1 then
    raise exception 'week must be a Monday' using errcode = '22023';
  end if;
  p_quests := coalesce(p_quests, '[]'::jsonb);
  p_solutions := coalesce(p_solutions, '[]'::jsonb);
  if jsonb_typeof(p_quests) <> 'array' or jsonb_typeof(p_solutions) <> 'array' then
    raise exception 'quests and solutions must be arrays' using errcode = '22023';
  end if;
  if p_holiday and (jsonb_array_length(p_quests) > 0 or jsonb_array_length(p_solutions) > 0) then
    raise exception 'a holiday week has no quests' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_quests) q where (q->>'week')::date <> p_week) then
    raise exception 'quest belongs to another week' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_solutions) s
    where not exists (select 1 from jsonb_array_elements(p_quests) q where q->>'key' = s->>'quest_key')
  ) then
    raise exception 'solution for unknown quest' using errcode = '22023';
  end if;

  -- deactivate ALL active quests of the week first, so the (day, slot) unique index never sees
  -- two active quests while survivors are upserted (e.g. two quests of a day swapped slots);
  -- the upsert below sets active = true again for everything that is in the new version
  update daily_quests set active = false where week = p_week and active;

  insert into daily_quests (key, week, day, slot, qid, type, prompt, hint, reward, data, active)
    select q->>'key', (q->>'week')::date, (q->>'day')::date, (q->>'slot')::smallint,
           q->>'qid', q->>'type', q->>'prompt', coalesce(q->>'hint', ''), (q->>'reward')::int,
           coalesce(q->'data', '{}'::jsonb), true
    from jsonb_array_elements(p_quests) q
  on conflict (key) do update set
    week = excluded.week, day = excluded.day, slot = excluded.slot, qid = excluded.qid,
    type = excluded.type, prompt = excluded.prompt, hint = excluded.hint,
    reward = excluded.reward, data = excluded.data, active = true;

  insert into daily_quest_solutions (quest_key, solution)
    select s->>'quest_key', s->'solution' from jsonb_array_elements(p_solutions) s
  on conflict (quest_key) do update set solution = excluded.solution;

  select count(*) into v_count from daily_quests where week = p_week and active;

  insert into quest_imports (week, ok, holiday, errors, quest_count, imported_at)
    values (p_week, true, p_holiday, '{}', v_count, now())
  on conflict (week) do update set
    ok = true, holiday = excluded.holiday, errors = '{}', quest_count = excluded.quest_count,
    imported_at = now();
  return v_count;
end $$;

-- record_quest_import: stores a failed import so the teacher sees the errors. The quests of the
-- week that are already live stay untouched.
create or replace function public.record_quest_import(p_week date, p_ok boolean, p_errors text[])
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  insert into quest_imports (week, ok, errors, quest_count, imported_at)
    values (p_week, p_ok, coalesce(p_errors, '{}'),
            (select count(*) from daily_quests where week = p_week and active), now())
  on conflict (week) do update set
    ok = excluded.ok, errors = excluded.errors, imported_at = now();
end $$;

revoke execute on function public.import_quest_week(date, boolean, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.record_quest_import(date, boolean, text[])
  from public, anon, authenticated;
grant execute on function public.import_quest_week(date, boolean, jsonb, jsonb) to service_role;
grant execute on function public.record_quest_import(date, boolean, text[]) to service_role;
