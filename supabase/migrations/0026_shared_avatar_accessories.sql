-- Accessories are shared; source character still identifies asset origin.
-- Preserve ownership, duplicate/conflict, palette, revision and separate-look validation.
create or replace function public.save_avatar_look(p_character text,p_look jsonb,p_expected_revision integer)
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
  select * into part from avatar_parts where item_id=item and (character=p_character or slot<>'bottoms');
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
