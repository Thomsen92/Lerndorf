// U6: the client season window must match migration 0030 and include both boundary days.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SEASON_END, SEASON_START, berlinDate, isSeasonActive } from '../../src/world/seasonWindow';

describe('season window', () => {
  it('matches the dates seeded in 0030', () => {
    const sql = readFileSync(new URL('../../../supabase/migrations/0030_season_content.sql', import.meta.url), 'utf8');
    expect(sql).toContain(`'${SEASON_START}'`);
    expect(sql).toContain(`'${SEASON_END}'`);
  });

  it('is active on both boundary days', () => {
    expect(isSeasonActive(new Date('2026-10-28T10:00:00+01:00'))).toBe(true);
    expect(isSeasonActive(new Date('2026-12-06T10:00:00+01:00'))).toBe(true);
    expect(isSeasonActive(new Date('2026-10-27T23:30:00+01:00'))).toBe(false);
    expect(isSeasonActive(new Date('2026-12-07T00:10:00+01:00'))).toBe(false);
  });

  it('uses the Berlin day around midnight UTC', () => {
    expect(berlinDate(new Date('2026-10-27T22:30:00Z'))).toBe('2026-10-27');
    expect(berlinDate(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28');
  });
});
