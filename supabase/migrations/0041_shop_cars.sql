-- 0041: three more cars from the low-poly car pack (main, no season binding).
-- Beatall and Toyoyo already exist; their models were replaced by the textured FBX versions.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_delorean', 'car', null, 'Retro Sports Car', 700, '{3,5}', false, true, 'common', 0, true, null,
   'shop/delorean.glb', 'A stainless-steel sports car with gull-wing doors.'),
  ('shop_landyroamer', 'car', null, 'Off-Road Rover', 450, '{3,5}', false, true, 'common', 0, true, null,
   'shop/landyroamer.glb', 'A rugged off-road vehicle with a roof rack and snorkel.'),
  ('shop_tristar', 'car', null, 'Racing GT', 550, '{3,5}', false, true, 'common', 0, true, null,
   'shop/tristar.glb', 'A low, fast racing car with a wide body and rear wing.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
