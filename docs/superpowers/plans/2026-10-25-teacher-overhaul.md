# Lehrerbereich-Überarbeitung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the teacher area (`/lehrer/`) into separate pages with a pupil table (game state + activity + ledger), one-click and multi-pupil coin bookings with reasons and undo (tablet-usable), a class board mode without individual values, a class notice shown in the village, QR codes on the access cards and a read-only "view as pupil" village.

**Architecture:** A small hash router (`#<class>/<page>`) with a shell (header, class switch, left nav) mounts one page module at a time; every page gets the same `TeacherContext`. The existing sections move into pages unchanged; new data comes from teacher-only `security definer` RPCs in one new migration. The pupil app gains a notice (board note + one-time card), a login-by-fragment for QR codes and a `readOnly` mode of the village.

**Tech Stack:** TypeScript strict, Vite 5 (pages `index.html`, `lehrer/index.html`), Supabase RPCs + PGlite SQL tests (pattern `web/tests/sql/tutorial-house.test.ts`), Vitest 2 + happy-dom, Playwright, `qrcode-generator` 1.4.4 (MIT, teacher bundle only).

**Spec:** `docs/superpowers/specs/2026-10-21-teacher-ui-design.md` (Fassung 2, 25.10.2026). Numbers and strings below come from it.

## Global Constraints

- Read `CLAUDE.md` first. Do not touch `Konzept/`, `Prototyp/`, `Kenny/`, `../Referenz`, `Thomsen92/English-Club-8`. Work on `main` (the teacher wants a single branch) unless told otherwise; commit per task.
- **Migration:** one file `supabase/migrations/<NNNN>_teacher_overhaul.sql` with the next free number at the time of Task 1 (check `ls supabase/migrations`). If the XP plan (`2026-10-24-xp-level.md`) is implemented later, it takes the next number after this one. Add the file to `web/tests/sql/migrations.test.ts`.
- Coins only through `adjust_coins` / `adjust_coins_many`; no direct table writes; every new function `security definer`, `set search_path = public`, `perform require_teacher()` (or `forbidden: pupils only` checks for pupil-side reads), `revoke execute … from public, anon`, `grant … to authenticated`. RLS on the new table.
- No ranking, no names/coins/XP/inactivity on the board page. Passwords and pseudo e-mails never appear outside the card print.
- New dependency allowed: `qrcode-generator@1.4.4` (MIT), imported only from `web/src/teacher/`; licence noted in `blender/sources/LICENSES.md` (section software) or the README licence list.
- UI German, plain language; code and comments English; dates „Woche ab TT.MM.“, never „KW“; Europe/Berlin for weeks and days (`quest_today()`).
- Exact strings:
  - Nav: `Übersicht`, `Schüler`, `Münzen & Stempel`, `Daily Quests`, `Konten`, `Dorf & Regeln`; header `Klasse 8a` / `Klasse 8b`, `Abmelden`; mobile menu button `Menü`.
  - Pupil table headers: `Spitzname`, `Münzen`, `Grundstück`, `Quests diese Woche`, `Zuletzt aktiv`; buttons `Details`, `Als Schüler ansehen`; filters `Alle`, `Tutorial offen`, `Nicht aktiv`; search label `Spitzname suchen`.
  - Activity: `heute`, `gestern`, `vor <n> Tagen`, `noch nie`, hint `seit <n> Tagen nicht aktiv` (n ≥ 5), holiday `Ferien`; plot `Tutorial: <Schritt>` with steps `noch nicht begonnen`, `Begrüßung`, `Quiz`, `Haus kaufen`, `Haus hinstellen`.
  - Coins: buttons `+5`, `+10`, `+20`, `+100`, `−5`, `−10`; aria `"<n> Münzen zu <Name> hinzufügen"`, `"<n> Münzen von <Name> abziehen"`; reason group `Grund` with `kein Grund`, `Mitarbeit`, `Hausaufgabe`, `Hilfsbereit`, `Verhalten`; notes `Schnellbuchung +10` / `Schnellbuchung +10 · Mitarbeit`; undo note `Rückgängig: <note>`; status `+10 Münzen für Lea (Mitarbeit)` / `+10 Münzen für 7 Schüler`; button `Rückgängig` (10 s); multi bar `Für <n> markierte:`; checkbox `alle`.
  - Board: `Quests diese Woche`, `<x> von <y>`, `Heute`, `Klassen-Serie`, `Stempel diese Woche: <n>`, buttons `Vollbild`, `Zurück`, `Tafelmodus`.
  - Notice: `Nachricht ins Dorf`, `Veröffentlichen`, `Entfernen`, `gültig bis`; pupil card title `Nachricht von deiner Lehrkraft`, button `OK`.
  - Cards: hint `Mit dem QR-Code meldet sich der Schüler direkt an. Bei Verlust: Passwort zurücksetzen.`
  - Read-only band: `Ansicht von <Name> – nur ansehen`, button `Zurück zum Lehrerbereich`.
