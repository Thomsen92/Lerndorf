# Lerndorf – Technische Spezifikation

Stand: 17.10.2026 · gehört zu [SCOPE.md](SCOPE.md) · Referenz-Implementierung für Dorf und Figuren: [`../Prototyp/index.html`](../Prototyp/index.html)

Markierung offener Punkte: **[OFFEN]** = mit der Lehrkraft klären; bis dahin den genannten Standardwert verwenden und konfigurierbar halten.

---

## 1. Architektur

```
Tablet (Browser)                         Supabase (Frankfurt)
┌──────────────────────────┐   HTTPS    ┌───────────────────────────────┐
│ web/ (Vite-Build)        │──────────▶│ Auth (E-Mail/Passwort,        │
│  Three.js-Dorf           │            │   Pseudo-Adressen)            │
│  Aufgabentafel, Shop,    │            │ Postgres + Row Level Security │
│  Baumodus, Avatar-Editor │──RPC─────▶│ RPC-Funktionen (Spiellogik)   │
│  Lehrer-Bereich          │            │ Edge Function admin-accounts  │
└──────────────────────────┘            └───────────────────────────────┘
        ▲ ausgeliefert von                        ▲
GitHub Pages (Repo „Lerndorf“)          GitHub Actions: Deploy, Aufgaben-
                                         Import, Weck-Anfrage
```

**Grundsatz:** Der Browser zeigt nur an. Alles, was Münzen, Besitz oder Platzierungen verändert, läuft über RPC-Funktionen mit `security definer`, die prüfen und dann buchen. Tabellen sind für Clients **nur lesbar** (über RLS), nie direkt beschreibbar.

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
      ui/          hud, Aufgabentafel, Shop, Inventar, Baumodus, Editor, Toasts
      teacher/     Lehrer-Bereich
    public/assets/ GLB-Modelle, Texturen (komprimiert)
    tests/
  supabase/
    migrations/    SQL (Schema, RLS, Funktionen, Seed)
    functions/admin-accounts/   Edge Function
  content/
    tasks/         Aufgaben pro Woche: 2026-11-09.json …
    items.json     Shop-Katalog
  blender/
    scripts/       Headless-Pipeline (Python)
    sources/       CC0-Quellpakete (nicht ins Repo, .gitignore) + LICENSES.md
  .github/workflows/  deploy.yml, import-content.yml, keepalive.yml
```

## 3. Technik-Stack

| Bereich | Wahl | Hinweis |
| --- | --- | --- |
| Sprache | TypeScript (strict) | UI-Texte Deutsch, Code/Kommentare Englisch |
| Build | Vite | `base: '/Lerndorf/'` für GitHub Pages |
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
  layout_seed int not null,            -- bestimmt Gelände, Grundstücke, Bäume
  shop_open boolean not null default true,
  build_open boolean not null default true,
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
  reason text not null check (reason in ('task','stamp','purchase','refund','teacher')),
  ref text,                            -- task_id, item_id, Woche …
  created_by uuid,                     -- Lehrkraft bei stamp/teacher
  created_at timestamptz default now()
);

create table settings (                -- eine Zeile
  id int primary key default 1 check (id = 1),
  stamp_reward int not null default 100,
  daily_task_cap int not null default 60,
  max_attempts int not null default 3,
  plot_cols int not null default 7, plot_rows int not null default 6
);
```

**Invariante:** `profiles.coins` = Summe von `coin_ledger.delta` des Spielers. Nur RPC-Funktionen schreiben beides in derselben Transaktion.

## 6. Row Level Security

| Tabelle | Schüler lesen | Schüler schreiben | Lehrkraft |
| --- | --- | --- | --- |
| classes | eigene Klasse | – | alles |
| profiles | Profile der eigenen Klasse: nur `id, nickname, plot_index, avatar` (über View `village_members`); eigenes Profil inkl. `coins` | – (nur RPC) | alles |
| items | aktive Items | – | alles |
| inventory | eigenes | – | alles |
| placements | alle der eigenen Klasse | – | alles |
| tasks | aktive der eigenen Klasse, Woche ≤ heute | – | alles |
| task_solutions | **nie** | – | über RPC/Import |
| task_results | eigene | – | alles |
| coin_ledger | eigene | – | alles |
| settings | lesen | – | schreiben |

