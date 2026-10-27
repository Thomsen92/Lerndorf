import { beforeAll, afterAll, it, expect } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, A, B, D, T } from '../teacherDb';
let db: PGlite;
beforeAll(async () => {
  db = await teacherDb();
  await db.exec(`update profiles set level=7,title_id='title_busy_bee',frame_id='frame_silver',avatar='{"character":"girl","wardrobe":{"v":1,"revision":3,"girl":{"items":["avatar_boy_halberd"],"colors":{}},"boy":{"items":[],"colors":{}}}}' where id='${A}';
  insert into streaks(player_id,current,best,last_day,shield_week) values('${A}',6,9,quest_today(),date_trunc('week',quest_today())::date);`);
}, 30000);
afterAll(async () => {
  await db?.close();
});
it('returns only public current-profile fields to classmates and never mutates progress', async () => {
  const before = (await db.query(`select coins,xp,avatar from profiles where id='${A}'`)).rows;
  await asUser(db, B);
  const p = await rpc(db, `public_profile('${A}')`);
  expect(p).toMatchObject({
    id: A,
    nickname: 'anna',
    level: 7,
    title_label: 'Busy Bee',
    frame_id: 'frame_silver',
    current_streak: 6,
    character: 'girl',
    look: { items: ['avatar_boy_halberd'], colors: {} },
  });
  expect(Object.keys(p).sort()).toEqual(
    ['id', 'nickname', 'level', 'title_label', 'frame_id', 'current_streak', 'character', 'look'].sort(),
  );
  expect((await db.query(`select * from streaks where player_id='${A}'`)).rows).toEqual([]);
  await db.exec('reset role');
  expect((await db.query(`select coins,xp,avatar from profiles where id='${A}'`)).rows).toEqual(before);
});
it('rejects other classes, teachers and anonymous callers without exposing private existence', async () => {
  await asUser(db, D);
  await expect(rpc(db, `public_profile('${A}')`)).rejects.toThrow(/profile unavailable/);
  await expect(rpc(db, "public_profile('ffffffff-ffff-ffff-ffff-ffffffffffff')")).rejects.toThrow(
    /profile unavailable/,
  );
  await asUser(db, T);
  await expect(rpc(db, `public_profile('${A}')`)).rejects.toThrow(/pupils/);
  await db.exec('reset role;set role anon');
  await expect(rpc(db, `public_profile('${A}')`)).rejects.toThrow(/permission denied/);
});
