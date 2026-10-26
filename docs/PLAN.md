# Lerndorf – Umsetzungsplan

### Spielsprache – 26.10.2026

| AP | Status | Ergebnis |
| --- | --- | --- |
| Sprache 1 | [x] | Englisch als Standard; Deutsch über Settings / Einstellungen wählbar und im Browser gespeichert |
| Sprache 2 | [x] | Spielertexte, Anzeigenamen und Beschriftungen übersetzt; Lerndorf, Backend, IDs, Lerninhalte und Lehrerbereich erhalten |
| Sprache 3 | [x] | 880 Tests, Produktionsbuild und ESLint erfolgreich; 12 Browserprüfungen für Sprachwechsel und Kleiderschrank, abschließende drei Sprachprüfungen erneut erfolgreich |
| Sprache 4 | [ ] | Sichtabnahme durch den Auftraggeber, auf dessen Wunsch selbst durchgeführt |

Details: [Sprachwahl](PLAYER_LANGUAGES.md). 36 Dorfansichten für die Sichtkontrolle unter `web/test-results/layout-languages/` erzeugt. Lokal auf `codex/player-languages`, keine Datenbank- oder Inhaltsänderung, kein Deployment.

Stand: 17.10.2026 · gehört zu [SCOPE.md](SCOPE.md) und [SPEC.md](SPEC.md)

So liest man den Plan: Jede Stufe besteht aus nummerierten Arbeitspaketen (AP). Ein AP ist eine Arbeitssitzung oder kleiner. Spalte **Wer**: **CC** = Claude Code, **LK** = Lehrkraft. Ein AP gilt als erledigt, wenn sein **Fertig-Kriterium** geprüft ist. Am Ende jeder Stufe steht eine Abnahme durch die Lehrkraft auf einem Schul-Tablet; erst danach beginnt die nächste Stufe.

Fortschritt wird hier abgehakt (`[x]`) und kurz notiert (Datum, Abweichungen).

---

## Übersicht

| Stufe | Inhalt | Sitzungen CC | Zeit LK | Abhängig von |
| --- | --- | --- | --- | --- |
| 1 | Fundament: Setup, Datenbank, Login, Lehrer-Bereich, Deploy | 3–4 | ca. 60 Min. einmalig | – |
| 1b | Dorf-Layout: Kartenvorlagen, Wege, Vegetation, Marktplatz, Grundstücke, Leistung (Platzhalter-Optik) | 3–4 | 15 Min. Galerie-Abnahme | 1 |
| 2 | Dorf + Avatare im Comic-Look | 4–5 | 2 × 15 Min. Abnahme | 1b |
| 3 | Aufgabentafel + Münzen durch Aufgaben | 2 | 15 Min. | 1 (2 nicht zwingend) |
| 4 | Shop, Inventar, Baumodus | 2–3 | 15 Min. | 1, 2 |
| 5 | Probebetrieb, Feinschliff, Anleitung | 1–2 | 1 Woche Beobachtung | 1–4 |

Stufe 3 kann parallel zu Stufe 2 laufen, falls die Asset-Arbeit auf Zulieferungen (Modellpakete) wartet.

---

## Stufe 1 – Fundament

Ziel: Lehrkraft legt Konten an, Schüler melden sich an und sehen das Dorf ihrer Klasse (noch mit Platzhalter-Modellen aus dem Prototyp), Stempel lassen sich buchen.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [ ] 1.1 | CC | Anleitung für die Lehrkraft schreiben: GitHub-Repo `Lerndorf` anlegen, Supabase-Konto + Projekt (Region Frankfurt) anlegen, öffentliche Registrierung abschalten, Keys und Tokens finden, Secrets in GitHub eintragen, GitHub Pages aktivieren | `docs/ANLEITUNG_LEHRKRAFT.md` Teil „Einrichtung“ | LK kann jeden Schritt ohne Rückfrage ausführen |
| [ ] 1.2 | LK | Einrichtung nach Anleitung durchführen; Repo-Link, Supabase-Projekt-URL und Anon-Key an CC geben (Service-Key **nur** als GitHub-Secret) | Repo, Supabase-Projekt, Secrets | CC kann pushen, `supabase link` funktioniert |
| [ ] 1.3 | CC | Projektgerüst: Vite + TS strict, three.js 0.170.x, supabase-js, Vitest, Playwright, ESLint/Prettier, `.gitignore`, `base: '/Lerndorf/'` | `web/`, `package.json`, Konfiguration | `npm run build` und `npm test` laufen grün |
| [ ] 1.4 | CC | Welt-Code aus dem Prototyp in Module überführen: seeded PRNG, `terrain.ts`, `river.ts`, `paths.ts`, `plots.ts`, `layout.ts`; Platzhalter-Modelle, Figuren-Verhalten (`avatars/`), Qualitätsstufen | `web/src/world/*`, `render/*`, `avatars/*` | Dorf sieht aus wie Prototyp Layout 1; Vitest: Determinismus, keine Überlappung, kein Grundstück im Fluss, alle Häuser vom Marktplatz erreichbar |
| [ ] 1.5 | CC | Datenbank-Migration: alle Tabellen aus SPEC §5, View `village_members`, RLS aus §6, `settings`-Zeile, Seed: Klassen 8a/8b mit Seeds | `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_seed.sql` | `supabase db reset` lokal ok; SQL-Test: Schüler kann keine Tabelle schreiben, sieht nur eigene Klasse |
| [ ] 1.6 | CC | RPCs für Stufe 1: `add_stamps`, `adjust_coins`, `set_class_flags`; Ledger-Invariante | `0004_rpc_teacher.sql` | SQL-Tests: Doppel-Stempel abgelehnt, Münzen ≥ 0, Ledger-Summe = Münzstand |
| [ ] 1.7 | CC | Edge Function `admin-accounts`: create (einzeln + Liste), reset_password, move_class, delete; vergibt nächsten freien `plot_index` | `supabase/functions/admin-accounts/` | Aufruf ohne Lehrerrolle → 403; Liste mit 5 Konten legt 5 Konten an |
| [ ] 1.8 | CC | Login + Sitzung: Spitzname → Pseudo-Adresse, Fehlermeldungen, `sessionStorage`, Auto-Logout 15 Min., Abmelden-Knopf; Lehrer-Login unter `/lehrer` | `web/src/auth/*`, `ui/login` | Playwright: Login, Logout, Timeout (mit verkürzter Zeit im Test) |
| [ ] 1.9 | CC | Dorf mit echten Daten: Klasse + Seed laden, Mitglieder (`village_members`) als Figuren, eigenes Haus markieren, Kamera startet am eigenen Grundstück, HUD mit Spitzname und Münzen | `web/src/main.ts`, `api/*`, `ui/hud` | Zwei Testschüler verschiedener Klassen sehen verschiedene Dörfer; eigenes Haus richtig |
| [ ] 1.10 | CC | Lehrer-Bereich v1: Klassenübersicht, Konten anlegen (Liste), Zugangskärtchen-Druckansicht, Passwort zurücksetzen, Stempel buchen (Häkchen-Liste, Woche = Montag), Münzen korrigieren, Schalter | `web/src/teacher/*` | Stempel für 5 Schüler in < 1 Min.; bereits gebuchte Woche markiert |
| [ ] 1.11 | CC | GitHub Actions: `deploy.yml` (Test → Build → Pages), `keepalive.yml` (alle 3 Tage), Migrationen per `supabase db push` | `.github/workflows/*` | Push auf `main` deployt; Keepalive-Lauf grün |
| [ ] 1.12 | CC | Anleitung Teil „Alltag“: Konten anlegen, Kärtchen drucken, Stempel buchen | `docs/ANLEITUNG_LEHRKRAFT.md` | verständlich ohne Fachbegriffe |
| [ ] 1.13 | LK | **Abnahme Stufe 1** auf Schul-Tablet (Kriterien SPEC §18) | Notiz hier | Kriterien erfüllt |

## Stufe 1b – Instanzen und Dorf-Layout

Ziel: 8a und 8b sind sauber getrennte Instanzen (SPEC §1a), und das Dorf sieht schon mit Platzhaltern so lebendig und gemütlich aus wie der Prototyp und erfüllt die Regeln aus SPEC §10. Grundlage: `docs/REVIEW_2026-10-17_Dorflayout.md` (Befunde 1–14) und `Konzept/Review_2026-10-17/`. Blender-Modelle sind **nicht** Teil dieser Stufe; alles wird mit Platzhaltern an den richtigen Positionen gebaut – **aber in der Optik des Prototyps nach `docs/LOOK.md`** (Farben, Formen, Licht). Fertig-Kriterium jedes L-Pakets zusätzlich: Galerie-Bild hält dem Soll-Bild in `Konzept/Stil_Referenz/` stand.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [x] I.1 | CC | **Instanzen (SPEC §1a)**: Spielregeln je Instanz in `classes` (Belohnung, Tageslimit, Versuche, Raster), `class_items`, alle RPCs lesen Regeln aus der Instanz; `map_id` | Migration `0009_instances.sql` | Regeln einer Instanz wirken nicht in der anderen |
| [ ] I.2 | CC | **Trennung beweisen**: SQL-Tests, dass 8a nichts von 8b sieht oder auslöst; `move_class` nach §1a (Münzen/Inventar/Avatar ziehen mit, Platzierungen zurück ins Inventar, neuer Platz innen nach außen) | `web/tests/sql/instances.test.ts`, Edge Function | Tests grün, am Projekt mit Rücknahme geprüft |
| [x] I.3 | CC | **Lehrer-Bereich**: Instanz-Umschalter oben, alle Ansichten je Instanz, Spielregeln und Shop-Sperren je Instanz bearbeiten, Vorlage + Seed je Instanz | `web/src/teacher/*` | Wechsel 8a/8b zeigt nur die jeweilige Instanz |
| [x] L.1 | CC | **Layout-Galerie** zuerst bauen: Dev-Seite + `npm run galerie` (Vorlage × Seed × 5 Blickwinkel, Draw Calls im Bild) | `web/dev/galerie.html`, `web/scripts/galerie.ts`, Bilder in `Konzept/Galerie/<datum>/` | Galerie zeigt den heutigen Stand (Vorher-Bilder) |
| [x] L.2 | CC | **Kartenvorlagen**: Fluss, Wege, Platz, Wahrzeichen und Hügel als Vorlage-Datei; 3 deutlich verschiedene Vorlagen; Vorlage per `classes.map_id` (aus I.1) und `set_layout`-RPC (Vorlage + Seed) | `world/maps/*.ts` | 8a/8b in der Galerie klar unterscheidbar |
| [~] L.3 | CC | **Gelände, Wege, Fluss**: höhere Auflösung im Talboden, Wege und Platz als Vertex-Farbe/Splat ins Gelände, Gelände unter Wegen glätten, Flussbreite variabel, Ufer sauber unter Wasser, Ufersteine | `world/terrain.ts`, `render/terrain.ts` | keine Zacken/Durchstechen in Galerie-Nahaufnahmen (Befunde 4, 5) |
| [~] L.4 | CC | **Wegenetz**: Hierarchie (2,2 / 1,5 / 1,0 m), keine Sackgassen, Wahrzeichen an Wegenden als Ziele im Wegegraph, Brücken mit Geländer und Rampen | `world/layout.ts`, `render/bridges.ts` | Vitest „keine Sackgassen“, „Wahrzeichen erreichbar“ grün (Befunde 6, 9) |
| [~] L.5 | CC | **Grundstücke**: Vergabe von innen nach außen (`plot_index` nach Wegstrecke), Hangregel, kurze Böschungen, Gartenweg ins Wegenetz, Zaun mit Pfosten und Tor, Haus mit Tür/Fenstern/Satteldach im Grundstück, **freie Plätze als Bauplatz** | `world/plots.ts`, `render/plots.ts`; Edge Function vergibt weiter den nächsten freien Index | Vitest für Reihenfolge und Hangregel; Galerie-Nahaufnahme ok (Befunde 7, 8, 11) |
| [~] L.6 | CC | **Vegetation und Details**: Poisson-Disk-Verteilung, Waldgürtel, Baumgruppen, Büsche, Hecken, Blumenwiesen, Felsen, Schilf; Mengen nach SPEC §10.6 | `world/scatter.ts`, `render/nature.ts` (InstancedMesh) | Vitest „nichts auf Wegen/Plätzen/Grundstücken/Wasser“, Mengen im Rahmen (Befund 1) |
| [ ] L.7 | CC | **Marktplatz und Licht**: Pflaster mit Ringmuster, Brunnen, Aufgabentafel zum Hauptzugang, 3 Stände, 4 Bänke, Kübel, Laternen an Wegen, leuchtende Fenster, Lichtflecken, Abendstimmung wie Prototyp | `render/plaza.ts`, `render/lights.ts` | Galerie-Bild Marktplatz vergleichbar mit Prototyp (Befunde 2, 3) |
| [x] L.8 | CC | **Namen und Figuren**: keine Schilder an fremden Häusern, Figuren-Schilder ab ~30 m ausblenden, Name beim Antippen; Ziele der Figuren gleichmäßiger verteilen (Wahrzeichen, Häuser von Freunden), max. 3 an der Tafel | `render/crowd.ts`, `avatars/behaviour.ts` | Galerie-Übersicht ruhig lesbar; < 40 % der Figuren gleichzeitig am Platz (Befunde 12, 14) |
| [x] L.9 | CC | **Leistung**: statische Szenerie je Material zusammenfassen, Instancing für Wiederholtes; Draw Calls und Dreiecke in der Galerie protokollieren | `render/merge.ts` | Welt < 60 Draw Calls, gesamt mit 32 Figuren < 150 (Befund 13) |
| [ ] L.10 | CC | Galerie neu erzeugen, Soll/Ist nebeneinander (wie `Konzept/Stil_Referenz/`), Befundliste im Review und Fehlerliste LOOK §11 abhaken | `Konzept/Galerie/<datum>/`, `docs/REVIEW_…` | alle 14 Befunde erledigt oder begründet |
| [ ] L.11 | LK | **Abnahme Layout** anhand der Galerie und kurz auf dem Tablet (Bildrate) | Notiz hier | Layout freigegeben |