- Thresholds: inactivity 5 days, class streak = at least half of the class, notice ≤ 140 characters and default valid 7 days, undo 10 s, ledger 50 rows. Constants in `web/src/teacher/rules.ts` and SQL (`teacher_inactive_days()` not needed: the client computes the hint from timestamps).
- Coins page usable from 768 px width, buttons ≥ 44 × 44 px, nav collapses below 1 024 px; other pages PC-first.
- Done means: in `web/`, `npm test`, `npm run build`, `npx eslint src tests` green; screenshots in Task 12.

## Review Focus

1. **Double click / fast repeated clicks** on a quick button or the multi bar → exactly one RPC per intended booking (row locked while pending). (Tests in Task 6.)
2. **Undo after the pupil already spent the coins** (balance lower than the undo amount) and **multi undo where one pupil cannot** → nothing is rebooked, clear message, the status line keeps the original success. (SQL test Task 1, UI test Task 6.)
3. **Board page leaking individual data** (names, coins, inactivity) → the board RPC returns only aggregates and the page renders nothing else. (SQL test Task 2, UI test Task 8.)
4. **QR login fragment** → after loading, `location.hash` is empty and the history entry has no password; a wrong/expired password shows the normal error with the nickname filled in; nothing is sent anywhere except `signInWithPassword`. (Tests in Task 10.)
5. **Read-only village** → no pupil write RPC is ever called (spy on `supabase.rpc` and `from().insert/update/delete`), tutorial never starts, build/shop/profile buttons absent. (Tests in Task 11.)

---

## File Map

- `supabase/migrations/<NNNN>_teacher_overhaul.sql`; tests `web/tests/sql/teacher-overhaul.test.ts`, `web/tests/sql/teacher-board.test.ts`.
- Teacher (new layout): `web/src/teacher/{router,shell,context,rules,activity}.ts`, `web/src/teacher/pages/{overview,pupils,coins,quests,accounts,village,board}.ts`, `web/src/teacher/cards.ts` (print + QR), `web/src/teacher/api.ts` (extended), `web/src/teacher/teacher.css`; `web/src/teacher/teacherView.ts` shrinks to the login + shell start (its sections move into pages).
- Pupil app: `web/src/auth/qrLogin.ts`, `web/src/ui/loginView.ts`, `web/src/api/notice.ts`, `web/src/ui/noticeCard.ts`, `web/src/render/plaza.ts` (note on the board), `web/src/ui/villageView.ts` (`readOnly`), `web/src/main.ts` (view-as entry), `web/src/ui/readOnlyQuests.ts`.
- Tests: `web/tests/teacher/{router,shell,activity,pupils,coins,overview,board,cards}.test.ts`, `web/tests/auth/qrLogin.test.ts`, `web/tests/ui/{noticeCard,readOnlyVillage}.test.ts`.
- `web/e2e/teacher.spec.ts`, `web/dev/teacher.html`, `web/dev/teacher.ts`; docs `docs/SPEC.md` §13, `docs/ANLEITUNG_LEHRKRAFT.md`, `docs/PLAN.md`.

---

### Task 1: Teacher RPCs for pupils, detail and multi booking

**Files:**
- Create: `supabase/migrations/<NNNN>_teacher_overhaul.sql`
- Test: `web/tests/sql/teacher-overhaul.test.ts`

**Interfaces:**
- Produces (SQL):
  ```sql
  public.teacher_class_pupils(p_class_id text, p_week date) returns table (
    id uuid, nickname text, coins int, plot_index int,
    tutorial_step text,          -- 'not_started' | 'intro' | 'quiz' | 'buy' | 'place' | null (= done)
    last_sign_in_at timestamptz, last_answer_at timestamptz,
    quests_solved_week int, quests_offered_week int, holiday_week boolean)
  public.teacher_pupil_detail(p_player_id uuid) returns jsonb
    -- {slots: [{slot, item_id, name_de, rot}], unplaced: [{item_id, name_de, qty}], tutorial_step,
    --  week: [{day, key, solved, catch_up, attempts}], ledger: [{at, delta, reason, ref}] (50, newest first)}
  public.adjust_coins_many(p_player_ids uuid[], p_delta int, p_note text) returns int  -- number booked
  ```
  `p_week` must be a Monday (else `22023 week must be a Monday`). Quests of the week: `daily_quests` with `day` in `[p_week, least(p_week+6, quest_today())]`, `active`; solved = `daily_quest_results.solved_at is not null` for those keys; `holiday_week` = no active quests in the whole week. `tutorial_step`: `tutorial_progress.step` unless `done`; no row and no house placement → `'not_started'`; house placed → `null`. `last_sign_in_at` from `auth.users`.

