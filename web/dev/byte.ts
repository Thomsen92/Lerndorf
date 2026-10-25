// Development-only quest fixtures. No real account or backend changes.
import type { SupabaseClient } from '@supabase/supabase-js';
import { openDailyQuests } from '../src/ui/dailyQuestsView';
const quests = [
  {
    key: 'q1',
    day: '2026-10-25',
    catch_up: false,
    type: 'choice',
    prompt: 'Choose the animal.',
    data: { options: ['cat', 'car'] },
    solved: false,
    attempts: 0,
    reward: 10,
    reward_left: 10,
  },
  {
    key: 'q2',
    day: '2026-10-25',
    catch_up: false,
    type: 'gap',
    prompt: 'She ___ a book.',
    data: {},
    solved: false,
    attempts: 0,
    reward: 10,
    reward_left: 10,
  },
  {
    key: 'q3',
    day: '2026-10-25',
    catch_up: false,
    type: 'listening',
    prompt: 'Listen. Choose the colour.',
    data: { speak: 'The sky is blue.', mode: 'choice', options: ['blue', 'red'] },
    solved: false,
    attempts: 0,
    reward: 10,
    reward_left: 10,
  },
];
let coins = 42;
const fake = {
  rpc: async (name: string, args: { p_key: string; p_answer: unknown }) => {
    await new Promise((r) => setTimeout(r, 120));
    if (name === 'my_daily_quests') return { data: structuredClone(quests), error: null };
    const q = quests.find((q) => q.key === args.p_key)!;
    const correct =
      String(args.p_answer) === ({ q1: 'cat', q2: 'reads', q3: 'blue' } as Record<string, string>)[q.key];
    q.attempts++;
    if (correct && !q.solved) {
      q.solved = true;
      coins += 10;
    }
    return {
      data: {
        correct,
        already_solved: false,
        coins,
        reward: correct ? 10 : 0,
        reward_left: correct ? 0 : 10,
        hint: correct ? null : 'Try again.',
      },
      error: null,
    };
  },
} as unknown as SupabaseClient;
let handle: ReturnType<typeof openDailyQuests>;
handle = openDailyQuests({ supabase: fake, coins, onCoins: () => undefined, onClose: () => handle.close() });
