-- Lerndorf: answer log for statistics, teacher task statistics, class layout seed, larger catalogue.
-- PLAN 3.6 (Aufgaben-Statistik), SPEC §10 (Seed pro Klasse), PLAN 2.9/4.1 (Katalog).

-- One row per counted answer attempt (written by submit_answer). Teachers read it, pupils see their own.
create table task_attempts (
  id bigint generated always as identity primary key,
  player_id uuid references profiles on delete cascade,
  task_id text references tasks on delete cascade,
  day date not null,
  correct boolean not null,
  created_at timestamptz default now()
);
create index task_attempts_task_idx on task_attempts (task_id);
alter table task_attempts enable row level security;
create policy task_attempts_read on task_attempts for select
  using (player_id = auth.uid() or public.is_teacher());
revoke insert, update, delete on task_attempts from anon, authenticated;
grant select on task_attempts to authenticated;

-- submit_answer, now also writing the attempt log. Same rules as in 0007.
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

  v_reward := case when v_task.week >= v_week_now then v_task.reward else v_task.reward / 2 end;
  v_left := v_max - (v_attempts + 1);

  update task_results set attempts = attempts + 1
    where player_id = v_uid and task_id = p_task_id and day = v_day;
  insert into task_attempts (player_id, task_id, day, correct)
    values (v_uid, p_task_id, v_day, coalesce(v_correct, false));

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

-- Teacher statistics per task of one week: answers, correct answers, share of correct answers.
create or replace function public.task_stats(p_week date)
  returns table (task_id text, prompt text, answers bigint, correct bigint, share numeric)
  language plpgsql stable security definer set search_path = public as $$
begin
  perform public.require_teacher();
  return query
    select t.id, t.prompt,
           count(a.id)::bigint,
           count(a.id) filter (where a.correct)::bigint,
           case when count(a.id) = 0 then null
                else round(100.0 * count(a.id) filter (where a.correct) / count(a.id), 1) end
    from tasks t
    left join task_attempts a on a.task_id = t.id
    where t.week = p_week
    group by t.id, t.prompt
    order by t.id;
end $$;

-- Layout seed of a class (SPEC §10): the teacher chooses it. Changing it moves all plots.
create or replace function public.set_layout_seed(p_class_id text, p_seed int) returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  if p_seed < 1 or p_seed > 99999 then
    raise exception 'seed must be between 1 and 99999' using errcode = '22023';
  end if;
  update classes set layout_seed = p_seed where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
end $$;

-- Larger catalogue (SPEC §14 price ranges). Models are added later with the asset pipeline.
insert into items (id, kind, slot, name_de, price, footprint, starter, active) values
  ('hair_04', 'avatar', 'hair', 'Locken', 30, '{1,1}', false, true),
  ('hair_05', 'avatar', 'hair', 'Irokese', 30, '{1,1}', false, true),
  ('hair_06', 'avatar', 'hair', 'Langhaar', 45, '{1,1}', false, true),
  ('top_04', 'avatar', 'top', 'Trikot', 45, '{1,1}', false, true),
  ('top_05', 'avatar', 'top', 'Karohemd', 45, '{1,1}', false, true),
  ('top_06', 'avatar', 'top', 'Lederjacke', 120, '{1,1}', false, true),
  ('pants_03', 'avatar', 'pants', 'Cargohose', 35, '{1,1}', false, true),
  ('hat_02', 'avatar', 'hat', 'Mütze', 60, '{1,1}', false, true),
  ('hat_03', 'avatar', 'hat', 'Zylinder', 90, '{1,1}', false, true),
  ('acc_02', 'avatar', 'acc', 'Brille', 40, '{1,1}', false, true),
  ('acc_03', 'avatar', 'acc', 'Rucksack', 120, '{1,1}', false, true),
  ('acc_04', 'avatar', 'acc', 'Goldkette', 500, '{1,1}', false, true),
  ('pet_01', 'avatar', 'pet', 'Hund', 150, '{1,1}', false, true),
  ('deco_lantern', 'deco', null, 'Laterne', 80, '{1,1}', false, true),
  ('deco_rosebush', 'deco', null, 'Rosenbusch', 45, '{1,1}', false, true),
  ('deco_mailbox', 'deco', null, 'Briefkasten', 15, '{1,1}', false, true),
  ('deco_gnome', 'deco', null, 'Gartenzwerg', 25, '{1,1}', false, true),
  ('deco_hedge', 'deco', null, 'Hecke', 35, '{2,1}', false, true),
  ('deco_statue', 'deco', null, 'Statue', 150, '{1,2}', false, true),
  ('deco_swing', 'deco', null, 'Schaukel', 180, '{2,1}', false, true),
  ('deco_pond', 'deco', null, 'Teich', 200, '{2,2}', false, true),
  ('deco_wagon', 'deco', null, 'Heuwagen', 220, '{2,2}', false, true),
  ('deco_tent', 'deco', null, 'Zelt', 250, '{2,2}', false, true),
  ('deco_fence', 'deco', null, 'Zaun', 20, '{2,1}', false, true),
  ('top_07', 'avatar', 'top', 'Sportshirt', 30, '{1,1}', false, true)
on conflict (id) do nothing;

revoke execute on function public.task_stats(date) from public, anon;
revoke execute on function public.set_layout_seed(text, int) from public, anon;
grant execute on function public.task_stats(date) to authenticated;
grant execute on function public.set_layout_seed(text, int) to authenticated;
