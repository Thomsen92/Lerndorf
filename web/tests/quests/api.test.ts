import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { explainQuestError, loadDailyQuests, submitQuestAnswer } from '../../src/api/quests';

function fakeClient(result: { data?: unknown; error?: { message: string } | null }) {
  const calls: Array<{ fn: string; args?: unknown }> = [];
  const client = {
    rpc: async (fn: string, args?: unknown) => {
      calls.push({ fn, args });
      return { data: result.data ?? null, error: result.error ?? null };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe('loadDailyQuests', () => {
  it('calls my_daily_quests and maps snake_case to camelCase', async () => {
    const { client, calls } = fakeClient({
      data: [
        {
          key: 'q1', day: '2026-10-21', catch_up: true, type: 'gap', prompt: 'P', data: { a: 1 },
          reward: 3, reward_left: 2, solved: false, attempts: 1,
        },
      ],
    });
    const res = await loadDailyQuests(client);
    expect(calls).toEqual([{ fn: 'my_daily_quests', args: undefined }]);
    expect(res).toEqual({
      ok: true,
      value: [
        {
          key: 'q1', day: '2026-10-21', catchUp: true, type: 'gap', prompt: 'P', data: { a: 1 },
          reward: 3, rewardLeft: 2, solved: false, attempts: 1,
        },
      ],
    });
  });

  it('returns a German message on failure', async () => {
    const { client } = fakeClient({ error: { message: 'boom' } });
    expect(await loadDailyQuests(client)).toEqual({ ok: false, message: 'Die Quests konnten nicht geladen werden.' });
  });

  it('tells a teacher account that only pupils can solve quests', async () => {
    const { client } = fakeClient({ error: { message: 'only pupils can answer' } });
    expect(await loadDailyQuests(client)).toEqual({ ok: false, message: 'Nur Schülerkonten können Quests lösen.' });
  });
});

describe('submitQuestAnswer', () => {
  it('sends p_key and p_answer and maps the result', async () => {
    const { client, calls } = fakeClient({
      data: { correct: false, already_solved: false, coins: 5, reward: 3, reward_left: 1, hint: 'Think' },
    });
    const res = await submitQuestAnswer(client, 'q1', ['a']);
    expect(calls).toEqual([{ fn: 'submit_quest_answer', args: { p_key: 'q1', p_answer: ['a'] } }]);
    expect(res).toEqual({
      ok: true,
      value: { correct: false, alreadySolved: false, coins: 5, reward: 3, rewardLeft: 1, hint: 'Think' },
    });
  });

  it('maps a missing hint to null', async () => {
    const { client } = fakeClient({
      data: { correct: true, already_solved: false, coins: 8, reward: 3, reward_left: 0 },
    });
    const res = await submitQuestAnswer(client, 'q1', 'x');
    expect(res.ok && res.value.hint).toBeNull();
  });

  it('explains errors in German', async () => {
    const { client } = fakeClient({ error: { message: 'quest not available' } });
    expect(await submitQuestAnswer(client, 'q1', 'x')).toEqual({
      ok: false,
      message: 'Diese Quest ist nicht mehr offen.',
    });
  });
});

describe('explainQuestError', () => {
  it('maps known and unknown messages', () => {
    expect(explainQuestError('quest not available')).toBe('Diese Quest ist nicht mehr offen.');
    expect(explainQuestError('only pupils can answer')).toBe('Nur Schülerkonten können Quests lösen.');
    expect(explainQuestError('whatever')).toBe('Das hat leider nicht geklappt. Bitte noch einmal versuchen.');
  });
});
