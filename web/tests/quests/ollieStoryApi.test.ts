import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseOllieStoryApi } from '../../src/api/ollieStory';
const state = {
  id: 'ollie-australia-new-york',
  completed: false,
  step: 0,
  total: 9,
  coins: 100,
  reward: { itemId: 'reward_ollie_nyc_postcard', coins: 50, xp: 80 },
  question: {
    id: 'gap-1',
    position: 1,
    narrative: 'A bag ...',
    clip: '0123456789abcdef01234567',
    options: ['backpack', 'suitcase', 'handbag'],
  },
};
const result = {
  correct: false,
  alreadySolved: false,
  hint: 'Two straps',
  feedback: null,
  state,
  awarded: { coins: 0, xp: 0, itemId: null },
  progress: null,
};
function client(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { rpc, api: supabaseOllieStoryApi({ rpc } as unknown as SupabaseClient) };
}
it('reads and submits only through the dedicated RPCs', async () => {
  const { api, rpc } = client(state);
  expect(await api.state()).toEqual({ ok: true, value: state });
  expect(rpc).toHaveBeenCalledWith('my_ollie_story', undefined);
  rpc.mockResolvedValue({ data: result, error: null });
  expect(await api.answer('gap-1', 'suitcase')).toEqual({ ok: true, value: result });
  expect(rpc).toHaveBeenLastCalledWith('answer_ollie_story', {
    p_question: 'gap-1',
    p_answer: 'suitcase',
  });
});
it('parses server progress with the shared progression contract', async () => {
  const { api } = client({
    ...result,
    correct: true,
    hint: null,
    feedback: { text: 'Good', clip: '0123456789abcdef01234567' },
    progress: { xp: 80, level: 2, level_before: 1, new_chests: 1, gained: [{ reason: 'quest', xp: 80 }] },
  });
  const response = await api.answer('gap-1', 'backpack');
  expect(response).toMatchObject({ ok: true, value: { progress: { xp: 80, levelBefore: 1, newChests: 1 } } });
});
it('rejects malformed states, answers, progress and answer-bearing payloads', async () => {
  for (const bad of [
    null,
    { ...state, step: '0' },
    { ...state, question: { ...state.question, id: 'backpack' } },
    { ...state, question: { ...state.question, id: 'gap-6' } },
    { ...state, question: { ...state.question, solution: 'backpack' } },
    { ...state, question: { ...state.question, clip: '../../secret' } },
    { ...state, completed: true },
  ]) {
    expect((await client(bad).api.state()).ok).toBe(false);
  }
  for (const bad of [
    null,
    { ...result, correct: 'false' },
    { ...result, progress: {} },
    { ...result, feedback: { text: 'answer', clip: '0123456789abcdef01234567' } },
  ]) {
    expect((await client(bad).api.answer('gap-1', 'suitcase')).ok).toBe(false);
  }
});
it('returns safe errors for RPC errors and network rejection', async () => {
  const { api, rpc } = client(null, { message: 'private database detail' });
  expect(await api.state()).toMatchObject({ ok: false, message: expect.any(String) });
  rpc.mockRejectedValue(new Error('network'));
  expect(await api.answer('gap-1', 'x')).toMatchObject({ ok: false, message: expect.any(String) });
});

it('accepts the ninth recall gap and completed nine-gap state, rejecting the retired total', async () => {
  expect(
    await client({
      ...state,
      step: 8,
      question: { ...state.question, id: 'gap-9', position: 9 },
    }).api.state(),
  ).toMatchObject({ ok: true });
  expect(await client({ ...state, step: 9, completed: true, question: null }).api.state()).toMatchObject({
    ok: true,
  });
  expect(await client({ ...state, total: 6 }).api.state()).toMatchObject({ ok: false });
});
