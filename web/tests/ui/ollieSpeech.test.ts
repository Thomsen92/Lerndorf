// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { createOllieSpeech } from '../../src/shopkeeper/speech';
import type { VoicePlayer } from '../../src/mascot/voice';
import type { Sound } from '../../src/ui/sound';
import { setLocale } from '../../src/i18n';

afterEach(() => {
  document.body.replaceChildren();
  setLocale('de');
  vi.restoreAllMocks();
});
function fixture(reduced = false) {
  const portrait = document.createElement('img');
  document.body.append(portrait);
  let frame: FrameRequestCallback = () => {};
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => {
    frame = fn;
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  let speaking = true;
  const voice = {
    unlock: vi.fn(),
    playFile: vi.fn(async () => {
      speaking = true;
      return 2;
    }),
    stop: vi.fn(() => {
      speaking = false;
    }),
    dispose: vi.fn(),
    frame: () => ({ speaking, speechTime: 0.6, speechDuration: 2, speechLevel: 0.8 }),
  } as unknown as VoicePlayer;
  const release = vi.fn();
  const sound = { enabled: true, play: vi.fn(), quiet: vi.fn(() => release) } as unknown as Sound;
  const controller = createOllieSpeech({ portrait, sound, voice, reducedMotion: () => reduced });
  return {
    portrait,
    voice,
    sound,
    release,
    controller,
    tick: (t = 200) => frame(t),
    ended: () => (speaking = false),
  };
}
it('uses localised IDs and moves only while the recording is speaking', async () => {
  setLocale('en');
  const f = fixture();
  await f.controller.say('welcome');
  expect(f.voice.playFile).toHaveBeenCalledWith('en-welcome');
  f.tick();
  expect(f.portrait.dataset.speaking).toBe('true');
  expect(f.portrait.style.getPropertyValue('--ollie-bob')).not.toBe('0px');
  f.ended();
  f.tick(300);
  expect(f.portrait.dataset.speaking).toBe('false');
  expect(f.release).toHaveBeenCalled();
  f.controller.dispose();
});
it('keeps reduced-motion portraits still while allowing the recording', async () => {
  const f = fixture(true);
  await f.controller.say('coins');
  f.tick();
  expect(f.voice.playFile).toHaveBeenCalledWith('de-coins');
  expect(f.portrait.style.getPropertyValue('--ollie-bob')).toBe('0px');
  f.controller.dispose();
});
it('stops and restores music on mute, hidden tab and close', async () => {
  const f = fixture();
  await f.controller.say('about');
  Object.assign(f.sound, { enabled: false });
  f.tick();
  expect(f.voice.stop).toHaveBeenCalled();
  expect(f.release).toHaveBeenCalled();
  f.controller.dispose();
  expect(f.voice.dispose).toHaveBeenCalled();
  await f.controller.say('welcome');
  expect(f.voice.playFile).toHaveBeenCalledTimes(1);
});
it('ignores late audio responses after dispose', async () => {
  const f = fixture();
  let resolve!: (n: number) => void;
  vi.mocked(f.voice.playFile).mockImplementationOnce(() => new Promise((r) => (resolve = r)));
  const pending = f.controller.say('bought');
  f.controller.dispose();
  resolve(2);
  await pending;
  expect(f.portrait.dataset.speaking).toBe('false');
  expect(f.sound.quiet).not.toHaveBeenCalled();
});
it('stops the current recording when the tab is hidden', async () => {
  const f = fixture();
  await f.controller.say('welcome');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  Reflect.deleteProperty(document, 'hidden');
  expect(f.portrait.dataset.speaking).toBe('false');
  expect(f.release).toHaveBeenCalled();
  f.controller.dispose();
});
it('lets a story wait for the recording end and cancels that wait on stop', async () => {
  const f = fixture();
  let finished = false;
  const pending = f.controller.tell('c491a688ea58073852c75dec').then(() => (finished = true));
  await Promise.resolve();
  expect(finished).toBe(false);
  f.ended();
  f.tick(400);
  await pending;
  expect(finished).toBe(true);
  finished = false;
  const next = f.controller.tell('df0171db67cc19aa448f437e').then(() => (finished = true));
  await Promise.resolve();
  f.controller.stop();
  await next;
  expect(finished).toBe(true);
  f.controller.dispose();
});
