-- Balance future rewards and purchases only; preserve balances, ownership and paid chests.
alter table public.classes alter column stamp_reward set default 50;
update public.classes set stamp_reward=50 where stamp_reward=100;
update public.items set price=600 where id='house_landhaus';
update public.items set price=1000 where id='house_villa';
update public.items set price=350 where id='car_kleinwagen';
update public.items set price=600 where id='car_camper';
update public.items set shop_visible=false where id='acc_04';

create or replace function public.open_chest(p_id bigint) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=progress_pupil(); c chests%rowtype; v_level int; v_balance int; v_roll double precision; v_factor int;
begin
 select level,coins into v_level,v_balance from profiles where id=v_uid for update;
 select * into c from chests where id=p_id and player_id=v_uid for update;
 if not found then raise exception 'chest not found' using errcode='P0002'; end if;
 if c.opened_at is null then
  if c.source='level' then v_level:=c.ref::int; end if;
  v_roll:=random();
  if v_roll<0.70 then c.roll:='normal'; v_factor:=1;
  elsif v_roll<0.95 then c.roll:='double'; v_factor:=2;
  else c.roll:='triple'; v_factor:=3; end if;
  c.coins:=(10+3*v_level)*(case when c.size='big' then 3 else 1 end)*v_factor;
  insert into coin_ledger(player_id,delta,reason,ref,created_by) values(v_uid,c.coins,'chest',c.id::text,null);
  update profiles set coins=coins+c.coins where id=v_uid returning coins into v_balance;
  update chests set opened_at=now(),roll=c.roll,coins=c.coins where id=c.id;
 end if;
 return jsonb_build_object('coins_won',c.coins,'roll',c.roll,'coins',v_balance);
end $$;
