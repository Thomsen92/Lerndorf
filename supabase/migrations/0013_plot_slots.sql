-- Lerndorf: fixed plot plan with slots (docs/ASSET_VERTRAG.md, Fassung 2, freigegeben 20.10.2026).
-- Every plot has the same seven slots: house, garage, car (pedestal in the driveway) and four
-- decoration pedestals of 3 x 3 cells. The positions live in web/src/world/plotPlan.ts; the server
-- only checks which item may go into which slot. Free placement on cells (place_item) ends here.

-- 1. Catalogue: new kinds and the fields for shop and lootbox --------------------------------------

alter table items drop constraint if exists items_kind_check;
alter table items add constraint items_kind_check
  check (kind in ('deco', 'avatar', 'house', 'garage', 'car'));
alter table items add column if not exists rarity text not null default 'common'
  check (rarity in ('common', 'rare', 'epic', 'legendary'));
alter table items add column if not exists lootbox_weight int not null default 0 check (lootbox_weight >= 0);
alter table items add column if not exists shop_visible boolean not null default true;

-- every decoration fills one pedestal of 3 x 3 cells
update items set footprint = '{3,3}' where kind = 'deco';

insert into items (id, kind, slot, name_de, price, footprint, starter, active, rarity) values
  ('house_fachwerk', 'house', null, 'Fachwerkhaus', 0, '{6,4}', true, true, 'common'),
  ('house_landhaus', 'house', null, 'Landhaus mit Balkon', 300, '{6,4}', false, true, 'rare'),
  ('house_villa', 'house', null, 'Villa mit Veranda', 500, '{6,4}', false, true, 'epic'),
  ('garage_holz', 'garage', null, 'Holzgarage', 0, '{3,4}', true, true, 'common'),
  ('garage_stein', 'garage', null, 'Steingarage', 150, '{3,4}', false, true, 'rare'),
  ('car_kleinwagen', 'car', null, 'Kleinwagen', 200, '{3,5}', false, true, 'common'),
  ('car_camper', 'car', null, 'Camper', 400, '{3,5}', false, true, 'rare')
on conflict (id) do nothing;

-- 2. Placements: one row per filled slot ----------------------------------------------------------

-- Free placements on cells cannot be mapped to slots. At the time of this change there were none;
-- deleting a placement never loses an item (the inventory keeps every copy).
delete from placements;
alter table placements drop column if exists cell_x;
alter table placements drop column if exists cell_z;
alter table placements add column slot text not null
  check (slot in ('house', 'garage', 'car', 'deco_1', 'deco_2', 'deco_3', 'deco_4'));
alter table placements add constraint placements_one_per_slot unique (player_id, slot);

-- which item kind a slot accepts
create or replace function public.slot_kind(p_slot text) returns text
  language sql immutable as $$
  select case
    when p_slot in ('house', 'garage', 'car') then p_slot
    when p_slot in ('deco_1', 'deco_2', 'deco_3', 'deco_4') then 'deco'
    else null
  end
$$;

drop function if exists public.place_item(text, int, int, int);
drop function if exists public.remove_placement(bigint);
drop function if exists public.cell_blocked(text, int, int);

-- place_in_slot(item, slot, rot): puts an own item into an own slot. A previous item in that slot
-- goes back to the inventory. Checks: pupil, build switch, kind fits the slot, rotation allowed
-- (decorations in quarter turns, everything else 0), a free copy (starter items are always owned).
create or replace function public.place_in_slot(p_item_id text, p_slot text, p_rot int) returns bigint
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_build boolean;
  v_kind text := public.slot_kind(p_slot);
  v_qty int;
  v_placed int;
  v_id bigint;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can build' using errcode = '42501';
  end if;
  select build_open into v_build from classes where id = v_class;
  if not v_build then
    raise exception 'building is closed for this class' using errcode = '42501';
  end if;
  if v_kind is null then
    raise exception 'unknown slot' using errcode = '22023';
  end if;
  select * into v_item from items where id = p_item_id and active;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if v_item.kind <> v_kind then
    raise exception 'item does not fit this slot' using errcode = '22023';
  end if;
  if p_rot is null or p_rot not between 0 and 3 or (v_kind <> 'deco' and p_rot <> 0) then
    raise exception 'rotation not allowed' using errcode = '22023';
  end if;

  -- the old item of this slot goes back first (rolled back if the new one is refused)
  delete from placements where player_id = v_uid and slot = p_slot;

  if not v_item.starter then
    select coalesce(sum(inv.qty), 0) into v_qty from inventory inv
      where inv.player_id = v_uid and inv.item_id = p_item_id;
    select count(*) into v_placed from placements
      where player_id = v_uid and item_id = p_item_id;
    if v_qty - v_placed <= 0 then
      raise exception 'no free copy in the inventory' using errcode = '22023';
    end if;
  end if;

  insert into placements (player_id, item_id, slot, rot)
    values (v_uid, p_item_id, p_slot, p_rot)
    returning id into v_id;
  return v_id;
