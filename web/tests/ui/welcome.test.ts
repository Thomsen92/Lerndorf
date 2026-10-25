// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { welcomeLines, openWelcome } from '../../src/ui/welcome';
afterEach(() => {
  document.body.innerHTML = '';
});
it('groups unseen XP, keeping each stamped week visible', () => {
  expect(
    welcomeLines([
      { id: 1, reason: 'stamp', ref: '2026-10-19', delta: 100, createdAt: '' },
      { id: 2, reason: 'quest', ref: 'q1', delta: 15, createdAt: '' },
      { id: 3, reason: 'quest', ref: 'q2', delta: 10, createdAt: '' },
    ]),
  ).toEqual(['Stempel für die Woche ab 19.10.: +100 XP', 'Aufgaben: +25 XP']);
  expect(welcomeLines([])).toEqual([]);
});
it('opens an accessible welcome card and completes when dismissed', () => {
  let done = false;
  const h = openWelcome({
    lines: ['Aufgaben: +25 XP'],
    onDone: () => {
      done = true;
    },
  });
  expect(document.querySelector('[role=dialog]')?.textContent).toContain('Willkommen zurück!');
  document.querySelector<HTMLButtonElement>('[data-welcome-next]')?.click();
  expect(done).toBe(true);
  expect(h.isOpen).toBe(false);
});
