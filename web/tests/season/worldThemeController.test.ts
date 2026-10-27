// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorldThemeController } from '../../src/season/worldThemeController';
import type { WorldTheme, WorldThemeState } from '../../src/api/worldTheme';

const state = (
  requested: WorldTheme = 'normal',
  effective: WorldTheme = 'normal',
  classId = '8a',
  revision = 1,
): WorldThemeState => ({
  classId,
  requestedTheme: requested,
  effectiveTheme: effective,
  revision,
  seasonId: '2026-11-halloween',
  seasonLabel: 'Season I – Halloween',
  seasonState: 'running',
  welcomeSeen: false,
});

describe('class world theme polling', () => {
  let hidden = false;
  const listeners = new Set<() => void>();
  const visibility = {
    get hidden() {
      return hidden;
    },
    addEventListener: (_type: string, _fn: () => void) => {
      listeners.add(_fn);
    },
    removeEventListener: (_type: string, _fn: () => void) => {
      listeners.delete(_fn);
    },
  };
  beforeEach(() => {
    vi.useFakeTimers();
    hidden = false;
    listeners.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('applies a changed state once and skips an identical state', async () => {
    const read = vi.fn().mockResolvedValue(state('halloween', 'halloween')),
      apply = vi.fn();
    const c = createWorldThemeController({ classId: '8a', read, apply, visibility });
    await c.refresh();
    await c.refresh();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(state('halloween', 'halloween'));
    c.dispose();
  });

  it('reacts when the calendar ends the season without a new revision', async () => {
    const read = vi
        .fn()
        .mockResolvedValueOnce(state('halloween', 'halloween', '8a', 3))
        .mockResolvedValueOnce(state('halloween', 'normal', '8a', 3)),
      apply = vi.fn();
    const c = createWorldThemeController({ classId: '8a', read, apply, visibility });
    await c.refresh();
    await c.refresh();
    expect(apply).toHaveBeenCalledTimes(2);
    expect(apply.mock.calls[1][0].effectiveTheme).toBe('normal');
    c.dispose();
  });

  it('polls visible clients every 30 seconds', async () => {
    const read = vi.fn().mockResolvedValue(state()),
      c = createWorldThemeController({ classId: '8a', read, apply: vi.fn(), visibility });
    await c.refresh();
    await vi.advanceTimersByTimeAsync(30000);
    expect(read).toHaveBeenCalledTimes(2);
    c.dispose();
  });

  it('does not poll hidden tabs and refreshes when visible', async () => {
    const read = vi.fn().mockResolvedValue(state()),
      c = createWorldThemeController({ classId: '8a', read, apply: vi.fn(), visibility });
    hidden = true;
    await c.refresh();
    await vi.advanceTimersByTimeAsync(60000);
    expect(read).not.toHaveBeenCalled();
    hidden = false;
    listeners.forEach((fn) => fn());
    await Promise.resolve();
    expect(read).toHaveBeenCalledTimes(1);
    c.dispose();
  });

  it('serializes overlapping reads and ignores a reply after dispose', async () => {
    let resolve!: (x: WorldThemeState) => void;
    const read = vi.fn(
        () =>
          new Promise<WorldThemeState>((r) => {
            resolve = r;
          }),
      ),
      apply = vi.fn();
    const c = createWorldThemeController({ classId: '8a', read, apply, visibility });
    const first = c.refresh();
    void c.refresh();
    await vi.advanceTimersByTimeAsync(30000);
    expect(read).toHaveBeenCalledTimes(1);
    c.dispose();
    resolve(state('halloween', 'halloween'));
    await first;
    expect(apply).not.toHaveBeenCalled();
    expect(listeners.size).toBe(0);
  });

  it('keeps the current world on a read error and retries at the next tick', async () => {
    const read = vi
        .fn()
        .mockResolvedValueOnce(state('halloween', 'halloween'))
        .mockRejectedValueOnce(Error('offline'))
        .mockResolvedValueOnce(state()),
      apply = vi.fn();
    const c = createWorldThemeController({ classId: '8a', read, apply, visibility });
    await c.refresh();
    await c.refresh();
    expect(apply).toHaveBeenCalledTimes(1);
    await c.refresh();
    expect(apply).toHaveBeenLastCalledWith(state());
    c.dispose();
  });

  it('refuses a reply for a different class after a class switch', async () => {
    const apply = vi.fn(),
      c = createWorldThemeController({
        classId: '8a',
        read: async () => state('halloween', 'halloween', '8b'),
        apply,
        visibility,
      });
    await c.refresh();
    expect(apply).not.toHaveBeenCalled();
    c.dispose();
  });
});
