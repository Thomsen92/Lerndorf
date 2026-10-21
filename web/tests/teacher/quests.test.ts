// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  dayLabel,
  loadQuestPreview,
  loadQuestStatus,
  questNotices,
  solutionText,
  type QuestStatus,
} from '../../src/teacher/api';
import { renderQuestPanel } from '../../src/teacher/questsView';

const status = (over: Partial<QuestStatus> = {}): QuestStatus => ({
  today: '2026-11-11',
  coveredUntil: '2026-11-15',
  todayMissing: false,
  tomorrowMissing: false,
  imports: [],
  ...over,
});

const fake = (data: unknown, error: { message: string } | null = null) => {
  const calls: Array<{ fn: string; args?: unknown }> = [];
  const client = {
    rpc: async (fn: string, args?: unknown) => {
      calls.push({ fn, args });
      return { data, error };
    },
  } as unknown as SupabaseClient;
  return { client, calls };
};

describe('dayLabel', () => {
  it('formats weekday and date', () => {
    expect(dayLabel('2026-11-09')).toBe('Mo 09.11.');
    expect(dayLabel('2026-11-15')).toBe('So 15.11.');
    expect(dayLabel('2026-11-12')).toBe('Do 12.11.');
  });
  it('returns unparsable input unchanged', () => {
    expect(dayLabel('nonsense')).toBe('nonsense');
  });
});

describe('questNotices', () => {
  it('shows only the ok line when everything is covered', () => {
    expect(questNotices(status())).toEqual([{ level: 'ok', text: 'Daily Quests vorhanden bis So 15.11.' }]);
  });
  it('warns when today is missing and names the week of today', () => {
    const n = questNotices(status({ coveredUntil: null, todayMissing: true, tomorrowMissing: true }));
    expect(n).toEqual([
      {
        level: 'warn',
        text: 'Heute gibt es keine Daily Quests. Bitte das Quest-Paket für die Woche ab 09.11. hochladen.',
      },
      { level: 'warn', text: 'Morgen gibt es noch keine Daily Quests.' },
    ]);
  });
  it('has no ok line when coveredUntil is null (nothing is covered, so nothing to praise)', () => {
    expect(questNotices(status({ coveredUntil: null })).some((x) => x.level === 'ok')).toBe(false);
  });
  it('warns about tomorrow only', () => {
    const n = questNotices(status({ coveredUntil: '2026-11-11', tomorrowMissing: true }));
    expect(n.map((x) => x.level)).toEqual(['warn', 'ok']);
    expect(n[1].text).toBe('Daily Quests vorhanden bis Mi 11.11.');
    expect(n[0].text).toBe('Morgen gibt es noch keine Daily Quests.');
  });
  it('lists one error per failed import with its errors, then holiday lines', () => {
    const n = questNotices(
      status({
        imports: [
          { week: '2026-11-16', ok: false, holiday: false, errors: ['Zeile 3: kaputt', 'Zeile 4: leer'], questCount: 0, importedAt: 'x' },
          { week: '2026-11-23', ok: true, holiday: true, errors: [], questCount: 0, importedAt: 'x' },
          { week: '2026-11-30', ok: true, holiday: false, errors: [], questCount: 15, importedAt: 'x' },
        ],
      }),
    );
    expect(n.map((x) => x.level)).toEqual(['ok', 'error', 'ok']);
    expect(n[1].text).toBe(
      'Das Quest-Paket für die Woche ab 16.11. hat Fehler und wurde nicht übernommen: Zeile 3: kaputt; Zeile 4: leer',
    );
    expect(n[2].text).toBe('Woche ab 23.11.: Ferien, keine Quests.');
  });
});

describe('solutionText', () => {
  it('handles text, lists, pairs and unknown', () => {
    expect(solutionText('went')).toBe('went');
    expect(solutionText(['a', 'b'], 'order')).toBe('a · b');
    expect(solutionText(['is', 's'], 'gap')).toBe('is / s');
    expect(solutionText([['dog', 'Hund'], ['cat', 'Katze']], 'match')).toBe('dog → Hund · cat → Katze');
    expect(solutionText(null)).toBe('–');
  });
  it('shows listening solutions by their mode', () => {
    expect(solutionText('B', 'listening', { mode: 'choice' })).toBe('B');
    expect(solutionText(['two', '2'], 'listening', { mode: 'gap' })).toBe('two / 2');
  });
});

