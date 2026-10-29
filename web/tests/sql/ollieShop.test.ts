import { afterAll, beforeAll, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { teacherDb, asUser, rpc, A, B } from '../teacherDb';

const products: Array<{ id: string; kind: string; price: number; file: string; nameDe: string; descriptionEn: string }> =
  JSON.parse(readFileSync(new URL('../../../content/shop/ollie-items.json', import.meta.url), 'utf8')).items;
const migrationPath = new URL('../../../supabase/migrations/0054_ollie_shop_items.sql', import.meta.url);
const migration = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';
// 0059 relabels the rarities after 0054; replaying 0054 resets them, so the replay ends with 0059 as a deploy would.
const rarities = readFileSync(new URL('../../../supabase/migrations/0059_shop_rarities.sql', import.meta.url), 'utf8');
let db: PGlite;
beforeAll(async () => { db = await teacherDb(); }, 30000);
afterAll(async () => { await db?.close(); });

it('adds all fourteen normal items to existing items with exact prices and model paths', async () => {
  expect(migration.length).toBeGreaterThan(0);
  await db.exec('reset role');
  for (const product of products) {
    expect((await db.query(`select id,kind,name_de,price,model,description,starter,active,shop_visible,season,lootbox_weight
      from items where id=$1`, [product.id])).rows).toEqual([{
      id: product.id, kind: product.kind, name_de: product.nameDe, price: product.price,
      model: `shop/${product.file}`, description: product.descriptionEn,
      starter: false, active: true, shop_visible: true, season: null, lootbox_weight: 0,
    }]);
  }
});

it('replays only item content, preserving balances, inventory, placements and class restrictions', async () => {
  expect(migration.length).toBeGreaterThan(0);
  await db.exec(`reset role;
    insert into inventory(player_id,item_id,qty) values('${A}','shop_sunday_bench',3);
    insert into class_items(class_id,item_id,enabled) values('8a','shop_support_duck',false);`);
  await asUser(db, A);
  await rpc(db, "place_in_slot('shop_sunday_bench','deco_1',0)");
  await db.exec('reset role');
  const snapshot = async () => Promise.all([
    db.query('select * from profiles order by id'), db.query('select * from inventory order by player_id,item_id'),
    db.query('select * from placements order by player_id,slot'), db.query('select * from class_items order by class_id,item_id'),
    db.query('select * from items order by id'),
  ]).then(results => results.map(result => result.rows));
  const before = await snapshot();
  await db.exec(migration);
  await db.exec(rarities);
  await db.exec(migration);
  await db.exec(rarities);
  expect(await snapshot()).toEqual(before);
});

it('buys new items via the existing RPC: exact coins, repeatable deco, once-only buildings', async () => {
  await db.exec(`reset role; update profiles set coins=10000 where id='${A}';
    delete from placements where player_id='${A}'; delete from inventory where player_id='${A}';
    delete from class_items where item_id='shop_support_duck';`);
  let coins = 10000;
  await asUser(db, A);
  for (const product of products) {
    coins -= product.price;
    expect(await rpc(db, `buy_item('${product.id}')`)).toEqual({ coins, qty: 1 });
    if (product.kind === 'deco') {
      coins -= product.price;
      expect(await rpc(db, `buy_item('${product.id}')`)).toEqual({ coins, qty: 2 });
    } else {
      await expect(rpc(db, `buy_item('${product.id}')`)).rejects.toThrow('already owned');
    }
  }
  await rpc(db, "place_in_slot('shop_sunday_bench','deco_1',0)");
  await rpc(db, "place_in_slot('shop_sunday_bench','deco_2',1)");
  await expect(rpc(db, "place_in_slot('shop_sunday_bench','deco_3',0)")).rejects.toThrow('no free copy');
  coins -= 55;
  expect(await rpc(db, "buy_item('shop_sunday_bench')")).toEqual({ coins, qty: 3 });
  await rpc(db, "place_in_slot('shop_sunday_bench','deco_3',0)");
});

it('keeps the existing money, class-item and shop gates authoritative', async () => {
  await asUser(db, B);
  await expect(rpc(db, "buy_item('shop_evening_lantern')")).rejects.toThrow('not enough coins');
  await db.exec("reset role; update classes set shop_open=false where id='8a'");
  await asUser(db, A);
  await expect(rpc(db, "buy_item('shop_evening_lantern')")).rejects.toThrow('shop is closed');
  await db.exec("reset role; update classes set shop_open=true where id='8a'; insert into class_items(class_id,item_id,enabled) values('8a','shop_evening_lantern',false)");
  await asUser(db, A);
  await expect(rpc(db, "buy_item('shop_evening_lantern')")).rejects.toThrow('item is not sold in this class');
});
