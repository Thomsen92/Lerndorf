# DeepSeek-Bericht – Season I & LearnPass

**Zwischenstand 27.10.2026** (wird am Ende ergänzt). Branch: `feature/season-learnpass`.

## Pakete

| Paket | Status | Commit | Notiz |
|---|---|---|---|
| S1 | fertig | `f0f4b32` | 0028 Schema, 0030 Inhalte (Saison 28.10.–06.12., 28 Pool-Items, 12 Szenen, 40 Stufen, 4 Titel, 4 Rahmen, Serien-Nachberechnung); `season-schema.test.ts` |
| S2 | fertig | `b306391` | 0029 RPCs (`season_state`, `claim_season_tier`, `choose_season_item`, `buy_season_chest`, `open_season_chest`, `sell_item`, `close_season`), Serien-Trigger, Rechte; `season-rpc.test.ts` |
| S4 | fertig | `1831e48` | 22 SQL-Tests in drei Dateien: Schema, Zustände (upcoming/running/ended), Claims, Verkauf (platziert/fremd/zu viel), Stufe-40-Wahl (Besitz → Münzen), Serie (Lücke, Tag 3), Shop-Fenster, Chancen 55/30/12/3 (400 Ziehungen) |
| A1 | fertig | `b07c7b3` | Meshopt im Loader, async GLB-Zweig mit Platzhalter, Normalisierung auf MAX_SIZE (Deko min. 0,8 m), THREE.LOD mit 34 Fernversionen; Tests + Galerie-Screenshot `web/dev/season.html` |
| A3 | fertig | `aba8f37` | 12 Pass-Szenen aus 32 Kenney-Modellen (`passScenes.ts`), Lizenzzeile, Asset-Vertrag-Test, Screenshot `season-a3b.png` |
| U1 | fertig | `58c6e91` | LearnPass-Seite nach §14 (Kopf, Stand-Leiste, 40 Karten, DU-Marke, Schienen-Punkte, vier Kacheln), API-Client, i18n, Vitest, Screenshots |
| U2 | fertig | `7b84f4d` | Season-Truhen im Inventar, Öffnen über RPC, Ergebnis-Karte, Duplikat-Münzen, Vitest + Screenshots |`n| U3 | fertig | `1ff7e86` | „What's inside?“: Chancen 55/30/12/3, alle 28 Gegenstände mit Seltenheit/Verkaufswert, Vitest + Screenshots |`n| U4a | fertig | `390d7c6` | Season-Truhe im Shop: 50 Münzen, 2/Woche, Reststand, Fehlerfälle, Vitest + Screenshots |`n| U5 | fertig | `ca0c16b` | Profilkarte mit Stufe/Restzeit/Truhen-Badge, öffnet den LearnPass über die echte API; Inventar-Badge im Haus-Menü |`n| U6 | fertig | `e1fa089` | Saison-Stand, Willkommensbanner, dunkle Stimmung im Saisonfenster (`seasonWindow.ts`), Klick öffnet den Pass; Galerie nicht gelaufen, Markt über Dev-Seite geprüft |`n| U7 | fertig | `face58c` | Deutsche Quelltexte + englische Übersetzungen, deutsche Gegenstandsnamen, Seltenheiten zur Laufzeit, `aria-live`, i18n-Tests |
| S3 | fertig | `61753f8` | 0031: sechs Nicht-Season-Artikel (500–5.000 Münzen), `shop_visible`, Modelle, Kauf über `buy_item`; SQL-Tests |
| U4b | fertig | `e427c8d` | Shop zeigt die sechs Artikel mit echten 3D-Vorschaubildern (`itemThumbs` wartet auf GLB); Screenshot |
| A2 | offen | – | Asset-Reste |
| L1 | offen | – | Saison-Steuerung 0032 + Lehrer-Reiter |
| D1 | offen | – | Doku + Lehrer-Anleitung |
| T1 | offen | – | Abnahme |

## Prüfungen

- `npm test`: **152 Dateien, 993 Tests grün** (Stand U4b).
- `npm run build`: grün (Vite, nur die bekannte Chunk-Größen-Warnung).
- SQL-Tests laufen mit PGlite über alle Migrationen 0001–0030.
- Galerie: `web/test-results/season-a1.png` (8 Modelle auf Sockeln, innerhalb MAX_SIZE, Boden auf 0) und `season-a3b.png` (drei Pass-Szenen, 2,4 m breit, Boden auf 0) angesehen.

## Abweichungen

1. **Coin-Ledger:** `season` und `sell` ergänzt (0028), Buchungen aus Truhen laufen unter `season`, nicht `chest`.
2. **Stufe-40-Wahl:** Bei bereits besessenem Gegenstand zahlt die Wahl den Verkaufswert (auch bei Deko), nicht nur bei Haus/Auto.
3. **Serien-Nachberechnung** in 0030 als Schleife über `daily_quest_results`; idempotent über `unique(player_id, season, source, ref)`.
4. **Truhen-Serie** nutzt einen Trigger auf `daily_quest_results`; `submit_quest_answer` bleibt unverändert.
5. **`season_latest()`** liefert die jüngste Saison; die RPCs prüfen den Zustand über `starts_on`/`ends_on` (Europe/Berlin).

## Offene Fragen

- Keine blockierenden Fragen bisher. `set_title`/`set_frame` für Season-Titel folgt mit L1/U7.
- Die GLB-Registry liegt im Client (`glbItems.ts`) und wird per Test gegen beide Manifeste geprüft; die Spalte `items.model` bleibt die Server-Wahrheit.

## Nächster Schritt

A2: Asset-Reste (LOD-Nachbesserung, Quellen/Lizenz, Modellprüfung), dann L1 (Saison-Steuerung im Lehrerbereich).
