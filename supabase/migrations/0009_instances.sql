-- Lerndorf: instances (SPEC §1a). 8a and 8b are separate worlds with their own rules.
-- Rules are read from the pupil's class row (current_class()), never from a client parameter.

-- Rules per instance. The defaults come from settings (copied once below).
alter table classes add column if not exists stamp_reward int not null default 100 check (stamp_reward >= 0);
alter table classes add column if not exists daily_task_cap int not null default 60 check (daily_task_cap >= 0);
alter table classes add column if not exists max_attempts int not null default 3 check (max_attempts between 1 and 10);
alter table classes add column if not exists plot_cols int not null default 7 check (plot_cols between 3 and 12);
alter table classes add column if not exists plot_rows int not null default 6 check (plot_rows between 4 and 12);
alter table classes add column if not exists map_id text not null default 'tal';

update classes c set
  stamp_reward = s.stamp_reward,
  daily_task_cap = s.daily_task_cap,
  max_attempts = s.max_attempts,
  plot_cols = s.plot_cols,
  plot_rows = s.plot_rows
from settings s
where s.id = 1;

-- Items a class does not sell (optional, SPEC §1a). No row means: sold.
create table class_items (
  class_id text references classes on delete cascade,
  item_id text references items on delete cascade,
  enabled boolean not null default true,
  primary key (class_id, item_id)
);
alter table class_items enable row level security;
create policy class_items_read on class_items for select
  using (class_id = public.current_class() or public.is_teacher());
revoke insert, update, delete on class_items from anon, authenticated;
grant select on class_items to authenticated;

-- Stamps: the reward of the pupil's instance (teacher passes the class).
create or replace function public.add_stamps(p_class_id text, p_week date, p_player_ids uuid[])
  returns int
  language plpgsql security definer set search_path = public as $$
declare
  v_reward int;
  v_pid uuid;
  v_booked int := 0;
begin
  perform public.require_teacher();
  if extract(isodow from p_week) <> 1 then
    raise exception 'week must be a Monday' using errcode = '22023';
  end if;
  select stamp_reward into v_reward from classes where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;

  foreach v_pid in array p_player_ids loop
    perform 1 from profiles
      where id = v_pid and class_id = p_class_id and role = 'student';
    continue when not found;
    continue when exists (
      select 1 from coin_ledger
      where player_id = v_pid and reason = 'stamp' and ref = p_week::text
    );
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_pid, v_reward, 'stamp', p_week::text, auth.uid());
    update profiles set coins = coins + v_reward where id = v_pid;
    v_booked := v_booked + 1;
  end loop;
  return v_booked;
end $$;

-- Grid of the pupil's own instance. The house takes the back two rows, the gate the front centre.
drop function if exists public.cell_blocked(int, int);
create or replace function public.cell_blocked(p_class text, p_x int, p_z int) returns boolean
  language plpgsql stable security definer set search_path = public as $$
declare
  v_cols int;
  v_rows int;
begin
  select plot_cols, plot_rows into v_cols, v_rows from classes where id = p_class;
  if not found then
    return true;
  end if;
  if p_x < 0 or p_z < 0 or p_x >= v_cols or p_z >= v_rows then
    return true;
  end if;
  return p_z < 2 or (p_x = v_cols / 2 and p_z = v_rows - 1);
end $$;

