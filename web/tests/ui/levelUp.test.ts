// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { openChestDialog, openLevelUp } from '../../src/ui/levelUp';
import type { ProgressApi } from '../../src/api/progress';
afterEach(() => document.body.replaceChildren());
it('waits for server and blocks user closing while pending', async () => {
  let resolve!: (v: unknown) => void;
  const api = {
    openChest: () =>
      new Promise((r) => {
        resolve = r;
      }),
  } as unknown as ProgressApi;
  const coins = vi.fn();
  const h = openChestDialog({
    chest: { id: 1, size: 'normal', source: 'level', ref: '2' },
    api,
    reducedMotion: true,
    onCoins: coins,
    onDone: vi.fn(),
  });
  expect(h.body.querySelector('.chest-hit canvas')).not.toBeNull();
  h.body.querySelector<HTMLButtonElement>('.chest-hit')!.click();
  expect(h.body.querySelector('[data-state=pending]')).not.toBeNull();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(h.isOpen).toBe(true);
  expect(coins).not.toHaveBeenCalled();
  resolve({ ok: true, value: { coinsWon: 100, roll: 'double', coins: 330 } });
  await new Promise((r) => setTimeout(r, 0));
  expect(h.body.textContent).toContain('+100 Münzen – Super!');
  expect(coins).toHaveBeenCalledWith(330);
  h.close();
});
it('opens the object directly in the celebration without a nested dialog', () => {
  const openChest = vi
    .fn()
    .mockResolvedValue({ ok: true, value: { coinsWon: 30, roll: 'normal', coins: 30 } });
  const api = { openChest } as unknown as ProgressApi;
  const h = openLevelUp({
    levelFrom: 4,
    levelTo: 7,
    rewards: [],
    chests: [{ id: 1, size: 'normal', source: 'level', ref: '7' }],
    api,
    reducedMotion: true,
    onCoins: vi.fn(),
    onEquip: vi.fn(),
    onDone: vi.fn(),
  });
  expect(h.body.querySelector('.chest-hit')).not.toBeNull();
  h.body.querySelector<HTMLButtonElement>('.chest-hit')!.click();
  expect(openChest).toHaveBeenCalledWith(1);
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(1);
  h.close();
  expect(document.querySelectorAll('[role=dialog]')).toHaveLength(0);
});
