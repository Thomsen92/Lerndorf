// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { frameStyle, frameSvg, avatarPortrait } from '../../src/ui/frames';
import { crestTier, crestSvg } from '../../src/ui/crest';
it('falls back to wood and draws gold ornament', () => {
  expect(frameStyle('x').id).toBe('frame_wood');
  expect(frameSvg('frame_gold', 80).querySelector('[data-ornament=crown]')).not.toBeNull();
  expect(frameSvg('frame_gold', 80).querySelector('[data-art="rank-frame"]')).not.toBeNull();
  expect(crestSvg(7, 64).querySelector('[data-art="rank-shield"]')).not.toBeNull();
});
it('uses tier boundaries and meaningful ribbon', () => {
  expect([4, 5, 10, 15, 20, 25, 30].map(crestTier)).toEqual([
    'wood',
    'bronze',
    'silver',
    'gold',
    'emerald',
    'sapphire',
    'rainbow',
  ]);
  expect(crestSvg(7, 64).textContent).toContain('Lv.7');
  expect(crestSvg(7, 64).getAttribute('aria-label')).toBe('Level 7, Wappen Bronze');
});
it('keeps picker until rendered portrait resolves', async () => {
  const portrait = avatarPortrait({
    character: 'boy',
    frameId: 'frame_wood',
    size: 'small',
    portraits: async () => 'data:image/png;base64,a',
  });
  expect(portrait.querySelector('img')?.src).toContain('boy.png');
  await Promise.resolve();
  expect(portrait.querySelector('img')?.src).toContain('base64,a');
});
