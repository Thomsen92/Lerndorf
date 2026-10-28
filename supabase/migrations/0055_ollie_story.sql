-- 0055: server-owned, once-only Ollie story. Questions and progress are RPC-private.
create table public.ollie_story_questions (
 id text primary key, position int not null unique check(position between 1 and 6),
 narrative text not null, clip text not null, options jsonb not null,
 solution text not null, hint text not null, reply text not null, reply_clip text not null
);
create table public.ollie_story_progress (
 player_id uuid primary key references public.profiles(id) on delete cascade,
 step int not null default 0 check(step between 0 and 6), completed_at timestamptz,
 check ((step=6)=(completed_at is not null))
);
alter table public.ollie_story_questions enable row level security;
alter table public.ollie_story_progress enable row level security;
revoke all on public.ollie_story_questions,public.ollie_story_progress from public,anon,authenticated;
insert into public.ollie_story_questions(id,position,narrative,clip,options,solution,hint,reply,reply_clip) values
('backpack','1','I grew up in Australia. One day I packed my ... darn it! What do you call the bag you wear on your back?','ec3edecc6c62e872cde2bb2f','["backpack","suitcase","handbag"]','backpack','You carry it on your back, with two straps.','Ah yes, backpack! I''m getting old, mate. Anyway, I was on my way to New York. Absolutely terrified. Mostly of the airport coffee.','d96fb6be183a408304af90c9'),
('kangaroo','2','Before I left, a ... oh, what''s that Australian animal that hops on two big feet? It was watching me pack. Very judgemental.','5a89495b8d440d6c9e7bcd16','["koala","kangaroo","crocodile"]','kangaroo','It hops and carries its baby in a pouch.','A kangaroo! That''s the one. It had better legs than me, but no passport. So I went to the airport on my own.','9b2301f37677926fe67fbe17'),
('plane','3','I crossed the Pacific in a ... darn it, the thing with wings! Not a bird. It has seats and tiny bags of peanuts.','dfa57a8540c95585e7e6956f','["submarine","helicopter","plane"]','plane','It takes off from an airport and carries many passengers.','A plane, of course! Many hours later, New York appeared below us. So many lights! I thought somebody had left every oven on.','954083c6ba3427726e6b174c'),
('liberty','4','My first stop was the Statue of ... oh, what was her name? The big green lady holding a torch. Lovely hat. Terrible place to lose your keys.','4f64757a59a65942acd00775','["Liberty","Victory","Australia"]','Liberty','Her name is another English word for freedom.','Liberty! That''s it. I tried waving. She didn''t wave back. Fair enough, her arms must get tired.','699d6e794601880821397e72'),
('empire','5','Then I visited the ... State Building. Darn it! I remember the lifts, but not the name. That famous skyscraper in Manhattan.','268929246ec2a48108adeaf6','["Empire","Golden","United"]','Empire','Think of the Empire State Building.','Empire! Up I went. The view was brilliant. My knees were less enthusiastic. I bought you a little souvenir on the way down.','97f1154133ca61c74418cba7'),
('remember','6','I put the souvenir in my ... oh no, not again! That bag with two straps. What did we call it at the start?','f7b35a92a4f5f4ca1f67ed32','["pocket","backpack","wardrobe"]','backpack','It is the same word as the first gap.','Backpack! You''re a lifesaver, mate. Here''s your little New York souvenir. And fifty coins and eighty XP for putting up with my memory. Cheers!','4a4dab26919038a404b49a6b');
insert into public.items(id,kind,slot,name_de,price,footprint,starter,active,rarity,lootbox_weight,shop_visible,season,model,description)
values ('reward_ollie_nyc_postcard','deco',null,'Ollies New-York-Postkarte',0,'{3,3}',false,true,'common',0,false,null,'shop/ollie-nyc-postcard.glb','A little New York souvenir from Ollie’s rather forgetful road trip.');
-- Existing buy_item_before_wardrobe rejects shop_visible=false, including zero-price rewards.
create unique index coin_ledger_ollie_story_once on public.coin_ledger(player_id,ref)
 where reason='task' and ref='npc:ollie:ollie-australia-new-york';

