import type { Progress, XpReason } from '../api/progress';
import { openModal, type ModalHandle } from './dialog';

export function welcomeLines(unseen: Progress['unseen']): string[] {
  const lines: string[] = [];
  const totals = new Map<XpReason, number>();
  for (const row of unseen) {
    if (row.reason === 'stamp') {
      const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.ref);
      const when = date ? `${date[3]}.${date[2]}.` : row.ref;
      lines.push(`Stempel für die Woche ab ${when}: +${row.delta} XP`);
    } else totals.set(row.reason, (totals.get(row.reason) ?? 0) + row.delta);
  }
  const labels: Record<XpReason, string> = {
    quest: 'Aufgaben',
    day_goal: 'Tagesziel',
    streak: 'Serie',
    stamp: 'Stempel',
    tutorial: 'Tutorial',
    first_place: 'Bauen',
    backfill: 'Dein bisheriger Fortschritt',
  };
  for (const [reason, xp] of totals) lines.push(`${labels[reason]}: +${xp} XP`);
  return lines;
}

export function openWelcome(opts: {
  lines: string[];
  opener?: HTMLElement | null;
  onDone: () => void;
}): ModalHandle {
  const modal = openModal({ title: 'Willkommen zurück!', opener: opts.opener, onClose: opts.onDone });
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
  next.textContent = 'Weiter';
  next.dataset.welcomeNext = '';
  next.addEventListener('click', () => modal.close());
  modal.body.append(list, next);
  return modal;
}
