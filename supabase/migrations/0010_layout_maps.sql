-- Lerndorf: map template per instance (SPEC §10.1, PLAN L.2).
-- Templates exist in the code (web/src/world/maps); the database only stores which one an instance uses.

-- The ids the app knows. Keep in sync with web/src/world/maps/index.ts.
create table map_templates (
  id text primary key,
  name text not null
);
insert into map_templates (id, name) values
  ('tal', 'Tal'),
  ('fluss_mitte', 'Fluss in der Mitte'),
  ('bach_norden', 'Bach im Norden')
on conflict (id) do nothing;

alter table map_templates enable row level security;
create policy map_templates_read on map_templates for select using (true);
revoke insert, update, delete on map_templates from anon, authenticated;
grant select on map_templates to authenticated;

alter table classes add constraint classes_map_id_fk foreign key (map_id) references map_templates (id);

-- set_layout(class, map, seed): template and seed of an instance in one step. Teacher only.
-- A change moves every plot of the class (SPEC §10.5); the UI warns before.
create or replace function public.set_layout(p_class_id text, p_map_id text, p_seed int) returns void
  language plpgsql security definer set search_path = public as $$
begin
  perform public.require_teacher();
  if p_seed < 1 or p_seed > 99999 then
    raise exception 'seed must be between 1 and 99999' using errcode = '22023';
  end if;
  update classes set map_id = p_map_id, layout_seed = p_seed where id = p_class_id;
  if not found then
    raise exception 'class not found' using errcode = 'P0002';
  end if;
end $$;

revoke execute on function public.set_layout(text, text, int) from public, anon;
grant execute on function public.set_layout(text, text, int) to authenticated;
