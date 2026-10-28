// Spooky English Quiz (SPOOKY_STARTER §7, package S2): ten private questions, 10 XP per first
// correct answer and a 50 XP completion bonus, exactly once per pupil and season.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000031';
const B = '00000000-0000-0000-0000-000000000032';
const SEASON = '2026-11-halloween';
const SOLUTIONS: Record<string, string> = {
  'odd-characters': 'bicycle',
  'odd-animals': 'pumpkin',
  'scarier-than': 'scarier',
  'biggest-pumpkin': 'biggest',
  'british-american-sweets': 'candy',
  'british-american-colour': "The ghost's favorite color is green.",
  'listen-trick-or-treat': "Süßes, sonst gibt's Saures!",
  'listen-happy-halloween': 'Fröhliches Halloween!',
  'listen-dressing-up': 'Als was verkleidest du dich?',
  'listen-sweets': 'Möchtest du ein paar Süßigkeiten?',
};
let db: PGlite;

type Row = Record<string, unknown>;
async function actor(id: string | null): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id ?? ''}',false); set role ${id ? 'authenticated' : 'anon'};`,
  );
}
async function read(): Promise<Row> {
  return (await db.query<{ v: Row }>('select public.my_season_starter($1) v', [SEASON])).rows[0].v;
}
async function answer(question: string, value: string): Promise<Row> {
  return (
    await db.query<{ v: Row }>('select public.submit_season_starter_answer($1,$2,$3) v', [
      SEASON,
      question,
      value,
    ])
  ).rows[0].v;
}
async function starterXp(player: string): Promise<number> {
  await db.exec('reset role;');
  return (
    await db.query<{ total: number }>(
      `select coalesce(sum(delta),0)::int total from public.xp_ledger
       where player_id = $1 and ref like 'season-starter:%'`,
      [player],
    )
  ).rows[0].total;
}
async function setWindow(from: number, to: number, closed = false): Promise<void> {
  await db.exec(`reset role; update public.seasons set starts_on = public.season_today() + (${from}),
    ends_on = public.season_today() + (${to}), closed_at = ${closed ? 'now()' : 'null'} where id = '${SEASON}';`);
}

