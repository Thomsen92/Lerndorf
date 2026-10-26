// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from 'vitest';
import type { TeacherContext } from '../../src/teacher/context';
const mocks = vi.hoisted(() => ({ adjust: vi.fn(), many: vi.fn() }));
vi.mock('../../src/teacher/api', () => ({
  loadClassPupils: async () => ({
    ok: true,
    value: [
      { id: 'a', nickname: 'anna', coins: 10 },
      { id: 'b', nickname: 'ben', coins: 5 },
    ],
  }),
  adjustCoins: mocks.adjust,
  adjustCoinsMany: mocks.many,
  loadStampedIds: async () => ({ ok: true, value: new Set() }),
  bookStamps: vi.fn(),
}));
import page from '../../src/teacher/pages/coins';
afterEach(() => {
  page.unmount?.();
  document.body.innerHTML = '';
  vi.useRealTimers();
});
it('locks a row during a request, books once and keeps success visible when undo fails', async () => {
  let finish!: (v: unknown) => void;
  mocks.adjust.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const host = document.createElement('div');
  document.body.append(host);
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => true,
    status: vi.fn(),
  } as unknown as TeacherContext);
  const add = host.querySelector<HTMLButtonElement>('[data-pupil="a"] [data-delta="20"]')!;
  const minus = host.querySelector<HTMLButtonElement>('[data-pupil="b"] [data-delta="-10"]')!;
  expect(minus.disabled).toBe(true);
  add.click();
  add.click();
  expect(mocks.adjust).toHaveBeenCalledTimes(1);
  finish({ ok: true, value: 30 });
  await new Promise((r) => setTimeout(r, 0));
  expect(host.textContent).toContain('+20 Münzen für anna');
  expect(host.querySelector('[data-pupil="a"] output')?.textContent).toBe('30');
  mocks.adjust.mockResolvedValueOnce({ ok: false, message: 'Zu wenig Münzen' });
  host.querySelector<HTMLButtonElement>('[data-undo]')!.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(host.textContent).toContain('+20 Münzen für anna');
  expect(host.textContent).toContain('Zu wenig Münzen');
});
it('uses one atomic RPC for marked pupils and the chosen reason', async () => {
  mocks.many.mockResolvedValue({ ok: true, value: 2 });
  const host = document.createElement('div');
  document.body.append(host);
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => true,
    status: vi.fn(),
  } as unknown as TeacherContext);
  host.querySelector<HTMLButtonElement>('[data-reason="Mitarbeit"]')!.click();
  host.querySelector<HTMLInputElement>('[data-all]')!.click();
  host.querySelector<HTMLButtonElement>('.multi-bar [data-delta="10"]')!.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(mocks.many).toHaveBeenCalledWith({}, ['a', 'b'], 10, 'Schnellbuchung +10 · Mitarbeit');
  expect(host.textContent).toContain('+10 Münzen für 2 Schüler');
});
it('expires undo after ten seconds', async () => {
  vi.useFakeTimers();
  mocks.adjust.mockResolvedValue({ ok: true, value: 20 });
  const host = document.createElement('div');
  document.body.append(host);
  await page.mount(host, {
    supabase: {},
    classId: '8a',
    alive: () => true,
    status: vi.fn(),
  } as unknown as TeacherContext);
  host.querySelector<HTMLButtonElement>('[data-pupil="a"] [data-delta="10"]')!.click();
  await vi.advanceTimersByTimeAsync(0);
  expect(host.querySelector<HTMLButtonElement>('[data-undo]')!.hidden).toBe(false);
  await vi.advanceTimersByTimeAsync(10000);
  expect(host.querySelector<HTMLButtonElement>('[data-undo]')!.hidden).toBe(true);
});
