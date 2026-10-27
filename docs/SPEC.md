# Lerndorf – Technische Spezifikation

Stand: 17.10.2026 · gehört zu [SCOPE.md](SCOPE.md) · Referenz-Implementierung für Dorf und Figuren: [`../Prototyp/index.html`](../Prototyp/index.html)

Markierung offener Punkte: **[OFFEN]** = mit der Lehrkraft klären; bis dahin den genannten Standardwert verwenden und konfigurierbar halten.

**Sprachregel ab 26.10.2026:** Spielertexte standardmäßig Englisch, in Einstellungen zwischen English und Deutsch umschaltbar. Die früheren deutschen UI-Beispiele unten beschreiben weiterhin den deutschen Modus. Lehrerbereich, Backend, Datenbank, Lerninhalte und der Name Lerndorf bleiben bestehen. Die Wahl wird nur im Browser gespeichert; Details und technische Grenzen: [PLAYER_LANGUAGES.md](PLAYER_LANGUAGES.md).

---

## 1. Architektur

```
Tablet (Browser)                         Supabase (EU)
┌──────────────────────────┐   HTTPS    ┌───────────────────────────────┐
│ web/ (Vite-Build)        │──────────▶│ Auth (E-Mail/Passwort,        │
│  Three.js-Dorf           │            │   Pseudo-Adressen)            │
│  Daily Quests, Shop,     │            │ Postgres + Row Level Security │
│  Baumodus, Avatar-Editor │──RPC─────▶│ RPC-Funktionen (Spiellogik)   │
│  Lehrer-Bereich          │            │ Edge Function admin-accounts  │
└──────────────────────────┘            └───────────────────────────────┘
        ▲ ausgeliefert von                        ▲
Cloudflare Pages (Projekt „lerndorf“)          GitHub Actions: Deploy, Aufgaben-
                                         Import, Weck-Anfrage
```

**Grundsatz:** Der Browser zeigt nur an. Alles, was Münzen, Besitz oder Platzierungen verändert, läuft über RPC-Funktionen mit `security definer`, die prüfen und dann buchen. Tabellen sind für Clients **nur lesbar** (über RLS), nie direkt beschreibbar.

## 1a. Instanzen: 8a und 8b sind getrennte Welten

**8a und 8b sind zwei vollständig getrennte Instanzen** desselben Spiels. Technisch laufen beide in **einer** Website und **einem** Supabase-Projekt; getrennt wird über `class_id` (= Instanz-ID). Eine Instanz ist eine Zeile in `classes`; eine weitere Klasse (z. B. 7M) ist später nur eine neue Zeile, kein neuer Code.

| Bereich | Pro Instanz eigen | Gemeinsam |
| --- | --- | --- |
| Dorf | Kartenvorlage (`map_id`), Seed, 34 Grundstücke, Wahrzeichen, Marktplatz-Projekt (später) | Code, Modelle |
| Bewohner | Schülerkonten, Avatare, Häuser, Platzierungen, Inventar, Münzen, Kontoauszug | – |
| Spielregeln | Stempel-Belohnung, Tageslimit, Versuche, Raster, Shop offen, Bauen offen (§5 `classes`) | Standardwerte für neue Instanzen (`settings`) |
| Aufgaben | Aufgaben mit `class_id` gelten nur dort; `class_id = null` gilt für alle Instanzen. Ergebnisse und Statistik je Instanz | Aufgabendateien, Schema |
| Shop | Gegenstände können je Instanz gesperrt werden (`class_items`, optional) | Katalog und Preise (`items`) |
| Lehrkraft | Ansicht immer **für eine gewählte Instanz** (Umschalter oben im Lehrer-Bereich), Stempel, Statistik, Schalter je Instanz | ein Lehrkonto für alle Instanzen |

**Trennungsregeln (hart, per RLS und in jeder RPC geprüft):**
1. Ein Schüler gehört genau einer Instanz an (`profiles.class_id`, Pflicht für Schüler).
2. Schüler lesen nur Daten der eigenen Instanz: Bewohner, Platzierungen, Aufgaben, Klassen-Einstellungen. Es gibt **keine** Abfrage, die Daten mehrerer Instanzen an Schüler liefert, keinen instanzübergreifenden Vergleich und keine Rangliste.
3. Jede RPC ermittelt die Instanz aus dem angemeldeten Nutzer (`current_class()`), **nie** aus einem Parameter des Clients. Lehrer-RPCs bekommen `class_id` als Parameter und prüfen die Rolle.
4. Grundstücke, Platzierungen und Aufgaben-Ergebnisse sind immer an genau eine Instanz gebunden; `unique (class_id, plot_index)`.
5. Spitznamen sind **global eindeutig** (Login ohne Klassenangabe), damit niemand die Klasse eingeben muss.

**Wechsel eines Schülers in die andere Instanz** (`move_class`, nur Lehrkraft, mit Bestätigung): Münzen, Inventar, Avatar und Kontoauszug ziehen mit; alle Platzierungen werden entfernt und gehen ins Inventar zurück; der Schüler bekommt in der neuen Instanz den nächsten freien Platz (innen nach außen, §10.5); der alte Platz wird wieder frei (Bauplatz-Optik).

**Löschen einer Instanz** ist im MVP nicht vorgesehen (nur über die Datenbank).

## 2. Repository und Ordner

Neues GitHub-Repository `Lerndorf` (von der Lehrkraft angelegt). Lokaler Ordner: `Projekte/Wochenpläne 8r/Lerndorf`.

```
Lerndorf/
  CLAUDE.md
  README.md
  docs/            SCOPE.md, SPEC.md, ANLEITUNG_LEHRKRAFT.md (Stufe 5)
  Konzept/         Konzeptpapier, Bilder (nicht verändern)
  Prototyp/        Stufe-0-Prototyp (Referenz, nicht weiterentwickeln)
  web/             die App (Vite + TypeScript)
    src/
      main.ts
      auth/        Login, Session, Auto-Logout
      api/         Supabase-Client, RPC-Wrapper, Typen
      world/       terrain.ts, river.ts, paths.ts, plots.ts, layout.ts (deterministisch)
      render/      scene.ts, lighting.ts, quality.ts, assets.ts (GLB-Laden)
      avatars/     avatar.ts (Rezept → Modell), behaviour.ts, crowd.ts
      ui/          hud, Daily Quests, Shop, Inventar, Baumodus, Editor, Toasts
      teacher/     Lehrer-Bereich
    public/assets/ GLB-Modelle, Texturen (komprimiert)
    tests/
  supabase/
    migrations/    SQL (Schema, RLS, Funktionen, Seed)
    functions/admin-accounts/   Edge Function
  content/
    daily-quests/  Daily Quests pro Woche: 2026-11-09.json …, FORMAT.md (§9)
    tasks/         alte Wochenaufgaben (nicht mehr eingelesen)
    items.json     Shop-Katalog
  blender/
    scripts/       Headless-Pipeline (Python)
    sources/       CC0-Quellpakete (nicht ins Repo, .gitignore) + LICENSES.md
  .github/workflows/  deploy.yml, import-content.yml, keepalive.yml
```

## 3. Technik-Stack

| Bereich | Wahl | Hinweis |
| --- | --- | --- |
| Sprache | TypeScript (strict) | Spieler-UI Englisch/Deutsch, Standard Englisch; Lehrer-UI Deutsch; Code/Kommentare Englisch |
| Build | Vite | `base: '/'` für Cloudflare Pages (Wurzel der Domain) |
| 3D | three.js **0.170.x** (fest gepinnt) | wie im Prototyp |
| UI | Vanilla TS + CSS (kein Framework nötig); Preact nur falls UI-Umfang es erfordert | |
| Daten | `@supabase/supabase-js` v2 | |
| Modelle | glTF/GLB, Meshopt-komprimiert, Texturen KTX2 | `GLTFLoader` + `MeshoptDecoder` + `KTX2Loader` |
| Tests | Vitest (Logik), Playwright (Smoke im Chromium) | |
| Asset-Pipeline | Blender ≥ 4.2 headless, Python-Skripte; `gltf-transform` CLI | |

## 4. Authentifizierung und Sitzung

- Supabase Auth mit E-Mail/Passwort. Öffentliche Registrierung **deaktiviert**.
- Schüler-Login-Eingabe: **Spitzname** + **Passwort**. Client bildet daraus `<spitzname_klein>@lerndorf.local` (nur a–z, 0–9, `_`; Umlaute/Leerzeichen beim Anlegen ablehnen).
- Passwörter: von der Lehrkraft vergeben, mind. 6 Zeichen, einfach (z. B. „hund42“).
- Konten anlegen/zurücksetzen nur über Edge Function `admin-accounts` (nutzt den Service-Key serverseitig; prüft, dass der Aufrufer `role = 'teacher'` hat). Der Service-Key liegt **nie** im Browser oder im Repo.
- Auto-Logout nach **15 Minuten** ohne Interaktion und beim Schließen des Tabs (Session in `sessionStorage`, nicht `localStorage`). Großer „Abmelden“-Knopf immer sichtbar.
- Lehrkonto: normale Auth mit echter E-Mail der Lehrkraft, `role = 'teacher'`, Login über eigenen Link `/lehrer`.

