-- Lerndorf: avatar, shop and build functions (SPEC §7, §8, §14; PLAN stufe 2.9 and 4.2).
-- All changes go through these security definer functions. Clients never write the tables.

-- Colours an avatar may use (SPEC §8: fixed palette). Hex values, lower case.
alter table settings add column if not exists avatar_palette text[] not null default array[
  '#c0502f', '#4b7bec', '#20bf6b', '#f7b731', '#8854d0', '#fd9644',
  '#2d98da', '#eb3b5a', '#2b2118', '#e2b24a', '#5b3a29', '#d9d9e6'
];

-- Catalogue: starter avatar parts (free for everyone) and a first set of shop items.
-- Prices follow SPEC §14. Footprint is in grid cells [width, depth].
insert into items (id, kind, slot, name_de, price, footprint, starter, active) values
  ('hair_01', 'avatar', 'hair', 'Kurzhaar', 0, '{1,1}', true, true),
  ('hair_02', 'avatar', 'hair', 'Pferdeschwanz', 0, '{1,1}', true, true),
  ('hair_03', 'avatar', 'hair', 'Wuschel', 0, '{1,1}', true, true),
  ('top_01', 'avatar', 'top', 'T-Shirt', 0, '{1,1}', true, true),
  ('top_02', 'avatar', 'top', 'Hoodie', 0, '{1,1}', true, true),
  ('top_03', 'avatar', 'top', 'Strickjacke', 0, '{1,1}', true, true),
  ('pants_01', 'avatar', 'pants', 'Jeans', 0, '{1,1}', true, true),
  ('pants_02', 'avatar', 'pants', 'Shorts', 0, '{1,1}', true, true),
  ('hat_01', 'avatar', 'hat', 'Basecap', 60, '{1,1}', false, true),
  ('acc_01', 'avatar', 'acc', 'Kopfhörer', 40, '{1,1}', false, true),
  ('deco_bench', 'deco', null, 'Gartenbank', 30, '{2,1}', false, true),
  ('deco_flowerbed', 'deco', null, 'Blumenbeet', 20, '{2,1}', false, true),
  ('deco_fountain', 'deco', null, 'Springbrunnen', 120, '{2,2}', false, true)
on conflict (id) do nothing;

-- save_avatar(recipe): validates every part and colour, then stores the recipe (SPEC §7).
create or replace function public.save_avatar(recipe jsonb) returns jsonb
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_slot text;
  v_item text;
  v_ok boolean;
  v_palette text[];
  v_color text;
begin
  if v_uid is null then
    raise exception 'not logged in' using errcode = '42501';
  end if;
  if (recipe->>'v') is distinct from '1' then
    raise exception 'unknown recipe version' using errcode = '22023';
  end if;
  if (recipe->>'skin')::int not between 0 and 4 then
    raise exception 'skin must be 0 to 4' using errcode = '22023';
  end if;
  if (recipe->>'eyes')::int not between 0 and 3 then
    raise exception 'eyes must be 0 to 3' using errcode = '22023';
  end if;

  select avatar_palette into v_palette from settings where id = 1;
  foreach v_color in array array[recipe->>'hairColor', recipe->>'topColor'] loop
    if v_color is not null and not (v_color = any (v_palette)) then
      raise exception 'colour not in palette' using errcode = '22023';
    end if;
  end loop;

  foreach v_slot in array array['hair', 'top', 'pants', 'hat', 'acc', 'pet'] loop
    v_item := recipe->>v_slot;
    if v_item is null then
      continue;
    end if;
    -- the part must exist, fit its slot, be active, and be free (starter) or in the inventory
    select (i.starter or exists (
        select 1 from inventory inv
        where inv.player_id = v_uid and inv.item_id = i.id and inv.qty > 0))
      into v_ok
      from items i
      where i.id = v_item and i.kind = 'avatar' and i.slot = v_slot and i.active;
    if not found or not v_ok then
      raise exception 'part % not allowed in slot %', v_item, v_slot using errcode = '42501';
    end if;
  end loop;

  update profiles set avatar = recipe where id = v_uid;
  return recipe;
end $$;

