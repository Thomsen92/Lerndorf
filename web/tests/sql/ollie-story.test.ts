import { afterAll, beforeAll, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { teacherDb, asUser, rpc, A, B, C, D, T } from '../teacherDb';
let db: PGlite;
beforeAll(async () => {
  db = await teacherDb();
}, 30000);
afterAll(async () => {
  await db?.close();
});
const answer = (id: string, value: string) => rpc(db, `answer_ollie_story('${id}','${value}')`);
it('only reveals current question, persists order/resume and separates players', async () => {
  await asUser(db, A);
  const state = await rpc(db, 'my_ollie_story()');
  expect(state).toMatchObject({
    step: 0,
    total: 9,
    completed: false,
    question: { id: 'gap-1', position: 1 },
  });
  expect(Object.keys(state.question as object).sort()).toEqual([
    'clip',
    'id',
    'narrative',
    'options',
    'position',
  ]);
  expect(JSON.stringify(state)).not.toMatch(/solution|hint|reply|terrified|kangaroo/);
  await expect(answer('backpack', 'backpack')).rejects.toThrow('question not current');
  await expect(answer('gap-2', 'kangaroo')).rejects.toThrow('question not current');
  expect(await answer('gap-1', 'suitcase')).toMatchObject({
    correct: false,
    hint: expect.any(String),
    feedback: null,
    awarded: { coins: 0, xp: 0, itemId: null },
  });
  expect(await answer('gap-1', 'backpack')).toMatchObject({
    correct: true,
    hint: null,
    feedback: { text: expect.stringContaining('terrified'), clip: expect.any(String) },
    state: { step: 1, question: { id: 'gap-2' } },
  });
  expect(await answer('gap-1', 'backpack')).toMatchObject({
    correct: true,
    alreadySolved: true,
    feedback: null,
    awarded: { coins: 0, xp: 0, itemId: null },
  });
  expect(await rpc(db, 'my_ollie_story()')).toMatchObject({ step: 1 });
  await asUser(db, B);
  expect(await rpc(db, 'my_ollie_story()')).toMatchObject({ step: 0 });
});
it('grants fifty coins, eighty XP and one placeable souvenir once', async () => {
  await asUser(db, A);
  for (const [id, word] of [
    ['gap-2', 'kangaroo'],
    ['gap-3', 'plane'],
    ['gap-4', 'Liberty'],
    ['gap-5', 'Empire'],
    ['gap-6', 'Park'],
    ['gap-7', 'Bridge'],
    ['gap-8', 'Square'],
  ])
    await answer(id, word);
  expect(await answer('gap-9', 'backpack')).toMatchObject({
    correct: true,
    state: { completed: true, step: 9, question: null, coins: 150 },
    awarded: { coins: 50, xp: 80, itemId: 'reward_ollie_nyc_postcard' },
    progress: { gained: [{ reason: 'quest', xp: 80 }] },
  });
  for (let i = 0; i < 3; i++)
    expect(await answer('gap-9', 'backpack')).toMatchObject({
      alreadySolved: true,
      awarded: { coins: 0, xp: 0, itemId: null },
      progress: null,
    });
  await expect(rpc(db, "buy_item('reward_ollie_nyc_postcard')")).rejects.toThrow('not sold');
  await rpc(db, "place_in_slot('reward_ollie_nyc_postcard','deco_1',0)");
  await db.exec('reset role');
  // Placement independently earns the existing first-place bonus of 10 XP.
  expect((await db.query(`select coins,xp from profiles where id='${A}'`)).rows).toEqual([
    { coins: 150, xp: 90 },
  ]);
  expect(
    (
      await db.query(
        `select qty from inventory where player_id='${A}' and item_id='reward_ollie_nyc_postcard'`,
      )
    ).rows,
  ).toEqual([{ qty: 1 }]);
  expect(
    (
      await db.query(
        `select delta,reason,ref from coin_ledger where player_id='${A}' and ref='npc:ollie:ollie-australia-new-york'`,
      )
    ).rows,
  ).toEqual([{ delta: 50, reason: 'task', ref: 'npc:ollie:ollie-australia-new-york' }]);
});
it('denies teacher/anonymous RPCs and direct client access', async () => {
  await asUser(db, T);
  await expect(rpc(db, 'my_ollie_story()')).rejects.toThrow('only pupils');
  await expect(answer('gap-1', 'backpack')).rejects.toThrow('only pupils');
  await asUser(db, A);
  for (const table of ['ollie_story_questions', 'ollie_story_progress']) {
    await expect(db.query(`select * from ${table}`)).rejects.toThrow('permission denied');
    await expect(db.query(`delete from ${table}`)).rejects.toThrow('permission denied');
    await expect(
      db.query(`update ${table} set ${table === 'ollie_story_questions' ? "solution='bad'" : 'step=6'}`),
    ).rejects.toThrow('permission denied');
  }
  await db.exec('reset role; set role anon');
  await expect(rpc(db, 'my_ollie_story()')).rejects.toThrow('permission denied');
});
it('treats null or invalid input as wrong and rolls the final grant back on inventory failure', async () => {
  await asUser(db, B);
  expect(await rpc(db, "answer_ollie_story('gap-1',null)")).toMatchObject({
    correct: false,
    state: { step: 0 },
    feedback: null,
  });
  await expect(rpc(db, "answer_ollie_story(null,'backpack')")).rejects.toThrow('question not current');
  for (const [id, word] of [
    ['gap-1', 'backpack'],
    ['gap-2', 'kangaroo'],
    ['gap-3', 'plane'],
    ['gap-4', 'Liberty'],
    ['gap-5', 'Empire'],
    ['gap-6', 'Park'],
    ['gap-7', 'Bridge'],
    ['gap-8', 'Square'],
  ])
    await answer(id, word);
  await db.exec(`reset role;
    create function reject_ollie_test_inventory() returns trigger language plpgsql as $$ begin
      if new.item_id='reward_ollie_nyc_postcard' then raise exception 'test inventory failure'; end if;
      return new;
    end $$;
    create trigger reject_ollie_test_inventory before insert on inventory for each row execute function reject_ollie_test_inventory();`);
  await asUser(db, B);
  await expect(answer('gap-9', 'backpack')).rejects.toThrow('test inventory failure');
  expect(await rpc(db, 'my_ollie_story()')).toMatchObject({ step: 8, coins: 5, completed: false });
  await db.exec('reset role');
  expect((await db.query(`select xp from profiles where id='${B}'`)).rows).toEqual([{ xp: 0 }]);
  expect(
    (
      await db.query(
        `select * from coin_ledger where player_id='${B}' and ref='npc:ollie:ollie-australia-new-york'`,
      )
    ).rows,
  ).toEqual([]);
  expect(
    (await db.query(`select * from inventory where player_id='${B}' and item_id='reward_ollie_nyc_postcard'`))
      .rows,
  ).toEqual([]);
  await db.exec(
    'drop trigger reject_ollie_test_inventory on inventory; drop function reject_ollie_test_inventory()',
  );
  await asUser(db, B);
  expect(await answer('gap-9', 'backpack')).toMatchObject({
    awarded: { coins: 50, xp: 80, itemId: 'reward_ollie_nyc_postcard' },
  });
});
it('stores the exact approved learning content and opaque stable audio filenames privately', async () => {
  const story = JSON.parse(
    readFileSync(new URL('../../../content/quests/ollie-roadtrip.json', import.meta.url), 'utf8'),
  );
  await db.exec('reset role');
  const rows = (await db.query('select * from ollie_story_questions order by position')).rows;
  expect(rows).toHaveLength(9);
  for (let i = 0; i < 9; i++) {
    const q = story.questions[i];
    const hash = (kind: string) =>
      createHash('sha256').update(`ollie-roadtrip-v1:${q.id}:${kind}`).digest('hex').slice(0, 24);
    expect(rows[i]).toEqual({
      id: q.id,
      position: i + 1,
      narrative: q.narrative,
      options: q.options,
      solution: q.solution,
      hint: q.hint,
      reply: q.reply,
      clip: hash('question'),
      reply_clip: hash('reply'),
    });
  }
  expect(
    (
      await db.query(
        "select kind,price,starter,shop_visible,active,lootbox_weight,model from items where id='reward_ollie_nyc_postcard'",
      )
    ).rows,
  ).toEqual([
    {
      kind: 'deco',
      price: 0,
      starter: false,
      shop_visible: false,
      active: true,
      lootbox_weight: 0,
      model: 'shop/ollie-empire-state.glb',
    },
  ]);
});

it('upgrades old completion without a second grant and keeps a five-gap player at the new landmarks', async () => {
  const upgradeDb = await teacherDb();
  try {
    const original = readFileSync(
      new URL('../../../supabase/migrations/0055_ollie_story.sql', import.meta.url),
      'utf8',
    );
    const oldFunctions = original
      .slice(original.indexOf('create function public.my_ollie_story'))
      .replaceAll('create function public.', 'create or replace function public.');
    // Recreate a real six-gap release, then exercise its original completion RPC.
    await upgradeDb.exec(`
      delete from ollie_story_questions where position between 6 and 8;
      update ollie_story_questions set position=6 where id='remember';
      alter table ollie_story_progress drop constraint ollie_story_progress_check;
      alter table ollie_story_progress add constraint ollie_story_progress_check check((step=6)=(completed_at is not null));
    `);
    await upgradeDb.exec(oldFunctions);
    const oldWords = ['backpack', 'kangaroo', 'plane', 'Liberty', 'Empire', 'backpack'];
    for (const [player, count] of [
      [C, 6],
      [D, 5],
    ] as const) {
      await asUser(upgradeDb, player);
      for (let i = 0; i < count; i++)
        await rpc(upgradeDb, `answer_ollie_story('gap-${i + 1}','${oldWords[i]}')`);
    }
    await upgradeDb.exec('reset role');
    const before = (
      await upgradeDb.query(`select completed_at from ollie_story_progress where player_id='${C}'`)
    ).rows;
    const counts = async () =>
      (
        await upgradeDb.query(`select
      (select coins from profiles where id='${C}') coins,
      (select xp from profiles where id='${C}') xp,
      (select qty from inventory where player_id='${C}' and item_id='reward_ollie_nyc_postcard') qty,
      (select count(*)::int from coin_ledger where player_id='${C}' and ref='npc:ollie:ollie-australia-new-york') grants`)
      ).rows;
    expect(await counts()).toEqual([{ coins: 50, xp: 80, qty: 1, grants: 1 }]);
    await upgradeDb.exec(
      readFileSync(
        new URL('../../../supabase/migrations/0056_ollie_story_nyc_extension.sql', import.meta.url),
        'utf8',
      ),
    );
    expect(
      (await upgradeDb.query(`select completed_at from ollie_story_progress where player_id='${C}'`)).rows,
    ).toEqual(before);
    await asUser(upgradeDb, C);
    expect(await rpc(upgradeDb, 'my_ollie_story()')).toMatchObject({
      step: 9,
      total: 9,
      completed: true,
      question: null,
    });
    expect(await rpc(upgradeDb, "answer_ollie_story('gap-9','backpack')")).toMatchObject({
      alreadySolved: true,
      awarded: { coins: 0, xp: 0, itemId: null },
      progress: null,
    });
    await asUser(upgradeDb, D);
    expect(await rpc(upgradeDb, 'my_ollie_story()')).toMatchObject({
      step: 5,
      total: 9,
      completed: false,
      question: { id: 'gap-6', position: 6 },
    });
    await expect(rpc(upgradeDb, "answer_ollie_story('gap-9','backpack')")).rejects.toThrow(
      'question not current',
    );
    for (const [i, word] of ['Park', 'Bridge', 'Square', 'backpack'].entries()) {
      const response = await rpc(upgradeDb, `answer_ollie_story('gap-${i + 6}','${word}')`);
      expect(response.awarded).toMatchObject({ coins: i === 3 ? 50 : 0, xp: i === 3 ? 80 : 0 });
    }
    await upgradeDb.exec('reset role');
    expect(await counts()).toEqual([{ coins: 50, xp: 80, qty: 1, grants: 1 }]);
  } finally {
    await upgradeDb.close();
  }
}, 30000);