## 5. Datenmodell (Postgres)

```sql
create table classes (
  id text primary key,                 -- '8a', '8b'
  name text not null,
  map_id text not null default 'tal',  -- Kartenvorlage (§10.1)
  layout_seed int not null,            -- streut Grundstücke, Bäume, Details
  shop_open boolean not null default true,
  build_open boolean not null default true,
  -- Spielregeln je Instanz (§1a); beim Anlegen aus settings übernommen
  stamp_reward int not null default 100,
  daily_task_cap int not null default 60,
  max_attempts int not null default 3,
  plot_cols int not null default 10, plot_rows int not null default 10,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text unique not null check (nickname ~ '^[A-Za-z0-9_]{3,16}$'),
  role text not null default 'student' check (role in ('student','teacher')),
  class_id text references classes,    -- null für Lehrkraft
  plot_index int,                      -- Grundstück im Klassendorf, eindeutig pro Klasse
  avatar jsonb not null default '{}',  -- Rezept, siehe §7
  coins int not null default 0 check (coins >= 0),
  created_at timestamptz default now(),
  unique (class_id, plot_index)
);

create table items (                   -- Katalog, aus content/items.json
  id text primary key,                 -- 'deco_flowerbed_red', 'hair_05'
  kind text not null check (kind in ('deco','avatar')),
  slot text,                           -- avatar: hair|top|pants|hat|acc|pet ; deco: null
  name_de text not null,
  price int not null check (price >= 0),
  footprint int[] default '{1,1}',     -- deco: Rasterzellen [breite, tiefe]
  model text,                          -- Pfad zum GLB bzw. Teil-ID
  starter boolean not null default false,   -- gratis für alle
  active boolean not null default true
);

create table inventory (
  player_id uuid references profiles on delete cascade,
  item_id text references items,
  qty int not null default 1 check (qty >= 0),
  primary key (player_id, item_id)
);

create table placements (
  id bigint generated always as identity primary key,
  player_id uuid references profiles on delete cascade,
  item_id text references items,
  cell_x int not null, cell_z int not null,   -- lokales Grundstücksraster
  rot smallint not null default 0 check (rot in (0,1,2,3))  -- ×90°
);

-- tasks, task_solutions, task_results (und task_attempts aus 0008): alte Wochenaufgaben.
-- Seit den Daily Quests (§9) nur noch Geschichte: nicht gelöscht, nicht mehr befüllt, nicht angezeigt.
create table tasks (
  id text primary key,                 -- '2026-11-09-v03'
  week date not null,                  -- Montag der Woche
  class_id text references classes,    -- null = beide Klassen
  type text not null check (type in ('choice','gap','match','order')),
  prompt text not null,
  data jsonb not null,                 -- Optionen etc., OHNE Lösung
  reward int not null default 10,
  active boolean not null default true
);

create table task_solutions (          -- für Clients NICHT lesbar
  task_id text primary key references tasks on delete cascade,
  solution jsonb not null
);

create table task_results (
  player_id uuid references profiles on delete cascade,
  task_id text references tasks on delete cascade,
  day date not null default (now() at time zone 'Europe/Berlin')::date,
  attempts int not null default 0,
  solved boolean not null default false,
  primary key (player_id, task_id, day)
);

create table coin_ledger (
  id bigint generated always as identity primary key,
  player_id uuid references profiles on delete cascade,
  delta int not null,
  reason text not null check (reason in ('task','stamp','purchase','refund','teacher','quest')),
  ref text,                            -- task_id, item_id, Woche, Quest-Schlüssel …
  created_by uuid,                     -- Lehrkraft bei stamp/teacher
  created_at timestamptz default now()
);

create table settings (                -- eine Zeile: Standardwerte für NEUE Instanzen; gültig sind die Werte in classes
  id int primary key default 1 check (id = 1),
  stamp_reward int not null default 100,
  daily_task_cap int not null default 60,
  max_attempts int not null default 3,
  plot_cols int not null default 10, plot_rows int not null default 10
);

create table class_items (             -- optional: Gegenstand in einer Instanz sperren
  class_id text references classes on delete cascade,
  item_id text references items on delete cascade,
  enabled boolean not null default true,
  primary key (class_id, item_id)
);

-- Daily Quests (§9), Migrationen 0015–0017. Gleiches Paket für alle Klassen (kein class_id).
create table daily_quests (
  key text primary key,                -- '2026-11-10-tue-2' (Tag + id aus der Datei)
  week date not null,                  -- Montag der Woche
  day date not null,
  slot smallint not null check (slot between 1 and 3),
  qid text not null,                   -- id in der Wochendatei
  type text not null check (type in ('choice','gap','match','order','listening')),
  prompt text not null,
  hint text not null default '',       -- nur nach falscher Antwort an den Schüler
  data jsonb not null default '{}',    -- öffentlicher Teil (Optionen, Wörter, Vorlesetext), OHNE Lösung
  reward int not null check (reward between 1 and 20),
  active boolean not null default true -- false: bei erneutem Import aus der Datei entfernt
);

create table daily_quest_solutions (   -- für Clients NICHT lesbar, auch nicht für die Lehrkraft direkt
  quest_key text primary key references daily_quests on delete cascade,
  solution jsonb not null
);

create table daily_quest_results (     -- eine Zeile je Schüler und Quest
  player_id uuid not null references profiles on delete cascade,
  quest_key text not null references daily_quests,
  attempts int not null default 0,     -- zählt heute und beim Nachholen zusammen
  solved_at timestamptz,
  reward_paid int,                     -- 0, wenn erst nach den bezahlten Versuchen gelöst
  primary key (player_id, quest_key)
);

create table quest_imports (           -- letzter Import je Woche, für den Lehrer-Bereich
  week date primary key,
  ok boolean not null,
  holiday boolean not null default false,
  errors text[] not null default '{}',
  quest_count int not null default 0,
  imported_at timestamptz not null default now()
);
-- coin_ledger: höchstens eine 'quest'-Buchung je Schüler und Quest (eindeutiger Index auf player_id, ref).
```

Alle RPCs lesen Belohnung, Tageslimit, Versuche und Raster aus der Zeile der Instanz in `classes`, nicht aus `settings`. `daily_task_cap` und `max_attempts` gelten nur für die alten Wochenaufgaben; die Daily Quests haben kein Tageslimit und eigene Regeln (§9).

**Invariante:** `profiles.coins` = Summe von `coin_ledger.delta` des Spielers. Nur RPC-Funktionen schreiben beides in derselben Transaktion.

**Erweiterung Migration 0020 – Fortschritt:** `profiles` erhält `xp`, `level`, `title_id`, `frame_id` und `progress_seen_id`. Neue Tabellen sind `xp_ledger` (positive, je Spieler/Grund/Referenz eindeutige Buchungen), `level_rewards` (Titel/Rahmen), `chests` (Truhen samt dauerhaftem Öffnungsergebnis) und `streaks` (aktuelle/beste Serie, letzter Schultag, Wochenschild). Schüler lesen ihre eigenen Fortschrittszeilen; die Lehrkraft liest alle. Den Belohnungskatalog lesen angemeldete Nutzer. Schreiben erfolgt ausschließlich durch serverseitige Funktionen. Die Summe der XP-Buchungen entspricht `profiles.xp`.

## 6. Row Level Security

| Tabelle | Schüler lesen | Schüler schreiben | Lehrkraft |
| --- | --- | --- | --- |
| classes | eigene Klasse | – | alles |
| profiles | Profile der eigenen Klasse: nur `id, nickname, plot_index, avatar, level, title_label, frame_id` (über RPC `village_members`); eigenes Profil inkl. `coins` | – (nur RPC) | alles |
| items | aktive Items | – | alles |
| inventory | eigenes | – | alles |
| placements | alle der eigenen Klasse | – | alles |
| tasks | aktive der eigenen Klasse, Woche ≤ heute | – | alles |
| task_solutions | **nie** | – | über RPC/Import |
| task_results | eigene | – | alles |
| daily_quests | **nie** direkt (nur über `my_daily_quests`) | – | lesen; Vorschau über RPC |
| daily_quest_solutions | **nie** | – | **nie direkt**, nur über `teacher_quest_preview` |
| daily_quest_results | eigene | – | lesen |
| quest_imports | – | – | lesen; Status über `quest_status` |
| coin_ledger | eigene | – | alles |
| settings | lesen | – | schreiben |
| class_items | eigene Instanz | – | alles |

Münzstände anderer Schüler sind für Schüler **nicht** sichtbar. Die alten Tabellen `tasks`, `task_solutions`, `task_results`, `task_attempts` bleiben mit ihren Regeln als Geschichte bestehen. In die Quest-Tabellen schreiben Clients nie; nur RPCs und der Import (Service-Key in GitHub Actions).

## 7. Avatar-Rezept

