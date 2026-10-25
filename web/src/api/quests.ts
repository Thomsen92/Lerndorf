/**
 * Daily quests for the pupil. Reads and answers go through RPCs only.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Outcome } from './economy';
import { parseProgressDelta, type ProgressDelta } from './progress';

export type QuestType = 'choice' | 'gap' | 'match' | 'order' | 'listening';

export interface DailyQuest {
  key: string;
  day: string;
  catchUp: boolean;
  type: QuestType;
  prompt: string;
  /** Public quest data (never the solution). */
  data: Record<string, unknown>;
  reward: number;
  /** What a correct answer would still pay now (0 after 3 attempts or when solved). */
  rewardLeft: number;
  solved: boolean;
  attempts: number;
}

export interface QuestAnswerResult {
  progress?: ProgressDelta | null;
  correct: boolean;
  alreadySolved: boolean;
  coins: number;
  reward: number;
  rewardLeft: number;
  hint: string | null;
}

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Message when a quest is gone (day over, deactivated); the area reloads its list then. */
export const QUEST_NOT_OPEN = 'Diese Quest ist nicht mehr offen.';

/** Turns the database error into a short German message for the pupil. */
export function explainQuestError(message: string): string {
  if (message.includes('quest not available')) return QUEST_NOT_OPEN;
  if (message.includes('only pupils')) return 'Nur Schülerkonten können Quests lösen.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

interface QuestRow {
  key: string;
  day: string;
  catch_up: boolean;
  type: QuestType;
  prompt: string;
  data: Record<string, unknown> | null;
  reward: number;
  reward_left: number;
  solved: boolean;
  attempts: number;
}

export async function loadDailyQuests(supabase: SupabaseClient): Promise<Outcome<DailyQuest[]>> {
  const { data, error } = await supabase.rpc('my_daily_quests');
  if (error) {
    // a teacher account is refused by the server: say why instead of a generic failure
    const why = error.message.includes('only pupils') ? explainQuestError(error.message) : null;
    return fail(why ?? 'Die Quests konnten nicht geladen werden.');
  }
  const rows = (data ?? []) as QuestRow[];
  return {
    ok: true,
    value: rows.map((r) => ({
      key: r.key,
      day: r.day,
      catchUp: r.catch_up,
      type: r.type,
      prompt: r.prompt,
      data: r.data ?? {},
      reward: r.reward,
      rewardLeft: r.reward_left,
      solved: r.solved,
      attempts: r.attempts,
    })),
  };
}

export async function submitQuestAnswer(
  supabase: SupabaseClient,
  key: string,
  answer: unknown,
): Promise<Outcome<QuestAnswerResult>> {
  const { data, error } = await supabase.rpc('submit_quest_answer', { p_key: key, p_answer: answer });
  if (error) return fail(explainQuestError(error.message));
  const r = data as {
    correct: boolean;
    already_solved: boolean;
    coins: number;
    reward: number;
    reward_left: number;
    hint?: string | null;
    progress?: unknown;
  };
  return {
    ok: true,
    value: {
      correct: r.correct,
      alreadySolved: r.already_solved,
      coins: r.coins,
      reward: r.reward,
      rewardLeft: r.reward_left,
      hint: r.hint ?? null,
      ...('progress' in r ? { progress: parseProgressDelta(r.progress) } : {}),
    },
  };
}
