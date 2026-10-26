import type { TeacherPage } from '../context';
import { loadClassPupils, adjustCoins, adjustCoinsMany, loadStampedIds, bookStamps } from '../api';
import { QUICK_AMOUNTS, MULTI_AMOUNTS, REASONS, UNDO_SECONDS, signed, bookingNote } from '../rules';
import { mondayOf } from '../activity';
import { mondayOf as normalizeMonday, weekLabel } from '../week';
import { esc } from '../../ui/esc';
let cleanup = () => {};
const page: TeacherPage = {
  title: 'Münzen & Stempel',
  unmount() {
    cleanup();
  },
  async mount(host, ctx) {
    const week = mondayOf(new Date()),
      res = await loadClassPupils(ctx.supabase, ctx.classId, week);
    if (!ctx.alive()) return;
    if (!res.ok) {
      ctx.status(res.message, 'error');
      return;
    }
    const pupils = res.value.sort((a, b) => a.nickname.localeCompare(b.nickname, 'de')),
      selected = new Set<string>(),
      pending = new Set<string>();
    let reason = '',
      timer: ReturnType<typeof setTimeout> | undefined,
      undo: { ids: string[]; delta: number; note: string; until: number } | null = null,
      disposed = false;
    const resize = () => host.classList.toggle('coins--narrow', window.innerWidth < 1024);
    window.addEventListener('resize', resize);
    resize();
    cleanup = () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('resize', resize);
    };
    const alive = () => !disposed && ctx.alive();
    host.innerHTML = `<section class="quick-coins"><h2>Schnell buchen</h2><div class="reason-group" role="group" aria-label="Grund">${['', ...REASONS].map((r) => `<button class="btn-touch" type="button" data-reason="${r}" aria-pressed="${!r}">${r || 'kein Grund'}</button>`).join('')}</div>
 <div class="booking-feedback" role="status"><span></span><button type="button" data-undo hidden>Rückgängig</button></div><p class="booking-error error" role="alert"></p>
 <label class="select-all"><input type="checkbox" data-all> alle</label><div class="multi-bar" hidden><strong></strong>${MULTI_AMOUNTS.map((n) => `<button type="button" class="btn-touch" data-delta="${n}">${signed(n)}</button>`).join('')}</div>
 <div class="coin-rows">${pupils.map((p) => `<article class="coin-row" data-pupil="${esc(p.id)}"><label><input type="checkbox" data-mark="${esc(p.id)}" aria-label="${esc(p.nickname)} markieren"><strong>${esc(p.nickname)}</strong></label><div class="coin-balance"><output>${p.coins}</output> <span>Münzen</span></div><div class="quick-buttons">${QUICK_AMOUNTS.map((n) => `<button class="btn-touch" type="button" data-delta="${n}" aria-label="${Math.abs(n)} Münzen ${n < 0 ? 'von' : 'zu'} ${esc(p.nickname)} ${n < 0 ? 'abziehen' : 'hinzufügen'}">${signed(n)}</button>`).join('')}</div></article>`).join('') || '<p>Noch keine Schülerkonten.</p>'}</div></section>
 <section><h2>Freie Korrektur</h2><form class="row" id="coinForm"><label>Schüler<select name="pupil">${pupils.map((p) => `<option value="${esc(p.id)}">${esc(p.nickname)}</option>`).join('')}</select></label><label>Betrag<input name="delta" type="number" step="1" required></label><label>Notiz (Pflicht)<input name="note" required maxlength="200"></label><button type="submit">Buchen</button></form></section>
 <section><h2>Stempel buchen</h2><form id="stampForm"><label>Woche (Montag) <input type="date" id="week" value="${week}"></label><div class="checklist">${pupils.map((p) => `<label><input type="checkbox" name="stamp" value="${esc(p.id)}">${esc(p.nickname)}</label>`).join('')}</div><button type="submit" class="primary">Stempel buchen</button><p class="stamp-status" role="status"></p></form></section>`;
    const feedback = host.querySelector<HTMLElement>('.booking-feedback span')!,
      error = host.querySelector<HTMLElement>('.booking-error')!,
      undoButton = host.querySelector<HTMLButtonElement>('[data-undo]')!,
      multi = host.querySelector<HTMLElement>('.multi-bar')!,
      all = host.querySelector<HTMLInputElement>('[data-all]')!;
    const rows = new Map(
      [...host.querySelectorAll<HTMLElement>('[data-pupil]')].map((r) => [r.dataset.pupil!, r]),
    );
    const update = () => {
      for (const p of pupils) {
        const row = rows.get(p.id)!;
        row.querySelector('output')!.textContent = String(p.coins);
        row
          .querySelectorAll<HTMLButtonElement>('[data-delta]')
          .forEach((b) => (b.disabled = pending.has(p.id) || p.coins + Number(b.dataset.delta) < 0));
      }
      multi.hidden = selected.size === 0;
      multi.querySelector('strong')!.textContent = `Für ${selected.size} markierte:`;
      multi.querySelectorAll<HTMLButtonElement>('button').forEach((b) => (b.disabled = pending.size > 0));
      all.checked = pupils.length > 0 && selected.size === pupils.length;
      all.indeterminate = selected.size > 0 && selected.size < pupils.length;
    };
    const reload = async () => {
      const r = await loadClassPupils(ctx.supabase, ctx.classId, week);
      if (!alive()) return;
      if (r.ok) {
        for (const p of pupils) {
          const latest = r.value.find((x) => x.id === p.id);
          if (latest) p.coins = latest.coins;
        }
      } else error.textContent = 'Buchung gespeichert. Münzstände konnten nicht neu geladen werden.';
    };
    const book = async (ids: string[], delta: number, note: string, isUndo = false) => {
      if (!ids.length || ids.some((id) => pending.has(id))) return;
      const bookingReason = reason;
      ids.forEach((id) => pending.add(id));
      update();
      error.textContent = '';
      undoButton.disabled = true;
      try {
        const result =
          ids.length === 1
            ? await adjustCoins(ctx.supabase, ids[0], delta, note)
            : await adjustCoinsMany(ctx.supabase, ids, delta, note);
        if (!alive()) return;
        if (!result.ok) {
          error.textContent = result.message;
          return;
        }
        if (ids.length === 1) pupils.find((p) => p.id === ids[0])!.coins = result.value;
        else await reload();
        if (!alive()) return;
        clearTimeout(timer);
        if (isUndo) {
          feedback.textContent = 'Buchung rückgängig gemacht.';
          undo = null;
          undoButton.hidden = true;
        } else {
          const name =
            ids.length === 1 ? pupils.find((p) => p.id === ids[0])!.nickname : `${ids.length} Schüler`;
          feedback.textContent = `${signed(delta)} Münzen für ${name}${bookingReason ? ' (' + bookingReason + ')' : ''}`;
          undo = { ids: [...ids], delta, note, until: Date.now() + UNDO_SECONDS * 1000 };
          undoButton.hidden = false;
          timer = setTimeout(() => {
            undo = null;
            undoButton.hidden = true;
          }, UNDO_SECONDS * 1000);
        }
      } catch {
        if (alive()) error.textContent = 'Keine Verbindung. Bitte noch einmal versuchen.';
      } finally {
        ids.forEach((id) => pending.delete(id));
        if (alive()) {
          update();
          undoButton.disabled = false;
        }
      }
    };
    undoButton.onclick = () => {
      if (undo && Date.now() < undo.until) void book(undo.ids, -undo.delta, `Rückgängig: ${undo.note}`, true);
    };
    host.querySelectorAll<HTMLButtonElement>('[data-reason]').forEach(
      (b) =>
        (b.onclick = () => {
          reason = b.dataset.reason!;
          host
            .querySelectorAll<HTMLElement>('[data-reason]')
            .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        }),
    );
    host.querySelectorAll<HTMLInputElement>('[data-mark]').forEach(
      (cb) =>
        (cb.onchange = () => {
          if (cb.checked) selected.add(cb.dataset.mark!);
          else selected.delete(cb.dataset.mark!);
          update();
        }),
    );
    all.onchange = () => {
      host.querySelectorAll<HTMLInputElement>('[data-mark]').forEach((cb) => {
        cb.checked = all.checked;
        if (cb.checked) selected.add(cb.dataset.mark!);
        else selected.delete(cb.dataset.mark!);
      });
      update();
    };
    for (const [id, row] of rows)
      row.querySelectorAll<HTMLButtonElement>('[data-delta]').forEach(
        (b) =>
          (b.onclick = () => {
            const n = Number(b.dataset.delta);
            void book([id], n, bookingNote(n, reason));
          }),
      );
    multi.querySelectorAll<HTMLButtonElement>('[data-delta]').forEach(
      (b) =>
        (b.onclick = () => {
          const n = Number(b.dataset.delta);
          void book([...selected], n, bookingNote(n, reason));
        }),
    );
    const correction = host.querySelector<HTMLFormElement>('#coinForm')!;
    correction.onsubmit = (e) => {
      e.preventDefault();
      const d = new FormData(correction),
        delta = Number(d.get('delta')),
        note = String(d.get('note') ?? '').trim();
      if (!Number.isInteger(delta) || !delta || !note) {
        error.textContent = 'Bitte eine ganze Zahl ungleich 0 und eine Notiz eingeben.';
        return;
      }
      void book([String(d.get('pupil'))], delta, note);
    };
    const stamps = host.querySelector<HTMLFormElement>('#stampForm')!,
      date = host.querySelector<HTMLInputElement>('#week')!,
      stampStatus = host.querySelector<HTMLElement>('.stamp-status')!;
    let stampVersion = 0,
      stampPending = false;
    const refreshStamps = async () => {
      const version = ++stampVersion,
        r = await loadStampedIds(ctx.supabase, date.value);
      if (!alive() || version !== stampVersion) return;
      if (!r.ok) {
        stampStatus.textContent = r.message;
        stamps.querySelectorAll<HTMLInputElement>('input[name=stamp]').forEach((cb) => (cb.disabled = true));
        return;
      }
      stamps.querySelectorAll<HTMLInputElement>('input[name=stamp]').forEach((cb) => {
        cb.disabled = r.value.has(cb.value);
        cb.checked = false;
        cb.closest('label')?.classList.toggle('done', cb.disabled);
      });
    };
    date.onchange = () => {
      const value = normalizeMonday(date.value);
      if (value) {
        date.value = value;
        void refreshStamps();
      }
    };
    stamps.onsubmit = async (e) => {
      e.preventDefault();
      if (stampPending) return;
      const ids = [
        ...stamps.querySelectorAll<HTMLInputElement>('input[name=stamp]:checked:not(:disabled)'),
      ].map((c) => c.value);
      if (!ids.length) {
        stampStatus.textContent = 'Bitte mindestens einen Namen anhaken';
        return;
      }
      stampPending = true;
      const b = stamps.querySelector<HTMLButtonElement>('button')!;
      b.disabled = true;
      date.disabled = true;
      try {
        const r = await bookStamps(ctx.supabase, ctx.classId, date.value, ids);
        if (!alive()) return;
        stampStatus.textContent = r.ok ? `${r.value} Stempel gebucht (${weekLabel(date.value)})` : r.message;
        if (r.ok) {
          await refreshStamps();
          await reload();
          update();
        }
      } catch {
        if (alive()) stampStatus.textContent = 'Keine Verbindung. Bitte noch einmal versuchen.';
      } finally {
        stampPending = false;
        if (alive()) {
          b.disabled = false;
          date.disabled = false;
        }
      }
    };
    update();
    void refreshStamps();
  },
};
export default page;
