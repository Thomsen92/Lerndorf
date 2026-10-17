/** Login screen for pupils. Plain German, large touch targets (SPEC §12). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { signInPupil } from '../auth/login';

export function renderLogin(root: HTMLElement, supabase: SupabaseClient, onLoggedIn: () => void): void {
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

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    submit.disabled = true;
    const message = await signInPupil(
      supabase,
      String(data.get('nickname') ?? ''),
      String(data.get('password') ?? ''),
    );
    submit.disabled = false;
    if (message) {
      error.textContent = message;
      error.hidden = false;
      return;
    }
    onLoggedIn();
  });
}
