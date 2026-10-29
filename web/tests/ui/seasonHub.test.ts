// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeasonHub } from '../../src/season/seasonHub';
import type { WorldThemeState } from '../../src/api/worldTheme';

const state = (overrides: Partial<WorldThemeState> = {}): WorldThemeState => ({
  classId: '8a',
  requestedTheme: 'normal',
  effectiveTheme: 'normal',
  revision: 0,
  seasonId: '2026-11-halloween',
  seasonLabel: 'Season I – Halloween',
  seasonState: 'running',
  welcomeSeen: false,
  ...overrides,
});

afterEach(() => document.body.replaceChildren());

const mount = (opts: Partial<Parameters<typeof createSeasonHub>[0]> = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  return createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => true, ...opts });
};

describe('season ticket', () => {
  it('goes straight to the LearnPass without a welcome dialog', () => {
    const openLearnPass = vi.fn();
    const hub = mount({ openLearnPass });
    hub.open();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    expect(openLearnPass).toHaveBeenCalledOnce();
    hub.el.click();
    expect(openLearnPass).toHaveBeenCalledTimes(2);
    hub.dispose();
  });

  it('acknowledges a running season once, on open', () => {
    const onAcknowledge = vi.fn();
    const hub = mount({ onAcknowledge });
    hub.setState(state());
    hub.open();
    hub.open();
    expect(onAcknowledge).toHaveBeenCalledOnce();
    expect(onAcknowledge).toHaveBeenCalledWith('2026-11-halloween');
    hub.dispose();
  });

  it('marks the season as seen silently, without a popup', () => {
    const openLearnPass = vi.fn();
    const onAcknowledge = vi.fn();
    const hub = mount({ openLearnPass, onAcknowledge });
    hub.setState(state());
    hub.maybeAutoOpen();
    hub.maybeAutoOpen();
    expect(openLearnPass).not.toHaveBeenCalled();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    expect(onAcknowledge).toHaveBeenCalledOnce();
    hub.dispose();
  });

  it('does not acknowledge a seen or planned season', () => {
    const onAcknowledge = vi.fn();
    const hub = mount({ onAcknowledge });
    hub.setState(state({ seasonState: 'upcoming' }));
    hub.maybeAutoOpen();
    hub.setState(state({ welcomeSeen: true }));
    hub.maybeAutoOpen();
    expect(onAcknowledge).not.toHaveBeenCalled();
    hub.dispose();
  });

  it('respects tutorial/modal coverage', () => {
    let available = false;
    const openLearnPass = vi.fn();
    const hub = mount({ openLearnPass, canOpen: () => available });
    hub.open();
    expect(openLearnPass).not.toHaveBeenCalled();
    available = true;
    hub.open();
    expect(openLearnPass).toHaveBeenCalledOnce();
    hub.dispose();
    expect(document.body.querySelector('.season-world-ticket')).toBe(null);
  });

  it('places the ticket right below the player card, so they never overlap', () => {
    const nav = document.createElement('nav');
    nav.className = 'game-nav';
    nav.getBoundingClientRect = () => ({ top: 12, bottom: 150, height: 138 }) as DOMRect;
    const host = document.createElement('div');
    document.body.append(nav, host);
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => true });
    hub.setState(state());
    expect(hub.el.style.top).toBe('162px');
    hub.dispose();
  });
});
