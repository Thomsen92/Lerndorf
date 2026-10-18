// Edge Function admin-accounts (SPEC §4, §8). Only teachers may call it.
// The service role key lives in the function's secrets, never in the browser or the repo.
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  loginEmail,
  nextFreePlot,
  nicknameError,
  parseBulkLines,
  passwordError,
  isClassId,
  type ClassId,
} from './validate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

type Action =
  | { action: 'create'; nickname: string; password: string; class_id: string }
  | { action: 'create_bulk'; text: string }
  | { action: 'reset_password'; user_id: string; password: string }
  | { action: 'move_class'; user_id: string; class_id: string }
  | { action: 'delete'; user_id: string };

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  // 1. who is calling? Their own token, checked by Supabase Auth.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!token) return json(401, { error: 'not logged in' });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: me, error: meErr } = await userClient.auth.getUser(token);
  if (meErr || !me.user) return json(401, { error: 'not logged in' });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 2. is the caller a teacher?
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', me.user.id)
    .maybeSingle();
  if (callerProfile?.role !== 'teacher') return json(403, { error: 'teacher role required' });

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return json(400, { error: 'invalid JSON' });
  }

  switch (body.action) {
    case 'create':
      return createOne(admin, body.nickname, body.password, body.class_id);
    case 'create_bulk':
      return createBulk(admin, body.text);
    case 'reset_password':
      return resetPassword(admin, body.user_id, body.password);
    case 'move_class':
      return moveClass(admin, body.user_id, body.class_id);
    case 'delete':
      return deleteAccount(admin, body.user_id);
    default:
      return json(400, { error: 'unknown action' });
  }
});

async function createOne(
  admin: ReturnType<typeof createClient>,
  nickname: string,
  password: string,
  classId: string,
): Promise<Response> {
  const nErr = nicknameError(nickname);
  if (nErr) return json(400, { error: nErr });
  const pErr = passwordError(password);
  if (pErr) return json(400, { error: pErr });
  if (!isClassId(classId)) return json(400, { error: 'Klasse muss 8a oder 8b sein' });

  // a new pupil has no plot yet: the pupil chooses a free one (RPC claim_plot, SPEC §10.5)
  const { data: created, error } = await admin.auth.admin.createUser({
    email: loginEmail(nickname),
    password,
    email_confirm: true,
  });
  if (error || !created.user)
    return json(409, {
      error: `Konto konnte nicht angelegt werden (Spitzname schon vergeben?)`,
    });

  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    nickname,
    role: 'student',
    class_id: classId,
    plot_index: null,
  });
  if (profErr) {
    // roll back the auth user so that no account exists without a profile
    await admin.auth.admin.deleteUser(created.user.id);
    return json(409, { error: 'Spitzname schon vergeben' });
  }
  return json(200, { ok: true, user_id: created.user.id, plot_index: null });
}

async function createBulk(admin: ReturnType<typeof createClient>, text: string): Promise<Response> {
  const { rows, errors } = parseBulkLines(text);
  if (errors.length) return json(400, { error: 'Liste enthält Fehler', details: errors });
  const results: Array<{ nickname: string; ok: boolean; error?: string }> = [];
  for (const r of rows) {
    const res = await createOne(admin, r.nickname, r.password, r.classId);
    const body = await res.json();
    results.push({
      nickname: r.nickname,
      ok: res.status === 200,
      error: body.error,
    });
  }
  return json(200, { ok: results.every((r) => r.ok), results });
}

async function resetPassword(
  admin: ReturnType<typeof createClient>,
  userId: string,
  password: string,
): Promise<Response> {
  const pErr = passwordError(password);
  if (pErr) return json(400, { error: pErr });
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return json(400, { error: error.message });
  return json(200, { ok: true });
}

async function moveClass(
  admin: ReturnType<typeof createClient>,
  userId: string,
  classId: string,
): Promise<Response> {
  if (!isClassId(classId)) return json(400, { error: 'Klasse muss 8a oder 8b sein' });
  const plot = await nextPlotIndex(admin, classId);
  // SPEC §1a: placements go back into the inventory; coins, inventory and avatar move along
  const { error: delErr } = await admin.from('placements').delete().eq('player_id', userId);
  if (delErr) return json(400, { error: delErr.message });
  const { error } = await admin
    .from('profiles')
    .update({ class_id: classId, plot_index: plot })
    .eq('id', userId)
    .eq('role', 'student');
  if (error) return json(400, { error: error.message });
  return json(200, { ok: true, plot_index: plot });
}

async function deleteAccount(admin: ReturnType<typeof createClient>, userId: string): Promise<Response> {
  // profiles, inventory, placements, ledger rows go with the auth user (on delete cascade)
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return json(400, { error: error.message });
  return json(200, { ok: true });
}

async function nextPlotIndex(admin: ReturnType<typeof createClient>, classId: ClassId): Promise<number> {
  const { data } = await admin
    .from('profiles')
    .select('plot_index')
    .eq('class_id', classId)
    .eq('role', 'student');
  const used = (data ?? [])
    .map((r: { plot_index: number | null }) => r.plot_index)
    .filter((x: number | null): x is number => x !== null);
  return nextFreePlot(used);
}
