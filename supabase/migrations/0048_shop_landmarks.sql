-- 0048: two skyscrapers and a village church for the normal shop.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_burj_khalifa', 'house', null, 'Burj Khalifa', 5000, '{6,4}', false, true, 'common', 0, true, null,
   'shop/burj-khalifa.glb', 'The world''s tallest skyscraper, scaled down for the village.'),
  ('shop_empire_state', 'house', null, 'Empire State Building', 4000, '{6,4}', false, true, 'common', 0, true, null,
   'shop/empire-state.glb', 'A classic New York skyscraper with an art-deco spire.'),
  ('shop_church', 'house', null, 'Village Church', 1200, '{6,4}', false, true, 'common', 0, true, null,
   'shop/church.glb', 'A small village church with a bell tower.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
