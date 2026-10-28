-- Spelling Bee mini game at the beehive on the market (teacher, 28.10.2026).
-- One puzzle per day (seven letters, the centre letter in every word), a round lasts 3 minutes.
-- The first 3 rounds of a day (Europe/Berlin) pay 4-10 coins and 10-30 XP by score; every later
-- round only counts for the weekly high score list of both classes. A pupil's very first round is a
-- practice round: 5 minutes, two help words shown, paid as a bonus that uses none of the 3 rounds.
-- Every day one golden word counts double. High score lists: week, all time, most points this week. Words are checked here, never
-- trusted from the client; the client only gets salted hashes to give instant feedback.

create table public.spelling_puzzles (
  id int primary key check (id > 0),
  theme text not null,
  center text not null check (center ~ '^[a-z]$'),
  letters text not null check (letters ~ '^[a-z]{6}$'),
  words text[] not null check (cardinality(words) >= 10),
  max_points int not null check (max_points > 0)
);

create table public.spelling_rounds (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_id int not null references public.spelling_puzzles(id),
  day date not null,
  week date not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  finished_at timestamptz,
  words text[] not null default '{}',
  score int not null default 0 check (score >= 0),
  rewarded boolean not null default false,
  coins int not null default 0 check (coins >= 0),
  xp int not null default 0 check (xp >= 0),
  tutorial boolean not null default false
);
create index spelling_rounds_player_day on public.spelling_rounds (player_id, day);
create index spelling_rounds_week_score on public.spelling_rounds (week, score desc) where finished_at is not null;

alter table public.spelling_puzzles enable row level security;
alter table public.spelling_rounds enable row level security;
revoke all on public.spelling_puzzles from public, anon, authenticated;
revoke all on public.spelling_rounds from public, anon, authenticated;

-- The fixed rules: never a value from the client.
create or replace function public.spelling_round_seconds() returns int language sql immutable as $$ select 180 $$;
create or replace function public.spelling_free_rounds() returns int language sql immutable as $$ select 3 $$;
create or replace function public.spelling_tutorial_seconds() returns int language sql immutable as $$ select 300 $$;
-- Day 1 of the puzzle cycle (a Monday); afterwards one puzzle per day, then it starts over.
create or replace function public.spelling_epoch() returns date language sql immutable as $$ select date '2026-10-26' $$;

create or replace function public.spelling_word_points(p_word text, p_center text, p_letters text)
returns int language sql immutable as $$
  select case when length(p_word) = 4 then 1 else length(p_word) end
    + case when (select bool_and(strpos(p_word, l) > 0)
                 from unnest(string_to_array(p_center || p_letters, null)) l) then 7 else 0 end
$$;

-- Coins and XP of a rewarded round by its score (0 points: nothing).
create or replace function public.spelling_reward(p_score int) returns jsonb
language sql immutable as $$
  select case
    when p_score <= 0 then jsonb_build_object('coins', 0, 'xp', 0)
    when p_score < 10 then jsonb_build_object('coins', 4, 'xp', 10)
    when p_score < 25 then jsonb_build_object('coins', 6, 'xp', 16)
    when p_score < 40 then jsonb_build_object('coins', 8, 'xp', 24)
    else jsonb_build_object('coins', 10, 'xp', 30)
  end
$$;

create or replace function public.spelling_puzzle_for(p_day date) returns int
language sql stable security definer set search_path = public as $$
  select ((p_day - spelling_epoch()) % (select count(*) from spelling_puzzles)::int
          + (select count(*) from spelling_puzzles)::int)
         % (select count(*) from spelling_puzzles)::int + 1
$$;

-- Salted hash of a word: the client can tell right from wrong without seeing the word list.
create or replace function public.spelling_hash(p_puzzle int, p_word text) returns text
language sql immutable as $$
  select left(encode(sha256(convert_to('lerndorf-spelling:' || p_puzzle || ':' || p_word, 'UTF8')), 'hex'), 16)
$$;

