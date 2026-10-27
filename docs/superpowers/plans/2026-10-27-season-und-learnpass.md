# Season I & LearnPass – Umsetzungsplan

**Stand:** 27.10.2026, nach Prüfung gegen den Repo-Stand überarbeitet · **Grundlage:** `docs/superpowers/specs/2026-10-26-learnpass-design.md`
**Repo-Stand:** Migrationen bis `0027`, 28 Season-Modelle und 6 Shop-Modelle unter `web/public/assets/`, vollständiges Kenney Graveyard Kit 5.0 unter `Lerndorf/Kenny/Graveyard`, LearnPass-Prototyp unter `web/dev/learnpass.html`.

**Vorrang:** Bei Zahlen und Regeln gilt dieser Plan (§2, §4). Das Design ist am 27.10. daran angeglichen; §13 listet jeden geklärten Widerspruch.

---

## 1. Ziel und Umfang

Eine **6-wöchige Saison** (Season I – Halloween) mit einem kostenlosen **LearnPass über 40 Stufen**, Season-Truhen mit vier Seltenheiten, einem kleinen Season-Shop und einer Sammlung exklusiver Deko. Kein Kauf, keine Premium-Spur, keine Echtgeld-Truhen, keine Spielvorteile.

**Im Umfang:** Season-Datenmodell, RPCs, LearnPass-Seite, Truhen im Inventar, Truhen-Vorschau, Shop-Truhe (2/Woche, 50 Münzen), Season-Serie mit Truhe alle 3 Kalendertage, Verkauf von Season-Duplikaten, Saisonende mit automatischer Gutschrift, 12 Pass-Deko-Szenen aus dem Kenney Graveyard Kit, 6 Nicht-Season-Shop-Artikel (2 Häuser, 3 Autos, 1 Statue), Lehrer-Übersicht, i18n, Tests, Doku.

**Nicht im Umfang:** Tauschen (später), Ranglisten, saisonale Events außerhalb des Passes, Echtgeld, neue Schülerdaten, Pechhilfe, Münzbeutel in Truhen.

---

## 2. Entscheidungen

| # | Frage | Entscheidung | Quelle |
|---|---|---|---|
| E1 | Einstieg | **Profilkarte + Season-Stand am Markt**, mit Willkommensnachricht und düsterer Stimmung (nur während der Saison) | bestätigt 27.10. |
| E2 | Saisonfenster | **Mi 28.10.2026 – So 06.12.2026** (40 Tage, knapp 6 Wochen), als **Berlin-Datum** (`starts_on`/`ends_on`). Ende immer an einem Sonntag, damit die Shop-Woche (ab Montag) aufgeht. Eine Tabellenzeile, verschiebbar. | Beginn: Lehrkraft 27.10.; Ende entschieden 27.10. |
| E24 | Start vor Fertigstellung | Die Saison beginnt, bevor der LearnPass live ist. **XP zählen rückwirkend** ab 28.10. (Summe aus `xp_ledger`). Die **Truhen-Serie wird beim Einspielen aus `daily_quest_results` nachberechnet**. Shop-Truhen vergangener Wochen verfallen. | entschieden 27.10. |
| E25 | Saison-Steuerung | Die Lehrkraft **startet, verschiebt und beendet** Saisons selbst im Lehrerbereich (Paket L1, §3.6). Neue Saison-**Inhalte** (Gegenstände, Stufen) bereitet weiterhin ein Entwickler als Migration vor; sie stehen dann als „geplant“ bereit. | Lehrkraft 27.10. |
| E3 | Saison-XP | **Summe `xp_ledger.delta`**, deren Buchungstag (Europe/Berlin) im Fenster liegt; alle Gründe. Stempel zählen, wenn die Lehrkraft sie im Fenster bucht. | Plan |
| E4 | Ziel | **Stufe 40 = 3.000 XP** (30/60/90/120 XP pro Stufe in Zehnerblöcken) | Plan, nachgerechnet |
| E5 | Münzen auf der Spur | **5 Münzen auf jeder Stufe 1–20** (100) + **25 auf jedem Meilenstein** (200) = **300**; Stufen 21–40 ohne Stufenmünzen | Lehrkraft 27.10.: „5 bis Stufe 20“ |
| E6 | Pass-Truhen | Meilensteine **5, 10, 15, 20, 25, 30, 35, 40** – je 1 Season-Truhe + 25 Münzen | Plan |
| E7 | Stufe 40 | Truhe + 25 Münzen + Titel + **freie Wahl eines der 28 Truhen-Gegenstände**. Schon im Besitz → Verkaufswert in Münzen (Hinweis vor dem Bestätigen). Die Wahl bleibt offen, bis sie getroffen ist – auch nach Saisonende. | bestätigt 27.10. |
| E8 | Pechschutz | keiner | bestätigt |
| E9 | Münzbeutel in Truhen | keine; jede Truhe = genau ein Gegenstand | bestätigt |
| E10 | Duplikate | bleiben als Menge (`inventory.qty`); verkaufbar für 15/40/100/250 | Plan |
| E11 | Einzelstücke | Haus, Garage, Auto: zweiter Treffer → **Verkaufswert der Seltenheit** in Münzen (Dodge 100, Horror-Haus 250), kein zweites Exemplar. Keine Sonderpreise. | entschieden 27.10. (hält den Erwartungswert bei 39,75) |
| E12 | Season-Serie | **eigener Zähler** nur für den LearnPass („Truhen-Serie“): ein Kalendertag zählt, wenn an ihm mindestens eine Quest gelöst wird (auch Sa/So – Quests gibt es an 7 Tagen). Jeder 3. Tag in Folge → 1 Truhe. Ein verpasster Tag setzt auf 0, kein Schild. Die bestehende Schultags-Serie (SPEC §357) bleibt unverändert. | bestätigt „alle Kalendertage“; Umsetzung entschieden 27.10. |
| E13 | Shop-Truhe | **50 Münzen, 2 pro Woche** (Woche ab Montag, Europe/Berlin), nur im Saisonfenster | Plan |
| E14 | Saisonende | **automatische Gutschrift** erreichter, nicht abgeholter Stufen – pro Schüler beim nächsten Aufruf und per Lehrer-Knopf „Jetzt beenden“ / „Saison abschließen“ (L1). Kein Zeitplaner nötig. Ungeöffnete Truhen bleiben öffnbar. | entschieden 27.10. |
| E15 | Nach der Saison | Season-Gegenstände bleiben **exklusiv** (`shop_visible = false`) | entschieden 27.10. (Design-Frage 4) |
| E16 | Chancen | **55 / 30 / 12 / 3 %**, für alle Truhenquellen gleich; innerhalb der Seltenheit gleich verteilt | Design, bestätigt |
| E17 | Legendary | **zwei**: Horror-Haus (Haus) und Warlock (Deko), je 1,5 % | Plan |
| E18 | Verkaufen | **nur Season-Gegenstände** (Truhen-Pool und Pass-Szenen), nur unplatzierte Exemplare | entschieden 27.10., Begründung §13 Nr. 8 |
| E19 | Pass-Deko | Die **12 Deko-Stufen** geben je eine **Kenney-Graveyard-Szene** (pass-exklusiv, nicht in Truhen) | entschieden 27.10. (Kenney-Teile erlaubt) |
| E20 | Season-Titel/-Rahmen | 4 Rahmen (Stufen 8, 18, 28, 38), 4 Titel (12, 22, 32, 40); gehören dem Schüler dauerhaft, auch nach der Saison | Design |
| E21 | Shop-Artikel | Blockhütte 500, Beatall 600, Toyoyo 700, Präsidentenwagen 2.000, Trump-Statue 2.000, Weißes Haus 5.000 – **bleiben drin**, CC0 laut Auftraggeber | Lehrkraft 27.10. |
| E22 | Tauschen | nicht in v1; Mengen im Inventar machen es später möglich | Plan |
| E23 | Lizenzen | Alle gelieferten Modelle sind **CC0** (Auftraggeber, 27.10.2026); Eintrag in `blender/sources/LICENSES.md` | Lehrkraft 27.10. |

