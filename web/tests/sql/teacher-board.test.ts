import { beforeAll, afterAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, A, B, D } from '../teacherDb';
let db: PGlite;
beforeAll(async()=>{ db=await teacherDb(); }); afterAll(async()=>{ await db?.close(); });
it('returns only class aggregates and counts the school-day class streak',async()=>{
  await asUser(db);
  const board=await rpc(db,"class_board('8a')");
  expect(board).toMatchObject({solved_week:6,goal_week:27,solved_today:2,class_streak:3,stamps_week:0});
  expect(Object.keys(board).sort()).toEqual(['week','solved_week','goal_week','solved_today','class_streak','stamps_week','notice'].sort());
  expect(JSON.stringify(board)).not.toMatch(/anna|coins|nickname|xp/);
  await db.exec(`reset role; update daily_quest_results set solved_at=null where player_id='${B}' and quest_key='q-1-1';`);
  await asUser(db); expect((await rpc(db,"class_board('8a')")).class_streak).toBe(1);
  await asUser(db,A); await expect(db.query("select class_board('8a')")).rejects.toThrow(/forbidden/);
});
it('restricts notices to the own class, valid dates and teacher writes',async()=>{
  await asUser(db);
  await db.query("select set_class_notice('8a','Bring your folder.',null)");
  await expect(db.query(`select set_class_notice('8a','${'x'.repeat(141)}',null)`)).rejects.toThrow();
  await asUser(db,A);
  expect((await db.query('select * from class_notices')).rows).toHaveLength(1);
  await expect(db.query("select set_class_notice('8a','x',null)")).rejects.toThrow(/forbidden/);
  await expect(db.query("update class_notices set text='hack'")).rejects.toThrow(/permission denied/);
  await asUser(db,D); expect((await db.query('select * from class_notices')).rows).toHaveLength(0);
  await asUser(db); await db.query("select set_class_notice('8a','expired','2026-10-27')");
  await asUser(db,A); expect((await db.query('select * from class_notices')).rows).toHaveLength(0);
  await asUser(db); await db.query("select set_class_notice('8a',null,null)");
  expect((await db.query('select * from class_notices')).rows).toHaveLength(0);
});
it('teacher views reveal neither private balances nor solutions and reject pupil sessions',async()=>{
  await asUser(db);
  const rows=(await db.query("select * from teacher_village_members('8b')")).rows;
  expect(rows).toHaveLength(1); expect(rows[0]).not.toHaveProperty('coins');
  const quests=await rpc(db,`teacher_pupil_quests('${A}')`);
  expect(Array.isArray(quests)).toBe(true); expect(JSON.stringify(quests)).not.toMatch(/solution|hint|answer/);
  await asUser(db,A);
  await expect(db.query("select * from teacher_village_members('8a')")).rejects.toThrow(/forbidden/);
  await expect(db.query(`select teacher_pupil_quests('${B}')`)).rejects.toThrow(/forbidden/);
});
