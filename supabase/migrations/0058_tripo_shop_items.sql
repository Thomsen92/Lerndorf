-- 0058: seven new shop pieces (castle, robot, statue, four vehicles), additive content only.
-- Ownership, balances, placements and class_items restrictions stay untouched.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_medieval_castle', 'house', null, 'Mittelalterburg', 1000, '{6,4}', false, true, 'legendary', 0, true, null, 'shop/medieval-castle.glb', 'A stone castle with towers and battlements, fit for a knight.'),
  ('shop_exosuit_robot', 'deco', null, 'Blauer Exo-Roboter', 350, '{3,3}', false, true, 'epic', 0, true, null, 'shop/exosuit-robot.glb', 'A blue armored robot ready for action.'),
  ('shop_obama_statue', 'deco', null, 'Obama-Statue', 1000, '{3,3}', false, true, 'legendary', 0, true, null, 'shop/obama-statue.glb', 'A statue of Barack Obama, the 44th president of the USA.'),
  ('shop_simson_motorcycle', 'car', null, 'Simson-Motorrad', 700, '{3,5}', false, true, 'epic', 0, true, null, 'shop/simson-motorcycle.glb', 'A classic motorcycle from East Germany.'),
  ('shop_moped', 'car', null, 'Moped', 300, '{3,5}', false, true, 'rare', 0, true, null, 'shop/moped.glb', 'A small moped for short trips.'),
  ('shop_scooter', 'car', null, 'Roller', 400, '{3,5}', false, true, 'rare', 0, true, null, 'shop/scooter.glb', 'A little scooter for getting around the village.'),
  ('shop_fendt_tractor', 'car', null, 'Fendt-Traktor', 300, '{3,5}', false, true, 'epic', 0, true, null, 'shop/fendt-tractor.glb', 'A big tractor for work on the farm.')
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
