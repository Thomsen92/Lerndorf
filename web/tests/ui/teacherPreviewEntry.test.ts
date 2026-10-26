// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from 'vitest';
const state = vi.hoisted(() => ({
  teacher: false,
  mount: vi.fn().mockResolvedValue({ dispose: vi.fn() }),
  from: vi.fn(),
}));
vi.mock('../../src/api/client', () => ({
  createSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: {} } }), onAuthStateChange: vi.fn() },
    from: state.from,
  }),
}));
vi.mock('../../src/ui/villageView', () => ({ mountVillage: state.mount }));
vi.mock('../../src/teacher/api', () => ({ isTeacherSession: async () => state.teacher }));
afterEach(() => {
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  state.mount.mockClear();
  state.from.mockClear();
});
async function boot(teacher: boolean) {
  vi.resetModules();
  state.teacher = teacher;
  state.from.mockImplementation(() => {
    const b = {
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({
        data: { id: 'a', nickname: 'anna', class_id: '8a', plot_index: 0 },
        error: null,
      }),
    };
    return b;
  });
  history.replaceState(null, '', '/?ansehen=a');
  document.body.innerHTML = '<div id="app"></div>';
  await import('../../src/main');
  for (let i = 0; i < 20 && !state.mount.mock.calls.length; i++) await new Promise((r) => setTimeout(r, 0));
}
it('ignores the view-as query for pupil sessions', async () => {
  await boot(false);
  expect(state.mount.mock.calls[0]).toHaveLength(3);
  expect(state.from).not.toHaveBeenCalled();
});
it('mounts a read-only village only for teacher sessions', async () => {
  await boot(true);
  expect(state.mount.mock.calls[0][3]).toMatchObject({
    readOnly: { pupilId: 'a', nickname: 'anna', classId: '8a' },
  });
});
