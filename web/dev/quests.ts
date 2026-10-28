// Daily Quests screenshot harness. Development page only, not part of the app build
// (vite.config.ts builds index.html and lehrer/index.html only). `e2e/daily-quests.spec.ts`
// opens it through the Vite dev server. A fake Supabase client answers the RPCs with canned
// data, so the pupil area (?view=pupil) and the teacher panel (?view=teacher) render offline.
import type { SupabaseClient } from '@supabase/supabase-js';
import { openDailyQuests } from '../src/ui/dailyQuestsView';
import { createSound } from '../src/ui/sound';
import { renderQuestPanel } from '../src/teacher/questsView';

const QUESTS = [
  {
    key: '2026-11-09-mon-1',
    day: '2026-11-09',
    catch_up: false,
    type: 'choice',
    prompt: "What is 'Fahrkarte' in English?",
    data: { options: ['card', 'ticket', 'fare', 'map'] },
    reward: 5,
    reward_left: 0,
    solved: true,
    attempts: 1,
  },
  {
    key: '2026-11-09-mon-2',
    day: '2026-11-09',
    catch_up: false,
    type: 'listening',
    prompt: 'Listen. Where does Tom want to go?',
    data: {
      speak: 'Excuse me, how do I get to the Empire State Building?',
      mode: 'choice',
      options: ['Central Park', 'Empire State Building', 'Brooklyn Bridge'],
    },
    reward: 10,
    reward_left: 10,
    solved: false,
    attempts: 0,
  },
  {
    key: '2026-11-09-mon-3',
    day: '2026-11-09',
    catch_up: false,
    type: 'match',
    prompt: 'Match the words.',
    data: { left: ['bridge', 'subway', 'block'], right: ['U-Bahn', 'Häuserblock', 'Brücke'] },
    reward: 10,
    reward_left: 10,
    solved: false,
    attempts: 0,
  },
  {
    key: '2026-11-08-sun-1',
    day: '2026-11-08',
    catch_up: true,
    type: 'gap',
    prompt: 'Yesterday we ___ to Brooklyn.',
    data: { bank: ['go', 'went', 'gone'] },
    reward: 10,
    reward_left: 5,
    solved: false,
    attempts: 0,
  },
  {
    key: '2026-11-08-sun-2',
    day: '2026-11-08',
    catch_up: true,
    type: 'order',
    prompt: 'Put the words in the right order.',
    data: { words: ['subway', 'the', 'took', 'We'] },
    reward: 8,
    reward_left: 2,
    solved: false,
    attempts: 3,
  },
];

/** What the fake server accepts (the real one checks in the database, never in the browser). */
const SOLUTIONS: Record<string, { solution: unknown; hint: string }> = {
  '2026-11-09-mon-1': { solution: 'ticket', hint: 'It is a small paper for the bus.' },
  '2026-11-09-mon-2': { solution: 'Empire State Building', hint: 'Listen for a very tall building.' },
  '2026-11-09-mon-3': {
    solution: [
      ['bridge', 'Brücke'],
      ['subway', 'U-Bahn'],
      ['block', 'Häuserblock'],
    ],
    hint: 'Look at the first letters.',
  },
  '2026-11-08-sun-1': { solution: 'went', hint: 'Think of the past of go.' },
  '2026-11-08-sun-2': { solution: ['We', 'took', 'the', 'subway'], hint: 'Start with who did it.' },
};

/** Same order of pairs does not matter for match; everything else must be equal. */
function matches(answer: unknown, solution: unknown): boolean {
  if (Array.isArray(solution) && Array.isArray(solution[0])) {
    const key = (pairs: unknown) =>
      JSON.stringify(((pairs as string[][]) ?? []).map((p) => p.join('→')).sort());
    return key(answer) === key(solution);
  }
  return JSON.stringify(answer) === JSON.stringify(solution);
}

let coins = 42;
/** Coin rule D11 (migration 0053): tries 1 and 2 in full, later half (rounded up); catch-up half. */
function rewardFor(q: (typeof QUESTS)[number], attempt: number): number {
  const nominal = q.catch_up ? Math.ceil(q.reward / 2) : q.reward;
  return attempt <= 2 ? nominal : Math.ceil(nominal / 2);
}

