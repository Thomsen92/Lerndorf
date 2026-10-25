import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
const A = '00000000-0000-0000-0000-000000000011',
  B = '00000000-0000-0000-0000-000000000012';
let db: PGlite;
const dir = new URL('../../../supabase/migrations/', import.meta.url);
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(
    `create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create role anon; create role authenticated; create role service_role; grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated; alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`,
  );
  for (const f of readdirSync(dir)
    .filter((f) => /^00\d\d_.*\.sql$/.test(f))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  await db.exec(
    `insert into auth.users values ('${A}'),('${B}'); insert into profiles(id,nickname,class_id,plot_index) values ('${A}','anna','8a',0),('${B}','ben','8a',1);`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
async function root(sql = '') {
  await db.exec(`reset role; ${sql}`);
}
async function today(day: string) {
  await root(
    `create or replace function quest_today() returns date language sql stable as $$ select '${day}'::date $$;`,
  );
}
async function user() {
  await root(`select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
}
async function solve(key: string, answer = 'yes') {
  await user();
  return (
    await db.query<{ v: { progress: { gained: { reason: string; xp: number }[] }; correct: boolean } }>(
      `select submit_quest_answer('${key}','"${answer}"') v`,
    )
  ).rows[0].v;
}
async function seed() {
  await root(
    `insert into daily_quests(key,week,day,slot,qid,type,prompt,reward) select d::date::text||'-'||s, date_trunc('week',d)::date,d::date,s,'q','choice','Question',10 from generate_series('2026-11-02'::date,'2026-11-27'::date,'1 day') d cross join generate_series(1,3) s where d::date not between '2026-11-09' and '2026-11-15'; insert into daily_quest_solutions select key,'"yes"'::jsonb from daily_quests;`,
  );
}
it('quest attempts, day goal, replay and catch-up XP', async () => {
  await seed();
  await today('2026-11-02');
  expect((await solve('2026-11-02-1', 'no')).progress.gained).toEqual([]);
  expect((await solve('2026-11-02-1')).progress.gained).toContainEqual({ reason: 'quest', xp: 10 });
  expect((await solve('2026-11-02-1')).progress.gained).toEqual([]);
  expect((await solve('2026-11-02-2')).progress.gained).toContainEqual({ reason: 'quest', xp: 15 });
  expect((await solve('2026-11-02-3')).progress.gained).toContainEqual({ reason: 'day_goal', xp: 15 });
  await today('2026-11-03');
  for (let n = 0; n < 4; n++) await solve('2026-11-03-1', 'no');
  expect((await solve('2026-11-03-1')).progress.gained).toContainEqual({ reason: 'quest', xp: 5 });
  await today('2026-11-04');
  expect((await solve('2026-11-03-2')).progress.gained).toEqual([{ reason: 'quest', xp: 8 }]);
});
it('school-day streak, milestone, weekend and holiday continuity', async () => {
  await root(`delete from streaks; delete from xp_ledger where reason='streak';`);
  for (const day of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']) {
    const r = (
      await db.query<{ v: { current: number; xp: number } }>(`select touch_streak('${A}','${day}') v`)
    ).rows[0].v;
    expect(r.current).toBe(Number(day.slice(-2)) - 1);
    expect(r.xp).toBe(5 * r.current);
  }
  expect((await db.query("select size from chests where source='streak' and ref='5'")).rows).toEqual([
    { size: 'big' },
  ]);
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-07') v`)).rows[0].v,
  ).toMatchObject({ current: 5, counted: false });
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-16') v`)).rows[0].v,
  ).toMatchObject({ current: 6, shield_left: 1 });
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-18') v`)).rows[0].v,
  ).toMatchObject({ current: 7, shield_left: 0 });
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-20') v`)).rows[0].v,
  ).toMatchObject({ current: 1, best: 7, restarted: true });
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-23') v`)).rows[0].v,
  ).toMatchObject({ current: 2, best: 7, shield_left: 1 });
});
it('catch-up and weekend solves grant quest XP but never streak XP', async () => {
  await root(
    `delete from streaks; delete from xp_ledger; delete from daily_quest_results; delete from chests; update profiles set xp=0,level=1;`,
  );
  await today('2026-11-07');
  expect((await solve('2026-11-07-1')).progress.gained).toEqual([{ reason: 'quest', xp: 15 }]);
  await root();
  expect((await db.query<{ current: number }>('select current from streaks')).rows[0].current).toBe(0);
  await today('2026-11-17');
  expect((await solve('2026-11-16-1')).progress.gained).toEqual([{ reason: 'quest', xp: 8 }]);
  await root();
  expect((await db.query<{ current: number }>('select current from streaks')).rows[0].current).toBe(0);
});
it('repeated streak touch and two-device replay cannot duplicate rewards', async () => {
  await root(
    `delete from streaks; delete from xp_ledger; delete from chests; delete from daily_quest_results; update profiles set xp=0,level=1;`,
  );
  await today('2026-11-23');
  await user();
  const sql = "select submit_quest_answer('2026-11-23-1','\"yes\"') v";
  const calls = await Promise.all([
    db.query<{ v: { progress: { gained: object[] } } }>(sql),
    db.query<{ v: { progress: { gained: object[] } } }>(sql),
  ]);
  expect(calls[0].rows[0].v.progress.gained).toEqual([
    { reason: 'quest', xp: 15 },
    { reason: 'streak', xp: 5 },
  ]);
  expect(calls[1].rows[0].v.progress.gained).toEqual([]);
  await root();
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-23') v`)).rows[0].v,
  ).toMatchObject({ current: 1, counted: false, xp: 0 });
  expect((await db.query<{ xp: number }>('select sum(delta)::int xp from xp_ledger')).rows[0].xp).toBe(20);
});
it('a Monday refill does not pay for two missed days in the previous week', async () => {
  await root(`delete from streaks; delete from xp_ledger where reason='streak';`);
  await db.query(`select touch_streak('${A}','2026-11-18')`);
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-23') v`)).rows[0].v,
  ).toMatchObject({ current: 1, best: 1, restarted: true, shield_left: 1 });
});
it('inactive quests are not school days and all milestones issue only one chest', async () => {
  await root(`delete from streaks; delete from xp_ledger where reason='streak'; delete from chests where source='streak';
 update daily_quests set active=false where day='2026-11-19';`);
  await db.query(`select touch_streak('${A}','2026-11-18')`);
  expect(
    (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-20') v`)).rows[0].v,
  ).toMatchObject({ current: 2, shield_left: 1 });
  for (const milestone of [5, 10, 20, 30, 50, 75, 100]) {
    await root(
      `update streaks set current=${milestone - 1},best=${milestone - 1},last_day='2026-11-23',shield_week='2026-11-23',shield_left=1 where player_id='${A}'; delete from xp_ledger where reason='streak' and ref='2026-11-24';`,
    );
    expect(
      (await db.query<{ v: object }>(`select touch_streak('${A}','2026-11-24') v`)).rows[0].v,
    ).toMatchObject({ current: milestone, xp: 25, milestone });
    await db.query(`select touch_streak('${A}','2026-11-24')`);
  }
  expect(
    (await db.query<{ n: number }>("select count(*)::int n from chests where source='streak' and size='big'"))
      .rows[0].n,
  ).toBe(7);
});