- [ ] **Step 1: Write the failing tests** (PGlite; extend the auth stub with `auth.users.last_sign_in_at timestamptz`; seed 8a with ANNA (done, house), BEN (tutorial at quiz), CARLA (no row, no house), one 8b pupil; quests Mon–Sun of a week with `quest_today()` fixed to Wednesday):
  - `teacher_class_pupils('8a', monday)` as teacher → three rows, 8b pupil absent; ANNA `tutorial_step null`, BEN `'quiz'`, CARLA `'not_started'`; `quests_offered_week = 9` (Mon–Wed × 3), solved counts match seeded results; catch-up solved on Tuesday for a Monday quest counts once; `last_answer_at` = latest `daily_quest_results` update; holiday week → `holiday_week true`, offered 0.
  - as pupil → `42501`; non-Monday → `22023`.
  - `teacher_pupil_detail(ANNA)` → slots with item names, unplaced = inventory minus placements, week rows, ledger newest first, max 50.
  - `adjust_coins_many([ANNA,BEN], 10, 'Schnellbuchung +10')` → 2, two `coin_ledger` rows `reason teacher`, `created_by` teacher; `[ANNA,BEN], -500` with BEN too poor → error `insufficient coins: BEN`, **no** row for ANNA either (Review Focus 2); duplicate ids → error; empty list → error; a teacher id in the list → error `pupil not found`; empty note → `a note is required`.
- [ ] **Step 2: Run** `npx vitest run tests/sql/teacher-overhaul.test.ts` — FAIL.
- [ ] **Step 3: Implement** the three functions (`adjust_coins_many` locks all profiles `for update` in id order to avoid deadlocks, checks all, then books).
- [ ] **Step 4: Run** — PASS; add the migration to `migrations.test.ts`; `npm test` green.
- [ ] **Step 5: Commit** `git add supabase/migrations/*_teacher_overhaul.sql web/tests/sql/teacher-overhaul.test.ts web/tests/sql/migrations.test.ts && git commit -m "feat(db): teacher rpcs for pupil overview, detail and multi booking"`

---

### Task 2: Board, notice and read-only RPCs

**Files:**
- Modify: `supabase/migrations/<NNNN>_teacher_overhaul.sql`
- Test: `web/tests/sql/teacher-board.test.ts`

**Interfaces:**
- Produces (SQL):
  ```sql
  public.class_board(p_class_id text) returns jsonb
    -- {week: date, solved_week int, goal_week int, solved_today int, class_streak int, stamps_week int, notice: text|null}
    -- goal_week = pupils × active quests of the week up to today; class_streak per spec §9
  create table class_notices (class_id text primary key references classes, text text not null check (length(text) between 1 and 140),
    valid_until date not null, created_by uuid, created_at timestamptz default now());
  -- RLS: pupils select own class row while valid_until >= quest_today(); teacher selects all; no client writes
  public.set_class_notice(p_class_id text, p_text text, p_valid_until date) returns void   -- null text = delete; valid_until default quest_today()+7
  public.teacher_village_members(p_class_id text) returns setof <same columns as village_members()>
  public.teacher_pupil_quests(p_player_id uuid) returns jsonb  -- today + yesterday: [{key, day, catch_up, type, prompt, solved, attempts}], never hint or solution
  ```

- [ ] **Step 1: Write the failing tests:** `class_board` totals for a seeded week; the JSON has exactly the keys above (Review Focus 3: no array of pupils, no nicknames anywhere in the text of the result); class streak: Mon–Wed with ≥ half solving → 3, a Tuesday with less than half → streak counts from Wednesday, weekend/holiday days skipped; `set_class_notice` as teacher stores, as pupil fails; text of 141 chars fails; pupil of 8a reads the 8a notice, not the 8b one, and nothing after `valid_until`; `set_class_notice(…, null, null)` deletes; `teacher_village_members('8b')` returns 8b members without coins; `teacher_pupil_quests` contains no `hint`, `solution` or `answer` keys.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS, `npm test` green.
- [ ] **Step 5: Commit** `git add supabase/migrations/*_teacher_overhaul.sql web/tests/sql/teacher-board.test.ts && git commit -m "feat(db): class board, class notice and read-only teacher views"`

