import { tr } from '../i18n';
/**
 * Pupil login: nickname + password. The nickname is turned into the login address
 * `<nickname>@lerndorf.local` (SPEC §4). Public sign-up is disabled in Supabase.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { loginEmail, nicknameError } from '../../../supabase/functions/admin-accounts/validate';

export const LOGIN_FAILED = tr('Spitzname oder Passwort stimmt nicht');

/** Returns null on success, or a message for the pupil in German. */
export async function signInPupil(
  supabase: SupabaseClient,
  nickname: string,
  password: string,
): Promise<string | null> {
  const nick = nickname.trim();
  // Do not even try to log in with a name that could never exist.
  if (nicknameError(nick)) return LOGIN_FAILED;
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(nick), password });
  return error ? LOGIN_FAILED : null;
}