Münzstände anderer Schüler sind für Schüler **nicht** sichtbar.

## 7. Avatar-Rezept

```json
{ "v": 1, "skin": 2, "hair": "hair_05", "hairColor": "#c0502f",
  "top": "top_hoodie", "topColor": "#4b7bec", "pants": "pants_jeans",
  "hat": null, "acc": "acc_headphones", "pet": null, "eyes": 1 }
```
- Teile mit `starter = true` sind frei wählbar, alle anderen nur, wenn im Inventar.
- Speichern über RPC `save_avatar(recipe jsonb)`; Funktion validiert jedes Teil gegen Inventar/Starter und Farben gegen eine feste Palette (Hex-Liste in `settings` oder Code).
- Grundausstattung (Starter): 3 Frisuren, alle Haarfarben, alle Hauttöne, 3 Oberteile, 2 Hosen.

## 8. RPC-Funktionen (Postgres, `security definer`, `set search_path = public`)

| Funktion | Wer | Prüft | Wirkung | Rückgabe |
| --- | --- | --- | --- | --- |
| `submit_answer(task_id text, answer jsonb)` | Schüler | Aufgabe aktiv, eigene Klasse, Woche ≤ heute; heute noch nicht gelöst; `attempts < max_attempts`; Tageslimit (Summe `task`-Buchungen heute + reward ≤ `daily_task_cap`) | `attempts+1`; bei richtig: `solved`, Buchung `+reward` | `{correct, coins, attempts_left, solution?}` – Lösung erst nach letztem Fehlversuch |
| `buy_item(item_id text)` | Schüler | Item aktiv, Shop der Klasse offen, genug Münzen | Buchung `-price`, Inventar +1 | `{coins, qty}` |
| `place_item(item_id text, x int, z int, rot int)` | Schüler | Bau offen; freie Menge im Inventar (qty − platzierte); Footprint im Raster, nicht im Hausbereich, keine Überlappung | Zeile in `placements` | `placement_id` |
| `remove_placement(id bigint)` | Schüler | gehört dem Spieler | löschen (Item geht ins Inventar zurück) | ok |
| `save_avatar(recipe jsonb)` | Schüler | s. §7 | `profiles.avatar` | ok |
| `add_stamps(class_id text, week date, player_ids uuid[])` | Lehrkraft | Rolle; pro Spieler und Woche nur ein Stempel (`ref = week`) | Buchung `+stamp_reward` je Spieler | Anzahl gebucht |
| `adjust_coins(player_id uuid, delta int, note text)` | Lehrkraft | Rolle; Ergebnis ≥ 0 | Buchung `teacher` | neuer Stand |
| `set_class_flags(class_id, shop_open, build_open)` | Lehrkraft | Rolle | Update | ok |

**Antwortprüfung** (`submit_answer`): Vergleich nach Normalisierung – trimmen, Kleinschreibung, mehrfache Leerzeichen zusammenfassen, typografische Apostrophe → `'`. `gap` erlaubt mehrere richtige Lösungen (Array). Kein Teilpunkt.

**Edge Function `admin-accounts`** (nur Lehrkraft): `create` (nickname, password, class_id → nächster freier `plot_index`), `reset_password`, `move_class`, `delete`. Bulk-Anlegen aus einer Liste (eine Zeile pro Schüler: `Spitzname;Passwort;Klasse`).

## 9. Aufgaben-Inhalte