---

## 3. Datenmodell

Alle neuen Tabellen: `enable row level security`, `revoke all … from public, anon, authenticated`, danach nur `grant select` (Supabase vergibt sonst Standardrechte). Schreiben ausschließlich über `security definer`-Funktionen.

### 3.1 `0028_seasons.sql` – Schema

```sql
create table public.seasons (
  id text primary key,                         -- '2026-11-halloween'
  label text not null,                         -- 'Season I – Halloween'
  theme text not null,                         -- 'halloween'
  starts_on date not null,                     -- any weekday (Season I: Wed 2026-10-28)
  ends_on date not null check (extract(isodow from ends_on) = 7 and ends_on > starts_on),
  closed_at timestamptz                        -- set by close_season (teacher)
);

-- one row per tier; a tier may carry several rewards at once
create table public.season_tiers (
  season text not null references seasons on delete cascade,
  tier int not null check (tier between 1 and 40),
  xp int not null check (xp > 0),              -- cumulative season XP
  coins int not null default 0 check (coins >= 0),
  chest boolean not null default false,
  title_id text references level_rewards,
  frame_id text references level_rewards,
  item_id text references items,
  choice boolean not null default false,       -- tier 40: free pick from the chest pool
  primary key (season, tier)
);

create table public.season_claims (
  player_id uuid not null references profiles on delete cascade,
  season text not null references seasons on delete cascade,
  tier int not null,
  claimed_at timestamptz not null default now(),
  auto boolean not null default false,         -- credited at season end
  choice_item_id text references items,        -- tier 40 pick, null until chosen
  primary key (player_id, season, tier),
  foreign key (season, tier) references season_tiers
);

create table public.season_chests (
  id bigint generated always as identity primary key,
  player_id uuid not null references profiles on delete cascade,
  season text not null references seasons on delete cascade,
  source text not null check (source in ('pass', 'streak', 'shop')),
  ref text not null,                           -- 'tier-15' | 'streak-2026-11-04' | 'shop-2026-11-02-1'
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  rarity text check (rarity in ('common', 'rare', 'epic', 'legendary')),
  item_id text references items,
  duplicate boolean,
  coins int check (coins >= 0),                -- single piece already owned → coins
  unique (player_id, season, source, ref),
  check ((opened_at is null) = (rarity is null) and (opened_at is null) = (item_id is null))
);

create table public.season_streaks (
  player_id uuid not null references profiles on delete cascade,
  season text not null references seasons on delete cascade,
  current int not null default 0 check (current >= 0),
  best int not null default 0 check (best >= current),
  last_day date,
  primary key (player_id, season)
);

-- season titles and frames are owned, not unlocked by level
alter table public.level_rewards add column if not exists season text references seasons;
create table public.player_rewards (
  player_id uuid not null references profiles on delete cascade,
  reward_id text not null references level_rewards,
  granted_at timestamptz not null default now(),
  primary key (player_id, reward_id)
);

alter table public.items add column if not exists season text references seasons;
alter table public.items add column if not exists sell_price int check (sell_price >= 0); -- null = by rarity
-- the GLB path goes into the existing column items.model, e.g. 'season1/warlock.glb'
-- chest pool = items.season = s.id and lootbox_weight > 0 (existing column)

alter table coin_ledger drop constraint coin_ledger_reason_check;
alter table coin_ledger add constraint coin_ledger_reason_check check (reason in
  ('task','stamp','purchase','refund','teacher','quest','tutorial','chest','season','sell'));

create index if not exists xp_ledger_player_time on xp_ledger (player_id, created_at);
```

- Seltenheit heißt in der Datenbank wie bisher **`common`** (Anzeige „Normal“); das Manifest-Wort `normal` wird beim Einspielen umgesetzt.
- Season-Truhen bekommen eine eigene Tabelle, weil `chests` auf Münz-Würfe zugeschnitten ist (`roll`, `coins` Pflicht). Münzbuchungen aus Season-Truhen laufen unter `reason = 'season'`, `ref = 'season_chest:<id>'` – so gibt es keine Kollision mit dem Index `coin_ledger_chest_once`.

### 3.2 `0029_season_rpc.sql` – Funktionen

| RPC | Wer | Aufgabe | Fehler |
|---|---|---|---|
| `season_state()` | Schüler | Saison (Zustand `upcoming` / `running` / `ended`, Tage übrig), Saison-XP, Stufe, alle 40 Stufen mit Belohnung und Status, offene Wahl, ungeöffnete Truhen je Quelle, Shop-Rest dieser Woche, Truhen-Serie. Schließt nach Saisonende vorher die eigenen Stufen ab. | keine Saison → `P0002` |
| `claim_season_tier(p_tier int)` | Schüler | XP prüfen, Claim anlegen, alle Belohnungen der Stufe buchen | `xp missing`, `already claimed`, `unknown tier`, `season ended` (dann automatisch) |
| `choose_season_item(p_item_id text)` | Schüler | Stufe-40-Wahl aus dem Truhen-Pool, genau einmal; schon im Besitz → Verkaufswert | `tier not claimed`, `already chosen`, `not in pool` |
| `buy_season_chest()` | Schüler | 50 Münzen, höchstens 2 pro Woche, nur im Fenster | `not enough coins`, `weekly limit`, `season not running` |
| `open_season_chest(p_id bigint)` | Schüler | Seltenheit und Gegenstand würfeln, Einzelstück-Regel, Inventar, Ergebnis dauerhaft speichern; zweiter Aufruf liefert dasselbe Ergebnis | `chest not found` |
| `sell_item(p_item_id text, p_qty int)` | Schüler | nur Season-Gegenstände, nur unplatzierte Exemplare | `not owned`, `placed`, `not sellable` |
| `close_season(p_season text)` | Lehrkraft | offene Stufen aller Schüler gutschreiben, `closed_at` setzen; idempotent | nur nach `ends_on` |
| `teacher_season_overview(p_class text, p_season text)` | Lehrkraft | Stufe, Saison-XP, Truhen je Schüler | – |
| `season_finish_player(uid, season)` | intern | automatische Gutschrift eines Schülers | – |
| `season_streak_touch(uid, day)` | intern | Truhen-Serie; aufgerufen von einem Trigger auf `daily_quest_results` (wenn `solved_at` gesetzt wird) – `submit_quest_answer` bleibt unverändert | – |

### 3.3 `0030_season_content.sql` – Inhalte

Saison-Zeile (28.10.–06.12.2026), Nachberechnung der Truhen-Serie aus `daily_quest_results` ab 28.10. (E24, idempotent über `ref`), 40 Stufen (§4), 28 Truhen-Gegenstände (`season`, `shop_visible = false`, `lootbox_weight = 1`, `model = 'season1/<datei>'`), 12 Pass-Szenen (`season`, `shop_visible = false`, `lootbox_weight = 0`), 4 Season-Titel und 4 Season-Rahmen in `level_rewards` (`season` gesetzt).

### 3.4 `0031_season_shop.sql` – Nicht-Season-Shop

Blockhütte 500 (house), Beatall 600 (car), Toyoyo 700 (car), Präsidentenwagen 2.000 (car), Trump-Statue 2.000 (deco), Weißes Haus 5.000 (house); `shop_visible = true`, `model = 'shop/<datei>'`, Kauf über das bestehende `buy_item` (Haus/Auto nur einmal – dort schon geprüft).

### 3.5 Regeln in SQL