describe('api calls', () => {
  it('maps quest_status', async () => {
    const { client, calls } = fake({
      today: '2026-11-11',
      covered_until: null,
      today_missing: true,
      tomorrow_missing: true,
      imports: [{ week: '2026-11-09', ok: false, holiday: false, errors: ['e'], quest_count: 0, imported_at: 't' }],
    });
    const res = await loadQuestStatus(client);
    expect(calls[0].fn).toBe('quest_status');
    expect(res).toEqual({
      ok: true,
      value: {
        today: '2026-11-11',
        coveredUntil: null,
        todayMissing: true,
        tomorrowMissing: true,
        imports: [{ week: '2026-11-09', ok: false, holiday: false, errors: ['e'], questCount: 0, importedAt: 't' }],
      },
    });
  });
  it('passes preview args and fails in German', async () => {
    const { client, calls } = fake([
      { key: 'k', day: '2026-11-11', slot: 1, type: 'gap', prompt: 'p', data: {}, hint: '', reward: 5, solution: ['x'] },
    ]);
    const res = await loadQuestPreview(client, '2026-11-11', 7);
    expect(calls[0]).toEqual({ fn: 'teacher_quest_preview', args: { p_from: '2026-11-11', p_days: 7 } });
    expect(res.ok && res.value[0].reward).toBe(5);
    const bad = await loadQuestPreview(fake(null, { message: 'x' }).client, '2026-11-11', 7);
    expect(bad.ok).toBe(false);
  });
});

describe('renderQuestPanel', () => {
  it('renders notices and a preview table with solutions, escaped', async () => {
    const rpc = vi.fn(async (fn: string) =>
      fn === 'quest_status'
        ? {
            data: { today: '2026-11-11', covered_until: '2026-11-12', today_missing: false, tomorrow_missing: false, imports: [] },
            error: null,
          }
        : {
            data: [
              { key: 'a', day: '2026-11-11', slot: 1, type: 'match', prompt: '<b>Match</b>', data: {}, hint: 'tip', reward: 5, solution: [['dog', 'Hund']] },
              { key: 'b', day: '2026-11-12', slot: 1, type: 'gap', prompt: 'Gap', data: {}, hint: '', reward: 3, solution: ['went'] },
            ],
            error: null,
          },
    );
    const html = await renderQuestPanel({ rpc } as unknown as SupabaseClient);
    const el = document.createElement('div');
    el.innerHTML = html;
    expect(el.querySelector('h2')?.textContent).toBe('Daily Quests');
    expect(el.textContent).toContain('Daily Quests vorhanden bis Do 12.11.');
    expect(el.textContent).toContain('Mi 11.11.');
    expect(el.querySelectorAll('table').length).toBe(2);
    expect(el.textContent).toContain('dog → Hund');
    expect(el.textContent).toContain('went');
    expect(el.querySelector('b')).toBeNull();
    expect(rpc).toHaveBeenCalledWith('teacher_quest_preview', { p_from: '2026-11-11', p_days: 7 });
  });
  it('shows the read-aloud text of listening quests in the preview, escaped', async () => {
    const rpc = vi.fn(async (fn: string) =>
      fn === 'quest_status'
        ? {
            data: { today: '2026-11-11', covered_until: '2026-11-11', today_missing: false, tomorrow_missing: true, imports: [] },
            error: null,
          }
        : {
            data: [
              { key: 'l', day: '2026-11-11', slot: 1, type: 'listening', prompt: 'Listen', data: { mode: 'choice', speak: 'I <i>like</i> dogs.' }, hint: '', reward: 5, solution: 'A' },
            ],
            error: null,
          },
    );
    const el = document.createElement('div');
    el.innerHTML = await renderQuestPanel({ rpc } as unknown as SupabaseClient);
    expect(el.textContent).toContain('Vorlesetext: I <i>like</i> dogs.');
    expect(el.querySelector('i')).toBeNull();
    expect(el.querySelector('span[lang="en"]')?.textContent).toContain('dogs');
  });
  it('shows an error when the status cannot be loaded', async () => {
    const html = await renderQuestPanel(fake(null, { message: 'x' }).client);
    expect(html).toContain('class="error"');
  });
});