Datei `content/tasks/<Montag>.json`:
```json
{ "week": "2026-11-09", "class": null, "tasks": [
  { "id": "v01", "type": "choice", "reward": 5,
    "prompt": "What is 'Fahrkarte' in English?",
    "options": ["ticket", "card", "map", "fare"], "solution": "ticket" },
  { "id": "g01", "type": "gap", "reward": 10,
    "prompt": "Yesterday we ___ (go) to Brooklyn.", "solution": ["went"] },
  { "id": "m01", "type": "match", "reward": 15,
    "pairs": [["subway","U-Bahn"],["sidewalk","Gehweg"],["block","Häuserblock"]] }
]}
```
- Workflow `import-content.yml` (bei Push auf `content/**`): validiert JSON (Schema in `content/schema.json`), schreibt `tasks` (ohne Lösung) und `task_solutions` per Service-Key aus GitHub-Secret. IDs werden mit Woche präfixiert.
- Aufgaben einer Woche werden ab Montag 00:00 (Europe/Berlin) sichtbar; ältere Wochen bleiben sichtbar (Wiederholung), bringen aber nur die halbe Belohnung **[OFFEN, Standard: halbe Belohnung]**.
- Inhaltlich passend zu den Wochenplänen (Highlight 8, Unit 1 …); Erstellung durch Claude im Wochenplan-Projekt, nicht Teil dieser App.

## 10. Dorf (Welt)

Referenz: `Prototyp/index.html` (`buildWorld`, Wegenetz, `Avatar`-Klasse).

- **Deterministisch:** `layout(classes.layout_seed, Anzahl Grundstücke)` erzeugt Gelände, Fluss, Wege, Grundstücksplätze, Bäume. Gleicher Seed + gleiche Zahl ⇒ identisches Dorf auf jedem Gerät (eigener seeded PRNG, kein `Math.random` in der Welt). Unit-Test dafür.
- Gelände: Höhenfeld (Summe von Sinuswellen + Anstieg zum Rand), Fluss als Spline mit ausgefrästem Bett, Brücken automatisch an Weg/Fluss-Kreuzungen, Grundstücke und Marktplatz eingeebnet.
- Grundstücke: Anzahl = Schüler der Klasse + 2 Reserve; verstreut entlang der Wege, Abstand variiert; jeder `plot_index` hat eine feste Position.
- Grundstücksraster: `plot_cols × plot_rows` Zellen à 1 m; hintere Zellen (Haus) gesperrt; Tor vorne mittig.
- Marktplatz: Brunnen, Aufgabentafel mit schwebendem „!“, Stände, Bänke, Laternen.
- Licht: Abendstimmung; Fenster und Laternen leuchten (emissive + additive Lichtflecken); echte Punktlichter nur am Marktplatz und nur in Qualität „Hoch“.
- Kamera: schräg von oben, Wischen verschiebt, zwei Finger drehen/zoomen, begrenzt auf das Tal. Start: auf das eigene Grundstück schauen. Knopf „Zum Marktplatz“, „Zu meinem Haus“.
- Die Lehrkraft kann pro Klasse aus mehreren Seeds wählen (Vorschau im Lehrer-Bereich). Wechsel des Seeds nach Start nur mit Warnung (Grundstücke bleiben über `plot_index` erhalten, Lage ändert sich).

## 11. Avatare und Verhalten

- Ein gemeinsames Skelett, Teile als austauschbare Meshes (SkinnedMesh), Farben über Materialien/Vertex-Farben. Ziel: **1–2 Draw Calls pro Figur**.
- Animationen (aus CC0-Paket oder eigen): idle, walk, sit, wave; weich überblenden (`AnimationMixer`, crossFade 0,2–0,3 s).
- Verhalten wie im Prototyp: Zustandsautomat idle → walk → (sit | idle | greet); Ziele: eigenes Haus, Bank, Aufgabentafel (max. 3 gleichzeitig), Brunnen, Haus eines Freundes, zufälliger Wegpunkt. Routen über Wegegraph (BFS/A*), geglättet (Catmull-Rom), sanftes Beschleunigen/Bremsen, Ausweichen, Begrüßen mit Sprechblase (nur feste englische Grußwörter).
- Figuren laufen auf Gelände- bzw. Brückenhöhe.
- Eigener Avatar: kleiner Marker (z. B. Pfeil) über dem Kopf.
- Spitznamen-Schild über dem Kopf, verdeckt durch Gebäude.

