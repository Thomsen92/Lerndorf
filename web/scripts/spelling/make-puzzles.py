"""Builds the Spelling Bee puzzles for Lerndorf (teacher, 28.10.2026).

Every puzzle has seven letters; its pangram (a word with all seven letters) comes from the topics of
Highlight 8 (New York, food, travel, nature, festivals, jobs, music, the Caribbean). The valid words are
common English words (wordfreq) that are real lower-case dictionary words (web2), at least four letters
long, made only of the seven letters and containing the centre letter.

Run: python3 web/scripts/spelling/make-puzzles.py  (needs: pip install wordfreq english-words)
Writes web/scripts/spelling/puzzles.json and the seed block of supabase/migrations/0057_spelling_bee.sql.
"""
import json
import sys
from pathlib import Path

from english_words import get_english_words_set
from wordfreq import zipf_frequency

OUT = Path(__file__).with_name('puzzles.json')
MIGRATION = Path(__file__).resolve().parents[3] / 'supabase/migrations/0057_spelling_bee.sql'
BEGIN, END = '-- BEGIN spelling puzzles', '-- END spelling puzzles'
MIN_ZIPF = 3.5  # common words only (school level)
MIN_WORDS, MAX_WORDS = 14, 45
COUNT = 70  # ten weeks; the days then start over

# Highlight 8 topics (units 1-4 and the in-between pages), used for the pangrams
THEMES = """
american avenue airport airline subway station traffic tourist ticket tickets theatre theater
skyline bridge island statue harbour harbor central parking pancake popcorn hamburger sandwich
chicken pretzel cupcake breakfast dinner kitchen biscuit cookie omelette yoghurt vanilla chocolate
pineapple coconut mango festival carnival parade costume dancing singing guitar drummer trumpet
concert rhythm reggae musician holiday holidays vacation beaches sunshine tropical captain pirate
journey traveling travelling platform departure arrival luggage baggage passport customs terminal
aircraft railway engine driver painter teacher farmer actress plumber builder fireman officer
nurse doctor student hostess waiter reception receipt manager computer printer interview
uniform license licence volunteer project captain sailing camping hiking climbing fishing
skating surfing bowling cycling running playing reading writing drawing painting cooking
baking garden gardener animals alligator dolphin penguin panther buffalo caribou walrus
salmon turtle eagles reindeer mountain glacier volcano rainforest weather thunder lightning
pumpkin witches monster vampire ghostly costume spooky candles lantern friendly friendship
favorite favourite exciting dangerous beautiful expensive wonderful neighbour neighbor
northern southern western eastern country capital culture museum gallery fashion designer
musical dancer singer cousin parents brother sister family grandma grandpa birthday
""".split()

BLOCK = set('''
anal arse bitch crap damn dick dyke fuck gay hell homo jerk kill nazi negro piss porn rape sex
sexy shit slut suck tits twat whore drug drugs dead death weed beer wine vodka booze gun guns
dildo penis alcohol ammunition assassin satan cocaine heroin bomb bombs knife kill killer murder
nude naked hitler slave slavery terror suicide coffin corpse raping raped firearm penetrate
imam moron kang yang wong mali mona monte somerset panama hanna rory vera vita cass alec arent
poop sans thou ness coca carr holt'''.split())


def main() -> None:
    web2 = get_english_words_set(['web2'], lower=False, alpha=True)
    # lower-case dictionary words that are not also names (Anna, Emma, Otto ... stay out)
    dictionary = {w for w in web2 if w.islower() and w.capitalize() not in web2}
    pool = sorted(
        w for w in dictionary
        if len(w) >= 4 and w.isascii() and w not in BLOCK and zipf_frequency(w, 'en') >= MIN_ZIPF
    )
    pangram_words = sorted({w for w in THEMES if len(set(w)) == 7})
    puzzles, used_sets = [], set()
    for theme in pangram_words:
        letters = frozenset(theme)
        if letters in used_sets:
            continue
        best = None
        for centre in sorted(letters):
            words = sorted(
                w for w in pool if centre in w and set(w) <= letters
            )
            if theme not in words:
                words = sorted(set(words) | {theme})
            pangrams = [w for w in words if set(w) == letters]
            if not (MIN_WORDS <= len(words) <= MAX_WORDS):
                continue
            score = -abs(len(words) - 26)
            if best is None or score > best[0]:
                best = (score, centre, words, pangrams)
        if best:
            _, centre, words, pangrams = best
            used_sets.add(letters)
            puzzles.append({
                'theme': theme,
                'center': centre,
                'outer': sorted(letters - {centre}),
                'words': words,
                'pangrams': pangrams,
            })
    # a fixed shuffle, so neighbouring days have different topics
    import random
    puzzles.sort(key=lambda p: p['theme'])
    random.Random(281026).shuffle(puzzles)
    print(f'{len(puzzles)} puzzles from {len(pangram_words)} themed pangrams, pool {len(pool)}', file=sys.stderr)
    for p in puzzles:
        print(f"{p['theme']:14} {p['center']} {''.join(p['outer'])} {len(p['words']):3} {p['words'][:12]}", file=sys.stderr)
    puzzles = puzzles[:COUNT]
    OUT.write_text(json.dumps(puzzles, indent=1) + '\n')
    write_seed(puzzles)


def points(word: str, letters: set) -> int:
    return (1 if len(word) == 4 else len(word)) + (7 if set(word) >= letters else 0)


def write_seed(puzzles: list) -> None:
    rows = []
    for i, p in enumerate(puzzles, start=1):
        letters = set(p['center']) | set(p['outer'])
        total = sum(points(w, letters) for w in p['words'])
        words = ','.join(f"'{w}'" for w in p['words'])
        rows.append(f"  ({i}, '{p['theme']}', '{p['center']}', '{''.join(p['outer'])}', array[{words}], {total})")
    block = (f'{BEGIN} (generated by web/scripts/spelling/make-puzzles.py)\n'
             'insert into public.spelling_puzzles (id, theme, center, letters, words, max_points) values\n'
             + ',\n'.join(rows) + ';\n' + END)
    sql = MIGRATION.read_text()
    start, end = sql.index(BEGIN), sql.index(END) + len(END)
    MIGRATION.write_text(sql[:start] + block + sql[end:])


if __name__ == '__main__':
    main()