-- The high score lists of all classes, best first (ties: who got there first):
--   'week'  best round of the week, 'all' best round ever, 'total' sum of all rounds of the week.
create or replace function public.spelling_board(p_kind text, p_week date) returns table (
  player_id uuid, nickname text, class_id text, score int, rank bigint
) language sql stable security definer set search_path = public as $$
  with done as (
    select r.player_id, r.score, r.finished_at, r.week
    from spelling_rounds r
    where r.finished_at is not null and r.score > 0 and (p_kind = 'all' or r.week = p_week)
  ), best as (
    (select distinct on (d.player_id) d.player_id, d.score, d.finished_at
     from done d where p_kind in ('week', 'all')
     order by d.player_id, d.score desc, d.finished_at)
    union all
    select d.player_id, sum(d.score)::int, max(d.finished_at)
    from done d where p_kind = 'total'
    group by d.player_id
  )
  select b.player_id, p.nickname, p.class_id, b.score,
         rank() over (order by b.score desc, b.finished_at)
  from best b join profiles p on p.id = b.player_id and p.role = 'student'
$$;

create or replace function public.spelling_board_list(p_uid uuid, p_kind text, p_week date) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('nickname', nickname, 'class', class_id,
                                                         'score', score, 'rank', rank, 'me', player_id = p_uid)
                                       order by rank)
                     from spelling_board(p_kind, p_week) where rank <= 10), '[]'::jsonb),
    'me', (select jsonb_build_object('score', score, 'rank', rank)
           from spelling_board(p_kind, p_week) where player_id = p_uid)
  )
$$;

-- The week list on top level (top/me), the other two lists as 'all' and 'total'.
create or replace function public.spelling_board_json(p_uid uuid, p_week date) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('week', p_week)
    || spelling_board_list(p_uid, 'week', p_week)
    || jsonb_build_object('all', spelling_board_list(p_uid, 'all', p_week),
                          'total', spelling_board_list(p_uid, 'total', p_week))
$$;

create or replace function public.spelling_rewarded_left(p_uid uuid, p_day date) returns int
language sql stable security definer set search_path = public as $$
  select greatest(0, spelling_free_rounds()
    - (select count(*) from spelling_rounds
       where player_id = p_uid and day = p_day and rewarded and not tutorial)::int)
$$;

-- The practice round comes until the pupil has finished a first round.
create or replace function public.spelling_tutorial_due(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from spelling_rounds where player_id = p_uid and finished_at is not null)
$$;

-- The two help words of the practice round: the shortest words of the puzzle.
create or replace function public.spelling_tutorial_hints(p_puzzle int) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(w order by length(w), w), '{}')
  from (select w from spelling_puzzles p, unnest(p.words) w where p.id = p_puzzle
        order by length(w), w limit 2) s
$$;

-- The golden word of a day: one longer word (5+ letters, never a practice help word) counts double.
create or replace function public.spelling_golden(p_puzzle int, p_day date) returns text
language sql stable security definer set search_path = public as $$
  with pool as (
    select w, row_number() over (order by w) - 1 as i, count(*) over () as n
    from spelling_puzzles p, unnest(p.words) w
    where p.id = p_puzzle and length(w) >= 5 and w <> all (spelling_tutorial_hints(p_puzzle))
  )
  select w from pool where i = abs(hashtext('golden:' || p_day || ':' || p_puzzle)) % n
$$;

-- The pupil's view: today's letters, hashes of the words, free rounds left and the high score list.
create or replace function public.spelling_state() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := quest_today();
  v_p spelling_puzzles%rowtype;
begin
  if v_uid is null or not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play' using errcode = '42501';
  end if;
  select * into v_p from spelling_puzzles where id = spelling_puzzle_for(v_day);
  return jsonb_build_object(
    'day', v_day,
    'puzzle', jsonb_build_object(
      'id', v_p.id, 'center', v_p.center, 'letters', to_jsonb(string_to_array(v_p.letters, null)),
      'word_count', cardinality(v_p.words), 'max_points', v_p.max_points,
      'hashes', (select jsonb_agg(spelling_hash(v_p.id, w) order by spelling_hash(v_p.id, w)) from unnest(v_p.words) w),
      -- which hash is golden, not which word
      'golden', spelling_hash(v_p.id, spelling_golden(v_p.id, v_day))),
    'round_seconds', spelling_round_seconds(),
    'free_rounds', spelling_free_rounds(),
    'rewarded_left', spelling_rewarded_left(v_uid, v_day),
    'tutorial', spelling_tutorial_due(v_uid),
    'board', spelling_board_json(v_uid, date_trunc('week', v_day)::date)
  );
