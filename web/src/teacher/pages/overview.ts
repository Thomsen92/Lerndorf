import type { TeacherPage } from '../context';
import { loadClassPupils, loadClassBoard, loadQuestStatus, questNotices, setClassNotice } from '../api';
import { mondayOf, inactiveHint, berlinDate, addDays } from '../activity';
import { NOTICE_DAYS, NOTICE_LIMIT } from '../rules';
import { esc } from '../../ui/esc';
export default {
  title: 'Übersicht',
  async mount(host, ctx) {
    const settle = <T>(p: Promise<T>) => p.catch(() => ({ ok: false as const, message: 'nicht verfügbar' }));
    const [pupils, board, quests] = await Promise.all([
      settle(loadClassPupils(ctx.supabase, ctx.classId, mondayOf(new Date()))),
      settle(loadClassBoard(ctx.supabase, ctx.classId)),
      settle(loadQuestStatus(ctx.supabase)),
    ]);
    if (!ctx.alive()) return;
    const total = pupils.ok ? pupils.value.length : null,
      unfinished = pupils.ok ? pupils.value.filter((p) => p.tutorialStep).length : null,
      inactive = pupils.ok ? pupils.value.filter((p) => inactiveHint(p, new Date())).length : null;
    const tile = (label: string, n: number | null, filter?: string) =>
      `<article class="overview-tile"><p>${label}</p><strong>${n ?? 'nicht verfügbar'}</strong>${filter ? `<button data-filter="${filter}">Schüler anzeigen</button>` : ''}</article>`;
    host.innerHTML = `<div class="overview-grid">${tile('Schüler', total)}${tile('Tutorial noch nicht fertig', unfinished, 'tutorial')}${tile('Nicht aktiv seit 5 Tagen oder mehr', inactive, 'inaktiv')}<article class="overview-tile"><p>Stempel diese Woche</p><strong>${board.ok ? `${board.value.stampsWeek} von ${total ?? '–'}` : 'nicht verfügbar'}</strong></article></div>
 <section><div class="section-head"><h2>Für die Klasse</h2><button data-board class="primary">Tafelmodus</button></div><h3>Daily Quests</h3>${
   quests.ok
     ? `<ul class="notices">${
         questNotices(quests.value)
           .map((n) => `<li class="notice notice-${n.level}">${esc(n.text)}</li>`)
           .join('') || '<li>Keine Meldungen.</li>'
       }</ul>`
     : '<p>nicht verfügbar</p>'
 }<button data-quests>Daily Quests öffnen</button></section>
 <section><h2>Nachricht ins Dorf</h2><p class="hint">Eine kurze Nachricht für alle Schüler deiner Klasse.</p><form class="notice-editor"><label for="classMessage">Nachricht</label><textarea id="classMessage" rows="3" maxlength="140">${esc(board.ok ? (board.value.notice ?? '') : '')}</textarea><div class="notice-meta"><output aria-live="polite"></output><label>gültig bis <input type="date" value="${addDays(berlinDate(new Date()), NOTICE_DAYS)}" required></label></div><div class="row"><button type="submit" class="primary">Veröffentlichen</button><button type="button" data-remove ${board.ok && board.value.notice ? '' : 'hidden'}>Entfernen</button></div></form></section>`;
    host
      .querySelectorAll<HTMLButtonElement>('[data-filter]')
      .forEach((b) => (b.onclick = () => ctx.go('schueler', undefined, b.dataset.filter)));
    host.querySelector<HTMLButtonElement>('[data-board]')!.onclick = () => ctx.go('tafel');
    host.querySelector<HTMLButtonElement>('[data-quests]')!.onclick = () => ctx.go('quests');
    const form = host.querySelector<HTMLFormElement>('form')!,
      text = host.querySelector('textarea')!,
      publish = form.querySelector<HTMLButtonElement>('[type=submit]')!,
      remove = form.querySelector<HTMLButtonElement>('[data-remove]')!;
    let pending = false;
    const validate = () => {
      form.querySelector('output')!.textContent = `${text.value.length}/${NOTICE_LIMIT}`;
      publish.disabled = pending || !text.value.trim() || text.value.length > NOTICE_LIMIT;
      remove.disabled = pending;
    };
    text.oninput = validate;
    validate();
    const save = async (value: string | null) => {
      if (pending) return;
      pending = true;
      validate();
      try {
        const r = await setClassNotice(
          ctx.supabase,
          ctx.classId,
          value,
          value ? form.querySelector('input')!.value : null,
        );
        if (!ctx.alive()) return;
        ctx.status(
          r.ok ? (value ? 'Nachricht veröffentlicht.' : 'Nachricht entfernt.') : r.message,
          r.ok ? 'ok' : 'error',
        );
        if (r.ok) {
          remove.hidden = !value;
          if (!value) text.value = '';
        }
      } finally {
        pending = false;
        if (ctx.alive()) validate();
      }
    };
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!publish.disabled) void save(text.value.trim());
    };
    remove.onclick = () => void save(null);
  },
} satisfies TeacherPage;
