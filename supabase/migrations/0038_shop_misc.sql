-- 0038: five more decoration items for the normal shop (main, no season binding).
-- Models supplied by the teacher as GLB; names are neutral, the model textures carry the artwork.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_game_case', 'deco', null, 'Game Case', 40, '{3,3}', false, true, 'common', 0, true, null,
   'shop/gta6-ps5-case.glb', 'A game case with its disc, ready for the shelf.'),
  ('shop_phone_case', 'deco', null, 'Phone Case', 45, '{3,3}', false, true, 'common', 0, true, null,
   'shop/gta6-phone-case.glb', 'A colourful phone case with a glossy print.'),
  ('shop_round_frog', 'deco', null, 'Round Frog', 60, '{3,3}', false, true, 'common', 0, true, null,
   'shop/cute-round-frog.glb', 'A round, cheerful frog figurine.'),
  ('shop_cute_fox', 'deco', null, 'Cute Fox', 120, '{3,3}', false, true, 'common', 0, true, null,
   'shop/cute-fox.glb', 'A cute fox figurine with a fluffy tail.'),
  ('shop_blue_engine', 'deco', null, 'Little Blue Engine', 180, '{3,3}', false, true, 'common', 0, true, null,
   'shop/blue-engine.glb', 'A friendly little blue engine for your garden railway.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
