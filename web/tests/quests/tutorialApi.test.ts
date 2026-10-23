import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  answerTutorial,
  buyTutorialHouse,
  continueTutorial,
  finishTutorial,
  getTutorialQuestion,
  getTutorialState,
  placeTutorialHouse,
  startTutorial,
} from '../../src/api/tutorial';

type Reply = { data?: unknown; error?: { message: string; code?: string } | null };

function fakeClient(...replies: Reply[]) {
  const calls: Array<{ fn: string; args?: unknown }> = [];
  let i = 0;
  const client = {
    rpc: async (fn: string, args?: unknown) => {
      calls.push({ fn, args });
      const r = replies[Math.min(i++, replies.length - 1)] ?? {};
      return { data: r.data ?? null, error: r.error ?? null };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

const RAW = { needed: true, step: 'quiz', plot_index: 3, character: 'girl', answered: 2 };
const STATE = { needed: true, step: 'quiz', plotIndex: 3, character: 'girl', answered: 2 };

describe('tutorial state rpcs', () => {
  it('getTutorialState maps snake_case', async () => {
    const { client, calls } = fakeClient({ data: RAW });
    expect(await getTutorialState(client)).toEqual({ ok: true, value: STATE });
    expect(calls).toEqual([{ fn: 'tutorial_state', args: undefined }]);
  });

  it('maps a missing plot to null and ignores unknown figures', async () => {
    const { client } = fakeClient({ data: { ...RAW, plot_index: null, character: 'x' } });
    const res = await getTutorialState(client);
    expect(res).toEqual({ ok: true, value: { ...STATE, plotIndex: null, character: null } });
  });

  it('startTutorial calls tutorial_start', async () => {
    const { client, calls } = fakeClient({ data: RAW });
    expect(await startTutorial(client)).toEqual({ ok: true, value: STATE });
    expect(calls[0]?.fn).toBe('tutorial_start');
  });

  it('startTutorial explains a full village in German', async () => {
    const { client } = fakeClient({ error: { message: 'village is full', code: '53400' } });
    const res = await startTutorial(client);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Dorf/);
  });

  it('continueTutorial sends p_from', async () => {
    const { client, calls } = fakeClient({ data: RAW });
    expect(await continueTutorial(client, 'intro')).toEqual({ ok: true, value: STATE });
    expect(calls).toEqual([{ fn: 'tutorial_continue', args: { p_from: 'intro' } }]);
  });

  it('continueTutorial treats error code 22023 as success and re-reads the state', async () => {
    const { client, calls } = fakeClient(
      { error: { message: 'wording does not matter', code: '22023' } },
      { data: RAW },
    );
    expect(await continueTutorial(client, 'intro')).toEqual({ ok: true, value: STATE });
    expect(calls.map((c) => c.fn)).toEqual(['tutorial_continue', 'tutorial_state']);
  });

  it('continueTutorial reports other errors, also with the old message text but another code', async () => {
    const { client } = fakeClient({ error: { message: 'boom' } });
    const res = await continueTutorial(client, 'intro');
    expect(res.ok).toBe(false);
    const other = fakeClient({ error: { message: 'not at this step', code: '42501' } });
    expect((await continueTutorial(other.client, 'intro')).ok).toBe(false);
  });

  it('finishTutorial calls tutorial_finish', async () => {
    const { client, calls } = fakeClient({ data: { ...RAW, needed: false, step: 'done' } });
    const res = await finishTutorial(client);
    expect(res).toEqual({ ok: true, value: { ...STATE, needed: false, step: 'done' } });
    expect(calls[0]?.fn).toBe('tutorial_finish');
  });
});

describe('tutorial quiz rpcs', () => {
  it('getTutorialQuestion maps the question', async () => {
    const { client, calls } = fakeClient({
      data: { nr: 3, total: 5, type: 'gap', prompt: 'P', data: { a: 1 } },
    });
    expect(await getTutorialQuestion(client)).toEqual({
      ok: true,
      value: { nr: 3, total: 5, type: 'gap', prompt: 'P', data: { a: 1 } },
    });
    expect(calls[0]?.fn).toBe('tutorial_question');
  });

  it('answerTutorial sends p_nr and p_answer and maps the result', async () => {
    const { client, calls } = fakeClient({
      data: { correct: false, hint: 'Think', answered: 2, done: false, coins: 0, reward: 0 },
    });
    const res = await answerTutorial(client, 3, ['a']);
    expect(calls).toEqual([{ fn: 'tutorial_answer', args: { p_nr: 3, p_answer: ['a'] } }]);
    expect(res).toEqual({
      ok: true,
      value: { correct: false, hint: 'Think', answered: 2, done: false, coins: 0 },
    });
  });

  it('answerTutorial gives a null hint when none is sent', async () => {
    const { client } = fakeClient({ data: { correct: true, answered: 5, done: true, coins: 50 } });
    const res = await answerTutorial(client, 5, 'x');
    expect(res).toEqual({ ok: true, value: { correct: true, hint: null, answered: 5, done: true, coins: 50 } });
  });

  it('answerTutorial explains a stale question in German', async () => {
    const { client } = fakeClient({ error: { message: 'not the current question', code: '22023' } });
    const res = await answerTutorial(client, 1, 'x');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Frage/);
  });
});

describe('tutorial house rpcs', () => {
  it('buyTutorialHouse calls tutorial_buy_house and returns the coins', async () => {
    const { client, calls } = fakeClient({ data: { coins: 0, qty: 1 } });
    expect(await buyTutorialHouse(client)).toEqual({ ok: true, value: { coins: 0, qty: 1 } });
    expect(calls[0]?.fn).toBe('tutorial_buy_house');
  });

  it('buyTutorialHouse explains missing coins in German', async () => {
    const { client } = fakeClient({ error: { message: 'not enough coins', code: '22023' } });
    const res = await buyTutorialHouse(client);
    expect(res).toEqual({ ok: false, message: 'Dafür hast du noch nicht genug Münzen.' });
  });

  it('placeTutorialHouse calls tutorial_place_house', async () => {
    const { client, calls } = fakeClient({ data: 7 });
    expect(await placeTutorialHouse(client)).toEqual({ ok: true, value: 7 });
    expect(calls[0]?.fn).toBe('tutorial_place_house');
  });

  it('placeTutorialHouse reports failures in German', async () => {
    const { client } = fakeClient({ error: { message: 'not at this step', code: '22023' } });
    const res = await placeTutorialHouse(client);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/Schritt/);
  });
});
