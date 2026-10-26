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
const T = '00000000-0000-0000-0000-000000000001';
async function root(sql = '') {
  await db.exec(`reset role; ${sql}`);
}
async function user(id = A) {
  await root(`select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`);
}
async function result(sql: string) {
  return (await db.query<{ v: Record<string, unknown> }>(`select ${sql} v`)).rows[0].v;
}
it('progress exposes exact thresholds, unseen ledger and monotonic bounded seen cursor', async () => {
  await root(
    `select grant_xp('${A}',130,'stamp','2026-10-19'); create or replace function quest_today() returns date language sql stable as $$ select '2026-11-02'::date $$;`,
  );
  await user();
  const p = await result('my_progress()');
  expect(p).toMatchObject({
    xp: 130,
    level: 3,
    level_xp: 125,
    next_level_xp: 225,
    streak: { current: 0, best: 0, shield_left: 1 },
    today: { solved: 0, total: 0 },
    stats: { quests: 0, stamps: 0, best_streak: 0 },
  });
  expect(p.chests).toHaveLength(2);
  const unseen = p.unseen as { id: number; reason: string }[];
  expect(unseen[0].reason).toBe('stamp');
  await db.query(`select mark_progress_seen(${unseen[0].id})`);
  await db.query('select mark_progress_seen(0)');
  expect((await result('my_progress()')).unseen).toEqual([]);
  await db.query('select mark_progress_seen(9999999)');
  await root(`select grant_xp('${A}',1,'quest','new')`);
  await user();
  expect((await result('my_progress()')).unseen).toHaveLength(1);
});
it('chests roll on server, pay by source, and replay exactly once', async () => {
  await root(
    `insert into chests(player_id,size,source,ref) values('${A}','normal','level','6'),('${A}','big','streak','5'); select setseed(0.5);`,
  );
  const rows = (
    await db.query<{ id: number; size: string }>(
      "select id,size from chests where ref in ('6','5') order by id",
    )
  ).rows;
  for (const row of rows) {
    await user();
    const r = await result(`open_chest(${row.id})`);
    const factor = { normal: 1, double: 2, triple: 3 }[r.roll as 'normal' | 'double' | 'triple'];
    expect(r.coins_won).toBe((row.size === 'big' ? 3 * (10 + 3 * 3) : 10 + 3 * 6) * factor);
    expect(await result(`open_chest(${row.id})`)).toEqual(r);
    await user(B);
    await expect(db.query(`select open_chest(${row.id})`)).rejects.toThrow(/chest not found/);
  }
  await root();
  expect(
    (await db.query<{ n: number }>("select count(*)::int n from coin_ledger where reason='chest'")).rows[0].n,
  ).toBe(2);
});
it('title/frame selection validates reward kind and level and supports clearing', async () => {
  await root(`update profiles set level=6 where id='${A}';`);
  await user();
  await expect(db.query("select set_title('title_busy_bee')")).rejects.toThrow(/locked/);
  await expect(db.query("select set_frame('title_newcomer')")).rejects.toThrow(/unknown/);
  await expect(db.query("select set_title('nope')")).rejects.toThrow(/unknown/);
  await root(`update profiles set level=7 where id='${A}';`);
  await user();
  await db.query("select set_title('title_busy_bee')");
  await db.query('select set_title(null)');
  await db.query("select set_frame('frame_bronze')");
  expect(await result('my_progress()')).toMatchObject({ title_id: null, frame_id: 'frame_bronze' });
});
it('teachers cannot call pupil RPCs; new tables reject direct writes', async () => {
  await root(
    `insert into auth.users values('${T}'); insert into profiles(id,nickname,role) values('${T}','teacher','teacher');`,
  );
  await user(T);
  for (const rpc of [
    'my_progress()',
    'mark_progress_seen(0)',
    'open_chest(1)',
    'set_title(null)',
    "set_frame('frame_wood')",
  ])
    await expect(db.query(`select ${rpc}`)).rejects.toThrow(/forbidden: pupils only/);
  await user();
  for (const table of ['xp_ledger', 'chests', 'streaks', 'level_rewards'])
    await expect(db.exec(`delete from ${table}`)).rejects.toThrow(/permission denied/);
});
it('new Monday presents a refreshed shield before solving, and today counts active solved quests', async () => {
  await root(`delete from streaks; insert into streaks(player_id,current,best,last_day,shield_week,shield_left) values('${A}',3,4,'2026-10-30','2026-10-26',0);
 insert into daily_quests(key,week,day,slot,qid,type,prompt,reward) values('today-1','2026-11-02','2026-11-02',1,'q','choice','Q',10),('today-2','2026-11-02','2026-11-02',2,'q','choice','Q',10),('inactive','2026-11-02','2026-11-02',3,'q','choice','Q',10);
 update daily_quests set active=false where key='inactive'; insert into daily_quest_results(player_id,quest_key,solved_at) values('${A}','today-1',now()),('${A}','inactive',now());`);
  await user();
  expect(await result('my_progress()')).toMatchObject({
    streak: { current: 3, best: 4, shield_left: 1, today_done: false },
    today: { solved: 1, total: 2 },
  });
});
it('locked frames and foreign seen ids cannot alter another pupil', async () => {
  await root(`update profiles set level=4 where id='${B}'; select grant_xp('${A}',1,'quest','foreign');`);
  const id = (await db.query<{ id: number }>(`select max(id)::int id from xp_ledger where player_id='${A}'`))
    .rows[0].id;
  await user(B);
  await expect(db.query("select set_frame('frame_bronze')")).rejects.toThrow(/locked/);
  await db.query(`select mark_progress_seen(${id})`);
  expect(await result('my_progress()')).toMatchObject({ xp: 0, frame_id: 'frame_wood', unseen: [] });
  await root();
  expect(
    (await db.query<{ progress_seen_id: number }>(`select progress_seen_id from profiles where id='${B}'`))
      .rows[0].progress_seen_id,
  ).toBe(0);
});
