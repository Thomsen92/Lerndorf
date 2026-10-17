# Lerndorf – Umsetzungsplan

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
| [ ] I.3 | CC | **Lehrer-Bereich**: Instanz-Umschalter oben, alle Ansichten je Instanz, Spielregeln und Shop-Sperren je Instanz bearbeiten, Vorlage + Seed je Instanz | `web/src/teacher/*` | Wechsel 8a/8b zeigt nur die jeweilige Instanz |
| [x] L.1 | CC | **Layout-Galerie** zuerst bauen: Dev-Seite + `npm run galerie` (Vorlage × Seed × 5 Blickwinkel, Draw Calls im Bild) | `web/dev/galerie.html`, `web/scripts/galerie.ts`, Bilder in `Konzept/Galerie/<datum>/` | Galerie zeigt den heutigen Stand (Vorher-Bilder) |
| [x] L.2 | CC | **Kartenvorlagen**: Fluss, Wege, Platz, Wahrzeichen und Hügel als Vorlage-Datei; 3 deutlich verschiedene Vorlagen; Vorlage per `classes.map_id` (aus I.1) und `set_layout`-RPC (Vorlage + Seed) | `world/maps/*.ts` | 8a/8b in der Galerie klar unterscheidbar |
| [ ] L.3 | CC | **Gelände, Wege, Fluss**: höhere Auflösung im Talboden, Wege und Platz als Vertex-Farbe/Splat ins Gelände, Gelände unter Wegen glätten, Flussbreite variabel, Ufer sauber unter Wasser, Ufersteine | `world/terrain.ts`, `render/terrain.ts` | keine Zacken/Durchstechen in Galerie-Nahaufnahmen (Befunde 4, 5) |
| [ ] L.4 | CC | **Wegenetz**: Hierarchie (2,2 / 1,5 / 1,0 m), keine Sackgassen, Wahrzeichen an Wegenden als Ziele im Wegegraph, Brücken mit Geländer und Rampen | `world/layout.ts`, `render/bridges.ts` | Vitest „keine Sackgassen“, „Wahrzeichen erreichbar“ grün (Befunde 6, 9) |
| [ ] L.5 | CC | **Grundstücke**: Vergabe von innen nach außen (`plot_index` nach Wegstrecke), Hangregel, kurze Böschungen, Gartenweg ins Wegenetz, Zaun mit Pfosten und Tor, Haus mit Tür/Fenstern/Satteldach im Grundstück, **freie Plätze als Bauplatz** | `world/plots.ts`, `render/plots.ts`; Edge Function vergibt weiter den nächsten freien Index | Vitest für Reihenfolge und Hangregel; Galerie-Nahaufnahme ok (Befunde 7, 8, 11) |
| [ ] L.6 | CC | **Vegetation und Details**: Poisson-Disk-Verteilung, Waldgürtel, Baumgruppen, Büsche, Hecken, Blumenwiesen, Felsen, Schilf; Mengen nach SPEC §10.6 | `world/scatter.ts`, `render/nature.ts` (InstancedMesh) | Vitest „nichts auf Wegen/Plätzen/Grundstücken/Wasser“, Mengen im Rahmen (Befund 1) |
| [ ] L.7 | CC | **Marktplatz und Licht**: Pflaster mit Ringmuster, Brunnen, Aufgabentafel zum Hauptzugang, 3 Stände, 4 Bänke, Kübel, Laternen an Wegen, leuchtende Fenster, Lichtflecken, Abendstimmung wie Prototyp | `render/plaza.ts`, `render/lights.ts` | Galerie-Bild Marktplatz vergleichbar mit Prototyp (Befunde 2, 3) |
| [ ] L.8 | CC | **Namen und Figuren**: keine Schilder an fremden Häusern, Figuren-Schilder ab ~30 m ausblenden, Name beim Antippen; Ziele der Figuren gleichmäßiger verteilen (Wahrzeichen, Häuser von Freunden), max. 3 an der Tafel | `render/crowd.ts`, `avatars/behaviour.ts` | Galerie-Übersicht ruhig lesbar; < 40 % der Figuren gleichzeitig am Platz (Befunde 12, 14) |
| [ ] L.9 | CC | **Leistung**: statische Szenerie je Material zusammenfassen, Instancing für Wiederholtes; Draw Calls und Dreiecke in der Galerie protokollieren | `render/merge.ts` | Welt < 60 Draw Calls, gesamt mit 32 Figuren < 150 (Befund 13) |
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
5. **Im Alltag:** Stempel buchen (ca. 5 Min./Woche), Aufgabendatei der Woche hochladen.

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