## Stufe 2 – Dorf und Avatare im Comic-Look

Ziel: Dorf und Figuren sehen aus wie aus einem Guss, Schüler gestalten ihren Avatar mit Starter-Teilen.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [ ] 2.1 | CC | Passende CC0-Pakete auswählen (Häuser/Dorf, Natur, Marktplatz, modulare Figur mit Animationen idle/walk/sit/wave); Lizenz jeweils prüfen; Liste mit Download-Links | `blender/sources/LICENSES.md` | jede Quelle mit Link + Lizenz CC0 belegt |
| [ ] 2.2 | LK / CC | Pakete herunterladen (CC selbst, sonst LK legt ZIPs in `blender/sources/`) | Quelldateien lokal, nicht im Repo | Dateien vorhanden |
| [ ] 2.3 | CC | Blender-Pipeline: `build_assets.py` (Import, Umfärben nach `palette.json`, AO als Vertex-Farbe, Decimate, GLB-Export) + `gltf-transform` (meshopt, KTX2) + Budget-Prüfung | `blender/scripts/*`, `blender/palette.json`, `npm run assets` | ein Befehl erzeugt alle GLBs; Bericht mit Dreieckszahlen |
| [ ] 2.4 | CC | **Stil-Test:** 1 Haus-Set (Wände, 3 Dächer, Fenster, Tür), 5 Deko-Teile, 1 animierte Figur ins Dorf einbauen; Vorher/Nachher-Screenshots | Test-Deploy, Screenshots in `Konzept/` | – |
| [ ] 2.5 | LK | **Abnahme Stil-Test** (Look, Farben, Figur) – Rückmeldung einarbeiten | Notiz hier | Look freigegeben |
| [ ] 2.6 | CC | Alle Dorf-Assets: Häuser in Varianten (1–2 Stockwerke), Marktplatz (Brunnen, Tafel, Stände, Bänke), Laternen, Brücken, Zäune, Bäume, Felsen, Schilf; **nur die Platzhalter-Meshes aus Stufe 1b austauschen, Positionen bleiben**; Instancing beibehalten | `web/public/assets/*`, `render/assets.ts` | Draw Calls < 150, Download < 8 MB |
| [ ] 2.7 | CC | Avatar-Baukasten: gemeinsames Skelett, Teile pro Slot, Farben, `AnimationMixer` mit Überblenden; Figur aus Rezept bauen | `avatars/avatar.ts` | 32 Figuren, 1–2 Draw Calls je Figur |
| [ ] 2.8 | CC | Verhalten auf echte Animationen umstellen (walk/idle/sit/wave), Laufen auf Gelände- und Brückenhöhe, Marker über eigenem Avatar | `avatars/behaviour.ts`, `crowd.ts` | wirkt flüssig, keine Figur läuft durch Häuser |
| [ ] 2.9 | CC | `items.json` mit Starter-Teilen + RPC `save_avatar` + Import des Katalogs | `content/items.json`, `0005_rpc_avatar.sql`, Workflow-Schritt | ungültige Teile/Farben abgelehnt |
| [ ] 2.10 | CC | Avatar-Editor (Vorschau, Kategorien, Palette, gesperrte Teile mit Preis); neue Schüler starten mit zufälligem Starter-Avatar | `ui/editor` | Änderung sehen Mitschüler nach Neuladen |
| [ ] 2.11 | CC | Leistungstest: 32 Figuren, Qualität Auto; Messwerte notieren | Notiz hier | ≥ 30 fps auf ältestem Tablet (LK misst) |
| [ ] 2.12 | LK | **Abnahme Stufe 2** | Notiz hier | Kriterien SPEC §18 |

## Stufe 3 – Aufgaben

Ziel: Schüler verdienen Münzen an der Aufgabentafel; Lösungen sind sicher.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [ ] 3.1 | CC | JSON-Schema für Aufgaben (choice, gap, match, order) + Beispielwoche passend zum aktuellen Wochenplan | `content/schema.json`, `content/tasks/<Montag>.json` | Schema-Validierung in CI |
| [ ] 3.2 | CC | Import-Workflow: validieren, `tasks` ohne Lösung, `task_solutions` getrennt, IDs mit Woche präfixieren | `.github/workflows/import-content.yml`, `scripts/import-content.ts` | Push einer Woche erscheint in der DB |
| [ ] 3.3 | CC | RPC `submit_answer` mit Normalisierung, Versuchen, Tageslimit (Europe/Berlin), halbe Belohnung für ältere Wochen | `0006_rpc_tasks.sql` | SQL-Tests: Limit, Versuche, Doppellösung, Lösung erst nach letztem Fehlversuch |
| [ ] 3.4 | CC | Aufgabentafel-UI: Antippen der Tafel im Dorf öffnet Liste; Aufgabentypen bedienbar per Touch; Rückmeldung, Münz-Animation, Tageslimit-Anzeige | `ui/tasks/*` | Playwright: Aufgabe lösen → Münzen steigen |
| [ ] 3.5 | CC | Kontoauszug (letzte 30 Buchungen) | `ui/ledger` | zeigt task/stamp/purchase verständlich |
| [ ] 3.6 | CC | Lehrer-Bereich: Aufgaben-Statistik (Anteil richtig je Aufgabe) | `teacher/stats` | Zahlen stimmen mit Testdaten |
| [ ] 3.7 | CC | Anleitung: wie eine neue Aufgabenwoche entsteht (Datei aus dem Wochenplan-Projekt in `content/tasks/` legen und pushen) | `docs/ANLEITUNG_LEHRKRAFT.md` | LK kann es allein |
| [ ] 3.8 | LK | **Abnahme Stufe 3** | Notiz hier | Kriterien SPEC §18 |

## Stufe 4 – Bauen

Ziel: Schüler kaufen Deko und gestalten ihr Grundstück; Mitschüler sehen es.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [ ] 4.1 | CC | Shop-Katalog vervollständigen (ca. 30–50 Deko- und Avatar-Teile, Preise nach SPEC §14); fehlende Assets durch Pipeline | `content/items.json`, Assets | alle Items haben Modell + Preis |
| [ ] 4.2 | CC | RPCs `buy_item`, `place_item`, `remove_placement` mit Raster-, Besitz- und Sperr-Prüfung | `0007_rpc_shop.sql` | SQL-Tests: Kauf ohne Geld, Überlappung, fremdes Teil entfernen → abgelehnt |
| [ ] 4.3 | CC | Shop-UI mit eigener Kaufbestätigung | `ui/shop` | Playwright: kaufen |
| [ ] 4.4 | CC | Baumodus: Kamera zum Grundstück, Raster (grün/rot), Inventar-Leiste, setzen, drehen, entfernen; Hausbereich gesperrt | `ui/build`, `world/plotgrid.ts` | Playwright: platzieren, drehen, entfernen |
| [ ] 4.5 | CC | Platzierungen aller Klassenmitglieder im Dorf rendern (Instancing je Item-Typ) | `render/placements.ts` | 32 Grundstücke à 10 Teile < Leistungsbudget |
| [ ] 4.6 | LK | **Abnahme Stufe 4** | Notiz hier | Kriterien SPEC §18 |


## Zwischenpaket L – Lehrerbereich

Plan: [Lehrerbereich-Überarbeitung](superpowers/plans/2026-10-25-teacher-overhaul.md), Fassung 2. Umsetzung am 26.10.2026 direkt auf main, ein Agent. Keine Veröffentlichung oder Änderung der Live-Datenbank.

| AP | Wer | Inhalt | Ergebnis |
| --- | --- | --- | --- |
| [x] L.1 | CC | Schüler-, Detail- und atomare Mehrfachbuchungs-RPCs | SQL- und Berechtigungstests |
| [x] L.2 | CC | Klassenwerte, Dorfnachricht und Lehrer-Lesefunktionen | SQL-Tests, RLS |
| [x] L.3 | CC | Sechs Seiten, Klassenwahl und Hash-Router | Bestehende Konten-/Dorf-Funktionen übernommen |
| [x] L.4 | CC | Aktivität und API-Abbildung | Berlin-Tagesgrenzen und Zeitumstellung geprüft |
| [x] L.5 | CC | Schülerliste mit Suche, Filtern, Details und Kontoauszug | Keine Zugangsdaten in der Liste |
| [x] L.6 | CC | Schnell-/Mehrfachbuchungen, Gründe, Rückgängig, Stempel | Doppelklickschutz und vollständiges Scheitern von Rückbuchungen geprüft |
| [x] L.7 | CC | Übersicht und Nachrichteneditor | Datenfehler bleiben auf ihren Teil beschränkt |
| [x] L.8 | CC | Tafelmodus | Nur Klassenwerte, keine individuellen Angaben |
| [x] L.9 | CC | Nachricht als Tafelzettel und einmalige Karte | Text sicher dargestellt, Speicherfehler abgefangen |
| [x] L.10 | CC | QR-Karten und Anmeldung per Fragment | Keine externen QR-Dienste, Fragment sofort gelöscht |
| [x] L.11 | CC | Als Schüler ansehen | Eigener Leseweg ohne Schüler-Schreibfunktionen |
| [x] L.12 | CC | Tests, Screenshots und Anleitung | Lokale Vorschau: /dev/teacher.html |
| [ ] L.13 | LK | Migration 0022 einspielen | Anleitung; 0001–0021 am 26.10.2026 online bestätigt |
| [ ] L.14 | LK | **Abnahme Lehrerbereich** | Münzseite am Tablet, Tafelmodus am Beamer, QR-Karten und Leseansicht |

Screenshots und lokale Testausgaben: `web/test-results/teacher/`, Dorf-Galerie `web/test-results/layout-teacher/`. Abschluss: 846 Tests, Build, ESLint und acht Lehrer-Browserprüfungen grün; 36 Dorf-Galeriebilder kontrolliert. Alle Testkonten sind reine Browser-Daten. Datenbankdatei: `0022_teacher_overhaul.sql` (nach XP 0020 und Tablet-Tutorial 0021).

