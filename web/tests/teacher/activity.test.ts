import { it, expect } from 'vitest';
import { activeLabel, inactiveHint, plotLabel, questsLabel, mondayOf } from '../../src/teacher/activity';
import type { PupilRow } from '../../src/teacher/api';
const row = {
  lastSignInAt: '2026-10-19T08:00Z',
  lastAnswerAt: null,
  holidayWeek: false,
  tutorialStep: 'quiz',
  plotIndex: 6,
  questsSolvedWeek: 2,
  questsOfferedWeek: 9,
} as PupilRow;
it('uses Berlin calendar days across midnight and DST', () => {
  expect(activeLabel(new Date('2026-10-24T21:30Z'), new Date('2026-10-24T22:10Z'))).toBe('gestern');
  expect(activeLabel(new Date('2026-10-24T22:30Z'), new Date('2026-10-25T23:10Z'))).toBe('gestern');
  expect(activeLabel(null, new Date())).toBe('noch nie');
  expect(mondayOf(new Date('2026-10-25T23:10Z'))).toBe('2026-10-26');
});
it('labels tutorial, quests and inactivity without holiday warnings', () => {
  expect(plotLabel(row)).toBe('Tutorial: Quiz');
  expect(questsLabel(row)).toBe('2 / 9');
  expect(inactiveHint(row, new Date('2026-10-25T12:00Z'))).toBe('seit 6 Tagen nicht aktiv');
  expect(inactiveHint({ ...row, holidayWeek: true }, new Date('2026-10-25T12:00Z'))).toBeNull();
  expect(questsLabel({ ...row, holidayWeek: true })).toBe('Ferien');
  expect(plotLabel({ ...row, tutorialStep: null })).toBe('Nr. 7');
});
