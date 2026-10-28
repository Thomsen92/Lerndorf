-- 0043: blue/black/red sedans and an estate car (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_car2', 'car', null, 'Compact Sedan', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car2.glb', 'A small blue sedan for everyday trips.'),
  ('shop_car2_black', 'car', null, 'Black Sedan', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car2-black.glb', 'A sleek black sedan for everyday trips.'),
  ('shop_car2_red', 'car', null, 'Red Sedan', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car2-red.glb', 'A bright red sedan for everyday trips.'),
  ('shop_car6', 'car', null, 'Estate Car', 320, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car6.glb', 'A practical estate car with a large boot.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
