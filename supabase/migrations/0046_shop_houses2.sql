-- 0046: low-poly house and Neuschwanstein castle for the normal shop.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_low_poly_house', 'house', null, 'Low Poly House', 800, '{6,4}', false, true, 'common', 0, true, null,
   'shop/low-poly-house.glb', 'A simple low-poly house with a pitched roof and warm windows.'),
  ('shop_neuschwanstein', 'house', null, 'Neuschwanstein Castle', 2500, '{6,4}', false, true, 'common', 0, true, null,
   'shop/neuschwanstein.glb', 'A pixel-style fairy-tale castle with towers and turrets.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
