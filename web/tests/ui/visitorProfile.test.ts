// @vitest-environment happy-dom
import { afterEach, it, expect, vi } from 'vitest';
import { openVisitorProfile } from '../../src/ui/visitorProfile';
const profile = {
  id: 'pupil',
  nickname: 'Lea',
  character: 'girl' as const,
  look: { items: [], colors: {} },
  level: 7,
  titleLabel: 'Busy Bee',
  frameId: 'frame_silver',
  streak: 6,
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => {
  document.querySelector<HTMLButtonElement>('.visitor-modal .panel-head button')?.click();
  document.body.innerHTML = '';
});
it('shows public profile details and rendered outfit without editable controls or a coin balance', async () => {
  const h = openVisitorProfile({
    id: 'pupil',
    load: async () => ({ ok: true, value: profile }),
    portraits: async () => 'data:image/png;base64,a',
  });
  await tick();
  expect(document.body.textContent).toContain('Lea');
  expect(document.body.textContent).toContain('Busy Bee');
  expect(document.body.textContent).toContain('6');
  expect(document.querySelector('.level-crest')?.getAttribute('aria-label')).toContain('7');
  expect(document.querySelectorAll('input,select')).toHaveLength(0);
  expect(document.body.textContent).not.toContain('Münzen');
  h.close();
  expect(document.querySelector('.visitor-modal')).toBeNull();
});
it('supports retry and ignores a response after closing', async () => {
  let resolve!: (value: unknown) => void;
  const load = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, message: 'Offline' })
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
  const h = openVisitorProfile({ id: 'pupil', load });
  await tick();
  document.querySelector<HTMLButtonElement>('[data-visitor-retry]')!.click();
  h.close();
  resolve({ ok: true, value: profile });
  await tick();
  expect(load).toHaveBeenCalledTimes(2);
  expect(document.querySelector('.visitor-modal')).toBeNull();
});
