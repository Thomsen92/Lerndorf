import { expect, it } from 'vitest';
import { nameTagLayout } from '../../src/render/village';
it('lays out crest and optional title without widening canvas', () => {
  expect(nameTagLayout({ nickname: 'Lea', level: 7, titleLabel: 'Busy Bee' }, false)).toMatchObject({
    lines: ['Lea', 'Busy Bee'],
    crest: { text: 'Lv.7', tier: 'bronze' },
  });
  expect(nameTagLayout({ nickname: 'A very long nickname' }, false).width).toBeLessThanOrEqual(256);
  expect(nameTagLayout({ nickname: 'Lea' }, true).crest).toBeNull();
});
