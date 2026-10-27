import { beforeAll, afterAll, it, expect } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, A, B, T } from '../teacherDb';
let db: PGlite;
beforeAll(async () => {
  db = await teacherDb();
  await asUser(db, A);
  await db.query("select set_character('boy')");
});
afterAll(async () => {
  await db?.close();
});
const save = (items: string[], colors = {}, revision = 0, kind = 'boy') =>
  db.query(`select save_avatar_look($1,$2::jsonb,$3)`, [kind, JSON.stringify({ items, colors }), revision]);
it('rejects forged ownership, colors, incompatible parts and reserved legacy keys', async () => {
  await asUser(db, A);
  await expect(save(['avatar_boy_gold_chain'])).rejects.toThrow(/not owned/);
  await expect(save([], { skin: '#00ff00' })).rejects.toThrow(/colour/);
  await expect(save(['avatar_girl_slim_jeans'])).rejects.toThrow(/incompatible/);
  await expect(db.query(`select save_avatar('{"v":1,"wardrobe":{}}')`)).rejects.toThrow(/key/);
  await expect(save([], {}, 0, 'girl')).rejects.toThrow(/character changed/);
});
it('buys once, preserves character and both looks, and rejects stale saves', async () => {
  await asUser(db, A);
  await db.query("select buy_item('avatar_boy_gold_chain')");
  await expect(db.query("select buy_item('avatar_boy_gold_chain')")).rejects.toThrow(/already owned/);
  const v = await rpc(
    db,
    `save_avatar_look('boy','{"items":["avatar_boy_gold_chain"],"colors":{"hair":"#5b3a29"}}',0)`,
  );
  expect(v.character).toBe('boy');
  expect((v.wardrobe as { revision: number }).revision).toBe(1);
  await expect(save([], {}, 0)).rejects.toThrow(/revision conflict/);
  await db.query("select set_character('girl')");
  await save([], {}, 1, 'girl');
  await db.query("select set_character('boy')");
  const result = await rpc(db, `save_avatar('{"v":1,"skin":2,"eyes":1}')`);
  expect(result.character).toBe('boy');
  expect((result.wardrobe as { revision: number }).revision).toBe(2);
});
it('rejects conflicting head/hair and teachers without mutating a profile', async () => {
  await db.exec(
    `reset role; update profiles set avatar='{"character":"girl"}' where id='${B}';insert into inventory(player_id,item_id,qty) values ('${B}','avatar_girl_daisy_bucket',1),('${B}','avatar_girl_soft_bow',1);`,
  );
  await asUser(db, B);
  await expect(save(['avatar_girl_daisy_bucket', 'avatar_girl_soft_bow'], {}, 0, 'girl')).rejects.toThrow(
    /conflict/,
  );
  await asUser(db, T);
  await expect(save([])).rejects.toThrow(/only pupils/);
  await db.exec('reset role; set role anon;');
  await expect(save([])).rejects.toThrow(/permission denied/);
});
it('shares owned accessories between characters while preserving separate looks and ownership checks', async () => {
  await db.exec(
    `reset role; insert into inventory(player_id,item_id,qty) values('${B}','avatar_boy_halberd',1),('${B}','avatar_girl_starpack',1);`,
  );
  await asUser(db, B);
  await db.query("select set_character('girl')");
  await save(['avatar_boy_halberd'], {}, 0, 'girl');
  await db.query("select set_character('boy')");
  const result = await rpc(db, `save_avatar_look('boy','{"items":["avatar_girl_starpack"],"colors":{}}',1)`);
  expect(result.wardrobe).toMatchObject({
    girl: { items: ['avatar_boy_halberd'] },
    boy: { items: ['avatar_girl_starpack'] },
    revision: 2,
  });
  await expect(save(['avatar_girl_heart_pop'], {}, 2, 'boy')).rejects.toThrow(/not owned/);
  await expect(save(['avatar_girl_slim_jeans'], {}, 2, 'boy')).rejects.toThrow(/incompatible/);
});
