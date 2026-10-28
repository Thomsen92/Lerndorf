// Migration 0052: the teacher's rarity changes (28.10.2026) and the season manifest that the
// harness pages and pictures use stay in step with the database pool.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const manifest = JSON.parse(
  readFileSync(new URL('../../public/assets/season1/manifest.json', import.meta.url), 'utf8'),
) as { items: Array<{ file: string; rarity: string }> };
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    grant usage on schema public, auth to anon, authenticated;`);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort())
    await db.exec(readFileSync(new URL(file, dir), 'utf8'));
}, 120000);
afterAll(async () => {
  await db?.close();
});

it('makes pumpkin girl and witch statue epic and the pumpkin patch rare', async () => {
  const rows = (
    await db.query<{ id: string; rarity: string }>(
      `select id, rarity from public.items
       where id in ('season_pumpkin_girl','season_witch_statue','season_pumpkin_patch') order by id`,
    )
  ).rows;
  expect(rows).toEqual([
    { id: 'season_pumpkin_girl', rarity: 'epic' },
    { id: 'season_pumpkin_patch', rarity: 'rare' },
    { id: 'season_witch_statue', rarity: 'epic' },
  ]);
  const bands = (
    await db.query<{ rarity: string; n: number }>(
      `select rarity, count(*)::int n from public.items
       where season = '2026-11-halloween' and lootbox_weight > 0 group by rarity order by rarity`,
    )
  ).rows;
  expect(bands).toEqual([
    { rarity: 'common', n: 8 },
    { rarity: 'epic', n: 6 },
    { rarity: 'legendary', n: 2 },
    { rarity: 'rare', n: 12 },
  ]);
});

it('keeps the season manifest equal to the database pool', async () => {
  const rows = (
    await db.query<{ model: string; rarity: string }>(
      `select model, rarity from public.items where season = '2026-11-halloween' and lootbox_weight > 0`,
    )
  ).rows;
  const fromDb = new Map(rows.map((r) => [r.model.replace('season1/', ''), r.rarity]));
  expect(manifest.items).toHaveLength(28);
  for (const item of manifest.items)
    expect([item.file, item.rarity === 'normal' ? 'common' : item.rarity]).toEqual([
      item.file,
      fromDb.get(item.file),
    ]);
});
