-- 0042: compact cars, police cars and delivery vans in several colours (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_car5', 'car', null, 'Compact Car', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car5.glb', 'A small red compact car for city trips.'),
  ('shop_car5_green', 'car', null, 'Green Compact Car', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car5-green.glb', 'A small green compact car for city trips.'),
  ('shop_car5_grey', 'car', null, 'Grey Compact Car', 300, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car5-grey.glb', 'A small grey compact car for city trips.'),
  ('shop_car5_police', 'car', null, 'Police Car', 350, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car5-police.glb', 'A blue police car with a light bar.'),
  ('shop_car5_police_la', 'car', null, 'LA Police Car', 350, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car5-police-la.glb', 'A black-and-white police car in Los Angeles style.'),
  ('shop_car8', 'car', null, 'Delivery Van', 320, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car8.glb', 'A white delivery van with a roomy cargo area.'),
  ('shop_car8_grey', 'car', null, 'Grey Delivery Van', 320, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car8-grey.glb', 'A grey delivery van for heavy loads.'),
  ('shop_car8_mail', 'car', null, 'Mail Van', 340, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car8-mail.glb', 'A white mail van with red stripes.'),
  ('shop_car8_purple', 'car', null, 'Purple Delivery Van', 340, '{3,5}', false, true, 'common', 0, true, null,
   'shop/car8-purple.glb', 'A purple delivery van with a roomy cargo area.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
