/**
 * Week handling for stamps (SPEC §8, §19). A week is identified by its Monday, as an ISO date
 * `YYYY-MM-DD`. Pupils see "Woche ab 09.11." and never "KW".
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses YYYY-MM-DD into a UTC date. Returns null for anything else or an impossible date. */
export function parseIsoDate(value: string): Date | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** True if the ISO date is a Monday. */
export function isMonday(isoDate: string): boolean {
  const date = parseIsoDate(isoDate);
  return date !== null && date.getUTCDay() === 1;
}

/** The Monday of the week that contains the given ISO date (Monday maps to itself). */
export function mondayOf(isoDate: string): string | null {
  const date = parseIsoDate(isoDate);
  if (!date) return null;
  const offset = (date.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

/** Label for pupils and teachers: "Woche ab 09.11." */
export function weekLabel(isoMonday: string): string {
  const date = parseIsoDate(isoMonday);
  if (!date) return isoMonday;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `Woche ab ${dd}.${mm}.`;
}
