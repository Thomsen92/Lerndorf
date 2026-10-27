/**
 * Pins the season clock to Tuesday 27.10.2026 (Europe/Berlin), so the season tests do not depend on
 * the real date: every season rule reads `public.season_today()` (0029), and XP rows without an
 * explicit time are booked on that day.
 */
export const PIN_SEASON_CLOCK = `
  create or replace function public.season_today() returns date
  language sql stable as $$ select date '2026-10-27' $$;
  alter table public.xp_ledger alter column created_at set default timestamptz '2026-10-27 12:00+01';
`;

/** A JSON object returned by an RPC; tests read fields and compare them with `expect`. */
export interface Obj {
  [key: string]: unknown;
}