- **Idempotenz:** Claims über den Primärschlüssel, Truhen über `unique (player_id, season, source, ref)`, Shop-Kauf unter Profil-Sperre (`for update`) mit `ref = 'shop-<Montag>-<n>'`.
- **XP-Gate:** `sum(delta) where player_id = uid and (created_at at time zone 'Europe/Berlin')::date between starts_on and ends_on`.
- **Würfel:** `random()` serverseitig; erst Seltenheit (55/30/12/3), dann gleichverteilt innerhalb der Seltenheit.
- **Einzelstücke:** `kind in ('house','garage','car')` und schon besessen → `duplicate = true`, `coins` = Verkaufswert, Buchung `reason = 'season'`.
- **Saisonende:** pro Schüler: fehlende Claims bis zur erreichten Stufe mit `auto = true`, Belohnungen wie beim Abholen; die Stufe-40-Wahl bleibt offen.
- **Titel/Rahmen:** `set_title` / `set_frame` werden ersetzt: Season-Einträge (`level_rewards.season is not null`) brauchen eine Zeile in `player_rewards`, alle anderen weiter das Level.
- **Rechte:** Schüler-RPCs nur `authenticated`, Lehrer-RPCs mit `require_teacher()`, interne Funktionen ohne `execute`-Recht.


### 3.6 `0032_season_teacher.sql` – Saison-Steuerung für die Lehrkraft (Paket L1)

Alle Funktionen mit `require_teacher()`, `security definer`, nur `authenticated`; jede Änderung sperrt die Saison-Zeilen (`for update`), damit zwei Klicks nicht gleichzeitig wirken.

| RPC | Aufgabe | Regeln / Fehler |
|---|---|---|
| `teacher_seasons()` | alle Saisons mit Zustand (`planned` / `running` / `ended` / `closed`), Start, Ende, Tage übrig, Zahl der Stufen und Gegenstände | – |
| `teacher_set_season_dates(p_season text, p_starts_on date, p_ends_on date)` | Start und Ende ändern | Ende ist ein Sonntag und liegt nach dem Start · keine Überschneidung mit einer anderen Saison · nicht nach `closed_at` · das Ende darf nicht vor heute liegen, solange die Saison läuft (dafür gibt es „Jetzt beenden“) |
| `teacher_start_season_now(p_season text)` | Start auf heute (Europe/Berlin) setzen | nur `planned` · keine andere Saison läuft · Ende bleibt, muss nach heute liegen |
| `teacher_end_season_now(p_season text)` | Ende auf gestern setzen, danach `close_season` | nur `running` · Rückfrage in der Oberfläche |
| `close_season(p_season text)` | wie §3.2 (offene Stufen aller Schüler gutschreiben, `closed_at`) | nur nach `ends_on`; idempotent |
| `teacher_season_overview(p_class text, p_season text)` | wie §3.2 | – |

- **Wirkung von Datumsänderungen:** Saison-XP zählen immer im aktuellen Fenster (E3). Ein späterer Start nimmt früher gesammelte XP aus der Zählung, schon abgeholte Stufen bleiben aber abgeholt (nichts wird zurückgebucht). Die Oberfläche warnt davor: „Abgeholte Stufen bleiben. XP vor dem neuen Start zählen nicht mehr.“
- **Shop-Limit und Truhen-Serie** richten sich nach dem neuen Fenster; bereits vergebene Truhen bleiben.
- **Protokoll:** jede Änderung wird mit Lehrkraft und Zeitpunkt in `season_changes` (nur lesbar für Lehrkräfte) festgehalten.
- **Oberfläche** (Lehrerbereich, Deutsch): Reiter „Saison“ mit Karte je Saison (Name, Zustand, Zeitraum, „noch 26 Tage“), Datumsfelder für Start und Ende, Knöpfe **Speichern**, **Jetzt starten**, **Jetzt beenden** (jeweils mit Bestätigung), darunter der Stand der gewählten Klasse (Stufe, Saison-XP, Truhen je Schüler; keine Rangfolge, alphabetisch).

---

## 4. Belohnungen und Wirtschaft

### 4.1 Die 40 Stufen

XP sind kumulativ. ★ = Meilenstein (Truhe + 25 Münzen).

| Stufe | XP | Belohnung | | Stufe | XP | Belohnung |
|---:|---:|---|---|---:|---:|---|
| 1 | 30 | 5 Münzen | | 21 | 990 | Szene „Kürbisbeet“ |
| 2 | 60 | 5 | | 22 | 1.080 | Titel „Ghost Hunter“ |
| 3 | 90 | 5 | | 23 | 1.170 | Szene „Feuerkorb“ |
| 4 | 120 | 5 | | 24 | 1.260 | Szene „Herbsttanne“ |
| ★ 5 | 150 | 5 + Truhe + 25 | | ★ 25 | 1.350 | Truhe + 25 |
| 6 | 180 | 5 | | 26 | 1.440 | Szene „Laternenweg“ |
| 7 | 210 | 5 | | 27 | 1.530 | Szene „Friedhofstor“ |
| 8 | 240 | 5 + Rahmen „Kürbis“ | | 28 | 1.620 | Rahmen „Grabstein“ |
| 9 | 270 | 5 | | 29 | 1.710 | Szene „Altar mit Kerzen“ |
| ★ 10 | 300 | 5 + Truhe + 25 | | ★ 30 | 1.800 | Truhe + 25 |
| 11 | 360 | 5 | | 31 | 1.920 | Szene „Gespenst am Grab“ |
| 12 | 420 | 5 + Titel „Pumpkin Rookie“ | | 32 | 2.040 | Titel „Witch’s Friend“ |
| 13 | 480 | 5 | | 33 | 2.160 | Szene „Skelett auf der Bank“ |
| 14 | 540 | 5 | | 34 | 2.280 | Szene „Zombie im Beet“ |
| ★ 15 | 600 | 5 + Truhe + 25 | | ★ 35 | 2.400 | Truhe + 25 |
| 16 | 660 | 5 | | 36 | 2.520 | Szene „Kleine Gruft“ |
| 17 | 720 | 5 | | 37 | 2.640 | Szene „Vampir am Sarg“ |
| 18 | 780 | 5 + Rahmen „Spinnennetz“ | | 38 | 2.760 | Rahmen „Hexenkessel“ |
| 19 | 840 | 5 | | 39 | 2.880 | Szene „Totengräber“ |
| ★ 20 | 900 | 5 + Truhe + 25 | | ★ 40 | 3.000 | Truhe + 25 + Titel „Halloween Legend“ + **freie Wahl** |

**Summe:** 300 Münzen, 8 Truhen, 12 Szenen, 4 Rahmen, 4 Titel, 1 freie Wahl.

### 4.2 Wirtschaft (nachgerechnet 27.10.)

- **XP bis 40:** 10·30 + 10·60 + 10·90 + 10·120 = **3.000**.
- **Erreichbarkeit:** pro Schultag höchstens ~100 XP (4 Quests à 15, Tagesziel 15, Serie bis 25), am Wochenende ~60–75 (keine Schultags-Serie), dazu 6 Stempel à 100 XP. Obergrenze in 40 Tagen ≈ 3.300–3.700 XP. Wer fast täglich dabei ist, erreicht 40; wer 4 von 5 Schultagen schafft, landet um Stufe 30–35.
- **Truhen-Erwartungswert (Verkaufswert):** 0,55·15 + 0,30·40 + 0,12·100 + 0,03·250 = **39,75**. Shop-Preis 50 → die Shop-Truhe nimmt mehr Münzen ein, als sie im Schnitt wert ist.
- **Münzwert des Passes:** 300 + 8 · 39,75 ≈ **618** plus Kosmetik – deutlich unter dem Quest- und Level-Truhen-Einkommen derselben 40 Tage.
- **Höchstzahl Truhen:** 8 (Pass) + 13 (Serie, 40 Tage / 3) + 12 (Shop, 6 Wochen ab 26.10. à 2) = **33**.
- **Shop-Preise:** 500–5.000 neben Villa (1.000) und Camper (600); das Weiße Haus ist ein Ziel über mehrere Wochen.

---

## 5. Oberfläche

### 5.1 Einstieg
- **Profil:** Karte „Season I · Halloween“ mit Stufe, Restzeit (vor einem Saisonstart: „startet am …“), Knopf „LearnPass“.
- **Markt:** Saison-Stand (Kürbisbude) neben der Tafel, Willkommensnachricht „Season I – Halloween“, düstere Stimmung (Blutmond, Nebel, Lampions) **nur während der Saison**. Antippen öffnet den Pass. Vergleich mit `web/dev/marktplatz.html` und der Galerie (LOOK.md bleibt außerhalb der Saison maßgeblich).
- **News-Glocke:** unverändert.