end $$;

-- clear_slot(slot): takes the car or a decoration away (back to the inventory).
-- House and garage are never empty; they can only be exchanged.
create or replace function public.clear_slot(p_slot text) returns void
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_class text;
  v_build boolean;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can build' using errcode = '42501';
  end if;
  select build_open into v_build from classes where id = v_class;
  if not v_build then
    raise exception 'building is closed for this class' using errcode = '42501';
  end if;
  if public.slot_kind(p_slot) is null then
    raise exception 'unknown slot' using errcode = '22023';
  end if;
  if p_slot in ('house', 'garage') then
    raise exception 'house and garage cannot be empty' using errcode = '22023';
  end if;
  delete from placements where player_id = v_uid and slot = p_slot;
end $$;

-- 3. Buying: houses, garages and cars only once each (a plot has one slot for each) -----------------

create or replace function public.buy_item(p_item_id text) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_shop boolean;
  v_coins int;
  v_qty int;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  select * into v_item from items where id = p_item_id and active;
  if not found then
    raise exception 'item not found' using errcode = 'P0002';
  end if;
  if v_item.starter then
    raise exception 'starter items are not sold' using errcode = '22023';
  end if;
  if not v_item.shop_visible then
    raise exception 'item is not sold in the shop' using errcode = '22023';
  end if;

  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can buy' using errcode = '42501';
  end if;
  select shop_open into v_shop from classes where id = v_class;
  if not v_shop then
    raise exception 'shop is closed for this class' using errcode = '42501';
  end if;
  if exists (select 1 from class_items where class_id = v_class and item_id = p_item_id and not enabled) then
    raise exception 'item is not sold in this class' using errcode = '42501';
  end if;
  if v_item.kind in ('house', 'garage', 'car')
     and exists (select 1 from inventory where player_id = v_uid and item_id = p_item_id and qty > 0) then
    raise exception 'already owned' using errcode = '22023';
  end if;

  if v_item.price > 0 then
    update profiles set coins = coins - v_item.price
      where id = v_uid and coins >= v_item.price
      returning coins into v_coins;
    if not found then
      raise exception 'not enough coins' using errcode = '22023';
    end if;
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_uid, -v_item.price, 'purchase', p_item_id, null);
  else
    select coins into v_coins from profiles where id = v_uid;
  end if;

  insert into inventory (player_id, item_id, qty) values (v_uid, p_item_id, 1)
    on conflict (player_id, item_id) do update set qty = inventory.qty + 1
    returning qty into v_qty;
  return jsonb_build_object('coins', v_coins, 'qty', v_qty);
end $$;

-- 4. The grid size per class is fixed by the plan now (11 x 11); keep the columns for old clients.
alter table classes alter column plot_cols set default 11;
alter table classes alter column plot_rows set default 11;
update classes set plot_cols = 11, plot_rows = 11;
alter table settings alter column plot_cols set default 11;
alter table settings alter column plot_rows set default 11;
update settings set plot_cols = 11, plot_rows = 11;

revoke execute on function public.place_in_slot(text, text, int) from public, anon;
revoke execute on function public.clear_slot(text) from public, anon;
revoke execute on function public.slot_kind(text) from public, anon;
grant execute on function public.place_in_slot(text, text, int) to authenticated;
grant execute on function public.clear_slot(text) to authenticated;
grant execute on function public.slot_kind(text) to authenticated;
