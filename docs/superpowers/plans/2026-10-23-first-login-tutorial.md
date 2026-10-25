# Erststart-Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Schüler ohne platziertes Haus durchlaufen ein geführtes Erststart-Tutorial (Figur, Kamerafahrt zur Ruine, 5 Fragen, 50 Münzen, Hauskauf, Platzieren, Tanz, Daily Quests).

**Architecture:** Serverseitiger Tutorialstatus (`tutorial_progress`) mit SECURITY-DEFINER-RPCs für Grundstück, Fragen, Gutschrift, Kauf und Platzierung. Der Client (`web/src/ui/tutorial/`) ist eine Zustandsmaschine über `tutorial_state()` und nutzt Dorf, Kamera, Figurwähler, Quiz-Formulare und Baumodus wieder. Die Ruine (`render/ruin.ts`, schon gebaut) steht client-seitig im leeren Haus-Slot.

**Tech Stack:** TypeScript strict, Vite, three.js 0.170, Supabase (Postgres/RLS/RPC), Vitest + PGlite, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md` (§9 gilt zuerst)

## Global Constraints

- Münzen, Besitz, Platzierungen und Tutorialstatus ändern sich **nur über RPCs**; jede neue Tabelle hat RLS (CLAUDE.md).
- Lösungen nie an den Client, auch nicht bei falscher Antwort; nur der englische Hinweis.
- Gutschrift **50 Münzen** einmalig; Fachwerkhaus `house_fachwerk` **50 Münzen**, `starter = false`.
- Tutorial-Kauf/-Platzierung auch bei `shop_open = false` / `build_open = false`, aber nur für `house_fachwerk` im Slot `house` im jeweiligen Schritt.
- Grundstück: niedrigster freier Index 0–33 je Klasse, atomar.
- Nur CC0-Modelle/-Grafik oder eigene; jede Quelle in `blender/sources/LICENSES.md`. Comic Neue (SIL OFL) mitliefern, Fallback `'Comic Sans MS', cursive`.
- UI-Texte Deutsch, einfache Sprache; Aufgaben Englisch; Code/Kommentare Englisch. Zeitzone Europe/Berlin. Kein `Math.random` in `world/`.
- Nach jeder Änderung an Rendering: `npm run galerie` und Bilder ansehen. Vor Abschluss: `npx tsc --noEmit`, ESLint, `npm test`, `npm run build`, Playwright-Screenshots (Tablet 1024×768).
- Arbeiten auf Branch `feature/first-login-tutorial`; **nichts auf `main` pushen** (Migrationen laufen dort automatisch).
- Migration **0019_first_login_tutorial.sql** (nächste freie Nummer); SQL-Tests laden alle Migrationen bis dahin (Muster `web/tests/sql/claim-plot.test.ts`).

## Review Focus

- Zwei Schüler loggen gleichzeitig zum ersten Mal ein → verschiedene Plätze; Klasse voll (34 belegt) → klarer Fehler statt Absturz.
- Schüler lädt/loggt mitten im Quiz neu → gleiche Frage, Fortschritt bleibt, keine zweite Gutschrift.
- `tutorial_answer` doppelt gesendet (Doppeltipp) nach der fünften Frage → genau 50 Münzen.
- Kauf doppelt gesendet oder bei zu wenig Münzen → nur ein Haus, keine negative Münzzahl.
- Schüler ruft Tutorial-RPCs außerhalb des passenden Schritts auf (Kauf vor dem Quiz, Platzieren ohne Kauf) → Fehler.
- Lehrkraft/Nicht-Schüler und Schüler mit platziertem Haus → `needed = false`, keine Wirkung.
- „Bewegung reduzieren“ an; Tablet-Hochformat; Sprechblase mit langem Text läuft nicht aus dem Bild.

---

### Task 0: Ruine (erledigt, wartet auf Abnahme)

**Files:** `web/src/render/ruin.ts`, `web/src/render/plotAssets.ts` (Id `ruin`), `web/src/render/kenney.ts` (Pack `graveyard`), `web/public/assets/kenney/{town,survival,graveyard}/*.glb`, `web/dev/galerie.ts` (`?ruin=1`, Ansicht `ruin`), `docs/img/ruine_vorschau_*.png`.

- [x] Ruine aus Kenney-Teilen gebaut, Vorschau gerendert.
- [ ] Nach OK der Lehrkraft: Test `web/tests/render/ruin.test.ts` (alle `RUIN_PARTS` innerhalb 6,0 × 4,0 m, y ≥ 0; Teilenamen existieren als Datei unter `public/assets/kenney/<pack>/`), Lizenzzeilen in `blender/sources/LICENSES.md` (Fantasy Town, Survival, Graveyard: neue Dateien), Commit.

### Task 1: Datenmodell, Fragen, Katalog (Migration 0019)

**Files:**
- Create: `supabase/migrations/0019_first_login_tutorial.sql`
- Test: `web/tests/sql/tutorial-schema.test.ts`

**Interfaces:**
- Produces: Tabellen `tutorial_progress(player_id uuid pk references profiles on delete cascade, step text check in ('intro','quiz','buy','place','done') default 'intro', answered int default 0, reward_paid bool default false, house_bought bool default false, completed_at timestamptz)`, `tutorial_questions(nr int pk, type text, prompt text, data jsonb, hint text)`, `tutorial_solutions(nr int pk references tutorial_questions, solution jsonb)`; `coin_ledger.reason` erlaubt zusätzlich `'tutorial'` mit `unique index on coin_ledger (player_id) where reason = 'tutorial'`; `items.house_fachwerk`: `starter=false, price=50`.

- [ ] **Step 1: Failing test** `tutorial-schema.test.ts` (PGlite, Migrationen 0001–0019): `it('questions: five rows, numbered 1..5, solutions in a separate table')`; `it('pupil cannot select tutorial_solutions or tutorial_questions')` (als Rolle `authenticated` → Fehler/0 Zeilen); `it('pupil can read only own tutorial_progress row, cannot insert/update it')`; `it('house_fachwerk costs 50 and is no starter')`; `it('coin_ledger accepts reason tutorial once per player')`.
- [ ] **Step 2:** `cd web && npx vitest run tests/sql/tutorial-schema.test.ts` → FAIL (Migration fehlt).
- [ ] **Step 3: Migration schreiben.** RLS an allen drei Tabellen; Policy `select` auf `tutorial_progress` mit `player_id = auth.uid()`; Fragen laut Spec §5 (`type`: `choice`, `gap`, `match`, `listening`; `data` im Format der Daily Quests, Beispiel für `listening` in `0015_daily_quests.sql` nachsehen, `data->>'mode'` = `choice`; Tonausgabe liest `web/src/quests/speech.ts`); `update items set starter=false, price=50 where id='house_fachwerk'`; Grants nach dem Muster von 0005 (`revoke all … from anon, authenticated` auf Tabellen ohne Policy).
- [ ] **Step 4:** Test → PASS. `npx vitest run tests/sql` → alles grün (bestehende Tests, die `house_fachwerk` als Starter erwarten, in diesem Schritt anpassen).
- [ ] **Step 5: Commit** `feat(db): tutorial tables, questions, fachwerk house costs 50`.

### Task 2: RPC `tutorial_state` und `tutorial_start` (Grundstück atomar)

**Files:**
- Modify: `supabase/migrations/0019_first_login_tutorial.sql`
- Test: `web/tests/sql/tutorial-start.test.ts`

**Interfaces:**
- Produces: `tutorial_state() returns jsonb` = `{needed bool, step text, plot_index int|null, character text|null, answered int}`; `tutorial_start() returns jsonb` (gleiches Format). `claim_plot` löst für Schüler `forbidden` aus (`errcode 42501`, Text „plot is assigned automatically“).

- [ ] **Step 1: Failing tests:** `needed=false` für Lehrkraft; `needed=false` und Zeile `done` für Schüler mit Eintrag in `placements(slot='house')`; `needed=true, step='intro'` für neuen Schüler; `tutorial_start` vergibt Index 0, zweiter Schüler Index 1; erster Schüler ruft erneut auf → bleibt 0; Lücke (Index 0 frei gemacht) → niedrigster freie; alle 34 belegt → Fehler `errcode 53400` „village is full“; `claim_plot` als Schüler → Fehler; zwei Klassen unabhängig.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren.** `tutorial_start` nimmt `pg_advisory_xact_lock(hashtext('plots:' || class_id))`, wählt `min(g) from generate_series(0,33) g where not exists (… profiles …)`, legt `tutorial_progress` an (`on conflict do nothing`). Der Client-Aufruf setzt den Schritt nicht selbst; `intro` bleibt, bis `tutorial_continue` (Task 4) ihn weiterschaltet.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: Commit** `feat(db): tutorial_state, tutorial_start, automatic plot`.

### Task 3: RPC `tutorial_question` und `tutorial_answer` (Quiz, 50 Münzen)

**Files:**
- Modify: `supabase/migrations/0019_first_login_tutorial.sql`
- Test: `web/tests/sql/tutorial-quiz.test.ts`

**Interfaces:**
- Consumes: `answer_matches` / `quest_answer_matches` (0007/0016).
- Produces: `tutorial_continue(p_from text) returns jsonb` (schaltet `intro → quiz`, nur wenn `step = p_from = 'intro'` und Grundstück vergeben); `tutorial_question() returns jsonb` = `{nr, total:5, type, prompt, data}` ohne Lösung/Hinweis (Fehler, wenn `step <> 'quiz'`); `tutorial_answer(p_nr int, p_answer jsonb) returns jsonb` = `{correct bool, hint text|null, answered int, done bool, coins int, reward int}`.

- [ ] **Step 1: Failing tests:** Frage 1 ohne `solution`/`hint`-Schlüssel; falsche Antwort → `correct=false`, `hint='You live in it.'`, `answered` bleibt 0, beliebig oft wiederholbar; richtige Antwort erhöht `answered`; `p_nr` ≠ aktuelle Frage → Fehler; nach Antwort 5 `done=true`, `coins=50`, Zeile im Ledger `reason='tutorial'`, Schritt `buy`; fünfte Antwort wiederholt → `reward=0`, Münzen weiter 50; `tutorial_question` im Schritt `buy` → Fehler; alle fünf Typen (inkl. `match` mit Paaren, `listening`) werden richtig bewertet.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren** mit `select … for update` auf der Fortschrittszeile; Auszahlung nur wenn `not reward_paid`, dann Ledger-Insert + `profiles.coins` und `reward_paid = true` in einer Transaktion.
- [ ] **Step 4:** Test → PASS.
- [ ] **Step 5: Commit** `feat(db): tutorial quiz and one-time 50 coins`.

### Task 4: RPC `tutorial_buy_house`, `tutorial_place_house`, `tutorial_finish`

**Files:**
- Modify: `supabase/migrations/0019_first_login_tutorial.sql`
- Test: `web/tests/sql/tutorial-house.test.ts`

**Interfaces:**
- Produces: `tutorial_buy_house() returns jsonb {coins, qty}` (nur Schritt `buy`; schaltet auf `place`; bei bereits gekauftem Haus kein zweiter Abzug, nur Schritt weiterschalten); `tutorial_place_house() returns bigint` (nur Schritt `place` und `house_bought`; legt `placements(house_fachwerk, 'house', 0)` an, Schritt `done`, `completed_at = now()`); `tutorial_finish() returns jsonb` (idempotent, nur wenn `done`).

- [ ] **Step 1: Failing tests:** Kauf bei `shop_open=false` im Schritt `buy` klappt, Münzen 0, Inventar `house_fachwerk` qty 1; Kauf im Schritt `quiz` → Fehler; zweiter Kauf → kein zweiter Abzug; Platzieren bei `build_open=false` klappt im Schritt `place`; `buy_item('house_fachwerk')` bei `shop_open=false` weiter Fehler; `place_in_slot('house_fachwerk','house',0)` bei `build_open=false` weiter Fehler; `clear_slot('house')` weiter Fehler; danach `tutorial_state().needed=false`; Spaltenabfrage: `village_members()` liefert den Slot `house` des Schülers (Ruine verschwindet für Mitschüler).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren** (Münzabzug über dieselbe Ledger-Logik wie `buy_item`, Reason `purchase`, Ref `house_fachwerk`).
- [ ] **Step 4:** Test → PASS; `npx vitest run tests/sql` komplett grün.
- [ ] **Step 5: Commit** `feat(db): tutorial buy and place house with narrow exceptions`.

### Task 5: Client-API und Haus-Fallback = Ruine

**Files:**
- Create: `web/src/api/tutorial.ts`
- Modify: `web/src/api/build.ts` (`shownItem`), `web/src/world/plotPlan.ts` (`STARTER.house` entfernen), `web/src/api/village.ts` (`claimPlot` entfernen oder auf Fehler stellen)
- Test: `web/tests/quests/tutorialApi.test.ts`, `web/tests/render/shownItem.test.ts`

**Interfaces:**
- Produces in `api/tutorial.ts`: `type TutorialStep = 'intro'|'quiz'|'buy'|'place'|'done'`; `interface TutorialState {needed:boolean; step:TutorialStep; plotIndex:number|null; character:CharacterKind|null; answered:number}`; `getTutorialState(sb): Promise<Result<TutorialState>>`, `startTutorial(sb)`, `continueTutorial(sb, from)`, `getTutorialQuestion(sb): Promise<Result<TutorialQuestion>>`, `answerTutorial(sb, nr, answer): Promise<Result<{correct:boolean; hint:string|null; answered:number; done:boolean; coins:number}>>`, `buyTutorialHouse(sb)`, `placeTutorialHouse(sb)`, `finishTutorial(sb)`; `Result<T>` wie in `api/build.ts`. Deutsche Fehlertexte über `explain`-Muster aus `api/build.ts`.
- `shownItem(slots, 'house', 'house')` ohne Platzierung → `{itemId: RUIN_ID, rot: 0}`; Garage weiter Starter.

- [ ] **Step 1: Failing tests** mit gemocktem Supabase-Client (Muster `tests/quests/api.test.ts`): jede Funktion ruft die richtige RPC mit richtigen Parametern auf und mappt snake_case → camelCase; Fehler → `{ok:false, message}` auf Deutsch. `shownItem`: Haus leer → Ruine; Haus belegt → Platzierung; Garage leer → `garage_holz`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren.** `plotPlan.test`/`build`-Tests, die den Haus-Starter erwarten, anpassen.
- [ ] **Step 4:** `npx vitest run` → PASS; `npx tsc --noEmit` ohne neue Fehler (bekannter alter Fehler: `tests/render/character.test.ts` `rootTravel`).
- [ ] **Step 5: Commit** `feat(web): tutorial api, ruin in empty house slot`.

### Task 6: Comic-Sprechblasen (Schrift und Kenney-UI-Grafik)

**Files:**
- Create: `web/src/ui/speechBubble.ts`, `web/public/fonts/ComicNeue-Regular.woff2` (+ `-Bold`), `web/public/assets/kenney/ui/bubble.png`, `web/public/assets/kenney/ui/bubble-tip.png`, `web/public/assets/kenney/ui/tap-a.ogg`
- Modify: `web/src/style.css` (`@font-face`, Blasen-Stil), `web/src/render/crowd.ts` (Begrüßungsblasen im neuen Stil), `blender/sources/LICENSES.md`
- Test: `web/tests/ui/speechBubble.test.ts`

**Interfaces:**
- Produces: `createBubble(text: string, mood: 'sad'|'happy'|'plain'): HTMLElement` (abgerundet, `role="status"`, Spitze unten) und `positionBubble(el: HTMLElement, screen: {x:number; y:number}): void` (klemmt in den Bildschirm, Spitze zeigt zur Figur).

- [ ] **Step 1: Failing test:** `createBubble('Hallo','sad')` hat Klasse `speech-bubble speech-bubble--sad`, Text `Hallo` per `textContent` (kein HTML), `positionBubble` hält die Blase bei Position nahe Rand innerhalb von `window.innerWidth/innerHeight` (happy-dom).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren.** Schrift: Comic Neue von Google Fonts/GitHub-Release (SIL OFL) herunterladen; Dateien in Repo, `font-display: swap`, `font-family: 'Comic Neue','Comic Sans MS',cursive`. Blase: `border-image` 9-Slice aus `Kenny/UI/PNG/Grey/Default/button_rectangle_depth_border.png` (hell einfärben per CSS-Filter oder vorab), Spitze aus `arrow_basic_s.png`. Tippton `tap-a.ogg` optional hinter `localStorage`-freiem Schalter (nur bei Knopfdruck). LICENSES.md: Kenney UI Pack 2.0 (CC0), Comic Neue (SIL OFL 1.1, Autor Craig Rozynski, Lizenztext beilegen).
- [ ] **Step 4:** Test → PASS; Playwright-Screenshot der Blase (Tablet 1024×768) ansehen.
- [ ] **Step 5: Commit** `feat(ui): comic speech bubbles with Comic Neue`.

### Task 7: Kamerafahrt und Figur-Moment

**Files:**
- Create: `web/src/render/introCamera.ts`
- Modify: `web/src/render/crowd.ts` (öffentliche Methoden `placeOwnAt(plotIndex)`, `playDanceOnce(): Promise<void>`, `standStill(on: boolean)`), `web/src/render/houseCamera.ts` falls Hilfsfunktionen passen
- Test: `web/tests/render/introCamera.test.ts`

**Interfaces:**
- Produces: `introPath(layout: Layout, plotIndex: number, reducedMotion: boolean): { duration: number; at(t: number): { position: THREE.Vector3; target: THREE.Vector3 } }` – Stationen: Dorfpanorama → Marktplatz → eigenes Grundstück; Dauer 5–8 s normal, 2–3 s bei `reducedMotion`; letzte Station = Figur vor der Ruine (Haus-Slot-Mitte, Figur davor, +Z). `closeUpPath(...)` analog für den Abschluss (Kamera näher an die Figur).

- [ ] **Step 1: Failing tests:** `duration` zwischen 5 und 8 (normal) bzw. ≤ 3 (reduziert); `at(0)` weit weg (Abstand zum Grundstück > 40 m), `at(duration)` Abstand 6–12 m und Blick auf die Haus-Slot-Mitte; Position stetig (Sprung zwischen `t` und `t+0.016` < 3 m); deterministisch.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren** (Catmull-Rom über Stationen, Easing; keine Zufallswerte). Tanz: den ersten Eintrag aus `CLIP_NAMES[kind].dances` einmal spielen (`LoopOnce`), Promise löst am `finished`-Event.
- [ ] **Step 4:** Test → PASS. `npm run galerie` zeigt unveränderte Dorfbilder (kein Regress).
- [ ] **Step 5: Commit** `feat(render): tutorial camera path and dance moment`.

### Task 8: Tutorial-Ablauf (UI-Zustandsmaschine)

**Files:**
- Create: `web/src/ui/tutorial/flow.ts`, `web/src/ui/tutorial/quizView.ts`, `web/src/ui/tutorial/messages.ts`
- Modify: `web/src/ui/answerForms.ts` (nur falls Formulare nicht ohne Daily-Quest-Kontext nutzbar sind), `web/src/render/buildMode.ts` (geführter Modus: Hervorhebung Inventar-Eintrag und Haus-Sockel), `web/src/ui/shopView.ts` (geführter Kaufdialog nur für `house_fachwerk`)
- Test: `web/tests/ui/tutorialFlow.test.ts`, `web/tests/ui/tutorialQuiz.test.ts`

**Interfaces:**
- Consumes: `api/tutorial.ts` (Task 5), `speechBubble` (Task 6), `introPath` (Task 7), `openCharacterPicker`.
- Produces: `runTutorial(ctx: TutorialContext): Promise<void>` mit `TutorialContext = { supabase, state: TutorialState, village: VillageHandle-Teil für Kamera/Figur/Blasen, onCoins(n:number), openDailyQuests(): void }`; `MESSAGES` in `messages.ts` = `['Jeden Tag gibt es Daily Quests. …','Für richtige Antworten bekommst du Münzen. …']` (zwei kurze Sätze, einfache Sprache); `SAD_TEXT`, `FINAL_TEXT = 'Jetzt wird gelernt und Dailys gemacht!'`.

- [ ] **Step 1: Failing tests** (Fake-API): Reihenfolge der Schritte `character → start → camera → messages → quiz → buy → place → dance → daily`; schon vorhandene Figur überspringt die Wahl; `state.step='quiz', answered=2` setzt bei Frage 3 ein; falsche Antwort zeigt Hinweis und lässt Wiederholung zu; Lösungstext erscheint nie im DOM; „Weiter“ nötig für jede Nachricht; `done`-Zustand startet kein Tutorial; Netzfehler → Meldung „Bitte noch einmal versuchen“ und Knopf bleibt nutzbar (kein Schrittverlust).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren** `runTutorial` als lineare async-Funktion, die bei jedem Schritt `state` vom Server übernimmt (nicht aus lokalem Zustand). Quiz nutzt vorhandene Antwortformulare (`answerForms.ts`) und `speech.ts` für die Hörfrage. Kauf: Dialog mit Haus-Vorschau (`itemThumbs`), Preis 50, Knopf „Haus kaufen“. Platzieren: `BuildMode` im geführten Modus (nur Haus-Sockel wählbar), nach Serverbestätigung `village.updateOwnPlot(slots)` (Ruine verschwindet).
- [ ] **Step 4:** Tests → PASS.
- [ ] **Step 5: Commit** `feat(ui): first-login tutorial flow`.

### Task 9: Verdrahtung in Login und Dorf

**Files:**
- Modify: `web/src/main.ts`, `web/src/ui/villageView.ts` (Zeilen ~207–233: manuelle Grundstückswahl entfernen; Figurwahl-Pflicht aus Zeile ~415 ins Tutorial verlegen; Tutorial vor Dorfinteraktion starten, Navigation während des Tutorials sperren)
- Test: `web/tests/ui/villageTutorial.test.ts`, `web/e2e/tutorial.spec.ts`

**Interfaces:**
- Consumes: `getTutorialState`, `runTutorial`.
- Produces: `mountVillage` ruft nach dem Laden `getTutorialState`; `needed=true` → `runTutorial`, solange nicht fertig ist die Spielnavigation (`gameNav`) gesperrt.

- [ ] **Step 1: Failing tests:** `needed=false` → kein Tutorial, keine manuelle Platzwahl-Hinweisbox mehr; `needed=true` → Tutorial startet, Navigation `aria-disabled`; Logout während des Tutorials erlaubt (Konto-Menü bleibt nutzbar).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implementieren.** Hinweistext „Tippe auf eine freie Wiese“ und `claim`-Pfad löschen; Lehrkraft-Ansicht unberührt.
- [ ] **Step 4:** `npx vitest run` PASS.
- [ ] **Step 5: Commit** `feat(web): start tutorial after login, drop manual plot choice`.

### Task 10: E2E, Galerie, Doku

**Files:**
- Create: `web/e2e/tutorial.spec.ts` (Playwright, Tablet 1024×768, Screenshots je Schritt nach `web/test-results/tutorial/`)
- Modify: `docs/PLAN.md` (neues AP abhaken, Notiz), `docs/SPEC.md` (§ Tutorial, `claim_plot` Hinweis), `docs/ANLEITUNG_LEHRKRAFT.md` (Tutorial erklären, Testen/Hochladen), `CLAUDE.md` (Stand), `docs/ASSET_VERTRAG.md` (Ruine, Haus nicht mehr Starter)

- [ ] **Step 1:** E2E gegen lokalen Supabase-Stack bzw. Mock (Muster `web/e2e/daily-quests.spec.ts`): kompletter Ablauf Figur → Fahrt → Nachrichten → 5 Fragen → Kauf → Platzieren → Tanz → Daily-Quest-Ansicht; je Schritt ein Screenshot.
- [ ] **Step 2:** Verifikation: `npx tsc --noEmit`, `npx eslint .`, `npm test`, `npm run build`, `npm run galerie` (Bilder vs. `Konzept/Stil_Referenz/` ansehen), E2E-Screenshots ansehen.
- [ ] **Step 3:** Docs aktualisieren; Commit `docs: first-login tutorial`.
- [ ] **Step 4:** Lehrkraft-Anleitung (Deutsch, Schritt für Schritt): Migration 0019 in Supabase einspielen (SQL-Editor), Branch testen (Vorschau-URL), erst nach Abnahme auf `main` mergen.