### 5.2 LearnPass-Seite
Verbindliches Layout und Design: **§14** (Variante A, überarbeitet am 27.10.2026). Datumsangaben als „Woche ab 09.11.“, nie „KW“.

### 5.3 Truhen
- Truhen liegen im **Inventar** („Season-Truhe ×N“) mit Öffnen-Knopf; Punkt am Inventar-Knopf bei wartenden Truhen.
- Öffnen: wackeln (vorhandene Truhen-Animation) → Licht in Seltenheitsfarbe → Karte mit Gegenstand, „Neu“ / „Doppelt – Verkaufen für 40“ / „Schon vorhanden – 100 Münzen“ → Weiter. Ohne WebGL als Karte.

### 5.4 Shop
- Season-Truhe: 50 Münzen, „1/2 diese Woche“.
- Nicht-Season-Artikel (nach S3) mit Preisen; Kauf über `buy_item`, Platzierung wie gehabt.

### 5.5 Sprache und Barrierefreiheit
Englisch Standard, Deutsch wählbar; Item-, Titel- und Rahmennamen über `tr()`/`ITEM_NAMES`; Kacheln als Buttons mit `aria-label`, Ergebnis mit `role="status"`, reduzierte Bewegung beachtet.

---

## 6. Assets

### 6.1 Bestand
- **28 Truhen-Gegenstände** unter `web/public/assets/season1/` (Liste §12.3), 7,6 MB, laden **lazy** pro Item.
- **12 Pass-Szenen** aus dem Kenney Graveyard Kit 5.0 (CC0, Quelle `Lerndorf/Kenny/Graveyard`, 91 Modelle). Sie werden wie die bestehenden Deko-Szenen in Code zusammengesetzt und als Instanzen der Kenney-Palette gerendert (kaum Draw Calls):

| Szene | Teile |
|---|---|
| Kürbisbeet | pumpkin, pumpkin-carved, pumpkin-tall-carved, hay-bale |
| Feuerkorb | fire-basket, rocks, hay-bale-bundled |
| Herbsttanne | pine-fall-crooked, pumpkin, pumpkin-carved |
| Laternenweg | lightpost-double, road, lantern-candle |
| Friedhofstor | iron-fence-border-gate, iron-fence, iron-fence-border-column |
| Altar mit Kerzen | altar-stone, candle-multiple, detail-chalice |
| Gespenst am Grab | character-ghost, gravestone-round, candle |
| Skelett auf der Bank | character-skeleton, bench-damaged |
| Zombie im Beet | character-zombie, grave-border, debris |
| Kleine Gruft | crypt-small, urn-round |
| Vampir am Sarg | character-vampire, coffin |
| Totengräber | character-keeper, shovel-dirt, grave |

- **6 Shop-Modelle** unter `web/public/assets/shop/` (Blockhütte 90 KB, Weißes Haus 109 KB, Präsidentenwagen 153 KB, Trump 194 KB, Toyoyo 100 KB, Beatall 70 KB).

### 6.2 Gemessen am 27.10. (Weltmaße aus den GLB-Dateien)

| Modell | Problem | Grenze (`world/plotPlan.ts` MAX_SIZE) |
|---|---|---|
| spooky-pumpkin-cat | rechnerisch ~203 × 135 × 150 m (Knoten-Skalierung 101) | Deko 3 × 3 × 3 |
| ghost-kitty | 5,2 × 5,5 × 5,2 m | Deko |
| jack-o-lantern-tree | 5,3 × 4,9 × 3,3 m | Deko |
| kit-monster-plant | 4,5 × 4,0 × 3,1 m, 4,5 m neben dem Ursprung | Deko |
| dodge-pickup | 5,4 m lang | Auto 2,4 × 4,6 × 2,2 |
| alle 15 `kit-*` | bis 2,5 m neben dem Ursprung | Ursprung in der Mitte |
| kit-bat, kit-candle, kit-candy-bucket | 0,2–0,3 m – winzig auf dem Sockel | – |
| toyoyo-highlight, beatall | Länge auf X statt Z | Front nach +Z |
| white-house | 3,3 m versetzt, 4,11 m tief | Haus 6 × 4 × 6 |

### 6.3 Loader (A1)
- `MeshoptDecoder` setzen (Pflicht, sonst laden die GLBs nicht).
- `plotAsset()` ist synchron und prozedural; GLB-Items bekommen einen asynchronen Zweig mit Platzhalter, bis das Modell geladen ist (Dorf, Vorschau, Vorschaubilder).
- **Normalisieren beim Laden:** Mitte auf den Ursprung, Boden auf 0, gleichmäßig auf MAX_SIZE der Art verkleinern; Deko unter 0,8 m auf 0,8 m vergrößern; Drehung pro Item (`yaw`) aus einer Tabelle im Client für die quer liegenden Autos. Prüfung in der Galerie.
- **Dreiecks-Budget:** Das Dorf hat < 150.000 Dreiecke. 25 Grundstücke mit Horror-Haus (38k) und Warlock (16k) wären > 1 Mio. Deshalb pro Modell eine **vereinfachte Fernversion** (`*.lod.glb`, ≤ 2.000 Dreiecke, per Skript mit meshoptimizer/gltfpack erzeugt, kostenlos) für Grundstücke außerhalb der Nähe der Kamera; Messung in der Galerie und im Tablet-Profil.

### 6.4 Asset-Reste (A2, zuletzt, blockiert nichts)
Tristar Racer, Landyroamer, DeLorean (Achsen/Größe), DAE-Häuser (Blender 5.2 ohne Collada-Import), `the_halloween_cat` (nur Augen-Material). Nur wenn Zeit bleibt; bestehende Modelle werden nicht entfernt.

---

## 7. Tests

**SQL (PGlite, `web/tests/sql/`):**
1. Schema: Tabellen, Prüfregeln, Rechte; direkte Schreibzugriffe als `authenticated` scheitern.
2. `season_state` ohne Saison → Fehler; vor/während/nach der Saison → richtiger Zustand, XP nur aus dem Fenster.
3. Claim unter XP-Schwelle → Fehler; doppelt → Fehler; gültig → alle Belohnungen der Stufe genau einmal (Münzen, Truhe, Titel, Rahmen, Szene).
4. Truhen-Wurf: 10.000 Ziehungen, Verteilung ±2 %; Duplikat → `qty` steigt; Einzelstück schon besessen → Münzen, kein zweites Exemplar; zweites Öffnen bucht nichts.
5. Stufe-40-Wahl: nur einmal, nur aus dem Pool, Besitz → Münzen; auch nach Saisonende möglich.
6. Shop: dritter Kauf in derselben Berlin-Woche → Fehler; neue Woche → erlaubt; außerhalb des Fensters → Fehler.
7. Truhen-Serie: Sa/So zählen, verpasster Tag setzt zurück, Tag 3/6/9 → je eine Truhe, zweiter Aufruf am selben Tag → nichts; Nachberechnung aus `daily_quest_results` ergibt dasselbe wie der Trigger und läuft doppelt ohne Wirkung.
8. Saisonende: automatische Gutschrift einmal, zweiter Aufruf ändert nichts; Wahl bleibt offen.
9. Verkauf: platziert → Fehler; zu viel → Fehler; Nicht-Season-Item → Fehler.
10. `set_title`/`set_frame`: Season-Titel nur mit Besitz; alte Titel weiter nach Level.
11. Saison-Steuerung (L1): nur Lehrkraft; Ende kein Sonntag / vor Start / Überschneidung → Fehler; „Jetzt starten“ bei laufender anderer Saison → Fehler; späterer Start nimmt XP aus dem Fenster, abgeholte Stufen bleiben; „Jetzt beenden“ schreibt offene Stufen gut; jede Änderung steht in `season_changes`.

