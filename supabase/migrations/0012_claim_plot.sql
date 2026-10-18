-- Lerndorf: a pupil chooses a free plot as building site (SPEC §10.5, PLAN L.5).
-- New pupils start without a plot; the first choice is final, so a house never moves.

create or replace function public.claim_plot(p_index int) returns int
  language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cls text;
  cur int;
begin
  select class_id, plot_index into cls, cur from profiles where id = me and role = 'student';
  if cls is null then
    raise exception 'forbidden: pupils only' using errcode = '42501';
  end if;
  if cur is not null then
    raise exception 'plot already chosen' using errcode = '22023';
  end if;
  -- the village has 34 plots (api/village.ts PLOT_COUNT)
  if p_index is null or p_index < 0 or p_index > 33 then
    raise exception 'plot out of range' using errcode = '22023';
  end if;
  if exists (select 1 from profiles where class_id = cls and plot_index = p_index) then
    raise exception 'plot taken' using errcode = '23505';
  end if;
  update profiles set plot_index = p_index where id = me;
  return p_index;
end $$;

revoke execute on function public.claim_plot(int) from public, anon;
grant execute on function public.claim_plot(int) to authenticated;
