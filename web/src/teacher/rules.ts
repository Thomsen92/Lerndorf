export const QUICK_AMOUNTS = [5, 10, 20, 100, -5, -10] as const;
export const MULTI_AMOUNTS = [5, 10, 20, 100] as const;
export const REASONS = ['Mitarbeit', 'Hausaufgabe', 'Hilfsbereit', 'Verhalten'] as const;
export const UNDO_SECONDS = 10;
export const INACTIVE_DAYS = 5;
export const NOTICE_LIMIT = 140;
export const NOTICE_DAYS = 7;
export function signed(n: number): string {
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}
export function bookingNote(delta: number, reason: string | null): string {
  return `Schnellbuchung ${signed(delta)}${reason ? ' · ' + reason : ''}`;
}
