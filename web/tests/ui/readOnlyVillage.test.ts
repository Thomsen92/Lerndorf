// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('../../src/ui/readOnlyScene', () => ({
  createReadOnlyScene: () => ({ dispose: vi.fn(), setPaused: vi.fn() }),
}));
import { mountVillage } from '../../src/ui/villageView';
it('uses exclusively teacher read RPCs and exposes no pupil writes or profile controls', async () => {
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === 'teacher_village_members'
        ? [{ id: 'a', nickname: 'anna', plot_index: 0, avatar: { character: 'girl' } }]
        : [],
    error: null,
  }));
  const writes = { insert: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const from = vi.fn((table: string) => {
    const b = {
      ...writes,
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: { id: '8a', layout_seed: 1, map_id: 'tal' }, error: null }),
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(resolve({ data: table === 'placements' ? [] : null, error: null })),
    };
    return b;
  });
  const root = document.createElement('div'),
    onExit = vi.fn();
  document.body.append(root);
  const handle = await mountVillage(root, { rpc, from } as unknown as SupabaseClient, vi.fn(), {
    readOnly: { pupilId: 'a', nickname: 'anna', classId: '8a', plotIndex: 0, onExit },
  });
  expect(root.textContent).toContain('Ansicht von anna – nur ansehen');
  expect(root.querySelector('.avatar-badge')).toBeNull();
  expect(root.querySelector('[data-area=haus]')).toBeNull();
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Aufgaben')!.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(document.querySelectorAll('input,select,textarea')).toHaveLength(0);
  expect(
    rpc.mock.calls.every(([name]) => ['teacher_village_members', 'teacher_pupil_quests'].includes(name)),
  ).toBe(true);
  for (const spy of Object.values(writes)) expect(spy).not.toHaveBeenCalled();
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Zurück zum Lehrerbereich')!.click();
  expect(onExit).toHaveBeenCalled();
  handle.dispose();
  root.remove();
});
