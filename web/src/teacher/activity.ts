import type { PupilRow, TutorialStepId } from './api';
import { mondayOf as monday } from './week';
import { INACTIVE_DAYS } from './rules';
export const STEP_LABELS: Record<TutorialStepId, string> = {
  not_started: 'noch nicht begonnen',
  intro: 'Begrüßung',
  quiz: 'Quiz',
  buy: 'Haus kaufen',
  place: 'Haus hinstellen',
};
export function berlinDate(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
export function mondayOf(d: Date): string {
  return monday(berlinDate(d))!;
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function days(last: Date, now: Date): number {
  return Math.max(0, Math.round((Date.parse(berlinDate(now)) - Date.parse(berlinDate(last))) / 86400000));
}
export function lastActive(r: PupilRow): Date | null {
  const stamps = [r.lastSignInAt, r.lastAnswerAt]
    .filter((s): s is string => !!s)
    .map((s) => Date.parse(s))
    .filter(Number.isFinite);
  return stamps.length ? new Date(Math.max(...stamps)) : null;
}
export function activeLabel(last: Date | null, now: Date): string {
  if (!last) return 'noch nie';
  const n = days(last, now);
  return n === 0 ? 'heute' : n === 1 ? 'gestern' : `vor ${n} Tagen`;
}
export function inactiveHint(r: PupilRow, now: Date): string | null {
  if (r.holidayWeek) return null;
  const last = lastActive(r);
  if (!last) return 'noch nie aktiv';
  const n = days(last, now);
  return n >= INACTIVE_DAYS ? `seit ${n} Tagen nicht aktiv` : null;
}
export function plotLabel(r: PupilRow): string {
  return r.tutorialStep
    ? `Tutorial: ${STEP_LABELS[r.tutorialStep] ?? 'noch nicht begonnen'}`
    : r.plotIndex === null
      ? '–'
      : `Nr. ${r.plotIndex + 1}`;
}
export function questsLabel(r: PupilRow): string {
  return r.holidayWeek ? 'Ferien' : `${r.questsSolvedWeek} / ${r.questsOfferedWeek}`;
}
export function ledgerDate(s: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(s));
}
