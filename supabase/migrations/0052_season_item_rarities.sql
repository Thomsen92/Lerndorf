-- Season I chest pool: rarities adjusted by the teacher (28.10.2026).
-- Pumpkin girl and witch statue become epic, the pumpkin patch becomes rare. The chest roll draws
-- the rarity first (55/30/12/3) and then an item of that rarity, so only the item mix within a band
-- changes. Chests already opened keep the rarity they were opened with; owned items stay owned.
-- Sell values follow the rarity through season_sell_value() (no fixed sell price on these items).
update public.items set rarity = 'epic'
  where id in ('season_pumpkin_girl', 'season_witch_statue') and season = '2026-11-halloween';
update public.items set rarity = 'rare'
  where id = 'season_pumpkin_patch' and season = '2026-11-halloween';
