# Auftrag an DeepSeek: Season I & LearnPass umsetzen

Du arbeitest im Repository **Lerndorf** (TypeScript strict, Vite, three.js 0.170, Supabase; Englisch-Gamification für die Klassen 8a/8b). Auftraggeberin ist eine Lehrkraft, kein Entwickler. Deine Arbeit wird danach von Claude geprüft (Test-Review). Setze den Plan **vollständig und genau** um – entscheide nichts neu, was dort schon entschieden ist.

## 0. Branch – zuerst

```bash
git checkout main
git pull
git checkout -b feature/season-learnpass
```

- Arbeite **nur** auf `feature/season-learnpass`. **Nie** auf `main` committen, mergen oder pushen.
- **Wichtig:** Jeder Push nach `main`, der `supabase/**` ändert, spielt die Migrationen **sofort in die echte Datenbank** ein (`.github/workflows/migrate.yml`). Deshalb bleiben alle Migrationen auf dem Branch, bis das Review durch ist.
- Ein Commit pro Arbeitspaket, Nachricht im Stil `feat(season): S1 schema and content` (Englisch). Den Branch darfst du nach `origin` pushen; das löst keine Migration aus.

## 1. Zuerst lesen

1. `CLAUDE.md` – Projektregeln, Stil, Testpflichten
2. `docs/superpowers/plans/2026-10-27-season-und-learnpass.md` – **der verbindliche Plan**, besonders §2 (Entscheidungen E1–E25), §3 (Datenmodell 0028–0032), §4 (Stufentabelle), §6 (Assets, Messwerte), §7 (Tests), §8 (Pakete), §12 (Übergabe, Fallstricke), §13 (geklärte Widersprüche), **§14 (Layout und Design)**
3. `docs/superpowers/specs/2026-10-26-learnpass-design.md` – Hintergrund; bei Abweichungen gilt der Plan
4. Design-Referenz: `web/dev/learnpass-design.html` + `.ts` (Dev-Server → `/dev/learnpass-design.html`, `#inside`) und die Screenshots in `docs/superpowers/designs/learnpass/`
5. `web/public/assets/season1/manifest.json`, `web/public/assets/shop/manifest.json`
6. `supabase/migrations/` bis `0027` (live eingespielt bis 0027) – neue Migrationen: `0028`–`0032`
7. Bestehender Code, an den du anschließt: `0020_xp_levels.sql` (XP, Truhen, Serie, `set_title`/`set_frame`), `0013_plot_slots.sql` (`items.kind`, `buy_item`, Slots), `web/src/render/plotAssets.ts`, `kenney.ts`, `itemThumbs.ts`, `itemPreview.ts`, `chestPreview.ts`, `web/src/ui/frames.ts`, `titlePlaque.ts`, `profileView.ts`, `shopView.ts`, `web/src/world/plotPlan.ts`, `web/tests/sql/*.test.ts` (PGlite-Muster)

## 2. Reihenfolge

**S1 → S2 → S4 → A1 → A3 → U1 → U2 → U3 → U4a → U5 → ~~U6~~ (gestrichen 27.10., Markt und Welt baut ChatGPT) → U7 → S3 → U4b → A2 → L1 → D1 → T1** (Inhalte je Paket: Plan §8).

## 3. Fertig ist ein Paket erst, wenn

- `npm test` und `npm run build` grün sind (Windows: vorher projektlokales TEMP setzen: `TEMP=web/.tmp-build`, `TMP=web/.tmp-build`, sonst `spawn EPERM`),
- bei UI ein Playwright-Screenshot (1180 × 820 und 390 × 844) gemacht **und angesehen** ist und zu §14 passt,
- bei 3D `npm run galerie` gelaufen ist und die Bilder angesehen sind,
- PLAN (Paket abhaken `[x]`, Notiz), SPEC und bei Bedarf das Design aktualisiert sind,
- das Paket committet ist (nur auf dem Branch).

## 4. Harte Regeln

- Münzen, Besitz, Platzierungen ändern sich **nur über RPCs** (`security definer`); jede neue Tabelle mit RLS, `revoke all … from public, anon, authenticated`, danach nur `grant select`.
- Keine echten Schülerdaten, keine Analytics, keine Tracker, **kein Google-Fonts-CDN**.
- **Bestehende Modelle nicht entfernen.** Nur CC0/eigene Assets; jede neue Quelle in `blender/sources/LICENSES.md`.
- Kein Tauschen, keine Pechhilfe, keine Münzbeutel in Truhen, keine Echtgeld-Truhen, keine Rangliste.
- `MeshoptDecoder` im Spiel-Loader setzen (sonst laden die Season-GLBs nicht).
- Welt-Code deterministisch (kein `Math.random` in `world/`); Würfeln nur serverseitig (`random()` in SQL).
- Spieler-Oberfläche Englisch als Standard, Deutsch über `tr()`; Lehrerbereich Deutsch; Datumsangaben „Woche ab 09.11.“, **nie „KW“**; Zeitzone Europe/Berlin.
- Nicht anfassen: `Prototyp/`, `Konzept/`, `../Referenz`, Repository `Thomsen92/English-Club-8`.
- Keine Service-Keys in Code, Repo oder Logs.

