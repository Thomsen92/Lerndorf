// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { createBubble, positionBubble } from '../../src/ui/speechBubble';

afterEach(() => {
  document.body.replaceChildren();
});

describe('speech bubble', () => {
  it('has mood class, status role and text only via textContent', () => {
    const el = createBubble('Hallo', 'sad');
    expect(el.className).toBe('speech-bubble speech-bubble--sad');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.textContent).toBe('Hallo');
    const evil = createBubble('<img src=x onerror=alert(1)>', 'plain');
    expect(evil.querySelector('img')).toBeNull();
    expect(evil.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('keeps the bubble inside the window near an edge', () => {
    const el = createBubble('Hi', 'happy');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({ width: 200, height: 80 }) as DOMRect;
    positionBubble(el, { x: window.innerWidth - 2, y: 3 });
    const left = parseFloat(el.style.left);
    const top = parseFloat(el.style.top);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + 200).toBeLessThanOrEqual(window.innerWidth);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + 80).toBeLessThanOrEqual(window.innerHeight);
  });

  it('points the tip at the figure (custom property for the tip offset)', () => {
    const el = createBubble('Hi', 'plain');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({ width: 200, height: 80 }) as DOMRect;
    positionBubble(el, { x: 300, y: 400 });
    // bubble sits above the point, centred
    expect(parseFloat(el.style.left)).toBeCloseTo(200, 0);
    expect(el.style.getPropertyValue('--tip-x')).toBe('100px');
  });
});
