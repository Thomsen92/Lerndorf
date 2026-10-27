-- 0037: two CRT televisions for the normal shop (main, no season binding).
-- Same FBX pack as the monitors, textured with the supplied MasterMaterial palette.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_tv_crt_07', 'deco', null, 'CRT Television', 60, '{3,3}', false, true, 'common', 0, true, null,
   'shop/tv-crt-07.glb', 'A compact black CRT television with a curved screen.'),
  ('shop_tv_crt_09', 'deco', null, 'Wooden CRT Television', 100, '{3,3}', false, true, 'common', 0, true, null,
   'shop/tv-crt-09.glb', 'A retro CRT television in a wooden-style case.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
