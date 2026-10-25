// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { createByteBubble, placeByteBubble } from '../../src/mascot/bubble';
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
