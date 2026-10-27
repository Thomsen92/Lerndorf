/**
 * Season I window (plan E1/U6). The date is the client-side gate for the market mood and the
 * season stall; the server enforces the same window in the RPCs (migration 0030).
 */
export const SEASON_START = '2026-10-28';
export const SEASON_END = '2026-12-06';

/** Calendar date in Europe/Berlin as YYYY-MM-DD. */
export function berlinDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isSeasonActive(now: Date = new Date()): boolean {
  const day = berlinDate(now);
  return day >= SEASON_START && day <= SEASON_END;
}
