/**
 * Teacher data access. Reads use RLS (a teacher sees all rows). Changes go through RPCs
 * (SPEC §8) or the Edge Function admin-accounts. Nothing here writes tables directly.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface Pupil {
  id: string;
  nickname: string;
  coins: number;
  plotIndex: number | null;
}

export interface ClassFlags {
  shopOpen: boolean;
  buildOpen: boolean;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });

/** Teacher login: a real e-mail address and password, role checked after login. */
export async function signInTeacher(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<Result<string>> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return fail('E-Mail oder Passwort stimmt nicht');
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  const { data: profile } = uid
    ? await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
    : { data: null };
  if (profile?.role !== 'teacher') {
    await supabase.auth.signOut();
    return fail('Dieses Konto hat keine Lehrer-Rechte');
  }
  return { ok: true, value: uid as string };
}

export async function loadPupils(supabase: SupabaseClient, classId: string): Promise<Result<Pupil[]>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, coins, plot_index')
    .eq('class_id', classId)
    .eq('role', 'student')
    .order('nickname');
  if (error) return fail('Schülerliste konnte nicht geladen werden');
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      coins: r.coins,
      plotIndex: r.plot_index,
    })),
  };
}

export async function loadClassFlags(supabase: SupabaseClient, classId: string): Promise<Result<ClassFlags>> {
  const { data, error } = await supabase
    .from('classes')
    .select('shop_open, build_open')
    .eq('id', classId)
    .single();
  if (error || !data) return fail('Klasse nicht gefunden');
  return { ok: true, value: { shopOpen: data.shop_open, buildOpen: data.build_open } };
}

/** Pupils already stamped for this week (from the ledger, reason 'stamp'). */
export async function loadStampedIds(supabase: SupabaseClient, week: string): Promise<Result<Set<string>>> {
  const { data, error } = await supabase
    .from('coin_ledger')
    .select('player_id')
    .eq('reason', 'stamp')
    .eq('ref', week);
  if (error) return fail('Stempel konnten nicht geladen werden');
  return { ok: true, value: new Set((data ?? []).map((r) => r.player_id)) };
}

export async function bookStamps(
  supabase: SupabaseClient,
  classId: string,
  week: string,
  playerIds: string[],
): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('add_stamps', {
    p_class_id: classId,
    p_week: week,
    p_player_ids: playerIds,
  });
  if (error) return fail(error.message);
  return { ok: true, value: Number(data) };
}

export async function adjustCoins(
  supabase: SupabaseClient,
  playerId: string,
  delta: number,
  note: string,
): Promise<Result<number>> {
  const { data, error } = await supabase.rpc('adjust_coins', {
    p_player_id: playerId,
    p_delta: delta,
    p_note: note,
  });
  if (error) return fail(error.message);
  return { ok: true, value: Number(data) };
}

export async function setClassFlags(
  supabase: SupabaseClient,
  classId: string,
  flags: ClassFlags,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('set_class_flags', {
    p_class_id: classId,
    p_shop_open: flags.shopOpen,
    p_build_open: flags.buildOpen,
  });
  if (error) return fail(error.message);
  return { ok: true, value: true };
}

/** Calls the Edge Function admin-accounts. The body is one of its actions. */
export async function adminCall<T = unknown>(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Result<T>> {
  const { data, error } = await supabase.functions.invoke('admin-accounts', { body });
  if (error) return fail(error.message);
  const payload = data as { error?: string; details?: string[] } & T;
  if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
    const details = payload.details?.length ? `: ${payload.details.join(' · ')}` : '';
    return fail(`${payload.error}${details}`);
  }
  return { ok: true, value: payload };
}

/** True if the current session belongs to a teacher. */
export async function isTeacherSession(supabase: SupabaseClient): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  const { data } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
  return data?.role === 'teacher';
}
