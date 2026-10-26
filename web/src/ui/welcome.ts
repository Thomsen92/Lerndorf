import { dateLocale, msg, tr } from '../i18n';
import type { Progress, XpReason } from '../api/progress';
import { openModal, type ModalHandle } from './dialog';

export function welcomeLines(unseen: Progress['unseen']): string[] {
  const lines: string[] = [];
  const totals = new Map<XpReason, number>();
  for (const row of unseen) {
    if (row.reason === 'stamp') {
      const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.ref);
      const when = date
        ? new Intl.DateTimeFormat(dateLocale(), { day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(
            new Date(`${row.ref}T12:00:00Z`),
          )
        : row.ref;
      lines.push(msg`Stempel für die Woche ab ${when}: +${row.delta} XP`);
    } else totals.set(row.reason, (totals.get(row.reason) ?? 0) + row.delta);
  }
  const labels: Record<XpReason, string> = {
    quest: tr('Aufgaben'),
    day_goal: tr('Tagesziel'),
    streak: tr('Serie'),
    stamp: tr('Stempel'),
    tutorial: 'Tutorial',
    first_place: tr('Bauen'),
    backfill: tr('Dein bisheriger Fortschritt'),
  };
  for (const [reason, xp] of totals) lines.push(`${labels[reason]}: +${xp} XP`);
  return lines;
}

export function openWelcome(opts: {
  lines: string[];
  opener?: HTMLElement | null;
  onDone: () => void;
}): ModalHandle {
  const modal = openModal({ title: tr('Willkommen zurück!'), opener: opts.opener, onClose: opts.onDone });
  modal.body.classList.add('xp-welcome');
  const list = document.createElement('ul');
  for (const line of opts.lines) {
    const li = document.createElement('li');
    li.textContent = line;
    list.append(li);
  }
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'primary';
  next.textContent = tr('Weiter');
  next.dataset.welcomeNext = '';
  next.addEventListener('click', () => modal.close());
  modal.body.append(list, next);
  return modal;
}