function submit(args: { p_key: string; p_answer: unknown }) {
  const q = QUESTS.find((x) => x.key === args.p_key);
  const s = SOLUTIONS[args.p_key];
  if (!q || !s) return { data: null, error: { message: 'quest not open' } };
  if (q.solved) {
    return {
      data: { correct: true, already_solved: true, coins, reward: 0, reward_left: 0, hint: null },
      error: null,
    };
  }
  q.attempts += 1;
  if (matches(args.p_answer, s.solution)) {
    const reward = rewardFor(q, q.attempts);
    coins += reward;
    q.solved = true;
    q.reward_left = 0;
    return {
      data: { correct: true, already_solved: false, coins, reward, reward_left: 0, hint: null },
      error: null,
    };
  }
  q.reward_left = rewardFor(q, q.attempts + 1);
  return {
    data: {
      correct: false,
      already_solved: false,
      coins,
      reward: 0,
      reward_left: q.reward_left,
      hint: s.hint,
    },
    error: null,
  };
}

const STATUS = {
  today: '2026-11-09',
  covered_until: '2026-11-15',
  today_missing: false,
  tomorrow_missing: false,
  imports: [
    {
      week: '2026-11-09',
      ok: true,
      holiday: false,
      errors: [],
      quest_count: 21,
      imported_at: '2026-11-06T18:00:00Z',
    },
    {
      week: '2026-12-21',
      ok: true,
      holiday: true,
      errors: [],
      quest_count: 0,
      imported_at: '2026-11-06T18:00:00Z',
    },
    {
      week: '2026-11-16',
      ok: false,
      holiday: false,
      errors: ['days[1].quests[1].hint: darf nicht leer sein'],
      quest_count: 0,
      imported_at: '2026-11-07T09:00:00Z',
    },
  ],
};

const PREVIEW = [
  {
    key: '2026-11-09-mon-1',
    day: '2026-11-09',
    slot: 1,
    type: 'choice',
    prompt: "What is 'Fahrkarte' in English?",
    data: { options: ['card', 'ticket', 'fare', 'map'] },
    hint: 'It is a small paper for the bus.',
    reward: 5,
    solution: 'ticket',
  },
  {
    key: '2026-11-09-mon-2',
    day: '2026-11-09',
    slot: 2,
    type: 'listening',
    prompt: 'Listen. Where does Tom want to go?',
    data: { speak: 'Excuse me, how do I get to the Empire State Building?', mode: 'choice' },
    hint: 'Listen for a very tall building.',
    reward: 10,
    solution: 'Empire State Building',
  },
  {
    key: '2026-11-10-tue-1',
    day: '2026-11-10',
    slot: 1,
    type: 'match',
    prompt: 'Match the words.',
    data: {},
    hint: 'Look at the first letters.',
    reward: 10,
    solution: [
      ['bridge', 'Brücke'],
      ['subway', 'U-Bahn'],
    ],
  },
  {
    key: '2026-11-10-tue-2',
    day: '2026-11-10',
    slot: 2,
    type: 'gap',
    prompt: 'Yesterday we ___ to Brooklyn.',
    data: {},
    hint: 'Think of the past of go.',
    reward: 10,
    solution: ['went'],
  },
];

const RESULTS: Record<string, unknown> = {
  quest_status: STATUS,
  teacher_quest_preview: PREVIEW,
};

const fake = {
  rpc: (fn: string, args: Record<string, unknown> = {}) => {
    // a little delay, like a real network, so the busy state can be seen
    const wait = new Promise((r) => setTimeout(r, 200));
    if (fn === 'submit_quest_answer')
      return wait.then(() => submit(args as { p_key: string; p_answer: unknown }));
    if (fn === 'my_daily_quests') return Promise.resolve({ data: structuredClone(QUESTS), error: null });
    return Promise.resolve({ data: structuredClone(RESULTS[fn] ?? null), error: null });
  },
} as unknown as SupabaseClient;

const view = new URLSearchParams(location.search).get('view') ?? 'pupil';
if (new URLSearchParams(location.search).has('nospeech')) {
  // like a tablet without speech output: the listening quest falls back to text
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
}

const app = document.getElementById('app') as HTMLElement;
if (view === 'teacher') {
  document.body.classList.add('teacher-page');
  void renderQuestPanel(fake).then((html) => {
    app.innerHTML = `<main class="teacher" id="teacherMain">${html}</main>`;
    document.body.dataset.ready = 'true';
  });
} else {
  // the game's sound, so answer sounds and the quiz loop can be heard here too (after the first tap)
  const sound = createSound();
  sound.setMusic('village');
  for (const event of ['pointerdown', 'keydown']) window.addEventListener(event, () => sound.unlock());
  openDailyQuests({
    supabase: fake,
    coins,
    onCoins: () => undefined,
    onClose: () => undefined,
    sound,
    spookyQuiz: () => (document.body.dataset.spooky = 'opened'),
  });
  document.body.dataset.ready = 'true';
}
