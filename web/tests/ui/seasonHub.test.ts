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

describe('independent season ticket and welcome', () => {
  it('opens one simple welcome and closes before entering the real pass', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const openLearnPass = vi.fn(() => expect(document.querySelector('[role=dialog]')).toBe(null));
    const hub = createSeasonHub({ host, openLearnPass, canOpen: () => true });
    hub.open();
    const text = document.querySelector('[role=dialog]')!.textContent!;
    expect(text).toContain('150 XP');
    expect(text).toContain('LearnPass');
    expect(text).not.toMatch(/Legendary|Rare|Sammelkarten|Collection/);
    document.querySelector<HTMLButtonElement>('[data-open-pass]')!.click();
    expect(openLearnPass).toHaveBeenCalledOnce();
    hub.dispose();
  });

  it('opens the welcome once automatically and acknowledges it on close', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const onAcknowledge = vi.fn();
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => true, onAcknowledge });
    hub.setState(state());
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).not.toBe(null);
    document.querySelector<HTMLButtonElement>('[role=dialog] button')!.click();
    expect(onAcknowledge).toHaveBeenCalledWith('2026-11-halloween');
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    // Opening by hand stays possible after the acknowledgement.
    hub.open();
    expect(document.querySelector('[role=dialog]')).not.toBe(null);
    hub.dispose();
  });

  it('waits without consuming the one automatic attempt while the village is busy', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let available = false;
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => available });
    hub.setState(state());
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    available = true;
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).not.toBe(null);
    hub.dispose();
  });

  it('does not open for a seen welcome, a planned season or after a theme-only switch', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => true });
    hub.setState(state({ seasonState: 'upcoming' }));
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    hub.setState(state({ welcomeSeen: true }));
    hub.maybeAutoOpen();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    hub.dispose();
  });

  it('respects tutorial/modal coverage and cleans up its own dialog', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let available = false;
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), canOpen: () => available });
    hub.open();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    available = true;
    hub.open();
    hub.dispose();
    expect(document.querySelector('[role=dialog]')).toBe(null);
    expect(host.children).toHaveLength(0);
    expect(host.hasAttribute('inert')).toBe(false);
  });
  it('starts the Spooky English Quiz after closing the welcome while the season runs', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const openQuiz = vi.fn(() => expect(document.querySelector('[role=dialog]')).toBe(null));
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), openQuiz, canOpen: () => true });
    hub.setState(state());
    hub.open();
    const quiz = document.querySelector<HTMLButtonElement>('[data-open-quiz]')!;
    expect(quiz.disabled).toBe(false);
    expect(quiz.textContent).toBe('Spooky English Quiz');
    quiz.click();
    expect(openQuiz).toHaveBeenCalledOnce();
    hub.dispose();
  });

  it('keeps the quiz locked before the season starts', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const openQuiz = vi.fn();
    const hub = createSeasonHub({ host, openLearnPass: vi.fn(), openQuiz, canOpen: () => true });
    hub.setState(state({ seasonState: 'upcoming' }));
    hub.open();
    const quiz = document.querySelector<HTMLButtonElement>('[data-open-quiz]')!;
    expect(quiz.disabled).toBe(true);
    expect(quiz.textContent).toMatch(/Season-Start/);
    hub.dispose();
  });
});