## Zwischenpaket T – Tablet-UI und Navigation

Spec: `docs/superpowers/specs/2026-10-21-tablet-ui-navigation-design.md`, Plan: `docs/superpowers/plans/2026-10-21-tablet-ui-navigation.md`.

| AP | Wer | Inhalt | Ergebnis |
|---|---|---|---|
| [x] T.1 | CC | Gegenstands-Modell (`api/items.ts`) | Tests grün |
| [x] T.2 | CC | Barrierearme Dialoge (`ui/dialog.ts`), happy-dom | Tests grün |
| [x] T.3 | CC | Navigation: Aufgaben / Mein Haus als Symbole neben dem Avatar (26.10. vereinfacht) | Tests grün |
| [x] T.3b | CC | Dorf- und Marktplatz-Schaltfläche sowie blaue Navigationsleiste entfernen | Kompakte obere Navigation, mindestens 44 px große Touch-Ziele |
| [x] T.4 | CC | Einstellungen (Kontoauszug, Grafik, Abmelden) | Tests grün |
| [x] T.5 | CC | 3D-Vorschau im Detailfenster | Tests grün |
| [x] T.6 | CC | Gegenstandskarten + Detailansicht mit Kauf | Tests grün |
| [x] T.7 | CC | Shop- und Inventar-Bereiche mit Kategorien | Tests grün |
| [x] T.8 | CC | Baumodus: Vorschau vor Speichern, Platzliste, Übergabe aus Shop | Tests grün |
| [x] T.8b | CC | Vorschaubilder auf allen Karten | Tests grün, im Browser geprüft |
| [x] T.9 | CC | Haus-Menü und feste Hauskamera | Tests grün |
| [x] T.10 | CC | Einbau ins Dorf, Abmelden bei Ladefehler, Pinch ≠ Tipp | 449 Tests grün |
| [–] T.11 | – | Screenshot-Testseite | gestrichen (LK, 21.10.2026) |
| [x] T.12 | LK | **Abnahme Tablet-UI** | abgenommen 21.10.2026 |

## Zwischenpaket B – Bau-Feedback

Spec: `docs/superpowers/specs/2026-10-21-build-feedback-design.md`, Plan: `docs/superpowers/plans/2026-10-24-build-feedback.md`.

| AP | Wer | Inhalt | Ergebnis |
|---|---|---|---|
| [x] B.1 | CC | Kenney-Töne und Rauchtextur | Drei MP3-Dateien, eine transparente 128 × 128-Textur; Lizenzen dokumentiert |
| [x] B.2 | CC | Töne mit gespeichertem An/Aus-Schalter | Leise Wiedergabe nach Nutzeraktion; Audio- und Speicherfehler bleiben folgenlos |
| [x] B.3 | CC | Großzügigere Tippflächen | Exakte Treffer zuerst, sonst nächster Platz bis 0,5 m |
| [x] B.4 | CC | Aufstellen- und Wegräum-Effekte | Pop, Schrumpfen, höchstens acht Rauchpartikel; Aufräumen beim Verlassen |
| [x] B.5 | CC | Rahmen und Symbole für Bauplätze | Pulsieren bei freien Plätzen; dicker Rahmen bei Auswahl; reduzierte Bewegung |
| [x] B.6 | CC | Großes Platz-Menü mit Bildkarten | Aufstellen, Drehen, Wegräumen, Zurück; Fokus und Escape; Effekte erst nach RPC-Erfolg |
| [x] B.7 | CC | Einbau ins Dorf und Tutorial | Kameraversatz, gemeinsame Vorschaubilder, Ton-Einstellungen und Lebensdauer |
| [x] B.8 | CC | Browserbilder, Galerie und Abschlussprüfung | 744 Tests, Build, ESLint und 2 Playwright-Tests grün; 14 Bau-Screenshots und 36 Galeriebilder geprüft, unter `web/test-results/build-feedback/` und `web/test-results/build-gallery/` |
| [ ] B.9 | LK | **Abnahme Bau-Feedback** auf dem Schul-Tablet: Plätze erkennbar, großes Platz-Menü, Plopp/Rauch/Töne beim Aufstellen und Wegräumen, Töne abschaltbar, reduzierte Bewegung | Notiz hier |

Umsetzung 25.10.2026: Tutorial bereits in `main`, daher Zweig `feature/build-feedback` darauf aufgebaut. Kenney-Quellen aus dem externen Ordner `C:\Users\thoms\OneDrive\Desktop\Kenny`; keine Änderung der Quellpakete. Galerie unterstützt `GALLERY_OUTPUT_DIR`, damit `Konzept/` unverändert bleibt. Hochformat-Kamera nutzt die 52° aus LOOK; das Platz-Menü berücksichtigt zusätzlich den Platzbedarf der Navigation.

## Zwischenpaket E – Erststart-Tutorial

Spec: `docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md`, Plan: `docs/superpowers/plans/2026-10-23-first-login-tutorial.md`, SPEC §8a. Beim ersten Login: Figur, Kamerafahrt, zwei Nachrichten, drei Fragen mit direkter Antwort per Antippen, Fachwerkhaus kaufen und hinstellen, Tanz, Daily Quests.

| AP | Wer | Inhalt | Ergebnis |
|---|---|---|---|
| [x] E.1b | CC | Tablet-Tutorial: drei Fragen, große Antwortknöpfe, direkte Prüfung; Migration 0021 | 819 Tests grün; von der Lehrkraft am 26.10.2026 getestet und abgenommen; Migration 0021 online bestätigt |
| [x] E.1 | CC | Migration `0019_first_login_tutorial.sql` (Tabellen, fünf Fragen, RPCs, automatisches Grundstück, Haus kostet 50) | SQL-Tests grün |
| [x] E.2 | CC | Ruine im Haus-Sockel, Sprechblasen im Comic-Stil, Kamerapfade, Tanz | Tests grün, Bilder angesehen |
| [x] E.3 | CC | Ablauf in der Oberfläche (`ui/tutorial/`), Kaufdialog, geführter Baumodus, Einbau ins Dorf; manuelle Grundstückswahl entfernt | Tests grün |
| [x] E.4 | CC | Playwright-Durchlauf mit Screenshots (`e2e/tutorial.spec.ts`, Testseite `dev/tutorial.html`), Galerie, Doku | alle Schritte als Bild angesehen |
| [ ] E.5 | LK | **Abnahme durch die Lehrkraft:** zuerst Migration 0019 einspielen, dann die Vorschau des Zweigs testen, erst danach auf `main` übernehmen (Anleitung „Die Datenbank-Änderung (Migration 0019) einspielen“ in `docs/ANLEITUNG_LEHRKRAFT.md`) | – |

## Zwischenpaket Q – Daily Quests

Spec: `docs/superpowers/specs/2026-10-20-daily-quests-design.md`, Plan: `docs/superpowers/plans/2026-10-21-daily-quests.md`, Entscheidungen D1–D11: SPEC §9. Ersetzt die Wochenaufgaben (Aufgabentafel) durch 3 Quests pro Tag.

| AP | Wer | Inhalt | Ergebnis |
|---|---|---|---|
| [x] Q.1 | CC | Paketformat, Prüfer und Umwandlung (`content/daily-quests/FORMAT.md`, `web/scripts/quests.ts`) | Tests grün |
| [x] Q.2 | CC | Tabellen und Import-RPCs (Migration `0015_daily_quests.sql`) | SQL-Tests grün |
| [x] Q.3 | CC | Schüler-RPCs mit Nachholen und einmaliger Buchung (`0016_daily_quests_rpc.sql`) | SQL-Tests grün |
| [x] Q.4 | CC | Lehrer-RPCs Status und Vorschau (`0017_daily_quests_teacher.sql`) | SQL-Tests grün |
| [x] Q.5 | CC | Import-Skript und Workflow `import-content`; alter Wochenimport entfernt | Tests grün |
| [x] Q.6 | CC | Client-API, Antworten, Vorlesen (`api/quests.ts`, `quests/speech.ts`) | Tests grün |
| [x] Q.7 | CC | Bereich „Daily Quests“ ersetzt die Aufgabentafel (`ui/dailyQuestsView.ts`) | Tests grün |
| [x] Q.8 | CC | Lehrer-Bereich: Status, Warnung, Vorschau (`teacher/questsView.ts`) | Tests grün |
| [x] Q.9 | CC | Doku (SPEC, SCOPE, PLAN, Anleitung „Daily Quests einspielen“), Screenshots, Reihenfolge fürs Einspielen | 557 Tests grün, Screenshots angesehen |
| [ ] Q.10 | LK | **Abnahme durch die Lehrkraft** (Kriterien Spec §8): erst Migrationen 0015–0017 einspielen, dann das erste Paket | – |

## Zwischenpaket X – XP und Level

Spec: `docs/superpowers/specs/2026-10-24-xp-level-design.md`; Plan: `docs/superpowers/plans/2026-10-24-xp-level.md`; SPEC §8b. Umsetzung vom 25.10.2026 auf `main`.

| AP | Wer | Inhalt | Ergebnis |
| --- | --- | --- | --- |
| [x] X.1 | CC | XP-Buchungen, Levelkurve, Truhen und Belohnungskatalog | Migration `0020_xp_levels.sql`, RLS und SQL-Tests |
| [x] X.2 | CC | Quest-XP, Tagesziel und Schultag-Serie mit Wochenschild | Wiederholungs-, Wochenend- und Ferienfälle geprüft |
| [x] X.3 | CC | Stempel, Tutorial, erstes Aufstellen, öffentliche Level und Nachberechnung | Historische Erfolge einmalig, höchstens drei Truhen |
| [x] X.4 | CC | Fortschritt, Truhen öffnen, Titel und Rahmen wählen | Server prüft Eigentum/Level; Öffnen bucht nur einmal |
| [x] X.5 | CC | Fortschritts-API und zusätzliche RPC-Rückgaben | Alte Serverantworten werden toleriert |
| [x] X.6 | CC | Figuren-Brustbilder, sieben Rahmen und Wappen, Kenney-Töne/Sterne | Echte Geometrie bestimmt den Bildausschnitt; gültige MP3-Dateien |
| [x] X.7 | CC | Avatar-Feld mit XP-Balken, Münzen, Serie und Truhenpunkt | Profil öffnet über das Figurenbild |
| [x] X.8 | CC | XP-Einblendung, Level-Feier und Truhenöffnung | Serverantwort abwarten, Wiederholen bei Fehler, reduzierte Bewegung |
| [x] X.9 | CC | Profilseite mit Serie, Truhen und eigener Sammlung für Freischaltungen | Am 25.10. nach Rückmeldung vereinfacht; Erfolge und XP-Hilfe entfallen |
| [x] X.10 | CC | Level-Wappen und Titel in vorhandenen Namensschildern | Keine zusätzlichen Sprites oder Draw Calls |
| [x] X.11 | CC | Quests, Bauen, Tutorial, Willkommen-Karte und Lehrerübersicht verbinden | Ungesehene Buchungen bleiben erhalten; Tutorial-Feier vor Quests |
| [x] X.12 | CC | Browserbilder, Galerie, Gesamtprüfung und Dokumentation | 796 Tests, Build und ESLint grün; Tablet-Bilder, Audio-Prüfung und Tutorial grün; 36 Galeriebilder plus Wappenvergleich |
| [x] X.13 | LK | Migration 0020 einspielen | Am 26.10.2026 über die Supabase-Migrationsliste online bestätigt |
| [ ] X.14 | LK | **Abnahme XP und Level** auf dem Schul-Tablet (Design §13) | Figurenbild, Fortschritt, Truhen, Titel/Rahmen, Töne, Bildrate |

Die Browser-Vorschau steht unter `web/dev/profile.html`; Bilder unter `web/test-results/xp-gallery/`, Tutorial unter `web/test-results/tutorial/`, Dorf-Galerie unter `web/test-results/layout-xp/`. Vorschauen nutzen Testdaten und gehören nicht zum veröffentlichten Build.

### Profil-Überarbeitung vom 25.10.2026

