// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { TeacherContext } from '../../src/teacher/context';
const save = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true, value: true }));
vi.mock('../../src/teacher/api', () => ({
  loadClassPupils: async () => ({ ok: false, message: 'offline' }),
  loadClassBoard: async () => ({ ok: true, value: { stampsWeek: 4, notice: null } }),
  loadQuestStatus: async () => ({ ok: false }),
  setClassNotice: save,
  questNotices: () => [],
}));
import page from '../../src/teacher/pages/overview';
it('isolates unavailable data and validates the notice editor', async () => {
  const host = document.createElement('div');
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => true,
    go: vi.fn(),
    status: vi.fn(),
  } as unknown as TeacherContext);
  expect(host.textContent).toContain('nicht verfügbar');
  expect(host.textContent).toContain('4 von');
  const text = host.querySelector('textarea')!,
    button = host.querySelector<HTMLButtonElement>('[type=submit]')!;
  expect(button.disabled).toBe(true);
  text.value = 'Hello class!';
  text.dispatchEvent(new Event('input'));
  expect(button.disabled).toBe(false);
  text.value = 'x'.repeat(141);
  text.dispatchEvent(new Event('input'));
  expect(button.disabled).toBe(true);
});
