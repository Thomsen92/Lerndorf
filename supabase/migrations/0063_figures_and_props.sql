-- 0063: four more decorations for the normal shop (teacher, 30.10.2026): a fizzy drink can, Snorlax,
-- King Boo and a power armor. Additive: four new rows in items. Ownership, balances, placements and
-- class_items stay untouched.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_fizzy_drink', 'deco', null, 'Brausedose', 80, '{3,3}', false, true, 'common', 0, true, null, 'shop/fizzy-drink.glb', 'A big fizzy drink can with a cheerful face.'),
  ('shop_snorlax', 'deco', null, 'Snorlax', 600, '{3,3}', false, true, 'epic', 0, true, null, 'shop/snorlax.glb', 'A huge sleepy creature taking a nap in your garden.'),
  ('shop_king_boo', 'deco', null, 'King Boo', 500, '{3,3}', false, true, 'epic', 0, true, null, 'shop/king-boo.glb', 'A grinning ghost king with a purple jewel on his crown.'),
  ('shop_power_armor', 'deco', null, 'Power-Rüstung', 800, '{3,3}', false, true, 'epic', 0, true, null, 'shop/power-armor.glb', 'A heavy suit of power armor, ready for action.')
on conflict (id) do update set
  kind = excluded.kind,
  slot = excluded.slot,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  starter = excluded.starter,
  active = excluded.active,
  rarity = excluded.rarity,
  lootbox_weight = excluded.lootbox_weight,
  shop_visible = excluded.shop_visible,
  season = excluded.season,
  model = excluded.model,
  description = excluded.description;