---

### Task 3: Shell, router and the moved pages

**Files:**
- Create: `web/src/teacher/{router,shell,context,rules}.ts`, `web/src/teacher/pages/{quests,accounts,village}.ts`
- Modify: `web/src/teacher/teacherView.ts`, `web/src/teacher/teacher.css`
- Test: `web/tests/teacher/router.test.ts`, `web/tests/teacher/shell.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  export type ClassId = '8a' | '8b';
  export type PageId = 'uebersicht' | 'schueler' | 'muenzen' | 'quests' | 'konten' | 'dorf' | 'tafel';
  export function parseRoute(hash: string): { classId: ClassId; page: PageId; pupil?: string };  // default 8a/uebersicht; unknown → default
  export function routeHash(r: { classId: ClassId; page: PageId; pupil?: string }): string;      // "#8a/schueler/<id>"
  export interface TeacherContext { supabase: SupabaseClient; classId: ClassId; status(text: string, kind?: 'ok' | 'error'): void; go(page: PageId, pupil?: string): void; refresh(): void }
  export interface TeacherPage { title: string; mount(host: HTMLElement, ctx: TeacherContext): Promise<void> | void; unmount?(): void }
  export const PAGES: Record<PageId, () => Promise<TeacherPage>>;   // lazy imports
  export function mountShell(root: HTMLElement, supabase: SupabaseClient): { dispose(): void };
  ```

- [ ] **Step 1: Write the failing tests:** `parseRoute('#8b/muenzen')` → 8b/muenzen; `''`/garbage → 8a/uebersicht; round trip with `routeHash`; shell renders the six nav entries in spec order with `aria-current="page"` on the active one, a class switch with both classes, `Abmelden`; changing class keeps the page; `hashchange` mounts the new page and unmounts the old; `tafel` hides nav and header (class `board-mode`); below 1 024 px the nav is behind `Menü` (`aria-expanded`); status region `role="status"` per page.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the shell and router; move the existing section code from `teacherView.ts` **unchanged in behaviour** into `pages/accounts.ts` (create single/list, cards print stays as is for now, reset, delete), `pages/village.ts` (switches, template + seed, rules, sold items), `pages/quests.ts` (wraps `renderQuestPanel`). Stamps and free correction move in Task 6; until then keep them on a temporary `muenzen` page with the old markup. Delete the old stats section and its wiring (the `task_stats` RPC and `loadTaskStats` stay). `teacherView.ts` keeps login and calls `mountShell` after sign-in.
- [ ] **Step 4: Run** — PASS; `npm test`, build green; open `/lehrer/` in the dev server and click every page once (no console errors).
- [ ] **Step 5: Commit** `git add web/src/teacher web/tests/teacher/router.test.ts web/tests/teacher/shell.test.ts && git commit -m "feat(teacher): page shell with navigation and router"`

---

### Task 4: Activity helpers

**Files:**
- Create: `web/src/teacher/activity.ts`
- Modify: `web/src/teacher/api.ts`
- Test: `web/tests/teacher/activity.test.ts` (node)

**Interfaces:**
- Produces:
  ```ts
  export interface PupilRow { id: string; nickname: string; coins: number; plotIndex: number | null; tutorialStep: TutorialStepId | null;
    lastSignInAt: string | null; lastAnswerAt: string | null; questsSolvedWeek: number; questsOfferedWeek: number; holidayWeek: boolean }
  export type TutorialStepId = 'not_started' | 'intro' | 'quiz' | 'buy' | 'place';
  export function lastActive(r: PupilRow): Date | null;                      // max of both timestamps
  export function activeLabel(last: Date | null, now: Date): string;        // heute | gestern | vor n Tagen | noch nie (Berlin days)
  export function inactiveHint(r: PupilRow, now: Date): string | null;      // "seit n Tagen nicht aktiv" for n ≥ 5, null in holiday weeks
  export function plotLabel(r: PupilRow): string;                           // "Nr. 7" or "Tutorial: Quiz"
  export function questsLabel(r: PupilRow): string;                         // "12 / 21" or "Ferien"
  export function mondayOf(d: Date): string;                                // YYYY-MM-DD Berlin (reuse week.ts if it has one)
  // api.ts
  export function loadClassPupils(s: SupabaseClient, classId: ClassId, week: string): Promise<Result<PupilRow[]>>;
  export function loadPupilDetail(s: SupabaseClient, id: string): Promise<Result<PupilDetail>>;
  export function adjustCoinsMany(s: SupabaseClient, ids: string[], delta: number, note: string): Promise<Result<number>>;
  export function loadClassBoard(s: SupabaseClient, classId: ClassId): Promise<Result<ClassBoard>>;
  export function setClassNotice(s: SupabaseClient, classId: ClassId, text: string | null, validUntil: string | null): Promise<Result<true>>;
  ```

