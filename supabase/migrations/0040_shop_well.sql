-- 0040: stone well for the normal shop (main, no season binding).
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_well', 'deco', null, 'Well', 70, '{3,3}', false, true, 'common', 0, true, null,
   'shop/well.glb', 'A stone well with a little roof for the farmyard.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
