/**
 * Answer building for the quest forms (SPEC §8, §9). The browser only collects the pupil's answer
 * in the shape the server expects; the server checks it. Pure functions, tested in Node.
 */

import type { QuestType } from '../api/quests';

export type TaskType = 'choice' | 'gap' | 'match' | 'order';

/** The answer form a quest uses; listening quests carry theirs in data.mode. */
export function answerMode(type: QuestType, data: Record<string, unknown>): TaskType {
  if (type !== 'listening') return type;
  const mode = data.mode;
  return mode === 'gap' || mode === 'match' || mode === 'order' ? mode : 'choice';
}

export type AnswerState =
  | { type: 'choice'; picked: string | null }
  | { type: 'gap'; text: string }
  | { type: 'match'; picks: Record<string, string | null> }
  | { type: 'order'; sequence: string[] };

/** Words the pupil can choose for each answer form, read from the task data. */
export function stringList(data: Record<string, unknown>, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Turns the form state into the JSON the server expects. Returns null if something is missing. */
export function buildAnswer(state: AnswerState): unknown | null {
  switch (state.type) {
    case 'choice':
      return state.picked === null ? null : state.picked;
    case 'gap':
      return state.text.trim() === '' ? null : state.text.trim();
    case 'match': {
      const pairs: Array<[string, string]> = [];
      for (const [left, right] of Object.entries(state.picks)) {
        if (right === null) return null;
        pairs.push([left, right]);
      }
      return pairs.length > 0 ? pairs : null;
    }
    case 'order':
      return state.sequence.length > 0 ? state.sequence : null;
  }
}