-- buy_item(item): checks shop switch, price and coins; books the purchase in the ledger.
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

  select p.class_id into v_class from profiles p where p.id = v_uid and p.role = 'student';
  if not found then
    raise exception 'only pupils can buy' using errcode = '42501';
  end if;
  select shop_open into v_shop from classes where id = v_class;
  if not v_shop then
    raise exception 'shop is closed for this class' using errcode = '42501';
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

-- A plot is plot_cols x plot_rows cells (SPEC §10). The house takes the back two rows,
-- the gate is the front centre cell and must stay free.
create or replace function public.cell_blocked(p_x int, p_z int) returns boolean
  language plpgsql stable security definer set search_path = public as $$
declare
  v_cols int;
  v_rows int;
begin
  select plot_cols, plot_rows into v_cols, v_rows from settings where id = 1;
  if p_x < 0 or p_z < 0 or p_x >= v_cols or p_z >= v_rows then
    return true;
  end if;
  return p_z < 2 or (p_x = v_cols / 2 and p_z = v_rows - 1);
end $$;

-- place_item(item, x, z, rot): checks build switch, owned copies, bounds, house and gate, overlaps.
create or replace function public.place_item(p_item_id text, p_x int, p_z int, p_rot int)
  returns bigint
  language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_item items%rowtype;
  v_class text;
  v_build boolean;
  v_qty int;
  v_placed int;
  v_w int;
  v_d int;
  v_id bigint;
  v_x int;
  v_z int;
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
  if p_rot not between 0 and 3 then
    raise exception 'rot must be 0 to 3' using errcode = '22023';
  end if;

  select * into v_item from items where id = p_item_id and active and kind = 'deco';
  if not found then
    raise exception 'not a decoration' using errcode = '22023';
  end if;
  select coalesce(sum(inv.qty), 0) into v_qty from inventory inv
    where inv.player_id = v_uid and inv.item_id = p_item_id;
  select count(*) into v_placed from placements
    where player_id = v_uid and item_id = p_item_id;
  if v_qty - v_placed <= 0 then
    raise exception 'no free copy in the inventory' using errcode = '22023';
  end if;

  -- rotation by 90 degrees swaps width and depth
  v_w := case when p_rot % 2 = 1 then v_item.footprint[2] else v_item.footprint[1] end;
  v_d := case when p_rot % 2 = 1 then v_item.footprint[1] else v_item.footprint[2] end;

  for v_x in p_x .. p_x + v_w - 1 loop
    for v_z in p_z .. p_z + v_d - 1 loop
      if public.cell_blocked(v_x, v_z) then
        raise exception 'cell (%,%) is outside the free plot area', v_x, v_z using errcode = '22023';
      end if;
    end loop;
  end loop;

  -- overlap with the pupil's own decorations
  perform 1 from placements pl join items it on it.id = pl.item_id
    where pl.player_id = v_uid
      and p_x < pl.cell_x + (case when pl.rot % 2 = 1 then it.footprint[2] else it.footprint[1] end)
      and pl.cell_x < p_x + v_w
      and p_z < pl.cell_z + (case when pl.rot % 2 = 1 then it.footprint[1] else it.footprint[2] end)
      and pl.cell_z < p_z + v_d;
  if found then
    raise exception 'cells are already occupied' using errcode = '22023';
  end if;

  insert into placements (player_id, item_id, cell_x, cell_z, rot)
    values (v_uid, p_item_id, p_x, p_z, p_rot)
    returning id into v_id;
  return v_id;
end $$;

-- remove_placement(id): only the owner; the item goes back to the inventory (it is no longer placed).
create or replace function public.remove_placement(p_id bigint) returns void
  language plpgsql security definer set search_path = public as $$
begin
  delete from placements where id = p_id and player_id = auth.uid();
  if not found then
    raise exception 'placement not found' using errcode = 'P0002';
  end if;
end $$;

-- Only logged-in pupils may call these.
revoke execute on function public.save_avatar(jsonb) from public, anon;
revoke execute on function public.buy_item(text) from public, anon;
revoke execute on function public.place_item(text, int, int, int) from public, anon;
revoke execute on function public.remove_placement(bigint) from public, anon;
revoke execute on function public.cell_blocked(int, int) from public, anon, authenticated;
grant execute on function public.save_avatar(jsonb) to authenticated;
grant execute on function public.buy_item(text) to authenticated;
grant execute on function public.place_item(text, int, int, int) to authenticated;
grant execute on function public.remove_placement(bigint) to authenticated;
