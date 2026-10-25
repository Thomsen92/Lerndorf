/**
 * Client side of the first-login tutorial (migration 0019). Every call is one RPC; the server owns
 * the step, the plot and the coins. Solutions are never sent to the client.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isCharacterKind, type CharacterKind } from '../render/character';
import type { Result } from './build';
import { parseProgressDelta, type ProgressDelta } from './progress';

export type TutorialStep = 'intro' | 'quiz' | 'buy' | 'place' | 'done';

export interface TutorialState {
  progress?: ProgressDelta | null;
  needed: boolean;
  step: TutorialStep;
  plotIndex: number | null;
  character: CharacterKind | null;
  answered: number;
}

export interface TutorialQuestion {
  nr: number;
  total: number;
  type: string;
  prompt: string;
  data: unknown;
}

export interface TutorialAnswerResult {
  correct: boolean;
  hint: string | null;
  answered: number;
  done: boolean;
  coins: number;
}

interface RawState {
  progress?: unknown;
  needed: boolean;
  step: TutorialStep;
  plot_index: number | null;
  character: unknown;
  answered: number;
}

function toState(r: RawState): TutorialState {
  return {
    needed: r.needed,
    step: r.step,
    plotIndex: r.plot_index ?? null,
    character: isCharacterKind(r.character) ? r.character : null,
    answered: r.answered ?? 0,
    ...('progress' in r ? { progress: parseProgressDelta(r.progress) } : {}),
  };
}

function explain(message: string): string {
  if (message.includes('village is full'))
    return 'Das Dorf ist leider voll. Bitte sag deiner Lehrkraft Bescheid.';
  if (message.includes('not enough coins')) return 'Dafür hast du noch nicht genug Münzen.';
  if (message.includes('not the current question'))
    return 'Diese Frage ist nicht mehr dran. Bitte lade die Seite neu.';
  if (message.includes('not at this step') || message.includes('not in the quiz'))
    return 'Das passt gerade nicht zum Schritt. Bitte lade die Seite neu.';
  if (message.includes('pupils only')) return 'Das gibt es nur für Schülerkonten.';
  if (message.includes('no free copy')) return 'Das Haus ist nicht mehr frei. Bitte lade die Seite neu.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

async function call<T>(
  supabase: SupabaseClient,
  fn: string,
  args: Record<string, unknown> | undefined,
  map: (data: unknown) => T,
): Promise<Result<T>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) return { ok: false, message: explain(error.message) };
  return { ok: true, value: map(data) };
}

const stateOf = (d: unknown): TutorialState => toState(d as RawState);

export function getTutorialState(supabase: SupabaseClient): Promise<Result<TutorialState>> {
  return call(supabase, 'tutorial_state', undefined, stateOf);
}

/** Gives the pupil a plot (server side) and creates the progress row. Safe to repeat. */
export function startTutorial(supabase: SupabaseClient): Promise<Result<TutorialState>> {
  return call(supabase, 'tutorial_start', undefined, stateOf);
}

/**
 * Moves on from the given step. If the server already moved on (double click, second tab), the
 * call counts as success and the current state is returned.
 */
export async function continueTutorial(
  supabase: SupabaseClient,
  from: 'intro',
): Promise<Result<TutorialState>> {
  const { data, error } = await supabase.rpc('tutorial_continue', { p_from: from });
  if (!error) return { ok: true, value: stateOf(data) };
  // 22023 = the server is not at this step (it moved on already); the message text is not relied on
  if (error.code === '22023') return getTutorialState(supabase);
  return { ok: false, message: explain(error.message) };
}

export function getTutorialQuestion(supabase: SupabaseClient): Promise<Result<TutorialQuestion>> {
  return call(supabase, 'tutorial_question', undefined, (d) => {
    const r = d as TutorialQuestion;
    return { nr: r.nr, total: r.total, type: r.type, prompt: r.prompt, data: r.data };
  });
}

export function answerTutorial(
  supabase: SupabaseClient,
  nr: number,
  answer: unknown,
): Promise<Result<TutorialAnswerResult>> {
  return call(supabase, 'tutorial_answer', { p_nr: nr, p_answer: answer }, (d) => {
    const r = d as { correct: boolean; hint?: string | null; answered: number; done: boolean; coins: number };
    return { correct: r.correct, hint: r.hint ?? null, answered: r.answered, done: r.done, coins: r.coins };
  });
}

/** Buys the tutorial house (50 coins, price from the catalogue). */
export function buyTutorialHouse(supabase: SupabaseClient): Promise<Result<{ coins: number; qty: number }>> {
  return call(supabase, 'tutorial_buy_house', undefined, (d) => {
    const r = d as { coins: number; qty: number };
    return { coins: r.coins, qty: r.qty };
  });
}

/** Places the bought house in the house slot; returns the placement id. */
export function placeTutorialHouse(supabase: SupabaseClient): Promise<Result<number>> {
  return call(supabase, 'tutorial_place_house', undefined, (d) => d as number);
}

export function finishTutorial(supabase: SupabaseClient): Promise<Result<TutorialState>> {
  return call(supabase, 'tutorial_finish', undefined, stateOf);
}
