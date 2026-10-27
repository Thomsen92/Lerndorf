// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { runComicWipe } from '../../src/ui/comicWipe';

function stubAnimation(): void {
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value: () => ({ finished: Promise.resolve() }),
  });
}

it('covers the screen once and cleans up', async () => {
  stubAnimation();
  const covered = vi.fn();
  const done = runComicWipe(covered, false);
  expect(document.querySelector('.comic-wipe')).not.toBeNull();
  await done;
  expect(covered).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.comic-wipe')).toBeNull();
});

it('keeps the reduced-motion version short and still covers once', async () => {
  stubAnimation();
  const covered = vi.fn();
  const done = runComicWipe(covered, true);
  expect(document.querySelector('.comic-wipe')?.classList.contains('comic-wipe--soft')).toBe(true);
  await done;
  expect(covered).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.comic-wipe')).toBeNull();
});