## 12. Oberfläche (Schüler)

| Bildschirm | Inhalt |
| --- | --- |
| Login | Spitzname, Passwort, „Los geht's“; Fehlermeldung verständlich („Spitzname oder Passwort stimmt nicht“) |
| Dorf (Haupt) | 3D-Ansicht; oben: Spitzname, Münzstand; unten: Knöpfe Aufgaben, Shop, Bauen, Mein Avatar, Abmelden |
| Aufgabentafel | Liste der Aufgaben der Woche mit Belohnung und Status (offen/gelöst/gesperrt); Aufgabe lösen; Rückmeldung richtig/falsch, Versuche übrig; Tageslimit-Anzeige |
| Shop | Kategorien Deko / Avatar; Preis, „Kaufen“ (mit eigener Bestätigung, kein `confirm()`); ausgegraut wenn zu teuer |
| Bauen | Kamera fährt zum eigenen Grundstück; Inventar-Leiste; Teil wählen → Raster erscheint → Feld antippen → Drehen/Entfernen; grün/rot für frei/belegt |
| Mein Avatar | Vorschau, Kategorien, Farbwähler (feste Palette), gesperrte Teile mit Preis |
| Kontoauszug | letzte 30 Buchungen |

Touch-Ziele mind. 44 px; einfache Sprache; keine Emojis als Bedienelemente.

## 13. Lehrer-Bereich (`/lehrer`)

- Klassen-Übersicht: Spitzname, Münzen, letzte Anmeldung, Aufgaben diese Woche gelöst.
- **Stempel buchen:** Klasse + Woche (Montag) wählen → Liste mit Häkchen → „Stempel buchen“. Bereits gebuchte Stempel sind markiert. Ziel: eine Klasse < 3 Min.
- Konten: anlegen (einzeln/Liste), Passwort zurücksetzen, löschen; Druckansicht „Zugangskärtchen“ (Spitzname + Passwort, zum Ausschneiden).
- Münzen korrigieren mit Notiz.
- Schalter: Shop offen, Bauen offen (pro Klasse).
- Dorf-Layout wählen (Seed-Vorschau).
- Aufgaben-Statistik pro Aufgabe (Anteil richtig) – hilft bei der Unterrichtsplanung.

## 14. Wirtschaft (Standardwerte, alles in `settings`/`items` änderbar)

| Größe | Standard |
| --- | --- |
| Stempel (vollständiger Wochenplan) | 100 Münzen |
| Aufgabe | 5 / 10 / 15 Münzen (leicht/mittel/schwer) |
| Tageslimit Aufgaben | 60 Münzen |
| Versuche pro Aufgabe und Tag | 3 |
| Deko | 20–250 Münzen |
| Avatar-Teile | 30–300 Münzen, seltene bis 500 |

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
| Leistung | ≥ 30 fps auf dem ältesten Schul-Tablet bei 32 Figuren (Qualität automatisch); Draw Calls < 150; Dreiecke < 150.000 |
| Ladezeit | erster Start < 8 s im Schul-WLAN; Download < 8 MB; danach Browser-Cache |
| Qualitätsstufen | Auto (misst die ersten 5 s), Hoch, Niedrig: Schatten, Pixeldichte, Punktlichter |
| Browser | aktuelle Safari (iPadOS), Chrome (Android, Windows), Edge |
| Ausfallsicherheit | Verbindung weg → verständlicher Hinweis, Dorf bleibt sichtbar, Aktionen gesperrt |
| Weck-Auftrag | GitHub Action alle 3 Tage: eine leichte Abfrage an Supabase (verhindert die 7-Tage-Pause des Free-Plans) |
| Sicherheit | Service-Key nur in GitHub-Secrets und Edge Function; Anon-Key im Client ist ok; RLS auf jeder Tabelle; kein `eval`, kein HTML aus Daten |
| Datenschutz | keine Analytics/Tracker, keine externen Schriften zur Laufzeit außer selbst gehosteten; Impressum/Datenschutzhinweis im Footer **[OFFEN: Text mit Schulleitung]** |
| Barrierefreiheit | Kontrast der UI ≥ 4.5:1, Bewegung reduzierbar (`prefers-reduced-motion` → weniger Kamerafahrten) |

