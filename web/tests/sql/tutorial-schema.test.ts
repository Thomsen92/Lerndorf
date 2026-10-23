// SQL tests for migration 0019 (part 1): tutorial tables, questions, ledger reason, catalogue.
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
const ANNA = '00000000-0000-0000-0000-000000000011';
const BEN = '00000000-0000-0000-0000-000000000012';

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
// Real Supabase grants every new public table to anon/authenticated by default privileges.
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
    insert into auth.users (id) values ('${ANNA}'), ('${BEN}');
    insert into profiles (id, nickname, role, class_id, plot_index, coins) values
      ('${ANNA}', 'anna', 'student', '8a', null, 0),
      ('${BEN}', 'ben', 'student', '8a', null, 0);
    insert into tutorial_progress (player_id) values ('${ANNA}'), ('${BEN}');
  `);
});

afterAll(async () => {
  await db.close();
});

describe('tutorial questions', () => {
  it('questions: five rows, numbered 1..5, solutions in a separate table', async () => {
    await asSuperuser('');
    const q = await db.query<{ nr: number; type: string; hint: string; data: Record<string, unknown> }>(
      'select nr, type, hint, data from tutorial_questions order by nr',
    );
    expect(q.rows.map((r) => r.nr)).toEqual([1, 2, 3, 4, 5]);
    expect(q.rows.map((r) => r.type)).toEqual(['choice', 'gap', 'choice', 'match', 'listening']);
    for (const r of q.rows) expect(r.hint.length).toBeGreaterThan(0);
    // the public data never carries a solution
    for (const r of q.rows) expect(JSON.stringify(r.data)).not.toMatch(/solution/i);
    expect(q.rows[4].data.mode).toBe('choice');
    expect(q.rows[4].data.speak).toBe('Hello! I am your new neighbour. Welcome to the village!');

    const s = await db.query<{ nr: number; solution: unknown }>(
      'select nr, solution from tutorial_solutions order by nr',
    );
    expect(s.rows.map((r) => r.nr)).toEqual([1, 2, 3, 4, 5]);
    expect(s.rows[0].solution).toBe('house');
    expect(s.rows[1].solution).toEqual(['is']);
    expect(s.rows[2].solution).toBe('red');
    expect(s.rows[3].solution).toEqual([
      ['dog', 'Hund'],
      ['cat', 'Katze'],
      ['bird', 'Vogel'],
    ]);
    expect(s.rows[4].solution).toBe('your new neighbour');
  });

  it('solutions are checked by the existing answer_matches unchanged', async () => {
    await asSuperuser('');
    const r = await db.query<{ ok: boolean }>(`
      select public.quest_answer_matches(q.type, q.data, s.solution,
        case when q.type = 'gap' then s.solution->0 else s.solution end) as ok
      from tutorial_questions q join tutorial_solutions s using (nr) order by nr`);
    expect(r.rows.map((x) => x.ok)).toEqual([true, true, true, true, true]);
  });

  it('pupil cannot select tutorial_solutions or tutorial_questions', async () => {
    await asUser(ANNA);
    await expect(db.query('select * from tutorial_solutions')).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from tutorial_questions')).rejects.toThrow(/permission denied/);
    await expect(
      db.query(`insert into tutorial_questions (nr, type, prompt, data, hint) values (9, 'gap', 'x', '{}', 'x')`),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('tutorial_progress', () => {
  it('pupil can read only own tutorial_progress row, cannot insert/update it', async () => {
    await asUser(ANNA);
    const r = await db.query<{ player_id: string; step: string; answered: number }>(
      'select player_id, step, answered from tutorial_progress',
    );
    expect(r.rows).toEqual([{ player_id: ANNA, step: 'intro', answered: 0 }]);
    await expect(
      db.query(`insert into tutorial_progress (player_id) values ('${BEN}')`),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query(`update tutorial_progress set step = 'done'`)).rejects.toThrow(/permission denied/);
    await expect(db.query(`delete from tutorial_progress`)).rejects.toThrow(/permission denied/);
  });

  it('step is limited to the five known steps', async () => {
    await asSuperuser('');
    await expect(db.query(`update tutorial_progress set step = 'nope' where player_id = '${ANNA}'`)).rejects.toThrow(
      /check/,
    );
    const r = await db.query<{ answered: number; reward_paid: boolean; house_bought: boolean; completed_at: unknown }>(
      `select answered, reward_paid, house_bought, completed_at from tutorial_progress where player_id = '${ANNA}'`,
    );
    expect(r.rows[0]).toEqual({ answered: 0, reward_paid: false, house_bought: false, completed_at: null });
  });
});

describe('catalogue and ledger', () => {
  it('house_fachwerk costs 50 and is no starter', async () => {
    await asSuperuser('');
    const r = await db.query<{ starter: boolean; price: number }>(
      `select starter, price from items where id = 'house_fachwerk'`,
    );
    expect(r.rows[0]).toEqual({ starter: false, price: 50 });
  });

  it('coin_ledger accepts reason tutorial once per player', async () => {
    await asSuperuser(`insert into coin_ledger (player_id, delta, reason, ref) values ('${ANNA}', 50, 'tutorial', 'tutorial')`);
    await expect(
      db.query(`insert into coin_ledger (player_id, delta, reason, ref) values ('${ANNA}', 50, 'tutorial', 'again')`),
    ).rejects.toThrow(/duplicate key|unique/);
    // another player may still get theirs, other reasons are untouched
    await db.query(`insert into coin_ledger (player_id, delta, reason, ref) values ('${BEN}', 50, 'tutorial', 'tutorial')`);
    await db.query(`insert into coin_ledger (player_id, delta, reason, ref) values ('${ANNA}', 5, 'quest', 'q1')`);
  });
});
