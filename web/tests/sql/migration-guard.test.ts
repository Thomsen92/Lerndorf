// Migration guard (plan beta-betrieb B2): live migrations stay frozen, new ones take nothing away.
import { describe, expect, it } from 'vitest';
import { checkMigrations, hashSql, readLock, readMigrations, type Migration } from '../../scripts/check-migrations';

const m = (file: string, sql: string): Migration => ({ file, sql });
const base = [m('0001_schema.sql', 'create table a (id int);'), m('0002_more.sql', 'alter table a add column b int;')];
const locked = Object.fromEntries(base.map((x) => [x.file, hashSql(x.sql)]));

describe('migration guard', () => {
  it('passes for the migrations in the repository', () => {
    const result = checkMigrations(readMigrations(), readLock());
    expect(result.problems).toEqual([]);
  });

  it('freezes migrations that are live, ignoring line endings', () => {
    const windows = base.map((x) => ({ ...x, sql: x.sql.replace(/;/g, ';\r\n') }));
    const lock = Object.fromEntries(base.map((x) => [x.file, hashSql(x.sql.replace(/;/g, ';\n'))]));
    expect(checkMigrations(windows, lock).problems).toEqual([]);
    const edited = [base[0], m('0002_more.sql', 'alter table a add column c int;')];
    expect(checkMigrations(edited, locked).problems).toEqual(['0002_more.sql: ist schon live und wurde geändert']);
  });

  it('refuses a new migration that deletes rows without where', () => {
    const result = checkMigrations([...base, m('0003_oops.sql', 'delete from placements;')], locked);
    expect(result.problems).toEqual(['0003_oops.sql: löscht Zeilen ohne where (delete)']);
  });

  it('refuses dropped tables and columns, truncate, renames and type changes', () => {
    const sql = [
      'drop table old;',
      'alter table a drop column b;',
      'truncate a;',
      'alter table a rename to b;',
      'alter table a alter column id type bigint;',
    ].join('\n');
    expect(checkMigrations([...base, m('0003_bad.sql', sql)], locked).problems).toHaveLength(5);
  });

  it('allows deletes with where and code inside function bodies', () => {
    const sql = `delete from inventory where qty <= 0;
create or replace function f() returns void language sql as $$ delete from placements; $$;`;
    expect(checkMigrations([...base, m('0003_ok.sql', sql)], locked).problems).toEqual([]);
  });

  it('still checks DO blocks, which run during the migration', () => {
    const sql = 'do $$ begin truncate a; end $$;';
    expect(checkMigrations([...base, m('0003_do.sql', sql)], locked).problems).toHaveLength(1);
  });

  it('allows a dropped function that the same file creates again', () => {
    const sql = 'drop function if exists public.f(int);\ncreate function public.f(p int) returns int language sql as $$ select p $$;';
    expect(checkMigrations([...base, m('0003_fn.sql', sql)], locked).problems).toEqual([]);
    expect(checkMigrations([...base, m('0003_fn.sql', 'drop function f(int);')], locked).problems).toEqual([
      '0003_fn.sql: löscht die Funktion f, ohne sie neu anzulegen',
    ]);
  });

  it('lets a reasoned destructive-ok line through and reports it', () => {
    const sql = '-- destructive-ok: test rows from the beta\ndelete from quest_imports;';
    const result = checkMigrations([...base, m('0003_cleanup.sql', sql)], locked);
    expect(result.problems).toEqual([]);
    expect(result.fresh).toEqual([{ file: '0003_cleanup.sql', allowed: ['test rows from the beta'] }]);
  });

  it('wants numbers without gaps', () => {
    const result = checkMigrations([...base, m('0004_skip.sql', 'select 1;')], locked);
    expect(result.problems).toEqual(['0004_skip.sql: erwartet wird Nummer 0003']);
  });
});
