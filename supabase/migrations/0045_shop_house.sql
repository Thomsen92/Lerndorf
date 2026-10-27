-- 0045: cosy family house for the normal shop (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_family_house', 'house', null, 'Family House', 900, '{6,4}', false, true, 'common', 0, true, null,
   'shop/family-house.glb', 'A cosy little family house with a chimney and a round front door.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
