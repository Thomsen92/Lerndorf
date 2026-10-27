# Auftrag an Claude – Season I & LearnPass

Dieser Text ist zum Kopieren in eine neue Claude-Session gedacht.

---

Du arbeitest im Repository **Lerndorf** (TypeScript strict, Vite, three.js, Supabase; Schule 8a/8b). Der Auftrag: **Season I (Halloween) mit LearnPass, Season-Truhen, Season-Shop und Sammlung**.

## Zuerst lesen

1. `CLAUDE.md` – Projektregeln, Stil, Testpflichten
2. `docs/superpowers/specs/2026-10-26-learnpass-design.md` – Design (verbindlich)
3. `docs/superpowers/plans/2026-10-27-season-und-learnpass.md` – Umsetzungsplan, besonders Abschnitt 12 (Übergabe: Bestand, Fallstricke, Grenzen)
4. `web/public/assets/season1/manifest.json` und `web/public/assets/shop/manifest.json`
5. `supabase/migrations/` bis `0027` – neue Migrationen beginnen bei **0028**

## Aufgabe jetzt: prüfen, nicht bauen

Prüfe den Plan kritisch gegen den echten Repo-Stand. Implementiere noch **nichts**.

- Passen Migrationen (0028–0031), RPCs, RLS und Idempotenz zum bestehenden Schema (`items.kind`, `chests`, `xp_ledger`, `streaks`, `profiles.title_id/frame_id`)?
- Ist die Wirtschaft stimmig (3.000 XP, 300 Münzen, 8 Truhen, Truhen-EV 39,75, Preise 500–5.000)?
- Gibt es Widersprüche zwischen Design, Plan und `CLAUDE.md`?
- Sind die 15 Arbeitspakete und ihre Reihenfolge realistisch?
- Sind die Assets nutzbar (Meshopt, `model_url`, fehlende/kaputte Modelle)?
- Fehlt etwas für den Saisonwechsel, die Streak-Truhe, den Shop-Reset oder die Stufe-40-Wahl?

## Antwortformat

**A) Befunde** – höchstens 10, sortiert nach Schwere (Blocker / wichtig / kosmetisch). Je 1–2 Sätze und die betroffene Datei.

**B) Entscheidungsfragen** – höchstens 5, nur wo du wirklich blockiert bist. Alles andere entscheidest du selbst und notierst es kurz.

**C) Erster Schritt** – konkreter Vorschlag für S1 (`0028_seasons.sql`), ohne ihn schon umzusetzen.

Danach **wartest du auf mein „los“**.

## Nach dem „los“

Arbeite die Pakete in der Reihenfolge des Plans ab: **S1 → S2 → S4 → A1 → U1 → U2 → U3 → U4 → U5 → U6 → U7 → S3 → A2 → D1 → T1**.

Nach jedem Paket:

- `npm test` und `npm run build` grün (Windows: projektlokales TEMP `web/.tmp-build` setzen)
- bei UI: Playwright-Screenshot selbst ansehen
- bei 3D: `npm run galerie` und die Bilder prüfen
- Doku (PLAN, SPEC, DESIGN) aktualisieren
- **nicht committen**

## Harte Regeln

- **Nichts committen oder pushen**, außer ich bitte ausdrücklich darum.
- Nur **CC0**-Assets oder eigene; Quellen in `blender/sources/LICENSES.md`.
- Münzen, Besitz und Platzierungen **nur über RPCs**; keine direkten Tabellenschreibzugriffe aus dem Client.
- **Keine echten Schülerdaten**, keine Analytics.
- **Bestehende Modelle nicht entfernen** („keine bisherigen Modelle entfernen“).
- Kein Tausch in v1, keine Pechhilfe, keine Münzbeutel in Truhen, keine Echtgeld-Truhen.
- `MeshoptDecoder` im Loader setzen, sonst laden die Season-GLBs nicht.
- Vite-Dev-Server nicht laufen lassen, während Dateien geändert werden (`EBUSY`).
- `Prototyp/`, `Konzept/`, `../Referenz` und `Thomsen92/English-Club-8` nicht anfassen.

## Bestätigte Entscheidungen

- Einstieg: **Profilkarte + Season-Stand am Markt** (Willkommensnachricht, düstere Stimmung).
- Stufe 40: **freie Wahl eines beliebigen Season-Gegenstands** (28 Items); bereits vorhanden → Münzen.
- Serie: **alle Kalendertage** zählen, auch Wochenende.
- 28 Season-Items und 6 Shop-Items sind fertig und bleiben.
