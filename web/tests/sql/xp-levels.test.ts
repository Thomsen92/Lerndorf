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
it('exact curve, uncapped levels and rules', async () => {
  for (const [level, xp] of [
    [1, 0],
    [2, 50],
    [3, 125],
    [5, 350],
    [10, 1350],
    [20, 5225],
    [30, 11600],
  ])
    expect((await db.query(`select xp_for_level(${level}) xp,level_for_xp(${xp}) level`)).rows[0]).toEqual({
      xp,
      level,
    });
  for (const [key, n] of Object.entries({
    quest_first: 15,
    quest_early: 10,
    quest_late: 5,
    day_goal: 15,
    streak_step: 5,
    streak_cap: 5,
    stamp: 100,
    tutorial: 50,
    first_place: 10,
  }))
    expect((await db.query<{ n: number }>(`select xp_rule('${key}') n`)).rows[0].n).toBe(n);
  await expect(db.query("select xp_rule('unknown')")).rejects.toThrow(/unknown/);
});
it('idempotent grant creates all level chests and rejects nonpositive XP', async () => {
  expect(
    (await db.query<{ v: object }>(`select grant_xp('${A}',400,'stamp','2026-10-19') v`)).rows[0].v,
  ).toMatchObject({ granted: 400, level: 5, level_before: 1, new_chests: 4 });
  expect(
    (await db.query<{ v: object }>(`select grant_xp('${A}',400,'stamp','2026-10-19') v`)).rows[0].v,
  ).toMatchObject({ granted: 0, new_chests: 0 });
  expect((await db.query('select ref,size from chests order by id')).rows).toEqual([
    { ref: '2', size: 'normal' },
    { ref: '3', size: 'normal' },
    { ref: '4', size: 'normal' },
    { ref: '5', size: 'big' },
  ]);
  await expect(db.query(`select grant_xp('${A}',0,'quest','bad')`)).rejects.toThrow();
});
it('catalogue and strict own-row reads / no client writes', async () => {
  expect(
    (
      await db.query(
        'select kind,count(*)::int n from level_rewards where season is null group by kind order by kind',
      )
    ).rows,
  ).toEqual([
    { kind: 'frame', n: 7 },
    { kind: 'title', n: 13 },
  ]);
  // Season titles/frames are owned via player_rewards, not unlocked by level (plan E20).
  expect(
    (
      await db.query(
        'select kind,count(*)::int n from level_rewards where season is not null group by kind order by kind',
      )
    ).rows,
  ).toEqual([
    { kind: 'frame', n: 4 },
    { kind: 'title', n: 4 },
  ]);
  await db.exec(`select set_config('request.jwt.claim.sub','${B}',false); set role authenticated;`);
  expect((await db.query('select * from xp_ledger')).rows).toEqual([]);
  expect((await db.query('select * from chests')).rows).toEqual([]);
  for (const sql of [
    `update profiles set xp=9 where id='${B}'`,
    `insert into xp_ledger(player_id,delta,reason,ref) values ('${B}',1,'quest','fake')`,
    `select grant_xp('${B}',1,'quest','fake')`,
  ])
    await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
});
it('pupils read only own streaks and ledger; teachers read all; anonymous reads fail', async () => {
  await db.exec(`reset role; insert into streaks(player_id,current,best,shield_week) values('${A}',1,1,'2026-11-02'),('${B}',2,2,'2026-11-02');
 insert into auth.users values('00000000-0000-0000-0000-000000000001'); insert into profiles(id,nickname,role) values('00000000-0000-0000-0000-000000000001','teacher','teacher');
 select set_config('request.jwt.claim.sub','${B}',false); set role authenticated;`);
  expect((await db.query('select current from streaks')).rows).toEqual([{ current: 2 }]);
  for (const table of ['xp_ledger', 'chests', 'streaks']) {
    await expect(db.exec(`update ${table} set player_id='${B}'`)).rejects.toThrow(/permission denied/);
    await expect(db.exec(`delete from ${table}`)).rejects.toThrow(/permission denied/);
  }
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); set role authenticated;`,
  );
  expect((await db.query('select * from streaks')).rows).toHaveLength(2);
  expect((await db.query('select * from xp_ledger')).rows).toHaveLength(1);
  expect((await db.query('select * from chests')).rows).toHaveLength(4);
  await db.exec('reset role; set role anon;');
  for (const table of ['xp_ledger', 'chests', 'streaks', 'level_rewards'])
    await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/);
});
