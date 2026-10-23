// SQL tests for migration 0019 (part 3): tutorial_continue, tutorial_question, tutorial_answer (quiz, 50 coins).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const MIGRATIONS = [
  '0001_schema.sql',
  '0002_rls.sql',
  '0003_seed.sql',
  '0004_rpc_teacher.sql',
  '0005_grants_hardening.sql',
  '0006_avatar_shop_build.sql',
  '0007_tasks_rpc.sql',
  '0008_teacher_stats_catalog.sql',
  '0009_instances.sql',
  '0010_layout_maps.sql',
  '0011_instance_rules.sql',
  '0012_claim_plot.sql',
  '0013_plot_slots.sql',
  '0014_cat_sign_shop_asset.sql',
  '0015_daily_quests.sql',
  '0016_daily_quests_rpc.sql',
  '0017_daily_quests_teacher.sql',
  '0018_character_choice.sql',
  '0019_first_login_tutorial.sql',
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';
const CARLA = '00000000-0000-0000-0000-000000000013';

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;
const SUPABASE_DEFAULT_PRIVILEGES = `
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated;
`;

let db: PGlite;
const asSuperuser = async (sql: string): Promise<void> => {
  await db.exec(`reset role; ${sql}`);
};
const asUser = async (uid: string): Promise<void> => {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
};
const expectError = async (sql: string, message: RegExp, code?: string): Promise<void> => {
  try {
    await db.query(sql);
  } catch (e) {
    expect((e as Error).message).toMatch(message);
    if (code) expect((e as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected an error for: ${sql}`);
};
type Ans = { correct: boolean; hint: string | null; answered: number; done: boolean; coins: number; reward: number };
const answer = async (uid: string, nr: number, a: unknown): Promise<Ans> => {
  await asUser(uid);
  const r = await db.query<{ r: Ans }>('select tutorial_answer($1, $2::jsonb) as r', [nr, JSON.stringify(a)]);
  return r.rows[0].r;
};
const question = async (uid: string): Promise<Record<string, unknown>> => {
  await asUser(uid);
  const r = await db.query<{ q: Record<string, unknown> }>('select tutorial_question() as q');
  return r.rows[0].q;
};
const GOOD: unknown[] = [
  'house',
  'is',
  'red',
  [
    ['dog', 'Hund'],
    ['cat', 'Katze'],
    ['bird', 'Vogel'],
  ],
  'your new neighbour',
];

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    if (file === '0002_rls.sql') await db.exec(SUPABASE_DEFAULT_GRANTS);
    if (file === '0015_daily_quests.sql') await db.exec(SUPABASE_DEFAULT_PRIVILEGES);
    await db.exec(sql);
  }
  await asSuperuser(`
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}'), ('${BEN}'), ('${CARLA}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', null, 0),
      ('${BEN}', 'ben', 'student', '8a', null, 0),
      ('${CARLA}', 'carla', 'student', '8a', null, 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('tutorial_continue', () => {
  it('is refused before tutorial_start (no plot, no progress row)', async () => {
    await asUser(ANNA);
    await expectError(`select tutorial_continue('intro')`, /not at this step/, '22023');
  });

  it('moves intro to quiz once the plot is assigned', async () => {
    await asUser(ANNA);
    await db.query('select tutorial_start()');
    const r = await db.query<{ s: { step: string; plot_index: number } }>(`select tutorial_continue('intro') as s`);
    expect(r.rows[0].s).toMatchObject({ step: 'quiz', plot_index: 0 });
  });

  it('only accepts p_from = intro and the matching step', async () => {
    await asUser(ANNA);
    await expectError(`select tutorial_continue('intro')`, /not at this step/, '22023'); // already quiz
    await expectError(`select tutorial_continue('quiz')`, /not at this step/, '22023');
  });

  it('the teacher cannot continue', async () => {
    await asUser(TEACHER);
    await expectError(`select tutorial_continue('intro')`, /forbidden/, '42501');
  });
});

describe('tutorial_question', () => {
  it('is refused outside the quiz step', async () => {
    await asUser(BEN);
    await db.query('select tutorial_start()');
    await expectError('select tutorial_question()', /not in the quiz/, '22023');
  });

  it('returns question 1 without solution or hint', async () => {
    const q = await question(ANNA);
    expect(q).toEqual({
      nr: 1,
      total: 5,
      type: 'choice',
      prompt: "What is 'Haus' in English?",
      data: { options: ['house', 'mouse', 'horse'] },
    });
    expect(JSON.stringify(q)).not.toMatch(/solution|hint|You live/);
  });
});

describe('tutorial_answer', () => {
  it('a wrong answer gives the hint, counts nothing and can be repeated', async () => {
    for (let i = 0; i < 4; i++) {
      const r = await answer(ANNA, 1, 'mouse');
      expect(r).toMatchObject({ correct: false, hint: 'You live in it.', answered: 0, done: false, reward: 0 });
    }
  });

  it('the answer must belong to the current question', async () => {
    await asUser(ANNA);
    await expectError(`select tutorial_answer(2, '"is"'::jsonb)`, /not the current question/, '22023');
    await expectError(`select tutorial_answer(5, '"x"'::jsonb)`, /not the current question/, '22023');
  });

  it('a correct answer advances; the next question follows', async () => {
    const r = await answer(ANNA, 1, 'House ');
    expect(r).toMatchObject({ correct: true, hint: null, answered: 1, done: false, coins: 0, reward: 0 });
    expect((await question(ANNA)).nr).toBe(2);
    expect((await question(ANNA)).type).toBe('gap');
  });

  it('grades every type and pays 50 coins after the fifth', async () => {
    expect(await answer(ANNA, 2, 'are')).toMatchObject({ correct: false, hint: "Use a form of 'be'." });
    expect(await answer(ANNA, 2, GOOD[1])).toMatchObject({ correct: true, answered: 2 });
    expect(await answer(ANNA, 3, 'run')).toMatchObject({ correct: false, hint: 'Think of a tomato.' });
    expect(await answer(ANNA, 3, GOOD[2])).toMatchObject({ correct: true, answered: 3 });
    expect(await question(ANNA)).toMatchObject({ nr: 4, type: 'match' });
    const wrongPairs = [
      ['dog', 'Katze'],
      ['cat', 'Hund'],
      ['bird', 'Vogel'],
    ];
    expect(await answer(ANNA, 4, wrongPairs)).toMatchObject({ correct: false, hint: 'Think of animals.' });
    expect(await answer(ANNA, 4, GOOD[3])).toMatchObject({ correct: true, answered: 4 });
    const q5 = await question(ANNA);
    expect(q5).toMatchObject({ nr: 5, type: 'listening' });
    expect((q5.data as { speak: string }).speak).toBe('Hello! I am your new neighbour. Welcome to the village!');
    expect(await answer(ANNA, 5, 'your mum')).toMatchObject({
      correct: false,
      hint: 'Listen to the second sentence.',
      done: false,
    });
    const r = await answer(ANNA, 5, GOOD[4]);
    expect(r).toEqual({ correct: true, hint: null, answered: 5, done: true, coins: 50, reward: 50 });
  });

  it('booked once: ledger row, coins and step buy', async () => {
    await asSuperuser('');
    const l = await db.query<{ delta: number; ref: string }>(
      `select delta, ref from coin_ledger where player_id = '${ANNA}' and reason = 'tutorial'`,
    );
    expect(l.rows).toEqual([{ delta: 50, ref: 'tutorial' }]);
    const p = await db.query<{ coins: number }>(`select coins from profiles where id = '${ANNA}'`);
    expect(p.rows[0].coins).toBe(50);
    const t = await db.query<{ step: string; reward_paid: boolean; answered: number }>(
      `select step, reward_paid, answered from tutorial_progress where player_id = '${ANNA}'`,
    );
    expect(t.rows[0]).toEqual({ step: 'buy', reward_paid: true, answered: 5 });
  });

  it('repeating the fifth answer pays nothing more', async () => {
    const r = await answer(ANNA, 5, GOOD[4]);
    expect(r).toMatchObject({ correct: true, answered: 5, done: true, coins: 50, reward: 0 });
    await asSuperuser('');
    const p = await db.query<{ coins: number }>(`select coins from profiles where id = '${ANNA}'`);
    expect(p.rows[0].coins).toBe(50);
    const l = await db.query(`select 1 from coin_ledger where player_id = '${ANNA}' and reason = 'tutorial'`);
    expect(l.rows).toHaveLength(1);
  });

  it('tutorial_question is refused at step buy; other answers too', async () => {
    await asUser(ANNA);
    await expectError('select tutorial_question()', /not in the quiz/, '22023');
    await expectError(`select tutorial_answer(1, '"house"'::jsonb)`, /not the current question/, '22023');
  });

  it('is refused for a pupil still at intro and for the teacher', async () => {
    await asSuperuser(`insert into tutorial_progress (player_id) values ('${CARLA}')`);
    await asUser(CARLA);
    await expectError(`select tutorial_answer(1, '"house"'::jsonb)`, /not in the quiz/, '22023');
    await asUser(TEACHER);
    await expectError(`select tutorial_answer(1, '"house"'::jsonb)`, /forbidden/, '42501');
  });

  it('clients cannot write progress directly', async () => {
    await asUser(BEN);
    await expect(db.query(`update tutorial_progress set answered = 5`)).rejects.toThrow(/permission denied/);
  });
});
