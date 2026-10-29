/**
 * Spelling Bee rules in the browser (instant feedback only; the server recounts everything).
 * A word needs three letters (USA puzzles, migration 0060/0061; the first puzzles only have words of
 * four or more), the centre letter and only the seven letters; it is right when its
 * salted hash is one of the puzzle's hashes. 3 or 4 letters = 1 point, longer = 1 point per letter,
 * a pangram (all seven letters) +7 — the same rule as spelling_word_points in migration 0057.
 */
export type Verdict = 'ok' | 'too-short' | 'missing-center' | 'bad-letter' | 'not-in-list' | 'already-found';

export interface Puzzle {
  id: number;
  center: string;
  letters: string[];
  hashes: string[];
}

export function normalise(word: string): string {
  return word.trim().toLowerCase();
}

export function isPangram(word: string, puzzle: Pick<Puzzle, 'center' | 'letters'>): boolean {
  return [puzzle.center, ...puzzle.letters].every((l) => word.includes(l));
}

export function wordPoints(word: string, puzzle: Pick<Puzzle, 'center' | 'letters'>): number {
  return (word.length <= 4 ? 1 : word.length) + (isPangram(word, puzzle) ? 7 : 0);
}

/** The checks that need no word list, in the order a pupil would want to hear them. */
export function precheck(word: string, puzzle: Pick<Puzzle, 'center' | 'letters'>): Verdict | null {
  if (word.length < 3) return 'too-short';
  if (!word.includes(puzzle.center)) return 'missing-center';
  const allowed = new Set([puzzle.center, ...puzzle.letters]);
  if (![...word].every((c) => allowed.has(c))) return 'bad-letter';
  return null;
}

/** Same salt and length as spelling_hash() in the database. */
export async function wordHash(puzzleId: number, word: string): Promise<string> {
  const bytes = new TextEncoder().encode(`lerndorf-spelling:${puzzleId}:${word}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

export async function evaluate(raw: string, puzzle: Puzzle, found: ReadonlySet<string>): Promise<Verdict> {
  const word = normalise(raw);
  const early = precheck(word, puzzle);
  if (early) return early;
  if (found.has(word)) return 'already-found';
  return puzzle.hashes.includes(await wordHash(puzzle.id, word)) ? 'ok' : 'not-in-list';
}

/** Shuffles the six outer letters (a different order than before). */
export function shuffled(letters: string[], random: () => number = Math.random): string[] {
  const next = letters.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next.join('') === letters.join('') && next.length > 1) next.push(next.shift()!);
  return next;
}

/** Coins and XP a rewarded round brings (mirror of spelling_reward(), only for the preview). */
export function rewardFor(score: number): { coins: number; xp: number } {
  if (score <= 0) return { coins: 0, xp: 0 };
  if (score < 10) return { coins: 4, xp: 10 };
  if (score < 25) return { coins: 6, xp: 16 };
  if (score < 40) return { coins: 8, xp: 24 };
  return { coins: 10, xp: 30 };
}