- [ ] **Step 1: Write the failing tests:** `activeLabel` across midnight in Berlin (23:30 yesterday vs 00:10 today → `gestern`), DST change on 25.10.2026, `null` → `noch nie`; `inactiveHint` 4 days → null, 6 days → `seit 6 Tagen nicht aktiv`, holiday → null; `plotLabel` for every step; `questsLabel` normal and holiday; api functions map snake_case and errors with a stub client.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/teacher/activity.ts web/src/teacher/api.ts web/tests/teacher/activity.test.ts && git commit -m "feat(teacher): activity labels and new api calls"`

---

### Task 5: Pupils page with details and ledger

**Files:**
- Create: `web/src/teacher/pages/pupils.ts`
- Modify: `web/src/teacher/teacher.css`
- Test: `web/tests/teacher/pupils.test.ts` (happy-dom, fake api)

**Interfaces:**
- Consumes: Task 4. Produces: page `schueler`; route `#8a/schueler/<id>` opens the detail; button `Als Schüler ansehen` opens `/?ansehen=<id>` in a new tab (Task 11).

- [ ] **Step 1: Write the failing tests:** table with semantic `th` headers in spec order, rows sorted by nickname (locale `de`), search filters live (case-insensitive), filter `Tutorial offen` shows only rows with a step, `Nicht aktiv` only rows with a hint; hint text visible in the row (not colour only); `Details` sets the route and shows the side panel with slots, unplaced items, tutorial step, week table, ledger (date `TT.MM. HH:MM`, delta with sign, reason label: `teacher` → `Lehrkraft`, `quest` → `Quest`, `stamp` → `Stempel`, `purchase` → `Kauf`, `tutorial` → `Tutorial`, `refund` → `Erstattung`, `chest` → `Truhe`); a failing detail part shows its own error while the others render; no element contains `@lerndorf.local` or a password field.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/teacher/pages/pupils.ts web/src/teacher/teacher.css web/tests/teacher/pupils.test.ts && git commit -m "feat(teacher): pupils page with activity, details and ledger"`

---

### Task 6: Coins & stamps page (quick, reasons, multi, undo, tablet)

**Files:**
- Create: `web/src/teacher/pages/coins.ts`
- Modify: `web/src/teacher/teacher.css`, `web/src/teacher/rules.ts`
- Test: `web/tests/teacher/coins.test.ts` (happy-dom, fake api)

**Interfaces:**
- Produces:
  ```ts
  export const QUICK_AMOUNTS = [5, 10, 20, 100, -5, -10] as const;
  export const MULTI_AMOUNTS = [5, 10, 20, 100] as const;
  export const REASONS = ['Mitarbeit', 'Hausaufgabe', 'Hilfsbereit', 'Verhalten'] as const;
  export const UNDO_SECONDS = 10;
  export function bookingNote(delta: number, reason: string | null): string;   // "Schnellbuchung +10 · Mitarbeit", "Schnellbuchung −5"
  ```

- [ ] **Step 1: Write the failing tests:**
  - each row: six buttons with exact labels and aria names; `−10` disabled when coins < 10.
  - click `+20` → `adjustCoins(id, 20, 'Schnellbuchung +20')`; with reason `Mitarbeit` selected → note `Schnellbuchung +20 · Mitarbeit`; row coins update only after success; failure → row unchanged, status error.
  - double click `+20` → one call (Review Focus 1); the row's buttons are disabled while pending.
  - status `+20 Münzen für Lea (Mitarbeit)` with `Rückgängig`; click → `adjustCoins(id, -20, 'Rückgängig: Schnellbuchung +20 · Mitarbeit')`; after 10 s (fake timers) the undo button is gone; undo failing → message with the server reason, coins unchanged (Review Focus 2).
  - multi: checkboxes + `alle`; bar `Für 3 markierte:` with four buttons; click `+10` → one `adjustCoinsMany` with the three ids; status `+10 Münzen für 3 Schüler`; undo calls `adjustCoinsMany(ids, -10, 'Rückgängig: …')`; bar hidden with 0 marked.
  - free correction (amount + required note) and stamps (Monday picker, booked greyed) behave as before (port the old tests/behaviour).
  - layout at 800 px width (set `window.innerWidth` + class check): rows switch to the stacked layout class `coins--narrow`; all buttons have class `btn-touch` (≥ 44 px in CSS).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (move stamps and free correction from the temporary page here; CSS grid that wraps the six buttons into two rows of three below 1 024 px, 8 px gaps).
- [ ] **Step 4: Run** — PASS; manual check in the dev server at 820 × 1180 and 1180 × 820.
- [ ] **Step 5: Commit** `git add web/src/teacher/pages/coins.ts web/src/teacher/rules.ts web/src/teacher/teacher.css web/tests/teacher/coins.test.ts && git commit -m "feat(teacher): quick and multi bookings with reasons and undo"`

---

### Task 7: Overview page with notice editor

**Files:**
- Create: `web/src/teacher/pages/overview.ts`
- Test: `web/tests/teacher/overview.test.ts` (happy-dom)

- [ ] **Step 1: Write the failing tests:** tiles `Schüler`, `Tutorial noch nicht fertig` (link to `#8a/schueler?filter=tutorial` → pupils page applies the filter), `Nicht aktiv seit 5 Tagen oder mehr` (link with `filter=inaktiv`), `Stempel diese Woche` (`x von y`), Daily-Quests line from `quest_status()` (`vorhanden bis So 08.11.` or the warning); a failing source shows `nicht verfügbar` only in its tile; notice editor: counter `<n>/140`, `Veröffentlichen` disabled when empty or > 140, date default today + 7, `Entfernen` only with an active notice, calls `setClassNotice`; button `Tafelmodus` routes to `tafel`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (extend `parseRoute` with an optional `filter` query in the hash; test it in `router.test.ts`). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/teacher/pages/overview.ts web/src/teacher/router.ts web/tests/teacher/overview.test.ts web/tests/teacher/router.test.ts && git commit -m "feat(teacher): overview with class figures and village notice"`

