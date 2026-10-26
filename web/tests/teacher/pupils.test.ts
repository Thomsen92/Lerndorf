// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { TeacherContext } from '../../src/teacher/context';
vi.mock('../../src/teacher/api', () => ({
  loadClassPupils: async () => ({
    ok: true,
    value: [
      {
        id: 'a',
        nickname: 'anna',
        coins: 10,
        plotIndex: null,
        tutorialStep: 'quiz',
        lastSignInAt: null,
        lastAnswerAt: null,
        questsSolvedWeek: 0,
        questsOfferedWeek: 9,
        holidayWeek: false,
      },
      {
        id: 'b',
        nickname: 'ben',
        coins: 20,
        plotIndex: 2,
        tutorialStep: null,
        lastSignInAt: new Date().toISOString(),
        lastAnswerAt: null,
        questsSolvedWeek: 2,
        questsOfferedWeek: 9,
        holidayWeek: false,
      },
    ],
  }),
  loadPupilDetail: async () => ({
    ok: true,
    value: {
      slots: [],
      unplaced: [],
      week: [],
      ledger: [{ at: '2026-10-26T12:00Z', delta: 10, reason: 'teacher', ref: 'Mitarbeit' }],
    },
  }),
}));
import page from '../../src/teacher/pages/pupils';
it('searches, filters and opens private details without exposing credentials', async () => {
  const host = document.createElement('div');
  const go = vi.fn();
  const ctx = {
    supabase: {},
    classId: '8a',
    route: { classId: '8a', page: 'schueler', pupil: 'a' },
    alive: () => true,
    status: vi.fn(),
    go,
  } as unknown as TeacherContext;
  await page.mount(host, ctx);
  expect(host.textContent).toContain('Spitzname');
  expect(host.textContent).toContain('Kontoauszug');
  expect(host.textContent).toContain('Mitarbeit');
  expect(host.textContent).not.toMatch(/@lerndorf.local|Passwort/);
  const search = host.querySelector<HTMLInputElement>('[type=search]')!;
  search.value = 'BEN';
  search.dispatchEvent(new Event('input'));
  expect(host.querySelector('tbody')?.textContent).not.toContain('anna');
  expect(host.querySelector('tbody')?.textContent).toContain('ben');
});
