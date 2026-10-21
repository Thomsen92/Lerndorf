import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { importQuestDir, type QuestRpc } from '../../scripts/import-quests.ts';

const FIXTURE = new URL('../fixtures/quests/2026-11-09.json', import.meta.url);

interface Call {
  fn: string;
  args: Record<string, unknown>;
}

function fakeRpc(failOn?: string): { client: QuestRpc; calls: Call[] } {
  const calls: Call[] = [];
  const client: QuestRpc = {
    async rpc(fn, args) {
      calls.push({ fn, args });
      return { error: fn === failOn ? { message: 'boom' } : null };
    },
  };
  return { client, calls };
}

let dir: string;
let url: URL;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'quests-'));
  url = pathToFileURL(dir + '/');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('importQuestDir', () => {
  it('imports a valid week with one RPC call', async () => {
    copyFileSync(FIXTURE, join(dir, '2026-11-09.json'));
    writeFileSync(join(dir, 'FORMAT.md'), '# ignored');
    const { client, calls } = fakeRpc();
    const report = await importQuestDir(url, client);
    expect(report).toEqual({ imported: ['2026-11-09.json'], failed: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('import_quest_week');
    expect(calls[0].args.p_week).toBe('2026-11-09');
    expect(calls[0].args.p_holiday).toBe(false);
    expect(calls[0].args.p_quests).toHaveLength(21);
  });

  it('records a validation failure for a Monday file', async () => {
    const bad = JSON.parse(await import('node:fs').then((f) => f.readFileSync(FIXTURE, 'utf8')));
    bad.week = '2026-11-16';
    bad.days = bad.days.slice(0, 2);
    writeFileSync(join(dir, '2026-11-16.json'), JSON.stringify(bad));
    const { client, calls } = fakeRpc();
    const report = await importQuestDir(url, client);
    expect(calls).toHaveLength(1);
    expect(calls[0].fn).toBe('record_quest_import');
    expect(calls[0].args.p_week).toBe('2026-11-16');
    expect(calls[0].args.p_ok).toBe(false);
    expect((calls[0].args.p_errors as string[]).join('\n')).toContain('days: genau 7 Tage');
    expect(report.imported).toEqual([]);
    expect(report.failed[0].file).toBe('2026-11-16.json');
  });

  it('reports broken JSON and does not stop other files', async () => {
    writeFileSync(join(dir, '2026-11-02.json'), '{ nope');
    copyFileSync(FIXTURE, join(dir, '2026-11-09.json'));
    const { client, calls } = fakeRpc();
    const report = await importQuestDir(url, client);
    expect(report.imported).toEqual(['2026-11-09.json']);
    expect(report.failed).toHaveLength(1);
    expect(report.failed[0].errors.join('\n')).toContain('kein gültiges JSON');
    expect(calls.map((c) => c.fn)).toEqual(['record_quest_import', 'import_quest_week']);
  });

  it('does not record when the file name is no Monday', async () => {
    writeFileSync(join(dir, 'notes.json'), '{}');
    writeFileSync(join(dir, '2026-11-10.json'), '{}');
    const { client, calls } = fakeRpc();
    const report = await importQuestDir(url, client);
    expect(calls).toHaveLength(0);
    expect(report.failed.map((f) => f.file)).toEqual(['2026-11-10.json', 'notes.json']);
  });

  it('puts an RPC error into failed instead of throwing', async () => {
    copyFileSync(FIXTURE, join(dir, '2026-11-09.json'));
    const { client, calls } = fakeRpc('import_quest_week');
    const report = await importQuestDir(url, client);
    expect(report.imported).toEqual([]);
    expect(report.failed[0].errors).toEqual(['Die Datenbank hat die Woche abgelehnt: boom']);
    // the teacher area must see the failure too
    const rec = calls.find((c) => c.fn === 'record_quest_import');
    expect(rec?.args).toEqual({
      p_week: '2026-11-09',
      p_ok: false,
      p_errors: ['Die Datenbank hat die Woche abgelehnt: boom'],
    });
  });

  it('reports it when the failure cannot be recorded for the teacher', async () => {
    copyFileSync(FIXTURE, join(dir, '2026-11-09.json'));
    const { client } = fakeRpc('import_quest_week');
    const base = client.rpc.bind(client);
    client.rpc = async (fn, args) =>
      fn === 'record_quest_import' ? { error: { message: 'nope' } } : base(fn, args);
    const report = await importQuestDir(url, client);
    expect(report.failed[0].errors).toEqual([
      'Die Datenbank hat die Woche abgelehnt: boom',
      'Fehler konnte nicht im Lehrer-Bereich gespeichert werden: nope',
    ]);
  });

  it('a thrown rpc error fails one file but not the run', async () => {
    copyFileSync(FIXTURE, join(dir, '2026-11-09.json'));
    writeFileSync(join(dir, '2026-11-16.json'), '{ kaputt');
    const { client } = fakeRpc();
    client.rpc = async () => {
      throw new Error('network down');
    };
    const report = await importQuestDir(url, client);
    expect(report.imported).toEqual([]);
    expect(report.failed.map((f) => f.file)).toEqual(['2026-11-09.json', '2026-11-16.json']);
    expect(report.failed[0].errors[0]).toContain('network down');
  });

  it('returns an empty report for a missing directory', async () => {
    const { client, calls } = fakeRpc();
    const report = await importQuestDir(pathToFileURL(join(dir, 'missing') + '/'), client);
    expect(report).toEqual({ imported: [], failed: [] });
    expect(calls).toHaveLength(0);
  });
});
