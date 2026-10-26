import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, afterAll, expect, it } from 'vitest';
const A = '00000000-0000-0000-0000-000000000011';
const B = '00000000-0000-0000-0000-000000000012';
const C = '00000000-0000-0000-0000-000000000013';
let db: PGlite;
const dir = new URL('../../../supabase/migrations/', import.meta.url);
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
  for (const f of readdirSync(dir).filter(f => /^00\d\d_.*\.sql$/.test(f)).sort()) {
    if (f.startsWith('0021_')) {
      await db.exec(`insert into auth.users values ('${A}'),('${B}'),('${C}');
        insert into profiles(id,nickname,class_id,plot_index) values ('${A}','anna','8a',0),('${B}','ben','8a',1),('${C}','carla','8a',2);
        insert into tutorial_progress(player_id,step,answered,reward_paid) values
          ('${A}','quiz',0,false),('${B}','quiz',4,false),('${C}','done',5,true);`);
    }
    await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  }
});
afterAll(async () => { await db.close(); });
async function user(id = A) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`);
}
async function result(sql: string) {
  return (await db.query<{ v: Record<string, unknown> }>(`select ${sql} v`)).rows[0].v;
}
it('migrates unfinished and completed quizzes without reopening or paying them', async () => {
  await db.exec('reset role');
  const rows = (await db.query<{ step: string; answered: number; reward_paid: boolean }>('select step,answered,reward_paid from tutorial_progress order by player_id')).rows;
  expect(rows).toEqual([
    { step: 'quiz', answered: 0, reward_paid: false },
    { step: 'quiz', answered: 2, reward_paid: false },
    { step: 'done', answered: 3, reward_paid: true },
  ]);
  await user(B);
  expect(await result('tutorial_question()')).toMatchObject({ nr: 3, total: 3, type: 'listening' });
  await db.exec('reset role');
  expect((await db.query('select * from coin_ledger')).rows).toHaveLength(0);
});
it('offers exactly three tap questions, hides solutions, retries and pays the third once', async () => {
  await db.exec('reset role');
  expect((await db.query('select nr from tutorial_questions order by nr')).rows).toEqual([{ nr: 1 }, { nr: 2 }, { nr: 3 }]);
  await user();
  await expect(db.query('select * from tutorial_solutions')).rejects.toThrow(/permission denied/);
  for (const [i, answer] of ['house', 'is', 'your new neighbour'].entries()) {
    const q = await result('tutorial_question()');
    expect(q).toMatchObject({ nr: i + 1, total: 3, type: i === 2 ? 'listening' : 'choice' });
    expect(Object.keys(q).sort()).toEqual(['data', 'nr', 'prompt', 'total', 'type']);
    expect((q.data as { options: string[] }).options).toHaveLength(3);
    expect(await result(`tutorial_answer(${i + 1}, '"wrong"'::jsonb)`)).toMatchObject({ correct: false, done: false, coins: 0 });
    expect(await result(`tutorial_answer(${i + 1}, '${JSON.stringify(answer)}'::jsonb)`)).toMatchObject({ correct: true, done: i === 2, coins: i === 2 ? 50 : 0 });
  }
  expect(await result(`tutorial_answer(3, '"your new neighbour"'::jsonb)`)).toMatchObject({ done: true, coins: 50, reward: 0 });
  await expect(db.query(`select tutorial_answer(4, '"anything"'::jsonb)`)).rejects.toThrow(/not the current question/);
  await db.exec('reset role');
  expect((await db.query("select delta from coin_ledger where reason='tutorial'")).rows).toEqual([{ delta: 50 }]);
});
