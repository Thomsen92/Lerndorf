-- Modular wardrobe: appearance writes preserve figure choice and unrelated legacy fields.
create table public.avatar_parts (
 item_id text primary key references public.items(id),
 character text not null check(character in ('boy','girl')),
 runtime_id text not null,
 slot text not null check(slot in ('headwear','hair','face','necklace','back','bag','wrist','bottoms')),
 conflicts text[] not null default '{}',
 unique(character,runtime_id)
);
alter table public.avatar_parts enable row level security;
create policy avatar_parts_read on public.avatar_parts for select to authenticated using(true);
revoke all on public.avatar_parts from anon,authenticated;
grant select on public.avatar_parts to authenticated;
alter table public.settings add column avatar_skin_palette text[] not null default array['#f2c9a5','#d9a477','#ba8055','#8a5738','#5c3826'];

-- BEGIN GENERATED CATALOG
insert into items(id,kind,slot,name_de,price,footprint,starter,active,shop_visible) values
('avatar_boy_feathered_helmet','avatar','headwear','Federkappe',120,'{1,1}',false,true,true),
('avatar_boy_gucci_sunglasses','avatar','face','Sonnenbrille',80,'{1,1}',false,true,true),
('avatar_boy_gold_chain','avatar','necklace','Goldkette',100,'{1,1}',false,true,true),
('avatar_boy_halberd','avatar','back','Hellebarde',180,'{1,1}',false,true,true),
('avatar_girl_cloud_beat','avatar','headwear','Stern-Kopfhörer',80,'{1,1}',false,true,true),
('avatar_girl_pixel_cat','avatar','headwear','Katzenohren',60,'{1,1}',false,true,true),
('avatar_girl_daisy_bucket','avatar','headwear','Blumenhut',70,'{1,1}',false,true,true),
('avatar_girl_heart_pop','avatar','face','Herzbrille',60,'{1,1}',false,true,true),
('avatar_girl_shooting_stars','avatar','hair','Stern-Haarclips',40,'{1,1}',false,true,true),
('avatar_girl_starpack','avatar','bag','Stern-Rucksack',100,'{1,1}',false,true,true),
('avatar_girl_crescent','avatar','bag','Umhängetasche',100,'{1,1}',false,true,true),
('avatar_girl_candy_orbit','avatar','wrist','Perlenarmband',30,'{1,1}',false,true,true),
('avatar_girl_bloom','avatar','necklace','Blumenkette',70,'{1,1}',false,true,true),
('avatar_girl_soft_bow','avatar','hair','Haarschleife',40,'{1,1}',false,true,true),
('avatar_girl_slim_jeans','avatar','bottoms','Jeans',120,'{1,1}',false,true,true),
('avatar_girl_pleated_skirt','avatar','bottoms','Faltenrock',120,'{1,1}',false,true,true);
insert into avatar_parts(item_id,character,runtime_id,slot,conflicts) values
('avatar_boy_feathered_helmet','boy','feathered-helmet','headwear',ARRAY[]::text[]),
('avatar_boy_gucci_sunglasses','boy','gucci-sunglasses','face',ARRAY[]::text[]),
('avatar_boy_gold_chain','boy','gold-chain','necklace',ARRAY[]::text[]),
('avatar_boy_halberd','boy','halberd','back',ARRAY[]::text[]),
('avatar_girl_cloud_beat','girl','cloud-beat','headwear',ARRAY['avatar_girl_shooting_stars','avatar_girl_soft_bow']::text[]),
('avatar_girl_pixel_cat','girl','pixel-cat','headwear',ARRAY['avatar_girl_shooting_stars','avatar_girl_soft_bow']::text[]),
('avatar_girl_daisy_bucket','girl','daisy-bucket','headwear',ARRAY['avatar_girl_shooting_stars','avatar_girl_soft_bow']::text[]),
('avatar_girl_heart_pop','girl','heart-pop','face',ARRAY[]::text[]),
('avatar_girl_shooting_stars','girl','shooting-stars','hair',ARRAY['avatar_girl_cloud_beat','avatar_girl_pixel_cat','avatar_girl_daisy_bucket']::text[]),
('avatar_girl_starpack','girl','starpack','bag',ARRAY[]::text[]),
('avatar_girl_crescent','girl','crescent','bag',ARRAY[]::text[]),
('avatar_girl_candy_orbit','girl','candy-orbit','wrist',ARRAY[]::text[]),
('avatar_girl_bloom','girl','bloom','necklace',ARRAY[]::text[]),
('avatar_girl_soft_bow','girl','soft-bow','hair',ARRAY['avatar_girl_cloud_beat','avatar_girl_pixel_cat','avatar_girl_daisy_bucket']::text[]),
('avatar_girl_slim_jeans','girl','slim-jeans','bottoms',ARRAY[]::text[]),
('avatar_girl_pleated_skirt','girl','pleated-skirt','bottoms',ARRAY[]::text[]);
-- END GENERATED CATALOG

-- Preserve old possessions but stop selling avatar placeholders without corresponding assets.
update items set shop_visible=false where kind='avatar' and id not in(select item_id from avatar_parts);

