// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { createByteBubble, placeByteBubble, typingSeconds } from '../../src/mascot/bubble';
it('keeps world bubbles clear of the pupil speech and the fixed navigation', () => {
  const position = placeByteBubble({ x: 370, y: 410 }, 310, 150, { width: 1024, height: 768 }, [
    { left: 350, top: 330, right: 670, bottom: 420 },
  ]);
  expect(position.top + 150).toBeLessThanOrEqual(318);
  expect(position.left).toBeGreaterThanOrEqual(100);
  const nearRail = placeByteBubble({ x: 50, y: 410 }, 310, 150, { width: 1024, height: 768 }, [
    { left: 0, top: 0, right: 88, bottom: 768 },
  ]);
  expect(nearRail.left).toBeGreaterThanOrEqual(100);
});
it('keeps text inert, and releases a tutorial prompt on dispose', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const bubble = createByteBubble(host);
  const next = bubble.ask('<img src=x>');
  expect(host.querySelector('img')).toBeNull();
  bubble.dispose();
  await next;
  host.remove();
});

it('pops each new line with a blip and types under lines without a recording', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const stop = vi.fn();
  const sound = { play: vi.fn(), playFor: vi.fn(() => stop) };
  const bubble = createByteBubble(host, { sound: () => sound });
  bubble.show({ text: 'Nice work!', voiced: false, seconds: 3 });
  expect(sound.play).toHaveBeenCalledWith('blip');
  expect(sound.playFor).toHaveBeenCalledWith('typing', typingSeconds('Nice work!'));
  // the same line arriving with its recording: no second blip, the typing stops
  bubble.show({ text: 'Nice work!', voiced: true, seconds: 3 });
  expect(sound.play).toHaveBeenCalledTimes(1);
  expect(sound.playFor).toHaveBeenCalledTimes(1);
  expect(stop).toHaveBeenCalledOnce();
  bubble.show({ text: 'Splendid! Nicely done.', voiced: true, seconds: 3 });
  expect(sound.play).toHaveBeenCalledTimes(2);
  expect(sound.playFor).toHaveBeenCalledTimes(1);
  void bubble.ask('Welcome to your class village!');
  expect(sound.play).toHaveBeenCalledTimes(3);
  expect(sound.playFor).toHaveBeenCalledTimes(2);
  bubble.dispose();
  expect(stop).toHaveBeenCalledTimes(2);
  host.remove();
});

it('stays silent without a running game sound', () => {
  const host = document.createElement('div');
  const bubble = createByteBubble(host, { sound: () => null });
  expect(() => bubble.show({ text: 'Hi', voiced: false, seconds: 1 })).not.toThrow();
  bubble.dispose();
});