Auftrag: weniger Informationen, eigene Sammlung und direkt bedienbare 3D-Truhen. Design und Reihenfolge: `docs/superpowers/specs/2026-10-25-profile-interaction-design.md`. Sequenziell ohne Teilagenten.

| AP | Wer | Inhalt | Ergebnis |
| --- | --- | --- | --- |
| [x] P.1 | CC | Eigene 3D-Truhe mit Deckelscharnier und gemeinsamem Renderer | Modell-, Hover- und Bewegungsprüfungen; SVG-Ersatz ohne WebGL |
| [x] P.2 | CC | Objekt direkt öffnen, Hover-Kontur und Wackeln | Ein Aufruf bei Doppelklick; Deckel wartet auf Server; Fehler erneut antippbar |
| [x] P.3 | CC | Kompaktes Profil und separate Sammlung | Titel/Rahmen als Reiter, Auswahl und Tastatur geprüft; XP-Tabelle entfernt |
| [x] P.4 | CC | Bilder, Tutorial, Gesamtprüfung und Dokumentation | 801 Tests, Build und ESLint grün; 8 Browserprüfungen inklusive Erststart/Fortsetzen; Desktop-, Tablet- und Handybilder geprüft (`web/test-results/profile-interaction/`) |

Keine zusätzliche Datenbankänderung für diese UI-Überarbeitung. X.13 und X.14 bleiben offen.

## Zwischenpaket B – Sir Byte als Begleiter

Auftrag vom 25.10.2026: vorhandenen Sir Byte einbauen, Tutorial und Quests anpassen; autonom und sequenziell ohne Teilagenten. Design: `docs/superpowers/specs/2026-10-25-sir-byte-mascot-design.md`; Detailplan: `docs/superpowers/plans/2026-10-25-sir-byte-mascot.md`.

| AP | Wer | Inhalt | Ergebnis |
| --- | --- | --- | --- |
| [x] B.1 | CC | Originalfigur, Typen, Aufnahmen und Herkunft übernehmen | Quelle `ea10e0c`; 24 Meshes / 26 930 Dreiecke; sechs Aufnahmen, keine neue Abhängigkeit |
| [x] B.2 | CC | Ermutigende Reaktionen und eine gemeinsame Stimme | Fehler pro Frage; Nutzergeste/Tonschalter; verspätete Ladevorgänge abbrechbar |
| [x] B.3 | CC | Kleine 3D-Bühne, Blasen und Standbild-Ersatz | WebGL-Fehler, Bewegungseinstellung, Aufräumen und sichere Texte getestet |
| [x] B.4 | CC | Daily Quests und Tutorial-Quiz anbinden | Durchgängiges Fenster, Hör-Aufgaben unterbrechen Stimme, deutscher Feedbacktext bleibt |
| [x] B.5 | CC | Marktfigur und Tutorial-Begleitung | Begrüßung, Grundstück, Hausplatz zeigen, Server-Schritte fortsetzen, Dorf bei Quiz pausiert |
| [x] B.6 | CC | Browserbilder, Galerie, Renderbudget und Abschlussprüfung | 814 Tests, Build und ESLint grün; 20 Browserprüfungen, darunter kompletter Erststart in Quer-/Hochformat, Handy-Einstieg, Audio-Unterbrechung, Profilregression; 36 Dorfbilder geprüft |
| [ ] B.7 | LK | **Abnahme auf dem Schul-Tablet** | Stimme, Lesbarkeit, Tutorial, Tafel-Antippen und Bildrate prüfen |

Sir Byte erfordert keine Migration. Stand 26.10.2026: XP-Migration 0020 und Tutorial-Migration 0021 online bestätigt; die Veröffentlichung des neuen Lehrerbereichs und Migration 0022 stehen aus.

Nachbesserung 25.10.2026 nach Hörprobe: Lob rotiert durch acht Texte und zwei passende bestehende Aufnahmen, mit 20 Sekunden Abstand bei der Sprachauswahl und ohne direkt identische Lob-Aufnahmen. Keine zweite gesprochene Lobkette am Tagesende. Die vorhandene Begrüßung `ready.mp3` spielt jetzt auch am Markt im Tutorial, passend zur Blase „Ready when you are.“ und abbrechbar mit „Weiter“. Abgesichert durch Sequenz-, Integrations- und Browserprüfungen für tatsächlichen Audiostart und Unterbrechung. Abschluss: 817 Tests, Build und ESLint sowie fünf gezielte Browserprüfungen inklusive vollständigem Tutorial grün.

Messung in derselben Szene auf allen drei Karten, Qualität „Niedrig“: Sir Byte zusätzlich 19 Draw Calls / 25 594 sichtbare Dreiecke in Ruhe, 23 / 26 546 bei der Gehstock-Geste. Außer Sicht bzw. weit entfernt keine Aktualisierung; jenseits 90 m ausgeblendet. Das vollständige Modell umfasst 24 Meshes / 26 930 Dreiecke. Das bisherige Gesamtbudget ist mit den vorhandenen Bewohnern bereits teilweise überschritten; die echte Tablet-Bildrate ist weiterhin nicht bestätigt. Bilder: `web/test-results/sir-byte/`, `web/test-results/tutorial/1024-*` und `820-*`, `web/test-results/layout-byte/`. Originalmodule bis auf Herkunftskommentar unverändert geprüft. Nach der eigenen Codeprüfung sind verspätete Abschlusszeilen nach „Anhören“ durch einen Regressionstest abgesichert; Blasen und Kamerarahmung verhindern Überlappungen mit der Schülerfigur.

## Stufe 5 – Probebetrieb

| AP | Wer | Aufgabe | Fertig, wenn |
| --- | --- | --- | --- |
| [ ] 5.1 | CC | Fehler- und Offline-Hinweise, Ladebildschirm, Datenschutz-/Impressumsseite (Platzhaltertext) | alle Fehlerfälle verständlich |
| [ ] 5.2 | LK | Datenschutztext mit Schulleitung klären, Klassengrößen, Münzbeträge bestätigen (SPEC §19) | Werte eingetragen |
| [ ] 5.3 | LK | Konten für eine Klasse anlegen, Kärtchen verteilen, 1 Woche Probebetrieb | Rückmeldungen gesammelt |
| [ ] 5.4 | CC | Rückmeldungen umsetzen, Wirtschaft nachjustieren | Änderungen deployt |
| [ ] 5.5 | CC | Anleitung vervollständigen (Einrichtung, Alltag, Aufgaben, Probleme lösen) | Anleitung vollständig |
| [ ] 5.6 | LK | Start für beide Klassen | – |

---

## Was die Lehrkraft insgesamt tun muss

1. **Einmalig (Stufe 1, ca. 60 Min.):** GitHub-Repo anlegen, Supabase-Projekt anlegen, Secrets eintragen, Pages aktivieren – nach Anleitung.
2. **Abnahmen:** nach jeder Stufe auf einem Schul-Tablet testen (je ca. 15 Min.), beim Stil-Test über den Look entscheiden.
3. **Eventuell:** CC0-Modellpakete herunterladen, falls Claude Code sie nicht selbst laden kann.
4. **Klären:** Datenschutztext (Schulleitung), Klassengrößen, Münzbeträge.
5. **Im Alltag:** Stempel buchen (ca. 5 Min./Woche), Quest-Datei der Woche hochladen (Daily Quests, Anleitung „Daily Quests einspielen“).

## Risiken im Ablauf

| Risiko | Wirkung | Gegenmaßnahme |
| --- | --- | --- |
| Modellpakete nicht herunterladbar | Stufe 2 wartet | Stufe 3 vorziehen; LK lädt ZIPs |
| Stil-Test gefällt nicht | Nacharbeit Assets | Stil-Test bewusst klein halten, erst dann alle Assets |
| Layout wirkt trotz Regeln leer oder unruhig | Nacharbeit vor Stufe 2 | Galerie früh und oft erzeugen; Lehrkraft schaut auf Bilder statt auf Code |
| Ältestes Tablet zu langsam | ruckelt | Qualitätsstufen, weniger Figuren gleichzeitig animieren, Budget nachschärfen |
| Supabase-Pause trotz Keepalive | Seite nach Ferien aus | Keepalive-Lauf in Actions prüfen; Anleitung „Projekt wiederherstellen“ |
| Freiarbeit wird Bauzeit | Lernen leidet | Schalter Shop/Bauen pro Klasse; Münzen nur für Englisch |

## Fortschrittsnotizen