```json
{ "character": "boy", "wardrobe": {
  "v": 1, "revision": 1,
  "boy": { "items": ["avatar_boy_gold_chain"], "colors": {"hair":"#5b3a29"} },
  "girl": { "items": [], "colors": {} }
} }
```
- Teile mit `starter = true` sind frei wählbar, alle anderen nur, wenn im Inventar.
- Speichern über `save_avatar_look(p_character, p_look, p_expected_revision)` (Migration 0023, lokal vorbereitet). Prüft Schülerrolle, aktuelle Figur, Besitz, kompatible Slots/Konflikte, feste Paletten und erwartete Revision. Nur der Look dieser Figur wird aktualisiert; bisherige Avatar-Felder und der andere Look bleiben erhalten. `save_avatar` ist für alte Rezepte geschützt; neue Look-Schlüssel sind dort gesperrt.
- Grundausstattung: vollständig bekleidete Originalfigur und kostenlose feste Farben. Geliefert sind vier Boy-Accessoires sowie zehn Girl-Accessoires und zwei geriggte Girl-Unterteile (Jeans/Rock). Keine zusätzlichen Frisuren/Oberteile ohne zugehöriges Modell anbieten. Kanäle `hair`, `skin`, `shoes`, `bottoms`; Girl zusätzlich `top`. Natürliche Hautpalette in `settings.avatar_skin_palette`, sonst `settings.avatar_palette`.
- Hausmenü → „Kleiderschrank“ öffnet die eigene Zimmer-Szene mit geliefertem Tripo-Schrank und -Teppich. Hintergrund unscharf, Figur scharf und drehbar, direkte Anprobe ausschließlich besessener kompatibler Teile. „Fertig“ speichert, „Zurück“ schützt ungespeicherte Änderungen. Das Dorf pausiert; nach Speicherung übernehmen Dorf und Porträt den bestätigten Look. Shop-Sperren verhindern neue Käufe, nicht das Umziehen vorhandener Sachen.
- Neue Avatar-Artikel sind einmalig kaufbar. Bestehender Besitz alter Artikel wird erhalten; nicht modellierte Altartikel sind nicht mehr im Verkauf. Beschreibung und Grenzen: [Kleiderschrank](superpowers/specs/2026-10-26-avatar-wardrobe-design.md).

## 8. RPC-Funktionen (Postgres, `security definer`, `set search_path = public`)

| Funktion | Wer | Prüft | Wirkung | Rückgabe |
| --- | --- | --- | --- | --- |
| `my_daily_quests()` | Schüler (Lehrkonto wird abgelehnt: `only pupils`) | angemeldet, Rolle `student` | – | Liste: heutige Quests und gestrige ungelöste (Nachholen) mit `key, day, catch_up, type, prompt, data, reward, reward_left, solved, attempts`; **ohne** Tipp und Lösung |
| `submit_quest_answer(p_key text, p_answer jsonb)` | Schüler | Rolle `student`; Quest aktiv und Tag = heute oder gestern (sonst `quest not available`); Ergebniszeile gesperrt (`for update`) | `attempts+1`; bei richtig `solved_at`; Buchung `quest` nur wenn `attempts ≤ quest_paid_attempts()`, höchstens einmal | `{correct, already_solved, coins, reward, reward_left, hint}` – `hint` nur bei falsch; nie die Lösung |
| `quest_paid_attempts()` | intern | – | – | 3 (Anzahl bezahlter Versuche, D11; nur hier ändern) |
| `quest_today()` | intern | – | – | heutiges Datum in Europe/Berlin |
| `quest_status()` | Lehrkraft | Rolle | – | `{today, covered_until, today_missing, tomorrow_missing, imports[]}` |
| `teacher_quest_preview(p_from date, p_days int)` | Lehrkraft | Rolle; 1–14 Tage | – | aktive Quests der Tage mit Tipp **und Lösung** |
| `import_quest_week(…)`, `record_quest_import(…)` | nur `service_role` (Import-Workflow) | Montag; Ferienwoche ohne Quests; Lösungen nur zu Quests der Datei | ganze Woche in einer Transaktion (D4) bzw. Fehler protokollieren | Anzahl Quests |
| `submit_answer(task_id text, answer jsonb)` *(alt: Wochenaufgaben, nicht mehr in der Oberfläche)* | Schüler | Aufgabe aktiv, eigene Klasse, Woche ≤ heute; heute noch nicht gelöst; `attempts < max_attempts`; Tageslimit (Summe `task`-Buchungen heute + reward ≤ `daily_task_cap`) | `attempts+1`; bei richtig: `solved`, Buchung `+reward` | `{correct, coins, attempts_left, solution?}` – Lösung erst nach letztem Fehlversuch |
| `buy_item(item_id text)` | Schüler | Item aktiv, Shop der Klasse offen, genug Münzen | Buchung `-price`, Inventar +1 | `{coins, qty}` |
| `place_item(item_id text, x int, z int, rot int)` | Schüler | Bau offen; freie Menge im Inventar (qty − platzierte); Footprint im Raster, nicht im Hausbereich, keine Überlappung | Zeile in `placements` | `placement_id` |
| `remove_placement(id bigint)` | Schüler | gehört dem Spieler | löschen (Item geht ins Inventar zurück) | ok |
| `save_avatar(recipe jsonb)` | Schüler | Legacy-Rezept, reservierte neue Schlüssel gesperrt | Legacy-Felder; Figur und Look bleiben erhalten | Rezept |
| `save_avatar_look(p_character, p_look, p_expected_revision)` | Schüler | Rolle, Figur, Besitz, Slots/Konflikte, Palette, Revision | gezielter Look in `profiles.avatar.wardrobe` | Figur und beide Looks mit neuer Revision |
| `add_stamps(class_id text, week date, player_ids uuid[])` | Lehrkraft | Rolle; pro Spieler und Woche nur ein Stempel (`ref = week`) | Buchung `+stamp_reward` je Spieler | Anzahl gebucht |
| `adjust_coins(player_id uuid, delta int, note text)` | Lehrkraft | Rolle; Ergebnis ≥ 0 | Buchung `teacher` | neuer Stand |
| `set_class_flags(class_id, shop_open, build_open)` | Lehrkraft | Rolle | Update | ok |

**Antwortprüfung** (`submit_answer`; die Daily Quests nutzen über `quest_answer_matches` dieselbe Prüfung, `listening` wie sein `mode`): Vergleich nach Normalisierung – trimmen, Kleinschreibung, mehrfache Leerzeichen zusammenfassen, typografische Apostrophe → `'`. `gap` erlaubt mehrere richtige Lösungen (Array). Kein Teilpunkt.

**Edge Function `admin-accounts`** (nur Lehrkraft): `create` (nickname, password, class_id; der Schüler startet **ohne** Grundstück und bekommt es im Erststart-Tutorial automatisch, §8a; `claim_plot` ist gesperrt), `reset_password`, `move_class` (Regeln §1a), `delete`. Bulk-Anlegen aus einer Liste (eine Zeile pro Schüler: `Spitzname;Passwort;Klasse`).

## 8a. Erststart-Tutorial (Migration 0019)

Entwurf und Entscheidungen: `docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md` (§9 gilt zuerst). Jeder Schüler ohne platziertes Haus durchläuft es einmal.

**Zustand** je Schüler in `tutorial_progress` (`step`, `answered`, `reward_paid`, `house_bought`, `completed_at`; RLS: nur die eigene Zeile lesbar). Ablauf der Schritte:

```
intro --tutorial_continue--> quiz --3x tutorial_answer richtig--> buy --tutorial_buy_house--> place --tutorial_place_house--> done
```

| Funktion | Wirkung |
| --- | --- |
| `tutorial_state()` | `{needed, step, plot_index, character, answered}`; wer schon ein Haus im Haus-Sockel hat, bekommt `done` |
| `tutorial_start()` | vergibt atomar das niedrigste freie Grundstück der Klasse (Advisory-Lock), legt die Fortschrittszeile an; Wiederholung ändert nichts |
| `tutorial_continue('intro')` | `intro` → `quiz` (braucht ein Grundstück) |
| `tutorial_question()` | drei Fragen (Wortschatz, Grammatik, Hören) mit je drei großen Antwortknöpfen; Antippen prüft sofort, ohne Schreiben, Dropdown oder zusätzlichen Bestätigen-Knopf; die aktuelle Frage (Nr. = `answered + 1`), nie Lösung oder Tipp |
| `tutorial_answer(nr, antwort)` | falsch: Tipp, keine Strafe, beliebig oft; dritte richtige Antwort: einmalig 50 Münzen (`coin_ledger.reason = 'tutorial'`, Unique-Index) → `buy` |
| `tutorial_buy_house()` | Kauf des Fachwerkhauses zum Katalogpreis (50), auch bei geschlossenem Shop → `place`; doppelter Aufruf bucht nicht noch einmal |
| `tutorial_place_house()` | setzt das Haus in den Sockel `house` (Drehung 0), auch bei geschlossenem Baumodus; braucht ein Grundstück → `done` |
| `tutorial_finish()` | Abschlussaufruf des Clients, wiederholbar, nur bei `done` |

