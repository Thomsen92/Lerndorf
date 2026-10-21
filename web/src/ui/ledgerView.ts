/**
 * Kontoauszug (SPEC §12): the last 30 bookings of the pupil, in plain German.
 * Read through RLS: a pupil sees only the own rows.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { openModal, type ModalHandle } from './dialog';

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

export const REASON_LABEL: Record<string, string> = {
  task: 'Aufgabe gelöst',
  quest: 'Daily Quest gelöst',
  stamp: 'Wochenplan-Stempel',
  purchase: 'Einkauf',
  refund: 'Rückerstattung',
  teacher: 'Korrektur der Lehrkraft',
};

export interface LedgerRow {
  delta: number;
  reason: string;
  note: string | null;
  createdAt: string;
}

export async function loadLedger(supabase: SupabaseClient, limit = 30): Promise<LedgerRow[] | null> {
  const { data, error } = await supabase
    .from('coin_ledger')
    .select('delta, reason, ref, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error || !data) return null;
  return data.map((r) => ({
    delta: r.delta,
    reason: r.reason,
    note: r.ref,
    createdAt: r.created_at,
  }));
}

/** Date in Berlin time, e.g. "17.10. 14:05". */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(',', '');
}

/** Renders the statement into the given element. */
export function renderLedger(target: HTMLElement, rows: LedgerRow[] | null): void {
  if (rows === null) {
    target.innerHTML = '<p class="error">Der Kontoauszug konnte nicht geladen werden.</p>';
    return;
  }
  if (rows.length === 0) {
    target.innerHTML = '<p>Noch keine Buchungen.</p>';
    return;
  }
  target.innerHTML = `
    <table class="ledger">
      <thead><tr><th>Wann</th><th>Was</th><th class="num">Münzen</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${esc(formatWhen(r.createdAt))}</td>
              <td>${esc(REASON_LABEL[r.reason] ?? r.reason)}${r.note && r.reason === 'teacher' ? ` <span class="hint">${esc(r.note)}</span>` : ''}</td>
              <td class="num ${r.delta < 0 ? 'minus' : 'plus'}">${r.delta > 0 ? '+' : ''}${r.delta}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;
}

/** Opens the statement as a modal; the rows load in the background. */
export function openLedger(supabase: SupabaseClient, opener?: HTMLElement | null): ModalHandle {
  const modal = openModal({ title: 'Kontoauszug', opener, wide: true });
  const target = document.createElement('div');
  target.innerHTML = '<p>Lädt …</p>';
  modal.body.appendChild(target);
  void loadLedger(supabase).then((rows) => {
    if (modal.isOpen) renderLedger(target, rows);
  });
  return modal;
}
