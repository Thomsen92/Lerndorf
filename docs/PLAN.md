# Lerndorf – Umsetzungsplan

Stand: 17.10.2026 · gehört zu [SCOPE.md](SCOPE.md) und [SPEC.md](SPEC.md)

So liest man den Plan: Jede Stufe besteht aus nummerierten Arbeitspaketen (AP). Ein AP ist eine Arbeitssitzung oder kleiner. Spalte **Wer**: **CC** = Claude Code, **LK** = Lehrkraft. Ein AP gilt als erledigt, wenn sein **Fertig-Kriterium** geprüft ist. Am Ende jeder Stufe steht eine Abnahme durch die Lehrkraft auf einem Schul-Tablet; erst danach beginnt die nächste Stufe.

Fortschritt wird hier abgehakt (`[x]`) und kurz notiert (Datum, Abweichungen).

---

## Übersicht

| Stufe | Inhalt | Sitzungen CC | Zeit LK | Abhängig von |
| --- | --- | --- | --- | --- |
| 1 | Fundament: Setup, Datenbank, Login, Lehrer-Bereich, Deploy | 3–4 | ca. 60 Min. einmalig | – |
| 2 | Dorf + Avatare im Comic-Look | 4–5 | 2 × 15 Min. Abnahme | 1 |
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

## Stufe 2 – Dorf und Avatare im Comic-Look

Ziel: Dorf und Figuren sehen aus wie aus einem Guss, Schüler gestalten ihren Avatar mit Starter-Teilen.

| AP | Wer | Aufgabe | Ergebnis / Dateien | Fertig, wenn |
| --- | --- | --- | --- | --- |
| [ ] 2.1 | CC | Passende CC0-Pakete auswählen (Häuser/Dorf, Natur, Marktplatz, modulare Figur mit Animationen idle/walk/sit/wave); Lizenz jeweils prüfen; Liste mit Download-Links | `blender/sources/LICENSES.md` | jede Quelle mit Link + Lizenz CC0 belegt |
| [ ] 2.2 | LK / CC | Pakete herunterladen (CC selbst, sonst LK legt ZIPs in `blender/sources/`) | Quelldateien lokal, nicht im Repo | Dateien vorhanden |
| [ ] 2.3 | CC | Blender-Pipeline: `build_assets.py` (Import, Umfärben nach `palette.json`, AO als Vertex-Farbe, Decimate, GLB-Export) + `gltf-transform` (meshopt, KTX2) + Budget-Prüfung | `blender/scripts/*`, `blender/palette.json`, `npm run assets` | ein Befehl erzeugt alle GLBs; Bericht mit Dreieckszahlen |
| [ ] 2.4 | CC | **Stil-Test:** 1 Haus-Set (Wände, 3 Dächer, Fenster, Tür), 5 Deko-Teile, 1 animierte Figur ins Dorf einbauen; Vorher/Nachher-Screenshots | Test-Deploy, Screenshots in `Konzept/` | – |
| [ ] 2.5 | LK | **Abnahme Stil-Test** (Look, Farben, Figur) – Rückmeldung einarbeiten | Notiz hier | Look freigegeben |
| [ ] 2.6 | CC | Alle Dorf-Assets: Häuser in Varianten (1–2 Stockwerke), Marktplatz (Brunnen, Tafel, Stände, Bänke), Laternen, Brücken, Zäune, Bäume, Felsen, Schilf; Platzhalter ersetzen; Instancing für Bäume/Zäune/Laternen | `web/public/assets/*`, `render/assets.ts` | Draw Calls < 150, Download < 8 MB |
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