## 17. Deploy und Betrieb

- `deploy.yml`: bei Push auf `main` → Tests → Vite-Build → GitHub Pages.
- Supabase-Migrationen über Supabase CLI (`supabase db push`), lokal mit `supabase start` testbar.
- Secrets (von der Lehrkraft einzutragen, Anleitung in `docs/ANLEITUNG_LEHRKRAFT.md`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`.
- Die Lehrkraft muss anlegen: GitHub-Repo `Lerndorf`, Supabase-Projekt (Region `eu-central-1`, Frankfurt). Schritte dafür als einfache Anleitung mit Screenshots-Beschreibung.

## 18. Tests und Abnahme

- **Vitest:** Layout deterministisch (gleicher Seed ⇒ gleiche Positionen), Grundstücke überlappen nicht, kein Grundstück im Fluss, jeder Hauseingang über den Wegegraph vom Marktplatz erreichbar; Antwort-Normalisierung; Raster-Kollision.
- **SQL-Tests** (pgTAP oder Skript gegen lokales Supabase): Schüler kann keine Tabelle direkt schreiben; `task_solutions` nicht lesbar; Tageslimit, Doppel-Stempel, Kauf ohne Geld, Platzieren ohne Besitz werden abgelehnt; Ledger-Summe = Münzstand.
- **Playwright-Smoke:** Login → Dorf rendert ohne Konsolenfehler → Aufgabe lösen → Münzen steigen → Item kaufen → platzieren.
- Abnahme jeder Stufe durch die Lehrkraft auf einem Schul-Tablet.

### Abnahmekriterien je Stufe

| Stufe | Abgenommen, wenn |
| --- | --- |
| 1 | Lehrkraft legt per Liste 5 Testkonten an, druckt Zugangskärtchen; Schüler-Login auf dem Tablet zeigt das Dorf der richtigen Klasse mit eigenem Haus; Auto-Logout funktioniert; Stempel buchen erhöht Münzstand; Weck-Auftrag läuft |
| 2 | Stil-Test freigegeben; Dorf im Comic-Look; Avatar-Editor speichert; alle Figuren der Klasse laufen mit echten Animationen; ≥ 30 fps auf dem ältesten Tablet |
| 3 | Aufgaben-JSON einer Woche wird per Push importiert; Lösen bringt Münzen; Limit und Versuche greifen; Lösungen nicht im Netzwerkverkehr vor dem Lösen sichtbar |
| 4 | Kaufen, Platzieren, Drehen, Entfernen funktionieren; andere Schüler sehen die Deko nach Neuladen; Sperr-Schalter wirken |
| 5 | 1 Woche Probebetrieb in einer Klasse ohne Datenfehler; Lehrer-Anleitung vorhanden |

## 19. Offene Punkte

| # | Frage | Standard bis zur Klärung |
| --- | --- | --- |
| 1 | Klassengröße 8a / 8b | je 32 Plätze möglich |
| 2 | Münzbeträge, Tageslimit | §14 |
| 3 | Aufgaben auch zu Hause? | ja, gleiche Regeln |
| 4 | Ältere Wochen: Belohnung | halbe Belohnung |
| 5 | Ältestes Tablet-Modell | Qualität „Auto“ entscheidet |
| 6 | Datenschutz-/Impressumstext | Platzhalter, mit Schulleitung klären |
| 7 | Seed pro Klasse | Lehrkraft wählt im Lehrer-Bereich |
