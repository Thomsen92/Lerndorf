// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import type { ProgressApi } from '../../src/api/progress';
import { createChestControl } from '../../src/ui/chestControl';

afterEach(() => document.body.replaceChildren());
const chest = { id: 1, size: 'normal' as const, source: 'level' as const, ref: '6' };
it('makes the object itself clickable, highlights on hover and opens only after server confirmation', async () => {
  let resolve!: (value: unknown) => void;
  const openChest = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const preview = { setState: vi.fn(), setHovered: vi.fn(), dispose: vi.fn() },
    onCoins = vi.fn();
  const card = createChestControl({
    chest,
    api: { openChest } as unknown as ProgressApi,
    onCoins,
    reducedMotion: false,
    previewFactory: () => preview,
  });
  document.body.append(card.el);
  const object = card.el.querySelector<HTMLButtonElement>('.chest-hit')!;
  expect(object.querySelector('canvas')).toBeTruthy();
  expect(card.el.querySelectorAll('button')).toHaveLength(1);
  expect(object.textContent).not.toContain('öffnen');
  object.dispatchEvent(new Event('pointerenter'));
  expect(card.el.classList.contains('loot-chest--hover')).toBe(true);
  expect(preview.setHovered).toHaveBeenLastCalledWith(true);
  object.click();
  object.click();
  expect(openChest).toHaveBeenCalledTimes(1);
  expect(card.pending).toBe(true);
  expect(preview.setState).toHaveBeenLastCalledWith('pending');
  expect(onCoins).not.toHaveBeenCalled();
  resolve({ ok: true, value: { coinsWon: 100, roll: 'double', coins: 330 } });
  await new Promise((r) => setTimeout(r, 0));
  expect(preview.setState).toHaveBeenLastCalledWith('open');
  expect(card.el.textContent).toContain('+100 Münzen – Super!');
  expect(onCoins).toHaveBeenCalledWith(330);
  object.click();
  expect(openChest).toHaveBeenCalledTimes(1);
  card.dispose();
  expect(preview.dispose).toHaveBeenCalledTimes(1);
});

it('offers retry by clicking the chest and preserves a usable fallback', async () => {
  const openChest = vi
    .fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValue({ ok: true, value: { coinsWon: 25, roll: 'normal', coins: 25 } });
  const card = createChestControl({
    chest,
    api: { openChest } as unknown as ProgressApi,
    onCoins: vi.fn(),
    reducedMotion: true,
    previewFactory: () => null,
  });
  document.body.append(card.el);
  const object = card.el.querySelector<HTMLButtonElement>('.chest-hit')!;
  object.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(card.el.textContent).toContain('Tippe die Truhe noch einmal an');
  expect(card.pending).toBe(false);
  object.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(card.el.textContent).toContain('+25 Münzen');
  expect(card.el.querySelector('.loot-fallback')).toBeTruthy();
  card.dispose();
});
