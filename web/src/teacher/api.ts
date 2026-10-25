/**
 * Teacher data access. Reads use RLS (a teacher sees all rows). Changes go through RPCs
 * (SPEC §8) or the Edge Function admin-accounts. Nothing here writes tables directly.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { mondayOf, parseIsoDate, weekLabel } from './week';

export interface Pupil {
  xp?: number;
  level?: number;
  streak?: number;
  id: string;
  nickname: string;
  coins: number;
  plotIndex: number | null;
}

export interface ClassFlags {
  shopOpen: boolean;
  buildOpen: boolean;
  layoutSeed: number;
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
    .select('id, nickname, coins, plot_index, xp, level')
    .eq('class_id', classId)
    .eq('role', 'student')
    .order('nickname');
  if (error) return fail('Schülerliste konnte nicht geladen werden');
  const { data: streaks, error: streakError } = await supabase.from('streaks').select('player_id, current');
  if (streakError) return fail('Serien konnten nicht geladen werden');
  const byPlayer = new Map((streaks ?? []).map((s) => [s.player_id, s.current as number]));
  return {
    ok: true,
    value: (data ?? []).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      coins: r.coins,
      plotIndex: r.plot_index,
      xp: r.xp ?? 0,
      level: r.level ?? 1,
      streak: byPlayer.get(r.id) ?? 0,
    })),
  };
}

export async function loadClassFlags(supabase: SupabaseClient, classId: string): Promise<Result<ClassFlags>> {
  const { data, error } = await supabase
    .from('classes')
    .select('shop_open, build_open, layout_seed')
    .eq('id', classId)
    .single();
  if (error || !data) return fail('Klasse nicht gefunden');
  return {
    ok: true,
    value: { shopOpen: data.shop_open, buildOpen: data.build_open, layoutSeed: data.layout_seed },
  };
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
  flags: Pick<ClassFlags, 'shopOpen' | 'buildOpen'>,
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

/** Layout seed of a class (SPEC §10). A new seed moves every plot of the class. */
export async function setLayoutSeed(
  supabase: SupabaseClient,
  classId: string,
  seed: number,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('set_layout_seed', { p_class_id: classId, p_seed: seed });
  if (error) return fail(error.message);
  return { ok: true, value: true };
}

export interface TaskStat {
  taskId: string;
  prompt: string;
  answers: number;
  correct: number;
  share: number | null;
}

/** Share of correct answers per task of one week (SPEC §9, PLAN 3.6). */
export async function loadTaskStats(supabase: SupabaseClient, week: string): Promise<Result<TaskStat[]>> {
  const { data, error } = await supabase.rpc('task_stats', { p_week: week });
  if (error) return fail(error.message);
  return {
    ok: true,
    value: (data ?? []).map(
      (r: { task_id: string; prompt: string; answers: number; correct: number; share: string | null }) => ({
        taskId: r.task_id,
        prompt: r.prompt,
        answers: Number(r.answers),
        correct: Number(r.correct),
        share: r.share === null ? null : Number(r.share),
      }),
    ),
  };
}

export interface InstanceRules {
  stampReward: number;
  dailyTaskCap: number;
  maxAttempts: number;
  plotCols: number;
  plotRows: number;
  mapId: string;
  layoutSeed: number;
}

export interface ShopEntry {
  id: string;
  name: string;
  price: number;
  sold: boolean;
}

/** Rules, layout and shop switches of one instance (SPEC §1a). */
export async function loadInstance(
  supabase: SupabaseClient,
  classId: string,
): Promise<Result<{ rules: InstanceRules; maps: Array<{ id: string; name: string }>; shop: ShopEntry[] }>> {
  const [cls, maps, items, hidden] = await Promise.all([
    supabase
      .from('classes')
      .select('stamp_reward, daily_task_cap, max_attempts, plot_cols, plot_rows, map_id, layout_seed')
      .eq('id', classId)
      .single(),
    supabase.from('map_templates').select('id, name').order('id'),
    supabase.from('items').select('id, name_de, price').eq('kind', 'deco').eq('active', true).order('price'),
    supabase.from('class_items').select('item_id, enabled').eq('class_id', classId),
  ]);
  if (cls.error || !cls.data) return fail('Die Einstellungen der Klasse konnten nicht geladen werden');
  if (maps.error || items.error || hidden.error) return fail('Die Auswahl konnte nicht geladen werden');
  const soldOff = new Set((hidden.data ?? []).filter((h) => !h.enabled).map((h) => h.item_id));
  return {
    ok: true,
    value: {
      rules: {
        stampReward: cls.data.stamp_reward,
        dailyTaskCap: cls.data.daily_task_cap,
        maxAttempts: cls.data.max_attempts,
        plotCols: cls.data.plot_cols,
        plotRows: cls.data.plot_rows,
        mapId: cls.data.map_id,
        layoutSeed: cls.data.layout_seed,
      },
      maps: (maps.data ?? []).map((m) => ({ id: m.id, name: m.name })),
      shop: (items.data ?? []).map((i) => ({
        id: i.id,
        name: i.name_de,
        price: i.price,
        sold: !soldOff.has(i.id),
      })),
    },
  };
}

export async function saveRules(
  supabase: SupabaseClient,
  classId: string,
  r: InstanceRules,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('set_class_rules', {
    p_class_id: classId,
    p_stamp: r.stampReward,
    p_daily_cap: r.dailyTaskCap,
    p_max_attempts: r.maxAttempts,
    p_plot_cols: r.plotCols,
    p_plot_rows: r.plotRows,
  });
  if (error) return fail(error.message);
  return { ok: true, value: true };
}

