-- 0039: mascot, smartphone, moai statue and four farm buildings (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_mascot', 'deco', null, 'Thumbs-Up Mascot', 120, '{3,3}', false, true, 'common', 0, true, null,
   'shop/mascot.glb', 'A cheerful mascot giving a thumbs-up.'),
  ('shop_smartphone', 'deco', null, 'Smartphone', 60, '{3,3}', false, true, 'common', 0, true, null,
   'shop/smartphone.glb', 'A modern smartphone with a glossy screen.'),
  ('shop_moai', 'deco', null, 'Moai Statue', 140, '{3,3}', false, true, 'common', 0, true, null,
   'shop/moai.glb', 'A weathered stone head from Easter Island.'),
  ('shop_water_tower', 'deco', null, 'Water Tower', 180, '{3,3}', false, true, 'common', 0, true, null,
   'shop/water-tower.glb', 'A tall wooden water tower for the farm.'),
  ('shop_chicken_coop', 'deco', null, 'Chicken Coop', 80, '{3,3}', false, true, 'common', 0, true, null,
   'shop/chicken-coop.glb', 'A small red chicken coop for the farmyard.'),
  ('shop_windmill', 'deco', null, 'Windmill', 160, '{3,3}', false, true, 'common', 0, true, null,
   'shop/windmill.glb', 'A tall windmill with sails for the farm.'),
  ('shop_barn', 'deco', null, 'Barn', 150, '{3,3}', false, true, 'common', 0, true, null,
   'shop/barn.glb', 'A big red barn for the farm.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
