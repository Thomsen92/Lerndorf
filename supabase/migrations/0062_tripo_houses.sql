-- 0062: two more houses for the normal shop (teacher, 30.10.2026): a fairytale castle and a haunted mansion.
-- Additive: two new rows in items. Ownership, balances, placements and class_items stay untouched.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_fairytale_castle', 'house', null, 'Märchenschloss', 1500, '{6,4}', false, true, 'epic', 0, true, null, 'shop/fairytale-castle.glb', 'A little white castle with a red roof, towers and a garden.'),
  ('shop_haunted_mansion', 'house', null, 'Spukvilla', 1200, '{6,4}', false, true, 'epic', 0, true, null, 'shop/haunted-mansion.glb', 'A spooky old mansion with a pointed roof and glowing windows.')
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