export async function setItemSold(
  supabase: SupabaseClient,
  classId: string,
  itemId: string,
  sold: boolean,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('set_item_sold', {
    p_class_id: classId,
    p_item_id: itemId,
    p_sold: sold,
  });
  if (error) return fail(error.message);
  return { ok: true, value: true };
}

/** Template and seed of one instance in one step (set_layout). */
export async function saveLayout(
  supabase: SupabaseClient,
  classId: string,
  mapId: string,
  seed: number,
): Promise<Result<true>> {
  const { error } = await supabase.rpc('set_layout', { p_class_id: classId, p_map_id: mapId, p_seed: seed });
  if (error) return fail(error.message);
  return { ok: true, value: true };
}

// ---- Daily quests: status, warning, preview (teacher only) ----

export interface QuestImport {
  week: string;
  ok: boolean;
  holiday: boolean;
  errors: string[];
  questCount: number;
  importedAt: string;
}

export interface QuestStatus {
  today: string;
  coveredUntil: string | null;
  todayMissing: boolean;
  tomorrowMissing: boolean;
  imports: QuestImport[];
}

export interface QuestPreview {
  key: string;
  day: string;
  slot: number;
  type: string;
  prompt: string;
  data: Record<string, unknown>;
  hint: string;
  reward: number;
  solution: unknown;
}

export async function loadQuestStatus(supabase: SupabaseClient): Promise<Result<QuestStatus>> {
  const { data, error } = await supabase.rpc('quest_status');
  if (error || !data) return fail('Der Quest-Status konnte nicht geladen werden');
  const imports = (data.imports ?? []) as Array<Record<string, unknown>>;
  return {
    ok: true,
    value: {
      today: String(data.today),
      coveredUntil: data.covered_until ?? null,
      todayMissing: Boolean(data.today_missing),
      tomorrowMissing: Boolean(data.tomorrow_missing),
      imports: imports.map((i) => ({
        week: String(i.week),
        ok: Boolean(i.ok),
        holiday: Boolean(i.holiday),
        errors: ((i.errors ?? []) as unknown[]).map(String),
        questCount: Number(i.quest_count ?? 0),
        importedAt: String(i.imported_at ?? ''),
      })),
    },
  };
}

export async function loadQuestPreview(
  supabase: SupabaseClient,
  from: string,
  days: number,
): Promise<Result<QuestPreview[]>> {
  const { data, error } = await supabase.rpc('teacher_quest_preview', { p_from: from, p_days: days });
  if (error) return fail('Die Vorschau konnte nicht geladen werden');
  return {
    ok: true,
    value: ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      key: String(r.key),
      day: String(r.day),
      slot: Number(r.slot),
      type: String(r.type),
      prompt: String(r.prompt),
      data: (r.data ?? {}) as Record<string, unknown>,
      hint: String(r.hint ?? ''),
      reward: Number(r.reward),
      solution: r.solution,
    })),
  };
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** "Mo 09.11." for an ISO date; unparsable input is returned unchanged. */
export function dayLabel(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${WEEKDAYS[d.getUTCDay()]} ${dd}.${mm}.`;
}

/**
 * Teacher notices for the quest status, in this order: warn lines, the ok line, one error per
 * failed import, one line per holiday import. Without coverage (coveredUntil null) there is no
 * ok line. dayLabel already ends in a dot, so the ok sentence gets no extra one.
 */
export function questNotices(s: QuestStatus): Array<{ level: 'ok' | 'warn' | 'error'; text: string }> {
  const out: Array<{ level: 'ok' | 'warn' | 'error'; text: string }> = [];
  if (s.todayMissing) {
    const monday = mondayOf(s.today) ?? s.today;
    out.push({
      level: 'warn',
      text: `Heute gibt es keine Daily Quests. Bitte das Quest-Paket für die ${weekLabel(monday)} hochladen.`,
    });
  }
  if (s.tomorrowMissing) out.push({ level: 'warn', text: 'Morgen gibt es noch keine Daily Quests.' });
  if (s.coveredUntil)
    out.push({ level: 'ok', text: `Daily Quests vorhanden bis ${dayLabel(s.coveredUntil)}` });
  for (const i of s.imports) {
    if (!i.ok) {
      out.push({
        level: 'error',
        text: `Das Quest-Paket für die ${weekLabel(i.week)} hat Fehler und wurde nicht übernommen: ${i.errors.join('; ')}`,
      });
    }
  }
  for (const i of s.imports) {
    if (i.ok && i.holiday) out.push({ level: 'ok', text: `${weekLabel(i.week)}: Ferien, keine Quests.` });
  }
  return out;
}

/**
 * A quest solution in plain words. Text as it is; gap alternatives "a / b"; pairs "left → right";
 * other lists "a · b". Listening quests are shown by their answer mode (choice or gap).
 */
export function solutionText(solution: unknown, type?: string, data?: Record<string, unknown>): string {
  if (solution === null || solution === undefined) return '–';
  const kind = type === 'listening' ? String(data?.mode ?? '') : type;
  if (typeof solution === 'string') return solution;
  if (Array.isArray(solution)) {
    if (kind === 'gap') return solution.map(String).join(' / ');
    return solution.map((x) => (Array.isArray(x) ? x.join(' → ') : String(x))).join(' · ');
  }
  return JSON.stringify(solution);
}
