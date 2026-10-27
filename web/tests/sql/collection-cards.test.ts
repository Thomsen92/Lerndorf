import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const catalog = JSON.parse(
  readFileSync(new URL('../../public/assets/collection/catalog.json', import.meta.url), 'utf8'),
) as { contentVersion: string; cards: Array<{ id: string; rarity: string }> };
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000021';
const B = '00000000-0000-0000-0000-000000000022';
const SEASON = '2026-11-halloween';
let db: PGlite;
async function actor(id: string): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
async function grant(
  player: string,
  card: string,
  source = 'learnpass',
  ref = `tier:1:${card}`,
): Promise<{ v: Record<string, unknown> }> {
  return (
    await db.query<{ v: Record<string, unknown> }>(
      'select public.grant_season_card($1,$2,$3,$4,$5) v',
      [player, SEASON, card, source, ref],
    )
  ).rows[0];
}
async function cards(): Promise<Array<{ cardId: string }>> {
  const row = (
    await db.query<{ v: { cards: Array<{ cardId: string }> } }>(
      'select public.my_season_cards($1) v',
      [SEASON],
    )
  ).rows[0];
  return row.v.cards;
}
describe('collection card ownership', () => {
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
        ends_on = public.season_today() + 1, closed_at = null where id = '${SEASON}';`);
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });

  it('seeds exactly the 50 catalogue definitions with the generated content version', async () => {
    const rows = (
      await db.query<{ id: string; rarity: string; content_version: string; active: boolean }>(
        'select id, rarity, content_version, active from public.season_card_definitions order by id',
      )
    ).rows;
    expect(rows).toHaveLength(50);
    expect(rows.map((row) => row.id)).toEqual(catalog.cards.map((card) => card.id).sort());
    for (const row of rows) {
      expect(row.rarity).toBe(catalog.cards.find((card) => card.id === row.id)?.rarity);
      expect(row.content_version).toBe(catalog.contentVersion);
      expect(row.active).toBe(true);
    }
    expect(rows.filter((row) => row.rarity === 'legendary')).toEqual([
      expect.objectContaining({ id: 'highlight-halloween-card' }),
    ]);
  });

  it('starts empty, rejects unknown seasons and never accepts a client-supplied pupil', async () => {
    await actor(A);
    expect(await cards()).toEqual([]);
    await expect(db.query("select public.my_season_cards('other-season')")).rejects.toThrow(
      /season not found/,
    );
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); set role anon;`);
    await expect(db.query('select public.my_season_cards($1)', [SEASON])).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query("select public.grant_season_card($1,$2,'bat-cat','learnpass','x')", [A, SEASON]),
    ).rejects.toThrow(/permission denied/);
  });

  it('grants normal/rare cards through the pass only and epic/legendary through chests only', async () => {
    await db.exec('reset role;');
    expect((await grant(A, 'adjective-key')).v).toMatchObject({ granted: true, alreadyOwned: false });
    await actionError(() => grant(A, 'actions-words'), /wrong source/);
    await actionError(() => grant(A, 'bat-cat', 'season_chest'), /wrong source/);
    expect((await grant(A, 'actions-words', 'season_chest', 'chest:1')).v).toMatchObject({
      granted: true,
    });
    await actor(A);
    expect((await cards()).map((card) => card.cardId).sort()).toEqual(['actions-words', 'adjective-key']);
  });

  it('is idempotent per ref and never stores a card twice', async () => {
    await db.exec('reset role;');
    expect((await grant(A, 'bat-cat', 'learnpass', 'tier:2:bat-cat')).v).toMatchObject({ granted: true });
    expect((await grant(A, 'bat-cat', 'learnpass', 'tier:2:bat-cat')).v).toMatchObject({
      granted: false,
      alreadyOwned: true,
    });
    // A second source for the same card returns the stored ownership, not a second row.
    expect((await grant(A, 'bat-cat', 'learnpass', 'tier:99:bat-cat')).v).toMatchObject({
      granted: false,
      alreadyOwned: true,
    });
    expect(
      (
        await db.query(
          'select count(*)::int n from public.player_season_cards where player_id = $1 and card_id = $2',
          [A, 'bat-cat'],
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    expect(
      (
        await db.query('select count(*)::int n from public.season_card_grants where player_id = $1', [A])
      ).rows,
    ).toEqual([{ n: 3 }]);
  });

  it('keeps ownership per pupil and gives teachers a read-only view', async () => {
    await db.exec('reset role;');
    expect((await grant(B, 'night-light', 'learnpass', 'tier:3:night-light')).v).toMatchObject({
      granted: true,
    });
    await actor(B);
    expect((await cards()).map((card) => card.cardId)).toEqual(['night-light']);
    await actor(T);
    const view = (
      await db.query<{ v: { cards: Array<{ cardId: string }> } }>(
        'select public.teacher_player_cards($1,$2) v',
        [A, SEASON],
      )
    ).rows[0].v;
    expect(view.cards.map((card) => card.cardId).sort()).toEqual(
      ['actions-words', 'adjective-key', 'bat-cat'].sort(),
    );
    await actor(B);
    await expect(db.query('select public.teacher_player_cards($1,$2)', [A, SEASON])).rejects.toThrow(
      /teacher/,
    );
  });

  it('rejects inactive cards, unknown cards and the wrong season', async () => {
    await db.exec("reset role; update public.season_card_definitions set active = false where id = 'night-light'");
    await actionError(() => grant(B, 'night-light'), /not available/);
    await actionError(() => grant(A, 'not-a-card'), /unknown card/);
    await db.exec("reset role; update public.season_card_definitions set active = true where id = 'night-light'");
  });

  it('blocks direct ownership writes and keeps quantity at one', async () => {
    await db.exec(
      `reset role; grant select, insert, update, delete on public.player_season_cards to authenticated;
       grant select, insert, update, delete on public.season_card_grants to authenticated;`,
    );
    await actor(A);
    await expect(
      db.query("insert into public.player_season_cards(player_id,card_id) values($1,'witch-recipe')", [A]),
    ).rejects.toThrow(/row-level security/);
    expect((await db.query('delete from public.player_season_cards returning card_id')).rows).toEqual([]);
    expect(
      (await db.query("update public.player_season_cards set quantity = 2 returning card_id")).rows,
    ).toEqual([]);
    await expect(
      db.query("insert into public.season_card_grants(player_id,season_id,source,source_ref,card_id) values($1,$2,'learnpass','x','witch-recipe')", [
        A,
        SEASON,
      ]),
    ).rejects.toThrow(/row-level security/);
  });

  it('never touches coins, xp, village items or placements', async () => {
    await db.exec('reset role;');
    const tables = ['profiles', 'xp_ledger', 'coin_ledger', 'inventory', 'placements', 'items'];
    const snapshot = async () =>
      Promise.all(
        tables.map(
          async (table) =>
            (
              await db.query(
                `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), '[]') v from public.${table} t`,
              )
            ).rows,
        ),
      );
    const before = await snapshot();
    await db.exec('reset role;');
    await grant(A, 'slow-steady', 'learnpass', 'tier:9:slow-steady');
    await db.exec('reset role;');
    expect(await snapshot()).toEqual(before);
  });
});

async function actionError(fn: () => Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(fn()).rejects.toThrow(pattern);
}
