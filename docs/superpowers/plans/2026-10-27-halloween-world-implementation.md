# Halloween-Welt der aktuellen Karte · Umsetzung

Auftrag 27.10.2026: vollständige umschaltbare Halloween-Variante auf neuem Branch `codex/halloween-world`. Vorhandene Prototypen bleiben unverändert als Referenz. Keine Commits/Pushes oder Live-Migrationen in diesem Auftrag ohne weitere Anweisung.

## Festgelegter Umfang

- Die vorhandene Karte, Bauflächen, Häuser, Besitzstände und Aufgaben bleiben erhalten. Reversible zusätzliche Szene und Umgebungsprofil statt zweiter Karten-/Seed-Generierung.
- Lehrerbereich „Dorf & Regeln“ erhält je Klasse Normal/Halloween. Schalter wirkt sofort, unabhängig vom Season-Datum; Season-XP/Belohnungen werden nicht geändert. Persistenz/Rollenprüfung über neue Migration/RPCs; sichtbare Clients gleichen innerhalb 30 Sekunden ab.
- Blutmond/Halo, dunkles rötliches Licht, Nachthimmel/Nebel, Lampions, Kürbisse, Gräber, tote Bäume, drei Stände plus gelieferter Halloween-Shop mit einer großen Katze und Candy Cauldron. Blutbrunnen mit bewegten Strahlen, zentralen Pulsen, großem Kürbis und drei Kerzen. Maximal fünf langsame Gruselfiguren.
- Zusätzliche Kürbisse/Lampen nur auf öffentlichem Rand außerhalb realer Bauflächen und frei von Eingängen, Wegen, Fluss. Eigener vorhandener PRNG.
- Gelieferter Shop ist auch im Normalmodus als Eventteaser erreichbar. Gemeinsamer Welcome mit Quiz-Ankündigung/150 XP und echtem LearnPass-Öffner, ohne Sammelkartenwerbung. Quiz-/Kartenvergabe und What’s-in-it-Detailansicht gehören zu separaten Aufträgen, werden hier nicht als fertig behauptet.
- Reduzierte Bewegung stoppt dekorative Animationen. Keine zweite Renderloop im Spiel. Nach Normal zurück: ursprüngliche Himmel-/Licht-/Materialwerte, keine Deko- oder Ressourcenlecks.

## Ausführung und Nachweise

- [ ] Neue Migration/RPC/API für Klassenoptik und fokussierte SQL-/API-Tests.
- [ ] Lehrer-Schalter mit gespeicherten Werten, Klassenwechsel-/Pending-/Fehlerbehandlung.
- [ ] Reversible SceneRig-/Plaza-/Village-Hooks und Bake-Ausschluss nur für austauschbare Platzteile.
- [ ] Halloween-Ebene, Brunnen, Figuren und sichere Grundstücksrand-Deko mit Tests.
- [ ] Lifecycle-/Pollingcontroller und Einbindung in Schüler- sowie Lehreransicht.
- [ ] Eigenständiger Teaser-Shop und zugänglicher Season-Einstieg mit LearnPass-Verbindung.
- [ ] Lokale Abnahmeseite/E2E für Originalkarte, beide Zustände, Wiederholungswechsel, reduzierte Bewegung und Ladefehler.
- [ ] Gesamte Tests, Typecheck/Build/Migrationsprüfung, Galerie und Rendernachweise. Echte Tablet-FPS bleiben gesonderte Abnahme; Desktopmessungen korrekt kennzeichnen.
- [ ] Aufgabenspezifische und abschließende Codeprüfung; Anleitung für die neue Migration und Lehrerbedienung.

## Arbeitsaufteilung

Backend/Lehrer: `world_theme_backend`. Rendering/Plaza/Borders: `halloween_render`. Hauptagent: Controller, App/Lehreransicht, unabhängiger Teaser, Tests/Harness, Gesamtprüfung und Übergabe. Gemeinsame Schnittstellen vor Beginn festgelegt; keine konkurrierenden Dateiänderungen.
