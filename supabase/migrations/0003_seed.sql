-- Lerndorf: seed data. Idempotent, safe to run again.
-- Layout seeds fix the village of each class (SPEC §10). Change them only before pupils start.

insert into classes (id, name, layout_seed) values
  ('8a', 'Klasse 8a', 11),
  ('8b', 'Klasse 8b', 23)
on conflict (id) do nothing;