end $$;

-- Starts a round of today's puzzle. A round started while free rounds are left is a rewarded one,
-- even if it is never finished: a pupil cannot keep only the good rounds.
create or replace function public.spelling_start() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_day date := quest_today();
  v_rewarded boolean;
  v_tutorial boolean;
  v_seconds int;
  v_round spelling_rounds%rowtype;
begin
  if v_uid is null or not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play' using errcode = '42501';
  end if;
  perform 1 from profiles where id = v_uid for update;
  v_tutorial := spelling_tutorial_due(v_uid);
  v_rewarded := v_tutorial or spelling_rewarded_left(v_uid, v_day) > 0;
  v_seconds := case when v_tutorial then spelling_tutorial_seconds() else spelling_round_seconds() end;
  insert into spelling_rounds (player_id, puzzle_id, day, week, ends_at, rewarded, tutorial)
    values (v_uid, spelling_puzzle_for(v_day), v_day, date_trunc('week', v_day)::date,
            now() + make_interval(secs => v_seconds), v_rewarded, v_tutorial)
    returning * into v_round;
  -- the help words are shown on purpose, only in the practice round
  return jsonb_build_object('round', v_round.id, 'puzzle', v_round.puzzle_id, 'ends_at', v_round.ends_at,
                            'seconds', v_seconds, 'rewarded', v_rewarded,
                            'rewarded_left', spelling_rewarded_left(v_uid, v_day),
                            'tutorial', v_tutorial,
                            'hints', case when v_tutorial
                              then to_jsonb(spelling_tutorial_hints(v_round.puzzle_id)) else '[]'::jsonb end);
end $$;