| Datum | Stufe/AP | Notiz |
| --- | --- | --- |
| 16.10.2026 | 0 | Prototyp mit organischem Dorf fertig, läuft auf Schul-Tablets gut |
| 17.10.2026 | – | SCOPE, SPEC, PLAN geschrieben; Übergabe an Claude Code |
| 17.10.2026 | 1.3 teilweise | `web/`: Vite, TS strict, three 0.170.0 gepinnt, supabase-js, Vitest, ESLint, Prettier, Playwright-Konfiguration; Build, Typecheck, Lint und Tests grün. Noch offen: Playwright-Smoke-Test (`web/e2e/`) und dessen erster Lauf |
| 17.10.2026 | 1.4 teilweise | Welt-Logik portiert (`web/src/world/`: rng, terrain, layout, Wegegraph); 39 Vitest-Tests grün. Dorf-Rendering mit Platzhaltern (`web/src/render/village.ts`) im Browser geprüft: Fluss, Brücke, Marktplatz, Wege, Grundstücke rendern ohne Konsolenfehler. Noch offen: Figuren, Verhalten, Kamera-Knöpfe, Qualitätsstufen, echte Modelle |
| 17.10.2026 | 1.5 geschrieben | `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_seed.sql` (Klassen 8a/8b, Seeds 11 und 23) geschrieben, **noch nicht gegen eine Datenbank geprüft** |
| 17.10.2026 | 1.5 geprüft | SQL-Tests gegen echtes Postgres (PGlite, `web/tests/sql/`): Migrationen 0001–0004 laufen durch; RLS, Rechte, Stempel, Münzen, Ledger-Summe grün (16 Tests). Probe: mit geöffneter RLS-Regel schlagen zwei Tests fehl |
| 17.10.2026 | 1.6 erledigt (lokal) | `0004_rpc_teacher.sql`: `add_stamps`, `adjust_coins`, `set_class_flags` mit Rollenprüfung, Doppel-Stempel-Sperre, Notizpflicht |
| 17.10.2026 | Abweichung | Supabase-Projekt liegt in `eu-west-1` (Irland) statt `eu-central-1` (Frankfurt). Von der Lehrkraft so gewünscht |
| 17.10.2026 | Abweichung | 40 Grundstücke sind nicht zuverlässig platzierbar (Seed 7: 37). Planung mit 34 Plätzen (32 + 2 Reserve) |
| 17.10.2026 | 1.7 geschrieben | `supabase/functions/admin-accounts/`: Konten einzeln und per Liste, Passwort zurücksetzen, Klasse wechseln, löschen; nur Lehrkräfte. Prüfregeln getestet (`validate.ts`). Der Deno-Handler ist **nicht ausgeführt** (Deno lokal nicht installiert) |
| 17.10.2026 | 1.8 erledigt (lokal) | Login über Pseudo-Adresse, Sitzung in `sessionStorage`, Auto-Logout nach 15 Min., Abmelden-Knopf. Unit-Tests für Auto-Logout grün |
| 17.10.2026 | 1.9 geschrieben | Dorf mit echten Daten (`api/village.ts`, `ui/villageView.ts`): eigenes Haus markiert, Namensschilder, Kamera am eigenen Haus. **Nicht gegen die Datenbank geprüft** |
| 17.10.2026 | 1.10 geschrieben | Lehrer-Bereich unter `/lehrer/` (`teacher/`): Übersicht, Stempel (Montag, schon gebuchte ausgegraut), Konten, Zugangskärtchen-Druck, Passwort, Löschen, Münzen, Schalter. **Nicht gegen die Datenbank geprüft** |
| 17.10.2026 | 1.11 geschrieben | `.github/workflows/`: `deploy.yml` (Test, Build, Pages), `migrate.yml` (Migrationen und Funktion), `keepalive.yml` (alle 3 Tage). YAML geprüft, **noch nicht ausgeführt** |
| 17.10.2026 | 1.12 geschrieben | `docs/ANLEITUNG_LEHRKRAFT.md`: Einrichtung und Alltag. Nicht mit der Lehrkraft durchgegangen |
| 17.10.2026 | 1.3 Smoke-Test | Playwright: zwei Smoke-Tests (beide Seiten laden ohne Laufzeitfehler) grün |
| 17.10.2026 | Offen | Vite warnt wegen Chunk-Größe (Three.js, ~500 kB). Später aufteilen. Migrationen und Funktion noch nicht auf dem Supabase-Projekt angewendet |
| 17.10.2026 | Datenbank angewendet | Projekt `ygopamapzhlwrpjzjunq` (eu-west-1): Migrationen 0001 bis 0005 angewendet (Schema, RLS, Seed 8a/8b, Lehrer-RPCs, Rechte-Korrektur). RLS auf allen Tabellen aktiv, `task_solutions` ohne Policy (gewollt) |
| 17.10.2026 | Edge Function deployed | `admin-accounts` aktiv; ohne Anmeldung 401 |
| 17.10.2026 | Sicherheitsberater | Verbleibende Hinweise sind gewollt: Policy-Helper (`current_class`, `is_teacher`) sind für anon und angemeldete Nutzer ausführbar, weil RLS sie braucht; die Teacher-RPCs prüfen die Rolle selbst |
| 17.10.2026 | Offen (Lehrkraft) | Öffentliche Registrierung in Supabase abschalten; Lehrkonto anlegen und Profil-Zeile setzen (Anleitung Teil 1) |
| 17.10.2026 | 1.4 erledigt (Platzhalter) | Wegsuche und Gehhöhe (`world/walk.ts`), Verhalten (`avatars/behaviour.ts`: Ziele, Bank, Brunnen, Tafel, Grüßen mit festen Wörtern), Figuren im Dorf (`render/crowd.ts`), Tippen lässt winken, Qualitätsstufen Auto/Hoch/Niedrig (`render/quality.ts`), Knöpfe „Marktplatz“ und „Mein Haus“. 99 Tests grün. Modelle sind noch Platzhalter (Stufe 2) |
| 17.10.2026 | Nicht geprüft | Dorf mit Figuren und Knöpfen ist nur im Build und ohne Konten geprüft; ein Blick mit echten Konten steht aus |
| 17.10.2026 | 2.9 Backend erledigt | `0006_avatar_shop_build.sql`: Palette, Starter-Teile und Shop-Katalog (13 Einträge), `save_avatar`, `buy_item`, `place_item`, `remove_placement` mit Schalter-, Besitz-, Rand-, Haus- und Überlappungsprüfung. Auf dem Projekt angewendet |
| 17.10.2026 | 3.3 Backend erledigt | `0007_tasks_rpc.sql`: `submit_answer` mit Normalisierung, Versuchen, Tageslimit, Lösung erst nach letztem Fehlversuch, halber Belohnung für ältere Wochen. Auf dem Projekt angewendet |
| 17.10.2026 | 3.1/3.2 Backend erledigt | Prüfer für Wochen-JSON (`web/scripts/content.ts`), Import-Skript (`web/scripts/import-content.ts`), Workflow `import-content.yml`. Noch keine Wochendatei in `content/tasks/` |
| 17.10.2026 | SQL-Tests | 42 SQL-Tests grün (16 Grundlagen, 26 Avatar, Shop, Bauen, Aufgaben). Inhalt: 135 Vitest-Tests gesamt |
| 17.10.2026 | Offen Stufe 2–4 | Avatar-Editor, Aufgabentafel, Shop- und Baumodus-Oberfläche, `content/items.json` mit 30–50 Teilen (Katalog derzeit 13), Stil-Test. Blender und Grafik noch nicht begonnen (auf Wunsch zurückgestellt) |
| 17.10.2026 | Logik gegen das echte Projekt geprüft | Prüfblock mit Rücknahme (ROLLBACK) auf dem Projekt: Aufgabe richtig, Doppellösung abgelehnt, Reihenfolge bei Zuordnung egal, halbe Belohnung für ältere Woche, Kauf, Bauen am Haus abgelehnt, Kauf ohne Münzen abgelehnt, Münzen = Ledger. Danach keine Testdaten übrig |
| 17.10.2026 | 3.4 und 4.3 Oberfläche | Aufgabentafel (`ui/taskBoardView.ts`: Antwortformen choice, gap, match, order; Rückmeldung; Versuche) und Shop (`ui/shopView.ts`: eigene Kaufbestätigung, ausgegraut bei Geldmangel oder geschlossenem Shop). Knöpfe „Aufgaben“ und „Shop“ im Dorf. 142 Tests grün |
| 17.10.2026 | Nicht geprüft | Oberflächen nur im Build; mit echten Schülerkonten noch nicht durchgeklickt. Der Knopf „Versuche heute: x von 3“ nutzt fest 3 (Standard aus `settings`) |
| 17.10.2026 | Offen | Baumodus (4.4), Avatar-Editor (2.10), Import einer echten Wochendatei, `content/items.json` mit 30–50 Teilen |
| 17.10.2026 | Backend 0008 angewendet | `task_attempts` (Antwort-Protokoll, RLS), `submit_answer` schreibt das Protokoll, `task_stats(week)` für die Lehrkraft (Anteil richtig je Aufgabe, PLAN 3.6), `set_layout_seed(class, seed)` (SPEC §10), Katalog auf 30 kostenpflichtige Teile erweitert. 50 SQL-Tests grün |
| 17.10.2026 | Lehrkonto | Noch nicht angelegt (Schritte aus der Anleitung stehen bei der Lehrkraft). Prüfung am Stand: kein Profil mit Rolle teacher |
| 17.10.2026 | 4.4 Baumodus (Oberfläche) | `render/buildMode.ts`, `build/grid.ts`, `api/build.ts`: Kamera auf dem eigenen Grundstück, Raster grün/rot, Inventarleiste mit freien Stücken, Drehen, Setzen, Entfernen. Nur das eigene Grundstück reagiert auf Tipps. 161 Vitest-Tests grün |
| 17.10.2026 | Grundstücksgrenze geprüft | Am echten Projekt in einem Block mit Rücknahme: Platzierung gehört dem Aufrufer; eine andere Schülerin kann sie weder entfernen noch auf dem Grundstück setzen. Die Funktion `place_item` hat keinen Parameter für ein fremdes Grundstück |
| 17.10.2026 | Nicht geprüft | Baumodus nur im Build und ohne echte Konten. Platzierungen von Mitschülern sieht man im Dorf noch nicht (4.5) |
| 17.10.2026 | 3.5 Kontoauszug | `ui/ledgerView.ts`: die letzten 30 Buchungen aus `coin_ledger` (eigene Zeilen, RLS), Notiz nur bei Korrekturen der Lehrkraft. Knopf „Konto“ im Dorf |
| 17.10.2026 | 3.4 Rest | Tafel im Dorf antippen öffnet die Aufgaben. Bei Gewinn erscheint „+N“ neben den Münzen |
| 17.10.2026 | 3.6 Aufgaben-Statistik (Anzeige) | Lehrer-Bereich: Woche wählen, Antworten und Anteil richtig je Aufgabe (`task_stats`) |
| 17.10.2026 | 1.10 Rest Seed-Auswahl | Lehrer-Bereich: Seed einer Klasse setzen, mit Warnung vor dem Verschieben der Grundstücke |
| 17.10.2026 | 3.1 Schema und 3.7 Anleitung | `content/schema.json` beschreibt die Wochendatei. Anleitung hat den Abschnitt „Neue Aufgabenwoche einspielen“ |
| 17.10.2026 | Offen Stufe 3 | Echte Aufgabenwoche aus dem Wochenplan-Projekt, Service-Key als GitHub-Secret für den Import, Abnahme (3.8) |
| 17.10.2026 | 4.5 Platzierungen aller Mitschüler | `render/placements.ts`: eine InstancedMesh je Gegenstandstyp, auf dem Grundstück des jeweiligen Schülers. Daten über `loadClassPlacements` (RLS: nur eigene Klasse). Umrechnung getestet. Im Browser geprüft: die Deko liegt an der berechneten Stelle, nur nicht im Ausschnitt der Kamera. Frustum-Culling für Instancing abgeschaltet |
| 17.10.2026 | Stufe 4 offen | Abnahme (4.6), echte Modelle für den Katalog, Prüfung mit echten Konten |
| 17.10.2026 | Review Layout (Claude, Chat) | Dorf aus dem Code mit Beispieldaten gerendert: Welt-Logik gut, Optik hinter Prototyp (keine Vegetation, leerer Marktplatz, kein Abendlicht, zackige Wege/Ufer, Sackgassen, 8a≈8b, leere Häuser, 400–480 Draw Calls). Neue Stufe **1b Dorf-Layout** eingefügt, SPEC §10 neu geschrieben (Kartenvorlagen, Regeln, Galerie). Siehe `docs/REVIEW_2026-10-17_Dorflayout.md`. Hinweis: erledigte APs bitte in den Tabellen abhaken, nicht nur in den Notizen |
| 17.10.2026 | Vorgabe Lehrkraft | **8a und 8b sind zwei getrennte Instanzen** (eigenes Dorf, eigene Bewohner, eigene Spielregeln, keine gegenseitige Sicht). SPEC §1a neu, APs I.1–I.3 in Stufe 1b |
| 17.10.2026 | Stil-Leitfaden | `docs/LOOK.md` mit allen Farben, Maßen und Lichtwerten aus dem Prototyp; Soll/Ist-Bilder in `Konzept/Stil_Referenz/`. Vorgabe Lehrkraft: Das Dorf soll aussehen wie im Prototyp |
| 17.10.2026 | I.1 erledigt | `0009_instances.sql` auf dem Projekt angewendet: Regeln je Instanz in `classes` (Belohnung, Tageslimit, Versuche, Raster, `map_id`), `class_items`; `add_stamps`, `place_item`, `buy_item`, `submit_answer` lesen die Regeln der eigenen Instanz. 8 SQL-Tests grün |
| 17.10.2026 | I.2 teilweise | `move_student_class` (Lehrkraft): Platzierungen zurück ins Inventar, Münzen/Inventar/Avatar bleiben, nächster freier Platz. Tests grün. Edge Function im Repo angepasst (löscht Platzierungen), **noch nicht neu deployt**. Platz „innen nach außen“ folgt mit L.5 (braucht Wegstrecke), noch nicht geprüft am Projekt |
| 17.10.2026 | L.1 erledigt | `npm run galerie`: Dev-Seite `web/dev/galerie.html`, Skript `web/scripts/galerie.ts`. Bilder in `Konzept/Galerie/2026-10-17/` (Vorlage tal × Seed 11/23 × 5 Blickwinkel) mit `stats.json`. Vorher-Stand: Übersicht 404–413 Draw Calls (Welt 227–244) |
| 17.10.2026 | Offen Stufe 1b | I.3 Lehrer-Bereich mit Instanz-Umschalter, I.2 Prüfung am Projekt und Deploy der Edge Function, L.2–L.11 |
| 17.10.2026 | L.2 erledigt | Drei Vorlagen in `web/src/world/maps/`: `tal` (Stufe-0-Tal), `fluss_mitte` (Fluss quer durch die Mitte mit Brücke), `bach_norden` (schmaler Bach im Norden). Der Seed streut nur noch Grundstücke. Wege enden jetzt am Platz (Test je Vorlage). `0010_layout_maps.sql` angewendet: `map_templates`, `classes.map_id`-Fremdschlüssel, RPC `set_layout(class, map, seed)`. Dorf und Galerie nehmen die Vorlage der Klasse. 205 Vitest-Tests und 4 neue SQL-Tests grün |
| 17.10.2026 | L.2 Hinweis | Wahrzeichen sind als Daten je Vorlage hinterlegt, aber noch nicht gezeichnet (L.4). Die Galerie zeigt jetzt alle drei Vorlagen × Seeds 11 und 23 (30 Bilder) |
| 17.10.2026 | L.3 teilweise | Wege sind ins Gelände gemalt (Vertex-Farbe, weicher Rand), die Wegstreifen entfallen. Gelände 140 Segmente im Talboden. Flussbreite wechselt 5,6–8,8 m (LOOK §4). Offen: Uferschnitt an steilen Hängen (an der Galerie sichtbar als Schlieren), Gelände unter Wegen glätten, Ufersteine |
| 17.10.2026 | L.6 teilweise | `world/scatter.ts` + `render/nature.ts`: Bäume (Nadel- und Laubbäume, Waldgürtel am Talrand, Gruppen im Tal, rosa Blütenbäume selten) und Laternen (alle ~11 m an den Wegen, vier am Platz, Lichtkegel als Instancing). Abstände zu Wegen, Plätzen, Grundstücken, Brücken und Wasser getestet. Offen: Büsche, Hecken, Felsen, Schilf, Blumenwiesen |
| 17.10.2026 | L.7 teilweise | Laternen und Lichtkegel stehen. Offen: Bänke, Stände, Pflaster mit Ringen, Tafel-Dach, Kübel, leuchtende Fenster |
| 17.10.2026 | Galerie | 30 Bilder neu, Stand mit Bäumen und Laternen, siehe `Konzept/Galerie/2026-10-17/`. Draw Calls der Übersicht bei rund 400 (Welt ~240), Ziel < 60 bleibt L.9 |
| 17.10.2026 | L.7 gebaut | `render/plaza.ts`: Pflaster mit Ringmuster, Brunnen mit leuchtendem Wasser, Aufgabentafel mit rotem Dach und sechs Zetteln, drei Stände mit gestreifter Markise, vier Bänke, zwei Kübel. Dazu Laternen am Platz (aus L.6) und leuchtende Fenster mit Tür an jedem Haus. Die Lehrkraft prüft die Optik in L.11 |
| 17.10.2026 | Texturen und Gras | `render/textures.ts`: prozedurale Graustufen-Texturen (Gras mit Körnung, Pflaster mit Fugen), multipliziert mit den Vertex-Farben. Gelände mit glatten Normalen statt facettiert, 140 Segmente. Die Galerie zeigt wieder die Farben aus LOOK §4 |
| 17.10.2026 | L.5 teilweise | `render/house.ts`: Satteldach mit Überstand und Schornstein statt Pyramide, Zaun aus Pfosten und Latte mit 1,6 m Tor (nie als Wand), Gartenweg vom Tor zur Straße (ein Mesh für das ganze Dorf). Offen: Vergabe von innen nach außen, Hangregel mit Böschung, freie Plätze als Bauplatz |
| 17.10.2026 | L.3 Wege | Wege dunkler (`#a8926c` Vertex-Farbe), schmaler (1,6 m), mit eigener Erdtextur (`dirtTexture`) als dünner Streifen auf dem Gelände |
| 17.10.2026 | L.5 Grundstücke | Grundstücke größer (ca. 7,6–8,6 m × 6,2–7,0 m, groß 9,4 × 8,0 m), Haus unverändert. Mehr Abstand zwischen den Nachbarn, Suche bis weiter nach außen, damit die 34 Plätze in jedem Seed passen. Nummerierung von innen nach außen (Wegstrecke zum Platz, Index 0 = kürzester Weg). Test je Vorlage |
| 17.10.2026 | Lichtkegel | Lichtkegel auf 60 % Deckkraft gedämpft. Weicht von LOOK §7 ab (dort volle Helligkeit); die Lehrkraft entscheidet in L.11 |
| 17.10.2026 | Hinweis | Die Layouts haben sich verschoben (größere Grundstücke, neue Nummern). Bestehende Schüler behalten ihre Nummer, aber ihr Haus steht nun an anderer Stelle im Dorf |
| 17.10.2026 | L.5 Hangregel | Der Höhenunterschied unter einem Grundstück (8 Punkte im Kreis 0,45 × Radius) ist auf 1,5 m begrenzt. **Abweichung:** nach 8000 Suchversuchen gilt 2,5 m, damit alle 34 Plätze in jedem Seed passen. Test je Vorlage. Entscheidung für die Lehrkraft in L.11 |
| 17.10.2026 | L.5 freie Plätze | Ohne Bewohner: Rasenfläche mit vier Holzpflöcken und kleinem Schild „frei“, kein Haus und kein Zaun (`freeLot` in `render/village.ts`). Offen: Pflanzen auf freien Plätzen (L.6), Böschung an Hängen |
| 17.10.2026 | L.6 teilweise | Büsche, Felsen (halb eingesunken), Schilf am Ufer (4–6 m vom Wasser) und Blumenbüschel an den Grundstücksrändern als Instancing (`world/scatter.ts`, `render/nature.ts`). Vitest: nichts auf Wegen, Wasser; Schilf am Ufer. Offen: Hecken an Wegen, Blumenwiesen als Flecken, Wahrzeichen, Mengen nach SPEC §10.6 prüfen |
| 17.10.2026 | Galerie | Übersicht `tal` jetzt 486 Draw Calls (Welt 320). L.9 muss das deutlich senken |
| 17.10.2026 | L.9 Leistung | `render/merge.ts`: statische Szenerie (Häuser, Zäune, Dächer, Platz-Möbel, Brücken, Fenster) je Materialart zu wenigen Meshes zusammengefasst. Texturierte Flächen, Wasser, Instancing, Schilder und die Tafel bleiben getrennt. Figuren als ein Mesh je Figur (Winken als Hüpfen statt Armschwung). Galerie `tal` Übersicht: 102 Draw Calls gesamt, Welt ~50 (Ziel < 60). Mit 32 Figuren geschätzt ~120 (Ziel < 150). Am Tablet noch zu prüfen (L.11) |
| 17.10.2026 | Brücken | `render/bridges.ts`: gewölbtes Deck (0,8 m Bogen), schlanke Handläufe mit Pfosten. Die flachen Kästen entfallen |
| 17.10.2026 | Wasser | Fluss mit Himmelsspiegelung über eine günstige Umgebungskarte (Abendhimmel, `skyTexture`), kein zweiter Renderdurchgang. Kein echtes Spiegelbild der Häuser. Die Physik-Engine ist nicht eingebaut (Gewicht für Tablets, kein Bedarf im Spiel) |
| 17.10.2026 | Wasser und Brunnen animiert | Flusswellen: Wellentextur, die über den Fluss wandert (`waterTexture`). Brunnen: Strahl pulsiert, 14 Tropfen steigen, schwingen nach außen und fallen zurück. Animationshook `userData.animate` am Dorf, von der Dorf-Ansicht und der Galerie aufgerufen |
| 17.10.2026 | Schatten | Bäume werfen Schatten (Instancing mit Schattenwurf nur für Bäume, damit die Draw Calls niedrig bleiben). Häuser und Zäune werfen bereits Schatten |
| 17.10.2026 | I.3 erledigt | Lehrer-Bereich je Instanz: Dorf-Vorlage und Seed (`set_layout`), Spielregeln (Stempel, Tageslimit, Versuche, Raster; `set_class_rules`), verkaufte Shop-Artikel (`set_item_sold`). Umschalter 8a/8b war schon vorhanden. `0011_instance_rules.sql` auf dem Projekt angewendet, 4 SQL-Tests grün. Vorschau des Dorfes im Lehrer-Bereich fehlt noch (Galerie als Ersatz) |
| 17.10.2026 | L.4 teilweise | Wahrzeichen sind Wegeziele im Graph (`landmarks`, Test: alle erreichbar) und werden gezeichnet (`render/landmarks.ts`: Aussichtsbank, Steg, Windmühle, Obstwiese, Waldhütte). Brücken gebogen. Offen: **Sackgassen**: je Vorlage 1–2 Wegenden ohne Anschluss (`tal`: (-42,-42), (56,4); `fluss_mitte`: (-58,-18); `bach_norden`: (60,8), (40,-16), (-56,8)). Lösung in den Vorlagen (Weg bis Wahrzeichen oder Nachbarweg verlängern), dann Test „keine Sackgassen“ |
| 17.10.2026 | L.4 Sackgassen, L.8 Namen | Sackgassen geschlossen: je Vorlage Verbindungswege (`connector`-Lanes in `world/maps/*.ts`), Test `tests/world/dead-ends.test.ts` grün. L.8 Namen: eigenes Haus immer, fremde Hausnamen nur unter 28 m (`render/village.ts` `labelUpdate`), Figuren-Schilder unter 28 m (`Crowd.updateLabels` in `render/crowd.ts`), Aufruf in der Animationsschleife (`ui/villageView.ts`). Offen: Figuren am Platz < 40 % prüfen, Name beim Antippen, Zielverteilung |
| 17.10.2026 | L.8 Figuren am Platz | Höchstens 40 % der Figuren stehen gleichzeitig am Brunnen, an der Tafel oder auf dem Platzring (`PLAZA_SHARE_MAX` in `avatars/behaviour.ts`, Prüfung in `render/crowd.ts`). Ist der Platz voll, wählen Figuren stattdessen ein Ziel im Wegenetz. Vitest: volle Platz-Regel schickt niemanden dorthin (249 Tests grün). Offen: Name beim Antippen, Zielverteilung Wahrzeichen/Freunde |
| 17.10.2026 | L.6 Hecken und Blumenwiesen | Hecken als kurze Reihen 1,6 m neben den Wegen (`placeHedges` in `world/scatter.ts`, Instancing in `render/nature.ts`). Blumenflecken: flache helle Wiese mit 9–14 Blüten, nur auf ebenem Boden (`placeMeadows`). Vitest: Hecken nie auf Wegen, Blumen innerhalb des Flecks und abseits von Wegen (255 Tests grün). Offen: Bepflanzung freier Grundstücke, Mengen nach SPEC §10.6 prüfen |
| 17.10.2026 | Licht nachgezogen | Grastextur war grau (`#e4e4e4`) und hat alle Wiesen um rund ein Fünftel abgedunkelt. Jetzt fast weiß, die Farbe kommt aus den Vertex-Farben (LOOK §4). Rauheit 0,88 nach LOOK. Die Sonne bekommt die in LOOK §3 festgelegten Schatten-Bias-Werte und die Belichtung 1,05 fehlte. Galerie und Dorfansicht gleich. Offen: Himmel und ferne Hügel etwas heller, wie im Soll-Bild |
| 17.10.2026 | L.3 Ufersteine | Graue Steine an beiden Ufern, 4,6–5,8 m von der Flussmitte, halb eingesunken (`placeShoreStones` in `world/scatter.ts`, Instancing in `render/nature.ts`). Vitest: Steine nur am Ufer, nie im Wasser (258 Tests grün). Offen: Gelände unter den Wegen glätten (braucht Wegdaten im Terrain), Uferschnitt an steilen Hängen |
| 17.10.2026 | Baumfarben | Laubbäume mit Ocker, Orange, Gelbgrün und Blaugrün neben den Grüntönen; Nadelbäume bleiben kühl dunkel (`render/nature.ts`, Paletten `CROWNS` und `PINES`). Galerie geprüft. Offen: die Wiesen selbst wirken noch sehr grün |
| 17.10.2026 | L.3 Wegglättung | Das Gelände unter den Wegen wird geglättet: die Höhe entlang jedes Weges wird über etwa 8 m gemittelt, das Gelände bis 2,6 m daneben zieht dorthin (`setPaths`/`pathBlend` in `world/terrain.ts`, aufgerufen in `world/layout.ts`). Ufer nahe am Fluss ausgenommen. Vitest `tests/world/paths.test.ts`: Gelände 0,8 m neben dem Weg max. 0,6 m Höhenunterschied (Toleranz nach Messung angehoben, siehe Hinweis). 261 Tests grün |
| 17.10.2026 | Kirschblüten | Runde Bäume in Obstgarten-Flecken und einzelne Bäume blühen weiß bis rosa (`BLOSSOMS` in `render/nature.ts`). Nadelbäume bleiben grün. Offen: Blüten kräftiger, mehr Flecken |
| 17.10.2026 | Brücken auf dem Boden | Jede Brücke hat eine Höhe je Ufer (`ya`, `yb` in `world/layout.ts`); der Bogen liegt darüber (`bridgeHeight`). Deck, Geländer und Figuren nutzen dieselbe Funktion, damit nichts schwebt. Figuren steigen auf dem Bogen mit. Vitest und Galerie geprüft |
| 17.10.2026 | L.5 Böschungen | Die Einebnung eines Grundstücks wird breiter, wenn der Hang stärker ist: 4 m auf ebenem Boden, bis 14 m bei starkem Gefälle (`embankmentWidth` in `world/layout.ts`, `Flat.ramp` in `world/terrain.ts`). Steilste Stelle im Ring um die Grundstücke: vorher bis 1,8 m pro m, jetzt 0,86–1,10 m pro m. Vitest `tests/world/embankment.test.ts` (Grenze 1,2). Offen: einzelne keilförmige Grundstücke am Hang in der Draufsicht, freie Plätze als Bauplatz, Vergabe von innen nach außen prüfen |
| 18.10.2026 | L.6 freie Grundstücke | Freie Grundstücke bekommen drei Büsche und sechs Blüten, immer gleich für denselben Platz (`plantFreeLot` in `render/village.ts`). Galerie geprüft. Offen: Bauplatz-Funktion |
| 20.10.2026 | Grundstück mit festen Slots | Asset-Vertrag Fassung 2 freigegeben und umgesetzt: `world/plotPlan.ts` (11×11, Haus 6×4, Garage 3×4, Auto 3×5, vier Deko 3×3, Weg, Einfahrt), Platzhalter-Modelle nach Vertrag in `render/plotAssets.ts` (3 Häuser, 2 Garagen, 2 Autos, 14 Deko-Szenen), Test misst jedes Modell gegen die Höchstmaße. Dorf zeichnet Weg, Einfahrt, Zaun mit Tor und Einfahrtslücke; leere Sockel bleiben Wiese. Baumodus mit Slots (antippen, passendes Teil wählen, Setzen/Drehen/Wegräumen), eigenes Grundstück ändert sich sofort. Shop nach Kategorien, Haus/Garage/Auto nur einmal kaufbar. Lehrer-Bereich: Raster nicht mehr einstellbar. Migration `0013_plot_slots.sql` (ersetzt die nie eingespielte 0013 mit 10×10), SQL-Tests `tests/sql/plot-slots.test.ts`. Karte `WORLD_SCALE` 1,65. Brücken-Planken mit fester Ausrichtung (waren verdreht). Migration 0013 eingespielt, live seit 20.10.2026 |
| 20.10.2026 | Brücke und Wasser | Brücken lagen teils im Fluss: Die Enden lagen auf der tiefen Uferkante unter dem Wasserspiegel. Jetzt reicht die Brücke über das niedrige Ufer, die Enden liegen mindestens 0,5 m über dem Wasser (`BRIDGE_MIN_END`), an beiden Enden ein kleiner eingeebneter Absatz, Bogen 1,0 m. Deck aus Planken mit Dicke, Längsbalken und Pfosten. Wasser: hell am Ufer, tiefblau in der Mitte, zwei Blautöne im Wechsel, Wellen als bewegte Normal-Map, spiegelt den Kenney-Himmel (`setSky`). Galerie geprüft |
| 20.10.2026 | Asset-Vertrag (Entwurf) | Feste Slots für Haus, Garage, Einfahrt, zwei Deko-Sockel und Auto-Sockel vorgeschlagen: `docs/ASSET_VERTRAG.md`. Freigegeben (siehe Zeile „Grundstück mit festen Slots“) |
| 20.10.2026 | Optik nach Prototyp | Rückmeldung der Lehrkraft: schwebende Baumkronen, Shop-Fehler, größere Grundstücke, Kenney-Himmel. Bäume: Stamm reicht in die Krone, zweistufige Kronen wie im Prototyp, Stand auf dem tiefsten Punkt unter dem Stamm. Gelände: Low-Poly mit sichtbaren Facetten und Vertex-Farben wie im Prototyp, keine Gras-Textur mehr (die braunen Flecken waren Textur und breites Ufer); Ufer nur am Wasser; Blumenwiesen ins Gelände gemalt statt Scheiben; Einebnungen füllen das Flussbett nicht mehr (Wasser war stellenweise verdeckt); Marktplatz gewinnt gegen Böschungen. Hecken als Reihen runder Büsche statt Quader. Grasbüschel und Wildblumen auf freien Flächen (`placeTufts`). Wald bis zum Kartenrand. Häuser im Prototyp-Stil: Sockel, Fachwerk-Ecken, Band, Fensterrahmen, Seitenfenster, Vordach, große Grundstücke oft zweistöckig, Briefkasten am Tor. Freie Grundstücke als Bauplatz mit Pflöcken, Schnur, Schild und Brettern. Galerie-Blick „horizon“ neu (zeigt Himmel und Nebel). Galerie geprüft |
| 20.10.2026 | Gras aus Kenney-Foliage | Grasbüschel jetzt aus Kenneys „Foliage Sprites“ (CC0): 8 Gras-Silhouetten als Atlas `web/public/foliage/grass-atlas.png`, je Büschel zwei gekreuzte Karten, eingefärbt mit den Wiesenfarben aus LOOK §4, unten dunkler, oben heller, Normalen nach oben (wie die Wiese beleuchtet), leichtes Wiegen im Vertex-Shader, keine Schatten. Alles ein InstancedMesh (`render/grass.ts`), Draw Calls unverändert. `placeTufts` setzt bis zu 5500 Büschel in Grüppchen von 3–8 statt 1100 einzeln; Wildblumen auf jedem 19. Büschel. Galerie wartet auf den Atlas. 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft |
| 20.10.2026 | Weiche Wegränder | Feldwege, Zuwege zu den Gartentoren und Einfahrten sind ein gemeinsames Mesh (`render/lanes.ts`, ein Draw Call statt eines je Weg): Band 2,3 m (Zuwege Kern + 0,45 m), das an beiden Seiten in die Wiese ausläuft; Breite des Übergangs wandert entlang des Wegs und franst mit etwas Rauschen aus (nur Textur-Alpha, keine Zacken in der Form, LOOK §11). Das alte Band hatte keine Textur-Koordinaten, die Erd-Textur war deshalb nie sichtbar – jetzt schon; Farbe `#d2bb8f` × Textur ≈ LOOK §5. Gelände unter dem Rand „zertreten“ (`#8c9a58`). Grasbüschel am Wegrand (`placeLaneEdgeTufts`, ca. 3 je Meter, heller und trockener, im selben Gras-Mesh). `gardenPathGeometry` entfernt. 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft |
| 20.10.2026 | Kenney-Modelle für Natur und Brunnen | Bäume, Büsche, Hecken, Felsen, Ufersteine und Marktplatz-Brunnen aus Kenneys Forest Kit, Survival Kit und Fantasy Town Kit (CC0), als GLB in `web/public/assets/kenney/` (456 KB, ohne Blender-Pipeline: Modelle unverändert, eine Palette je Kit). `render/kenney.ts`: Laden, ein InstancedMesh je Modell, Blattfarben pro Baum umfärbbar (grüne Palettenbereiche werden beim Laden als Blätter erkannt), damit Ocker/Orange/Blüten aus LOOK §8 bleiben. Die alten Platzhalter bleiben sichtbar, bis die Modelle geladen sind (oder falls Laden fehlschlägt). Nadelbäume: 5 Modelle + Herbst-Nadelbaum; Laubbäume: runder Baum, verbreitert; Büsche und Hecken: runde Krone, gestaucht und eingesenkt; Ufersteine jetzt in Gruppen von 2–5 bis an die Wasserlinie, nur im Tal, 220 statt 120 (`placeShoreStones`, Test prüft Boden über `WATER_LEVEL`). Brunnen: `fountain-round-detail` 2,3-fach, Wasserstrahl aus der Mittelschale, Tropfen ins äußere Becken. Höchstens 100 Draw Calls. 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft. Offen: Blender/Meshopt-Pipeline (SPEC §15) für diese Modelle später nachziehen |
| 21.10.2026 | Laternen, Marktstände, Blumen aus Kenney | Laternen: Kenney `lantern` (Fantasy Town) auf 2,4 m, dazu leuchtendes Glas zwischen Platte und Kappe (MeshBasic `#ffc56b`), Lichtkegel unverändert. Marktstände: `stall-green`, 2,3-fach, lange Theke zum Platz, Dach in der Standfarbe umgefärbt (Blau/Türkis/Orange), Ware aus dem Food Kit (Äpfel, Brotlaibe, Kürbisse). Blumen auf Wiesen, an Grundstücksrändern, in Grasbüscheln und in den Kübeln am Platz: Nature Kit `flower_*` (9 Modelle), Farben auf LOOK-Blumenfarben gesetzt (`render/kenney.ts` backt einfarbige Materialien jetzt in Vertex-Farben). Alte Teile bleiben Platzhalter bis zum Laden. Höchstens 120 Draw Calls. 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft |
| 21.10.2026 | Wege und Büsche überarbeitet | Rückmeldung der Lehrkraft: Wege zu eintönig, Farbe gefällt nicht, zu breit; Büsche zu viele. Feldwege schmaler (2,0 m mit Übergang statt 2,3 m), ohne Erd-Textur: Sandfarben des Kenney Nature Kits, langsamer Farbwechsel entlang des Wegs, zwei leichte Fahrspuren, hellere Mitte (alles im Shader, `render/lanes.ts`); flache Steine auf dem Weg (`placeLaneStones`, Nature Kit). Zuwege zu den Gartentoren als Trittsteine (`placeStepStones`, Nature `path_stone`) statt Erdband; Einfahrten bleiben Erdband. Büsche: 34 Gruppen aus je drei Kronen statt 130 Einzelbüsche, mit Abstand zu Zuwegen (`gardenPathDistance`); Hecken 18 statt 70 und heller. 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft, höchstens 124 Draw Calls |
| 21.10.2026 | Grundstück: Pflaster und Tor; Wege enden am Platz | Wunsch der Lehrkraft: keine Einfahrt zum Weg mehr, Einfahrt im Zaun mit Tor geschlossen (Kenney `fence-gate`, 3 m, alle Tore eines Dorfs ein InstancedMesh, `driveGates` in `render/village.ts`); Weg zur Haustür und Autofläche gepflastert (`paving`: flache Steine in drei warmen Grautönen auf dunklem Fugenbett, wird mit dem Grundstück zusammengefasst). Gartentor bleibt offen (Figuren gehen hindurch). Feldwege laufen am Marktplatz-Rand aus statt über das Pflaster (Alpha im Shader nach Abstand zur Platzmitte, `render/lanes.ts`). `ASSET_VERTRAG.md` ergänzt (Änderung 21.10.2026). 315 Tests grün, Build ok, Galerie (36 Bilder) geprüft, höchstens 125 Draw Calls |
| 20.10.2026 | Größere Grundstücke | Raster 10 × 10 statt 7 × 6, Haus belegt die hinteren 3 Reihen: 69 freie Zellen statt 27 (Migration 0013, `world/constants.ts`). Karte mit `WORLD_SCALE` 1,5 gestreckt, damit 34 Grundstücke passen; Wegenden am Platz behalten ihren Abstand. Vorlage „tal“: Verbindungsweg Südost → Obstwiese (vorher Sackgasse, nur durch ein Gartentor verdeckt). Baumodus liest das Raster jetzt aus der eigenen Klasse (`classes`) statt aus `settings` – vorher passte das Raster im Bildschirm nicht zur Prüfung auf dem Server. **Überholt** durch „Grundstück mit festen Slots“ |
| 20.10.2026 | Shop repariert | „Abbrechen“ lag genau über „Ja, kaufen“ (beide Knöpfe in derselben Rasterzelle), deshalb kam nie ein Kauf zustande (im Projekt 0 Käufe). Bestätigung jetzt als eigene Zeile mit zwei Knöpfen nebeneinander, Knopf gegen Doppelkauf gesperrt, Meldung „gekauft“ bleibt nach dem Neuzeichnen stehen. Mit Playwright-Attrappe geprüft (Tablet und Handy-Breite) |
| 20.10.2026 | Himmel | Kenney „Skyboxes“ (CC0) als Panorama, Nachthimmel passt zur Abendstimmung (LOOK §3). Licht, Nebel und Schatten gemeinsam in `render/scene.ts` für App und Galerie; der Schattenbereich folgt der Kamera, damit die Schatten auf der größeren Karte scharf bleiben. Quelle in `blender/sources/LICENSES.md` |
| 18.10.2026 | L.5 Bauplatz wählen | Neue Schüler starten ohne Grundstück (`supabase/functions/admin-accounts`). Sie tippen auf eine freie Wiese, bestätigen, und die Wahl gilt dauerhaft: RPC `claim_plot` (Migration 0012, nur solange kein Platz gewählt ist, Platz 0 bis 33, Platz nicht vergeben). Dorf: Hinweis oben, Tippen auf freie Wiese (`freePlotAt` in `ui/villageView.ts`). Tests: `tests/sql/claim-plot.test.ts` (6 grün), gesamt 271 grün. Offen: Migration 0012 und Edge Function im Projekt einspielen (nach OK der Lehrkraft), mit echtem Schülerkonto prüfen. Bestehende Schüler behalten ihren Platz |
| 18.10.2026 | L.5 Bauplatz eingespielt | Migration 0012 (`claim_plot`) im Projekt angewendet; Edge Function `admin-accounts` als Version 2 deployt (Inhalt geprüft: neue Schüler ohne Platz). Offen: mit einem echten Schülerkonto prüfen. `move_class` vergibt weiter automatisch den nächsten Platz |
| 18.10.2026 | Umzug auf Cloudflare Pages | GitHub Pages ist für das private Repo nicht verfügbar. Der Basispfad ist jetzt `/` (`vite.config.ts`, E2E, Galerie), `deploy.yml` deployt mit `wrangler-action` auf das Projekt `lerndorf`. SPEC, SCOPE und Anleitung angepasst. Lokal grün (271 Tests, E2E 2). Offen: Cloudflare-Konto und Projekt anlegen, Secrets `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` eintragen, dann pushen |
| 18.10.2026 | L.8 Name beim Antippen | Tippt man eine Figur an, zeigt sich ihr Name drei Sekunden lang, auch in der Ferne (`Crowd.wave` setzt `nameTimer`, `updateLabels` in `render/crowd.ts`). Zehn Prozent der Ziele sind jetzt Wahrzeichen statt Häuser (`nextAction` in `avatars/behaviour.ts`, Test). Offen: Tippen auf fremde Häuser zeigt den Namen noch nicht. Build und Tests grün (265) |
| 18.10.2026 | L.10 Befundliste | Galerie neu erzeugt. Befundliste im Review um den Stand nach Stufe 1b ergänzt: 7 erledigt, 6 teilweise, 1 offen (Befund 11, freie Plätze). Abnahme am Tablet und durch die Lehrkraft (L.11) steht aus |
| 17.10.2026 | Wege abwechslungsreicher | Erde-Textur mit warmen Flecken, Sandstellen und Grasresten am Rand; Wegfarbe mit Helligkeitsrauschen und leicht zertretenem Gras am Wegrand (`render/textures.ts`, `render/village.ts`). Galerie geprüft |
| 21.10.2026 | Q (D11) | **Entscheidung der Lehrkraft:** Versuche bei Daily Quests unbegrenzt, Münzen nur bei richtiger Antwort in den ersten 3 Versuchen. Die Zahl steht in `public.quest_paid_attempts()`. Wird sie geändert, muss auch die Zeile „Münzen gibt es bei den ersten 3 Versuchen.“ in `web/src/ui/dailyQuestsView.ts` geändert werden |
| 21.10.2026 | Q (D6) | **Entscheidung der Lehrkraft:** Ferienwochen bekommen eine Ferien-Datei `{"week": "...", "holiday": true}`: keine Quests, keine Warnung im Lehrer-Bereich |
| 21.10.2026 | Q (D1–D11) | Alle Entscheidungen zu den Daily Quests stehen in SPEC §9 (Tabelle „Entscheidungen“) |
| 21.10.2026 | Q Lehrkonto | `my_daily_quests` lehnt Lehrkonten ab. Öffnet eine Lehrkraft im Dorf „Aufgaben“, steht dort „Nur Schülerkonten können Quests lösen.“ Quests und Lösungen sieht die Lehrkraft in der Vorschau im Lehrer-Bereich |
| 21.10.2026 | Q Lösungen | Die Lösungstabelle ist auch für die Lehrkraft nicht direkt lesbar, nur über die Vorschau-Funktion `teacher_quest_preview` |
| 21.10.2026 | Q Hinweistext | Der grüne Hinweis im Lehrer-Bereich lautet „Daily Quests vorhanden bis So 15.11.“ (ohne doppelten Punkt am Ende) |
| 21.10.2026 | Q Re-Import | Ein fehlerhafter erneuter Import einer schon eingespielten Woche (auch einer Ferienwoche) lässt die alte Fassung online; die Woche zählt weiter als abgedeckt. Der Fehler erscheint rot im Lehrer-Bereich |
| 21.10.2026 | Q reward_left | `my_daily_quests` und `submit_quest_answer` liefern zusätzlich `reward_left`: so viele Münzen bringt eine richtige Antwort jetzt noch (0 nach 3 Versuchen oder wenn gelöst) (D11) |
| 21.10.2026 | Q Screenshots | Für die Playwright-Bilder gibt es eine eigene Testseite `web/dev/quests.html` mit nachgebauten Antworten statt echtem Login, weil es keine Supabase-Attrappe gab. Sie läuft nur über den Entwicklungsserver und ist nicht im fertigen Build (`e2e/daily-quests.spec.ts`, Projekt `harness`) |
| 21.10.2026 | Q Lehrer-Hinweise | Beim Bildercheck gefunden und behoben: Die Hinweise im Abschnitt „Daily Quests“ lagen übereinander oben am Rand, weil sie den Stil der Dorf-Meldung geerbt hatten (`teacher/teacher.css`) |
| 21.10.2026 | Q Reihenfolge | Noch nicht hochgeladen. Reihenfolge: erst Migrationen 0015–0017 auf `main`, grünen Lauf „migrate“ abwarten, dann die erste Datei in `content/daily-quests/` und grünen Lauf „import-content“ prüfen (Anleitung „Daily Quests einspielen“). Abnahme Q.10 steht aus |
| 23.10.2026 | E Erststart-Tutorial | Zweig `feature/first-login-tutorial`, **noch nicht auf `main`, Migration 0019 noch nirgends eingespielt**. Server: `tutorial_state/start/continue/question/answer/buy_house/place_house/finish`, Lösungen nur in `tutorial_solutions`, 50 Münzen einmalig (Unique-Index), `claim_plot` für Schüler gesperrt, `house_fachwerk` kein Starter mehr und 50 Münzen. Client: Ruine (`render/ruin.ts`) bis das Haus steht, Comic-Sprechblasen (Comic Neue), Kamerapfade (`render/introCamera.ts`), Ablauf `ui/tutorial/flow.ts`. Playwright-Durchlauf mit Bild je Schritt: `npx playwright test e2e/tutorial.spec.ts --project=harness` (Bilder in `web/test-results/tutorial/`). Bekannter Fehler außerhalb des Pakets: `tests/render/character.test.ts` (`rootTravel`) lässt `npm run build` am `tsc` scheitern (`vite build` läuft) |