**Vitest:** Stufentabelle, Chancenanzeige, Zustände der Spur, Normalisierung der Modelle, i18n.

**Playwright:** LearnPass öffnen, Stufe abholen, Truhe öffnen, Shop-Truhe kaufen, Vorschau, Stufe-40-Wahl, Sprachwechsel.

**Galerie/3D:** Saison-Stand, Pass-Szenen, Season-Modelle auf dem Grundstück, ≥ 30 fps im Tablet-Profil, Dreiecke und Draw Calls.

---

## 8. Arbeitspakete

| ID | Paket | Inhalt | Aufwand | Abhängig von |
|---|---|---|---:|---|
| S1 | Schema + Inhalte | 0028 + 0030, Rechte, Schema-Tests | 1 Tag | – |
| S2 | RPCs | 0029 (§3.2), Trigger für die Serie | 2 Tage | S1 |
| S4 | SQL-Tests | 10 Fälle (§7) | 1 Tag | S2 |
| A1 | Loader | Meshopt, async GLB-Zweig, Normalisierung, Fernversionen, Galerie | 2 Tage | – |
| A3 | Pass-Szenen | 12 Kenney-Szenen, Kopien + Lizenzzeile, Asset-Vertrag-Test | 1 Tag | A1 |
| U1 | LearnPass-Seite | Karten-Spur, Abholen, Stand-Leiste, untere Kacheln, Stufe-40-Wahl – genau nach §14 | 2,5 Tage | S2 |
| U2 | Truhen im Inventar | Abschnitt, Öffnen, Reveal, Duplikat, Verkauf | 1 Tag | S2 |
| U3 | What's inside? | Chancen-Fenster nach §14.4 | 0,5 Tag | U1 |
| U4a | Shop: Season-Truhe | Kauf, Wochenzähler | 0,5 Tag | S2 |
| U5 | Profilkarte/Einstieg | Karte, Verlinkung | 0,5 Tag | U1 |
| U6 | Markt-Stand | 3D-Bude, Willkommen, Stimmung, Tap | 1,5 Tage | U1 |
| U7 | i18n/A11y | Texte, aria, reduzierte Bewegung | 0,5 Tag | U1–U4a |
| S3 | Shop-Daten | 0031 | 0,5 Tag | S1, A1 |
| U4b | Shop: Nicht-Season-Artikel | Anzeige, Kauf, Platzierung | 0,5 Tag | S3 |
| A2 | Asset-Reste | §6.4 | 1–2 Tage | – |
| L1 | Saison-Steuerung | 0032 (§3.6), Reiter „Saison“ im Lehrerbereich, SQL- und Playwright-Tests | 1 Tag | S2 |
| D1 | Doku + Lehrerbereich | PLAN, SPEC, Design, Anleitung für die Lehrkraft (Saison starten/verschieben/beenden) | 0,5 Tag | S2, L1 |
| T1 | Abnahme | Playwright + Galerie + Tablet-Test | 1 Tag | alle |

**Reihenfolge (Auftrag 27.10.):** S1 → S2 → S4 → A1 → **A3** → U1 → U2 → U3 → **U4a** → U5 → U6 → U7 → S3 → **U4b** → A2 → **L1** → D1 → T1.
A3 ist eingeschoben, weil die Pass-Szenen ab U1 sichtbar sein müssen; U4 ist geteilt, weil die Nicht-Season-Artikel von S3 abhängen; L1 (Saison-Steuerung, Auftrag 27.10.) steht vor D1, damit die Anleitung sie beschreibt.

---

## 9. Risiken

1. **Dreiecks-Budget** (§6.3) – ohne Fernversionen ruckelt das Dorf auf dem Tablet.
2. **Saisonbeginn 28.10. vor Fertigstellung** – XP zählen rückwirkend, die Truhen-Serie wird nachberechnet (E24). Bis zum Live-Gang sehen Schüler nichts von der Saison; die Restzeit wird kürzer. Liegen Ferien im Fenster, sind 3.000 XP kaum erreichbar → `ends_on` verschieben.
3. **Zwei Serien** – Schultags-Serie (Flamme) und Truhen-Serie (nur im LearnPass) müssen sich in Wort und Bild klar unterscheiden.
4. **Stempel-XP** zählen nach Buchungstag; spät gebuchte Stempel der letzten Woche fallen aus dem Fenster.
5. **Season-Rahmen** brauchen eigene Stile in `web/src/ui/frames.ts`, sonst erscheint der Holzrahmen.
6. **Sammlung** lädt alle `level_rewards`; Season-Einträge müssen dort als „Season I“ statt „ab Level X“ erscheinen.
7. **Kostenlose Kosmetik-Truhen** mit offenen Chancen sind vertretbar; keine Echtgeld-Truhen, keine Spielvorteile.
8. **Kein Tauschen in v1** – sonst Gruppendruck ohne Moderationswerkzeug.
9. **Daten:** nur Fortschritt, Claims und Truhen; keine neuen personenbezogenen Daten.

---

## 10. Abnahme-Checkliste

- [ ] Saison läuft 28.10.–06.12.2026, XP ab 28.10. zählen, Stufe 40 mit 3.000 XP erreichbar.
- [ ] Alle 40 Stufen abholbar, jede Belohnung genau einmal.
- [ ] Truhen: 55/30/12/3, Duplikate als Menge, Einzelstücke werden zu Münzen.
- [ ] Stufe 40: freie Wahl aus 28 genau einmal; Besitz → Münzen.
- [ ] Shop-Truhe: 50 Münzen, 2 pro Woche, neue Woche ab Montag.
- [ ] Truhen-Serie: Kalendertage inkl. Wochenende, eine Truhe pro 3 Tage.
- [ ] Saisonende: offene Stufen automatisch gutgeschrieben; Truhen bleiben öffnbar.
- [ ] Inventar zeigt Truhen, Öffnen-Animation, Verkauf von Season-Duplikaten.
- [ ] Season-Titel und -Rahmen wählbar, nur mit Besitz.
- [ ] 12 Pass-Szenen und 28 Truhen-Gegenstände stehen richtig auf dem Sockel.
- [ ] i18n: Englisch Standard, Deutsch vollständig.
- [ ] Tests grün, Galerie geprüft, Tablet ≥ 30 fps.
- [ ] Lizenzen eingetragen (CC0).
- [ ] Lehrerbereich: Saison starten, verschieben und beenden funktioniert, mit Rückfrage und Protokoll.
- [ ] Doku: Design, PLAN, SPEC, Lehrerbereich aktualisiert.

---

## 11. Nächster Schritt

**Umsetzung durch DeepSeek** in einem eigenen Branch, Pakete in der Reihenfolge von §8, beginnend mit S1: `0028_seasons.sql` (§3.1) und `0030_season_content.sql` (§3.3) mit Schema-Test.

**Review durch Claude**, sobald die Lehrkraft meldet, dass DeepSeek fertig ist: Diff des Branches gegen `main` lesen, Tests und Build selbst laufen lassen, Galerie und Screenshots ansehen, Befunde gegen §2, §3, §7 und §10 prüfen und DeepSeek eine schriftliche Test-Review mit konkreten Korrekturen schreiben (Ablage `docs/superpowers/reviews/`). Claude baut dabei nichts selbst um und committet nichts.

---

## 12. Übergabe an Claude

### 12.1 Auftrag und Grenzen

- Ziel: Season I (Halloween) mit LearnPass, Truhen, Season-Shop und Sammlung – **kein Echtgeld, keine Premium-Spur, keine Spielvorteile**.
- **Nichts committen oder pushen**, außer die Lehrkraft bittet ausdrücklich darum.
- **Nur CC0-Assets** oder eigene; jede Quelle in `blender/sources/LICENSES.md`.
- Münzen, Besitz und Platzierungen ändern sich **nur über RPCs**.
- **Keine echten Schülerdaten**, keine Analytics.
- **Bestehende Modelle nicht entfernen.**

### 12.2 Was im Repo schon existiert

