# Daily Quests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the weekly task board with Daily Quests: three new quests per calendar day (Mon–Sun) from a weekly JSON package in the repo, imported automatically on push to `main`, checked and paid on the server, with one-day catch-up at half reward and an import/coverage notice plus preview in the teacher area.

**Architecture:** A pure TypeScript validator/converter turns `content/daily-quests/<Montag>.json` into public quest rows and private solution rows; the GitHub Action calls one `security definer` import RPC per week so a week lands all-or-nothing in one transaction. Pupils never read quest tables directly: `my_daily_quests()` returns today's quests plus yesterday's unsolved ones, `submit_quest_answer()` checks and books idempotently (unique ledger index). The browser area `dailyQuestsView` replaces `taskBoardView` behind the existing „Aufgaben“ nav button; listening uses the Web Speech API with visible-text fallback.

**Tech Stack:** TypeScript strict, Vite, Vitest (+ happy-dom, PGlite for SQL), Supabase Postgres (RLS, RPC), GitHub Actions, Web Speech API.

**Spec:** `docs/superpowers/specs/2026-10-20-daily-quests-design.md` (plus `CLAUDE.md`, `docs/SPEC.md` §5, §6, §8, §9, §14)

## Decisions this plan takes (spec §9 open points and review findings)

Each is a default; if the teacher decides otherwise, only the named task changes.

| # | Decision | Default in this plan | Task |
|---|---|---|---|
| D1 | JSON contract | Format in Task 1, documented in `content/daily-quests/FORMAT.md` | 1 |
| D2 | Listening is a stimulus, not an answer form | `type: "listening"` + `speak` + `mode: "choice" \| "gap"` | 1, 3, 6 |
| D3 | Reward bounds (no teacher approval, so a typo goes live) | integer 1–20 (`REWARD_MIN`/`REWARD_MAX`) | 1 |
| D4 | Re-import of a week already live | Whole week replaced in one transaction: quests upserted by key, quests missing from the file set `active = false` (never deleted); results and bookings stay; reward changes apply only to future bookings; invalid re-import keeps the previous version live and shows the error | 2, 5 |
| D5 | Old weekly tasks | Tables `tasks`, `task_solutions`, `task_results`, `task_attempts` stay untouched as history; old board UI, old importer and `content/tasks` handling are removed | 5, 7 |
| D6 | Holidays (7 days/week would otherwise warn every holiday day) | Holiday file `{"week": "...", "holiday": true}`: no quests, no warning | 1, 2, 4 |
| D7 | Content safety without approval | Teacher area shows the next 7 days incl. solutions (read only, no approval step) | 4, 8 |
| D8 | „Missing package“ detection | Computed live in the teacher area from data (`quest_status()`), not by the pipeline (the pipeline only runs on push) | 4, 8 |
| D9 | Order/match shuffling | Seeded shuffle that never returns the solution order (the old importer only reversed it) | 1 |
| D10 | Voice | `en-GB` first, else any `en*` voice, else visible text | 6 |
| D11 | Unlimited attempts + guessing (MC with 4 options would always pay after ≤ 4 tries) | **Teacher decision 21.10.2026:** attempts stay unlimited, but coins are paid only if the correct answer is among the first 3 attempts of that pupil for that quest (attempts count across today and catch-up; the correct submission counts). The limit lives in one SQL function `public.quest_paid_attempts()` (returns 3) so it can be changed. A correct answer after that marks the quest solved with `reward_paid = 0` and no ledger row. `my_daily_quests` and `submit_quest_answer` additionally return `reward_left` (what a correct answer would still pay now; 0 once 3 attempts are used or solved) | 3, 6, 7 |

## Global Constraints

- UI text German, simple language; quest content and hints English; code and comments English.
- Dates for pupils/teacher as „Woche ab 09.11.“ (`weekLabel`), never „KW“; day labels like „Mo 09.11.“.
- Time zone `Europe/Berlin`; server decides the date only via `public.quest_today()`.
- Coins, results and quests change only through RPCs; every new table has RLS; clients get no write grants.
- Solutions never reach the browser (not even after many wrong attempts).
- Invariant: `profiles.coins` = sum of `coin_ledger.delta`; RPCs write both in one transaction.
- Service role key only in the GitHub Action (`SUPABASE_SERVICE_ROLE_KEY` secret); never in `web/src`.
- Same package for all classes (no `class_id` on quests).
- No new npm dependencies; no paid services.
- Before finishing: `npm test`, `npm run build`, Playwright screenshot of the new area (CLAUDE.md).
- Migrations auto-apply on push of `supabase/**` (`migrate.yml`): do not push until Task 9.

