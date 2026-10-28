# Halloween-Collection und Weltstimmung – Abschlussbericht

**28.10.2026.** Branch `codex/halloween-collection` (von `main` abgezweigt, **nicht gepusht**).
Grundlage: [DeepSeek-Umsetzungsplan](../../../Prototyp/marktplatz/DEEPSEEK_UMSETZUNGSPLAN.md), Pakete 1, 2, 3, 6, 7, 8, 9;
verbindliche Ergänzungen `DEEPSEEK_SPOOKY_STARTER.md` und `CLAUDE_HANDOFF.md` (r13/r14).

## Ergebnis

| Paket | Status | Inhalt |
| --- | --- | --- |
| 1 Runtime-Katalog | fertig | `web/scripts/import-halloween-prototype.ts`, `web/src/collection/{types,catalog}.ts`, 50 Karten (18 normal, 17 rare, 14 epic, 1 legendary), 242 Dateien / 81,3 MB, `contentVersion` = sha256 |
| 2 Weltzustand | fertig | Migration `0034`: `class_world_theme`, `season_welcome_seen`, requested/effective Theme, Season-Kopplung, `ack_season_welcome` |
| 3 Lehrer/Sync | fertig | Weltstimmung in „Dorf & Regeln“, 30-s-Polling nur sichtbar, ein Request, Fehler behalten die Szene |
| 6 Almanach | fertig | Collection-Ansicht (Umschlag, Suche, Filter, Detail, Quellen, Achievements-Platzhalter) und 3D-Kartenvorschau (LRU 4, ein aktives Modell, Flip/Reset/Druckbild, Retry) |
| 7 Welcome | fertig | Ein Hub für Stand und Ticket, einmal pro Season/Inhaltsversion, unabhängig von der Weltoptik, r14-Text ohne Sammelkartenwerbung |
| 8 Kartenbesitz | fertig | Migration `0049`: Definitionen, Besitz (`quantity = 1`), idempotente serverseitige Vergabe, RLS, `my_season_cards`, `teacher_player_cards` |
| 9 Vergabe | fertig | Migration `0050`: 35 feste Passkarten auf 24 Münzfeldern inkl. Nachbuchung; Truhen-Kartenbonus epic/legendary duplikatfrei, standardmäßig **aus**; Reveal + LearnPass-Hinweis |

Pakete 4–5 (Welt-Rendering) waren als uncommittete Vorarbeit vorhanden und wurden nur gegen die neuen Verträge verdrahtet; 10–11 waren nicht Teil des Auftrags.

## Nachweise

- **`npm test`: 192 Dateien, 1146 Tests grün** (inkl. 11 Katalog-, 8 Besitz-, 8 Vergabe-, 7 Weltzustands-, 8 Controller-, 8 Lehrer-, 5 Almanach-, 4 Modell-Cache- und 5 Welcome-Tests).
- **`npm run typecheck` grün**, **`npm run build` grün** (nur die bekannte Chunk-Größen-Warnung; Build mit lokalem `TEMP=web/.tmp-build`).
- **`npx eslint`** über alle neuen Collection-/Weltdateien ohne Befund.
- **E2E `harness`:** `e2e/halloween-world.spec.ts` 2/2 und `e2e/collection.spec.ts` 1/1 grün – inklusive einmaligem Layer-Wechsel, Lehrer-Schalter pro Klasse, 50 Karten, Filter, 3D-Vorschau, Escape-Reihenfolge und 390 × 844 ohne horizontales Scrollen.
- **Galerie:** `GALLERY_THEME=halloween` für 3 Kartenvorlagen × 2 Seeds × 6 Ansichten (36 Bilder in `web/test-results/galerie-halloween/`, 60–466 Draw Calls). Stichproben `tal_11_marketplace.png` und `tal_11_horizon.png` angesehen: Blutbrunnen, Stände, Lampions, Gräber, tote Bäume, Blutmond mit Halo und dunkles Licht passen zu LOOK/Prototyp.
- **Screenshots angesehen:** `collection-cover.png`, `collection-grid.png`, `collection-card-3d.png`, `collection-mobile.png`.

## Abweichungen und Entscheidungen

1. **Wirksamkeit an die Season gebunden.** Der Plan verlangt effektives Halloween nur im laufenden Kalenderfenster; die ältere Halloween-Notiz wollte den Schalter sofort. Umgesetzt ist die Plan-Regel: außerhalb des Fensters bleibt die Welt normal, die Lehrkraft sieht „vorgemerkt“.
2. **Welcome-Schlüssel.** Statt der im Plan skizzierten Klassenrevision nutzt die Quittung die Season-Inhaltsversion (`seasons.welcome_version`, `r14`), wie es die neuere r14-Vorgabe verlangt. Ein reiner Optikwechsel öffnet nichts erneut.
3. **Migrationsnummern.** 0035–0048 sind durch Shop-/Wahrzeichen-Arbeit belegt; die Kartenmigrationen liegen deshalb auf **0049** und **0050**. Alle drei neuen Migrationen sind noch nicht eingespielt, der Lock bleibt unverändert.
4. **Quiz nicht enthalten.** Paket 7 liefert den Welcome-Hub und den echten LearnPass-Öffner; das Zehn-Fragen-Quiz samt XP ist der separate Auftrag `DEEPSEEK_SPOOKY_STARTER.md` und bleibt im Dialog als „bald verfügbar“ markiert.
5. **Truhen-Kartenchancen.** Trefferhäufigkeit und Gewichte sind bewusst `null`; `season_chest_card_config` ist deaktiviert. Der Dorfgegenstand und seine 55/30/12/3-Chancen bleiben unverändert, vor der Migration geöffnete Truhen bleiben `legacy`.
6. **Kartenmodelle.** Die gelieferten Karten sind nur wenige Zentimeter groß; die Kamera wurde daher ohne absolute Mindestdistanz aus der sichtbaren Bounding Box berechnet, sonst blieben sie winzig.

## Offen (nicht behauptet)

- Keine echte Tablet-FPS-Messung; Desktop-/Headless-Werte sind kein Tablet-Nachweis.
- Kein Push, kein Merge, keine Live-Migration auf Supabase.
- Achievements bleiben Platzhalter; Classroom-Curses-Effekte sind reiner Kartentext.
- Pakete 4–5, 10–11 nicht abgeschlossen; die vorhandene Halloween-Ebene wurde nur integriert, nicht neu bewertet.

## Für die Lehrkraft

- Schritt-für-Schritt: `docs/ANLEITUNG_LEHRKRAFT.md` → „Weltstimmung: Normal oder Halloween“, „Sammelkarten: The Midnight Collection“, „Neue Datenbank-Migrationen“.
- Technische Regeln: `docs/SPEC.md` §13.2 und §14a.
- Nach Merge nach `main` spielt die CI die Migrationen automatisch ein; danach `npm run migrations:lock`.
