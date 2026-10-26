/** Login screen for pupils. Plain German, large touch targets (SPEC §12). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInPupil } from '../auth/login';
import type { LoginCredentials } from '../auth/qrLogin';

export function renderLogin(root: HTMLElement, supabase: SupabaseClient, onLoggedIn: () => void, credentials?: LoginCredentials): void {
  root.innerHTML = `
    <main class="login">
      <h1>Lerndorf</h1>
      <form id="loginForm" novalidate>
        <label>Spitzname
          <input name="nickname" autocomplete="username" autocapitalize="off" spellcheck="false" required />
        </label>
        <label>Passwort
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <p id="loginError" class="error" role="alert" hidden></p>
        <button type="submit" class="primary">Los geht’s</button>
      </form>
    </main>
  `;

  const form = root.querySelector<HTMLFormElement>('#loginForm');
  const error = root.querySelector<HTMLParagraphElement>('#loginError');
  const submit = form?.querySelector<HTMLButtonElement>('button');
  if (!form || !error || !submit) return;

  const login = async (nickname: string, password: string): Promise<void> => {
    if (submit.disabled) return;
    submit.disabled = true;
    let message: string | null;
    try { message = await signInPupil(supabase, nickname, password); }
    catch { message = 'Keine Verbindung. Bitte noch einmal versuchen.'; }
    submit.disabled = false;
    if (message) {
      error.textContent = message;
      error.hidden = false;
      return;
    }
    onLoggedIn();
  };
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const data = new FormData(form);
    void login(String(data.get('nickname') ?? ''), String(data.get('password') ?? ''));
  });
  if (credentials) {
    form.querySelector<HTMLInputElement>('[name=nickname]')!.value = credentials.nickname;
    void login(credentials.nickname, credentials.password);
  }
}