---

### Task 8: Board mode

**Files:**
- Create: `web/src/teacher/pages/board.ts`
- Modify: `web/src/teacher/teacher.css`
- Test: `web/tests/teacher/board.test.ts` (happy-dom, fake timers)

- [ ] **Step 1: Write the failing tests:** renders `8a · Woche ab 26.10.`, `Quests diese Woche` with `312 von 504` and a `progressbar` (`aria-valuenow`), `Heute`, `Klassen-Serie` with `🔥 6`, `Stempel diese Woche: 18`, notice text when present; the DOM contains no nickname of the fake class and no `Münzen` (Review Focus 3); reloads every 60 s; `Escape` and `Zurück` route to `uebersicht`; `Vollbild` calls `requestFullscreen` when available and is hidden otherwise.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (font sizes in `clamp()` for 1080p beamers; high contrast; reduced motion: no bar animation). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/teacher/pages/board.ts web/src/teacher/teacher.css web/tests/teacher/board.test.ts && git commit -m "feat(teacher): board mode for the whole class"`

---

### Task 9: Notice in the pupil game

**Files:**
- Create: `web/src/api/notice.ts`, `web/src/ui/noticeCard.ts`
- Modify: `web/src/render/plaza.ts` (note mesh on the board), `web/src/ui/villageView.ts`, `web/src/style.css`
- Test: `web/tests/ui/noticeCard.test.ts` (happy-dom), extend `web/tests/render/` with `noticeNote.test.ts` (node)

**Interfaces:**
- Produces:
  ```ts
  export interface ClassNotice { text: string; validUntil: string; createdAt: string }
  export function loadClassNotice(s: SupabaseClient, classId: string): Promise<ClassNotice | null>;  // errors → null
  export function noticeSeenKey(n: ClassNotice): string;            // "lerndorf.notice." + createdAt
  export function openNoticeCard(n: ClassNotice, opts: { store?: Pick<Storage,'getItem'|'setItem'> | null; onDone: () => void }): ModalHandle | null; // null when already seen
  // plaza.ts
  export function setBoardNote(plaza: THREE.Object3D, text: string | null): void;   // one plane with a CanvasTexture on the board front; null removes it
  ```

- [ ] **Step 1: Write the failing tests:** card shows title `Nachricht von deiner Lehrkraft`, the text via `textContent` (`<b>` stays literal), `OK` closes and stores the seen key; second call → `null`; throwing store → card shows and nothing throws; `setBoardNote` adds exactly one mesh named `boardNote` (one draw call), replacing it on a second call, removing it with `null`, and disposes the old texture.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** and wire in `villageView.ts`: after the village is ready and the tutorial is not running, `loadClassNotice` → `setBoardNote` + `openNoticeCard` (after the welcome card of the XP feature if present; order: notice first). In tutorial: only the board note, the card waits until the tutorial ends.
- [ ] **Step 4: Run** — PASS; `npm run galerie` (board note visible, readable, not z-fighting).
- [ ] **Step 5: Commit** `git add web/src/api/notice.ts web/src/ui/noticeCard.ts web/src/render/plaza.ts web/src/ui/villageView.ts web/src/style.css web/tests/ui/noticeCard.test.ts web/tests/render/noticeNote.test.ts && git commit -m "feat(village): class notice on the board and as a one-time card"`

---

### Task 10: QR codes on access cards and login by fragment

**Files:**
- Create: `web/src/teacher/cards.ts`, `web/src/auth/qrLogin.ts`
- Modify: `web/package.json` (+ `qrcode-generator@1.4.4`), `web/src/teacher/pages/accounts.ts`, `web/src/ui/loginView.ts`, `web/src/main.ts`, licence list
- Test: `web/tests/teacher/cards.test.ts`, `web/tests/auth/qrLogin.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  // qrLogin.ts
  export function encodeLogin(nickname: string, password: string): string;       // base64url of JSON {n,p}
  export function decodeLogin(fragment: string): { nickname: string; password: string } | null;  // "#login=…" → values; invalid → null
  export function loginUrl(base: string, nickname: string, password: string): string;          // `${base}#login=${encodeLogin(...)}`
  /** reads location.hash, clears it with history.replaceState, returns the credentials once */
  export function takeLoginFragment(loc?: Location, hist?: History): { nickname: string; password: string } | null;
  // cards.ts
  export function renderCards(cards: Array<{ nickname: string; password: string; classId: string }>, base: string): HTMLElement; // print layout with QR svg per card + hint
  ```

- [ ] **Step 1: Write the failing tests:** round trip with umlauts and special characters in the password; garbage → `null`; `takeLoginFragment` returns the values, afterwards `location.hash === ''` and `replaceState` was called with a URL without `#` (Review Focus 4); login view: with a fragment it signs in automatically (spy on `signInWithPassword` only); on failure the nickname field is filled, the password field empty, the normal error text shows; cards: one `svg` QR per card, the hint text, the URL inside the QR decodes back (use the library's data model in the test, not an image).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; `main.ts` calls `takeLoginFragment()` before anything else renders. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/package.json web/package-lock.json web/src/teacher/cards.ts web/src/teacher/pages/accounts.ts web/src/auth/qrLogin.ts web/src/ui/loginView.ts web/src/main.ts web/tests/teacher/cards.test.ts web/tests/auth/qrLogin.test.ts blender/sources/LICENSES.md && git commit -m "feat(accounts): QR codes on access cards, login by fragment"`

