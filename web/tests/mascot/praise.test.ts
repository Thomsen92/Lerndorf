import { expect, it } from 'vitest';
import { createPraiseSequence } from '../../src/mascot/praise';
it('varies praise without repeating a phrase and spaces the two existing recordings', () => {
  let now = 0;
  const next = createPraiseSequence(() => now);
  const fast = Array.from({ length: 8 }, () => next());
  expect(new Set(fast.map((p) => p.text)).size).toBe(8);
  expect(fast.filter((p) => p.voice)).toHaveLength(1);
  now = 21000;
  expect(next().voice).toBeUndefined(); // no back-to-back Splendid recordings
  next();
  next();
  expect(next().voice).toBe('surprise');
  now += 21000;
  for (let i = 0; i < 4; i++) next();
  expect(next().voice).toBe('celebrate');
});
