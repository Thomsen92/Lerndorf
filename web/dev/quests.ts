// Daily Quests screenshot harness. Development page only, not part of the app build
// (vite.config.ts builds index.html and lehrer/index.html only). `e2e/daily-quests.spec.ts`
// opens it through the Vite dev server. A fake Supabase client answers the RPCs with canned
// data, so the pupil area (?view=pupil) and the teacher panel (?view=teacher) render offline.
import type { SupabaseClient } from '@supabase/supabase-js';
import { openDailyQuests } from '../src/ui/dailyQuestsView';
import { renderQuestPanel } from '../src/teacher/questsView';

const QUESTS = [
  {
    key: '2026-11-09:mon-1',
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
    key: '2026-11-09:mon-2',
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
    key: '2026-11-08:sun-1',
    day: '2026-11-08',
    catch_up: true,
    type: 'gap',
    prompt: 'Yesterday we ___ to Brooklyn.',
    data: {},
    reward: 5,
    reward_left: 5,
    solved: false,
    attempts: 0,
  },
  {
    key: '2026-11-08:sun-2',
    day: '2026-11-08',
    catch_up: true,
    type: 'order',
    prompt: 'Put the words in the right order.',
    data: { words: ['subway', 'the', 'took', 'We'] },
    reward: 8,
    reward_left: 0,
    solved: false,
    attempts: 3,
  },
];

const STATUS = {
  today: '2026-11-09',
  covered_until: '2026-11-15',
  today_missing: false,
  tomorrow_missing: false,
  imports: [
    { week: '2026-11-09', ok: true, holiday: false, errors: [], quest_count: 21, imported_at: '2026-11-06T18:00:00Z' },
    { week: '2026-12-21', ok: true, holiday: true, errors: [], quest_count: 0, imported_at: '2026-11-06T18:00:00Z' },
    {
      week: '2026-11-16',
      ok: false,
      holiday: false,
      errors: ['tue-2: hint is empty'],
      quest_count: 0,
      imported_at: '2026-11-07T09:00:00Z',
    },
  ],
};

const PREVIEW = [
  {
    key: '2026-11-09:mon-1',
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
    key: '2026-11-09:mon-2',
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
    key: '2026-11-10:tue-1',
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
    key: '2026-11-10:tue-2',
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
  my_daily_quests: QUESTS,
  submit_quest_answer: {
    correct: false,
    already_solved: false,
    coins: 42,
    reward: 0,
    reward_left: 10,
    hint: 'Listen for a very tall building.',
  },
  quest_status: STATUS,
  teacher_quest_preview: PREVIEW,
};

const fake = {
  rpc: (fn: string) => Promise.resolve({ data: structuredClone(RESULTS[fn] ?? null), error: null }),
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
  openDailyQuests({ supabase: fake, coins: 42, onCoins: () => undefined, onClose: () => undefined });
  document.body.dataset.ready = 'true';
}
