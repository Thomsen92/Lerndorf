-- 0059: rarity labels for the existing normal-shop items, by price band.
-- Label only: shop items (season is null) cannot be sold and are in no chest pool, so no coins,
-- ownership or placement changes. Items that already got a rarity by hand (0058) stay as they are.
update public.items set rarity = case
    when price >= 2000 then 'legendary'
    when price >= 500 then 'epic'
    when price >= 150 then 'rare'
    else 'common'
  end
where season is null
  and shop_visible
  and id like 'shop\_%'
  and rarity = 'common'
  and price > 0;
