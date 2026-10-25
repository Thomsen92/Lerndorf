// SQL tests for migration 0019 (part 2): tutorial_state, tutorial_start, automatic plot, claim_plot closed.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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
];
const migrationDir = new URL('../../../supabase/migrations/', import.meta.url);
const TEACHER = '00000000-0000-0000-0000-000000000001';
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';
const CARLA = '00000000-0000-0000-0000-000000000013';
const DORA = '00000000-0000-0000-0000-000000000014'; // 8b
const HAUS = '00000000-0000-0000-0000-000000000015'; // 8a, already has a house
const NEWB = '00000000-0000-0000-0000-000000000016'; // 8b, arrives when 8b is full

const AUTH_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;
const SUPABASE_DEFAULT_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`;
const SUPABASE_DEFAULT_PRIVILEGES = `
  alter default privileges in schema public
    grant select, insert, update, delete on tables to anon, authenticated;
`;

let db: PGlite;
const asSuperuser = async (sql: string): Promise<void> => {
  await db.exec(`reset role; ${sql}`);
};
const asUser = async (uid: string): Promise<void> => {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`,
  );
};
const expectError = async (sql: string, message: RegExp, code?: string): Promise<void> => {
  try {
    await db.query(sql);
  } catch (e) {
    expect((e as Error).message).toMatch(message);
    if (code) expect((e as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected an error for: ${sql}`);
};
type State = { needed: boolean; step: string; plot_index: number | null; character: string | null; answered: number };
const state = async (uid: string): Promise<State> => {
  await asUser(uid);
  const r = await db.query<{ s: State }>('select tutorial_state() as s');
  return r.rows[0].s;
};
const start = async (uid: string): Promise<State> => {
  await asUser(uid);
  const r = await db.query<{ s: State }>('select tutorial_start() as s');
  return r.rows[0].s;
};

beforeAll(async () => {
  db = await PGlite.create();
  await db.exec(AUTH_STUB);
  for (const file of MIGRATIONS) {
    const sql = readFileSync(new URL(file, migrationDir), 'utf8');
    if (file === '0002_rls.sql') await db.exec(SUPABASE_DEFAULT_GRANTS);
    if (file === '0015_daily_quests.sql') await db.exec(SUPABASE_DEFAULT_PRIVILEGES);
    await db.exec(sql);
  }
  await asSuperuser(`
    insert into auth.users (id) values ('${TEACHER}'), ('${ANNA}'), ('${BEN}'), ('${CARLA}'),
      ('${DORA}'), ('${HAUS}'), ('${NEWB}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${TEACHER}', 'lehrkraft', 'teacher', null, null, 0),
      ('${ANNA}', 'anna', 'student', '8a', null, 0),
      ('${BEN}', 'ben', 'student', '8a', null, 0),
      ('${CARLA}', 'carla', 'student', '8a', null, 0),
      ('${DORA}', 'dora', 'student', '8b', null, 0),
      ('${HAUS}', 'hausi', 'student', '8a', 20, 0),
      ('${NEWB}', 'newb', 'student', '8b', null, 0);
    insert into placements (player_id, item_id, slot, rot) values ('${HAUS}', 'house_fachwerk', 'house', 0);
  `);
});

afterAll(async () => {
  await db.close();
});

describe('tutorial_state', () => {
  it('the teacher never needs the tutorial', async () => {
    const s = await state(TEACHER);
    expect(s.needed).toBe(false);
  });

  it('a pupil with a placed house does not need it and gets a done row', async () => {
    const s = await state(HAUS);
    expect(s).toMatchObject({ needed: false, step: 'done', plot_index: 20 });
    await asSuperuser('');
    const r = await db.query<{ step: string; completed_at: unknown }>(
      `select step, completed_at from tutorial_progress where player_id = '${HAUS}'`,
    );
    expect(r.rows[0].step).toBe('done');
    expect(r.rows[0].completed_at).not.toBeNull();
  });

  it('a new pupil needs it, at step intro, without plot or figure', async () => {
    const s = await state(ANNA);
    expect(s).toEqual({ needed: true, step: 'intro', plot_index: null, character: null, answered: 0 });
  });

  it('reports the stored figure', async () => {
    await asUser(ANNA);
    await db.query(`select set_character('girl')`);
    expect((await state(ANNA)).character).toBe('girl');
  });

  it('anonymous callers are refused', async () => {
    await asSuperuser(`reset role; set role anon;`);
    await expect(db.query('select tutorial_state()')).rejects.toThrow(/permission denied/);
  });
});

describe('tutorial_start: automatic plot', () => {
  it('gives the first pupil plot 0 and the second plot 1', async () => {
    expect(await start(ANNA)).toMatchObject({ needed: true, step: 'intro', plot_index: 0 });
    expect(await start(BEN)).toMatchObject({ needed: true, step: 'intro', plot_index: 1 });
  });

  it('calling again keeps the plot and the step', async () => {
    expect(await start(ANNA)).toMatchObject({ step: 'intro', plot_index: 0 });
    await asSuperuser('');
    const r = await db.query(`select 1 from tutorial_progress where player_id = '${ANNA}'`);
    expect(r.rows).toHaveLength(1);
  });

  it('fills a gap: the lowest free index wins', async () => {
    await asSuperuser(`update profiles set plot_index = null where id = '${ANNA}'`);
    expect(await start(CARLA)).toMatchObject({ plot_index: 0 });
    // Anna comes back without a plot and gets the next free one
    expect(await start(ANNA)).toMatchObject({ plot_index: 2 });
  });

  it('classes are independent: 8b starts at 0 as well', async () => {
    expect(await start(DORA)).toMatchObject({ plot_index: 0 });
  });

  it('a pupil who already has a house gets nothing assigned', async () => {
    expect(await start(HAUS)).toMatchObject({ needed: false, plot_index: 20 });
  });

  it('the teacher cannot start', async () => {
    await asUser(TEACHER);
    await expectError('select tutorial_start()', /forbidden/, '42501');
  });

  it('a full village (34 plots) refuses with 53400', async () => {
    await asSuperuser(`
      insert into auth.users (id)
        select ('00000000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 33) g;
      insert into profiles (id, nickname, role, class_id, plot_index, coins)
        select ('00000000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'fill' || g, 'student', '8b', g, 0
        from generate_series(1, 33) g;
    `);
    await asUser(NEWB);
    await expectError('select tutorial_start()', /village is full/, '53400');
  });
});

describe('claim_plot is closed for pupils', () => {
  it('a pupil cannot choose a plot any more', async () => {
    await asSuperuser(`update profiles set plot_index = null where id = '${BEN}'`);
    await asUser(BEN);
    await expectError('select claim_plot(9)', /plot is assigned automatically/, '42501');
  });
});
