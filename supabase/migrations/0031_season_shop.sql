-- 0031: six non-season shop items (plan §3.4, E21). They stay in the shop permanently,
-- are not part of any season and are bought through the existing buy_item RPC.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model)
values
  ('shop_cabin', 'house', null, 'Blockhütte', 500, '{6,4}', false, true, 'common', 0, true, null, 'shop/cabin.glb'),
  ('shop_beatall', 'car', null, 'Beatall', 600, '{3,5}', false, true, 'common', 0, true, null, 'shop/beatall.glb'),
  ('shop_toyoyo', 'car', null, 'Toyoyo', 700, '{3,5}', false, true, 'common', 0, true, null, 'shop/toyoyo-highlight.glb'),
  ('shop_president_car', 'car', null, 'Präsidentenwagen', 2000, '{3,5}', false, true, 'common', 0, true, null, 'shop/president-car.glb'),
  ('shop_trump', 'deco', null, 'Trump-Statue', 2000, '{3,3}', false, true, 'common', 0, true, null, 'shop/trump-statue.glb'),
  ('shop_white_house', 'house', null, 'Weißes Haus', 5000, '{6,4}', false, true, 'common', 0, true, null, 'shop/white-house.glb')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model;