create function public.save_avatar_look(p_character text,p_look jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 u uuid:=auth.uid(); a jsonb; w jsonb; rev integer; item text; c record; part avatar_parts%rowtype;
 seen text[]:='{}'; slots text[]:='{}'; palette text[]; skin_palette text[];
begin
 select avatar into a from profiles where id=u and role='student' for update;
 if not found then raise exception 'only pupils can save looks' using errcode='42501'; end if;
 if p_character is null or p_character not in ('boy','girl') or a->>'character' is distinct from p_character then
  raise exception 'character changed' using errcode='22023'; end if;
 if p_look is null or jsonb_typeof(p_look)<>'object' or jsonb_typeof(p_look->'items') is distinct from 'array'
  or jsonb_typeof(p_look->'colors') is distinct from 'object' then raise exception 'invalid look' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(p_look) k where k not in ('items','colors')) or jsonb_array_length(p_look->'items')>8 then
  raise exception 'invalid look keys' using errcode='22023';end if;
 w:=coalesce(a->'wardrobe',jsonb_build_object('v',1,'revision',0,'boy',jsonb_build_object('items','[]'::jsonb,'colors','{}'::jsonb),'girl',jsonb_build_object('items','[]'::jsonb,'colors','{}'::jsonb)));
 rev:=coalesce((w->>'revision')::integer,0);
 if p_expected_revision is null or p_expected_revision<>rev then raise exception 'revision conflict' using errcode='40001';end if;
 for item in select jsonb_array_elements_text(p_look->'items') loop
  select * into part from avatar_parts where item_id=item and character=p_character;
  if not found then raise exception 'incompatible part' using errcode='22023';end if;
  if item=any(seen) or part.slot=any(slots) then raise exception 'duplicate slot' using errcode='22023';end if;
  if exists(select 1 from avatar_parts other where other.item_id=any(seen)
   and (other.item_id=any(part.conflicts) or item=any(other.conflicts))) then raise exception 'part conflict' using errcode='22023';end if;
  if not exists(select 1 from items i where i.id=item and i.active and i.kind='avatar'
   and (i.starter or exists(select 1 from inventory inv where inv.player_id=u and inv.item_id=item and inv.qty>0))) then
   raise exception 'part not owned' using errcode='42501';end if;
  seen:=array_append(seen,item);slots:=array_append(slots,part.slot);
 end loop;
 select avatar_palette,avatar_skin_palette into palette,skin_palette from settings where id=1;
 for c in select key,value from jsonb_each(p_look->'colors') loop
  if c.key not in ('hair','skin','shoes','bottoms','top') or (p_character='boy' and c.key='top')
   or jsonb_typeof(c.value)<>'string' or not ((c.value#>>'{}')=any(case when c.key='skin' then skin_palette else palette end)) then
   raise exception 'invalid colour' using errcode='22023';end if;
 end loop;
 w:=jsonb_set(w,array[p_character],p_look)||jsonb_build_object('v',1,'revision',rev+1);
 a:=jsonb_set(a,'{wardrobe}',w);update profiles set avatar=a where id=u;
 return jsonb_build_object('character',p_character,'wardrobe',w);
end $$;
revoke all on function public.save_avatar_look(text,jsonb,integer) from public,anon;
grant execute on function public.save_avatar_look(text,jsonb,integer) to authenticated;

alter function public.save_avatar(jsonb) rename to save_avatar_before_wardrobe;
revoke all on function public.save_avatar_before_wardrobe(jsonb) from public,anon,authenticated;
create function public.save_avatar(recipe jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a jsonb; result jsonb;
begin
 select avatar into a from profiles where id=auth.uid() and role='student' for update;
 if not found then raise exception 'only pupils can save avatar' using errcode='42501';end if;
 if jsonb_typeof(recipe) is distinct from 'object' or exists(select 1 from jsonb_object_keys(recipe) k
  where k not in ('v','skin','eyes','hairColor','topColor','hair','top','pants','hat','acc','pet')) then
  raise exception 'invalid legacy key' using errcode='22023';end if;
 result:=public.save_avatar_before_wardrobe(recipe);
 if a ? 'character' then result:=result||jsonb_build_object('character',a->'character');end if;
 if a ? 'wardrobe' then result:=result||jsonb_build_object('wardrobe',a->'wardrobe');end if;
 update profiles set avatar=result where id=auth.uid();return result;
end $$;
revoke all on function public.save_avatar(jsonb) from public,anon;
grant execute on function public.save_avatar(jsonb) to authenticated;

-- Lock before checking possession; the second concurrent purchase sees the committed inventory.
alter function public.buy_item(text) rename to buy_item_before_wardrobe;
revoke all on function public.buy_item_before_wardrobe(text) from public,anon,authenticated;
create function public.buy_item(p_item_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 perform 1 from profiles where id=auth.uid() and role='student' for update;
 if not found then raise exception 'only pupils can buy' using errcode='42501';end if;
 if exists(select 1 from items where id=p_item_id and kind='avatar') and
  exists(select 1 from inventory where player_id=auth.uid() and item_id=p_item_id and qty>0) then
  raise exception 'already owned' using errcode='22023';end if;
 return public.buy_item_before_wardrobe(p_item_id);
end $$;
revoke all on function public.buy_item(text) from public,anon;
grant execute on function public.buy_item(text) to authenticated;
