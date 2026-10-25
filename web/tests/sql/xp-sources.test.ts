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
it('stamps book XP once for each pupil; teacher restrictions remain', async () => {
  await root(
    `insert into auth.users values ('${T}'); insert into profiles(id,nickname,role) values ('${T}','teacher','teacher');`,
  );
  await user(T);
  await db.query(`select add_stamps('8a','2026-10-19',array['${A}','${B}']::uuid[])`);
  await db.query(`select add_stamps('8a','2026-10-19',array['${A}','${B}']::uuid[])`);
  await root();
  expect((await db.query("select xp from profiles where role='student' order by nickname")).rows).toEqual([
    { xp: 100 },
    { xp: 100 },
  ]);
  await user();
  await expect(db.query(`select add_stamps('8a','2026-10-26',array['${A}']::uuid[])`)).rejects.toThrow(
    /forbidden/,
  );
});
it('tutorial finish grants once and first placement grants once per item', async () => {
  await root(
    `insert into tutorial_progress(player_id,step) values('${A}','done'); insert into inventory(player_id,item_id,qty) values('${A}','deco_cat_sign',1);`,
  );
  await user();
  const r = (await db.query<{ v: { progress: object } }>('select tutorial_finish() v')).rows[0].v;
  expect(r.progress).toMatchObject({ xp: 150 });
  expect(
    (await db.query<{ v: { progress: { gained: unknown[] } } }>('select tutorial_finish() v')).rows[0].v
      .progress.gained,
  ).toEqual([]);
  const placed = (
    await db.query<{ v: { id: number; progress: { gained: object[] } } }>(
      "select place_in_slot('deco_cat_sign','deco_1',0) v",
    )
  ).rows[0].v;
  expect(placed.id).toBeGreaterThan(0);
  expect(placed.progress.gained).toEqual([{ reason: 'first_place', xp: 10 }]);
  await db.query("select clear_slot('deco_1')");
  expect(
    (
      await db.query<{ v: { progress: { gained: unknown[] } } }>(
        "select place_in_slot('deco_cat_sign','deco_1',0) v",
      )
    ).rows[0].v.progress.gained,
  ).toEqual([]);
});
it('classmates receive only public progress fields', async () => {
  await root(`update profiles set title_id='title_busy_bee',level=7 where id='${A}';`);
  await user(B);
  const row = (await db.query(`select * from village_members() where id='${A}'`)).rows[0];
  expect(row).toMatchObject({ level: 7, title_label: 'Busy Bee', frame_id: 'frame_wood' });
  expect(row).not.toHaveProperty('xp');
  expect(row).not.toHaveProperty('coins');
  expect(row).not.toHaveProperty('streak');
});
it('backfill includes history once and caps chests at the three highest levels', async () => {
  await root(`delete from xp_ledger; delete from chests; update profiles set xp=0,level=1;
 insert into daily_quests(key,week,day,slot,qid,type,prompt,reward) select 'history-'||n,'2026-10-05','2026-10-05'::date+n,n%3+1,'q','choice','Question',10 from generate_series(1,12) n;
 insert into daily_quest_results(player_id,quest_key,solved_at) select '${A}',key,now() from daily_quests;
 insert into coin_ledger(player_id,delta,reason,ref) values('${A}',100,'stamp','2026-10-12');`);
  const block = readFileSync(new URL('0020_xp_levels.sql', dir), 'utf8')
    .split('-- XP BACKFILL START')[1]
    ?.split('-- XP BACKFILL END')[0];
  expect(block).toBeTruthy();
  await db.exec(block!);
  await db.exec(block!);
  expect((await db.query(`select xp,level from profiles where id='${A}'`)).rows[0]).toEqual({
    xp: 370,
    level: 5,
  });
  expect((await db.query(`select source,ref from chests where player_id='${A}' order by ref`)).rows).toEqual([
    { source: 'backfill', ref: '3' },
    { source: 'backfill', ref: '4' },
    { source: 'backfill', ref: '5' },
  ]);
});
it('an already backfilled tutorial cannot grant its XP a second time', async () => {
  await root(
    `delete from xp_ledger; delete from chests; update profiles set xp=0,level=1; insert into xp_ledger(player_id,delta,reason,ref) values('${A}',50,'backfill','tutorial'); update profiles set xp=50,level=2 where id='${A}';`,
  );
  await user();
  const p = (
    await db.query<{ v: { progress: { gained: unknown[]; xp: number } } }>('select tutorial_finish() v')
  ).rows[0].v.progress;
  expect(p.gained).toEqual([]);
  expect(p.xp).toBe(50);
});
it('normal placement keeps build, ownership, kind and rotation checks', async () => {
  await root(`update classes set build_open=false where id='8a';`);
  await user();
  await expect(db.query("select place_in_slot('deco_cat_sign','deco_1',0)")).rejects.toThrow(/closed/);
  await root(`update classes set build_open=true where id='8a';`);
  await user();
  await expect(db.query("select place_in_slot('deco_cat_sign','house',0)")).rejects.toThrow(/does not fit/);
  await expect(db.query("select place_in_slot('deco_cat_sign','deco_1',null)")).rejects.toThrow(/rotation/);
  await user(B);
  await expect(db.query("select place_in_slot('deco_cat_sign','deco_1',0)")).rejects.toThrow(/no free copy/);
  await expect(db.query('select tutorial_finish()')).rejects.toThrow(/not at this step/);
});
