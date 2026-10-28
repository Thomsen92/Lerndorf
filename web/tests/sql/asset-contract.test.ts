// A2: asset contract for the season and shop catalogue — every referenced model exists, all GLBs
// are real glTF binaries with a far version (or an explicitly budgeted low-poly original),
// and the known broken assets never enter the catalogue.
import { PGlite } from '@electric-sql/pglite';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { GLB_ITEMS } from '../../src/render/glbItems';

const MIGRATIONS = [
  '0001_schema.sql',
  '0002_rls.sql',
  '0003_seed.sql',
  '0004_rpc_teacher.sql',
  '0005_grants_hardening.sql',
  '0006_avatar_shop_build.sql',
  '0007_tasks_rpc.sql',
  '0008_teacher_stats_catalog.sql',
  '0009_instances.sql',
  '0010_layout_maps.sql',
  '0011_instance_rules.sql',
  '0012_claim_plot.sql',
  '0013_plot_slots.sql',
  '0014_cat_sign_shop_asset.sql',
  '0015_daily_quests.sql',
  '0016_daily_quests_rpc.sql',
  '0017_daily_quests_teacher.sql',
  '0018_character_choice.sql',
  '0019_first_login_tutorial.sql',
  '0020_xp_levels.sql',
  '0021_tutorial_tap_questions.sql',
  '0022_teacher_overhaul.sql',
  '0023_avatar_wardrobe.sql',
  '0024_four_daily_quests.sql',
  '0025_economy_balance.sql',
  '0026_shared_avatar_accessories.sql',
  '0027_public_visitor_profiles.sql',
  '0028_seasons.sql',
  '0029_season_rpc.sql',
  '0030_season_content.sql',
  '0031_season_shop.sql',
];
const dir = new URL('../../../supabase/migrations/', import.meta.url);
const assets = new URL('../../public/assets/', import.meta.url);
const BROKEN = /tristar|landyroamer|delorean|dae|halloween[_-]cat/i;
const approvedLowPoly: Array<{ id: string; file: string; kind: 'deco' | 'house' | 'garage' }> = JSON.parse(
  readFileSync(new URL('../../../content/shop/ollie-items.json', import.meta.url), 'utf8'),
).items;
const lowPolyByFile = new Map(approvedLowPoly.map((item) => [`shop/${item.file}`, item]));

/** Count every scene instance, including six apples sharing one mesh; no audit self-report. */
function trianglesInGlb(bytes: Buffer): number {
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString()) as {
    scene?: number;
    scenes: Array<{ nodes: number[] }>;
    nodes: Array<{ mesh?: number; children?: number[] }>;
    meshes: Array<{
      primitives: Array<{ indices?: number; attributes: { POSITION: number }; mode?: number }>;
    }>;
    accessors: Array<{ count: number }>;
  };
  const countNode = (index: number): number => {
    const node = gltf.nodes[index];
    const own =
      node.mesh === undefined
        ? 0
        : gltf.meshes[node.mesh].primitives.reduce((sum, primitive) => {
            expect(primitive.mode ?? 4).toBe(4); // triangles, not lines/points or unsupported strips
            const count = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count;
            expect(count % 3).toBe(0);
            return sum + count / 3;
          }, 0);
    return own + (node.children ?? []).reduce((sum, child) => sum + countNode(child), 0);
  };
  return gltf.scenes[gltf.scene ?? 0].nodes.reduce((sum, node) => sum + countNode(node), 0);
}

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

let db: PGlite;

describe('asset contract', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(AUTH_STUB);
    for (const file of MIGRATIONS) await db.exec(readFileSync(new URL(file, dir), 'utf8'));
  }, 90000);

  afterAll(async () => {
    await db?.close();
  });

  it('references only models that exist on disk', async () => {
    const rows = (
      await db.query<{ id: string; model: string }>(
        'select id, model from public.items where model is not null',
      )
    ).rows;
    let checked = 0;
    for (const row of rows) {
      if (row.model.startsWith('scene/')) continue; // composed from the Kenney kit, no file of its own
      expect(existsSync(new URL(row.model, assets)), `${row.id}: ${row.model}`).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(34);
  });

  it('never references the known broken assets', async () => {
    const rows = (
      await db.query<{ id: string; model: string }>(
        'select id, model from public.items where model is not null',
      )
    ).rows;
    for (const row of rows) {
      expect(BROKEN.test(row.id), row.id).toBe(false);
      if (!row.model.startsWith('scene/')) expect(BROKEN.test(row.model), row.model).toBe(false);
    }
  });

  it('ships binary glTF with a far version or an approved, measured low-poly original', () => {
    for (const pack of ['season1', 'shop']) {
      const folder = new URL(`${pack}/`, assets);
      const files = readdirSync(folder).filter((f) => f.endsWith('.glb') && !f.includes('.lod.'));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const bytes = readFileSync(new URL(file, folder));
        expect(bytes.subarray(0, 4).toString('ascii'), file).toBe('glTF');
        const lowPoly = lowPolyByFile.get(`${pack}/${file}`);
        if (lowPoly) {
          // Only the fourteen approved additions qualify. A future lod:false flag alone
          // never exempts an unrelated asset from shipping its existing far model.
          expect(GLB_ITEMS[lowPoly.id]).toMatchObject({
            file: `${pack}/${file}`,
            kind: lowPoly.kind,
            lod: false,
          });
          const triangles = trianglesInGlb(bytes);
          expect(triangles, file).toBeGreaterThan(0);
          const budget = { deco: 1500, house: 4000, garage: 2500 }[lowPoly.kind];
          expect(triangles, `${file}: low-poly far template exceeds ${budget} triangles`).toBeLessThanOrEqual(
            budget,
          );
          continue;
        }
        const lod = file.replace(/\.glb$/, '.lod.glb');
        expect(existsSync(new URL(lod, folder)), lod).toBe(true);
      }
    }
  });
});
