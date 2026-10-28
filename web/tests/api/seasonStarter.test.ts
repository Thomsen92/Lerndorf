import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { StarterClosedError, seasonStarterApi } from '../../src/api/seasonStarter';

const state = {
  seasonId: 's1',
  state: 'running',
  solved: 1,
  total: 2,
  awardedXp: 10,
  completed: false,
  questions: [
    {
      id: 'a',
      kind: 'odd',
      type: 'choice',
      prompt: 'P',
      options: ['x', 'y', 'z'],
      solved: true,
      attempts: 1,
    },
    {
      id: 'b',
      kind: 'listening-meaning',
      type: 'listening',
      prompt: 'Listen',
      speak: 'Happy Halloween!',
      options: ['1', '2', '3'],
      solved: false,
      attempts: 0,
    },
  ],
};
const answer = {
  correct: true,
  alreadySolved: false,
  hint: null,
  solved: 2,
  total: 2,
  completed: true,
  awardedXp: 60,
  completionBonusXp: 50,
  seasonXp: 150,
  reachedTier: 5,
  progress: { gained: [{ reason: 'quest', xp: 10 }], xp: 150, level: 3, level_before: 2, new_chests: 1 },
};
function client(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { api: seasonStarterApi({ rpc } as unknown as SupabaseClient), rpc };
}

describe('season starter api', () => {
  it('reads the state through my_season_starter', async () => {
    const { api, rpc } = client(state);
    const result = await api.state('s1');
    expect(rpc).toHaveBeenCalledWith('my_season_starter', { p_season: 's1' });
    expect(result.questions[1].speak).toBe('Happy Halloween!');
    expect(result.questions[0]).not.toHaveProperty('speak');
  });

  it('sends one answer and parses the server deltas and progress', async () => {
    const { api, rpc } = client(answer);
    const result = await api.answer('s1', 'b', '2');
    expect(rpc).toHaveBeenCalledWith('submit_season_starter_answer', {
      p_season: 's1',
      p_question: 'b',
      p_answer: '2',
    });
    expect(result).toMatchObject({ completed: true, awardedXp: 60, reachedTier: 5 });
    expect(result.progress?.gained).toEqual([{ reason: 'quest', xp: 10 }]);
  });

  it('rejects malformed data and reports a closed season separately', async () => {
    await expect(client({ ...state, questions: [{ id: 'x' }] }).api.state('s1')).rejects.toThrow(/Invalid/);
    await expect(client({ ...answer, awardedXp: -5 }).api.answer('s1', 'a', 'x')).rejects.toThrow(/Invalid/);
    await expect(
      client(null, { message: 'season not running' }).api.answer('s1', 'a', 'x'),
    ).rejects.toBeInstanceOf(StarterClosedError);
    await expect(client(null, { message: 'boom' }).api.answer('s1', 'a', 'x')).rejects.not.toBeInstanceOf(
      StarterClosedError,
    );
  });
});
