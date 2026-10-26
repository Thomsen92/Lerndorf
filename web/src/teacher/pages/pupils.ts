import type { TeacherPage } from '../context';
import { loadClassPupils, loadPupilDetail, type PupilDetail } from '../api';
import {
  activeLabel,
  lastActive,
  inactiveHint,
  plotLabel,
  questsLabel,
  mondayOf,
  ledgerDate,
  STEP_LABELS,
} from '../activity';
import { signed } from '../rules';
import { esc } from '../../ui/esc';
const REASONS: Record<string, string> = {
  teacher: 'Lehrkraft',
  quest: 'Quest',
  stamp: 'Stempel',
  purchase: 'Kauf',
  tutorial: 'Tutorial',
  refund: 'Erstattung',
  chest: 'Truhe',
  task: 'Aufgabe',
};
export default {
  title: 'Schüler',
  async mount(host, ctx) {
    const result = await loadClassPupils(ctx.supabase, ctx.classId, mondayOf(new Date()));
    if (!ctx.alive()) return;
    if (!result.ok) {
      ctx.status(result.message, 'error');
      return;
    }
    const pupils = result.value.sort((a, b) => a.nickname.localeCompare(b.nickname, 'de'));
    host.innerHTML = `<div class="page-tools"><label>Spitzname suchen<input type="search" autocomplete="off"></label><label>Anzeige<select id="pupilFilter"><option value="">Alle</option><option value="tutorial">Tutorial offen</option><option value="inaktiv">Nicht aktiv</option></select></label></div><div class="pupils-layout"><section><div class="table-scroll"><table><thead><tr>${['Spitzname', 'Münzen', 'Grundstück', 'Quests diese Woche', 'Zuletzt aktiv', 'Aktionen'].map((s) => `<th scope="col">${s}</th>`).join('')}</tr></thead><tbody></tbody></table></div></section><aside class="pupil-detail" aria-label="Schülerdetails" hidden></aside></div>`;
    const tbody = host.querySelector('tbody')!,
      search = host.querySelector<HTMLInputElement>('input')!,
      filter = host.querySelector<HTMLSelectElement>('select')!,
      detail = host.querySelector<HTMLElement>('aside')!;
    filter.value = ctx.route.filter ?? '';
    const render = () => {
      const list = pupils.filter(
        (p) =>
          p.nickname.toLocaleLowerCase('de').includes(search.value.toLocaleLowerCase('de')) &&
          (!filter.value || (filter.value === 'tutorial' ? !!p.tutorialStep : !!inactiveHint(p, new Date()))),
      );
      tbody.innerHTML =
        list
          .map(
            (p) =>
              `<tr><th scope="row">${esc(p.nickname)}<small class="pupil-game-state">Level ${p.level ?? 1} · ${p.xp ?? 0} XP · Serie ${p.streak ?? 0}</small></th><td>${p.coins}</td><td>${esc(plotLabel(p))}</td><td>${esc(questsLabel(p))}</td><td>${esc(activeLabel(lastActive(p), new Date()))}${inactiveHint(p, new Date()) ? `<small class="activity-hint">${esc(inactiveHint(p, new Date())!)}</small>` : ''}</td><td class="pupil-actions"><button data-detail="${esc(p.id)}" aria-label="Details zu ${esc(p.nickname)}">Details</button><a class="teacher-link" target="_blank" rel="noopener" href="/?ansehen=${encodeURIComponent(p.id)}">Als Schüler ansehen</a></td></tr>`,
          )
          .join('') || '<tr><td colspan="6">Keine Schüler für diese Auswahl.</td></tr>';
      tbody
        .querySelectorAll<HTMLButtonElement>('[data-detail]')
        .forEach((b) => (b.onclick = () => ctx.go('schueler', b.dataset.detail, filter.value)));
    };
    search.oninput = render;
    filter.onchange = render;
    render();
    if (ctx.route.pupil) {
      const pupil = pupils.find((p) => p.id === ctx.route.pupil);
      if (!pupil) return;
      detail.hidden = false;
      detail.innerHTML = `<h2>${esc(pupil.nickname)}</h2><button class="detail-close">Details schließen</button><div class="detail-body">Lädt …</div>`;
      detail.querySelector<HTMLButtonElement>('button')!.onclick = () =>
        ctx.go('schueler', undefined, filter.value);
      const res = await loadPupilDetail(ctx.supabase, pupil.id);
      if (!ctx.alive()) return;
      detail.querySelector('.detail-body')!.innerHTML = res.ok
        ? detailHtml(res.value)
        : `<p class="error">${esc(res.message)}</p>`;
    }
  },
} satisfies TeacherPage;
function detailHtml(d: PupilDetail): string {
  const unavailable = '<p class="error">Dieser Teil ist nicht verfügbar.</p>';
  return `<p>${d.tutorial_step ? 'Tutorial: ' + esc(STEP_LABELS[d.tutorial_step]) : 'Tutorial abgeschlossen'}</p><h3>Auf dem Grundstück</h3>${Array.isArray(d.slots) ? `<ul>${d.slots.map((s) => `<li>${esc(({ house: 'Haus', garage: 'Garage', car: 'Auto' } as Record<string, string>)[s.slot] ?? s.slot.replace('deco_', 'Deko-Platz '))}: ${esc(s.name_de)}</li>`).join('') || '<li>Noch keine Gegenstände aufgestellt.</li>'}</ul>` : unavailable}
 <h3>Noch nicht aufgestellt</h3>${Array.isArray(d.unplaced) ? `<ul>${d.unplaced.map((s) => `<li>${s.qty} × ${esc(s.name_de)}</li>`).join('') || '<li>Keine unplatzierten Gegenstände.</li>'}</ul>` : unavailable}
 <h3>Quests diese Woche</h3>${Array.isArray(d.week) ? `<ul>${d.week.map((q) => `<li>${esc(q.day.slice(8) + '.' + q.day.slice(5, 7) + '.')}: ${q.solved ? (q.catch_up ? 'nachgeholt' : 'gelöst') : 'offen'} · ${q.attempts} Versuche</li>`).join('') || '<li>Keine Quests.</li>'}</ul>` : unavailable}
 <h3>Kontoauszug</h3>${Array.isArray(d.ledger) ? `<ol class="ledger-list">${d.ledger.map((l) => `<li><time>${esc(ledgerDate(l.at))}</time><strong>${signed(l.delta)}</strong><span>${esc(REASONS[l.reason] ?? l.reason)}${l.ref ? ' · ' + esc(l.ref) : ''}</span></li>`).join('') || '<li>Noch keine Buchungen.</li>'}</ol>` : unavailable}`;
}
