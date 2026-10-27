-- 0044: roadside fast-food sign for the normal shop (main, no season binding).
-- The model carries the original brand artwork; see LICENSES.md.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_fast_food_sign', 'deco', null, 'Fast Food Sign', 60, '{3,3}', false, true, 'common', 0, true, null,
   'shop/fast-food-sign.glb', 'A tall roadside sign for a fast-food restaurant.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
