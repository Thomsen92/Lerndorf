/**
 * Validation and conversion of a week of tasks (SPEC §9). Pure functions, no network.
 * A week file looks like content/tasks/2026-11-09.json. The solution never goes to the client:
 * `toRows` splits each task into the public row (`data`) and the private solution row.
 */
import { isMonday } from '../src/teacher/week.ts';

export const TASK_TYPES = ['choice', 'gap', 'match', 'order'] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const REWARDS = [5, 10, 15] as const; // easy, medium, hard (SPEC §14)
const ID_RE = /^[a-z0-9][a-z0-9-]{0,30}$/;

export interface TaskSpec {
  id: string;
  type: TaskType;
  reward: number;
  prompt: string;
  options?: string[];
  solution: unknown;
  pairs?: Array<[string, string]>;
}

export interface WeekSpec {
  week: string;
  class: '8a' | '8b' | null;
  tasks: TaskSpec[];
}

export interface TaskRow {
  id: string; // week-prefixed: "2026-11-09-v01"
  week: string;
  class_id: string | null;
  type: TaskType;
  prompt: string;
  data: Record<string, unknown>;
  reward: number;
}

export interface SolutionRow {
  task_id: string;
  solution: unknown;
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isStrList = (v: unknown, min: number): v is string[] =>
  Array.isArray(v) && v.length >= min && v.every(isStr);

/** Returns a list of German error messages; empty means the week is valid. */
export function validateWeek(input: unknown): string[] {
  const errors: string[] = [];
  if (typeof input !== 'object' || input === null) return ['Datei ist kein JSON-Objekt'];
  const w = input as Record<string, unknown>;

  if (typeof w.week !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w.week)) {
    errors.push('week: Datum im Format JJJJ-MM-TT erwartet');
  } else if (!isMonday(w.week)) {
    errors.push('week: muss ein Montag sein');
  }
  if (w.class !== null && w.class !== '8a' && w.class !== '8b') {
    errors.push('class: null, "8a" oder "8b" erwartet');
  }
  if (!Array.isArray(w.tasks) || w.tasks.length === 0 || w.tasks.length > 50) {
    errors.push('tasks: Liste mit 1 bis 50 Aufgaben erwartet');
    return errors;
  }

  const seen = new Set<string>();
  w.tasks.forEach((raw, i) => {
    const where = `tasks[${i}]`;
    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${where}: Objekt erwartet`);
      return;
    }
    const t = raw as Record<string, unknown>;
    if (typeof t.id !== 'string' || !ID_RE.test(t.id)) {
      errors.push(`${where}.id: nur Kleinbuchstaben, Ziffern und Bindestrich`);
    } else if (seen.has(t.id)) {
      errors.push(`${where}.id: "${t.id}" kommt doppelt vor`);
    } else {
      seen.add(t.id);
    }
    if (!TASK_TYPES.includes(t.type as TaskType)) {
      errors.push(`${where}.type: choice, gap, match oder order`);
      return;
    }
    if (!REWARDS.includes(t.reward as (typeof REWARDS)[number])) {
      errors.push(`${where}.reward: 5, 10 oder 15`);
    }
    if (!isStr(t.prompt)) errors.push(`${where}.prompt: Text erwartet`);

    switch (t.type) {
      case 'choice': {
        if (!isStrList(t.options, 2)) errors.push(`${where}.options: mindestens 2 Antworten`);
        if (!isStr(t.solution)) errors.push(`${where}.solution: eine Antwort`);
        else if (isStrList(t.options, 2) && !t.options.includes(t.solution)) {
          errors.push(`${where}.solution: muss in options stehen`);
        }
        break;
      }
      case 'gap': {
        if (!isStrList(t.solution, 1)) errors.push(`${where}.solution: Liste mit mindestens einer Lösung`);
        break;
      }
      case 'match': {
        const ok =
          Array.isArray(t.pairs) &&
          t.pairs.length >= 2 &&
          t.pairs.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0]) && isStr(p[1]));
        if (!ok) errors.push(`${where}.pairs: mindestens 2 Paare [englisch, deutsch]`);
        break;
      }
      case 'order': {
        if (!isStrList(t.solution, 2))
          errors.push(`${where}.solution: mindestens 2 Wörter in richtiger Reihenfolge`);
        break;
      }
    }
  });
  return errors;
}

/** Converts a valid week into table rows. Public data never contains the solution. */
export function toRows(week: WeekSpec): { tasks: TaskRow[]; solutions: SolutionRow[] } {
  const tasks: TaskRow[] = [];
  const solutions: SolutionRow[] = [];
  for (const t of week.tasks) {
    const id = `${week.week}-${t.id}`;
    let data: Record<string, unknown>;
    let solution: unknown;
    switch (t.type) {
      case 'choice':
        data = { options: t.options };
        solution = t.solution;
        break;
      case 'gap':
        data = {};
        solution = t.solution;
        break;
      case 'match': {
        // left column in order, right column in the order of the pairs' german words reversed
        // so that the pupil has to match them; the solution is the pairs themselves
        const pairs = t.pairs as Array<[string, string]>;
        data = { left: pairs.map((p) => p[0]), right: pairs.map((p) => p[1]).reverse() };
        solution = pairs;
        break;
      }
      case 'order':
        data = { words: [...(t.solution as string[])].reverse() };
        solution = t.solution;
        break;
    }
    tasks.push({
      id,
      week: week.week,
      class_id: week.class,
      type: t.type,
      prompt: t.prompt,
      data,
      reward: t.reward,
    });
    solutions.push({ task_id: id, solution });
  }
  return { tasks, solutions };
}