create function public.my_ollie_story() returns jsonb
 language plpgsql security definer set search_path=public as $$
declare v_step int; v_completed boolean; v_coins int; v_question jsonb;
begin
 -- Serialize every entry point on the profile, then the player's story progress.
 select coins into v_coins from profiles where id=auth.uid() and role='student' for update;
 if not found then raise exception 'only pupils can play the story' using errcode='42501'; end if;
 insert into ollie_story_progress(player_id) values(auth.uid()) on conflict do nothing;
 select step,completed_at is not null into v_step,v_completed
  from ollie_story_progress where player_id=auth.uid() for update;
 -- Semantic source IDs stay private: many source IDs are also the solution word.
 select jsonb_build_object('id','gap-'||position,'position',position,'narrative',narrative,'clip',clip,'options',options)
  into v_question from ollie_story_questions where position=v_step+1;
 return jsonb_build_object('id','ollie-australia-new-york','completed',v_completed,
  'step',v_step,'total',6,'question',v_question,'coins',v_coins,
  'reward',jsonb_build_object('itemId','reward_ollie_nyc_postcard','coins',50,'xp',80));
end $$;

create function public.answer_ollie_story(p_question text,p_answer text) returns jsonb
 language plpgsql security definer set search_path=public as $$
declare v_state jsonb; v_q ollie_story_questions%rowtype; v_step int;
 v_correct boolean:=false; v_solved boolean:=false; v_hint text; v_feedback jsonb;
 v_awarded jsonb:=jsonb_build_object('coins',0,'xp',0,'itemId',null);
 v_progress jsonb; v_before int; v_ledger bigint; v_chest bigint;
begin
 -- my_ollie_story authenticates and locks profile -> progress in the same transaction.
 v_state:=public.my_ollie_story();
 v_step:=(v_state->>'step')::int;
 select * into v_q from ollie_story_questions where 'gap-'||position=p_question;
 if not found then raise exception 'question not current' using errcode='22023'; end if;
 if v_q.position<=v_step then
  v_correct:=true; v_solved:=true;
 elsif v_q.position<>v_step+1 then
  raise exception 'question not current' using errcode='22023';
 elsif p_answer is null or length(p_answer)>200 or
       lower(btrim(p_answer))<>lower(v_q.solution) then
  v_hint:=v_q.hint;
 else
  v_correct:=true;
  v_feedback:=jsonb_build_object('text',v_q.reply,'clip',v_q.reply_clip);
  update ollie_story_progress set step=v_q.position,
   completed_at=case when v_q.position=6 then now() else null end where player_id=auth.uid();
  if v_q.position=6 then
   select level into v_before from profiles where id=auth.uid();
   select coalesce(max(id),0) into v_ledger from xp_ledger where player_id=auth.uid();
   select coalesce(max(id),0) into v_chest from chests where player_id=auth.uid();
   insert into coin_ledger(player_id,delta,reason,ref,created_by)
    values(auth.uid(),50,'task','npc:ollie:ollie-australia-new-york',null);
   update profiles set coins=coins+50 where id=auth.uid();
   insert into inventory(player_id,item_id,qty) values(auth.uid(),'reward_ollie_nyc_postcard',1)
    on conflict(player_id,item_id) do update set qty=inventory.qty+1;
   perform public.grant_xp(auth.uid(),80,'quest','npc:ollie:ollie-australia-new-york');
   v_progress:=public.progress_result(auth.uid(),v_before,v_ledger,v_chest);
   v_awarded:=jsonb_build_object('coins',50,'xp',80,'itemId','reward_ollie_nyc_postcard');
  end if;
  v_state:=public.my_ollie_story();
 end if;
 return jsonb_build_object('correct',v_correct,'alreadySolved',v_solved,'hint',v_hint,
  'feedback',v_feedback,'state',v_state,'awarded',v_awarded,'progress',v_progress);
end $$;
revoke all on function public.my_ollie_story(), public.answer_ollie_story(text,text) from public,anon;
grant execute on function public.my_ollie_story(), public.answer_ollie_story(text,text) to authenticated;
