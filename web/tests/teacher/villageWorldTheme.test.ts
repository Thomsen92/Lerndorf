// @vitest-environment happy-dom
import { beforeEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeacherContext } from '../../src/teacher/context';
vi.mock('../../src/teacher/api', () => ({
  loadClassFlags: async () => ({ ok: true, value: { shopOpen: true, buildOpen: true } }),
  loadInstance: async () => ({ ok: false }),
  setClassFlags: vi.fn(),
  saveLayout: vi.fn(),
  saveRules: vi.fn(),
  setItemSold: vi.fn(),
}));
import page from '../../src/teacher/pages/village';
import type { WorldThemeState } from '../../src/api/worldTheme';

const normal: WorldThemeState = {
  classId: '8b',
  requestedTheme: 'normal',
  effectiveTheme: 'normal',
  revision: 0,
  seasonId: '2026-11-halloween',
  seasonLabel: 'Season I – Halloween',
  seasonState: 'running',
  welcomeSeen: false,
};
const halloween: WorldThemeState = {
  ...normal,
  requestedTheme: 'halloween',
  effectiveTheme: 'halloween',
  revision: 1,
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
beforeEach(() => {
  document.body.innerHTML = '';
});
function setup() {
  const host = document.createElement('div');
  document.body.append(host);
  const rpc = vi.fn().mockResolvedValue({ data: normal, error: null });
  const ctx: TeacherContext = {
    supabase: { rpc } as unknown as SupabaseClient,
    classId: '8b',
    route: { classId: '8b', page: 'dorf' },
    alive: () => true,
    status: vi.fn(),
    refresh: vi.fn(),
    go: vi.fn(),
  };
  return { host, rpc, ctx };
}
function submit(host: HTMLElement) {
  host
    .querySelector<HTMLFormElement>('#worldThemeForm')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
}

it('shows the chosen class and its requested and effective world', async () => {
  const { host, rpc, ctx } = setup();
  rpc.mockResolvedValueOnce({ data: halloween, error: null });
  await page.mount(host, ctx);
  expect(host.textContent).toContain('Weltstimmung');
  expect(host.textContent).toContain('Klasse 8b');
  expect(host.textContent).toContain('Halloween ist aktiv.');
  expect(host.querySelector<HTMLSelectElement>('[name=worldTheme]')?.value).toBe('halloween');
  expect(rpc.mock.calls).toEqual([['teacher_world_theme_state', { p_class: '8b' }]]);
});

it('pre-books Halloween while the season is still planned', async () => {
  const { host, rpc, ctx } = setup();
  rpc.mockResolvedValueOnce({
    data: { ...halloween, effectiveTheme: 'normal', seasonState: 'upcoming' },
    error: null,
  });
  await page.mount(host, ctx);
  expect(host.textContent).toContain('vorgemerkt');
  expect(host.querySelector<HTMLSelectElement>('[name=worldTheme]')?.value).toBe('halloween');
});

it('locks the world form until the save finishes and reports success', async () => {
  const { host, rpc, ctx } = setup();
  await page.mount(host, ctx);
  let finish!: (value: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value = 'halloween';
  submit(host);
  submit(host);
  expect(rpc).toHaveBeenCalledTimes(2);
  expect(rpc).toHaveBeenLastCalledWith('teacher_set_world_theme', {
    p_class: '8b',
    p_theme: 'halloween',
    p_season: '2026-11-halloween',
  });
  expect(host.querySelector<HTMLButtonElement>('#worldThemeForm button')!.disabled).toBe(true);
  expect(host.querySelector('#worldThemeStatus')?.textContent).toContain('gespeichert');
  finish({ data: halloween, error: null });
  await tick();
  expect(host.querySelector<HTMLButtonElement>('#worldThemeForm button')!.disabled).toBe(false);
  expect(host.querySelector('#worldThemeStatus')?.textContent).toContain(
    'Halloween ist für Klasse 8b aktiv.',
  );
});

it('refuses Halloween without a season and keeps the saved choice', async () => {
  const { host, rpc, ctx } = setup();
  rpc.mockResolvedValueOnce({ data: { ...normal, seasonId: null, seasonLabel: null }, error: null });
  await page.mount(host, ctx);
  host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value = 'halloween';
  submit(host);
  await tick();
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(host.querySelector('#worldThemeStatus')?.textContent).toContain('Keine Saison');
  expect(host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value).toBe('normal');
});

it('shows a safe failure, restores the saved choice and permits another save', async () => {
  const { host, rpc, ctx } = setup();
  await page.mount(host, ctx);
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'private backend details' } });
  host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value = 'halloween';
  submit(host);
  await tick();
  expect(host.querySelector('#worldThemeStatus')?.textContent).toContain('nicht gespeichert');
  expect(host.textContent).not.toContain('private backend details');
  expect(host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value).toBe('normal');
  expect(host.querySelector<HTMLButtonElement>('#worldThemeForm button')!.disabled).toBe(false);
});

it('keeps the other village settings visible when theme loading fails and offers retry', async () => {
  const { host, rpc, ctx } = setup();
  rpc.mockRejectedValueOnce(new Error('offline'));
  await page.mount(host, ctx);
  expect(host.textContent).toContain('Weltstimmung konnte nicht geladen werden');
  expect(host.querySelector('#switchForm')).not.toBeNull();
  expect(host.querySelector('#worldThemeForm')).toBeNull();
  host.querySelector<HTMLButtonElement>('[data-world-theme-retry]')!.click();
  expect(ctx.refresh).toHaveBeenCalledOnce();
});

it('does not apply a late save or report its status after leaving the class page', async () => {
  const { host, rpc, ctx } = setup();
  let alive = true;
  ctx.alive = () => alive;
  await page.mount(host, ctx);
  let finish!: (value: unknown) => void;
  rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value = 'halloween';
  submit(host);
  const before = host.innerHTML;
  alive = false;
  finish({ data: halloween, error: null });
  await tick();
  expect(host.innerHTML).toBe(before);
  expect(ctx.status).not.toHaveBeenCalled();
});

it('does not draw a late load after navigation', async () => {
  const { host, ctx } = setup();
  ctx.alive = () => false;
  host.textContent = 'New class';
  await page.mount(host, ctx);
  expect(host.textContent).toBe('New class');
});

it('names the season once and refreshes the requested world after a save', async () => {
  const { host, rpc, ctx } = setup();
  await page.mount(host, ctx);
  expect(host.textContent).toContain('Saison: Season I – Halloween.');
  expect(host.textContent).not.toContain('Season Season');
  const summary = () => host.querySelector('#worldThemeSummary')?.textContent ?? '';
  expect(summary()).toContain('Angefordert: Normal · Revision 0. Normal ist aktiv.');
  rpc.mockResolvedValueOnce({ data: halloween, error: null });
  host.querySelector<HTMLSelectElement>('[name=worldTheme]')!.value = 'halloween';
  submit(host);
  await tick();
  expect(summary()).toContain('Angefordert: Halloween · Revision 1. Halloween ist aktiv.');
  expect(summary()).not.toContain('Normal');
});
