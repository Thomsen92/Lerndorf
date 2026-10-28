-- 0056: extend Ollie's private New York story without reopening completed rewards.
alter table public.ollie_story_questions drop constraint ollie_story_questions_position_check;
alter table public.ollie_story_questions add constraint ollie_story_questions_position_check check(position between 1 and 9);
alter table public.ollie_story_progress drop constraint ollie_story_progress_step_check;
alter table public.ollie_story_progress drop constraint ollie_story_progress_check;
-- Completion time and the existing coin/XP/item grants are deliberately preserved.
update public.ollie_story_progress set step=9 where completed_at is not null;
alter table public.ollie_story_progress add constraint ollie_story_progress_step_check check(step between 0 and 9);
alter table public.ollie_story_progress add constraint ollie_story_progress_check check((step=9)=(completed_at is not null));
update public.ollie_story_questions set position=9 where id='remember';
insert into public.ollie_story_questions(id,position,narrative,clip,options,solution,hint,reply,reply_clip) values
('central-park','6','Next I wandered into Central ... darn it! The big green place in Manhattan, with trees and lakes. Lovely spot for a rest.','b6cc7721d0e0f69a19e74a38','["Station", "Park", "Palace"]','Park','A green place where people walk, play and enjoy nature.','Park! Central Park. I tried jogging for twelve seconds. Even the squirrels looked disappointed.','93089d3cdbe10c5cb24500f5'),
('brooklyn-bridge','7','Then I walked across the Brooklyn ... oh, what do you call the thing over the East River? It connects Manhattan and Brooklyn.','852800860b312ce58d23577a','["Tunnel", "Tower", "Bridge"]','Bridge','You can walk across it above the water.','Bridge! Brooklyn Bridge. I took forty photos. Thirty-nine were of my thumb. The other one was rather good.','5290c905815c4f5811d541e2'),
('times-square','8','After that, I found Times ... darn it! That busy city space with all the bright lights and enormous screens. What a place!','c3e3b70189863f08ae246843','["Square", "Street", "Garden"]','Square','A city space surrounded by buildings. Its name is also a shape with four equal sides.','Square! Times Square. I nearly bought sunglasses at night. Then I checked that your souvenir was still in my bag.','03dcedc59d5349417299e6e0');
-- Retain the item identity so existing ownership and placements keep working.
update public.items set name_de='Ollies Empire State Building', model='shop/ollie-empire-state.glb',
 description='A miniature Empire State Building from Ollie’s rather forgetful New York road trip.'
 where id='reward_ollie_nyc_postcard';

create or replace function public.my_ollie_story() returns jsonb
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
  'step',v_step,'total',9,'question',v_question,'coins',v_coins,
  'reward',jsonb_build_object('itemId','reward_ollie_nyc_postcard','coins',50,'xp',80));
end $$;

create or replace function public.answer_ollie_story(p_question text,p_answer text) returns jsonb
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
   completed_at=case when v_q.position=9 then now() else null end where player_id=auth.uid();
  if v_q.position=9 then
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
