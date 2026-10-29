/**
 * Spelling Bee API (migration 0057): thin adapter around spelling_state/start/finish. The server
 * sends the letters and salted hashes of the words, never the words; it computes score, coins and XP.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseProgressDelta, type ProgressDelta } from './progress';

export interface SpellingPuzzle {
  id: number;
  center: string;
  letters: string[];
  wordCount: number;
  maxPoints: number;
  hashes: string[];
  /** Hash of today's golden word (counts double); '' when there is none. */
  golden: string;
}

export interface SpellingBoardRow {
  nickname: string;
  classId: string;
  score: number;
  rank: number;
  me: boolean;
}

export interface SpellingList {
  top: SpellingBoardRow[];
  me: { score: number; rank: number } | null;
}

/** The week list (best round) on top level, plus best round ever and all points of the week. */
export interface SpellingBoard extends SpellingList {
  week: string;
  all: SpellingList;
  total: SpellingList;
}

export interface SpellingState {
  day: string;
  puzzle: SpellingPuzzle;
  roundSeconds: number;
  freeRounds: number;
  rewardedLeft: number;
  /** The next round is the practice round (the pupil has not finished a round yet). */
  tutorial: boolean;
  board: SpellingBoard;
}

export interface SpellingRound {
  round: number;
  puzzle: number;
  endsAt: string;
  seconds: number;
  rewarded: boolean;
  rewardedLeft: number;
  /** Practice round: two help words shown on purpose, a bonus outside the daily rounds. */
  tutorial: boolean;
  hints: string[];
}

export interface SpellingResult {
  score: number;
  words: string[];
  maxPoints: number;
  rewarded: boolean;
  coinsGained: number;
  xpGained: number;
  coins: number;
  rewardedLeft: number;
  board: SpellingBoard;
  progress: ProgressDelta | null;
}

/** A joker (migration 0060): the length and first two letters of a word not found yet. */
export type SpellingHint =
  | { prefix: string; length: number; jokersLeft: number }
  /** Every word is found: nothing to show and no joker spent. */
  | { none: true; jokersLeft: number };

/** Jokers of one round; the server counts them (spelling_joker_count) and sends what is left. */
export const JOKERS_PER_ROUND = 3;

export interface SpellingApi {
  state(): Promise<SpellingState>;
  hint(round: number, found: string[]): Promise<SpellingHint>;
  start(): Promise<SpellingRound>;
  finish(round: number, words: string[]): Promise<SpellingResult>;
}

type Raw = Record<string, unknown>;
const record = (v: unknown): Raw => {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('Invalid spelling data');
  return v as Raw;
};
const int = (v: unknown): number => {
  if (!Number.isSafeInteger(v)) throw new Error('Invalid spelling data');
  return v as number;
};
const strings = (v: unknown): string[] => {
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) throw new Error('Invalid spelling data');
  return v as string[];
};

function parseList(raw: unknown): SpellingList {
  const b = raw === null || raw === undefined ? {} : record(raw);
  const top = Array.isArray(b.top) ? b.top : [];
  return {
    top: top.map((row) => {
      const r = record(row);
      return {
        nickname: String(r.nickname ?? ''),
        classId: String(r.class ?? ''),
        score: int(r.score),
        rank: int(r.rank),
        me: r.me === true,
      };
    }),
    me: b.me ? { score: int(record(b.me).score), rank: int(record(b.me).rank) } : null,
  };
}

export function parseBoard(raw: unknown): SpellingBoard {
  const b = record(raw);
  return { week: String(b.week ?? ''), ...parseList(b), all: parseList(b.all), total: parseList(b.total) };
}

export function parseState(raw: unknown): SpellingState {
  const s = record(raw);
  const p = record(s.puzzle);
  const letters = strings(p.letters);
  if (letters.length !== 6 || typeof p.center !== 'string' || p.center.length !== 1)
    throw new Error('Invalid spelling puzzle');
  return {
    day: String(s.day ?? ''),
    puzzle: {
      id: int(p.id),
      center: p.center,
      letters,
      wordCount: int(p.word_count),
      maxPoints: int(p.max_points),
      hashes: strings(p.hashes),
      golden: typeof p.golden === 'string' ? p.golden : '',
    },
    roundSeconds: int(s.round_seconds),
    freeRounds: int(s.free_rounds),
    rewardedLeft: int(s.rewarded_left),
    tutorial: s.tutorial === true,
    board: parseBoard(s.board),
  };
}

export function spellingApi(supabase: SupabaseClient): SpellingApi {
  const rpc = async (fn: string, args?: Raw): Promise<unknown> => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  };
  return {
    async state() {
      return parseState(await rpc('spelling_state'));
    },
    async start() {
      const r = record(await rpc('spelling_start'));
      return {
        round: int(r.round),
        puzzle: int(r.puzzle),
        endsAt: String(r.ends_at ?? ''),
        seconds: int(r.seconds),
        rewarded: r.rewarded === true,
        rewardedLeft: int(r.rewarded_left),
        tutorial: r.tutorial === true,
        hints: strings(r.hints),
      };
    },
    async hint(round, found) {
      const r = record(await rpc('spelling_hint', { p_round: round, p_found: found }));
      if (r.none === true) return { none: true, jokersLeft: int(r.jokers_left) };
      if (typeof r.prefix !== 'string') throw new Error('Invalid spelling data');
      return { prefix: r.prefix, length: int(r.length), jokersLeft: int(r.jokers_left) };
    },
    async finish(round, words) {
      const r = record(await rpc('spelling_finish', { p_round: round, p_words: words }));
      return {
        score: int(r.score),
        words: strings(r.words),
        maxPoints: int(r.max_points),
        rewarded: r.rewarded === true,
        coinsGained: int(r.coins_gained),
        xpGained: int(r.xp_gained),
        coins: int(r.coins),
        rewardedLeft: int(r.rewarded_left),
        board: parseBoard(r.board),
        progress: parseProgressDelta(r.progress),
      };
    },
  };
}
