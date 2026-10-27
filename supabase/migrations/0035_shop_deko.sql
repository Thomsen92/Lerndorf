-- 0035: two Halloween decorations for the normal shop (main, no season binding).
-- English names and descriptions; both are scaled by the loader to fill the 3 x 3 decoration pedestal.
alter table public.items add column if not exists description text;

insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible, season, model, description)
values
  ('shop_candy_cauldron', 'deco', null, 'Candy Cauldron', 80, '{3,3}', false, true, 'common', 0, true, null,
   'shop/candy-cauldron.glb',
   'A bubbling cauldron overflowing with Halloween candy.'),
  ('shop_chibi_trick_or_treater', 'deco', null, 'Trick-or-Treater', 150, '{3,3}', false, true, 'common', 0, true, null,
   'shop/chibi-trick-or-treater.glb',
   'A cute chibi trick-or-treater waiting for candy.')
on conflict (id) do update set
  kind = excluded.kind,
  name_de = excluded.name_de,
  price = excluded.price,
  footprint = excluded.footprint,
  active = excluded.active,
  shop_visible = excluded.shop_visible,
  model = excluded.model,
  description = excluded.description;
