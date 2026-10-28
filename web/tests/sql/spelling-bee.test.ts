// Spelling Bee (migration 0057, teacher 28.10.2026): one puzzle a day, words checked on the server,
// 3 rewarded rounds per day (4-10 coins, 10-30 XP by score), weekly high score list of both classes.
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000041';
const B = '00000000-0000-0000-0000-000000000042';
const C = '00000000-0000-0000-0000-000000000043';
const D = '00000000-0000-0000-0000-000000000044';
let db: PGlite;

type Row = Record<string, unknown>;
async function actor(id: string | null): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id ?? ''}',false); set role ${id ? 'authenticated' : 'anon'};`,
  );
}
async function call(sql: string, params: unknown[] = []): Promise<Row> {
  return (await db.query<{ v: Row }>(`select ${sql} v`, params)).rows[0].v;
}
async function puzzle(): Promise<{ id: number; center: string; letters: string; words: string[] }> {
  await db.exec('reset role;');
  return (
    await db.query<{ id: number; center: string; letters: string; words: string[] }>(
      'select id, center, letters, words from public.spelling_puzzles where id = public.spelling_puzzle_for(public.quest_today())',
    )
  ).rows[0];
}
async function goldenWord(p: { id: number }): Promise<string> {
  await db.exec('reset role;');
  return (await db.query<{ w: string }>('select public.spelling_golden($1, public.quest_today()) w', [p.id]))
    .rows[0].w;
}
async function coins(player: string): Promise<number> {
  await db.exec('reset role;');
  return (await db.query<{ c: number }>('select coins c from public.profiles where id = $1', [player]))
    .rows[0].c;
}
async function play(player: string, words: string[]): Promise<Row> {
  await actor(player);
  const round = await call('public.spelling_start()');
  return call('public.spelling_finish($1, $2)', [round.round, words]);
}