---

### Task 11: View as pupil (read-only village)

**Files:**
- Create: `web/src/ui/readOnlyQuests.ts`
- Modify: `web/src/ui/villageView.ts` (option `readOnly`), `web/src/main.ts` (`?ansehen=<id>` for teacher sessions), `web/src/api/village.ts` (teacher variants), `web/src/style.css`
- Test: `web/tests/ui/readOnlyVillage.test.ts` (happy-dom, stubs for WebGL like `villageTutorial.test.ts`)

**Interfaces:**
- Produces:
  ```ts
  export interface ReadOnlyView { pupilId: string; nickname: string; classId: string; plotIndex: number | null; onExit: () => void }
  // mountVillage(root, supabase, onLogout, opts?: { readOnly?: ReadOnlyView })
  // api/village.ts
  export function loadMembersAsTeacher(s: SupabaseClient, classId: string): Promise<Member[]>;   // teacher_village_members
  // readOnlyQuests.ts
  export function openReadOnlyQuests(s: SupabaseClient, pupilId: string, nickname: string, onClose: () => void): AreaHandle; // teacher_pupil_quests, list only
  ```

- [ ] **Step 1: Write the failing tests:** with `readOnly`: band `Ansicht von Lea – nur ansehen` + `Zurück zum Lehrerbereich` (calls `onExit`); nav shows only `Dorf` and `Aufgaben`; `Aufgaben` opens the read-only list (no answer forms, no `Prüfen`); no tutorial start, no build mode, no shop/profile/avatar badge; taps on the own plot do nothing; across the whole mount no call to `rpc()` other than `teacher_village_members` and `teacher_pupil_quests`, and no `insert/update/delete` (Review Focus 5); `main.ts`: `?ansehen=<id>` with a pupil session → ignored (normal village), with a teacher session → read-only view.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (profile of the pupil read by the teacher via `profiles`; class and placements as today; camera starts at the pupil's plot). **Step 4: Run** — PASS; `npm run build`.
- [ ] **Step 5: Commit** `git add web/src/ui/readOnlyQuests.ts web/src/ui/villageView.ts web/src/main.ts web/src/api/village.ts web/src/style.css web/tests/ui/readOnlyVillage.test.ts && git commit -m "feat(teacher): view the village as a pupil, read-only"`

---

### Task 12: Screenshots, guide and docs

**Files:**
- Create: `web/dev/teacher.html`, `web/dev/teacher.ts`, `web/e2e/teacher.spec.ts`
- Modify: `web/playwright.config.ts`, `docs/SPEC.md` (§13, §8 RPC table), `docs/ANLEITUNG_LEHRKRAFT.md`, `docs/PLAN.md`, spec status line

- [ ] **Step 1: `dev/teacher.ts`** mounts the shell with a fake Supabase (12 pupils with mixed activity, one in the tutorial, two inactive, a notice, a holiday flag switch via `?holiday=1`).
- [ ] **Step 2: `e2e/teacher.spec.ts`:** at 1440 × 900 shots of every page, the pupil detail, the undo status, the multi bar; at 820 × 1180 and 1180 × 820 the coins page (assert every quick button ≥ 44 × 44 px and no horizontal scroll); the board page at 1920 × 1080 (assert no nickname text in the page). Fail on page errors.
- [ ] **Step 3: Run** — green; look at every picture.
- [ ] **Step 4: Full check** `npm test && npm run build && npx eslint src tests` — green.
- [ ] **Step 5: Docs:** `docs/SPEC.md` §13 rewritten to the six pages + board (short, link to the spec), RPC table rows for the new functions; `docs/ANLEITUNG_LEHRKRAFT.md` new chapter „Lehrerbereich benutzen“ (pages, quick bookings with reasons and undo, board mode at the interactive whiteboard, notice, QR cards, view as pupil) in plain German, step by step; `docs/PLAN.md` block `## Zwischenpaket L – Lehrerbereich` with L.1–L.12 `[x]`, `[ ] L.13 | LK | Migration einspielen (Anleitung) |`, `[ ] L.14 | LK | **Abnahme Lehrerbereich** (Spec §14), Münzseite am Tablet, Tafelmodus am Beamer |`; spec status line `Umgesetzt laut Plan 2026-10-25; Migration (L.13) und Abnahme (L.14) stehen aus.`
- [ ] **Step 6: Commit** `git add web/dev/teacher.html web/dev/teacher.ts web/e2e/teacher.spec.ts web/playwright.config.ts docs/SPEC.md docs/ANLEITUNG_LEHRKRAFT.md docs/PLAN.md docs/superpowers/specs/2026-10-21-teacher-ui-design.md && git commit -m "test(e2e): teacher area screenshots; guide and docs"`
- [ ] **Step 7: Report to the teacher in German:** what is new per page, how to apply the migration (step by step, after the previous ones), that QR codes only appear on cards printed right after creating or resetting, where the screenshots are, and the checklist for L.14.

---

## Self-review

- Spec §2 items: 1 activity → Tasks 1, 4, 5; 3 multi → Tasks 1, 6; 4 reasons → Task 6; 5 undo → Task 6; 6 board → Tasks 2, 8; 7 notice → Tasks 2, 7, 9; 8 QR → Task 10; 9 view as pupil → Tasks 2, 11; 10 ledger → Tasks 1, 5; 11 tablet coins → Task 6, 12; Fassung-1 items (nav, pupil state, quick amounts, auto note, disabled deduction, free correction, stamps, no secrets) → Tasks 3, 5, 6; old statistics removed → Task 3.
- §4 pages + URL state → Task 3; §5 overview → Task 7; §6 table, activity definitions, details → Tasks 1, 4, 5; §7 → Task 6; §8 → Task 3; §9 → Tasks 2, 8; §10 → Tasks 2, 7, 9; §11 → Task 10; §12 → Tasks 2, 11; §13 RPCs → Tasks 1, 2; §14 acceptance → Task 12 + L.14.
- Names defined once: `teacher_class_pupils`, `teacher_pupil_detail`, `adjust_coins_many`, `class_board`, `class_notices`, `set_class_notice`, `teacher_village_members`, `teacher_pupil_quests`, `PageId`, `TeacherContext`, `TeacherPage`, `PupilRow`, `activeLabel`, `inactiveHint`, `bookingNote`, `QUICK_AMOUNTS`, `MULTI_AMOUNTS`, `REASONS`, `ClassNotice`, `setBoardNote`, `takeLoginFragment`, `renderCards`, `ReadOnlyView`.
