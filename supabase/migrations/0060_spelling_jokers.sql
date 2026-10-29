-- 0060: Spelling Bee made easier (teacher, 29.10.2026). Additive only, no existing row is changed.
--  * 3 jokers per round: a joker shows the length and the first two letters of a word the pupil has
--    not found yet. The words stay on the server; the round remembers which words were hinted.
--  * Words of three letters score like words of four (1 point). They only appear once puzzles with
--    three-letter words exist (a later content migration); until then nothing changes for pupils.

alter table public.spelling_rounds
  add column hinted text[] not null default '{}' check (cardinality(hinted) <= 3);

create or replace function public.spelling_joker_count() returns int language sql immutable as $$ select 3 $$;

-- 3 and 4 letters = 1 point, longer = 1 point per letter, a pangram +7 (was: only 4 letters = 1 point)
create or replace function public.spelling_word_points(p_word text, p_center text, p_letters text)
returns int language sql immutable as $$
  select case when length(p_word) <= 4 then 1 else length(p_word) end
    + case when (select bool_and(strpos(p_word, l) > 0)
                 from unnest(string_to_array(p_center || p_letters, null)) l) then 7 else 0 end
$$;

-- A joker: a word of the puzzle that is neither found nor hinted yet. A hint that finds no such word
-- costs nothing. Only the pupil's own open round counts.
create or replace function public.spelling_hint(p_round bigint, p_found text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r spelling_rounds%rowtype;
  v_p spelling_puzzles%rowtype;
  v_word text;
begin
  if v_uid is null or not exists (select 1 from profiles where id = v_uid and role = 'student') then
    raise exception 'only pupils can play' using errcode = '42501';
  end if;
  select * into v_r from spelling_rounds where id = p_round and player_id = v_uid for update;
  if not found then
    raise exception 'round not found' using errcode = 'P0002';
  end if;
  if v_r.finished_at is not null or now() > v_r.ends_at then
    raise exception 'round is over' using errcode = '22023';
  end if;
  if cardinality(v_r.hinted) >= spelling_joker_count() then
    raise exception 'no jokers left' using errcode = 'P0001';
  end if;
  select * into v_p from spelling_puzzles where id = v_r.puzzle_id;
  select w into v_word
  from unnest(v_p.words) w
  where w <> all (coalesce((select array_agg(lower(trim(x))) from unnest(coalesce(p_found, '{}')) x), '{}'))
    and w <> all (v_r.hinted)
  order by hashtext('hint:' || p_round || ':' || w)
  limit 1;
  if v_word is null then
    return jsonb_build_object('none', true, 'jokers_left', spelling_joker_count() - cardinality(v_r.hinted));
  end if;
  update spelling_rounds set hinted = hinted || v_word where id = v_r.id;
  return jsonb_build_object(
    'prefix', left(v_word, 2),
    'length', length(v_word),
    'jokers_left', spelling_joker_count() - cardinality(v_r.hinted) - 1);
end $$;

revoke execute on function public.spelling_joker_count() from public, anon, authenticated;
revoke execute on function public.spelling_hint(bigint, text[]) from public, anon;
grant execute on function public.spelling_hint(bigint, text[]) to authenticated;
