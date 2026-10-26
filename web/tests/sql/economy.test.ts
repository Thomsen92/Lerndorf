import { beforeAll, afterAll, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, A, B, T } from '../teacherDb';
let db: PGlite;
beforeAll(async () => {
  db = await teacherDb();
}, 30000);
afterAll(async () => {
  await db?.close();
});
it('sets the new prices, hides the duplicate old chain and keeps owned items', async () => {
  expect(
    (
      await db.query(
        "select id,price from items where id in ('house_landhaus','house_villa','car_kleinwagen','car_camper') order by id",
      )
    ).rows,
  ).toEqual([
    { id: 'car_camper', price: 600 },
    { id: 'car_kleinwagen', price: 350 },
    { id: 'house_landhaus', price: 600 },
    { id: 'house_villa', price: 1000 },
  ]);
  expect((await db.query("select shop_visible from items where id='acc_04'")).rows[0]).toEqual({
    shop_visible: false,
  });
});
it('pays fifty coins per stamp once while retaining one hundred stamp XP', async () => {
  await db.exec('reset role');
  const before = (await db.query<{ coins: number }>(`select coins from profiles where id='${A}'`)).rows[0]
    .coins;
  await asUser(db, T);
  await db.query(`select add_stamps('8a','2026-10-26',array['${A}']::uuid[])`);
  await db.query(`select add_stamps('8a','2026-10-26',array['${A}']::uuid[])`);
  await db.exec('reset role');
  expect(
    (await db.query<{ coins: number }>(`select coins from profiles where id='${A}'`)).rows[0].coins - before,
  ).toBe(50);
  expect(
    (
      await db.query(
        `select delta from xp_ledger where player_id='${A}' and reason='stamp' and ref='2026-10-26'`,
      )
    ).rows,
  ).toEqual([{ delta: 100 }]);
});
it('preserves custom class rules, old balances, opened chests and possession on migration replay', async () => {
  await db.exec(`reset role; update classes set stamp_reward=75 where id='8b'; update classes set stamp_reward=100 where id='8a';
    insert into inventory(player_id,item_id,qty) values('${A}','acc_04',1) on conflict(player_id,item_id) do update set qty=1;
    insert into chests(player_id,size,source,ref,opened_at,coins,roll) values('${A}','normal','level','99',now(),515,'normal');`);
  const balances = (await db.query('select id,coins from profiles order by id')).rows;
  await db.exec(
    readFileSync(new URL('../../../supabase/migrations/0025_economy_balance.sql', import.meta.url), 'utf8'),
  );
  expect(
    (await db.query("select id,stamp_reward from classes where id in ('8a','8b') order by id")).rows,
  ).toEqual([
    { id: '8a', stamp_reward: 50 },
    { id: '8b', stamp_reward: 75 },
  ]);
  expect((await db.query('select id,coins from profiles order by id')).rows).toEqual(balances);
  expect(
    (await db.query(`select qty from inventory where player_id='${A}' and item_id='acc_04'`)).rows,
  ).toEqual([{ qty: 1 }]);
  expect((await db.query("select coins from chests where ref='99'")).rows).toEqual([{ coins: 515 }]);
  await db.exec("insert into classes(id,name,layout_seed) values('new','New',42)");
  expect((await db.query("select stamp_reward from classes where id='new'")).rows).toEqual([
    { stamp_reward: 50 },
  ]);
});
it('uses the source level, preserves roll multipliers and makes chest payments idempotent', async () => {
  await db.exec(`reset role; delete from chests where opened_at is null; update profiles set level=10 where id='${A}';
    insert into chests(player_id,size,source,ref) values('${A}','normal','level','2'),('${A}','big','level','5');`);
  const chests = (
    await db.query<{ id: number; size: string; ref: string }>(
      "select id,size,ref from chests where ref in ('2','5') and opened_at is null order by id",
    )
  ).rows;
  expect(chests).toHaveLength(2);
  for (const chest of chests) {
    await asUser(db, A);
    const won = await rpc(db, `open_chest(${chest.id})`);
    const factor = { normal: 1, double: 2, triple: 3 }[won.roll as 'normal' | 'double' | 'triple'];
    expect(won.coins_won).toBe((10 + 3 * Number(chest.ref)) * (chest.size === 'big' ? 3 : 1) * factor);
    expect(await rpc(db, `open_chest(${chest.id})`)).toEqual(won);
    await asUser(db, B);
    await expect(db.query(`select open_chest(${chest.id})`)).rejects.toThrow(/chest not found/);
  }
});
