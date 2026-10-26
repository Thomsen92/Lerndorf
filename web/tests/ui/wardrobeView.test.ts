// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from 'vitest';
import { openWardrobe } from '../../src/ui/wardrobeView';
import { emptyLook, DEFAULT_COLORS } from '../../src/avatars/look';
const data = {
  character: 'boy' as const,
  wardrobe: { v: 1 as const, revision: 0, boy: emptyLook(), girl: emptyLook() },
  ownedIds: ['avatar_boy_gold_chain'],
  allowedColors: DEFAULT_COLORS,
};
const stage = { applyLook: vi.fn(async () => {}), rotateBy: vi.fn(), resetView: vi.fn(), dispose: vi.fn() };
afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
const tick = () => new Promise((r) => setTimeout(r, 0));
it('aborts a stage that is still loading when the room is closed', async () => {
  let signal: AbortSignal | undefined, resolve!: (s: typeof stage) => void;
  const pending = new Promise<typeof stage>((r) => {
    resolve = r;
  });
  const h = openWardrobe({
    api: { load: async () => ({ ok: true, value: data }), save: vi.fn() },
    onClose: vi.fn(),
    onShop: vi.fn(),
    onSaved: vi.fn(),
    stageFactory: async (_host, opts) => {
      signal = opts.signal;
      return pending;
    },
  });
  await tick();
  h.close();
  expect(signal?.aborted).toBe(true);
  resolve(stage);
  await tick();
  expect(stage.dispose).toHaveBeenCalled();
});
it('allows retry when a transport throws while saving', async () => {
  const h = openWardrobe({
    api: {
      load: async () => ({ ok: true, value: data }),
      save: async () => {
        throw Error('network');
      },
    },
    onClose: vi.fn(),
    onShop: vi.fn(),
    onSaved: vi.fn(),
    stageFactory: async () => stage,
  });
  await tick();
  (document.querySelector('[data-action="done"]') as HTMLButtonElement).click();
  await tick();
  expect((document.querySelector('[data-action="done"]') as HTMLButtonElement).disabled).toBe(false);
  expect(document.body.textContent).toContain('nicht gespeichert');
  h.close();
});
it('shows only compatible owned items and previews with a single click', async () => {
  const h = openWardrobe({
    api: { load: async () => ({ ok: true, value: data }), save: vi.fn() },
    onClose: vi.fn(),
    onShop: vi.fn(),
    onSaved: vi.fn(),
    stageFactory: async () => stage,
  });
  await tick();
  (document.querySelector('[data-tab="extras"]') as HTMLButtonElement).click();
  expect(document.querySelector('[data-item="avatar_boy_gold_chain"]')).not.toBeNull();
  expect(document.querySelector('[data-item="avatar_boy_halberd"]')).toBeNull();
  (document.querySelector('[data-item="avatar_boy_gold_chain"]') as HTMLButtonElement).click();
  await tick();
  expect(stage.applyLook).toHaveBeenCalledWith({ items: ['avatar_boy_gold_chain'], colors: {} });
  h.close();
  expect(stage.dispose).toHaveBeenCalled();
});
it('keeps the draft on save failure and prevents duplicate saves', async () => {
  const save = vi.fn(async () => ({ ok: false as const, message: 'Offline' }));
  const done = vi.fn();
  const h = openWardrobe({
    api: { load: async () => ({ ok: true, value: data }), save },
    onClose: vi.fn(),
    onShop: vi.fn(),
    onSaved: done,
    stageFactory: async () => stage,
  });
  await tick();
  (document.querySelector('[data-action="done"]') as HTMLButtonElement).click();
  (document.querySelector('[data-action="done"]') as HTMLButtonElement).click();
  await tick();
  expect(save).toHaveBeenCalledTimes(1);
  expect(done).not.toHaveBeenCalled();
  expect(document.body.textContent).toContain('Offline');
  h.close();
});
