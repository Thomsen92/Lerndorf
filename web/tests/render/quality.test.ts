import { describe, it, expect } from 'vitest';
import { decideAuto, effectiveLevel, settingsFor, TARGET_FPS } from '../../src/render/quality';

describe('quality', () => {
  it('turns shadows off on low', () => {
    expect(settingsFor('low').shadows).toBe(false);
    expect(settingsFor('high').shadows).toBe(true);
  });

  it('auto picks high at 30 fps or more', () => {
    const frame = 1000 / (TARGET_FPS + 5); // about 35 fps
    expect(decideAuto(Array(150).fill(frame))).toBe('high');
  });

  it('auto picks low below 30 fps', () => {
    const frame = 1000 / (TARGET_FPS - 10); // about 20 fps
    expect(decideAuto(Array(100).fill(frame))).toBe('low');
  });

  it('auto with no measurement falls back to low', () => {
    expect(decideAuto([])).toBe('low');
  });

  it('a manual choice wins over auto', () => {
    expect(effectiveLevel('low', 'high')).toBe('low');
    expect(effectiveLevel('high', 'low')).toBe('high');
    expect(effectiveLevel('auto', 'low')).toBe('low');
    expect(effectiveLevel('auto', null)).toBe('high');
  });
});