describe('spelling bee', () => {
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
    await db.exec(`insert into auth.users values('${T}'),('${A}'),('${B}'),('${C}'),('${D}');
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher');
      insert into public.profiles(id,nickname,class_id,plot_index) values
        ('${A}','anna','8a',0),('${B}','ben','8b',0),('${C}','cleo','8a',1),('${D}','dana','8b',1);`);
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });

  it('every puzzle is solvable: seven letters, the centre in every word, at least one pangram', async () => {
    await db.exec('reset role;');
    const rows = (
      await db.query<{ center: string; letters: string; words: string[]; max_points: number }>(
        'select center, letters, words, max_points from public.spelling_puzzles order by id',
      )
    ).rows;
    expect(rows.length).toBeGreaterThanOrEqual(30);
    for (const p of rows) {
      const all = new Set(p.center + p.letters);
      expect(all.size).toBe(7);
      for (const w of p.words) {
        expect(w.length).toBeGreaterThanOrEqual(4);
        expect(w).toContain(p.center);
        expect([...w].every((c) => all.has(c))).toBe(true);
      }
      expect(p.words.some((w) => new Set(w).size === 7)).toBe(true);
    }
    const missing = await db.query(
      `select d from generate_series(date '2026-10-26', date '2026-12-31', interval '1 day') d
       where public.spelling_golden(public.spelling_puzzle_for(d::date), d::date) is null`,
    );
    expect(missing.rows).toEqual([]);
  });

  it('shows letters and salted hashes, never the words; the hash can be rebuilt in the browser', async () => {
    const p = await puzzle();
    await actor(A);
    const state = await call('public.spelling_state()');
    const pz = state.puzzle as Row;
    expect(pz.center).toBe(p.center);
    expect((pz.letters as string[]).join('')).toBe(p.letters);
    expect(pz.word_count).toBe(p.words.length);
    expect(JSON.stringify(state)).not.toContain(`"${p.words[0]}"`);
    const hash = createHash('sha256')
      .update(`lerndorf-spelling:${p.id}:${p.words[0]}`)
      .digest('hex')
      .slice(0, 16);
    expect(pz.hashes).toContain(hash);
    expect(state).toMatchObject({ round_seconds: 180, free_rounds: 3, rewarded_left: 3 });
  });

  it('starts with a practice round: 5 minutes, the two shortest words as help, a bonus outside the 3 rounds', async () => {
    const p = await puzzle();
    await actor(A);
    expect((await call('public.spelling_state()')).tutorial).toBe(true);
    const round = await call('public.spelling_start()');
    const shortest = p.words.slice().sort((a, b) => a.length - b.length || a.localeCompare(b));
    expect(round).toMatchObject({ tutorial: true, seconds: 300, rewarded: true, rewarded_left: 3 });
    expect(round.hints).toEqual(shortest.slice(0, 2));
    const before = await coins(A);
    await actor(A);
    const result = await call('public.spelling_finish($1, $2)', [round.round, round.hints]);
    expect(result.rewarded).toBe(true);
    expect(result.coins_gained).toBeGreaterThan(0);
    expect(result.rewarded_left).toBe(3);
    expect(await coins(A)).toBe(before + (result.coins_gained as number));
    await actor(A);
    expect((await call('public.spelling_state()')).tutorial).toBe(false);
    const normal = await call('public.spelling_start()');
    expect(normal).toMatchObject({ tutorial: false, seconds: 180, hints: [] });
    await call('public.spelling_finish($1, $2)', [normal.round, []]); // 0 points, uses a rewarded round
    await db.exec(
      `reset role; update public.spelling_rounds set rewarded = false where id = ${normal.round};`,
    );
  });

  it('pays the practice bonus only once, even with two practice rounds open', async () => {
    const p = await puzzle();
    await actor(C);
    const one = await call('public.spelling_start()');
    const two = await call('public.spelling_start()');
    expect([one.tutorial, two.tutorial]).toEqual([true, true]);
    const first = await call('public.spelling_finish($1, $2)', [one.round, p.words.slice(0, 3)]);
    const second = await call('public.spelling_finish($1, $2)', [two.round, p.words.slice(0, 3)]);
    expect(first.coins_gained).toBeGreaterThan(0);
    expect(second.rewarded).toBe(false);
    expect(second.coins_gained).toBe(0);
  });

  it('scores only real words once (4 letters 1 point, longer 1 per letter, pangram +7) and pays by tier', async () => {
    const p = await puzzle();
    const four = p.words.find((w) => w.length === 4)!;
    const pangram = p.words.find((w) => new Set(w).size === 7)!;
    const before = await coins(A);
    const result = await play(A, [four, four.toUpperCase(), ' ' + pangram, 'zzzz', p.center.repeat(5)]);
    const golden = await goldenWord(p);
    const factor = (w: string) => (w === golden ? 2 : 1);
    expect(result.score).toBe(1 * factor(four) + (pangram.length + 7) * factor(pangram));
    expect(result.words).toEqual([four, pangram].sort());
    expect(result.rewarded).toBe(true);
    const score = result.score as number;
    const tier = score < 10 ? [4, 10] : score < 25 ? [6, 16] : score < 40 ? [8, 24] : [10, 30];
    expect([result.coins_gained, result.xp_gained]).toEqual(tier);
    expect(await coins(A)).toBe(before + tier[0]);
    expect(result.rewarded_left).toBe(2);
    await db.exec('reset role;');
    const xp = await db.query<{ n: number }>(
      `select count(*)::int n from public.xp_ledger where player_id = $1 and ref like 'spelling:%'`,
      [A],
    );
    expect(xp.rows[0].n).toBe(2); // practice round + this round
  });

  it('pays only 3 rounds a day; an abandoned rewarded round still uses its slot', async () => {
    const p = await puzzle();
    await actor(A);
    await call('public.spelling_start()'); // abandoned
    await play(A, [p.words[0]]); // third rewarded round
    const before = await coins(A);
    const fourth = await play(A, p.words);
    expect(fourth.rewarded).toBe(false);
    expect(fourth.coins_gained).toBe(0);
    expect(fourth.score).toBeGreaterThan(0);
    expect(await coins(A)).toBe(before);
    expect(fourth.rewarded_left).toBe(0);
  });

  it('refuses a second finish, a stranger, a late round and the teacher', async () => {
    await actor(B);
    const round = await call('public.spelling_start()');
    await actor(A);
    await expect(call('public.spelling_finish($1, $2)', [round.round, ['x']])).rejects.toThrow(/not found/);
    await actor(B);
    await db.exec(
      `reset role; update public.spelling_rounds set ends_at = now() - interval '1 minute' where id = ${round.round};`,
    );
    await actor(B);
    const p = await puzzle();
    await actor(B);
    const late = await call('public.spelling_finish($1, $2)', [round.round, p.words]);
    expect(late.score).toBe(0);
    expect(late.coins_gained).toBe(0);
    await expect(call('public.spelling_finish($1, $2)', [round.round, p.words])).rejects.toThrow(
      /already finished/,
    );
    await actor(T);
    await expect(call('public.spelling_start()')).rejects.toThrow(/only pupils/);
    await actor(A);
    await expect(db.query('select * from public.spelling_puzzles')).rejects.toThrow();
    await expect(db.query('select * from public.spelling_rounds')).rejects.toThrow();
  });

  it('lists the best score of the week of both classes, best first, with the own place', async () => {
    const p = await puzzle();
    await play(B, [p.words[0]]);
    await actor(B);
    const board = (await call('public.spelling_state()')).board as Row;
    const top = board.top as Row[];
    expect(top.map((r) => r.nickname)).toEqual(['anna', 'cleo', 'ben']);
    expect(top.map((r) => r.class)).toEqual(['8a', '8a', '8b']);
    expect(top[2].me).toBe(true);
    expect((board.me as Row).rank).toBe(3);
  });

  it('has one golden word a day that counts double; the browser only learns its hash', async () => {
    const p = await puzzle();
    await db.exec('reset role;');
    const golden = await goldenWord(p);
    expect(golden.length).toBeGreaterThanOrEqual(5);
    expect(p.words).toContain(golden);
    await actor(D);
    const state = await call('public.spelling_state()');
    const hash = createHash('sha256')
      .update(`lerndorf-spelling:${p.id}:${golden}`)
      .digest('hex')
      .slice(0, 16);
    expect((state.puzzle as Row).golden).toBe(hash);
    expect(JSON.stringify(state)).not.toContain(`"${golden}"`);
    const points = golden.length + (new Set(golden + p.center).size === 7 ? 7 : 0);
    const result = await play(D, [golden]);
    expect(result.score).toBe(points * 2);
  });

  it('has three lists: best round this week, best round ever, all points of the week', async () => {
    await actor(A);
    await db.exec('reset role;');
    const sum = (
      await db.query<{ s: number }>(
        `select sum(score)::int s from public.spelling_rounds where player_id = $1 and finished_at is not null`,
        [A],
      )
    ).rows[0].s;
    await actor(A);
    const board = (await call('public.spelling_state()')).board as Row;
    const all = board.all as { top: Row[]; me: Row };
    const total = board.total as { top: Row[]; me: Row };
    expect(all.top.map((r) => r.nickname)).toEqual((board.top as Row[]).map((r) => r.nickname));
    expect(total.me.score).toBe(sum);
    expect(total.me.score as number).toBeGreaterThan((board.me as Row).score as number);
    expect(total.top[0]).toMatchObject({ nickname: 'anna', me: true });
  });
});
