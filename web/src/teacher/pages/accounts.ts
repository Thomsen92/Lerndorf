import type { TeacherPage } from '../context';
import { adminCall, loadPupils, type Pupil } from '../api';
import type { ClassId } from '../router';
import { esc } from '../../ui/esc';
import { sessionCards as createdCards, rememberCard, forgetCard, renderCards as cardSheet } from '../cards';
export default {
  title: 'Konten',
  unmount() {
    document.querySelectorAll('.cards').forEach((c) => c.remove());
  },
  async mount(root, ctx) {
    const supabase = ctx.supabase,
      cls = ctx.classId;
    const status = (text: string, error = false) => ctx.status(text, error ? 'error' : 'ok');
    const drawClass = () => ctx.refresh();
    const res = await loadPupils(supabase, cls);
    if (!ctx.alive()) return;
    if (!res.ok) {
      status(res.message, true);
      return;
    }
    root.innerHTML = accountSection(res.value, cls);
    const wireAccounts = (list: Pupil[], cls: ClassId): void => {
      const single = root.querySelector<HTMLFormElement>('#singleForm');
      single?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(single);
        const nickname = String(d.get('nickname') ?? '').trim();
        const password = String(d.get('password') ?? '');
        const res = await adminCall(supabase, { action: 'create', nickname, password, class_id: cls });
        if (!ctx.alive()) return;
        if (!res.ok) return status(res.message, true);
        rememberCard({ nickname, password, classId: cls });
        single.reset();
        status(`Konto „${nickname}“ angelegt`);
        void drawClass();
      });

      const bulk = root.querySelector<HTMLFormElement>('#bulkForm');
      bulk?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const text = String(new FormData(bulk).get('list') ?? '');
        const res = await adminCall<{ results: Array<{ nickname: string; ok: boolean; error?: string }> }>(
          supabase,
          {
            action: 'create_bulk',
            text,
          },
        );
        if (!ctx.alive()) return;
        if (!res.ok) return status(res.message, true);
        const failed = res.value.results.filter((r) => !r.ok);
        // remember the passwords of the ones that worked, for the cards
        const lines = text.split(/\r?\n/).map((l) => l.split(';').map((p) => p.trim()));
        for (const [nick, pw, c] of lines) {
          if (nick && pw && c && res.value.results.some((r) => r.nickname === nick && r.ok)) {
            rememberCard({ nickname: nick, password: pw, classId: c });
          }
        }
        status(
          failed.length
            ? `${res.value.results.length - failed.length} Konten angelegt, ${failed.length} fehlgeschlagen: ${failed
                .map((f) => `${f.nickname} (${f.error ?? 'Fehler'})`)
                .join(', ')}`
            : `${res.value.results.length} Konten angelegt`,
          failed.length > 0,
        );
        void drawClass();
      });

      root.querySelector<HTMLButtonElement>('#printCards')?.addEventListener('click', () => {
        renderCards();
        window.print();
      });

      const reset = root.querySelector<HTMLFormElement>('#resetForm');
      reset?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(reset);
        const res = await adminCall(supabase, {
          action: 'reset_password',
          user_id: String(d.get('pupil')),
          password: String(d.get('password') ?? ''),
        });
        if (!ctx.alive()) return;
        if (!res.ok) return status(res.message, true);
        const pupil = list.find((p) => p.id === String(d.get('pupil')));
        if (pupil)
          rememberCard({ nickname: pupil.nickname, password: String(d.get('password')), classId: cls });
        reset.reset();
        status('Passwort neu gesetzt');
      });

      const del = root.querySelector<HTMLFormElement>('#deleteForm');
      del?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const d = new FormData(del);
        if (!d.get('sure')) return status('Bitte das Kästchen „Ich bin sicher“ anhaken', true);
        const pupil = list.find((p) => p.id === String(d.get('pupil')));
        const res = await adminCall(supabase, { action: 'delete', user_id: String(d.get('pupil')) });
        if (!ctx.alive()) return;
        if (!res.ok) return status(res.message, true);
        if (pupil) forgetCard(pupil.nickname);
        status(`Konto „${pupil?.nickname ?? ''}“ gelöscht`);
        void drawClass();
      });
    };

    const renderCards = (): void => {
      document.querySelectorAll('.cards').forEach((c) => c.remove());
      const cards = cardSheet(createdCards, new URL('/', location.href).href);
      document.body.append(cards);
      window.addEventListener('afterprint', () => cards.remove(), { once: true });
    };
    wireAccounts(res.value, cls);
  },
} satisfies TeacherPage;
function accountSection(list: Pupil[], cls: ClassId): string {
  const options = list.map((p) => `<option value="${p.id}">${esc(p.nickname)}</option>`).join('');
  return `<section><h2>Konten</h2>
    <h3>Einzeln anlegen (Klasse ${cls})</h3>
    <form id="singleForm" class="row">
      <input name="nickname" placeholder="Spitzname" required />
      <input name="password" placeholder="Passwort (min. 6)" required />
      <button type="submit">Anlegen</button>
    </form>
    <h3>Liste anlegen</h3>
    <p class="hint">Eine Zeile pro Schüler: <code>Spitzname;Passwort;Klasse</code></p>
    <form id="bulkForm">
      <textarea name="list" rows="6" placeholder="anna;hund42;8a"></textarea>
      <button type="submit">Liste anlegen</button>
    </form>
    <h3>Zugangskärtchen</h3>
    <p class="hint">Passwörter sind nur direkt nach dem Anlegen oder Zurücksetzen bekannt. Die Karten gelten für diese Sitzung.</p>
    <button type="button" id="printCards">Karten drucken</button>
    <h3>Passwort zurücksetzen</h3>
    <form id="resetForm" class="row">
      <select name="pupil" required>${options}</select>
      <input name="password" placeholder="neues Passwort" required />
      <button type="submit">Setzen</button>
    </form>
    <h3>Konto löschen</h3>
    <form id="deleteForm" class="row">
      <select name="pupil" required>${options}</select>
      <label><input type="checkbox" name="sure" /> Ich bin sicher</label>
      <button type="submit" class="danger">Löschen</button>
    </form></section>`;
}
