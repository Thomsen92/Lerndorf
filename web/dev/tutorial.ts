// First-login tutorial screenshot harness. Development page only, not part of the app build.
// `e2e/tutorial.spec.ts` opens it through the Vite dev server. It mounts the real pupil village
// with a fake Supabase client that plays the tutorial RPCs of migration 0019 (same rules, no
// server). URL params: step, answered, char, wait (ms of fake latency), fail (rpc names, once).
import { mountVillage } from '../src/ui/villageView';

const q = new URLSearchParams(location.search);
const wait = Number(q.get('wait') ?? '150');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const QUESTIONS = [
  { nr: 1, type: 'choice', prompt: "What is 'Haus' in English?", data: { options: ['house', 'mouse', 'horse'] }, hint: 'You live in it.', sol: 'house' },
  { nr: 2, type: 'gap', prompt: 'My name ___ Tom.', data: {}, hint: "Use a form of 'be'.", sol: 'is' },
  { nr: 3, type: 'choice', prompt: 'Which word is a colour?', data: { options: ['red', 'run', 'rain'] }, hint: 'Think of a tomato.', sol: 'red' },
  { nr: 4, type: 'match', prompt: 'Match the animals.', data: { left: ['dog', 'cat', 'bird'], right: ['Vogel', 'Hund', 'Katze'] }, hint: 'Think of animals.', sol: JSON.stringify([['dog', 'Hund'], ['cat', 'Katze'], ['bird', 'Vogel']]) },
  { nr: 5, type: 'listening', prompt: 'Listen. Who is talking?', data: { speak: 'Hello! I am your new neighbour. Welcome to the village!', mode: 'choice', options: ['your new neighbour', 'your teacher', 'your mum'] }, hint: 'Listen to the second sentence.', sol: 'your new neighbour' },
];

const s = {
  step: q.get('step') ?? 'intro',
  answered: Number(q.get('answered') ?? '0'),
  character: q.get('char'),
  plot: q.get('step') && q.get('step') !== 'intro' ? 6 : (null as number | null),
  coins: q.get('step') === 'buy' ? 50 : 0,
  inventory: q.get('step') === 'place' ? 1 : 0,
  placed: false,
};
const fail = new Set((q.get('fail') ?? '').split(',').filter(Boolean));
const others = ['Biber', 'Dachs', 'Elster', 'Igel', 'Luchs', 'Otter'].map((n, i) => ({ id: `p${i}`, nickname: n, plot_index: i, avatar: { character: i % 2 ? 'girl' : 'boy' } }));
(window as unknown as { tut: typeof s }).tut = s;

const state = () => ({ needed: s.step !== 'done', step: s.step, plot_index: s.plot, character: s.character, answered: s.answered });
const err = (message: string) => ({ data: null, error: { message } });
const ok = (data: unknown) => ({ data, error: null });

async function rpc(fn: string, args: Record<string, unknown> = {}) {
  await sleep(wait);
  if (fail.has(fn)) {
    fail.delete(fn);
    return err('Failed to fetch');
  }
  switch (fn) {
    case 'tutorial_state':
      return ok(state());
    case 'tutorial_start':
      s.plot ??= 6;
      return ok(state());
    case 'tutorial_continue':
      if (s.step !== 'intro') return err('not at this step');
      s.step = 'quiz';
      return ok(state());
    case 'tutorial_question': {
      const x = QUESTIONS[s.answered];
      return ok({ nr: x.nr, total: 5, type: x.type, prompt: x.prompt, data: x.data });
    }
    case 'tutorial_answer': {
      const x = QUESTIONS[(args.p_nr as number) - 1];
      const a = args.p_answer;
      const right = typeof a === 'string' ? a.trim().toLowerCase() === x.sol : JSON.stringify(a) === x.sol;
      if (!right) return ok({ correct: false, hint: x.hint, answered: s.answered, done: false, coins: s.coins });
      s.answered += 1;
      if (s.answered === 5) {
        s.step = 'buy';
        s.coins += 50;
      }
      return ok({ correct: true, hint: null, answered: s.answered, done: s.answered === 5, coins: s.coins });
    }
    case 'tutorial_buy_house':
      s.coins -= 50;
      s.inventory = 1;
      s.step = 'place';
      return ok({ coins: s.coins, qty: 1 });
    case 'tutorial_place_house':
      s.placed = true;
      s.step = 'done';
      return ok(42);
    case 'tutorial_finish':
      return ok(state());
    case 'set_character':
      s.character = args.p_character as string;
      return ok(null);
    case 'village_members':
      return ok([...others, { id: 'u1', nickname: 'Fuchs', plot_index: s.plot, avatar: { character: s.character } }]);
    case 'my_daily_quests':
      return ok([]);
    default:
      return ok([]);
  }
}

function table(name: string) {
  const filters: Record<string, unknown> = {};
  let single = false;
  const rows = (): unknown[] => {
    switch (name) {
      case 'profiles':
        return [{ id: 'u1', nickname: 'Fuchs', class_id: '8a', plot_index: s.plot, coins: s.coins, avatar: { character: s.character } }];
      case 'classes':
        return [{ id: '8a', layout_seed: 8, map_id: 'tal', shop_open: false, build_open: false }];
      case 'placements':
        return s.placed ? [{ player_id: 'u1', item_id: 'house_fachwerk', slot: 'house', rot: 0 }] : [];
      case 'items':
        return [
          { id: 'house_fachwerk', kind: 'house', name_de: 'Fachwerkhaus', starter: false },
          { id: 'garage_holz', kind: 'garage', name_de: 'Holzgarage', starter: true },
        ];
      case 'inventory':
        return s.inventory > 0 ? [{ item_id: 'house_fachwerk', qty: s.inventory }] : [];
      default:
        return [];
    }
  };
  const b = {
    select: () => b,
    eq: (k: string, v: unknown) => ((filters[k] = v), b),
    in: () => b,
    gt: () => b,
    order: () => b,
    limit: () => b,
    single: () => ((single = true), b),
    then(res: (v: unknown) => void, rej: (e: unknown) => void) {
      return sleep(wait / 2)
        .then(() => {
          const r = rows().filter((row) => Object.entries(filters).every(([k, v]) => (row as Record<string, unknown>)[k] === undefined || (row as Record<string, unknown>)[k] === v));
          return single ? ok(r[0] ?? null) : ok(r);
        })
        .then(res, rej);
    },
  };
  return b;
}

const fake = {
  rpc,
  from: table,
  auth: {
    getUser: async () => ({ data: { user: { id: 'u1' } } }),
    getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  },
};

const root = document.getElementById('app') as HTMLElement;
void mountVillage(root, fake as never, () => {
  root.textContent = 'Abgemeldet.';
});
