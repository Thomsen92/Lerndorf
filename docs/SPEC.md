# Lerndorf – Technische Spezifikation

Stand: 17.10.2026 · gehört zu [SCOPE.md](SCOPE.md) · Referenz-Implementierung für Dorf und Figuren: [`../Prototyp/index.html`](../Prototyp/index.html)

Markierung offener Punkte: **[OFFEN]** = mit der Lehrkraft klären; bis dahin den genannten Standardwert verwenden und konfigurierbar halten.

---

## 1. Architektur

```
Tablet (Browser)                         Supabase (EU)
┌──────────────────────────┐   HTTPS    ┌───────────────────────────────┐
│ web/ (Vite-Build)        │──────────▶│ Auth (E-Mail/Passwort,        │
│  Three.js-Dorf           │            │   Pseudo-Adressen)            │
│  Aufgabentafel, Shop,    │            │ Postgres + Row Level Security │
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
```

Alle RPCs lesen Belohnung, Tageslimit, Versuche und Raster aus der Zeile der Instanz in `classes`, nicht aus `settings`.

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
| class_items | eigene Instanz | – | alles |

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

**Edge Function `admin-accounts`** (nur Lehrkraft): `create` (nickname, password, class_id; der Schüler startet **ohne** Grundstück und wählt selbst, RPC `claim_plot`), `reset_password`, `move_class` (Regeln §1a), `delete`. Bulk-Anlegen aus einer Liste (eine Zeile pro Schüler: `Spitzname;Passwort;Klasse`).

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
- **Freie Plätze** (ohne Schüler): kein Haus, sondern Bauplatz-Optik (Wiese, Holzpflöcke an den Ecken, kleines Schild „frei“). Die Häuser sind nur Platzhalter. Ein Schüler ohne Grundstück wählt einen freien Platz, indem er auf die Wiese tippt (Bestätigung). Die Wahl gilt dauerhaft (RPC `claim_plot(p_index)`, nur solange kein Platz gewählt ist, Platz 0 bis 33). Am Anfang sind alle Plätze frei.
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

- **Instanz-Umschalter** (8a / 8b) oben; alle folgenden Ansichten gelten für die gewählte Instanz.
- Klassen-Übersicht: Spitzname, Münzen, letzte Anmeldung, Aufgaben diese Woche gelöst.
- Spielregeln der Instanz bearbeiten (Stempel-Belohnung, Tageslimit, Versuche) und Gegenstände je Instanz sperren.
- **Stempel buchen:** Klasse + Woche (Montag) wählen → Liste mit Häkchen → „Stempel buchen“. Bereits gebuchte Stempel sind markiert. Ziel: eine Klasse < 3 Min.
- Konten: anlegen (einzeln/Liste), Passwort zurücksetzen, löschen; Druckansicht „Zugangskärtchen“ (Spitzname + Passwort, zum Ausschneiden).
- Münzen korrigieren mit Notiz.
- Schalter: Shop offen, Bauen offen (pro Klasse).
- Dorf-Layout wählen: Kartenvorlage + Seed, mit Vorschaubild.
- Aufgaben-Statistik pro Aufgabe (Anteil richtig) – hilft bei der Unterrichtsplanung.

## 14. Wirtschaft (Standardwerte; je Instanz in `classes` änderbar, Preise in `items`)

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
| 3 | Aufgaben-JSON einer Woche wird per Push importiert; Lösen bringt Münzen; Limit und Versuche greifen; Lösungen nicht im Netzwerkverkehr vor dem Lösen sichtbar |
| 4 | Kaufen, Platzieren, Drehen, Entfernen funktionieren; andere Schüler sehen die Deko nach Neuladen; Sperr-Schalter wirken |
| 5 | 1 Woche Probebetrieb in einer Klasse ohne Datenfehler; Lehrer-Anleitung vorhanden |

## 19. Offene Punkte

| # | Frage | Standard bis zur Klärung |
| --- | --- | --- |
| 1 | Klassengröße 8a / 8b | je 32 Plätze pro Instanz |
| 2 | Münzbeträge, Tageslimit | §14 |
| 3 | Aufgaben auch zu Hause? | ja, gleiche Regeln |
| 4 | Ältere Wochen: Belohnung | halbe Belohnung |
| 5 | Ältestes Tablet-Modell | Qualität „Auto“ entscheidet |
| 6 | Datenschutz-/Impressumstext | Platzhalter, mit Schulleitung klären |
| 7 | Vorlage und Seed pro Klasse | 8a: Vorlage 1, 8b: Vorlage 2; Lehrkraft kann im Lehrer-Bereich wechseln |
| 8 | Wahrzeichen je Vorlage | Vorschlag von Claude Code in der Galerie, Lehrkraft entscheidet |
