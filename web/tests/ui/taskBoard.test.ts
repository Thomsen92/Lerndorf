// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const loadTasks = vi.fn();
const loadTodayStatus = vi.fn();
vi.mock('../../src/api/economy', () => ({
  loadTasks: (...a: unknown[]) => loadTasks(...a),
  loadTodayStatus: (...a: unknown[]) => loadTodayStatus(...a),
  submitAnswer: vi.fn(),
}));
import { openTaskBoard } from '../../src/ui/taskBoardView';
import type { AreaHandle } from '../../src/ui/areas';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
let handles: AreaHandle[] = [];
const open = (onClose = vi.fn()) => {
  const h = openTaskBoard({ supabase: {} as SupabaseClient, coins: 5, onCoins: vi.fn(), onClose });
  handles.push(h);
  return { h, onClose };
};

beforeEach(() => {
  document.body.innerHTML = '';
  loadTasks.mockReset().mockResolvedValue({ ok: true, value: [] });
  loadTodayStatus.mockReset().mockResolvedValue({ ok: true, value: {} });
});
afterEach(() => {
  handles.forEach((h) => h.close());
  handles = [];
});

describe('task board area', () => {
  it('is a region; Schließen calls onClose, close() only removes', async () => {
    const { h, onClose } = open();
    await flush();
    const region = document.querySelector('section.overlay.area') as HTMLElement;
    expect(region.getAttribute('role')).toBe('region');
    expect(document.getElementById(region.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Aufgabentafel',
    );
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Schließen')?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('section.overlay.area')).not.toBeNull();
    h.close();
    expect(document.querySelector('section.overlay.area')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows an error when loading throws', async () => {
    loadTasks.mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    open();
    await flush();
    const text = document.querySelector('section.overlay.area')?.textContent ?? '';
    expect(text).toContain('Das hat nicht geklappt');
    expect(text).not.toContain('Lädt');
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent === 'Schließen')).toBe(true);
  });

  it('uses a distinct title id per board', async () => {
    open();
    open();
    await flush();
    const ids = Array.from(document.querySelectorAll('section.overlay.area')).map((r) =>
      r.getAttribute('aria-labelledby'),
    );
    expect(ids[0]).not.toBe(ids[1]);
    expect(document.querySelectorAll(`[id="${ids[0]}"]`).length).toBe(1);
  });
});