Hinweis XP-Abschluss 25.10.2026: Supabase-Trockenlauf sieht ausschließlich 0020; noch nicht angewendet. Galerie: Welt-Draw-Calls in allen 36 Ansichten identisch zum Stand 23.10.; Nahvergleich mit/ohne XP-Schilder jeweils 83 gesamt / 63 Welt. Das ursprüngliche Gesamtbudget unter 150 wird bereits im bisherigen Stand teils überschritten; keine bestätigte Bildrate auf dem Schul-Tablet. Eine unabhängige Prüfung fand ein Problem mit ungesehenen Buchungen; es ist durch Regressionstests für Stempel und mehr als 50 Buchungen abgesichert und behoben. Weitere Arbeiten ab der Rückmeldung des Auftraggebers sequenziell ohne Teilagenten.

### Standard-Junge – Austausch am 26.10.2026

| Status | Umsetzung und Nachweis |
| --- | --- |
| [x] | Gelieferte Datei `../Assets/Characters/cartoon+boy+3d+model.glb` ersetzt `web/public/assets/characters/boy.glb`. Mädchen unverändert. |
| [x] | Laufen und Catwalk übernommen; vorhandene Jubel-Aktion verwendet „froehliches springen hopsen“. Auswahlbild neu gerendert, Modell und Bild mit gemeinsamer Cache-Version. Profilporträt aus dem neuen Modell geprüft. |
| [x] | Lokale Modellprüfung: 1,64 m Figurenhöhe, Füße auf Bodenhöhe, drei Animationen ohne Browserfehler. Wiederholbar über `web/dev/character.html` und `web/scripts/character-preview.mjs` (laufender Vite-Server auf Port 5175). |
| [x] | 848 Tests, TypeScript/Produktionsbuild und ESLint erfolgreich. Alle 36 Dorfansichten in `web/test-results/layout-standard-boy/` erzeugt und angesehen; keine auffälligen Darstellungsfehler. |

