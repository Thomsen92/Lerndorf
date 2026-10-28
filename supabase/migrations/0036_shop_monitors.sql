-- 0036: four retro monitor decorations for the normal shop (main, no season binding).
-- Imported from the supplied FBX files, turned to +Z and scaled by the loader to fill the 3 x 3 pedestal.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_monitor_01', 'deco', null, 'Retro Monitor', 40, '{3,3}', false, true, 'common', 0, true, null,
   'shop/monitor-01.glb', 'A compact CRT monitor with a chunky beige case.'),
  ('shop_monitor_02', 'deco', null, 'Retro Workstation', 70, '{3,3}', false, true, 'common', 0, true, null,
   'shop/monitor-02.glb', 'A CRT monitor with its matching keyboard.'),
  ('shop_monitor_05', 'deco', null, 'Terminal Console', 110, '{3,3}', false, true, 'common', 0, true, null,
   'shop/monitor-05.glb', 'A wide terminal with a built-in keyboard.'),
  ('shop_monitor_06', 'deco', null, 'Mainframe Terminal', 90, '{3,3}', false, true, 'common', 0, true, null,
   'shop/monitor-06.glb', 'A tall mainframe terminal straight from the 80s.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