`tutorial_state_of(uuid)` und `tutorial_reward()` sind intern (nicht für Clients aufrufbar). Fehler „falscher Schritt“ ist `22023`. **`claim_plot` ist für alle gesperrt** (Fehler `forbidden: plot is assigned automatically`, Code `42501`): das Grundstück vergibt nur `tutorial_start`. `buy_item`, `place_in_slot` und `clear_slot` bleiben unverändert streng; die Tutorial-Funktionen sind die einzigen Ausnahmen für geschlossenen Shop und Baumodus, nur für das Fachwerkhaus im Sockel `house` im jeweiligen Schritt. Bis das Haus steht, zeigt der Client im Sockel die **Ruine** (`RUIN_ID`, kein Katalog-Eintrag).

## 8b. XP, Level und Profil (Migration 0020)

Produktregeln: [XP-Design](superpowers/specs/2026-10-24-xp-level-design.md); Umsetzung: [XP-Plan](superpowers/plans/2026-10-24-xp-level.md).

- Richtige Quest: 15 XP im ersten, 10 XP im zweiten/dritten, 5 XP ab dem vierten Versuch; Nachholen halbiert und rundet auf. Alle drei heutigen Quests geben 15 XP extra. Ein heutiger Erfolg pro Schultag gibt zusätzlich Serien-XP. Stempel geben 100 XP, Tutorial-Abschluss 50 XP, erstes Aufstellen eines Gegenstands 10 XP.
- Level-Grenzen und XP-Werte liegen in `xp_for_level`, `level_for_xp` und `xp_rule`. Jeder Level-Aufstieg erzeugt eine Truhe, jedes fünfte Level eine große Truhe. Keine XP-Abzüge und keine Rangliste.
- Die Serie zählt nur Montag bis Freitag mit aktiven Quests; Wochenenden und Ferien unterbrechen sie nicht. Pro Kalenderwoche schützt ein Schild einen versäumten Schultag. Meilensteine geben große Truhen.
- Neue Schüler-RPCs: `my_progress()`, `mark_progress_seen(p_id)`, `open_chest(p_id)`, `set_title(p_id|null)`, `set_frame(p_id)`. Truhenöffnung ist wiederholbar ohne zweite Münzbuchung; Inhalt und Freischaltungen entscheidet ausschließlich der Server.
- `submit_quest_answer`, `tutorial_finish` und `place_in_slot` liefern zusätzlich `progress`; `place_in_slot` liefert jetzt `{ok, id, progress}`. `add_stamps` bucht die XP zusammen mit den Münzen. Interne Funktionen `grant_xp` und `touch_streak` sind für Clients nicht ausführbar.
- `village_members` liefert zusätzlich nur `level`, `title_label`, `frame_id`; keine XP, Münzen oder Serie anderer Schüler. Haus- und Figuren-Schilder zeichnen das Level-Wappen im vorhandenen Sprite.
- Das Avatar-Feld öffnet „Mein Profil“ mit Figurenbild, Rahmen, Wappen, XP-Balken, Münzen, kompakten Karten für Serie/Tagesziel und direkt antippbaren 3D-Truhen. „Sammlung“ öffnet eine eigene Ansicht mit Reitern für Titel und Rahmen. XP-Rechenregeln und historische Statistiken stehen nicht in der Schüleransicht. Truhen wackeln und leuchten bei Hover/Fokus; nach bestätigtem Öffnen klappt der Deckel auf. Während des Tutorials öffnet das Avatar-Feld weiter die Einstellungen. Das Profil pausiert das Dorf. Die Hauptnavigation zeigt zwei Symbolknöpfe „Aufgaben“ und „Mein Haus“ direkt links neben dem Avatar oben rechts, ohne seitliche oder untere Leiste. Dorf und Marktplatz haben keine eigene Schaltfläche; Unterseiten führen über Schließen oder Zurück ins Dorf. „Aufgaben“ zeigt die Zahl offener heutiger Quests. Details: [Profil-Interaktion](superpowers/specs/2026-10-25-profile-interaction-design.md).
- XP-Gewinn, Level-Feier und Truhenöffnung beachten reduzierte Bewegung und den Ton-Schalter. Ungesehene Buchungen erscheinen beim Login als Willkommen-Karte. Nach dem Tutorial kommt die Level-2-Feier vor den Daily Quests.
- Der Lehrerbereich zeigt Level, XP und Serie, weiterhin nach Spitzname sortiert. Es gibt keine manuelle XP-Vergabe.
- Nachberechnung bestehender Schüler: 10 XP je bisher gelöster Daily Quest, 100 je Stempel, 50 für das abgeschlossene Tutorial; höchstens drei Truhen, keine rückwirkende Serie.

## 9. Aufgaben-Inhalte: Daily Quests

Seit 21.10.2026 ersetzen die **Daily Quests** die alten Wochenaufgaben. Produktregeln: `docs/superpowers/specs/2026-10-20-daily-quests-design.md`; Umsetzung: `docs/superpowers/plans/2026-10-21-daily-quests.md`; Arbeitspakete: PLAN „Zwischenpaket Q“.

- **Paket:** eine Datei je Woche `content/daily-quests/<Montag>.json` mit 7 Tagen (Mo–So) × 3 oder 4 Quests, gleiches Paket für alle Klassen. Format und Beispiele: `content/daily-quests/FORMAT.md`; Prüfer: `web/scripts/quests.ts` (`validatePackage`, deutsche Fehlermeldungen mit Pfad).
- **Typen:** `choice`, `gap`, `match`, `order`, `listening`. Jede Quest hat `prompt`, einen kurzen englischen `hint` (nicht leer) und `reward` (1–20).
- **Import:** Workflow `import-content.yml` bei Push auf `content/**` (`web/scripts/import-quests.ts`, Service-Key nur als GitHub-Secret). Der öffentliche Teil geht in `daily_quests`, die Lösungen in `daily_quest_solutions`.
- **Freischaltung:** eine Quest ist an ihrem Kalendertag ab 00:00 Europe/Berlin offen (der Server entscheidet über `quest_today()`), am Folgetag noch als **Nachholen** zur halben Belohnung (aufgerundet), danach verfällt sie.
- **Schüler:** der Knopf „Aufgaben“ (oder Antippen der Tafel am Marktplatz) öffnet den Bereich „Daily Quests“ (`web/src/ui/dailyQuestsView.ts`): „Heute“ und „Nachholen von gestern“, eine Quest aufgeklappt, keine Lösung, kein Versuchszähler. Eine falsche Antwort zeigt „Leider falsch. Tipp: …“.
- **Lehrkraft:** Abschnitt „Daily Quests“ im Lehrer-Bereich (`web/src/teacher/questsView.ts`): Hinweise zur Abdeckung und zu Importfehlern, Vorschau der nächsten 7 Tage mit Tipp und Lösung.
- **Alte Wochenaufgaben:** Tabellen bleiben als Geschichte; Aufgabentafel-Oberfläche, alter Import und `content/tasks/` werden nicht mehr benutzt. Die Aufgabentafel am Marktplatz (§10.7) bleibt stehen; Antippen öffnet die Daily Quests.

### Entscheidungen (Standardwerte, konfigurierbar)

| # | Frage | Entscheidung |
| --- | --- | --- |
| D1 | JSON-Format | festgelegt in `content/daily-quests/FORMAT.md` |
| D2 | Hören | `listening` ist ein Reiz, keine eigene Antwortform: `type: "listening"` + `speak` (Vorlesetext) + `mode: "choice"` oder `"gap"` |
| D3 | Grenzen der Belohnung | ganze Zahl 1–20 (`REWARD_MIN`/`REWARD_MAX` im Prüfer); es gibt keine Freigabe durch die Lehrkraft, deshalb enge Grenzen |
| D4 | Erneuter Import einer Woche | die ganze Woche wird in einer Transaktion ersetzt: Quests nach Schlüssel aktualisiert, aus der Datei entfernte auf `active = false` (nie gelöscht); Ergebnisse und Buchungen bleiben; eine geänderte Belohnung gilt nur für künftige Buchungen. Ein fehlerhafter Re-Import lässt die alte Fassung online und zeigt den Fehler |
| D5 | Alte Wochenaufgaben | Tabellen `tasks`, `task_solutions`, `task_results`, `task_attempts` bleiben unverändert als Geschichte; alte Tafel-Oberfläche, alter Import und `content/tasks` entfallen |
| D6 | Ferien | Ferienwoche als Datei `{"week": "...", "holiday": true}`: keine Quests, keine Warnung (Entscheidung der Lehrkraft 21.10.2026) |
| D7 | Inhaltskontrolle ohne Freigabe | der Lehrer-Bereich zeigt die nächsten 7 Tage mit Lösungen (nur lesen, kein Freigabeschritt) |
| D8 | „Paket fehlt“ erkennen | live im Lehrer-Bereich aus den Daten (`quest_status()`), nicht im Workflow (der läuft nur beim Push) |
| D9 | Mischen bei `order`/`match` | gesätes Mischen, das nie die Lösungsreihenfolge ergibt |
| D10 | Stimme | Vorproduzierte MP3-Dateien: Edge-TTS 7.3, `en-GB-SoniaNeural`, `-10%`; gemeinsames `listeningPath(data.speak)`; bei Wiedergabefehler sichtbarer Hörtext |
| D11 | Versuche und Raten | **Entscheidung der Lehrkraft 21.10.2026:** Versuche unbegrenzt, Münzen nur, wenn die richtige Antwort unter den ersten **3** Versuchen dieses Schülers für diese Quest ist (heute und Nachholen zählen zusammen, die richtige Antwort zählt mit). Danach gilt die Quest als gelöst mit `reward_paid = 0`, ohne Buchung. Die Zahl steht nur in `public.quest_paid_attempts()`; wer sie ändert, muss auch die Zeile „Münzen gibt es bei den ersten 3 Versuchen.“ in `web/src/ui/dailyQuestsView.ts` anpassen. `my_daily_quests` und `submit_quest_answer` liefern zusätzlich `reward_left` (was eine richtige Antwort jetzt noch bringt) |