describe('season starter quiz', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    }
    await db.exec(`insert into auth.users values('${T}'),('${A}'),('${B}');
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher');
      insert into public.profiles(id,nickname,class_id,plot_index) values
        ('${A}','anna','8a',0),('${B}','ben','8b',0);`);
    await setWindow(-1, 1);
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });

  it('reads ten questions in order without solutions or hints', async () => {
    await actor(A);
    const state = await read();
    expect(state).toMatchObject({
      seasonId: SEASON,
      state: 'running',
      solved: 0,
      total: 10,
      completed: false,
    });
    expect(state.awardedXp).toBe(0);
    const questions = state.questions as Row[];
    expect(questions.map((q) => q.id)).toEqual(Object.keys(SOLUTIONS));
    for (const q of questions) {
      expect(q).not.toHaveProperty('solution');
      expect(q).not.toHaveProperty('hint');
      expect((q.options as string[]).length).toBeGreaterThanOrEqual(3);
      expect(q.solved).toBe(false);
    }
    const listening = questions.filter((q) => q.type === 'listening');
    expect(listening).toHaveLength(4);
    expect(listening.map((q) => q.speak)).toEqual([
      'Trick or treat!',
      'Happy Halloween!',
      'What are you dressing up as?',
      'Would you like some sweets?',
    ]);
    expect(JSON.stringify(state)).not.toContain('Children say this');
  });

  it('refuses anonymous callers, teachers and direct table access', async () => {
    await actor(null);
    await expect(read()).rejects.toThrow();
    await actor(T);
    await expect(read()).rejects.toThrow(/pupils/);
    await expect(answer('odd-animals', 'pumpkin')).rejects.toThrow(/pupils/);
    await actor(A);
    await expect(db.query('select * from public.season_starter_questions')).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query(`insert into public.season_starter_results(player_id,season_id,question_id)
        values('${A}','${SEASON}','odd-animals')`),
    ).rejects.toThrow(/permission denied/);
  });

  it('gives a hint for a wrong answer and books nothing', async () => {
    await actor(A);
    const result = await answer('odd-characters', 'ghost');
    expect(result).toMatchObject({ correct: false, alreadySolved: false, awardedXp: 0, solved: 0 });
    expect(result.hint).toBe('You can ride one of these.');
    expect(await starterXp(A)).toBe(0);
  });

  it('books 10 XP once for the first correct answer and nothing on a repeat', async () => {
    await actor(A);
    const first = await answer('odd-characters', ' Bicycle ');
    expect(first).toMatchObject({
      correct: true,
      alreadySolved: false,
      awardedXp: 10,
      solved: 1,
      hint: null,
    });
    expect((first.progress as Row).gained).toEqual([{ reason: 'quest', xp: 10 }]);
    const again = await answer('odd-characters', 'bicycle');
    expect(again).toMatchObject({ correct: true, alreadySolved: true, awardedXp: 0, solved: 1 });
    expect(await starterXp(A)).toBe(10);
    await actor(A);
    const state = await read();
    expect(state).toMatchObject({ solved: 1, awardedXp: 10 });
    expect((state.questions as Row[])[0]).toMatchObject({ id: 'odd-characters', solved: true });
  });

  it('completes with exactly 150 XP, reaches tier 5 and lets the pass claim it', async () => {
    await actor(A);
    let last: Row = {};
    for (const [id, solution] of Object.entries(SOLUTIONS)) last = await answer(id, solution);
    expect(last).toMatchObject({
      correct: true,
      solved: 10,
      completed: true,
      completionBonusXp: 50,
      awardedXp: 60,
    });
    expect(last.seasonXp).toBe(150);
    expect(last.reachedTier).toBeGreaterThanOrEqual(5);
    const repeat = await answer('listen-sweets', SOLUTIONS['listen-sweets']);
    expect(repeat).toMatchObject({ alreadySolved: true, awardedXp: 0, completionBonusXp: 0 });
    expect(await starterXp(A)).toBe(150);
    await actor(A);
    expect(await read()).toMatchObject({ solved: 10, completed: true, awardedXp: 150 });
    const claim = (await db.query<{ v: Row }>('select public.claim_season_tier(5) v')).rows[0].v;
    expect(claim).toBeTruthy();
    // No coins from the quiz itself.
    await db.exec('reset role;');
    const coins = (
      await db.query<{ n: number }>(
        `select count(*)::int n from public.coin_ledger where player_id = $1 and ref like 'season-starter:%'`,
        [A],
      )
    ).rows[0].n;
    expect(coins).toBe(0);
  });

  it('keeps every pupil on their own progress', async () => {
    await actor(B);
    expect(await read()).toMatchObject({ solved: 0, awardedXp: 0, completed: false });
    expect(await answer('odd-animals', 'pumpkin')).toMatchObject({ correct: true, awardedXp: 10 });
    expect(await starterXp(B)).toBe(10);
    expect(await starterXp(A)).toBe(150);
  });

  it('rejects unknown questions', async () => {
    await actor(B);
    await expect(answer('no-such-question', 'x')).rejects.toThrow(/question/);
  });

  it('books nothing before the season starts or after it ends, but stays readable', async () => {
    for (const [from, to, closed, state] of [
      [1, 9, false, 'upcoming'],
      [-9, -1, false, 'ended'],
      [-1, 1, true, 'closed'],
    ] as const) {
      await setWindow(from, to, closed);
      await actor(B);
      expect(await read()).toMatchObject({ state, solved: 1 });
      await expect(answer('scarier-than', 'scarier')).rejects.toThrow(/not running/);
    }
    await setWindow(-1, 1);
    expect(await starterXp(B)).toBe(10);
  });
});
