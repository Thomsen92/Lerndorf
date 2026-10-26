// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { TeacherContext } from '../../src/teacher/context';
const pending = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock('../../src/teacher/api', () => ({
  loadPupils: async () => ({ ok: true, value: [{ id: 'a', nickname: 'anna', coins: 0, plotIndex: 0 }] }),
  adminCall: pending.admin,
}));
import page from '../../src/teacher/pages/accounts';
import { sessionCards, clearCards } from '../../src/teacher/cards';
it('does not retain passwords from a request that finishes after leaving the session', async () => {
  clearCards();
  let alive = true,
    finish!: (value: unknown) => void;
  pending.admin.mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const host = document.createElement('div');
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => alive,
    status: vi.fn(),
    refresh: vi.fn(),
  } as unknown as TeacherContext);
  host.querySelector<HTMLInputElement>('[name=nickname]')!.value = 'testfox';
  host.querySelector<HTMLInputElement>('[name=password]')!.value = 'secret';
  host.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  alive = false;
  finish({ ok: true, value: {} });
  await new Promise((r) => setTimeout(r, 0));
  expect(sessionCards).toHaveLength(0);
  page.unmount?.();
  clearCards();
});