Weitere Festlegungen aus der Umsetzung (PLAN, Fortschrittsnotizen 21.10.2026): Lehrkonten können keine Quests lösen (`my_daily_quests` lehnt ab, im Dorf erscheint „Nur Schülerkonten können Quests lösen.“); die Lösungstabelle ist auch für die Lehrkraft nicht direkt lesbar, nur über `teacher_quest_preview`; ein fehlerhafter Re-Import einer schon eingespielten Woche (auch einer Ferienwoche) zählt weiter als abgedeckt.

### Daten-/Server-Erweiterung 26.10.2026 (0024–0025)

- Slot 1–4; alte Wochen mit drei Quests bleiben gültig. Tagesziel: einmal 15 XP nach allen aktiven Quests des heutigen Tages, dynamisch für drei oder vier. Nachholen zählt nicht zum heutigen Tagesziel.
- `gap` und `listening` mit `mode: "gap"`: optional `bank` (2–6 verschiedene, nicht leere Wörter) in den öffentlichen Daten. Lösungen bleiben ausschließlich in `daily_quest_solutions`.
- Hördateien aus `web/stimmen.cmd` / `scripts/generate-listening.ts`; kein `data.audio`. Gemeinsames Pfadmodul `src/quests/listening.ts`, Tutorial-Hörtext ebenfalls erzeugt. Import prüft fehlende/leere MP3s vor dem Import-RPC und protokolliert Fehler ohne Ersetzen der bisherigen Woche. Dateien zuerst veröffentlichen, danach neue Wochen importieren; lokale Dateiprüfung beweist keine abgeschlossene Veröffentlichung.
- Wirtschaft: Wochenstempel 50 Münzen (weiterhin 100 XP); nur bisherige Standardklassen mit 100 Münzen werden umgestellt, andere Klassenregeln bleiben bestehen. Truhenformel `(10 + 3 × Level) × Größenfaktor × Wurffaktor`, groß ×3 und unveränderte 70/25/5-Prozent-Würfe. Landhaus 600, Villa 1.000, Kleinwagen 350, Camper 600; `acc_04` im Shop verborgen. Bestehende Guthaben, Besitz, bezahlte Truhen und historische Buchungen werden nicht verändert.
- Preisrichtwerte neuer Ware: Garten-Deko 15–60, besondere Deko 80–120, Avatar 30–120, Haus/Auto 600–1.000. Konkrete Bestandspreise haben Vorrang. Diese Regeln ersetzen die älteren Drei-Quest-/Wirtschaftswerte in §8b und §14.

## 10. Dorf (Welt)

**Wie es aussehen soll, regelt `docs/LOOK.md` (Stil-Leitfaden mit allen Farben und Maßen aus dem Prototyp).** Soll-Bilder: `Konzept/Stil_Referenz/`. Der Prototyp ist das freigegebene Soll-Bild. Befunde zum Stand 17.10.: `docs/REVIEW_2026-10-17_Dorflayout.md`.

Grundsatz: **Das Layout (Positionen von allem) entsteht im Code in `world/`, deterministisch.** Das Rendering (`render/`) setzt jetzt Platzhalter an diese Positionen; in Stufe 2 tauscht die Blender-Pipeline nur die Meshes aus. Vegetation, Laternen und Marktplatz-Ausstattung sind daher **Teil des Layouts** und warten nicht auf Blender.

### 10.1 Kartenvorlagen und Seed

- Es gibt **3 handgestaltete Kartenvorlagen** (`world/maps/*.ts`): je ein Flusslauf (Spline), 6–9 Hauptwege (Splines), Lage des Marktplatzes, 3–5 Wahrzeichen (§10.6), Hügel-Parameter. Vorlagen unterscheiden sich deutlich (z. B. Fluss im Süden / Fluss in der Mitte mit Insel-Brücke / Bach mit Teich und Hügel im Norden).
- `classes.map_id` (neu, `text`, Standard `'tal'`) wählt die Vorlage, `classes.layout_seed` streut Grundstücke, Bäume und Details. **8a und 8b bekommen verschiedene Vorlagen.**
- Gleiche Vorlage + gleicher Seed ⇒ identisches Dorf auf jedem Gerät (eigener PRNG, kein `Math.random` in `world/`).

### 10.2 Gelände

- Höhenfeld wie bisher (Wellen + Anstieg zum Talrand). Talboden flach genug für Wege und Häuser, Rand als bewaldete Hügel.
- Auflösung im Talboden ≥ 1 Vertex pro 1,2 m, damit Wege und Ufer sauber werden.
- Farben: Wiese (2–3 Grüntöne als weiche Flecken), Ufer sandig, Hänge dunkler, Wege und Platz **ins Gelände gemalt** (§10.4).

### 10.3 Fluss und Brücken

- Breite variiert 6–9 m entlang des Laufs; Gelände wird unter der Wasserfläche sauber abgesenkt (kein Geländedreieck sticht durch). Ufer: Sandstreifen, einzelne Steine, Schilf in Gruppen.
- Wasser leicht animiert (Farbe/Glanz), keine Shader-Kosten über dem Budget.
- Brücken automatisch an Weg-Fluss-Kreuzungen, ausgerichtet in Wegrichtung, mit Geländer, Pfosten, kurzer Rampe an beiden Enden; Breite = Wegbreite + 0,6 m. Figuren laufen auf Brückenhöhe.

### 10.4 Wege

- Hierarchie: Hauptweg 2,2 m, Nebenweg 1,5 m, Gartenweg 1,0 m; Marktplatz gepflastert (eigene Farbe + Ringmuster).
- **Darstellung im Gelände** (Vertex-Farbe oder Splat-Textur mit weichem Rand, Gelände unter dem Weg leicht geglättet) statt schwebender Bänder. Keine Z-Konflikte, keine Zacken.
- **Keine Sackgassen**: Jeder Weg endet an einer Kreuzung, am Marktplatz, an einem Grundstück oder an einem Wahrzeichen.
- Laternen alle 10–12 m abwechselnd links/rechts, nicht auf Brücken, nicht in Kreuzungen.

### 10.5 Grundstücke

- **34 feste Plätze pro Klasse** (32 Schüler + 2 Reserve), Lage hängt nicht von der Schülerzahl ab.
- **Vergabe von innen nach außen:** `plot_index` 0 ist der Platz mit kürzestem Weg zum Marktplatz, dann aufsteigend. So entsteht ein dichter Dorfkern; Außenplätze bleiben frei, bis sie gebraucht werden.
- Verteilung: ca. 40 % der Plätze im Kern (Wegstrecke ≤ 25 m zum Platz), Rest entlang der Wege; Abstand zu Nachbarn variiert 2,5–9 m; ≥ 3 m vom Ufer, ≥ 0,6 m vom Weg; Lage im Tal (nicht am Steilhang).
- **Hangregel:** Höhenunterschied des natürlichen Geländes unter dem Grundstück ≤ 1,5 m; Einebnung mit kurzer, weicher Böschung (≤ 2 m), keine Erdwände.
- Ausrichtung: Haus und Tor zeigen zum nächsten Weg; **Gartenweg** vom Tor zum Weg wird gezeichnet und ist im Wegegraph.
- Aufbau: Rasenfläche, Zaun aus Pfosten + Latten mit Tor vorn (keine geschlossene Wand), Haus mit Tür, 2–4 Fenstern (leuchtend), Satteldach mit Dachüberstand, das innerhalb des Grundstücks bleibt; Briefkasten am Tor. Hausgröße und Farben variieren deterministisch.
- **Freie Plätze** (ohne Schüler): kein Haus, sondern Bauplatz-Optik (Wiese, Holzpflöcke an den Ecken, kleines Schild „frei“). Die Häuser sind nur Platzhalter. Ein Schüler ohne Grundstück bekommt beim ersten Login automatisch den niedrigsten freien Platz (RPC `tutorial_start`, §8a); die frühere Wahl per Antippen (`claim_plot`) ist abgeschaltet. Am Anfang sind alle Plätze frei.
- **Grundstücksplan (fest, für alle gleich):** 11 × 11 Zellen à 1 m plus 0,7 m Rasen ringsum (12,4 × 12,4 m). Sieben Slots: Haus 6×4, Garage 3×4, Auto-Sockel 3×5 in der Einfahrt, vier Deko-Sockel 3×3; Weg vom Tor zur Haustür und Einfahrt bleiben frei. Maße, Höchstgrößen, Ausrichtung und Regeln: `docs/ASSET_VERTRAG.md`; Code: `world/plotPlan.ts`. Platzieren nur per RPC `place_in_slot` / `clear_slot` (Migration 0013). Haus und Garage sind nie leer (Starter-Haus „Fachwerkhaus“, Starter-Garage „Holzgarage“), leere Deko-Sockel bleiben Wiese.
- Kartengröße: Die Vorlagen in `world/maps/` sind im Maßstab 1 gezeichnet und werden mit `WORLD_SCALE = 1,65` gestreckt, damit 34 Grundstücke à 12,4 m Platz haben; der Marktplatz bleibt gleich groß.
- Wechsel von Vorlage oder Seed nach dem Start nur mit Warnung im Lehrer-Bereich: Grundstücke bleiben über `plot_index` erhalten, ihre Lage ändert sich.