| Was | Pfad |
|---|---|
| Design | `docs/superpowers/specs/2026-10-26-learnpass-design.md` |
| Dieser Plan | `docs/superpowers/plans/2026-10-27-season-und-learnpass.md` |
| 28 Season-Modelle + Manifest | `web/public/assets/season1/` |
| 6 Shop-Modelle + Manifest | `web/public/assets/shop/` |
| Kenney Graveyard Kit 5.0 (91 Modelle) | `Lerndorf/Kenny/Graveyard/Models/GLB format/`; 9 Teile schon unter `web/public/assets/kenney/graveyard/` |
| LearnPass-Prototyp | `web/dev/learnpass.html` |
| Marktplatz-Prototyp | `web/dev/marktplatz.html` |
| Season-Quellen | `Lerndorf/Assets/Season I/` |
| Migrationen | `supabase/migrations/` bis `0027` – **neu ab `0028`** |

### 12.3 Truhen-Pool (28)

| Seltenheit | Items (Dreiecke) |
|---|---|
| Normal (8) | Süßigkeiteneimer (3.999), Fledermaus (2.999), Grablicht (2.000), Kleiner Geist (3.499), Grabstein (2.330), Kürbislaterne (3.000), Besen (1.744), Halloween-Schild (4.999) |
| Rare (13) | Süßigkeitenhaufen (1.796), Friedhofsecke (1.752), Zaun mit Laterne (984), Hexe/Statue (9.681), Kürbismädchen (18.328), Hexe/Figur (7.000), Mumie (6.999), Skelett (7.000), Zombie (7.000), Hexenkatze (6.000), Hexenkessel (3.451), Kürbiskatze (3.199), Geisterkatze (46.786) |
| Epic (5) | Kürbisfeld (5.672), Spuk-Uhrturm (13.441), Dodge Pickup – Auto (12.782), Monsterpflanze (8.999), Kürbisbaum (4.184) |
| Legendary (2) | Warlock (15.966, 2,95 m), Horror-Haus – Haus (37.912, 4,35 × 5,38 × 3,80 m) |

**Shop (nicht Season):** Blockhütte (Haus, 500), Beatall (Auto, 600), Toyoyo Pickup (Auto, 700), Präsidentenwagen (Auto, 2.000), Trump-Statue (Deko, 2.000), Weißes Haus (Haus, 5.000).

### 12.4 Bekannte Fallstricke

1. **Meshopt** fehlt im Spiel-Loader (nur `web/dev/marktplatz.html` setzt ihn).
2. **Modellmaße** verletzen den Asset-Vertrag (§6.2) → Normalisierung im Loader.
3. **Dreiecks-Budget** (§6.3) → Fernversionen.
4. **Titel/Rahmen:** `set_title`/`set_frame` (0020) prüfen nur das Level.
5. **Seltenheit** heißt in der Datenbank `common`.
6. **`coin_ledger`:** neue Gründe `season`, `sell`; Index `coin_ledger_chest_once` nicht mit Season-Truhen teilen.
7. **Schultags-Serie** (`touch_streak`) ignoriert Wochenenden – die Truhen-Serie ist ein eigener Zähler.
8. **Windows:** Tests und Build mit projektlokalem TEMP (`web/.tmp-build`).
9. **Vite-Dev-Server** nicht laufen lassen, während Dateien geändert werden (`EBUSY`).
10. **WebGL im Test:** Playwright mit `--use-angle=swiftshader --enable-unsafe-swiftshader`.
11. **Blender 5.2** hat keinen Collada-Import; FBX und glTF funktionieren.

### 12.5 Marktplatz

Der Prototyp `web/dev/marktplatz.html` zeigt die Richtung (Blutmond, Nebel, Lampions, Kürbisse, Gräber, Zombies, Horror-Haus, Warlock). Umsetzung in U6: Saison-Stand neben der Tafel, Willkommensnachricht, Stimmung nur im Saisonfenster; Galerie-Vergleich.

### 12.6 Definition of Done je Paket

`npm test` grün, `npm run build` grün, bei UI ein Playwright-Screenshot selbst angesehen, bei 3D `npm run galerie` angesehen, PLAN/SPEC/Design aktualisiert, keine offenen Fehler im Paket, nichts committet.

### 12.7 Was ausdrücklich nicht dazugehört

Kein Tauschen (v1), keine Rangliste, keine Echtgeld-Truhen, keine Pechhilfe, keine Münzbeutel in Truhen, keine neuen Schülerdaten, keine Analytics, keine Änderungen an `Prototyp/`, `Konzept/`, `../Referenz`, `Thomsen92/English-Club-8`, keine automatischen Commits.

---

## 13. Prüfprotokoll 27.10.2026 – geklärte Widersprüche

| # | Thema | Vorher | Jetzt |
|---|---|---|---|
| 1 | Stufen-Schema | eine Belohnung pro Stufe (`reward_kind`) | Spalten pro Belohnungsart; Meilensteine tragen Truhe + Münzen |
| 2 | Münzen auf der Spur | Design: 10–15 auf allen Stufen; Plan: 5 bis 20 + 25 je Meilenstein | 5 auf Stufen 1–20 + 25 je Meilenstein = 300 (E5) |
| 3 | Passwert | Design 420 bzw. 620 | 618 (300 + 8 · 39,75) |
| 4 | Legendary | Design §5 nur Horror-Haus; §7/Plan zwei | zwei, je 1,5 % (E17) |
| 5 | Stufe 40 | `claim_legendary` „Haus oder Warlock“, Truhenquelle `legend` | freie Wahl aus 28 über `choose_season_item`, keine Truhe (E7) |
| 6 | Duplikate | Design §10 „wird zu Münzen“, §11 „keine Duplikate“ | Menge im Inventar, verkaufbar; nur Einzelstücke werden zu Münzen (E10, E11) |
| 7 | Einzelstück-Preis | „Sonderpreise z. B. 250/300“ | Verkaufswert der Seltenheit (E11) |
| 8 | Verkaufen | offen, welche Gegenstände | nur Season-Gegenstände (E18). Heute ließe sich kein Shop-Artikel mit Gewinn verkaufen (alle Deko ist `common` = 15 und kostet ≥ 15). Es bleiben aber zwei Lücken: Starter-Gegenstände kosten 0 und wären sofort Münzen wert, und jeder künftige günstige Artikel mit höherer Seltenheit würde zum Gelddrucker. Shop-Artikel sind außerdem nie „doppelt“ aus einer Truhe. |
| 9 | Serie | „3-Tage-Serie“ ohne Zähler; vorhandene Serie zählt nur Mo–Fr | eigener Kalendertage-Zähler (E12) |
| 10 | Saisonende | `close_season` nur Service-Key, kein Zeitplaner | pro Schüler automatisch + Lehrer-Knopf (E14) |
| 11 | Zeitfenster | Design: Datum; Plan: Zeitstempel | Berlin-Datum (E2) |
| 12 | Shop-Woche | `week-<ISO-Woche>` | `shop-<Montag>-<n>`; Anzeige „Woche ab …“ |
| 13 | Seltenheit | `normal` | `common` in der Datenbank, „Normal“ in der Anzeige |
| 14 | Modellpfad | neue Spalte `model_url` | vorhandene Spalte `items.model` |
| 15 | Pool (Design §7) | listet Vampir, Hot Rod, Kenney-Teile usw. | 28 fertige Modelle (§12.3); Kenney-Teile als 12 Pass-Szenen (E19) |
| 16 | Shop-Umfang | „12 Nicht-Season-Items“ | 6 Artikel (E21) |
| 17 | Lizenzen | Shop-Modelle ohne Eintrag | alle CC0 laut Auftraggeber, Zeile in LICENSES.md (E23) |
| 18 | Season-Titel/-Rahmen | über `profiles.title_id/frame_id`, aber nur levelgesteuert | Besitz in `player_rewards` (E20) |
| 19 | Reihenfolge | U4 vor S3, aber abhängig | U4a / U4b, A3 eingeschoben (§8) |
| 20 | Offene Design-Fragen §12 | 5 offen | 1: A + B · 2: 28.10.–06.12. · 3: Horror-Haus als Haus · 4: exklusiv · 5: 55/30/12/3 |
| 21 | Saisonbeginn | Montag 02.11. (Standard) | Mittwoch 28.10. (Lehrkraft); Ende So 06.12.; XP rückwirkend, Serie nachberechnet (E2, E24) |
| 22 | Saison starten | nur über das Datum in einer Migration | Lehrkraft startet, verschiebt und beendet im Lehrerbereich (E25, L1, §3.6); Inhalte weiter per Migration |