create or replace function public.place_item(p_item_id text, p_x int, p_z int, p_rot int)
  returns bigint
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_build boolean;
  v_qty int;
  v_placed int;
  v_w int;
  v_d int;
  v_id bigint;
  v_x int;
  v_z int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can build' using errcode = '42501';
  end if;
  select build_open into v_build from classes where id = v_class;
  if not v_build then
    raise exception 'building is closed for this class' using errcode = '42501';
  end if;
  if p_rot not between 0 and 3 then
    raise exception 'rot must be 0 to 3' using errcode = '22023';
  end if;

  select * into v_item from items where id = p_item_id and active and kind = 'deco';
  if not found then
    raise exception 'not a decoration' using errcode = '22023';
  end if;
  select coalesce(sum(inv.qty), 0) into v_qty from inventory inv
    where inv.player_id = v_uid and inv.item_id = p_item_id;
  select count(*) into v_placed from placements
    where player_id = v_uid and item_id = p_item_id;
  if v_qty - v_placed <= 0 then
    raise exception 'no free copy in the inventory' using errcode = '22023';
  end if;

  v_w := case when p_rot % 2 = 1 then v_item.footprint[2] else v_item.footprint[1] end;
  v_d := case when p_rot % 2 = 1 then v_item.footprint[1] else v_item.footprint[2] end;

  for v_x in p_x .. p_x + v_w - 1 loop
    for v_z in p_z .. p_z + v_d - 1 loop
      if public.cell_blocked(v_class, v_x, v_z) then
        raise exception 'cell (%,%) is outside the free plot area', v_x, v_z using errcode = '22023';
      end if;
    end loop;
  end loop;

  perform 1 from placements pl join items it on it.id = pl.item_id
    where pl.player_id = v_uid
      and p_x < pl.cell_x + (case when pl.rot % 2 = 1 then it.footprint[2] else it.footprint[1] end)
      and pl.cell_x < p_x + v_w
      and p_z < pl.cell_z + (case when pl.rot % 2 = 1 then it.footprint[1] else it.footprint[2] end)
      and pl.cell_z < p_z + v_d;
  if found then
    raise exception 'cells are already occupied' using errcode = '22023';
  end if;

  insert into placements (player_id, item_id, cell_x, cell_z, rot)
    values (v_uid, p_item_id, p_x, p_z, p_rot)
    returning id into v_id;
  return v_id;
end $$;

-- buy_item: the class may not sell some items (class_items).
create or replace function public.buy_item(p_item_id text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_shop boolean;
  v_coins int;
  v_qty int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select * into v_item from items where id = p_item_id and active;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if v_item.starter then
    raise exception 'starter items are not sold' using errcode = '22023';
  end if;

  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can buy' using errcode = '42501';
  end if;
  select shop_open into v_shop from classes where id = v_class;
  if not v_shop then
    raise exception 'shop is closed for this class' using errcode = '42501';
  end if;
  if exists (select 1 from class_items where class_id = v_class and item_id = p_item_id and not enabled) then
    raise exception 'item is not sold in this class' using errcode = '42501';
  end if;

  if v_item.price > 0 then
    update profiles set coins = coins - v_item.price
      where id = v_uid and coins >= v_item.price
      returning coins into v_coins;
    if not found then
      raise exception 'not enough coins' using errcode = '22023';
    end if;
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_uid, -v_item.price, 'purchase', p_item_id, null);
  else
    select coins into v_coins from profiles where id = v_uid;
  end if;

  insert into inventory (player_id, item_id, qty) values (v_uid, p_item_id, 1)
    on conflict (player_id, item_id) do update set qty = inventory.qty + 1
    returning qty into v_qty;
  return jsonb_build_object('coins', v_coins, 'qty', v_qty);
end $$;

-- submit_answer: attempts and the daily limit come from the pupil's instance.
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

  select max_attempts, daily_task_cap into v_max, v_cap from classes where id = v_class;

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

-- I.2: move a pupil to the other instance (SPEC §1a). Coins, inventory, avatar and ledger stay.
-- Placements go back into the inventory (they are removed from the village). The pupil gets the
-- next free plot index of the new instance. Teacher only.
create or replace function public.move_student_class(p_player_id uuid, p_class_id text) returns int
  language plpgsql security definer set search_path = public as $$
declare
  v_i int := 0;
begin
  perform public.require_teacher();
  perform 1 from classes where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
  perform 1 from profiles where id = p_player_id and role = 'student';
  if not found then
    raise exception 'pupil not found' using errcode = 'P0002';
  end if;

  delete from placements where player_id = p_player_id;
  while exists (select 1 from profiles where class_id = p_class_id and plot_index = v_i) loop
    v_i := v_i + 1;
  end loop;
  update profiles set class_id = p_class_id, plot_index = v_i where id = p_player_id;
  return v_i;
end $$;

-- Grants: logged-in users only; the helpers stay internal.
revoke execute on function public.cell_blocked(text, int, int) from public, anon, authenticated;
revoke execute on function public.add_stamps(text, date, uuid[]) from public, anon;
revoke execute on function public.move_student_class(uuid, text) from public, anon;
grant execute on function public.add_stamps(text, date, uuid[]) to authenticated;
grant execute on function public.move_student_class(uuid, text) to authenticated;
