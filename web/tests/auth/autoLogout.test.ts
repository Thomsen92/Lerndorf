import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoLogout, AUTO_LOGOUT_MS } from '../../src/auth/autoLogout';

describe('AutoLogout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('uses 15 minutes', () => {
    expect(AUTO_LOGOUT_MS).toBe(15 * 60 * 1000);
  });

  it('fires once after the timeout without activity', () => {
    const onTimeout = vi.fn();
    const al = new AutoLogout(1000, onTimeout);
    al.touch();
    vi.advanceTimersByTime(999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(al.running).toBe(false);
  });

  it('restarts the countdown on touch', () => {
    const onTimeout = vi.fn();
    const al = new AutoLogout(1000, onTimeout);
    al.touch();
    vi.advanceTimersByTime(900);
    al.touch();
    vi.advanceTimersByTime(900);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does nothing after stop', () => {
    const onTimeout = vi.fn();
    const al = new AutoLogout(1000, onTimeout);
    al.touch();
    al.stop();
    vi.advanceTimersByTime(5000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