### 10.6 Wahrzeichen und Details

- Pro Vorlage 3–5 **Wahrzeichen** an Wegenden: z. B. Aussichtspunkt mit Bank auf dem Hügel, Steg am Fluss, Windmühle, Obstwiese, Waldhütte. Sie sind Ziele im Wegegraph (Figuren besuchen sie).
- **Vegetation** (deterministisch, Poisson-Disk-Verteilung): Waldgürtel am Talrand mit nach außen steigender Dichte; im Tal Baumgruppen (3–7 Bäume) statt gleichmäßiger Streuung; 0–2 Bäume oder Büsche neben manchen Grundstücken; Hecken an einigen Wegen; Blumenwiesen-Flecken; Felsen an Hängen; Schilf am Ufer. Nie auf Wegen, Plätzen, Grundstücken, Brücken oder im Wasser.
- Zielmengen bei 34 Plätzen: 150–250 Bäume, 30–60 Büsche, 20–40 Felsen, 60–100 Schilfhalme, 20–30 Laternen.

### 10.7 Marktplatz

- Gepflastert, Durchmesser 16–18 m, Zugänge exakt dort, wo Wege ankommen.
- Ausstattung: Brunnen in der Mitte, **Aufgabentafel** mit schwebendem „!“ (zeigt zum Hauptzugang, gut sichtbar aus der Startkamera), 3 Marktstände, 4 Bänke, 4 Laternen, Blumenkübel. Alles bleibt frei begehbar (Wegegraph um die Objekte herum).

### 10.8 Licht und Stimmung

- Abendstimmung wie im Prototyp: Himmel/Nebel blau-violett, warmes Sonnenlicht flach, Hemisphere-Licht.
- Fenster und Laternen leuchtend (emissive Material, kein Licht pro Objekt) plus additive Lichtflecken auf dem Boden; echte Punktlichter nur am Marktplatz und nur in Qualität „Hoch“.

### 10.9 Namen und Markierungen

- Eigenes Haus: Markierung (schwebender Pfeil) und eigener Name immer sichtbar.
- Namensschilder der Figuren nur bis ca. 30 m Kameraabstand, darüber ausgeblendet; **keine** Namensschilder an fremden Häusern (Name erscheint beim Antippen eines Hauses oder einer Figur).

### 10.10 Kamera

- Start: schräg auf das eigene Grundstück, Marktplatz im Bild. Knöpfe „Zum Marktplatz“, „Zu meinem Haus“. Wischen/Zoomen begrenzt auf das Tal; kein Blick unter das Gelände.

### 10.11 Leistung der Welt

- Statische Szenerie (Gelände, Wege, Häuser, Zäune, Brücken, Platz) zu wenigen Meshes je Material zusammengefasst; Bäume, Büsche, Felsen, Laternen, Zaunpfosten als `InstancedMesh`.
- **Ziel: < 60 Draw Calls für die Welt** (ohne Figuren), < 150 gesamt mit 32 Figuren.

### 10.12 Layout-Galerie (Abnahmewerkzeug)

- Entwicklungsseite `web/dev/galerie.html` (nicht im Produktions-Build): rendert jede Vorlage × 2 Seeds mit 24 Beispielbewohnern aus 5 festen Blickwinkeln (Übersicht, Draufsicht, Marktplatz, Grundstück, Brücke).
- Playwright-Skript `npm run galerie` speichert die Bilder nach `Konzept/Galerie/<datum>/`. Die Lehrkraft nimmt das Layout anhand dieser Bilder ab.

## 11. Avatare und Verhalten

- Ein gemeinsames Skelett, Teile als austauschbare Meshes (SkinnedMesh), Farben über Materialien/Vertex-Farben. Ziel: **1–2 Draw Calls pro Figur**.
- Animationen (aus CC0-Paket oder eigen): idle, walk, sit, wave; weich überblenden (`AnimationMixer`, crossFade 0,2–0,3 s).
- Verhalten wie im Prototyp: Zustandsautomat idle → walk → (sit | idle | greet); Ziele: eigenes Haus, Bank, Aufgabentafel (max. 3 gleichzeitig), Brunnen, Haus eines Freundes, zufälliger Wegpunkt. Routen über Wegegraph (BFS/A*), geglättet (Catmull-Rom), sanftes Beschleunigen/Bremsen, Ausweichen, Begrüßen mit Sprechblase (nur feste englische Grußwörter).
- Figuren laufen auf Gelände- bzw. Brückenhöhe.
- Eigener Avatar: kleiner Marker (z. B. Pfeil) über dem Kopf.
- Spitznamen-Schild über dem Kopf, verdeckt durch Gebäude.

## 11a. Sir Byte (Maskottchen)

[Maskottchen-Design](superpowers/specs/2026-10-25-sir-byte-mascot-design.md) und [Umsetzungsplan](superpowers/plans/2026-10-25-sir-byte-mascot.md). Eine prozedurale Figur aus dem eigenen Prototyp, kompatibel mit Three.js 0.170.0. Sie steht neben der bestehenden Markttafel; Antippen zeigt auf die Quests, erneutes Antippen öffnet sie. Während des Tutorials begrüßt Sir Byte am Markt und begleitet die Figur zum Haus; die Kamera hält beide Figuren im Bild.

Quiz und Daily Quests zeigen ein eigenes 3D-Fenster, während das Dorf pausiert. Fehler werden je Quest ermutigend beantwortet, richtige Antworten gefeiert; die deutsche Bedienung bleibt erhalten. Sprache nur Englisch, nur sechs vorhandene Aufnahmen, nach einer Nutzergeste und bei eingeschaltetem Ton; keine überlappenden Stimmen. „Anhören“ stoppt seine Stimme. Bei fehlendem WebGL bleibt ein Standbild mit funktionierenden Blasen; reduzierte Bewegung schaltet die Körpergesten ab. Keine neue Migration, kein externer Sprachdienst.

## 12. Oberfläche (Schüler)

| Bildschirm | Inhalt |
| --- | --- |
| Login | Spitzname, Passwort, „Los geht's“; Fehlermeldung verständlich („Spitzname oder Passwort stimmt nicht“) |
| Dorf (Haupt) | 3D-Ansicht; Avatar-Feld mit Figurenbild, Rahmen, Level-Wappen, XP, Münzen und Serie; Symbolknöpfe Aufgaben und Mein Haus direkt neben dem Avatar oben rechts; keine Dorf-/Marktplatz-Schaltfläche oder blaue Leiste |
| Mein Profil | Kompakter Fortschritt, Serie/Schild, Tagesziel, interaktive 3D-Truhen, Zugang zur Sammlung und Einstellungen (§8b) |
| Meine Sammlung | Eigene Profil-Unterseite, Reiter Titel/Rahmen, freigeschaltete Auswahl und gesperrte Einträge mit benötigtem Level (§8b) |
| Daily Quests (Knopf „Aufgaben“) | „Heute“ und „Nachholen von gestern“ mit Belohnung bzw. „gelöst ✓“; eine Quest aufklappen und lösen; kleines Sir-Byte-Fenster mit englischer Ermutigung; deutsche Rückmeldung richtig/falsch mit englischem Tipp; Hören mit „▶ Anhören“ oder sichtbarem Text (§9, §11a) |
| Erststart-Tutorial | Sir Byte begrüßt am Markt und begleitet die Figur zur Ruine; Quiz mit kleinem 3D-Fenster, Haus kaufen und aufstellen, gemeinsame Abschluss-Szene; Buttons und Fehler Deutsch (§8a, §11a) |
| Shop | Kategorien Deko / Avatar; Preis, „Kaufen“ (mit eigener Bestätigung, kein `confirm()`); ausgegraut wenn zu teuer |
| Bauen | Kamera fährt zum eigenen Grundstück; Inventar-Leiste; Teil wählen → Raster erscheint → Feld antippen → Drehen/Entfernen; grün/rot für frei/belegt |
| Kleiderschrank | Eigene Zimmer-Szene über Hausmenü; drehbare Figur, direkte Auswahl besessener Teile, feste Farben und Fertig zum Speichern; Kaufen im Shop |
| Kontoauszug | letzte 30 Buchungen |

