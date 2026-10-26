// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { TeacherContext } from '../../src/teacher/context';
vi.mock('../../src/teacher/api', () => ({
  loadClassBoard: vi.fn(async () => ({
    ok: true,
    value: {
      week: '2026-10-26',
      solvedWeek: 312,
      goalWeek: 504,
      solvedToday: 24,
      classStreak: 6,
      stampsWeek: 18,
      notice: 'Welcome!',
    },
  })),
}));
import page from '../../src/teacher/pages/board';
it('shows only class progress and disposes its refresh timer', async () => {
  vi.useFakeTimers();
  const host = document.createElement('div'),
    go = vi.fn();
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => true,
    status: vi.fn(),
    go,
  } as unknown as TeacherContext);
  expect(host.textContent).toContain('312 von 504');
  expect(host.textContent).not.toMatch(/Münzen|anna|XP/);
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('312');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(go).toHaveBeenCalledWith('uebersicht');
  page.unmount?.();
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});
