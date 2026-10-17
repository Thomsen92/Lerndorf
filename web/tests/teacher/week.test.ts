import { describe, it, expect } from 'vitest';
import { isMonday, mondayOf, weekLabel, parseIsoDate } from '../../src/teacher/week';

describe('week helpers', () => {
  it('2026-11-09 is a Monday (SPEC §9 example)', () => {
    expect(isMonday('2026-11-09')).toBe(true);
    expect(isMonday('2026-11-10')).toBe(false);
  });

  it('mondayOf maps every day of the week to its Monday', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
    expect(mondayOf('2026-11-11')).toBe('2026-11-09'); // Wednesday
    expect(mondayOf('2026-11-15')).toBe('2026-11-09'); // Sunday
    expect(mondayOf('2026-11-16')).toBe('2026-11-16'); // next Monday
  });

  it('mondayOf works across month and year boundaries', () => {
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });

  it('rejects impossible dates', () => {
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('09.11.2026')).toBeNull();
    expect(mondayOf('kein datum')).toBeNull();
  });

  it('labels a week without calendar week numbers', () => {
    expect(weekLabel('2026-11-09')).toBe('Woche ab 09.11.');
  });
});
