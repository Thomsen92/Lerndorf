# DeepSeek-Bericht – Season I & LearnPass

**Abschluss 27.10.2026.** Branch: `feature/season-learnpass` (nicht auf `main`, nicht gepusht).
Grundlage: [Auftrag](plans/2026-10-27-deepseek-auftrag.md), [Plan](plans/2026-10-27-season-und-learnpass.md).

## Ergebnis

Season I ist vollständig umgesetzt: Schema und Inhalte, alle RPCs, LearnPass-Seite, Truhen im
Inventar und im Shop, „What's inside?“, Profil- und Markt-Einstieg, Sammlung, Verkauf von
Duplikaten, Lehrer-Steuerung mit Protokoll, Doku und Tests. Am Ende: **1004 Tests grün**, Build grün.

## Pakete

| Paket | Status | Commit | Inhalt |
|---|---|---|---|
| S1 | fertig | `f0f4b32` | `0028` Schema (Saisons, Stufen, Claims, Truhen, Serien, `player_rewards`, `season_changes`), `0030` Inhalte (28 Pool-Items, 12 Szenen, 40 Stufen, 4 Titel, 4 Rahmen, Serien-Nachberechnung); Schema-Tests |
| S2 | fertig | `b306391` | `0029` RPCs (`season_state`, `claim_season_tier`, `choose_season_item`, `buy_season_chest`, `open_season_chest`, `sell_item`, `close_season`), Serien-Trigger, Rechte |
| S4 | fertig | `1831e48` | 22 SQL-Tests: Zustände, Claims, Verkauf, Stufe-40-Wahl, Serie, Shop-Fenster, Chancen (400 Ziehungen) |
| A1 | fertig | `b07c7b3` | GLB-Loader mit Meshopt, async Platzhalter, Normalisierung auf `MAX_SIZE`, `THREE.LOD` mit 34 Fernversionen |
| A3 | fertig | `aba8f37` | 12 Kenney-Pass-Szenen aus 32 kopierten Modellen, Lizenzzeile, Vertragstest |
| U1 | fertig | `58c6e91` | LearnPass-Seite: Kopf, Stand-Leiste, 40 Karten, DU-Marke, Schienen-Punkte, vier Kacheln, API-Client, i18n |
| U2 | fertig | `7b84f4d` | Season-Truhen im Inventar mit Öffnen, Ergebnis-Karte, Duplikat-Münzen |
| U3 | fertig | `1ff7e86` | „What's inside?“: Chancen 55/30/12/3, alle 28 Gegenstände mit Verkaufswert |
| U4a | fertig | `390d7c6` | Shop-Truhe: 50 Münzen, 2/Woche, Reststand, Fehlerfälle |
| U5 | fertig | `ca0c16b` | Profilkarte mit Stufe/Restzeit/Truhen-Badge, echter LearnPass-Einstieg, Inventar-Badge |
| U6 | fertig | `e1fa089` | Kürbisbude am Markt, Willkommensbanner, dunkle Stimmung nur im Saisonfenster |
| U7 | fertig | `face58c` | Deutsche Quelltexte + englische Übersetzungen, deutsche Gegenstandsnamen, `aria-live` |
| S3 | fertig | `61753f8` | `0031`: sechs Nicht-Season-Artikel (500–5.000 Münzen), `shop_visible`, Modelle |
| U4b | fertig | `e427c8d` | Shop zeigt die Artikel mit echten 3D-Vorschaubildern (async GLB-Thumbs) |
| A2 | fertig | `ff99c48` | Asset-Vertragstest, Ausschluss der Problem-Assets, Lizenzzeile |
| L1 | fertig | `6120b00` | `0032`: `teacher_seasons`, `teacher_set_season_dates`, `teacher_start_season_now`, `teacher_end_season_now`, `teacher_season_overview`; Reiter „Saison“ |
| D1 | fertig | `e16e3bc` | SPEC §13/§13.1, Anleitung für die Lehrkraft, Design-README |
| T1 | fertig | `23c78a1`, `d7da9da` | Abnahme: `0033` Besitzprüfung für Season-Titel/-Rahmen, Sammlungslabels, Verkaufen im Inventar, Protokoll der Saison-Änderungen |

## Prüfungen

- **`npm test`: 1004 Tests grün** (SQL mit PGlite über alle Migrationen 0001–0033, UI-Tests, Render- und Vertragstests).
- **`npm run build`: grün** (nur die bekannte Chunk-Größen-Warnung).
- **Galerie**: 37 Bilder für drei Karten und zwei Seeds erzeugt (`test-results/galerie/`), Marktplatz angesehen; Dorf und Markt sauber, 58–433 Draw Calls.
- **Screenshots angesehen:** LearnPass (Tablet/Handy, Deutsch/Englisch), „What's inside?“, Truhen im Inventar und Ergebnis-Karte, Shop-Truhe vor/nach Kauf, Profilkarte, Saison-Markt, Lehrer-Reiter „Saison“.
- Der Markt zeigt am 27.10. noch keine Saison (Fenster beginnt 28.10.); Stimmung und Bude wurden über `web/dev/season-market.html` mit erzwungener Saison geprüft.

## Abweichungen

1. **Sonntagsregel:** Die Tabellen-Prüfung verlangt nur noch „Ende nach Start“; den Sonntag prüft `teacher_set_season_dates`, damit „Jetzt beenden“ mitten in der Woche funktioniert.
2. **Fernversionen:** 8 der 34 LODs bleiben topologiebedingt über 2.000 Dreiecken (0,8k–20k); optisch unauffällig.
3. **Coin-Ledger:** `season` und `sell` ergänzt; Truhenmünzen laufen unter `season`, nicht `chest`.
4. **Stufe-40-Wahl:** Bei Besitz zahlt die Wahl den Verkaufswert (auch bei Deko), nicht nur bei Haus/Auto.
5. **Truhen-Serie:** eigener Trigger auf `daily_quest_results`; `submit_quest_answer` blieb unverändert.
6. **Kein echter E2E-Lauf gegen Supabase:** Abnahme über PGlite-SQL-Tests, UI-Harness-Seiten und Galerie; Login und Deploy bleiben der Lehrkraft vorbehalten.

## Offene Punkte für die Lehrkraft

1. Branch `feature/season-learnpass` prüfen lassen; danach nach `main` mergen – **erst dann** werden die Migrationen 0028–0033 live eingespielt.
2. Saison startet am 28.10.; XP ab diesem Tag zählen rückwirkend. Bei Bedarf im Lehrerbereich → **Saison** das Ende verschieben.
3. Datumsänderung vor dem Start: „Saison“-Reiter, Ende muss ein Sonntag sein.
4. Nach dem Ende: „Jetzt beenden“ schreibt offene Stufen gut; ungeöffnete Truhen bleiben nutzbar.

## Nächster Schritt

Review durch Claude (Diff, Tests, Galerie, Screenshots) – danach Merge und Live-Gang.
