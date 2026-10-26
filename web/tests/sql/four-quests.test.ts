import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { packageToRows, type WeekPackage } from '../../scripts/quests';
const A = '00000000-0000-0000-0000-000000000011';
let db: PGlite;
beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(`create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
  const dir = new URL('../../../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir)
    .filter((f) => /^00\d\d_.*\.sql$/.test(f))
    .sort())
    await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  await db.exec(`insert into auth.users values('${A}'); insert into profiles(id,nickname,class_id,plot_index) values('${A}','fourtest','8a',0);
    create or replace function public.quest_today() returns date language sql stable as $$ select '2026-11-09'::date $$;`);
}, 30000);
beforeEach(async () => {
  await db.exec(`reset role; delete from daily_quest_results; delete from daily_quests; delete from quest_imports;
    delete from coin_ledger; delete from xp_ledger; delete from chests; delete from streaks; update profiles set xp=0,level=1,coins=0;`);
});
afterAll(async () => {
  await db?.close();
});
it('imports 28 quests through the service RPC and exposes four with a word bank, without solutions', async () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../fixtures/quests/2026-11-09.json', import.meta.url), 'utf8'),
  ) as Extract<WeekPackage, { days: unknown }>;
  for (const [index, day] of pkg.days.entries()) day.quests.push({ ...day.quests[0], id: `extra-${index}` });
  pkg.days[0].quests[1].bank = ['went', 'go', 'gone'];
  const rows = packageToRows(pkg);
  await db.exec('set role service_role');
  expect(
    (
      await db.query<{ n: number }>("select import_quest_week('2026-11-09',false,$1::jsonb,$2::jsonb) n", [
        JSON.stringify(rows.quests),
        JSON.stringify(rows.solutions),
      ])
    ).rows[0].n,
  ).toBe(28);
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`,
  );
  const visible = (await db.query<{ v: { data: Record<string, unknown> }[] }>('select my_daily_quests() v'))
    .rows[0].v;
  expect(visible).toHaveLength(4);
  expect(visible[1].data.bank).toEqual(['went', 'go', 'gone']);
  expect(JSON.stringify(visible)).not.toContain('solution');
  await expect(db.query("select import_quest_week('2026-11-09',true,'[]','[]')")).rejects.toThrow(
    /permission denied/,
  );
});
it.each([3, 4])(
  'grants the daily goal exactly once after all %i active quests, never early',
  async (count) => {
    await db.exec(`insert into daily_quests(key,week,day,slot,qid,type,prompt,reward,data)
    select 'q'||n,'2026-11-09','2026-11-09',n,'q'||n,'choice','Pick yes',5,'{"options":["yes","no"]}' from generate_series(1,${count}) n;
    insert into daily_quest_solutions(quest_key,solution) select key,'"yes"' from daily_quests;
    select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
    for (let n = 1; n <= count; n++) {
      const result = (
        await db.query<{ v: { progress: { gained: { reason: string; xp: number }[] } } }>(
          `select submit_quest_answer('q${n}','"yes"') v`,
        )
      ).rows[0].v;
      expect(result.progress.gained.filter((g) => g.reason === 'day_goal')).toEqual(
        n === count ? [{ reason: 'day_goal', xp: 15 }] : [],
      );
    }
    await db.query(`select submit_quest_answer('q${count}','"yes"')`);
    await db.exec('reset role');
    expect(
      (await db.query(`select delta from xp_ledger where player_id='${A}' and reason='day_goal'`)).rows,
    ).toEqual([{ delta: 15 }]);
  },
);
it('rejects slot five and keeps solutions inaccessible to pupils', async () => {
  await expect(
    db.exec(
      `insert into daily_quests(key,week,day,slot,qid,type,prompt,reward) values('bad','2026-11-09','2026-11-09',5,'bad','choice','Pick',5)`,
    ),
  ).rejects.toThrow(/check constraint/);
  await db.exec(`select set_config('request.jwt.claim.sub','${A}',false); set role authenticated;`);
  await expect(db.query('select * from daily_quest_solutions')).rejects.toThrow(/permission denied/);
});
