// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { setLocale } from '../../src/i18n';
import { OLLIE_LINE_IDS, ollieLine } from '../../src/shopkeeper/lines';
import { createOlliePanel } from '../../src/ui/olliePanel';
import type { Sound } from '../../src/ui/sound';
vi.mock('../../src/mascot/voice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/mascot/voice')>()),
  silenceSirByte: vi.fn(),
}));
import { silenceSirByte } from '../../src/mascot/voice';
afterEach(() => {
  document.body.replaceChildren();
  setLocale('de');
  vi.clearAllMocks();
});
it('has stable future voice IDs and localised text, with a catalogue-independent recommendation', () => {
  expect(OLLIE_LINE_IDS).toEqual(['welcome', 'recommend', 'coins', 'about', 'bought', 'farewell']);
  setLocale('en');
  expect(ollieLine('coins')).toContain('Practise your English');
  expect(ollieLine('recommend')).not.toMatch(/duck/i);
  setLocale('de');
  expect(ollieLine('coins')).toContain('Übe Englisch');
});
it('shows text choices, stops Sir Byte and never speaks after closing', async () => {
  const play = vi.fn();
  const panel = createOlliePanel({ play, enabled: true } as unknown as Sound);
  document.body.append(panel.element);
  panel.element.querySelector<HTMLButtonElement>('.item-area-talk')!.click();
  await Promise.resolve();
  expect(silenceSirByte).toHaveBeenCalled();
  expect(play).toHaveBeenCalledWith('ollieBlip');
  expect(panel.element.querySelector('.item-area-dialogue-choices')?.hasAttribute('hidden')).toBe(false);
  panel.close();
  play.mockClear();
  panel.bought();
  expect(play).not.toHaveBeenCalled();
});