Touch-Ziele mind. 44 px; einfache Sprache; keine Emojis als Bedienelemente.

Datenschnittstelle ab Teil 1: Tageslisten enthalten drei oder vier Quests; `data.bank` ist optional und enthält Auswahlwörter, keine markierte Lösung. Hördateien liegen unter `import.meta.env.BASE_URL + listeningPath(data.speak)` mit britischer Sonia-Stimme bei `-10%`. Die Browseranbindung und Wortkacheln gehören zum separaten Oberfläche-Teil.

## 13. Lehrer-Bereich (`/lehrer/`)

Sieben Arbeitsseiten mit Klassenwahl 8a/8b, Abmelden und Adressen wie `#8a/muenzen`. Die Navigation klappt unter 1 024 px hinter „Menü“. Details: [Lehrerbereich, Fassung 2](superpowers/specs/2026-10-21-teacher-ui-design.md).

| Seite | Inhalt |
| --- | --- |
| Übersicht | Klassengröße, offenes Tutorial, Inaktivität ab 5 Tagen, Wochenstempel, Quest-Abdeckung; Nachricht ins Dorf (140 Zeichen, standardmäßig 7 Tage); Zugang zum Tafelmodus |
| Schüler | Alphabetische Liste, Suche und Filter; Münzen, Grundstück/Tutorial, Quests der Woche und letzte Aktivität (Berlin); Level/XP/Serie kompakt beim Spitznamen; seitliche Details mit Besitz, Quests und den letzten 50 Buchungen |
| Münzen & Stempel | +5/+10/+20/+100/−5/−10, optionale Gründe, Mehrfachbuchung, Rückgängig für 10 Sekunden; freie Korrektur und Wochenstempel; Touch-Ziele mindestens 44 px, auch ab 768 px Breite |
| Daily Quests | Vorhandene Abdeckung, Importfehler und Vorschau der nächsten 7 Tage mit Lösungen; keine alte Aufgaben-Statistik |
| Konten | Einzeln/Liste anlegen, Passwort zurücksetzen, geschütztes Löschen; Zugangskärtchen mit lokal erzeugten QR-Codes, nur für in dieser Sitzung angelegte/zurückgesetzte Zugänge |
| Dorf & Regeln | Shop/Bauen, Vorlage und Seed mit Bestätigung, Spielregeln und verkaufte Gegenstände |
| Saison | Saisons mit Zustand, Start/Ende ändern (Ende Sonntag), „Jetzt starten“, „Jetzt beenden“ mit automatischer Gutschrift, „Saison abschließen“, Klassenübersicht mit XP/Stufe/Truhen/Serie |
| Tafelmodus | Nur aggregierte Klassenwerte und Nachricht, jede Minute aktualisiert, Vollbild/Zurück; keine Spitznamen, individuellen Münzstände, XP oder Inaktivität |

Nachrichten stehen als Text auf einem Zettel an der Tafel und einmal als Karte im Dorf. Beim normalen Login kommt die Karte vor der Fortschritts-Willkommenskarte, während des Tutorials erst nach dessen Ende. Gesehen-Merker vertragen gesperrten lokalen Speicher. QR-Zugänge stehen nur im URL-Fragment; dieses wird sofort aus Adresse/Verlauf entfernt. Anmeldung erfolgt ausschließlich über die normale Authentifizierung, ohne externen QR-Dienst.

„Als Schüler ansehen“ öffnet ein eigenes Dorf mit Band und Rückweg zur Lehrkraft. Es nutzt die gewohnte Dorfgeometrie, eigene Hausmarkierung und Bewohner, enthält aber keinen Schüler-Aktionscontroller: kein Profil, Shop, Inventar, Bauen, Tutorial oder Buchungen. Nur „Aufgaben“ öffnet eine reine Leseliste; die vereinfachte Schülernavigation ohne Dorf-Knopf bleibt berücksichtigt.

**Neue Datenbankfunktionen, Migration 0022 (nur Lehrkräfte):**

| RPC | Zweck |
| --- | --- |
| `teacher_class_pupils(class_id, week)` | Spielstand und Aktivität, Woche muss Montag sein; keine Auth-Zugangsdaten |
| `teacher_pupil_detail(player_id)` | Besitz, laufende Woche und letzte 50 Kontoauszug-Zeilen |
| `adjust_coins_many(player_ids, delta, note)` | Eine Transaktion für alle Schüler oder keinen; sortierte Sperren, Pflichtnotiz, keine doppelten/leeren IDs oder negativen Stände |
| `class_board(class_id)` | Nur Wochenziel, gelöste Quests, Tageswert, Klassen-Serie, Stempelzahl und Nachricht |
| `set_class_notice(class_id, text, valid_until)` | Nachricht veröffentlichen oder mit null entfernen; Schüler lesen ausschließlich gültige Nachrichten der eigenen Klasse über RLS |
| `teacher_village_members(class_id)` | Klassenmitglieder für die Leseansicht ohne Münzen oder private Aktivitätsdaten |
| `teacher_pupil_quests(player_id)` | Heute/gestern mit gelöst/Versuche, ohne Lösung oder Tipp |

Zukünftige Quest-Versuche erhalten einen Zeitstempel, auch wenn sie falsch sind. Alte ungelöste Versuche ohne Zeitstempel werden bei der Migration nicht als neue Aktivität ausgegeben. Alle Änderungen an Münzen bleiben serverseitig; Rückgängig ist eine Gegenbuchung mit ursprünglicher Notiz und kann bei inzwischen ausgegebenen Münzen vollständig scheitern.

### 13.1 Season I – LearnPass (Migrationen 0028–0032)

Eine Saison läuft in einem festen Fenster (Europe/Berlin); Season I: **28.10.–06.12.2026**. Schüler öffnen den LearnPass über die Profilkarte und die Kürbisbude am Markt. Die Marktstimmung (dunkler Himmel, Nebel, Blutmond, warmes Standlicht) gilt nur im Saisonfenster; außerhalb bleibt LOOK §3 maßgeblich.

- **XP und Stufen:** Summe `xp_ledger.delta` im Fenster; 40 Stufen bis 3.000 XP (30/60/90/120 XP je Zehnerblock).
- **Belohnungen:** 5 Münzen auf Stufe 1–20 und 25 Münzen je Meilenstein; Pass-Truhen auf 5, 10, …, 40; 12 Garten-Szenen auf den Deko-Stufen; 4 Titel und 4 Rahmen; Stufe 40 mit Truhe, Titel, 25 Münzen und freier Wahl aus dem Truhen-Pool.
- **Truhen:** Chancen 55/30/12/3 % innerhalb der Seltenheit gleich verteilt. Duplikate bleiben als Menge im Inventar und sind für 15/40/100/250 Münzen verkaufbar, aber nur unplatzierte Season-Gegenstände. Haus, Garage und Auto zahlen beim zweiten Treffer den Verkaufswert.
- **Serie:** eigener Kalenderzähler; jeder dritte Tag in Folge mit mindestens einer gelösten Quest gibt eine Truhe. Die Schultags-Serie bleibt unverändert. Shop-Truhe: 50 Münzen, zwei pro Berliner Woche.
- **Saisonende:** erreichte, nicht abgeholte Stufen werden automatisch gutgeschrieben (beim nächsten Aufruf und über „Jetzt beenden“); ungeöffnete Truhen und die Stufe-40-Wahl bleiben danach möglich.

**Lehrer-RPCs (0032, nur Lehrkräfte, Zeilensperre):**

| RPC | Zweck |
| --- | --- |
| `teacher_seasons()` | alle Saisons mit Zustand (`planned`/`running`/`ended`/`closed`), Tagen, Stufen, Gegenständen |
| `teacher_set_season_dates(season, start, ende)` | Daten ändern; Ende Sonntag, nach Start, ohne Überschneidung, nicht vor heute solange laufend, nicht nach `closed_at` |
| `teacher_start_season_now(season)` | geplante Saison beginnt heute; keine zweite laufende Saison |
| `teacher_end_season_now(season)` | Ende auf gestern, danach `close_season` mit Gutschrift |
| `teacher_season_overview(class, season)` | XP, Stufe, abgeholte Stufen, Truhen und Serie je Schüler |

