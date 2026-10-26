import type { SupabaseClient } from '@supabase/supabase-js';
import { isTeacherSession, signInTeacher } from './api';
import { esc } from '../ui/esc';
import { mountShell } from './shell';
let current: ReturnType<typeof mountShell> | null = null;
function startShell(root: HTMLElement, supabase: SupabaseClient): void {
  current?.dispose();
  current = mountShell(root, supabase, undefined, () => void renderTeacher(root, supabase));
}
export async function renderTeacher(root: HTMLElement, supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return renderTeacherLogin(root, supabase);
  // a pupil session must not see the teacher area (the data would be empty anyway)
  if (!(await isTeacherSession(supabase))) {
    await supabase.auth.signOut();
    return renderTeacherLogin(root, supabase, 'Dieses Konto hat keine Lehrer-Rechte');
  }
  return startShell(root, supabase);
}

function renderTeacherLogin(root: HTMLElement, supabase: SupabaseClient, notice?: string): void {
  root.innerHTML = `
    <main class="login">
      <h1>Lehrkraft</h1>
      <form id="teacherLogin" novalidate>
        <label>E-Mail
          <input name="email" type="email" autocomplete="username" required />
        </label>
        <label>Passwort
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <p id="err" class="error" role="alert"${notice ? '' : ' hidden'}>${esc(notice ?? '')}</p>
        <button type="submit" class="primary">Anmelden</button>
      </form>
    </main>`;
  const form = root.querySelector<HTMLFormElement>('#teacherLogin');
  const err = root.querySelector<HTMLParagraphElement>('#err');
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = new FormData(form);
    const res = await signInTeacher(supabase, String(d.get('email') ?? ''), String(d.get('password') ?? ''));
    if (!res.ok) {
      if (err) {
        err.textContent = res.message;
        err.hidden = false;
      }
      return;
    }
    void startShell(root, supabase);
  });
}
