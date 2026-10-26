import { it, expect, vi } from 'vitest';
const load = vi.hoisted(() =>
  vi.fn(async () => {
    throw Error('offline');
  }),
);
vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    loadAsync = load;
  },
}));
import { loadCharacter } from '../../src/render/character';
it('retries the character model after a failed request', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(await loadCharacter('boy')).toBeNull();
  expect(await loadCharacter('boy')).toBeNull();
  expect(load).toHaveBeenCalledTimes(2);
  warn.mockRestore();
});
