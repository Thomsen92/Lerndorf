/**
 * Spooky English Quiz API: thin adapter around the RPCs of migration 0051 (SPOOKY_STARTER §7).
 * The server never sends solutions or hints with the questions; a hint only comes back together
 * with a wrong answer. XP values are the server's deltas, never computed here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { parseProgressDelta, type ProgressDelta } from './progress';
import type { SeasonUiState } from './worldTheme';

export interface StarterQuestion {
  id: string;
  kind: string;
  type: 'choice' | 'listening';
  prompt: string;
  options: string[];
  /** English sentence of a listening question; played from the local clip, never shown first. */
  speak?: string;
  solved: boolean;
  attempts: number;
}

export interface StarterState {
  seasonId: string;
  state: SeasonUiState;
  solved: number;
  total: number;
  awardedXp: number;
  completed: boolean;
  questions: StarterQuestion[];
}

export interface StarterAnswer {
  correct: boolean;
  alreadySolved: boolean;
  hint: string | null;
  solved: number;
  total: number;
  completed: boolean;
  /** XP booked by this call (10 per first correct answer plus the bonus). */
  awardedXp: number;
  completionBonusXp: number;
  seasonXp: number;
  reachedTier: number;
  progress: ProgressDelta | null;
}

export interface StarterApi {
  state(seasonId: string): Promise<StarterState>;
  answer(seasonId: string, questionId: string, answer: string): Promise<StarterAnswer>;
}

/** Thrown when the season is not running: the quiz stays readable but books nothing. */
export class StarterClosedError extends Error {}

const STATES = new Set(['upcoming', 'running', 'ended', 'closed']);
const int = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

function parseQuestion(raw: unknown): StarterQuestion {
  const q = raw as Partial<StarterQuestion> | null;
  if (
    !q ||
    typeof q.id !== 'string' ||
    typeof q.kind !== 'string' ||
    (q.type !== 'choice' && q.type !== 'listening') ||
    typeof q.prompt !== 'string' ||
    !Array.isArray(q.options) ||
    !q.options.every((o) => typeof o === 'string') ||
    typeof q.solved !== 'boolean' ||
    !int(q.attempts) ||
    (q.type === 'listening' && typeof q.speak !== 'string')
  )
    throw new Error('Invalid season quiz question');
  return {
    id: q.id,
    kind: q.kind,
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    ...(q.type === 'listening' ? { speak: q.speak } : {}),
    solved: q.solved,
    attempts: q.attempts,
  };
}

export function parseStarterState(raw: unknown): StarterState {
  const s = raw as Partial<StarterState> | null;
  if (
    !s ||
    typeof s.seasonId !== 'string' ||
    !STATES.has(s.state as string) ||
    !int(s.solved) ||
    !int(s.total) ||
    !int(s.awardedXp) ||
    typeof s.completed !== 'boolean' ||
    !Array.isArray(s.questions)
  )
    throw new Error('Invalid season quiz state');
  return { ...(s as StarterState), questions: s.questions.map(parseQuestion) };
}

export function parseStarterAnswer(raw: unknown): StarterAnswer {
  const r = raw as Partial<StarterAnswer> & { progress?: unknown };
  if (
    !r ||
    typeof r.correct !== 'boolean' ||
    typeof r.alreadySolved !== 'boolean' ||
    (r.hint !== null && typeof r.hint !== 'string') ||
    !int(r.solved) ||
    !int(r.total) ||
    typeof r.completed !== 'boolean' ||
    !int(r.awardedXp) ||
    !int(r.completionBonusXp) ||
    !int(r.seasonXp) ||
    !int(r.reachedTier)
  )
    throw new Error('Invalid season quiz answer');
  return {
    correct: r.correct,
    alreadySolved: r.alreadySolved,
    hint: r.hint ?? null,
    solved: r.solved,
    total: r.total,
    completed: r.completed,
    awardedXp: r.awardedXp,
    completionBonusXp: r.completionBonusXp,
    seasonXp: r.seasonXp,
    reachedTier: r.reachedTier,
    progress: parseProgressDelta(r.progress),
  };
}

export function seasonStarterApi(supabase: SupabaseClient): StarterApi {
  return {
    async state(seasonId) {
      const { data, error } = await supabase.rpc('my_season_starter', { p_season: seasonId });
      if (error) throw new Error(error.message);
      return parseStarterState(data);
    },
    async answer(seasonId, questionId, answer) {
      const { data, error } = await supabase.rpc('submit_season_starter_answer', {
        p_season: seasonId,
        p_question: questionId,
        p_answer: answer,
      });
      if (error) {
        if (/not running/.test(error.message)) throw new StarterClosedError(error.message);
        throw new Error(error.message);
      }
      return parseStarterAnswer(data);
    },
  };
}
