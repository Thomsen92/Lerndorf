-- Katzen-Schild als kaufbare Deko auf den bestehenden 3×3-Dekosockeln.
insert into items (
  id, kind, slot, name_de, price, footprint, starter, active, rarity, lootbox_weight, shop_visible
) values (
  'deco_cat_sign', 'deco', null, 'Katzenschild', 120, '{3,3}', false, true, 'common', 0, true
)
on conflict (id) do nothing;
