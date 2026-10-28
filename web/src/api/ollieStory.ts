import type { SupabaseClient } from '@supabase/supabase-js';
import type { Outcome } from './economy';
import { parseProgressDelta, type ProgressDelta } from './progress';
import { tr } from '../i18n';

export interface StoryQuestion {
  id: string;
  position: number;
  narrative: string;
  /** Opaque local filename, without extension. */
  clip: string;
  options: string[];
}
export interface StoryState {
  id: string;
  completed: boolean;
  /** Number of solved gaps. */
  step: number;
  total: number;
  question: StoryQuestion | null;
  reward: { itemId: string; coins: number; xp: number };
  coins: number;
}
export interface StoryAnswer {
  correct: boolean;
  alreadySolved: boolean;
  hint: string | null;
  feedback: { text: string; clip: string } | null;
  state: StoryState;
  awarded: { coins: number; xp: number; itemId: string | null };
  progress: ProgressDelta | null;
}
export interface OllieStoryApi {
  state(): Promise<Outcome<StoryState>>;
  answer(questionId: string, answer: string): Promise<Outcome<StoryAnswer>>;
}
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const string = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const clip = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{24}$/.test(v);
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('Invalid story response');
}
function parseState(raw: unknown): StoryState {
  requireValid(
    record(raw) &&
      raw.id === 'ollie-australia-new-york' &&
      typeof raw.completed === 'boolean' &&
      integer(raw.step) &&
      raw.total === 9 &&
      raw.step <= raw.total &&
      integer(raw.coins) &&
      raw.completed === (raw.step === raw.total) &&
      record(raw.reward),
  );
  const reward = raw.reward;
  requireValid(reward.itemId === 'reward_ollie_nyc_postcard' && reward.coins === 50 && reward.xp === 80);
  let question: StoryQuestion | null = null;
  if (!raw.completed) {
    const q = raw.question;
    requireValid(
      record(q) &&
        string(q.id) &&
        q.id === `gap-${raw.step + 1}` &&
        q.position === raw.step + 1 &&
        string(q.narrative) &&
        clip(q.clip) &&
        Array.isArray(q.options) &&
        q.options.length === 3 &&
        q.options.every(string) &&
        Object.keys(q).sort().join(',') === 'clip,id,narrative,options,position',
    );
    question = {
      id: q.id,
      position: q.position as number,
      narrative: q.narrative,
      clip: q.clip,
      options: [...q.options] as string[],
    };
  } else requireValid(raw.question === null);
  return {
    id: raw.id,
    completed: raw.completed,
    step: raw.step,
    total: raw.total,
    question,
    reward: { itemId: reward.itemId, coins: reward.coins, xp: reward.xp },
    coins: raw.coins,
  };
}
function parseAnswer(raw: unknown): StoryAnswer {
  requireValid(
    record(raw) &&
      typeof raw.correct === 'boolean' &&
      typeof raw.alreadySolved === 'boolean' &&
      (raw.hint === null || string(raw.hint)) &&
      record(raw.awarded),
  );
  const awarded = raw.awarded;
  requireValid(
    integer(awarded.coins) && integer(awarded.xp) && (awarded.itemId === null || string(awarded.itemId)),
  );
  let feedback: StoryAnswer['feedback'] = null;
  if (raw.feedback !== null) {
    requireValid(raw.correct && record(raw.feedback) && string(raw.feedback.text) && clip(raw.feedback.clip));
    feedback = { text: raw.feedback.text, clip: raw.feedback.clip };
  }
  requireValid(!raw.correct || raw.hint === null);
  const progress = raw.progress === null ? null : parseProgressDelta(raw.progress);
  requireValid(raw.progress === null || progress !== null);
  return {
    correct: raw.correct,
    alreadySolved: raw.alreadySolved,
    hint: raw.hint as string | null,
    feedback,
    state: parseState(raw.state),
    awarded: { coins: awarded.coins, xp: awarded.xp, itemId: awarded.itemId as string | null },
    progress,
  };
}
export function supabaseOllieStoryApi(supabase: SupabaseClient): OllieStoryApi {
  const call = async <T>(
    name: string,
    args: Record<string, unknown> | undefined,
    parse: (data: unknown) => T,
  ): Promise<Outcome<T>> => {
    try {
      const { data, error } = await supabase.rpc(name, args);
      if (error) throw error;
      return { ok: true, value: parse(data) };
    } catch {
      return { ok: false, message: tr('Das hat leider nicht geklappt. Bitte noch einmal versuchen.') };
    }
  };
  return {
    state: () => call('my_ollie_story', undefined, parseState),
    answer: (questionId, answer) =>
      call('answer_ollie_story', { p_question: questionId, p_answer: answer }, parseAnswer),
  };
}
