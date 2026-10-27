import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dir = new URL('../../../supabase/migrations/', import.meta.url);
const T = '00000000-0000-0000-0000-000000000001';
const A = '00000000-0000-0000-0000-000000000021';
const B = '00000000-0000-0000-0000-000000000022';
const SEASON = '2026-11-halloween';

interface State {
  classId: string;
  requestedTheme: string;
  effectiveTheme: string;
  revision: number;
  seasonId: string | null;
  seasonLabel: string | null;
  seasonState: string | null;
  welcomeSeen: boolean;
}
let db: PGlite;
async function actor(id: string): Promise<void> {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`,
  );
}
async function call(sql: string, args: unknown[] = []): Promise<State> {
  return (await db.query<{ v: State }>(`select public.${sql} v`, args)).rows[0].v;
}
async function running(): Promise<void> {
  await db.exec(
    `reset role; update public.seasons set starts_on = public.season_today() - 1,
       ends_on = public.season_today() + 1, closed_at = null where id = '${SEASON}';`,
  );
}
async function planned(): Promise<void> {
  await db.exec(
    `reset role; update public.seasons set starts_on = public.season_today() + 5,
       ends_on = public.season_today() + 30, closed_at = null where id = '${SEASON}';`,
  );
}
describe('class world theme', () => {
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
        ('${A}','anna','8a',0),('${B}','ben','8b',0);`);
    await running();
  }, 120000);
  afterAll(async () => {
    await db?.close();
  });

  it('defaults to normal, shows the running season and an unseen welcome', async () => {
    await actor(A);
    expect(await call('world_theme_state()')).toEqual({
      classId: '8a',
      requestedTheme: 'normal',
      effectiveTheme: 'normal',
      revision: 0,
      seasonId: SEASON,
      seasonLabel: 'Season I – Halloween',
      seasonState: 'running',
      welcomeSeen: false,
    });
    await actor(T);
    expect(await call('teacher_world_theme_state($1)', ['8b'])).toMatchObject({
      classId: '8b',
      requestedTheme: 'normal',
      effectiveTheme: 'normal',
      seasonId: SEASON,
    });
  });

  it('persists Halloween per class, increments only on change and keeps 8b normal', async () => {
    await actor(T);
    expect(await call('teacher_set_world_theme($1,$2,$3)', ['8a', 'normal', null])).toMatchObject({
      revision: 0,
    });
    const first = await call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', SEASON]);
    expect(first).toMatchObject({
      classId: '8a',
      requestedTheme: 'halloween',
      effectiveTheme: 'halloween',
      revision: 1,
      seasonId: SEASON,
    });
    expect(await call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', SEASON])).toEqual(first);
    await actor(A);
    expect(await call('world_theme_state()')).toMatchObject({
      requestedTheme: 'halloween',
      effectiveTheme: 'halloween',
    });
    await actor(B);
    expect(await call('world_theme_state()')).toMatchObject({
      requestedTheme: 'normal',
      effectiveTheme: 'normal',
      revision: 0,
    });
    await actor(T);
    expect(await call('teacher_set_world_theme($1,$2,$3)', ['8a', 'normal', null])).toMatchObject({
      requestedTheme: 'normal',
      effectiveTheme: 'normal',
      revision: 2,
    });
  });

  it('keeps Halloween pre-booked for a planned season and activates it by calendar', async () => {
    await planned();
    await actor(T);
    const plannedState = await call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', SEASON]);
    expect(plannedState).toMatchObject({
      requestedTheme: 'halloween',
      effectiveTheme: 'normal',
      seasonState: 'upcoming',
      revision: 3,
    });
    await actor(A);
    expect(await call('world_theme_state()')).toMatchObject({
      requestedTheme: 'halloween',
      effectiveTheme: 'normal',
      seasonState: 'upcoming',
    });
    // Moving into the window changes the effective world without a new revision.
    await running();
    const active = await call('world_theme_state()');
    expect(active).toMatchObject({
      requestedTheme: 'halloween',
      effectiveTheme: 'halloween',
      revision: 3,
      seasonState: 'running',
    });
    // After the window the same stored configuration is inert again.
    await db.exec(
      `reset role; update public.seasons set starts_on = public.season_today() - 30,
         ends_on = public.season_today() - 2 where id = '${SEASON}';`,
    );
    expect(await call('world_theme_state()')).toMatchObject({
      requestedTheme: 'halloween',
      effectiveTheme: 'normal',
      seasonState: 'ended',
    });
    await running();
  });

  it('acknowledges the welcome once per season content version', async () => {
    await actor(A);
    expect((await call('world_theme_state()')).welcomeSeen).toBe(false);
    await db.exec(`select public.ack_season_welcome('${SEASON}')`);
    expect((await call('world_theme_state()')).welcomeSeen).toBe(true);
    await db.exec(`select public.ack_season_welcome('${SEASON}')`);
    expect(
      (await db.query("select count(*)::int n from public.season_welcome_seen where player_id = $1", [A]))
        .rows,
    ).toEqual([{ n: 1 }]);
    // A new content version asks once again; another pupil keeps their own state.
    await db.exec(`reset role; update public.seasons set welcome_version = 'r15' where id = '${SEASON}'`);
    expect((await call('world_theme_state()')).welcomeSeen).toBe(false);
    await actor(B);
    expect((await call('world_theme_state()')).welcomeSeen).toBe(false);
    await db.exec(`reset role; update public.seasons set welcome_version = 'r14' where id = '${SEASON}'`);
  });

  it('rejects students, anonymous calls, missing classes and unsupported themes', async () => {
    await actor(A);
    await expect(call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', SEASON])).rejects.toThrow(
      /teacher/,
    );
    await expect(call('teacher_world_theme_state($1)', ['8b'])).rejects.toThrow(/teacher/);
    await expect(db.query(`select public.ack_season_welcome('${SEASON}')`)).resolves.toBeDefined();
    await actor(T);
    await expect(call('teacher_set_world_theme($1,$2,$3)', ['missing', 'normal', null])).rejects.toThrow(
      /class not found/,
    );
    await expect(call('teacher_world_theme_state($1)', ['missing'])).rejects.toThrow(/class not found/);
    await expect(call('teacher_set_world_theme($1,$2,$3)', ['8a', 'winter', null])).rejects.toThrow(
      /invalid world theme/,
    );
    await expect(call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', null])).rejects.toThrow(
      /season/,
    );
    await expect(
      call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', 'missing-season']),
    ).rejects.toThrow(/season/);
    await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); set role anon;`);
    await expect(call('world_theme_state()')).rejects.toThrow(/permission denied/);
    await expect(
      call('teacher_set_world_theme($1,$2,$3)', ['8a', 'halloween', SEASON]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query(`select public.ack_season_welcome('${SEASON}')`)).rejects.toThrow(
      /permission denied/,
    );
  });

  it('blocks direct writes even with grants and enforces class RLS on reads', async () => {
    await db.exec(
      'reset role; grant select, insert, update, delete on public.class_world_theme to authenticated;',
    );
    await actor(A);
    expect((await db.query('select class_id from public.class_world_theme')).rows).toEqual([
      { class_id: '8a' },
    ]);
    await expect(
      db.query("insert into public.class_world_theme(class_id,theme) values('8b','halloween')"),
    ).rejects.toThrow(/row-level security/);
    expect(
      (await db.query("update public.class_world_theme set theme='halloween' returning class_id")).rows,
    ).toEqual([]);
    expect((await db.query('delete from public.class_world_theme returning class_id')).rows).toEqual([]);
    await actor(B);
    expect((await db.query('select class_id from public.class_world_theme')).rows).toEqual([]);
  });

  it('never changes seasons, learning progress, coins, inventory or placements', async () => {
    await db.exec('reset role;');
    const tables = [
      'profiles',
      'xp_ledger',
      'coin_ledger',
      'inventory',
      'placements',
      'season_claims',
      'season_chests',
    ];
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
    const seasonsBefore = (
      await db.query("select starts_on, ends_on, closed_at from public.seasons where id = $1", [SEASON])
    ).rows;
    const before = await snapshot();
    await actor(T);
    await call('teacher_set_world_theme($1,$2,$3)', ['8b', 'halloween', SEASON]);
    await call('teacher_set_world_theme($1,$2,$3)', ['8b', 'normal', null]);
    await db.exec('reset role;');
    expect(await snapshot()).toEqual(before);
    expect(
      (await db.query("select starts_on, ends_on, closed_at from public.seasons where id = $1", [SEASON]))
        .rows,
    ).toEqual(seasonsBefore);
  });
});
