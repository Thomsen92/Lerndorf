-- Lerndorf: instance rules and shop switches for the teacher (SPEC §1a, §13; PLAN I.3).
-- Each class has its own rules; the teacher changes them per instance.

-- Rules of one instance. Ranges keep the game sane (SPEC §14).
create or replace function public.set_class_rules(
  p_class_id text,
  p_stamp int,
  p_daily_cap int,
  p_max_attempts int,
  p_plot_cols int,
  p_plot_rows int
) returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  if p_stamp < 0 or p_stamp > 1000 then
    raise exception 'stamp reward must be 0 to 1000' using errcode = '22023';
  end if;
  if p_daily_cap < 0 or p_daily_cap > 1000 then
    raise exception 'daily cap must be 0 to 1000' using errcode = '22023';
  end if;
  if p_max_attempts < 1 or p_max_attempts > 10 then
    raise exception 'attempts must be 1 to 10' using errcode = '22023';
  end if;
  if p_plot_cols < 3 or p_plot_cols > 12 or p_plot_rows < 4 or p_plot_rows > 12 then
    raise exception 'grid must be 3 to 12 columns and 4 to 12 rows' using errcode = '22023';
  end if;
  update classes set
    stamp_reward = p_stamp,
    daily_task_cap = p_daily_cap,
    max_attempts = p_max_attempts,
    plot_cols = p_plot_cols,
    plot_rows = p_plot_rows
  where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
end $$;

-- Sells or hides one item in one instance. Hidden items cannot be bought there (class_items).
create or replace function public.set_item_sold(p_class_id text, p_item_id text, p_sold boolean)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  perform 1 from classes where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
  if p_sold then
    delete from class_items where class_id = p_class_id and item_id = p_item_id;
  else
    insert into class_items (class_id, item_id, enabled) values (p_class_id, p_item_id, false)
      on conflict (class_id, item_id) do update set enabled = false;
  end if;
end $$;

revoke execute on function public.set_class_rules(text, int, int, int, int, int) from public, anon;
revoke execute on function public.set_item_sold(text, text, boolean) from public, anon;
grant execute on function public.set_class_rules(text, int, int, int, int, int) to authenticated;
grant execute on function public.set_item_sold(text, text, boolean) to authenticated;
