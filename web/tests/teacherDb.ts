import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
export const T = '00000000-0000-0000-0000-000000000001';
export const A = '00000000-0000-0000-0000-000000000011';
export const B = '00000000-0000-0000-0000-000000000012';
export const C = '00000000-0000-0000-0000-000000000013';
export const D = '00000000-0000-0000-0000-000000000014';
export async function teacherDb() {
  const db = await PGlite.create();
  await db.exec(`create schema auth; create table auth.users(id uuid primary key,last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create role anon; create role authenticated; create role service_role;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated;
    alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated;`);
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const f of readdirSync(dir).filter(f => /^\d{4}_.*\.sql$/.test(f)).sort())
    await db.exec(readFileSync(new URL(f, dir), 'utf8'));
  await db.exec(`create or replace function quest_today() returns date language sql stable as $$ select '2026-10-28'::date $$;
    insert into auth.users(id,last_sign_in_at) values ('${T}',null),('${A}','2026-10-28T08:00Z'),('${B}',null),('${C}',null),('${D}',null);
    insert into profiles(id,nickname,role,class_id,plot_index,coins) values ('${T}','teacher','teacher',null,null,0),
    ('${A}','anna','student','8a',0,100),('${B}','ben','student','8a',1,5),('${C}','carla','student','8a',2,0),('${D}','dachs','student','8b',0,0);
    insert into tutorial_progress(player_id,step,answered) values ('${A}','done',3),('${B}','quiz',1);
    insert into daily_quests(key,week,day,slot,qid,type,prompt,data,reward)
      select 'q-'||d||'-'||s,'2026-10-26','2026-10-26'::date+d,s,'x','choice','Choose','{"options":["yes","no"]}',10
      from generate_series(0,6) d cross join generate_series(1,3) s;
    insert into daily_quest_results(player_id,quest_key,attempts,solved_at) values
      ('${A}','q-0-1',1,'2026-10-26T09:00Z'),('${B}','q-0-1',1,'2026-10-26T09:00Z'),
      ('${A}','q-1-1',1,'2026-10-27T09:00Z'),('${B}','q-1-1',1,'2026-10-27T09:00Z'),
      ('${A}','q-2-1',1,'2026-10-28T09:00Z'),('${B}','q-2-1',1,'2026-10-28T09:00Z');`);
  return db;
}
export async function asUser(db: PGlite, id = T) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`);
}
export async function rpc(db: PGlite, sql: string) {
  return (await db.query<{v: Record<string, unknown>}>(`select ${sql} v`)).rows[0].v;
}
