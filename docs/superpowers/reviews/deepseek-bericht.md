# DeepSeek-Bericht – Season I & LearnPass

**Zwischenstand 27.10.2026** (wird am Ende ergänzt). Branch: `feature/season-learnpass`.

## Pakete

| Paket | Status | Commit | Notiz |
|---|---|---|---|
| S1 | fertig | `f0f4b32` | 0028 Schema, 0030 Inhalte (Saison 28.10.–06.12., 28 Pool-Items, 12 Szenen, 40 Stufen, 4 Titel, 4 Rahmen, Serien-Nachberechnung); `season-schema.test.ts` |
| S2 | fertig | `b306391` | 0029 RPCs (`season_state`, `claim_season_tier`, `choose_season_item`, `buy_season_chest`, `open_season_chest`, `sell_item`, `close_season`), Serien-Trigger, Rechte; `season-rpc.test.ts` |
| S4 | fertig | `1831e48` | 22 SQL-Tests in drei Dateien: Schema, Zustände (upcoming/running/ended), Claims, Verkauf (platziert/fremd/zu viel), Stufe-40-Wahl (Besitz → Münzen), Serie (Lücke, Tag 3), Shop-Fenster, Chancen 55/30/12/3 (400 Ziehungen) |
| A1 | offen | – | Loader: Meshopt, async GLB-Zweig, Normalisierung, Fernversionen, Galerie |
| A3 | offen | – | 12 Kenney-Pass-Szenen |
| U1–U7 | offen | – | UI nach §14 |
| S3 | offen | – | Shop-Daten 0031 |
| U4b | offen | – | Nicht-Season-Artikel |
| A2 | offen | – | Asset-Reste |
| L1 | offen | – | Saison-Steuerung 0032 + Lehrer-Reiter |
| D1 | offen | – | Doku + Lehrer-Anleitung |
| T1 | offen | – | Abnahme |

## Prüfungen

- `npm test`: **143 Dateien, 963 Tests grün** (Stand S4).
- `npm run build`: grün (Vite, nur die bekannte Chunk-Größen-Warnung).
- SQL-Tests laufen mit PGlite über alle Migrationen 0001–0030.
- Keine Screenshots/Galerie in diesem Abschnitt (noch keine UI/3D-Änderung).

## Abweichungen

1. **Coin-Ledger:** `season` und `sell` ergänzt (0028), Buchungen aus Truhen laufen unter `season`, nicht `chest`.
2. **Stufe-40-Wahl:** Bei bereits besessenem Gegenstand zahlt die Wahl den Verkaufswert (auch bei Deko), nicht nur bei Haus/Auto.
3. **Serien-Nachberechnung** in 0030 als Schleife über `daily_quest_results`; idempotent über `unique(player_id, season, source, ref)`.
4. **Truhen-Serie** nutzt einen Trigger auf `daily_quest_results`; `submit_quest_answer` bleibt unverändert.
5. **`season_latest()`** liefert die jüngste Saison; die RPCs prüfen den Zustand über `starts_on`/`ends_on` (Europe/Berlin).

## Offene Fragen

- Keine blockierenden Fragen bisher. `set_title`/`set_frame` für Season-Titel folgt mit L1/U7.
- A1 braucht eine Entscheidung, wie die Item-Katalogdaten (Spalte `model`) in die Dorf-Ansicht gelangen; wird beim Paket geprüft.

## Nächster Schritt

A1 (Loader) beginnen: `MeshoptDecoder`, asynchroner GLB-Zweig mit Platzhalter, Normalisierung auf `MAX_SIZE`, Drehung pro Item, Fernversionen, Galerie-Prüfung.