-- Ends a round: only words of the puzzle count (each once), the score is computed here. A round
-- that arrives more than 30 s after its end is closed with 0 points. Rewarded rounds book coins and
-- XP exactly once (unique ledger refs 'spelling:<round>').
create or replace function public.spelling_finish(p_round bigint, p_words text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r spelling_rounds%rowtype;
  v_p spelling_puzzles%rowtype;
  v_words text[];
  v_score int := 0;
  v_reward jsonb;
  v_coins int := 0; v_xp int := 0; v_total int;
  v_before int; v_ledger bigint; v_chest bigint;
begin
  if v_uid is null or not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play' using errcode = '42501';
  end if;
  select level into v_before from profiles where id = v_uid for update;
  select coalesce(max(id), 0) into v_ledger from xp_ledger where player_id = v_uid;
  select coalesce(max(id), 0) into v_chest from chests where player_id = v_uid;
  select * into v_r from spelling_rounds where id = p_round and player_id = v_uid for update;
  if not found then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if v_r.finished_at is not null then
    raise exception 'round already finished' using errcode = '22023';
  end if;
  select * into v_p from spelling_puzzles where id = v_r.puzzle_id;
  if now() <= v_r.ends_at + interval '30 seconds' then
    select coalesce(array_agg(w order by w), '{}') into v_words
    from (select distinct lower(trim(x)) w from unnest(coalesce(p_words, '{}')) x) s
    where w = any (v_p.words);
    select coalesce(sum(spelling_word_points(w, v_p.center, v_p.letters)
                        * case when w = spelling_golden(v_p.id, v_r.day) then 2 else 1 end), 0)
      into v_score from unnest(v_words) w;
  else
    v_words := '{}';
  end if;
  -- the practice bonus is paid once, even if a pupil had two practice rounds open at the same time
  if v_r.tutorial and exists (select 1 from spelling_rounds
                              where player_id = v_uid and tutorial and finished_at is not null) then
    v_r.rewarded := false;
  end if;
  if v_r.rewarded and v_score > 0 then
    v_reward := spelling_reward(v_score);
    v_coins := (v_reward ->> 'coins')::int;
    v_xp := (v_reward ->> 'xp')::int;
    insert into coin_ledger (player_id, delta, reason, ref, created_by)
      values (v_uid, v_coins, 'quest', 'spelling:' || v_r.id, null);
    update profiles set coins = coins + v_coins where id = v_uid;
    perform grant_xp(v_uid, v_xp, 'quest', 'spelling:' || v_r.id);
  end if;
  update spelling_rounds set finished_at = now(), words = v_words, score = v_score, coins = v_coins, xp = v_xp,
    rewarded = v_r.rewarded
    where id = v_r.id;
  select coins into v_total from profiles where id = v_uid;
  return jsonb_build_object(
    'score', v_score, 'words', to_jsonb(v_words), 'max_points', v_p.max_points,
    'rewarded', v_r.rewarded, 'coins_gained', v_coins, 'xp_gained', v_xp, 'coins', v_total,
    'rewarded_left', spelling_rewarded_left(v_uid, v_r.day),
    'board', spelling_board_json(v_uid, v_r.week),
    'progress', progress_result(v_uid, v_before, v_ledger, v_chest)
  );
end $$;

revoke execute on function public.spelling_word_points(text, text, text), public.spelling_reward(int),
  public.spelling_puzzle_for(date), public.spelling_hash(int, text), public.spelling_board(text, date),
  public.spelling_board_list(uuid, text, date), public.spelling_board_json(uuid, date),
  public.spelling_golden(int, date), public.spelling_rewarded_left(uuid, date),
  public.spelling_tutorial_due(uuid), public.spelling_tutorial_hints(int)
  from public, anon, authenticated;
revoke execute on function public.spelling_state(), public.spelling_start(), public.spelling_finish(bigint, text[])
  from public, anon;
grant execute on function public.spelling_state(), public.spelling_start(), public.spelling_finish(bigint, text[])
  to authenticated;

-- BEGIN spelling puzzles (generated by web/scripts/spelling/make-puzzles.py)
insert into public.spelling_puzzles (id, theme, center, letters, words, max_points) values
  (1, 'parking', 'n', 'agikpr', array['again','aging','airing','akin','gain','gaining','gang','grain','grin','inning','pagan','pain','parking','pink','prank','raging','rain','rang','ranging','rank','ring','ringing','ripping'], 95),
  (2, 'vacation', 't', 'acinov', array['action','activation','attain','aviation','cannot','cant','citation','coat','contact','contain','convict','conviction','cotton','initiation','innovation','intact','into','invitation','nation','notion','onto','tactic','tattoo','vacant','vacation','vaccination'], 191),
  (3, 'american', 'n', 'aceimr', array['acne','american','anime','arena','cancer','cane','cinema','crane','earn','inner','main','manner','marina','marine','mean','menace','mine','miner','name','near','niece','nine','rain','remain'], 97),
  (4, 'central', 'n', 'acelrt', array['accent','acne','alternate','antenna','arena','canal','cancel','cancer','cane','cant','cent','center','central','clan','clean','cleaner','clearance','crane','earn','eaten','enter','entrance','eternal','lane','lantern','lean','learn','learnt','near','neat','rant','recent','rent','rental','talent','tanner','teen','tenant','tent'], 177),
  (5, 'chocolate', 'c', 'aehlot', array['attach','cache','call','catch','cattle','cell','chat','cheat','chocolate','cloth','coach','coal','coat','cocoa','collect','cool','each','echo','elect','hatch','lace','local','locate','teach'], 100),
  (6, 'carnival', 'a', 'cilnrv', array['arrival','avail','call','canal','caravan','carnival','circa','civilian','clan','clinical','lava','liar','nail','naval','racial','rail','rain','rival','vain','vanilla','villa','villain','viral'], 108),
  (7, 'musical', 'a', 'cilmsu', array['alas','calcium','calculus','call','calm','casual','caucus','claim','class','classic','classical','mail','mall','musical','sail','scam','slam','small','usual'], 85),
  (8, 'candles', 'c', 'adelns', array['access','acne','call','canal','cancel','candle','candles','cane','canned','cease','cell','clad','clan','class','classes','clean','dance','decade','deceased','descend','essence','lace','scale','scaled','scales','scan','scandal','scene'], 135),
  (9, 'playing', 'a', 'gilnpy', array['again','aging','align','apply','gain','gaining','gala','gang','laying','nail','pagan','pain','papa','paying','plain','plan','play','playing'], 71),
  (10, 'departure', 'p', 'adertu', array['adapt','adapter','apart','appear','deep','depart','departed','departure','papa','paper','para','parade','peer','pepper','prep','prepare','prepared','puppet','pure','rapper','reap','repeat','repeated','trap','trapped','update','upper'], 137),
  (11, 'surfing', 'g', 'finrsu', array['firing','fungus','griffin','grin','guru','inning','issuing','nursing','ring','ringing','rising','running','sign','sing','singing','suing','surfing','urging'], 96),
  (12, 'skating', 'a', 'giknst', array['again','against','aging','akin','assign','assist','assistant','attain','gain','gaining','gains','gang','giant','instant','saga','saint','sang','sank','skating','staging','stain','taking','tank','task','tasting'], 120),
  (13, 'kitchen', 'i', 'cehknt', array['chic','chick','chicken','cite','ethic','ethnic','hike','hint','inch','intent','kick','kitchen','kite','kitten','knit','niche','niece','nine','nineteen','nineteenth','ninth','thick','thin','tick','ticket'], 104),
  (14, 'parents', 'n', 'aeprst', array['antenna','apparent','arena','earn','earnest','eaten','enter','near','nearest','neat','nest','pants','parent','parents','partner','patent','pattern','peasant','present','presenter','rant','rent','represent','sane','seen','senate','sense','sent','snap','snaps','span','spent','tanner','teen','teens','tenant','tense','tent','transparent'], 195),
  (15, 'monster', 'm', 'enorst', array['esteem','meet','memo','mentor','mere','mess','meteor','meter','moment','monster','moon','moose','more','moss','most','motor','motto','remote','resentment','room','seem','semester','sermon','some','someone','stem','storm','term'], 113),
  (16, 'country', 'o', 'cnrtuy', array['coconut','corn','cotton','count','country','county','court','noon','noun','occur','onto','torn','tour','trout','turnout','tutor','unto','your'], 73),
  (17, 'camping', 'a', 'cgimnp', array['again','aging','aiming','camp','campaign','camping','gain','gaining','gaming','gamma','gang','magic','magician','main','manga','manning','naming','pagan','pain','panic','papa'], 110),
  (18, 'interview', 'n', 'eirtvw', array['enter','entire','even','event','inner','intent','inter','intern','intervene','interview','interviewer','invent','invite','nerve','never','nine','nineteen','renew','rent','teen','tent','twin','vein','vent','vine','went','winner','winter','written'], 145),
  (19, 'panther', 'h', 'aenprt', array['earth','happen','hare','harper','hart','hate','hath','heap','hear','heart','heat','heater','heath','here','panther','path','rather','teeth','tenth','than','that','theater','thee','then','there','threat','threaten','three'], 107),
  (20, 'designer', 's', 'deginr', array['dense','design','designed','designer','designing','desire','desired','dress','dressed','dressing','genesis','inside','insider','iris','needs','reside','resign','resigned','resin','rise','risen','rising','seed','seeded','seeing','seen','send','sending','sense','series','side','sided','sides','siege','sign','sing','singer','singing'], 217),
  (21, 'project', 'o', 'cejprt', array['cooper','cope','copper','core','corp','correct','crop','error','poet','poor','pope','port','porter','porto','potter','project','prop','proper','protect','protector','receptor','report','reporter','rope','tore','troop'], 115),
  (22, 'glacier', 'l', 'acegir', array['aerial','algae','allergic','call','caller','cell','cellar','cereal','circle','clear','clearer','eagle','gala','garlic','girl','glacier','grill','illegal','lace','large','legal','liar','racial','rail','recall','reel'], 129),
  (23, 'uniform', 'o', 'fimnru', array['form','forum','four','from','inform','iron','minor','mirror','moon','noon','noun','onion','roof','room','rumor','runoff','uniform','union'], 66),
  (24, 'thunder', 'n', 'dehrtu', array['dent','ended','endure','enter','hundred','hunt','need','render','rent','rented','return','returned','runner','teen','tend','tender','tent','tenth','tenure','then','thunder','trend','tune','tuned','turn','turned','turner','under'], 123),
  (25, 'witches', 't', 'cehisw', array['chest','cite','ethic','ethics','sect','sheet','site','stitch','sweet','sweetie','switch','teeth','test','thee','these','thesis','this','tweet','twice','twist','twitch','west','white','whites','witch','witches','with'], 120),
  (26, 'alligator', 'l', 'agiort', array['alligator','altar','gala','girl','goal','gorilla','grill','liar','logo','oral','rail','roll','tail','tailor','tall','till','tilt','toll','tool','total','trail','trial','troll'], 73),
  (27, 'ghostly', 'o', 'ghlsty', array['ghost','ghostly','gosh','holy','host','logo','logos','loss','lost','lots','shoot','shot','slot','solo','stool','toll','tool','tooth','toss'], 52),
  (28, 'fireman', 'a', 'efimnr', array['affair','anime','area','arena','earn','fair','fame','famine','fare','farm','farmer','fear','fireman','frame','freeman','main','manner','mare','marina','marine','mean','name','near','rain','rare','rear','refrain','remain'], 100),
  (29, 'builder', 'd', 'beilru', array['billed','bird','bleed','bred','breed','build','builder','buried','deed','deer','dell','dire','dried','drill','dude','duel','dull','edible','elder','idle','lied','rebuild','reed','ride','rider','rubbed','rude'], 101),
  (30, 'painter', 'p', 'aeinrt', array['apart','apparent','appear','appetite','interpret','interpreter','pain','paint','painter','pair','papa','paper','para','parent','partner','patent','patient','pattern','peer','pepper','pier','pine','pint','pipe','pirate','prairie','prep','prepare','print','printer','rapper','reap','repair','repeat','ripe','trap','trip'], 174),
  (31, 'yoghurt', 'u', 'ghorty', array['guru','hour','hurry','hurt','ought','rough','thorough','though','thought','through','throughout','tough','tour','trout','truth','tutor','yoghurt','your','youth'], 97),
  (32, 'skyline', 'e', 'iklnsy', array['else','illness','isle','keen','knee','lens','less','like','likely','line','linen','nine','seek','seen','sell','sense','skies','skyline','yell'], 55),
  (33, 'mountain', 'o', 'aimntu', array['amino','amount','animation','atom','auto','initiation','into','intuition','moon','motion','motto','mount','mountain','mutation','nation','nomination','noon','notion','noun','onion','onto','tattoo','tomato','tuition','union','unto'], 144),
  (34, 'costume', 'm', 'ceostu', array['come','comes','comet','commute','cosmos','costume','custom','customs','esteem','meet','memo','mess','moose','moss','most','motto','mouse','museum','must','mute','outcome','scum','seem','some','stem','utmost'], 102),
  (35, 'bowling', 'n', 'bgilow', array['billing','billion','bing','bingo','blowing','blown','boiling','bong','bowling','glowing','going','gown','inning','ling','lining','lion','logging','long','longing','noon','ongoing','onion','owing','willing','wing','winning'], 136),
  (36, 'drawing', 'd', 'aginrw', array['award','dang','daring','darn','digging','ding','dining','drag','dragging','drain','draw','drawing','drawn','grad','grand','grid','grind','grinding','radar','raid','riding','rigid','ward','winding'], 106),
  (37, 'plumber', 'e', 'blmpru', array['bell','belle','blue','bubble','bumper','emblem','lumber','lure','member','mere','peel','peer','pepper','plumber','prep','pure','purple','rebel','reel','remember','rubber','rule','ruler','upper'], 100),
  (38, 'exciting', 'e', 'cgintx', array['cent','cite','engine','exciting','exit','extent','extinct','genetic','getting','intent','next','niece','nine','nineteen','teen','tent','text'], 75),
  (39, 'vampire', 'e', 'aimprv', array['appear','area','arrive','ever','mare','mere','paper','peer','pepper','pier','pipe','prairie','premier','premiere','prep','prepare','prime','primer','rapper','rare','rave','reap','rear','repair','revive','ripe','river','vampire'], 113),
  (40, 'holiday', 'l', 'adhioy', array['alloy','daily','dial','doll','dolly','hail','hall','halo','hill','hold','holiday','holy','idol','lady','laid','lily','load','loyal','oddly'], 52);
-- END spelling puzzles
