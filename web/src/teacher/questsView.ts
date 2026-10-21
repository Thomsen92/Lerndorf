/**
 * Teacher section "Daily Quests": coverage notices and a 7-day preview with solutions.
 * Returns HTML; teacherView puts it into the page.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { esc } from '../ui/esc';
import {
  dayLabel,
  loadQuestPreview,
  loadQuestStatus,
  questNotices,
  solutionText,
  type QuestPreview,
} from './api';

const PREVIEW_DAYS = 7;

const TYPE_LABELS: Record<string, string> = {
  choice: 'Auswahl',
  gap: 'Lücke',
  match: 'Zuordnen',
  order: 'Reihenfolge',
  listening: 'Hören',
};

export async function renderQuestPanel(supabase: SupabaseClient): Promise<string> {
  const status = await loadQuestStatus(supabase);
  if (!status.ok) {
    return `<section><h2>Daily Quests</h2><p class="error">${esc(status.message)}</p></section>`;
  }
  const notices = questNotices(status.value)
    .map((n) => `<li class="notice notice-${n.level}">${esc(n.text)}</li>`)
    .join('');
  const preview = await loadQuestPreview(supabase, status.value.today, PREVIEW_DAYS);
  const previewHtml = preview.ok
    ? previewTables(preview.value)
    : `<p class="error">${esc(preview.message)}</p>`;
  return `<section id="questSection"><h2>Daily Quests</h2>
    <ul class="notices">${notices}</ul>
    <h3>Vorschau: die nächsten ${PREVIEW_DAYS} Tage</h3>
    ${previewHtml}</section>`;
}

function previewTables(rows: QuestPreview[]): string {
  if (rows.length === 0) return '<p>Keine Quests in den nächsten Tagen.</p>';
  const days: string[] = [];
  for (const r of rows) if (!days.includes(r.day)) days.push(r.day);
  return days
    .map((day) => {
      const body = rows
        .filter((r) => r.day === day)
        .map(
          (r) =>
            `<tr><td>${esc(r.prompt)}${r.hint ? `<br><span class="hint">Tipp: ${esc(r.hint)}</span>` : ''}</td>` +
            `<td>${esc(TYPE_LABELS[r.type] ?? r.type)}</td><td class="num">${r.reward}</td>` +
            `<td>${esc(solutionText(r.solution, r.type, r.data))}</td></tr>`,
        )
        .join('');
      return `<h4>${esc(dayLabel(day))}</h4>
        <table><thead><tr><th>Aufgabe</th><th>Art</th><th class="num">Münzen</th><th>Lösung</th></tr></thead>
        <tbody>${body}</tbody></table>`;
    })
    .join('');
}
