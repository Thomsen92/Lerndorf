import { beforeAll, afterAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, T, A, B, C } from '../teacherDb';
let db: PGlite;
beforeAll(async () => {
  db = await teacherDb();
});
afterAll(async () => {
  await db?.close();
});
it('restricts class data to teachers, validates Monday and counts only offered quests', async () => {
  await asUser(db, A);
  await expect(db.query("select * from teacher_class_pupils('8a','2026-10-26')")).rejects.toThrow(
    /forbidden/,
  );
  await asUser(db);
  await expect(db.query("select * from teacher_class_pupils('8a','2026-10-27')")).rejects.toThrow(/Monday/);
  const rows = (
    await db.query<Record<string, unknown>>(
      "select * from teacher_class_pupils('8a','2026-10-26') order by nickname",
    )
  ).rows;
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({
    nickname: 'anna',
    tutorial_step: null,
    quests_solved_week: 3,
    quests_offered_week: 9,
    holiday_week: false,
  });
  expect(rows[1].tutorial_step).toBe('quiz');
  expect(rows[2].tutorial_step).toBe('not_started');
  expect(
    (
      await db.query<{ holiday_week: boolean }>("select * from teacher_class_pupils('8a','2026-11-02')")
    ).rows.every((r) => r.holiday_week),
  ).toBe(true);
});
it('books all or none, rejects duplicates, missing pupils and blank notes', async () => {
  await asUser(db);
  for (const sql of [
    `adjust_coins_many(array['${A}','${B}']::uuid[],-10,'undo')`,
    `adjust_coins_many(array['${A}','${A}']::uuid[],10,'x')`,
    `adjust_coins_many(array[]::uuid[],10,'x')`,
    `adjust_coins_many(array['${T}']::uuid[],10,'x')`,
    `adjust_coins_many(array['${A}']::uuid[],10,' ')`,
  ])
    await expect(db.query(`select ${sql}`)).rejects.toThrow();
  expect(
    (await db.query<{ coins: number }>(`select coins from profiles where id='${A}'`)).rows[0].coins,
  ).toBe(100);
  expect(await rpc(db, `adjust_coins_many(array['${A}','${B}']::uuid[],10,'Schnellbuchung +10')`)).toBe(2);
  expect((await db.query("select * from coin_ledger where reason='teacher'")).rows).toHaveLength(2);
  await asUser(db, A);
  await expect(db.query(`select adjust_coins_many(array['${B}']::uuid[],10,'x')`)).rejects.toThrow(
    /forbidden/,
  );
});
it('returns named possessions and at most fifty newest ledger entries', async () => {
  await db.exec(
    `reset role; insert into coin_ledger(player_id,delta,reason,ref) select '${A}',0,'teacher',n::text from generate_series(1,60) n;`,
  );
  await asUser(db);
  const detail = await rpc(db, `teacher_pupil_detail('${A}')`);
  expect(detail.ledger).toHaveLength(50);
  expect(detail).toHaveProperty('slots');
  expect(detail).toHaveProperty('unplaced');
  expect(detail).toHaveProperty('week');
  await expect(db.query(`select teacher_pupil_detail('${T}')`)).rejects.toThrow(/pupil not found/);
  await asUser(db, C);
  await expect(db.query(`select teacher_pupil_detail('${A}')`)).rejects.toThrow(/forbidden/);
});
it('cannot undo a group booking partially after one pupil has spent the coins', async () => {
  await db.exec(`reset role; update profiles set coins=0 where id='${B}';`);
  await asUser(db);
  const before = (await db.query<{ coins: number }>(`select coins from profiles where id='${A}'`)).rows[0]
    .coins;
  await expect(
    db.query(`select adjust_coins_many(array['${A}','${B}']::uuid[],-10,'Rückgängig: Schnellbuchung +10')`),
  ).rejects.toThrow(/insufficient coins: ben/);
  expect(
    (await db.query<{ coins: number }>(`select coins from profiles where id='${A}'`)).rows[0].coins,
  ).toBe(before);
  expect((await db.query("select * from coin_ledger where ref like 'Rückgängig:%'")).rows).toHaveLength(0);
});