---

## 14. Oberfläche – Layout und Design (Frontend, verbindlich)

**Stand 27.10.2026 · gewählt: Variante A, überarbeitet nach Rückmeldung der Lehrkraft** (gerade Karten-Spur statt geschwungenem Weg, mehr Platz, jede Stufe zeigt ihre Belohnung als Bild, Wischen mit dem Finger, Blutmond-Stimmung, Chancen nur unter „What's inside?“). Die Varianten B (Zauberbuch) und C (Geisterbahn) sind verworfen.

**Referenz:** `web/dev/learnpass-design.html` (Dev-Server → `/dev/learnpass-design.html`, `#inside` öffnet gleich das Chancen-Fenster). Screenshots in `docs/superpowers/designs/learnpass/`: `learnpass-tablet.png`, `learnpass-phone.png`, `inside-tablet.png`, `inside-phone.png`, `page-tablet.png`, `page-phone.png`, `track-28.png`, `track-38.png`. Die Seite ist ein Mock-up mit Beispieldaten (Stufe 12, 452 XP): Aufbau, Maße, Farben und Texte übernehmen, den Code neu und sauber in `web/src/ui/learnpass/` schreiben.

### 14.1 Aufbau der LearnPass-Seite

Vollbild-Overlay wie das Profil (pausiert das Dorf). Von oben nach unten:

1. **Kopf:** links „SEASON I“ (klein, Kürbis-Orange, gesperrt) über „HALLOWEEN“ (groß, siehe Schrift); rechts drei Chips: „26 days left“, Münzen mit Münzsymbol, Schließen (48 × 48, rund).
2. **Stand-Leiste** (eigenes Panel, halbtransparent mit Unschärfe): sechseckiges Stufen-Abzeichen 64 × 70 mit der Zahl, daneben „Tier 12 of 40“ und „452 XP · 28 XP to tier 13“, darunter der XP-Balken bis zur nächsten Stufe; rechts **Jump to tier 12** (springt weich zur aktuellen Karte).
3. **Karten-Spur** (Hauptfläche, ≈ 330 px hoch auf dem Tablet): alle 40 Stufen als Karten in **einer geraden Reihe**, waagerecht wischbar. Unter jeder Karte ein Punkt auf einer **geraden Schiene**, die bis zur aktuellen Stufe orange-gold gefüllt ist; über der aktuellen Karte das Schild „YOU“.
4. **Untere Reihe** mit vier gleich breiten Kacheln (Tablet nebeneinander, Handy untereinander):
   - *Pass-Truhe:* Truhenbild, „1 chest waiting“, „From tier 10“, Knopf **Open in inventory** (→ Inventar, Abschnitt Season-Truhen).
   - *Truhen-Serie:* Ring „2/3“, „Chest streak“, „2 of 3 days. Solve a quest tomorrow to get a chest.“ (kein Knopf).
   - *Shop-Truhe:* Münze, „Buy a chest“, „50 coins · 1 of 2 left this week“, Knopf **Buy** (kauft direkt mit Bestätigung; Truhe landet im Inventar).
   - *What's inside?:* die ganze Kachel ist ein Knopf: Truhenbild, „What's inside?“, „Chances and all 28 items“ → öffnet das Chancen-Fenster.
5. **Die Chancen stehen nicht auf der Seite**, nur im Fenster „What's inside?“.

### 14.2 Karten-Spur im Detail

| Teil | Wert |
|---|---|
| Karte normal | 156 × 252 px, Radius 18, Rand 2 px `#3d2c52`, Verlauf `#2d2040` → `#221830`, Schatten `0 10px 24px #0008` |
| Meilenstein (5, 10 … 35) | 196 × 284 px, goldener Verlaufsrand (`#ffe39a` → `#f2b630` → `#8a5a12`), dunkler Goldgrund, Stern vor „TIER 15“ |
| Stufe 40 | wie Meilenstein, 230 px breit, Bild: Warlock + Horror-Haus nebeneinander |
| Zeilen in der Karte | Kopf 30 px („TIER 12“ links, rechts ✓ / Schloss), Bild 118 px (Meilenstein 146), Name (fett 15 px, höchstens 2 Zeilen) + Zusatz (13 px, 1 Zeile, z. B. „+ 5 coins“, „Garden scene“), Fuß 44 px |
| Fuß je Zustand | *abgeholt:* „Collected“ in Grün `#a6e05a`, Rand grünlich · *bereit:* orangener Knopf **Collect** in voller Breite, Karte leuchtet orange (sanftes Pulsieren) · *nächste Stufe:* „28 XP to go“ · *gesperrt:* XP-Schwelle („540 XP“), Bild leicht entsättigt |
| Abstand / Rand | 14 px zwischen Karten, 40 px Innenabstand links/rechts, 40 px Verlauf an beiden Rändern |
| Schiene | 4 px, Grund `#2a1f3a`, Füllung Orange → Gold; Punkte 14 px, aktuelle Stufe 22 px Gold mit Hof |
| Bewegung | natives Scrollen (`overflow-x: auto`, `touch-action: pan-x`, `scroll-snap-type: x proximity`, Karte `scroll-snap-align: center`), keine Scrollleiste, Maus kann ziehen; beim Öffnen steht die aktuelle Stufe in der Mitte |
| Antippen | Karte = `button`; bereit → abholen (Server-Antwort abwarten, dann Zustand „Collected“ und Münz-Effekt `coinBurst`); sonst nichts Zusätzliches – alles steht schon auf der Karte |

**Bilder je Belohnung** (keine Emojis, keine flachen Symbole):

| Belohnung | Bild | Lichtschein hinter dem Bild |
|---|---|---|
| Münzen | Münzstapel als SVG (Goldverlauf, Stern-Prägung, keine Marke) | `#f2b630` |
| Season-Truhe | die vorhandene 3D-Truhe `createChestModel('big')`, Holz in Season-Lila `#5b2c6f` | `#a46cf0` |
| Rahmen | eigenes Porträt im neuen Season-Rahmen (`frames.ts`: Pumpkin, Spider web, Gravestone, Cauldron – im Mock-up Platzhalter `frame_gold`) | `#ff8f2b` |
| Titel | `titlePlaque()` mit dem Titeltext, darf zweizeilig umbrechen; Name der Karte „New title“ | `#d2462e` |
| Pass-Szene | gerendertes Bild der fertigen Szene aus A3 (im Mock-up eine Kenney-Figur als Platzhalter) | `#6fbf73` |
| Stufe 40 | Warlock + Horror-Haus | `#f2b630` |

Alle 3D-Bilder über **einen** Vorschau-Renderer (`render/itemThumbs.ts`, Meshopt), zwischengespeichert; ohne WebGL bleibt die Karte mit Platzhalter lesbar.

### 14.3 Stimmung (nur während der Saison)

| Was | Wert |
|---|---|
| Hintergrund | Verlauf `#1d1030` → `#0f0a17` (ab 62 %) |
| Blutmond | Kreis oben rechts (Mitte bei 86 % / 4 %, Radius ≈ 320 px): `#ffb08a` → `#f07a4c` → `#d2462e` → `#7d1f1c`, dazu weicher Hof `#d2462e55` |
| Silhouette | Friedhof/Dächer/Kreuze `#0d0814` hinter dem Kopf, vor dem unteren Mondrand |
| Nebel | weicher Streifen `#2a1f3a66` hinter der Karten-Spur |
| Panels | `#160e22` mit 85–90 % Deckkraft, Rand `#3d2c52`, `backdrop-filter: blur(6–8px)` |

### 14.4 Chancen-Fenster „What's inside?“

Modal (`role="dialog"`, Fokus auf Schließen, Esc schließt, Tipp neben das Fenster schließt), max. 860 px breit. Überschrift „What's inside a season chest?“, Satz „Each chest holds exactly one item. Pass, streak and shop chests have the same chances.“ Danach vier Bänder von **Legendary → Normal**: links große Prozentzahl in Seltenheitsfarbe + „LEGENDARY · 2 ITEMS“, rechts ein Raster aller Gegenstände (Kacheln ≥ 78 px, Rand in Seltenheitsfarbe, Name darunter). Dasselbe Fenster öffnet sich auch aus dem Inventar (Season-Truhen) und beim Shop-Kauf.

### 14.5 Weitere Ansichten

- **Profilkarte** (im Profil über den Truhen): Blutmond-Ecke, „SEASON I · HALLOWEEN“, Chip „Tier 12“, Balken, „26 days left · 1 chest waiting“, Knopf **Open LearnPass**.
- **Truhe öffnen** (Inventar): bestehende Truhe wackelt → Strahlenkranz und Rand in Seltenheitsfarbe → Bild 160 px, Abzeichen „RARE“, Name, Zeile „New! It's in your inventory now.“ / „Duplicate – sell for 40 coins“ / „Already owned – 100 coins“, Knopf **Next**. Ergebnis mit `role="status"`.
- **Stufe-40-Wahl:** Raster aller 28 Truhen-Gegenstände (Tablet 6 Spalten, Handy 4), Rand in Seltenheitsfarbe, Abzeichen „owned“, Auswahl mit hellem Rand + orangem Hof; darunter „You already own the pumpkin patch. Picking it gives you 100 coins.“ und **Pick this item** mit Rückfrage.
- **Markt-Stand (U6)** und Profilkarte öffnen den LearnPass; der LearnPass verlinkt ins Inventar und öffnet „What's inside?“.

### 14.6 Feste Werte

| Was | Wert |
|---|---|
| Farben | Nacht `#0f0a17`, Himmel `#1d1030`, Karte `#221830` / `#2d2040`, Rand `#3d2c52`, Blutmond `#d2462e` / `#f07a4c`, Kürbis `#ff8f2b`, Gold `#f2b630`, Knochen (Schrift) `#f6e9d2`, gedämpft `#b6a5c6`, Ruß `#120912`, Erfolg `#a6e05a` |
| Seltenheiten | Normal `#9aa3ad` · Rare `#4a8ff0` · Epic `#a46cf0` · Legendary `#f2b630` |
| Schrift | Titel „HALLOWEEN“: Comic Neue 700, Großbuchstaben, 40 px (Handy 30), 2 px Ruß-Kontur, Schatten `0 4px 0 #120912`; Überschriften in Kacheln Comic Neue 700; Text App-Schrift. Nur lokale Schriften, **kein Google-Fonts-CDN** |
| Tippflächen | ≥ 44 px, Hauptknöpfe ≥ 48 px; Fokus 3 px `#ffd16d`, Abstand 3 px |
| Größen | Tablet quer 1024–1180 px; unter 860 px einspaltig; die Seite scrollt nie waagerecht, nur die Spur |
| Bewegung | Puls der bereiten Karte, Wackeln der Truhe, weiches Springen nur ohne „Weniger Bewegung“ |
| Barrierefreiheit | Spur `aria-label="LearnPass tiers, swipe left and right"`, jede Karte `aria-label` („Tier 12: Title Pumpkin Rookie, + 5 coins, ready“), Tastatur: Pfeiltasten scrollen die Spur |

### 14.7 Texte

| Englisch (Standard) | Deutsch |
|---|---|
| Season I / Halloween | Season I / Halloween |
| {n} days left | noch {n} Tage |
| Tier {n} of 40 · {xp} XP · {d} XP to tier {n} | Stufe {n} von 40 · {xp} XP · noch {d} XP bis Stufe {n} |
| Jump to tier {n} | Zu Stufe {n} |
| You | Du |
| Collect · Collected · {d} XP to go | Abholen · Abgeholt · noch {d} XP |
| {n} coins · Season chest · New title · Frame: {name} · Garden scene | {n} Münzen · Season-Truhe · Neuer Titel · Rahmen: {name} · Garten-Szene |
| Pick any season item · + chest, title, 25 coins | Such dir einen Season-Gegenstand aus · + Truhe, Titel, 25 Münzen |
| {n} chest waiting · From tier {n} · Open in inventory | {n} Truhe wartet · Von Stufe {n} · Im Inventar öffnen |
| Chest streak · {n} of 3 days. Solve a quest tomorrow to get a chest. | Truhen-Serie · {n} von 3 Tagen. Löse morgen eine Quest, dann bekommst du eine Truhe. |
| Buy a chest · 50 coins · {n} of 2 left this week · Buy | Truhe kaufen · 50 Münzen · noch {n} von 2 diese Woche · Kaufen |
| What's inside? · Chances and all 28 items | Was ist drin? · Chancen und alle 28 Gegenstände |
| What's inside a season chest? · Each chest holds exactly one item. Pass, streak and shop chests have the same chances. | Was ist in einer Season-Truhe? · Jede Truhe enthält genau einen Gegenstand. Pass-, Serien- und Shop-Truhen haben dieselben Chancen. |
| New! It's in your inventory now. · Next | Neu! Jetzt in deinem Inventar. · Weiter |
| You already own {item}. Picking it gives you {n} coins. · Pick this item | Du hast {item} schon. Dafür bekommst du {n} Münzen. · Diesen nehmen |

**Englische Gegenstandsnamen** (Deutsch = Namen im Manifest): Warlock · Haunted house · Pumpkin patch · Spooky clock tower · Pickup truck (nicht „Dodge“) · Monster plant · Pumpkin tree · Candy pile · Graveyard corner · Fence with lantern · Witch statue · Pumpkin girl · Witch · Mummy · Skeleton · Zombie · Witch cat · Cauldron · Pumpkin cat · Ghost cat · Candy bucket · Bat · Grave candle · Little ghost · Gravestone · Jack-o’-lantern · Broom · Halloween sign. Titel: Pumpkin Rookie, Ghost Hunter, Witch's Friend, Halloween Legend. Rahmen: Pumpkin, Spider web, Gravestone, Cauldron. Szenen: Pumpkin bed, Fire basket, Autumn pine, Lantern path, Graveyard gate, Candle altar, Ghost at the grave, Skeleton on a bench, Zombie in the garden, Little crypt, Vampire and coffin, Gravedigger.

### 14.8 Dateien und Prüfung

- **Dateien (Vorschlag):** `web/src/ui/learnpass/learnpassView.ts` + `learnpass.css` (Seite), `tierCard.ts` (eine Karte), `track.ts` (Spur, Schiene, Springen, Maus-Ziehen), `rewardArt.ts` (Bilder je Belohnung), `insideModal.ts`, `seasonCard.ts` (Profilkarte), `seasonReveal.ts`, `seasonPick.ts`.
- **Tests:** Vitest für Kartenzustände, Texte, Fokus/Esc im Fenster, „Weniger Bewegung“; Playwright `web/e2e/learnpass.spec.ts` mit Screenshots 1180 × 820 und 390 × 844 von Seite, Fenster, Profilkarte, Truhe öffnen, Stufe-40-Wahl.
- **Abnahme:** die Screenshots neben die Referenzbilder legen – Aufbau, Farben, Maße, Zustände und Texte müssen übereinstimmen; kein waagerechtes Scrollen der Seite; Fokus sichtbar; „Weniger Bewegung“ geprüft; ≥ 30 fps beim Wischen im Tablet-Profil.
- **Bekannt aus dem Mock-up:** Geisterkatze und einige `kit-*`-Modelle erscheinen klein oder versetzt, bis A1 die Modelle normalisiert (§6.2).
