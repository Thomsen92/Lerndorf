// @vitest-environment happy-dom
import { it, expect, vi } from 'vitest';
import { encodeLogin, decodeLogin, takeLoginFragment, loginUrl } from '../../src/auth/qrLogin';
import { renderLogin } from '../../src/ui/loginView';
import type { SupabaseClient } from '@supabase/supabase-js';
it('round trips special characters and erases even invalid login fragments', () => {
  const credentials = { nickname: 'anna', password: 'ä&+/#?秘密' };
  expect(decodeLogin('#login=' + encodeLogin(credentials.nickname, credentials.password))).toEqual(
    credentials,
  );
  expect(decodeLogin('#login=broken')).toBeNull();
  expect(loginUrl('https://example.org/?x=1#old', 'anna', 'pass')).toMatch(/^https:\/\/example.org\/#login=/);
  history.replaceState(null, '', '/#login=' + encodeLogin('anna', 'secret'));
  const replace = vi.spyOn(history, 'replaceState');
  expect(takeLoginFragment()).toEqual({ nickname: 'anna', password: 'secret' });
  expect(location.hash).toBe('');
  expect(replace).toHaveBeenCalled();
  replace.mockRestore();
});
it('signs in only through normal auth and leaves the password empty after failure', async () => {
  const signInWithPassword = vi.fn().mockResolvedValue({ error: { message: 'bad' } }),
    root = document.createElement('div');
  renderLogin(root, { auth: { signInWithPassword } } as unknown as SupabaseClient, vi.fn(), {
    nickname: 'anna',
    password: 'secret',
  });
  await new Promise((r) => setTimeout(r, 0));
  expect(signInWithPassword).toHaveBeenCalledWith({ email: 'anna@lerndorf.local', password: 'secret' });
  expect(root.querySelector<HTMLInputElement>('[name=nickname]')?.value).toBe('anna');
  expect(root.querySelector<HTMLInputElement>('[name=password]')?.value).toBe('');
  expect(root.textContent).toContain('Spitzname oder Passwort stimmt nicht');
});
