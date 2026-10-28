import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const catalog = JSON.parse(
  readFileSync(new URL('../../public/assets/collection/catalog.json', import.meta.url), 'utf8'),
) as { passCardRewards: Array<{ tier: number; cardIds: string[] }> };
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000021';
const B = '00000000-0000-0000-0000-000000000022';
const SEASON = '2026-11-halloween';
let db: PGlite;
let chest = 0;
async function actor(id: string): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
async function claim(tier: number): Promise<Record<string, unknown>> {
  return (await db.query<{ v: Record<string, unknown> }>('select public.claim_season_tier($1) v', [tier]))
    .rows[0].v;
}
async function open(id: number): Promise<Record<string, unknown>> {
  return (await db.query<{ v: Record<string, unknown> }>('select public.open_season_chest($1) v', [id]))
    .rows[0].v;
}
async function newChest(player: string): Promise<number> {
  chest += 1;
  return (
    await db.query<{ id: number }>(
      `insert into public.season_chests(player_id,season,source,ref)
       values($1,$2,'shop','test-${chest}') returning id`,
      [player, SEASON],
    )
  ).rows[0].id;
}
async function ownerCards(player: string): Promise<string[]> {
  return (
    await db.query<{ card_id: string }>(
      'select card_id from public.player_season_cards where player_id = $1 order by card_id',
      [player],
    )
  ).rows.map((row) => row.card_id);
}
describe('pass and chest card rewards', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    for (const file of readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()) {
      await db.exec(readFileSync(new URL(file, dir), 'utf8'));
    }
    await db.exec(`insert into auth.users values('${T}'),('${A}'),('${B}');
      insert into public.profiles(id,nickname,role) values('${T}','teacher','teacher');
      insert into public.profiles(id,nickname,class_id,plot_index) values
        ('${A}','anna','8a',0),('${B}','ben','8b',0);
      update public.seasons set starts_on = public.season_today() - 1,
        ends_on = public.season_today() + 1, closed_at = null where id = '${SEASON}';
      insert into public.xp_ledger(player_id,delta,reason,ref) values
        ('${A}',1000,'quest','seed'),('${B}',1000,'quest','seed');`);
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });

  it('seeds the 35 pass cards exactly as the catalogue assigns them', async () => {
    const rows = (
      await db.query<{ tier: number; card_id: string }>(
        'select tier, card_id from public.season_tier_card_rewards order by tier, card_id',
      )
    ).rows;
    expect(rows).toHaveLength(35);
    const expected = catalog.passCardRewards
      .flatMap((reward) => reward.cardIds.map((cardId) => `${reward.tier}:${cardId}`))
      .sort();
    expect(rows.map((row) => `${row.tier}:${row.card_id}`).sort()).toEqual(expected);
  });

  it('grants pass cards in the same claim as coins and never twice', async () => {
    await actor(A);
    const claimed = (await claim(1)) as { rewards: Record<string, unknown> };
    const rewards = claimed.rewards;
    expect(rewards.cards).toEqual([
      expect.objectContaining({ id: 'pumpkin-comparisons', rarity: 'normal', granted: true }),
    ]);
    expect(rewards.coins).toBe(5);
    expect(await ownerCards(A)).toEqual(['pumpkin-comparisons']);
    await db.exec('reset role;');
    const coins = (await db.query('select coins from public.profiles where id = $1', [A])).rows[0];
    await actor(A);
    await expect(claim(1)).rejects.toThrow(/already claimed/);
    await db.exec('reset role;');
    expect((await db.query('select coins from public.profiles where id = $1', [A])).rows[0]).toEqual(coins);
  });

  it('backfills a claimed tier once when the collection is read', async () => {
    await actor(A);
    const third = (await claim(3)) as { rewards: { cards: Array<{ id: string }> } };
    expect(third.rewards).toMatchObject({
      cards: [expect.objectContaining({ id: 'bat-cat' }), expect.objectContaining({ id: 'night-light' })],
    });
    // Simulate a claim from before the card migration.
    await db.exec(
      `reset role; delete from public.season_card_grants where player_id = '${A}' and source_ref like 'tier:3:%';
       delete from public.player_season_cards where player_id = '${A}' and card_id in ('bat-cat','night-light');`,
    );
    await actor(A);
    const state = (
      await db.query<{ v: { cards: Array<{ cardId: string }> } }>('select public.my_season_cards($1) v', [
        SEASON,
      ])
    ).rows[0].v;
    expect(state.cards.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(['bat-cat', 'night-light']),
    );
    expect(
      (
        await db.query(
          "select count(*)::int n from public.season_card_grants where player_id = $1 and source_ref like 'tier:3:%'",
          [A],
        )
      ).rows,
    ).toEqual([{ n: 2 }]);
  });

  it('keeps the chest card bonus disabled by default', async () => {
    await db.exec('reset role;');
    const id = await newChest(B);
    await actor(B);
    const result = await open(id);
    expect(result).toMatchObject({ card: null, cardStatus: 'disabled' });
    expect(await ownerCards(B)).toEqual([]);
  });

  it('awards only unowned epic/legendary cards when enabled and stores the result', async () => {
    await db.exec(
      `reset role; update public.season_chest_card_config
         set enabled = true, hit_rate = 1, epic_weight = 1, legendary_weight = 0
       where season = '${SEASON}';`,
    );
    const id = await newChest(B);
    await actor(B);
    const result = await open(id);
    expect(result.cardStatus).toBe('awarded');
    expect(result.card).toMatchObject({ rarity: 'epic' });
    const card = result.card as { id: string };
    expect(await ownerCards(B)).toEqual([card.id]);
    const again = await open(id);
    expect(again).toMatchObject({ reopened: true, card: { id: card.id }, cardStatus: 'awarded' });
    expect(await ownerCards(B)).toHaveLength(1);
  });

  it('reports complete without a card once all chest cards are owned', async () => {
    await db.exec('reset role;');
    for (const id of [
      'actions-words',
      'birds-feather',
      'blood-moon-story',
      'bloody-friday-card',
      'book-cover',
      'echo-verse',
      'fortune-brave',
      'knowledge-power',
      'manhattan-postcard',
      'silver-lining',
      'sleepy-skeletons',
      'towers-after-dark-card',
      'vaping-reprimand-card',
      'witch-recipe',
      'highlight-halloween-card',
    ]) {
      await db.query('select public.grant_season_card($1,$2,$3,$4,$5)', [
        B,
        SEASON,
        id,
        'season_chest',
        `fill:${id}`,
      ]);
    }
    const id = await newChest(B);
    const xpBefore = (
      await db.query<{ total: number }>(
        'select coalesce(sum(delta),0)::int total from public.xp_ledger where player_id = $1',
        [B],
      )
    ).rows[0];
    await actor(B);
    const result = await open(id);
    expect(result).toMatchObject({ card: null, cardStatus: 'complete' });
    // The village item reward is untouched.
    expect(result.item_id).toBeTruthy();
    expect(
      (
        await db.query<{ total: number }>(
          'select coalesce(sum(delta),0)::int total from public.xp_ledger where player_id = $1',
          [B],
        )
      ).rows[0],
    ).toEqual(xpBefore);
  });

  it('keeps chests opened before this migration at legacy and never draws retroactively', async () => {
    await db.exec('reset role;');
    const item = (
      await db.query<{ id: string }>(
        'select id from public.items where season = $1 and lootbox_weight > 0 order by id limit 1',
        [SEASON],
      )
    ).rows[0].id;
    const id = (
      await db.query<{ id: number }>(
        `insert into public.season_chests(player_id,season,source,ref,opened_at,rarity,item_id,duplicate,coins)
         values($1,$2,'shop','legacy',now(),'common',$3,false,0) returning id`,
        [B, SEASON, item],
      )
    ).rows[0].id;
    await actor(B);
    const cardsBefore = await ownerCards(B);
    expect(await open(id)).toMatchObject({ reopened: true, card: null, cardStatus: 'legacy' });
    expect(await ownerCards(B)).toEqual(cardsBefore);
  });

  it('never grants the card bonus to clients directly', async () => {
    await actor(A);
    await expect(db.query('select public.season_reconcile_pass_cards($1,$2)', [A, SEASON])).rejects.toThrow(
      /permission denied/,
    );
    await db.exec('reset role;');
  });
});