Der Austausch nimmt die folgende Editor-Umsetzung nicht vorweg. Kein Deployment und keine Datenbankänderung.

### Avatar-Kleiderschrank – lokale Umsetzung 26.10.2026

Grundlage sind die gelesenen Implementationen unter `Prototyp/StandardBoyShop/` und `Prototyp/StandardGirlShop/` sowie der neue Nutzerauftrag: Hausmenü → eigene Zimmer-Szene, offener verschwommener Schrank im Hintergrund, drehbare Figur vorn und direkte Auswahl besessener Gegenstände. Editor, Runtime, Asset-Paket und Migration sind lokal umgesetzt. Migration 0023 noch nicht live angewendet; kein Deployment.

- [Gestaltung und geprüfter Ist-Zustand](superpowers/specs/2026-10-26-avatar-wardrobe-design.md)
- [Detaillierter Umsetzungsplan](superpowers/plans/2026-10-26-avatar-wardrobe.md)

| AP | Status | Ergebnis |
| --- | --- | --- |
| A1 | [x] | Modulare Bases und finale Girl-r10-Kandidaten mit bisherigen Animationen zusammenführen und prüfen |
| A2 | [x] | Gemeinsame Runtime für Farben, Zubehör, geriggte Kleidung und Konflikte |
| A3 | [x] | Besitzprüfung, Paletten, sichere Look-Persistenz und einmalige Avatar-Käufe |
| A4 | [x] | Eigene Zimmer-Bühne mit Blur-Hintergrund und drehbarer Figur |
| A5 | [x] | Tablet-Oberfläche mit direkter Anprobe und „Fertig“ |
| A6 | [x] | Hausmenü, Shop und Inventar verbinden |
| A7 | [x] | Gespeicherte Looks in Dorf, Profil und Lehrer-Dorfansicht |
| A8 | [ ] | End-to-End-, WebGL-, Galerie- und Leistungsprüfung; Dokumentation |

Ausführung auf Wunsch weiterhin sequenziell durch einen Agenten. Technische Schranke vor der sichtbaren Umstellung: Beide modularen Shop-Bases sind animationslos; bisherige Clips müssen erhalten bleiben. Die Boy-Integrationsnotizen beziehen sich teilweise auf den inzwischen ersetzten Jungen. Die Animationen sind übernommen; optimierte Texturen, Detailwechsel und eine Rock-Passformkorrektur sind umgesetzt. A8-Softwareprüfungen und Bildkontrolle sind lokal erfolgt (871 Tests, Build und ESLint erfolgreich; neun Kleiderschrank-Browserprüfungen bestanden); Hardware-Abnahme auf dem Schul-Tablet und spätere Veröffentlichung bleiben offen. Details: [Umsetzungsstand](AVATAR_KLEIDERSCHRANK.md).
