// Teacher "Saison" tab (review W4): German dates and German messages for the season RPC errors.
import { describe, expect, it } from 'vitest';
import { germanDate, seasonError } from '../../src/teacher/pages/season';

describe('teacher season page', () => {
  it('shows dates as DD.MM.YYYY', () => {
    expect(germanDate('2026-10-28')).toBe('28.10.2026');
    expect(germanDate('2026-12-06T00:00:00Z')).toBe('06.12.2026');
  });

  it('turns the database errors into plain German', () => {
    expect(seasonError(new Error('end must be Sunday'), 'x')).toBe('Das Ende muss ein Sonntag sein.');
    expect(seasonError(new Error('overlap'), 'x')).toBe('Die Daten überschneiden sich mit einer anderen Saison.');
    expect(seasonError(new Error('something else'), 'Speichern fehlgeschlagen.')).toBe('Speichern fehlgeschlagen.');
  });
});
