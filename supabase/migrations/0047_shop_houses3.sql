-- 0047: six more houses for the normal shop (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_panel_house', 'house', null, 'Panel House', 700, '{6,4}', false, true, 'common', 0, true, null,
   'shop/panel-house.glb', 'A tall grey apartment block in socialist style.'),
  ('shop_forest_cabin', 'house', null, 'Forest Cabin', 600, '{6,4}', false, true, 'common', 0, true, null,
   'shop/forest-cabin.glb', 'A snug wooden cabin with a steep roof.'),
  ('shop_classroom', 'house', null, 'Classroom', 900, '{6,4}', false, true, 'common', 0, true, null,
   'shop/classroom.glb', 'A single-storey classroom for the village school.'),
  ('shop_house_3', 'house', null, 'House 3', 750, '{6,4}', false, true, 'common', 0, true, null,
   'shop/house-3.glb', 'A modern low-poly house with a red roof.'),
  ('shop_home_1', 'house', null, 'Home 1', 850, '{6,4}', false, true, 'common', 0, true, null,
   'shop/home-1.glb', 'A bright yellow family home with a porch.'),
  ('shop_home_2', 'house', null, 'Home 2', 950, '{6,4}', false, true, 'common', 0, true, null,
   'shop/home-2.glb', 'A two-storey home with a balcony and garage.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
