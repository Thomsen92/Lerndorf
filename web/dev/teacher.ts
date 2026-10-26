/** Entirely local teacher workspace fixture. No real accounts, credentials or network writes. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { mountShell } from '../src/teacher/shell';
import { mondayOf, berlinDate, addDays } from '../src/teacher/activity';
import { mountVillage } from '../src/ui/villageView';
const params = new URLSearchParams(location.search),
  holiday = params.has('holiday'),
  today = berlinDate(new Date()),
  week = mondayOf(new Date());
const names = [
  'Fuchs',
  'Biber',
  'Dachs',
  'Elster',
  'Igel',
  'Luchs',
  'Otter',
  'Rabe',
  'Reh',
  'Spatz',
  'Uhu',
  'Wolf',
];
const pupils = ['8a', '8b'].flatMap((classId, c) =>
  names.map((nickname, i) => ({
    id: `00000000-0000-0000-0000-${String(c * 100 + i + 10).padStart(12, '0')}`,
    nickname: c ? nickname + 'b' : nickname,
    class_id: classId,
    role: 'student',
    coins: i * 15,
    plot_index: i,
    avatar: { character: i % 2 ? 'boy' : 'girl' },
    level: 1 + (i % 6),
    xp: i * 30,
    tutorial_step: i === 3 ? 'quiz' : null,
    last_sign_in_at:
      i === 4 || i === 5 ? new Date(Date.now() - 7 * 86400000).toISOString() : new Date().toISOString(),
    last_answer_at: null,
    quests_solved_week: i % 4,
    quests_offered_week: holiday ? 0 : 9,
    holiday_week: holiday,
    streak: i % 4,
  })),
);
let note: string | null = 'Diese Woche üben wir die unregelmäßigen Verben. Viel Spaß im Dorf!',
  validUntil = addDays(today, 7),
  createdAt = new Date().toISOString();
const ledger: Array<{ player_id: string; delta: number; reason: string; ref: string; created_at: string }> =
  [];
const ok = (data: unknown) => ({ data, error: null }),
  err = (message: string) => ({ data: null, error: { message } });
const calls: string[] = [];
async function rpc(name: string, args: Record<string, unknown> = {}) {
  calls.push(name);
  await new Promise((r) => setTimeout(r, Number(params.get('wait') ?? '60')));
  const cls = String(args.p_class_id ?? '8a'),
    list = pupils.filter((p) => p.class_id === cls);
  switch (name) {
    case 'teacher_class_pupils':
      return ok(list);
    case 'class_board':
      return ok({
        week,
        solved_week: holiday ? 0 : 87,
        goal_week: holiday ? 0 : 108,
        solved_today: holiday ? 0 : 22,
        class_streak: holiday ? 0 : 4,
        stamps_week: 7,
        notice: note,
      });
    case 'set_class_notice':
      note = args.p_text as string | null;
      validUntil = String(args.p_valid_until ?? addDays(today, 7));
      createdAt = new Date().toISOString();
      return ok(null);
    case 'teacher_pupil_detail':
      return ok({
        tutorial_step: pupils.find((p) => p.id === args.p_player_id)?.tutorial_step,
        slots: [
          { slot: 'house', item_id: 'house_fachwerk', name_de: 'Fachwerkhaus', rot: 0 },
          { slot: 'deco_1', item_id: 'deco_bench', name_de: 'Gartenbank', rot: 0 },
        ],
        unplaced: [{ item_id: 'deco_cat_sign', name_de: 'Katzenschild', qty: 1 }],
        week: [
          { day: today, key: 'today-1', solved: true, catch_up: false, attempts: 1 },
          { day: today, key: 'today-2', solved: false, catch_up: false, attempts: 2 },
        ],
        ledger: [
          ...ledger.filter((l) => l.player_id === args.p_player_id).map((l) => ({ at: l.created_at, ...l })),
          { at: new Date().toISOString(), delta: 15, reason: 'quest', ref: 'heute' },
          { at: new Date().toISOString(), delta: 100, reason: 'stamp', ref: week },
        ],
      });
    case 'adjust_coins':
    case 'adjust_coins_many': {
      const ids = (name === 'adjust_coins' ? [args.p_player_id] : args.p_player_ids) as string[],
        delta = Number(args.p_delta),
        targets = ids.map((id) => pupils.find((p) => p.id === id));
      if (targets.some((p) => !p)) return err('Schüler nicht gefunden.');
      if (targets.some((p) => p!.coins + delta < 0))
        return err('Zu wenig Münzen. Es wurde nichts zurückgebucht.');
      if (params.has('failUndo') && String(args.p_note).startsWith('Rückgängig'))
        return err('Zu wenig Münzen. Es wurde nichts zurückgebucht.');
      targets.forEach((p) => {
        p!.coins += delta;
        ledger.unshift({
          player_id: p!.id,
          delta,
          reason: 'teacher',
          ref: String(args.p_note),
          created_at: new Date().toISOString(),
        });
      });
      return ok(name === 'adjust_coins' ? targets[0]!.coins : targets.length);
    }
    case 'add_stamps': {
      const ids = args.p_player_ids as string[];
      let count = 0;
      for (const id of ids) {
        if (!ledger.some((l) => l.player_id === id && l.reason === 'stamp' && l.ref === args.p_week)) {
          const p = pupils.find((p) => p.id === id)!;
          p.coins += 100;
          ledger.push({
            player_id: id,
            delta: 100,
            reason: 'stamp',
            ref: String(args.p_week),
            created_at: new Date().toISOString(),
          });
          count++;
        }
      }
      return ok(count);
    }
    case 'quest_status':
      return ok({
        today,
        covered_until: addDays(week, 13),
        today_missing: false,
        tomorrow_missing: false,
        imports: holiday
          ? [
              {
                week,
                ok: true,
                holiday: true,
                errors: [],
                quest_count: 0,
                imported_at: new Date().toISOString(),
              },
            ]
          : [],
      });
    case 'teacher_quest_preview':
      return ok(
        holiday
          ? []
          : [0, 1, 2].flatMap((d) =>
              [1, 2, 3].map((slot) => ({
                key: `day${d}-${slot}`,
                day: addDays(today, d),
                slot,
                type: 'choice',
                prompt:
                  slot === 1
                    ? "What is 'Haus' in English?"
                    : slot === 2
                      ? 'My name ___ Tom.'
                      : 'Which word is a colour?',
                data: { options: ['house', 'mouse', 'horse'] },
                hint: 'Think carefully.',
                reward: 15,
                solution: slot === 1 ? 'house' : slot === 2 ? 'is' : 'red',
              })),
            ),
      );
    case 'teacher_village_members':
      return ok(list.map((p) => ({ ...p, title_label: null, frame_id: 'frame_wood' })));
    case 'teacher_pupil_quests':
      return ok([
        {
          key: 'today-1',
          day: today,
          catch_up: false,
          type: 'choice',
          prompt: "What is 'Haus' in English?",
          solved: true,
          attempts: 1,
        },
        {
          key: 'today-2',
          day: today,
          catch_up: false,
          type: 'gap',
          prompt: 'My name ___ Tom.',
          solved: false,
          attempts: 2,
        },
      ]);
    case 'set_class_flags':
    case 'set_layout':
    case 'set_class_rules':
    case 'set_item_sold':
      return ok(true);
    default:
      return err(`Unexpected fixture RPC: ${name}`);
  }
}
function from(table: string) {
  const filters: Record<string, unknown> = {};
  let single = false;
  const rows = () => {
    if (table === 'profiles') return pupils;
    if (table === 'streaks') return pupils.map((p) => ({ player_id: p.id, current: p.streak }));
    if (table === 'classes')
      return ['8a', '8b'].map((id) => ({
        id,
        shop_open: true,
        build_open: true,
        layout_seed: 11,
        map_id: id === '8a' ? 'tal' : 'fluss_mitte',
        stamp_reward: 100,
        daily_task_cap: 60,
        max_attempts: 3,
        plot_cols: 11,
        plot_rows: 11,
      }));
    if (table === 'map_templates')
      return [
        { id: 'tal', name: 'Im Tal' },
        { id: 'fluss_mitte', name: 'Am Fluss' },
        { id: 'bach_norden', name: 'Am Bach' },
      ];
    if (table === 'items')
      return [
        { id: 'deco_bench', name_de: 'Gartenbank', price: 30, kind: 'deco', active: true },
        { id: 'deco_cat_sign', name_de: 'Katzenschild', price: 20, kind: 'deco', active: true },
      ];
    if (table === 'class_items') return [];
    if (table === 'coin_ledger') return ledger;
    if (table === 'placements')
      return pupils.flatMap((p) => [
        {
          player_id: p.id,
          item_id: p.tutorial_step ? 'house_ruin' : 'house_fachwerk',
          slot: 'house',
          rot: 0,
        },
        { player_id: p.id, item_id: 'deco_bench', slot: 'deco_1', rot: 0 },
      ]);
    if (table === 'class_notices')
      return note ? [{ class_id: '8a', text: note, valid_until: validUntil, created_at: createdAt }] : [];
    return [];
  };
  const b = {
    select: () => b,
    eq: (k: string, v: unknown) => {
      filters[k] = v;
      return b;
    },
    order: () => b,
    in: () => b,
    gt: () => b,
    limit: () => b,
    single: () => {
      single = true;
      return b;
    },
    maybeSingle: () => {
      single = true;
      return b;
    },
    then(resolve: (v: unknown) => void) {
      const values = rows().filter((r) =>
        Object.entries(filters).every(([k, v]) => (r as Record<string, unknown>)[k] === v),
      );
      return Promise.resolve(resolve(ok(single ? (values[0] ?? null) : values)));
    },
  };
  return b;
}
const fake = {
  rpc,
  from,
  auth: { signOut: async () => ok(null) },
  functions: {
    invoke: async (_name: string, { body }: { body: Record<string, unknown> }) => {
      if (body.action === 'create') {
        pupils.push({
          ...pupils[0],
          id: crypto.randomUUID(),
          nickname: String(body.nickname),
          class_id: String(body.class_id),
          coins: 0,
          plot_index: 20,
        });
        return ok({ ok: true });
      }
      if (body.action === 'create_bulk')
        return ok({
          results: String(body.text)
            .split('\n')
            .filter(Boolean)
            .map((l) => ({ nickname: l.split(';')[0], ok: true })),
        });
      if (body.action === 'delete') {
        const i = pupils.findIndex((p) => p.id === body.user_id);
        if (i >= 0) pupils.splice(i, 1);
      }
      return ok({ ok: true });
    },
  },
} as unknown as SupabaseClient;
(window as unknown as { teacherFixture: { calls: string[]; pupils: typeof pupils } }).teacherFixture = {
  calls,
  pupils,
};
const root = document.getElementById('app')!;
if (params.has('readOnly')) {
  document.body.classList.remove('teacher-page');
  void mountVillage(root, fake, () => {}, {
    readOnly: {
      pupilId: pupils[0].id,
      nickname: pupils[0].nickname,
      classId: '8a',
      plotIndex: 0,
      onExit: () => location.assign('/dev/teacher.html#8a/schueler'),
    },
  });
} else mountShell(root, fake);
