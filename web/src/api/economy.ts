/**
 * Shop and tasks for the pupil. Reads go through RLS; every change is an RPC (SPEC §8).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TaskType, TaskView } from '../tasks/answer';

export interface CatalogItem {
  id: string;
  kind: 'deco' | 'avatar';
  slot: string | null;
  nameDe: string;
  price: number;
  starter: boolean;
}

export interface TaskStatus {
  taskId: string;
  attempts: number;
  solved: boolean;
}

export interface AnswerResult {
  correct: boolean;
  coins: number;
  attemptsLeft: number;
  solution: unknown | null;
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Turns the database error into a short German message for the pupil. */
function explain(message: string): string {
  if (message.includes('not enough coins')) return 'Dafür reichen die Münzen nicht.';
  if (message.includes('shop is closed')) return 'Der Shop ist gerade geschlossen.';
  if (message.includes('building is closed')) return 'Das Bauen ist gerade geschlossen.';
  if (message.includes('already solved')) return 'Diese Aufgabe hast du heute schon gelöst.';
  if (message.includes('no attempts left')) return 'Für heute sind die Versuche aufgebraucht.';
  if (message.includes('daily limit')) return 'Für heute ist das Limit an Münzen aus Aufgaben erreicht.';
  if (message.includes('not available yet')) return 'Diese Woche beginnt erst später.';
  if (message.includes('already occupied')) return 'Hier steht schon etwas.';
  if (message.includes('outside the free plot') || message.includes('no free copy'))
    return 'Hier kann man nichts hinstellen.';
  return 'Das hat leider nicht geklappt. Bitte noch einmal versuchen.';
}

export async function loadCatalog(supabase: SupabaseClient): Promise<Outcome<CatalogItem[]>> {
  const { data, error } = await supabase
    .from('items')
    .select('id, kind, slot, name_de, price, starter')
    .eq('active', true)
    .order('price');
  if (error) return fail('Der Shop konnte nicht geladen werden.');
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind,
      slot: r.slot,
      nameDe: r.name_de,
      price: r.price,
      starter: r.starter,
    })),
  };
}

/** Owned quantity per item id (own inventory, RLS). */
export async function loadInventory(supabase: SupabaseClient): Promise<Outcome<Record<string, number>>> {
  const { data, error } = await supabase.from('inventory').select('item_id, qty').gt('qty', 0);
  if (error) return fail('Das Inventar konnte nicht geladen werden.');
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.item_id] = r.qty;
  return { ok: true, value: map };
}

export async function buyItem(
  supabase: SupabaseClient,
  itemId: string,
): Promise<Outcome<{ coins: number; qty: number }>> {
  const { data, error } = await supabase.rpc('buy_item', { p_item_id: itemId });
  if (error) return fail(explain(error.message));
  return { ok: true, value: data as { coins: number; qty: number } };
}

export async function loadTasks(supabase: SupabaseClient): Promise<Outcome<TaskView[]>> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, week, type, prompt, data, reward')
    .eq('active', true)
    .order('week', { ascending: false })
    .order('id');
  if (error) return fail('Die Aufgaben konnten nicht geladen werden.');
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      week: r.week,
      type: r.type as TaskType,
      prompt: r.prompt,
      reward: r.reward,
      data: r.data as Record<string, unknown>,
    })),
  };
}

/** Today's status per task (own results, RLS). `day` is the Berlin date. */
export async function loadTodayStatus(
  supabase: SupabaseClient,
  day: string,
): Promise<Outcome<Record<string, TaskStatus>>> {
  const { data, error } = await supabase
    .from('task_results')
    .select('task_id, attempts, solved')
    .eq('day', day);
  if (error) return fail('Der Stand von heute konnte nicht geladen werden.');
  const map: Record<string, TaskStatus> = {};
  for (const r of data ?? []) map[r.task_id] = { taskId: r.task_id, attempts: r.attempts, solved: r.solved };
  return { ok: true, value: map };
}

export async function submitAnswer(
  supabase: SupabaseClient,
  taskId: string,
  answer: unknown,
): Promise<Outcome<AnswerResult>> {
  const { data, error } = await supabase.rpc('submit_answer', { p_task_id: taskId, p_answer: answer });
  if (error) return fail(explain(error.message));
  const r = data as { correct: boolean; coins: number; attempts_left: number; solution: unknown | null };
  return {
    ok: true,
    value: { correct: r.correct, coins: r.coins, attemptsLeft: r.attempts_left, solution: r.solution },
  };
}
