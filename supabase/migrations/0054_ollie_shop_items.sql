-- 0054: fourteen approved own/Kenney CC0 products in the existing normal shop.
-- Content only: keep ownership, balances, placements and class_items restrictions untouched.
-- Source contract: content/shop/ollie-items.json; models preserve authored metre scale.
insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_evening_lantern', 'deco', null, 'Abendlaterne', 40, '{3,3}', false, true, 'common', 0, true, null, 'shop/evening-lantern.glb', 'A warm little lantern for quiet evenings in your garden.'),
  ('shop_sunday_bench', 'deco', null, 'Sonntagsbank', 55, '{3,3}', false, true, 'common', 0, true, null, 'shop/sunday-bench.glb', 'A wooden garden bench with a backrest and sturdy green legs.'),
  ('shop_pocket_meadow', 'deco', null, 'Kleine Blumenwiese', 25, '{3,3}', false, true, 'common', 0, true, null, 'shop/pocket-meadow.glb', 'A wooden flower box full of pink, yellow and lilac flowers.'),
  ('shop_one_more_chapter', 'deco', null, 'Noch ein Kapitel', 65, '{3,3}', false, true, 'common', 0, true, null, 'shop/one-more-chapter.glb', 'A small wooden bookshelf with three rows of colourful books.'),
  ('shop_little_big_oak', 'deco', null, 'Kleine große Eiche', 45, '{3,3}', false, true, 'common', 0, true, null, 'shop/little-big-oak.glb', 'A leafy little oak with a wide green crown and a round stone base.'),
  ('shop_support_duck', 'deco', null, 'Wohlfühlente', 20, '{3,3}', false, true, 'common', 0, true, null, 'shop/support-duck.glb', 'A cheerful wooden duck to keep you company in the garden.'),
  ('shop_rainy_day_barrel', 'deco', null, 'Regentonnenfass', 35, '{3,3}', false, true, 'common', 0, true, null, 'shop/rainy-day-barrel.glb', 'A red barrel with a broad metal band for a cosy garden corner.'),
  ('shop_apple_of_my_eye', 'deco', null, 'Mein Augenapfel', 10, '{3,3}', false, true, 'common', 0, true, null, 'shop/apple-of-my-eye.glb', 'A little wooden crate with six bright red apples.'),
  ('shop_little_blue_cottage', 'house', null, 'Kleines blaues Häuschen', 140, '{6,4}', false, true, 'common', 0, true, null, 'shop/little-blue-cottage.glb', 'A tiny cottage with blue shutters, warm windows and a red gabled roof.'),
  ('shop_apple_gable_cottage', 'house', null, 'Apfelgiebel-Häuschen', 100, '{6,4}', false, true, 'common', 0, true, null, 'shop/apple-gable-cottage.glb', 'A cosy storybook cottage with flower boxes, large windows and a little round window under the roof.'),
  ('shop_moss_corner_cottage', 'house', null, 'Mooswinkel-Häuschen', 125, '{6,4}', false, true, 'common', 0, true, null, 'shop/moss-corner-cottage.glb', 'A roomy little cottage with sage walls, big wooden windows and a flower-filled bay window.'),
  ('shop_lantern_house', 'house', null, 'Laternenhaus', 150, '{6,4}', false, true, 'common', 0, true, null, 'shop/lantern-house.glb', 'A cosy two-storey house with a projecting upper floor, flower boxes and a small lantern by the door.'),
  ('shop_apple_gable_garage', 'garage', null, 'Apfelgiebel-Garage', 75, '{3,4}', false, true, 'common', 0, true, null, 'shop/apple-gable-garage.glb', 'A little storybook garage with green double doors, side windows and a chunky red roof.'),
  ('shop_moss_workshop', 'garage', null, 'Mooswerkstatt', 100, '{3,4}', false, true, 'common', 0, true, null, 'shop/moss-workshop.glb', 'A friendly village workshop with sage walls, a wide panel door and a gently curved teal roof.')
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