## Review Focus

1. **Double tap / network retry on „Prüfen“** → exactly one booking; second call answers `already_solved: true`, coins unchanged; button disabled while pending. (Tests in Task 3 and Task 7.)
2. **Catch-up across the week boundary** (Sunday's quest from package `2026-11-09` answered on Monday 16.11.) → available at half reward even if the Monday package is missing. (Test in Task 3.)
3. **Request lands after midnight** (yesterday's catch-up answered at 00:00:01 two days later) → error `quest not available`, pupil sees „Diese Quest ist nicht mehr offen.“ and the list reloads. (Tests in Task 3 and Task 7.)
4. **Correction push after release** (solution fixed, one quest removed) → solved stays solved, no second booking, removed quest disappears for pupils, ledger rows intact. (Test in Task 2.)
5. **No `speechSynthesis` or no English voice** (some Android tablets, Firefox without voices) → text shown, quest solvable. (Test in Task 6.)
   Also pinned: duplicate words in an order quest („the … the“) accepted in either tap order of the identical words (Task 3, via existing `answer_matches`).

---

### Task 1: Package format, validator and converter

**Files:**
- Create: `web/scripts/quests.ts`
- Create: `content/daily-quests/FORMAT.md` (format for Claude in the Wochenplan project; German explanation, English example)
- Create: `web/tests/fixtures/quests/2026-11-09.json` (valid 7×3 week using all five types), `web/tests/fixtures/quests/2026-11-02.json` (holiday)
- Test: `web/tests/content/quests.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const QUEST_TYPES = ['choice', 'gap', 'match', 'order', 'listening'] as const;
  export type QuestType = (typeof QUEST_TYPES)[number];
  export type AnswerMode = 'choice' | 'gap' | 'match' | 'order';
  export const REWARD_MIN = 1; export const REWARD_MAX = 20;
  export interface QuestSpec { id: string; type: QuestType; prompt: string; hint: string; reward: number;
    options?: string[]; solution?: string | string[]; pairs?: Array<[string, string]>; speak?: string; mode?: 'choice' | 'gap' }
  export interface DaySpec { date: string; quests: QuestSpec[] }
  export type WeekPackage = { week: string; days: DaySpec[] } | { week: string; holiday: true };
  export function validatePackage(input: unknown, fileName?: string): string[]; // German messages, [] = valid
  export interface QuestRow { key: string; week: string; day: string; slot: 1 | 2 | 3; qid: string; type: QuestType;
    prompt: string; hint: string; reward: number; data: Record<string, unknown> }
  export interface QuestSolutionRow { quest_key: string; solution: unknown }
  export function packageToRows(pkg: WeekPackage): { quests: QuestRow[]; solutions: QuestSolutionRow[] }; // holiday → both []
  export function shuffleAway(list: string[], seed: string): string[];
  ```
  Key = `${day}-${id}` (e.g. `2026-11-10-tue-2`). Public `data`: choice `{options}`; gap `{}`; match `{left, right}` (right = `shuffleAway`); order `{words}` (`shuffleAway`); listening `{speak, mode, options?}`. Solutions: choice string; gap string[]; match pairs; order string[]; listening per mode.

- [ ] **Step 1: Write failing tests** in `quests.test.ts`:
  - fixture `2026-11-09.json` → `validatePackage(...) === []`; `packageToRows` gives 21 quests, keys unique, `slot` 1–3 per day, no public `data` contains a value equal to the solution field set (`JSON.stringify(data)` must not contain `"solution"`), order/match `data` arrays are a permutation of the solution and differ from it.
  - holiday fixture valid; `packageToRows` → `{ quests: [], solutions: [] }`.
  - each rejected with a message containing the given path: `week` not Monday (`"week: muss ein Montag sein"`); 6 days (`"days: genau 7 Tage"`); `days[2].date` ≠ week+2 (`"days[2].date: 2026-11-11 erwartet"`); a day with 2 quests (`"days[0].quests: genau 3 Aufgaben"`); duplicate id in two different days (`"kommt doppelt vor"`); unknown type; reward `0`, `21`, `7.5`; empty `hint`; choice solution not in options; gap prompt without `___`; match with duplicate left or right word; order with 1 word; listening without `speak` or with `mode: "match"`; file name ≠ `${week}.json` when `fileName` given; holiday file with extra `days`.
  - `shuffleAway(['a','b','c'], 'k')` is deterministic for the same seed, never equals input order; for two elements returns the swapped pair.
- [ ] **Step 2: Run** `cd web && npx vitest run tests/content/quests.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `web/scripts/quests.ts`. Reuse `isMonday`/`parseIsoDate` from `../src/teacher/week.ts`, id regex `^[a-z0-9][a-z0-9-]{0,30}$`, length limits prompt ≤ 200, hint ≤ 120, speak ≤ 400, options 2–6, pairs 2–6, order words 2–12. `shuffleAway`: Fisher–Yates with `createRng` from `../src/world/rng.ts` seeded by a string hash of `seed`; if the result equals the input, rotate by one.
- [ ] **Step 4: Write `FORMAT.md`**: file name rule, holiday file, one example per type, rules from the validator, guidance „Hints: one short sentence in very simple English, no solution“; reward guidance 5/10/15 (easy/medium/hard).
- [ ] **Step 5: Run** the test → PASS. Commit `feat(quests): package format, validator and converter`.

### Task 2: Schema, import RPCs (migration 0015)

**Files:**
- Create: `supabase/migrations/0015_daily_quests.sql`
- Test: `web/tests/sql/daily-quests.test.ts` (PGlite harness copied from `backend.test.ts`, migrations `0001`–`0015`; stub adds `create role service_role nologin;`; test helper `setToday(date)` does `create or replace function public.quest_today() returns date language sql stable as $$ select '<date>'::date $$` as superuser)

**Interfaces:**
- Consumes: `QuestRow`, `QuestSolutionRow` JSON shapes from Task 1.
- Produces (SQL):
  ```sql
  daily_quests(key text pk, week date, day date, slot smallint check 1..3, qid text, type text check in (5 types),
               prompt text, hint text, data jsonb, reward int check (reward between 1 and 20), active boolean default true,
               unique (day, slot) where active)            -- partial unique index
  daily_quest_solutions(quest_key text pk references daily_quests on delete cascade, solution jsonb)
  daily_quest_results(player_id uuid references profiles on delete cascade, quest_key text references daily_quests,
               attempts int default 0, solved_at timestamptz, reward_paid int, primary key (player_id, quest_key))
  quest_imports(week date pk, ok boolean, holiday boolean default false, errors text[] default '{}',
               quest_count int default 0, imported_at timestamptz default now())
  coin_ledger.reason += 'quest'; unique index coin_ledger_quest_once on coin_ledger (player_id, ref) where reason = 'quest'
  public.quest_today() returns date            -- (now() at time zone 'Europe/Berlin')::date
  public.import_quest_week(p_week date, p_holiday boolean, p_quests jsonb, p_solutions jsonb) returns int
  public.record_quest_import(p_week date, p_ok boolean, p_errors text[]) returns void
  ```
  RLS on all four tables. Read: `daily_quests`, `daily_quest_solutions`, `quest_imports` teacher only (`is_teacher()`); `daily_quest_results` own row or teacher. No insert/update/delete grants for `anon`/`authenticated`. Both import functions: `security definer`, `revoke ... from public, anon, authenticated; grant execute ... to service_role`.

- [ ] **Step 1: Write failing tests:**
  - pupil (`asUser(ANNA)`) `select * from daily_quests` → 0 rows; `daily_quest_solutions` → permission error; insert into `daily_quest_results` → error.
  - pupil calling `import_quest_week` → permission error.
  - `import_quest_week` with fixture rows (convert with `packageToRows` from Task 1) as `service_role` → returns 21; `quest_imports` row `ok = true, quest_count = 21`.
  - import with a solution row whose `quest_key` is unknown → raises, and **no** `daily_quests` row for that week exists afterwards (all-or-nothing).
  - holiday import → 0 quests, `quest_imports.holiday = true, ok = true`.
  - re-import (Review Focus 4): after BEN has a `daily_quest_results` row solved and a `coin_ledger` 'quest' row for key K, re-import the week without quest K and with a changed solution for quest L → K `active = false`, still present; BEN's result and ledger row unchanged; L's solution updated.
  - `record_quest_import(week, false, '{"days: genau 7 Tage"}')` after a valid import → row `ok = false`, errors stored, the week's quests still `active` (previous version stays live).
  - inserting a second `coin_ledger` row `(BEN, 'quest', K)` as superuser → unique violation.
- [ ] **Step 2: Run** `npx vitest run tests/sql/daily-quests.test.ts` → FAIL.
- [ ] **Step 3: Implement** `0015_daily_quests.sql`. Reason check: `alter table coin_ledger drop constraint coin_ledger_reason_check, add constraint coin_ledger_reason_check check (reason in ('task','stamp','purchase','refund','teacher','quest'))`. `import_quest_week`: upsert quests by `key` (set all fields, `active = true`), set `active = false` for this week's keys not in `p_quests`, upsert solutions, upsert `quest_imports(ok = true, holiday, errors = '{}', quest_count, imported_at = now())`; one function = one transaction.
- [ ] **Step 4: Run** → PASS; also `npx vitest run tests/sql` (all older SQL tests still green). Commit `feat(quests): schema and import RPCs`.

### Task 3: Pupil RPCs (migration 0016)

**Files:**
- Create: `supabase/migrations/0016_daily_quests_rpc.sql`
- Test: extend `web/tests/sql/daily-quests.test.ts` (migrations list + new `describe('pupil quests')`)

**Interfaces:**
- Consumes: tables and `quest_today()` from Task 2; existing `public.answer_matches(type, solution, answer)` from 0007.
- Produces:
  ```sql
  public.quest_answer_matches(p_type text, p_data jsonb, p_solution jsonb, p_answer jsonb) returns boolean
      -- listening → answer_matches(p_data->>'mode', ...), else answer_matches(p_type, ...)
  public.my_daily_quests() returns jsonb
      -- array of {key, day, catch_up bool, type, prompt, data, reward, solved bool, attempts int}
      -- today: all active quests of quest_today() (solved ones included, solved = true)
      -- catch_up: active quests of quest_today() - 1 that this pupil has not solved; reward = (reward + 1) / 2
      -- order: catch_up false first, then day, slot. Never contains hint or solution.
  public.submit_quest_answer(p_key text, p_answer jsonb) returns jsonb
      -- {correct bool, already_solved bool, coins int, reward int (booked now, else 0), hint text|null (only when wrong)}
  ```
  Errors: `not logged in` / `only pupils can answer` (42501); `quest not available` (P0002) when key unknown, inactive, or `day` not in (`today`, `today - 1`). Already solved → no exception, `{correct: true, already_solved: true, reward: 0}`, attempts not increased. Reward: `day = today` → `reward`, else `(reward + 1) / 2`; paid only if the attempt count after this submission ≤ `quest_paid_attempts()` (D11), otherwise the quest is marked solved with `reward_paid = 0`, no ledger row. Both RPCs also return `reward_left` (D11). No daily cap, no attempt limit (`classes.daily_task_cap` / `max_attempts` are not read). Results row locked `for update`; booking inserts `coin_ledger(reason 'quest', ref = key)` and updates `profiles.coins` in the same transaction. Grants: both functions `to authenticated` only.

- [ ] **Step 1: Write failing tests** (setToday per test):
  - day 2026-11-10: ANNA (8a) and CARLA (8b) get the same 3 today keys; quests of 2026-11-11 never appear; `submit_quest_answer` for a 2026-11-11 key → `quest not available`.
  - wrong answer → `{correct: false, hint: <fixture hint>, reward: 0}`; result has no `solution` field; 10 wrong answers in a row still allowed; then correct → `reward` = full, coins +reward, ledger row with `ref = key`.
  - Review Focus 1: correct answer submitted twice → second `{already_solved: true, reward: 0}`, exactly one ledger row, coins unchanged.
  - catch-up: on 2026-11-11 BEN sees yesterday's unsolved quests with `catch_up: true`, reward `ceil(r/2)` (fixture contains reward 15 → 8 and 5 → 3); yesterday's solved quests are absent.
  - expiry (Review Focus 3): on 2026-11-12 a 2026-11-10 key → `quest not available`.
  - Review Focus 2: package 2026-11-09 only, today 2026-11-16 → `my_daily_quests` returns Sunday 15.11. quests as catch-up, none as today.
  - listening quest with `mode: "gap"` accepts `"  The Station "` for solution `["the station"]` (normalisation).
  - order quest with solution `["the","dog","sees","the","cat"]` accepts that sequence (duplicate words).
  - deactivated quest (Task 2 re-import) → not listed, submit → `quest not available`.
  - D11: 3 wrong answers, then correct → `{correct: true, already_solved: false, reward: 0}`, quest solved, no ledger row, coins unchanged; after 2 wrong answers the 3rd (correct) still pays full; `reward_left` after the 3rd wrong answer is 0 in both `submit_quest_answer` and `my_daily_quests`.
  - teacher calling `submit_quest_answer` → `only pupils`; invariant: for ANNA and BEN `coins = sum(coin_ledger.delta)` after all tests.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `0016_daily_quests_rpc.sql`. **Step 4: Run** → PASS. Commit `feat(quests): pupil RPCs with catch-up and idempotent booking`.

### Task 4: Teacher RPCs (migration 0017)

**Files:**
- Create: `supabase/migrations/0017_daily_quests_teacher.sql`
- Test: extend `web/tests/sql/daily-quests.test.ts`

**Interfaces:**
- Produces:
  ```sql
  public.quest_status() returns jsonb
    -- {today date, covered_until date|null, today_missing bool, tomorrow_missing bool,
    --  imports: [{week, ok, holiday, errors text[], quest_count, imported_at}] (weeks >= monday(today) - 7, ascending)}
    -- covered_until = last day d with (active quests on d) or (d in a holiday week), counting only an unbroken run from today
    -- today_missing / tomorrow_missing = no active quest on that day and the day is not in a holiday week
  public.teacher_quest_preview(p_from date, p_days int) returns jsonb
    -- p_days 1..14, else 22023; array of {key, day, slot, type, prompt, data, hint, reward, solution}, by day, slot
  ```
  Both `security definer`, raise 42501 unless `is_teacher()`; `grant execute to authenticated`.

- [ ] **Step 1: Write failing tests:** pupil calling either → 42501. today 2026-11-10 with package 11-09 → `covered_until = '2026-11-15'`, both missing flags false. today 2026-11-15 → `tomorrow_missing = true`. today 2026-11-16, no package → `today_missing = true`, `covered_until = null`. Holiday week 11-16 imported → today 2026-11-16 `today_missing = false`, `covered_until = '2026-11-22'`. After `record_quest_import(11-23, false, …)` the import list shows that week with `ok = false` and its errors. `teacher_quest_preview('2026-11-09', 7)` → 21 entries incl. `solution`; `p_days = 15` → error.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. Commit `feat(quests): teacher status and preview RPCs`.

### Task 5: Importer script and workflow; remove the old weekly importer

**Files:**
- Create: `web/scripts/import-quests.ts`
- Modify: `.github/workflows/import-content.yml` (run `node scripts/import-quests.ts`; trigger stays `content/**`)
- Delete: `web/scripts/import-content.ts`, `web/scripts/content.ts`, `web/tests/content/content.test.ts` (D5; check with `grep -rn "scripts/content" web` that nothing else imports them)
- Test: `web/tests/content/import-quests.test.ts`

**Interfaces:**
- Consumes: `validatePackage`, `packageToRows` (Task 1); RPCs `import_quest_week`, `record_quest_import` (Task 2).
- Produces:
  ```ts
  export interface QuestRpc { rpc(fn: string, args: Record<string, unknown>): Promise<{ error: { message: string } | null }> }
  export interface ImportReport { imported: string[]; failed: Array<{ file: string; errors: string[] }> }
  export async function importQuestDir(dir: URL, client: QuestRpc): Promise<ImportReport>;
  ```
  Each `*.json` in `content/daily-quests/` (sorted) is handled on its own: invalid JSON or validation errors → `record_quest_import(week, false, errors)` (only if a Monday `week` is readable from the file name `YYYY-MM-DD.json`) and listed in `failed`; valid → `import_quest_week`. `main()` builds the client from env, prints the report in German, exits 1 if `failed` is non-empty (GitHub then mails the teacher). A missing directory → report empty, exit 0.

- [ ] **Step 1: Write failing tests** with a temp dir and a fake `QuestRpc` recording calls: valid fixture → one `import_quest_week` call with `p_week`, `p_holiday: false`, 21 quests; invalid file `2026-11-16.json` (2 days) → one `record_quest_import` call with `p_ok: false` and errors containing `"days: genau 7 Tage"`, report lists it; a broken-JSON file → `failed` with message `"kein gültiges JSON"`; one bad file does not stop the valid one; RPC error on import → in `failed`, not thrown.
- [ ] **Step 2: Run** `npx vitest run tests/content/import-quests.test.ts` → FAIL. **Step 3: Implement**, update workflow, delete old files. **Step 4: Run** `npm test` → PASS. Commit `feat(quests): import pipeline replaces weekly task import`.

### Task 6: Client API, answer building and speech

**Files:**
- Create: `web/src/api/quests.ts`, `web/src/quests/speech.ts`
- Modify: `web/src/tasks/answer.ts` (add `answerMode`)
- Test: `web/tests/quests/api.test.ts`, `web/tests/quests/speech.test.ts`, extend `web/tests/tasks/answer.test.ts`

**Interfaces:**
- Consumes: RPCs from Task 3; `Outcome<T>` from `api/economy.ts`.
- Produces:
  ```ts
  // api/quests.ts
  export type QuestType = 'choice' | 'gap' | 'match' | 'order' | 'listening';
  export interface DailyQuest { key: string; day: string; catchUp: boolean; type: QuestType; prompt: string;
    data: Record<string, unknown>; reward: number; rewardLeft: number; solved: boolean; attempts: number }
  export interface QuestAnswerResult { correct: boolean; alreadySolved: boolean; coins: number; reward: number; rewardLeft: number; hint: string | null }
  export async function loadDailyQuests(supabase: SupabaseClient): Promise<Outcome<DailyQuest[]>>;
  export async function submitQuestAnswer(supabase: SupabaseClient, key: string, answer: unknown): Promise<Outcome<QuestAnswerResult>>;
  export function explainQuestError(message: string): string;
  // tasks/answer.ts
  export function answerMode(type: QuestType, data: Record<string, unknown>): TaskType; // listening → data.mode
  // quests/speech.ts
  export interface VoiceLike { lang: string; name: string }
  export function pickEnglishVoice<V extends VoiceLike>(voices: readonly V[]): V | null;
  export async function loadVoices(synth: SpeechSynthesis, timeoutMs?: number): Promise<SpeechSynthesisVoice[]>; // default 1500, waits for 'voiceschanged'
  export async function speakEnglish(text: string, synth?: SpeechSynthesis | undefined): Promise<boolean>; // false → caller shows text
  ```
  `explainQuestError` copy: `quest not available` → „Diese Quest ist nicht mehr offen.“; `only pupils` → „Nur Schülerkonten können Quests lösen.“; else „Das hat leider nicht geklappt. Bitte noch einmal versuchen.“ Load failure → „Die Quests konnten nicht geladen werden.“ Speech: `lang` of the voice on the utterance, `rate = 0.9`, `synth.cancel()` before speaking.

- [ ] **Step 1: Write failing tests:** api maps snake_case → camelCase and calls `rpc('my_daily_quests')` / `rpc('submit_quest_answer', { p_key, p_answer })` (fake client); error messages map as above. `pickEnglishVoice`: `[de-DE, en-US, en-GB]` → en-GB; `[de-DE, en-US]` → en-US; `en_GB` (Android spelling) counts as en-GB; `[de-DE]` → null. Review Focus 5: `speakEnglish('Hi', undefined)` → false; synth with only German voices → false, `speak` not called; English voice → true and `speak` called once with `lang = 'en-GB'`. `answerMode('listening', {mode: 'gap'})` → `'gap'`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. Commit `feat(quests): client API and speech`.

### Task 7: Daily Quest area replaces the task board

**Files:**
- Create: `web/src/ui/answerForms.ts` (moved from `taskBoardView.ts`: `emptyState`, `answerForm`, binding of the form controls)
- Create: `web/src/ui/dailyQuestsView.ts`
- Modify: `web/src/ui/villageView.ts:38,443-444` (opener `aufgaben` → `openDailyQuests`, same `onClose`), `web/src/ui/ledgerView.ts:15` (add `quest: 'Daily Quest gelöst'`), `web/src/style.css` (quest cards, catch-up badge)
- Delete: `web/src/ui/taskBoardView.ts`, `web/tests/ui/taskBoard.test.ts`; remove `loadTasks`, `loadTodayStatus`, `submitAnswer` and the old task error strings from `api/economy.ts` if no other importer remains (`grep`)
- Test: `web/tests/ui/dailyQuests.test.ts`, `web/tests/ui/answerForms.test.ts`

**Interfaces:**
- Consumes: Task 6 (`loadDailyQuests`, `submitQuestAnswer`, `answerMode`, `speakEnglish`); `AreaHandle` from `ui/areas.ts`; `esc`.
- Produces: `export function openDailyQuests(opts: { supabase: SupabaseClient; coins: number; onCoins: (c: number) => void; onClose: () => void }): AreaHandle` — same contract as the old `openTaskBoard` (non-modal `section.overlay.area` with `role="region"`, own „Schließen“ calls `onClose`, `close()` only removes). The first-login tutorial will call this later.

  Copy (exact): title „Daily Quests“; rule line under the title „Münzen gibt es bei den ersten 3 Versuchen.“ (D11); card label when `rewardLeft = 0` and unsolved: „Keine Münzen mehr – üben geht trotzdem.“; correct with `reward = 0`: „Richtig! Diesmal ohne Münzen.“; after a wrong answer the card label follows the returned `rewardLeft`; sections „Heute“ and „Nachholen von gestern“ (second section only when non-empty); card label `${reward} Münzen`, catch-up badge „Nachholen · halbe Münzen“, solved „gelöst ✓“; no today quests: „Heute gibt es keine neuen Quests.“; all of today solved: „Alle Quests für heute geschafft!“; check button „Prüfen“; empty answer „Bitte zuerst alles ausfüllen.“; wrong: „Leider falsch. Tipp: “ + hint (English, in `<span lang="en">`); correct: „Richtig! +${reward} Münzen“; already solved: „Diese Quest hast du schon gelöst.“; listening button „▶ Anhören“, fallback „Dein Gerät kann nicht vorlesen. Lies den Text:“ followed by `speak` in `lang="en"`. No attempt counter, never a solution.

- [ ] **Step 1: Write failing tests** (happy-dom, `vi.mock('../../src/api/quests')`): region + „Schließen“ contract as in the old board test; today and catch-up sections with labels and badge; empty state text; wrong answer shows hint and keeps the form open with the input value; correct answer calls `onCoins` with returned coins and marks the card „gelöst ✓“; Review Focus 1: two quick clicks on „Prüfen“ → `submitQuestAnswer` called once (button `disabled` while pending); Review Focus 3: `quest not available` → message „Diese Quest ist nicht mehr offen.“ and `loadDailyQuests` called again; listening with `speakEnglish` resolving false → fallback text visible; result arriving after `close()` still calls `onCoins`. `answerForms.test.ts`: the four forms render and build the same answers as before (port the relevant old cases).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**, wire `villageView`, delete old board. **Step 4: Run** `npm test`, `npm run build` → PASS. Commit `feat(quests): daily quest area replaces task board`.

### Task 8: Teacher area: status, warning and preview

**Files:**
- Modify: `web/src/teacher/api.ts` (add functions below), `web/src/teacher/teacherView.ts` (new section „Daily Quests“ before „Aufgaben-Statistik“; the old statistics section stays for history)
- Test: `web/tests/teacher/quests.test.ts`

**Interfaces:**
- Consumes: `quest_status()`, `teacher_quest_preview()` (Task 4).
- Produces:
  ```ts
  export interface QuestImport { week: string; ok: boolean; holiday: boolean; errors: string[]; questCount: number; importedAt: string }
  export interface QuestStatus { today: string; coveredUntil: string | null; todayMissing: boolean; tomorrowMissing: boolean; imports: QuestImport[] }
  export interface QuestPreview { key: string; day: string; slot: number; type: string; prompt: string; data: Record<string, unknown>; hint: string; reward: number; solution: unknown }
  export async function loadQuestStatus(supabase: SupabaseClient): Promise<Result<QuestStatus>>;
  export async function loadQuestPreview(supabase: SupabaseClient, from: string, days: number): Promise<Result<QuestPreview[]>>;
  export function questNotices(s: QuestStatus): Array<{ level: 'ok' | 'warn' | 'error'; text: string }>; // pure
  export function dayLabel(iso: string): string; // "Mo 09.11."
  ```
  `questNotices` copy (exact, `weekLabel` for weeks): ok „Daily Quests vorhanden bis ${dayLabel(coveredUntil)}.“; warn today „Heute gibt es keine Daily Quests. Bitte das Quest-Paket für die ${weekLabel(monday)} hochladen.“; warn tomorrow „Morgen gibt es noch keine Daily Quests.“; error per failed import „Das Quest-Paket für die ${weekLabel(week)} hat Fehler und wurde nicht übernommen:“ + error list; holiday import shown as „${weekLabel(week)}: Ferien, keine Quests.“ Preview: next 7 days from `today`, per day the three quests with prompt, reward, type and the solution in plain words (reuse the `solutionText` logic from the old board, moved into this module).

- [ ] **Step 1: Write failing tests:** `questNotices` for each case above (exact strings); `dayLabel('2026-11-09') === 'Mo 09.11.'`; section renders notices and a preview table with the solution column (happy-dom, mocked api).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS. Commit `feat(quests): teacher status, warning and preview`.

### Task 9: Docs, end-to-end check, release order

**Files:**
- Modify: `docs/SPEC.md` (§5 new tables, §6 RLS rows, §8 new RPCs, §9 replaced by Daily Quests incl. D1–D11, §14 quest rewards, no daily cap), `docs/SCOPE.md` (items 5 and 10), `docs/PLAN.md` (new block „Zwischenpaket Q – Daily Quests“ with Q.1–Q.9 = Tasks 1–9 plus Q.10 LK-Abnahme; progress note), `docs/ANLEITUNG_LEHRKRAFT.md` (replace „Neue Aufgabenwoche einspielen“ by „Daily Quests einspielen“: file in `content/daily-quests/`, holiday file, check Actions, teacher section shows status and preview), `web/e2e/smoke.spec.ts` (if it touches the board)
- Modify: `docs/superpowers/specs/2026-10-20-daily-quests-design.md` §9 → link to the decisions in SPEC

- [ ] **Step 1:** Update the docs above; `grep -rn "taskBoard\|content/tasks\|Aufgabentafel" web/src docs` → only historical mentions remain.
- [ ] **Step 2:** `cd web && npm run typecheck && npx eslint src tests && npm test && npm run build` → all green.
- [ ] **Step 3:** Playwright screenshot of the Daily Quest area (tablet 1024×768 and phone 390×844) with the e2e Supabase mock: today + catch-up + listening fallback; look at both.
- [ ] **Step 4: Release order** (explain to the teacher in simple German before pushing): push migrations 0015–0017 first and wait for `migrate` to be green; only then push the first real package into `content/daily-quests/` (otherwise `import-content` runs against missing functions). The first package is written by Claude in the Wochenplan project from `Jahresplanung_2026-27.md` following `FORMAT.md`.
- [ ] **Step 5:** Commit `docs: daily quests in SPEC, SCOPE, PLAN and teacher guide`; tick Q.1–Q.9 in `docs/PLAN.md`; wait for LK acceptance (Q.10).