Datumsänderungen wirken sofort: Abgeholte Stufen bleiben, XP vor dem neuen Start zählen nicht mehr. Die Sonntagsregel prüft nur `teacher_set_season_dates`; „Jetzt beenden“ darf früher enden. Details für die Lehrkraft: [Anleitung für die Lehrkraft](ANLEITUNG_LEHRKRAFT.md#season-i--halloween-learnpass).

## 14. Wirtschaft (Standardwerte; je Instanz in `classes` änderbar, Preise in `items`)

| Größe | Standard |
| --- | --- |
| Stempel (vollständiger Wochenplan) | 100 Münzen |
| Daily Quest | 1–20 Münzen je Quest, Richtwert 5 / 10 / 15 (leicht/mittel/schwer); 3 Quests pro Tag |
| Nachholen am Folgetag | halbe Belohnung, aufgerundet |
| Versuche je Quest | unbegrenzt; Münzen nur bei richtiger Antwort in den ersten 3 Versuchen (`quest_paid_attempts()`) |
| Tageslimit Daily Quests | keins (höchstens 3 Quests heute und 3 zum Nachholen) |
| Alte Wochenaufgaben (Geschichte) | Tageslimit 60 Münzen, 3 Versuche pro Aufgabe und Tag (`classes`) |
| Deko | 20–250 Münzen |
| Avatar-Teile | 30–300 Münzen, seltene bis 500 |
| XP | Werte und Kurve in `xp_rule` / `xp_for_level`; kein Abzug, nur serverseitige Buchungen (§8b) |
| Truhe | 20 + 5 × Level Münzen; große Truhe ×3; Serverwurf 70 % einfach / 25 % doppelt / 5 % dreifach; einmalige Buchung |

Ziel: Pro Woche mindestens ein neues Teil erreichbar, große Wünsche brauchen 3–6 Wochen. **[OFFEN]** Beträge mit der Lehrkraft final abstimmen.

## 15. Assets und Blender-Pipeline

- Quellen: CC0-Pakete (z. B. Kenney, Quaternius). Vor Verwendung Lizenz prüfen; jede Quelle in `blender/sources/LICENSES.md` mit Link und Lizenz.
- Skript `blender/scripts/build_assets.py` (headless: `blender -b -P …`):
  1. Modelle importieren
  2. auf die Lerndorf-Palette umfärben (Mapping-Tabelle `palette.json`)
  3. Umgebungsverdeckung als Vertex-Farbe einbacken
  4. Polygone reduzieren (Decimate) auf Budget
  5. als GLB exportieren → `gltf-transform` (meshopt, KTX2, dedup, prune) → `web/public/assets/`
- Budgets: Deko-Teil ≤ 1.500 Dreiecke, Haus ≤ 4.000, Avatar komplett ≤ 3.000.
- Erster Schritt der Stufe 2 ist ein **Stil-Test**: 1 Haus-Set, 5 Deko-Teile, 1 animierte Figur im Prototyp-Dorf, mit Vorher/Nachher-Screenshots zur Abnahme.
- Falls die Arbeitsumgebung die Quellpakete nicht herunterladen kann: Lehrkraft lädt die ZIPs und legt sie in `blender/sources/`.

## 16. Nicht-funktionale Anforderungen

| Bereich | Anforderung |
| --- | --- |
| Leistung | ≥ 30 fps auf dem ältesten Schul-Tablet bei 32 Figuren (Qualität automatisch); Draw Calls < 150 gesamt, Welt allein < 60; Dreiecke < 150.000 |
| Ladezeit | erster Start < 8 s im Schul-WLAN; Download < 8 MB; danach Browser-Cache |
| Qualitätsstufen | Auto (misst die ersten 5 s), Hoch, Niedrig: Schatten, Pixeldichte, Punktlichter |
| Browser | aktuelle Safari (iPadOS), Chrome (Android, Windows), Edge |
| Ausfallsicherheit | Verbindung weg → verständlicher Hinweis, Dorf bleibt sichtbar, Aktionen gesperrt |
| Weck-Auftrag | GitHub Action alle 3 Tage: eine leichte Abfrage an Supabase (verhindert die 7-Tage-Pause des Free-Plans) |
| Sicherheit | Service-Key nur in GitHub-Secrets und Edge Function; Anon-Key im Client ist ok; RLS auf jeder Tabelle; kein `eval`, kein HTML aus Daten |
| Datenschutz | keine Analytics/Tracker, keine externen Schriften zur Laufzeit außer selbst gehosteten; Impressum/Datenschutzhinweis im Footer **[OFFEN: Text mit Schulleitung]** |
| Barrierefreiheit | Kontrast der UI ≥ 4.5:1, Bewegung reduzierbar (`prefers-reduced-motion` → weniger Kamerafahrten) |

## 17. Deploy und Betrieb

- `deploy.yml`: bei Push auf `main` nur Tests. Cloudflare Pages baut und veröffentlicht die Seite selbst (Git-Integration, Root `web`, Build `npm ci && npm run build`, Ausgabe `dist`, Variablen `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` im Cloudflare-Projekt).
- Supabase-Migrationen über Supabase CLI (`supabase db push`), lokal mit `supabase start` testbar.
- Secrets (von der Lehrkraft einzutragen, Anleitung in `docs/ANLEITUNG_LEHRKRAFT.md`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
- Die Lehrkraft muss anlegen: GitHub-Repo `Lerndorf`, Supabase-Projekt (Region `eu-west-1`, Irland – so von der Lehrkraft gewählt). Schritte dafür als einfache Anleitung mit Screenshots-Beschreibung.

## 18. Tests und Abnahme

- **Vitest:** Layout deterministisch (gleiche Vorlage + Seed ⇒ gleiche Positionen), Grundstücke überlappen nicht, kein Grundstück im Fluss oder am Steilhang (Hangregel), jeder Hauseingang und jedes Wahrzeichen über den Wegegraph vom Marktplatz erreichbar, keine Sackgassen, `plot_index` aufsteigend nach Wegstrecke zum Marktplatz, keine Vegetation auf Wegen/Plätzen/Grundstücken/Wasser, Mengen aus §10.6 eingehalten; Antwort-Normalisierung; Raster-Kollision.
- **Layout-Galerie** (§10.12) bei jeder Änderung an `world/` oder `render/village*` neu erzeugen; Draw Calls der Welt pro Bild protokollieren.
- **SQL-Tests** (pgTAP oder Skript gegen lokales Supabase): **Instanz-Trennung** – ein Schüler der 8a sieht keine Bewohner, Platzierungen, Aufgaben-Ergebnisse oder Einstellungen der 8b und kann keine RPC mit Wirkung auf die 8b auslösen; Regeln einer Instanz wirken nicht in der anderen; `move_class` nach §1a; Schüler kann keine Tabelle direkt schreiben; `task_solutions` nicht lesbar; Tageslimit, Doppel-Stempel, Kauf ohne Geld, Platzieren ohne Besitz werden abgelehnt; Ledger-Summe = Münzstand.
- **Playwright-Smoke:** Login → Dorf rendert ohne Konsolenfehler → Aufgabe lösen → Münzen steigen → Item kaufen → platzieren.
- Abnahme jeder Stufe durch die Lehrkraft auf einem Schul-Tablet.

### Abnahmekriterien je Stufe

| Stufe | Abgenommen, wenn |
| --- | --- |
| 1 | Instanz-Trennung per SQL-Test belegt; Lehrkraft legt per Liste 5 Testkonten an, druckt Zugangskärtchen; Schüler-Login auf dem Tablet zeigt das Dorf der richtigen Klasse mit eigenem Haus; Auto-Logout funktioniert; Stempel buchen erhöht Münzstand; Weck-Auftrag läuft |
| 1b | Layout-Galerie: alle Befunde aus `REVIEW_2026-10-17_Dorflayout.md` behoben; 8a/8b sichtbar verschieden; Welt < 60 Draw Calls; Lehrkraft gibt das Layout anhand der Galerie frei |
| 2 | Stil-Test freigegeben; Dorf im Comic-Look; Avatar-Editor speichert; alle Figuren der Klasse laufen mit echten Animationen; ≥ 30 fps auf dem ältesten Tablet |
| 3 | Aufgaben-JSON einer Woche wird per Push importiert; Lösen bringt Münzen; Limit und Versuche greifen; Lösungen nicht im Netzwerkverkehr vor dem Lösen sichtbar. Für die Daily Quests gelten die Kriterien aus `docs/superpowers/specs/2026-10-20-daily-quests-design.md` §8 (PLAN Q.10) |
| 4 | Kaufen, Platzieren, Drehen, Entfernen funktionieren; andere Schüler sehen die Deko nach Neuladen; Sperr-Schalter wirken |
| 5 | 1 Woche Probebetrieb in einer Klasse ohne Datenfehler; Lehrer-Anleitung vorhanden |

## 19. Offene Punkte

| # | Frage | Standard bis zur Klärung |
| --- | --- | --- |
| 1 | Klassengröße 8a / 8b | je 32 Plätze pro Instanz |
| 2 | Münzbeträge, Tageslimit | §14 |
| 3 | Aufgaben auch zu Hause? | ja, gleiche Regeln |
| 4 | Ältere Wochen: Belohnung | Daily Quests: Nachholen nur am Folgetag zur halben Belohnung (aufgerundet), §9 |
| 5 | Ältestes Tablet-Modell | Qualität „Auto“ entscheidet |
| 6 | Datenschutz-/Impressumstext | Platzhalter, mit Schulleitung klären |
| 7 | Vorlage und Seed pro Klasse | 8a: Vorlage 1, 8b: Vorlage 2; Lehrkraft kann im Lehrer-Bereich wechseln |
| 8 | Wahrzeichen je Vorlage | Vorschlag von Claude Code in der Galerie, Lehrkraft entscheidet |
