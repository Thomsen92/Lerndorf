// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createSeasonChests } from '../../src/ui/seasonChests';
import type { ChestResult, SeasonApi } from '../../src/api/season';
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
it('ignores a chest response after disposal and does not reveal or change coins', async () => {
  let finish!: (result: ChestResult) => void;
  const api = {
    chests: async () => [{ id: 1, source: 'shop' }],
    openChest: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  } as unknown as SeasonApi;
  const onCoins = vi.fn();
  const onChanged = vi.fn();
  const section = createSeasonChests({ api, getCoins: () => 10, onCoins, onChanged, reducedMotion: true });
  document.body.append(section);
  await flush();
  section.querySelector<HTMLButtonElement>('.season-chest-open')!.click();
  section.dispose();
  finish({ rarity: 'common', item_id: 'deco_test', duplicate: true, coins: 15 });
  await flush();
  expect(onCoins).not.toHaveBeenCalled();
  expect(onChanged).not.toHaveBeenCalled();
  expect(section.querySelector('.season-reveal')).toBeNull();
  section.remove();
});