## 5. Wichtige Festlegungen (Kurzfassung, Details im Plan)

- **Saison I:** `2026-11-halloween`, **28.10.2026 – 06.12.2026** (Berlin-Datum). XP zählen rückwirkend ab 28.10.; die Truhen-Serie wird in 0030 aus `daily_quest_results` nachberechnet (idempotent).
- **Stufen:** 30/60/90/120 XP je Zehnerblock = 3.000 XP. Münzen: 5 auf Stufe 1–20, + 25 je Meilenstein (5, 10 … 40) = 300. Jede Stufe kann **mehrere** Belohnungen tragen (Spalten statt `reward_kind`).
- **Truhen:** eigene Tabelle `season_chests`, Chancen 55/30/12/3, Seltenheit in der DB `common`/`rare`/`epic`/`legendary`; Duplikate als `qty`; schon besessenes Haus/Auto → Verkaufswert (15/40/100/250) unter `coin_ledger.reason = 'season'`, `ref = 'season_chest:<id>'`.
- **Stufe 40:** Truhe + 25 Münzen + Titel + freie Wahl aus den 28 Truhen-Gegenständen über `choose_season_item`; bleibt nach Saisonende möglich.
- **Truhen-Serie:** eigener Kalendertage-Zähler (auch Sa/So), Trigger auf `daily_quest_results`; die Schultags-Serie (`touch_streak`) bleibt unverändert.
- **Shop-Truhe:** 50 Münzen, 2 pro Berlin-Woche, `ref = 'shop-<Montag>-<n>'`.
- **Season-Titel/-Rahmen:** Besitz in `player_rewards`; `set_title`/`set_frame` entsprechend ersetzen; vier neue Rahmen-Stile in `frames.ts`.
- **Verkaufen:** nur Season-Gegenstände, nur unplatzierte Exemplare.
- **Modelle:** Loader normalisiert (Mitte, Boden 0, auf `MAX_SIZE` einpassen, Drehung pro Item), Fernversionen für das Dreiecks-Budget (Plan §6.3). Messwerte der problematischen Modelle: Plan §6.2.
- **Pass-Szenen (A3):** 12 Szenen aus dem Kenney Graveyard Kit (`Lerndorf/Kenny/Graveyard/Models/GLB format/`) nach Plan §6.1 in `web/public/assets/kenney/graveyard/` kopieren und wie die bestehenden Deko-Szenen zusammensetzen.
- **Oberfläche:** exakt nach §14 (gerade Karten-Spur zum Wischen, Bilder je Belohnung, Blutmond, untere Kacheln, Chancen nur im Fenster „What's inside?“).
- **Lehrer-Steuerung (L1):** Saison starten/verschieben/beenden nach §3.6, mit Bestätigung und Protokoll.

## 6. Bekannte Fallstricke

- Supabase vergibt neuen Tabellen Standardrechte → immer `revoke` + RLS.
- Index `coin_ledger_chest_once` gilt für `reason = 'chest'` – Season-Truhen nicht darüber buchen.
- `plotAsset()` ist synchron und prozedural; GLB-Items brauchen einen asynchronen Zweig mit Platzhalter (Dorf, Vorschau, Vorschaubilder).
- `.gitignore`: Ordner-Regeln mit führendem `/` schreiben – Windows ignoriert Groß-/Kleinschreibung, `Assets/` würde sonst `web/public/assets/` verstecken.
- Vite-Dev-Server nicht laufen lassen, während Dateien geändert werden (`EBUSY`).
- Playwright mit `--use-angle=swiftshader --enable-unsafe-swiftshader` starten.
- Blender 5.2 hat keinen Collada-Import (A2).

## 7. Wenn du blockiert bist

Nicht raten und nichts am Plan umdeuten. Schreib die Frage mit Datei und Stelle in `docs/superpowers/reviews/deepseek-fragen.md`, mach mit dem nächsten unabhängigen Paket weiter und nenne die Frage im Abschlussbericht.

## 8. Abschlussbericht (am Ende, dann aufhören)

Lege `docs/superpowers/reviews/deepseek-bericht.md` an:

1. Tabelle aller Pakete: fertig / teilweise / offen, Commit-Hash.
2. Ausgabe von `npm test` (Anzahl Dateien/Tests) und `npm run build`.
3. Liste der Screenshots und Galerie-Bilder, die du angesehen hast.
4. Jede Abweichung vom Plan mit Grund.
5. Offene Fragen und bekannte Fehler.

Danach nichts mehr ändern – Claude macht das Review auf `feature/season-learnpass`.
