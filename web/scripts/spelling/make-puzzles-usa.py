"""Builds the USA Spelling Bee puzzles for Lerndorf (teacher, 29.10.2026).

Easier than the first set: words of THREE letters count and the word lists are larger. Every puzzle has
seven letters; its pangram (a word with all seven letters) comes from content/spelling/usa-words.txt (the
vocabulary of Highlight 8 Unit 1 and the topic USA). The valid words are common English words (wordfreq,
real lower-case dictionary words from web2) made only of the seven letters and containing the centre
letter, plus every word of the USA list that fits.

Run: python3 web/scripts/spelling/make-puzzles-usa.py   (needs: pip install wordfreq english-words)
Writes web/scripts/spelling/puzzles-usa.json and the new migration supabase/migrations/0061_spelling_usa_puzzles.sql
(additive: new puzzle rows with set_name 'usa'; the old ones stay untouched).
"""
import json
import random
import sys
from pathlib import Path

from english_words import get_english_words_set
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parents[3]
WORDS = ROOT / 'content/spelling/usa-words.txt'
OUT = Path(__file__).with_name('puzzles-usa.json')
MIGRATION = ROOT / 'supabase/migrations/0061_spelling_usa_puzzles.sql'
MIN_LEN = 3
MIN_ZIPF = 3.4  # common words only (school level)
MIN_ZIPF_SHORT = 4.4  # words of three letters must be very common (no abbreviations or names)
MIN_WORDS, MAX_WORDS = 22, 80
FIRST_ID = 101
COUNT = 40

BLOCK = set('''
ass anal arse bitch crap damn dick dyke fuck gay hell homo jerk kill nazi negro piss porn rape sex
sexy shit slut suck tits twat whore drug drugs dead death weed beer wine vodka booze gun guns
dildo penis alcohol ammunition assassin satan cocaine heroin bomb bombs knife kill killer murder
nude naked hitler slave slavery terror suicide coffin corpse raping raped firearm penetrate
imam moron kang yang wong mali mona monte somerset panama hanna rory vera vita cass alec arent
poop sans thou ness coca carr holt fag fags gal hoe tit tat sod pee poo bum fat hit wet jew
boob bong baba elle dell hath corp hart non min pro coco lama
'''.split())


def load_list() -> list:
    words = []
    for line in WORDS.read_text(encoding='utf-8').splitlines():
        line = line.strip().lower()
        if line and not line.startswith('#') and line.isalpha():
            words.append(line)
    return sorted(set(words))


def points(word: str, letters: set) -> int:
    return (1 if len(word) <= 4 else len(word)) + (7 if set(word) >= letters else 0)


def main() -> None:
    topic = load_list()
    web2 = get_english_words_set(['web2'], lower=False, alpha=True)
    dictionary = {w for w in web2 if w.islower() and w.capitalize() not in web2}
    pool = {
        w for w in dictionary
        if len(w) >= MIN_LEN and w.isascii() and w not in BLOCK
        and zipf_frequency(w, 'en') >= (MIN_ZIPF_SHORT if len(w) == 3 else MIN_ZIPF)
    }
    topic_words = {w for w in topic if len(w) >= MIN_LEN and w not in BLOCK}
    pool |= topic_words
    pangram_words = sorted(w for w in topic_words if len(set(w)) == 7)
    puzzles, used = [], set()
    for theme in pangram_words:
        letters = frozenset(theme)
        if letters in used:
            continue
        best = None
        for centre in sorted(letters):
            words = sorted(w for w in pool if centre in w and set(w) <= letters)
            if not (MIN_WORDS <= len(words) <= MAX_WORDS):
                continue
            from_list = sum(1 for w in words if w in topic_words)
            # more words of the USA list first, then a medium size
            score = from_list * 3 - abs(len(words) - 40)
            if best is None or score > best[0]:
                best = (score, centre, words, [w for w in words if set(w) == letters])
        if best:
            _, centre, words, pangrams = best
            used.add(letters)
            puzzles.append({'theme': theme, 'center': centre, 'outer': sorted(letters - {centre}),
                            'words': words, 'pangrams': pangrams})
    puzzles.sort(key=lambda p: p['theme'])
    random.Random(291026).shuffle(puzzles)
    print(f'{len(puzzles)} puzzles from {len(pangram_words)} pangram words of the list', file=sys.stderr)
    for p in puzzles:
        n_list = sum(1 for w in p['words'] if w in topic_words)
        print(f"{p['theme']:16} {p['center']} {''.join(p['outer'])} words {len(p['words']):3} (list {n_list:2}) 3-letter {sum(1 for w in p['words'] if len(w) == 3)}", file=sys.stderr)
    puzzles = puzzles[:COUNT]
    OUT.write_text(json.dumps(puzzles, indent=1) + '\n')
    write_migration(puzzles)


def write_migration(puzzles: list) -> None:
    rows = []
    for i, p in enumerate(puzzles, start=FIRST_ID):
        letters = set(p['center']) | set(p['outer'])
        total = sum(points(w, letters) for w in p['words'])
        words = ','.join(f"'{w}'" for w in p['words'])
        rows.append(f"  ({i}, '{p['theme']}', '{p['center']}', '{''.join(p['outer'])}', array[{words}], {total}, 'usa')")
    sql = f"""-- 0061: USA puzzles for the Spelling Bee (teacher, 29.10.2026). Additive: new puzzle rows, nothing is changed.
-- Words of three letters count (1 point, see 0060) and the word lists are larger than in the first set.
-- The pangrams and many words come from the topic USA (Highlight 8 Unit 1, content/spelling/usa-words.txt).
-- Generated by web/scripts/spelling/make-puzzles-usa.py. Once these rows exist the puzzle of the day comes from
-- them; the old puzzles stay in the table and in the history of played rounds.

alter table public.spelling_puzzles add column set_name text;

insert into public.spelling_puzzles (id, theme, center, letters, words, max_points, set_name) values
""" + ',\n'.join(rows) + """;

-- The puzzle of a day: one a day from the 'usa' set when it exists (else from the first set), then it starts over.
create or replace function public.spelling_puzzle_for(p_day date) returns int
language sql stable security definer set search_path = public as $$
  with pool as (
    select id, row_number() over (order by id) - 1 as i, count(*) over () as n
    from spelling_puzzles
    where set_name is not distinct from
          (case when exists (select 1 from spelling_puzzles where set_name = 'usa') then 'usa' else null end)
  )
  select id from pool where i = (((p_day - spelling_epoch()) % n::int) + n::int) % n::int
$$;
"""
    MIGRATION.write_text(sql, encoding='utf-8')


if __name__ == '__main__':
    main()
