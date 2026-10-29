# Lerndorf – Hinweise für Claude Code

Gamification-App für Englisch 8a/8b: 3D-Klassendorf im Browser (Three.js) mit Supabase-Backend. Lies vor jeder Arbeit:

1. `docs/SCOPE.md` – was gebaut wird und was nicht
2. `docs/SPEC.md` – Architektur, Datenmodell, RPCs, Abnahmekriterien
3. `docs/PLAN.md` – Arbeitspakete in Reihenfolge; hake erledigte APs ab und trage Notizen ein
4. `docs/LOOK.md` – **Stil-Leitfaden: so soll das Dorf aussehen** (verbindlich für alles in `render/`)
5. `Prototyp/index.html` – das freigegebene Soll-Bild und funktionierende Referenz für Gelände, Wegenetz, Optik und Figurenverhalten

## Wer ist der Auftraggeber

Eine Englisch-Lehrkraft, kein Entwickler. Erkläre Schritte, die sie selbst ausführen muss (GitHub, Supabase, Secrets), einfach und auf Deutsch, Schritt für Schritt. Technische Entscheidungen innerhalb der SPEC triffst du selbst und nennst sie kurz.

## Harte Regeln

- **Nicht anfassen:** das Repository `Thomsen92/English-Club-8`, den Ordner `../Referenz`, `Konzept/` und `Prototyp/` (nur lesen).
- **Keine echten Schülerdaten** – nur Spitznamen. Keine Analytics, keine Tracker.
- **Münzen, Besitz, Platzierungen ändern sich nur über RPC-Funktionen** (§8). Clients dürfen keine Tabelle direkt schreiben; jede Tabelle hat RLS.
- **Lösungen nie an den Client senden**, bevor die Aufgabe gelöst oder alle Versuche verbraucht sind.
- **Service-Key nie** in Client-Code, Repo oder Logs.
- **Nur CC0-Modelle** oder eigene; jede Quelle in `blender/sources/LICENSES.md`.
- **Kosten 0 €:** keine kostenpflichtigen Dienste.
- **Optik nie schlechter als der Prototyp.** Werte aus `docs/LOOK.md` übernehmen; jedes Dorf-Bild der Galerie mit dem Soll-Bild in `Konzept/Stil_Referenz/` vergleichen, bevor ein AP als fertig gilt.
- Welt-Generierung **deterministisch** aus dem Seed (eigener PRNG, kein `Math.random` in `world/`).

## Live-Betrieb – Datenverlust vermeiden (Stand 29.10.2026)

**Die App ist live. Echte Schüler (8a/8b) spielen jetzt und ihr Fortschritt (Münzen, Besitz, Platzierungen, Aufgabenstand, Tutorial) liegt in der Produktiv-Datenbank.** Datenverlust ist der schlimmste denkbare Fehler – wichtiger als jedes neue Feature.

- **Produktiv-DB nie zurücksetzen oder leeren:** kein `db reset`, `TRUNCATE`, `DROP TABLE/COLUMN`, kein `DELETE`/`UPDATE` ohne enges `WHERE`, keine Seeds gegen Produktion. Tests und Experimente nur lokal oder gegen eine Supabase-Branch/Testprojekt.
- **Migrationen nur additiv und abwärtskompatibel:** neue Spalten mit Default, neue Tabellen, `CREATE OR REPLACE` für RPCs. Bereits ausgelieferte Migrationen (siehe „freeze migrations“) **nie ändern** – Korrekturen als neue Migration. Umbenennen/Löschen von Spalten nur in zwei Schritten (erst Code umstellen und ausliefern, später entfernen) und nur nach Rücksprache mit der Lehrkraft.
- **Vor jeder Migration auf Produktion:** Backup/Export der betroffenen Tabellen (Zeilenzahlen notieren), Migration vorher auf Branch/Testprojekt mit Kopie realistischer Daten prüfen, danach Zeilenzahlen und ein paar Stichproben vergleichen. Eingespielt wird erst nach Freigabe der Lehrkraft.
- **Daten-Änderungen von Hand (SQL, Skripte) nur nach Rücksprache**, in einer Transaktion, mit vorherigem `SELECT` derselben Zeilen und Sicherung der alten Werte.
- **Client-Updates dürfen den Spielstand nicht entwerten:** Spielstand liegt serverseitig, nicht in `localStorage`; beim Ändern von Item-IDs, Preisen, Wochenwechsel- oder Münzlogik bestehenden Besitz und Guthaben erhalten bzw. sauber migrieren. Keine Änderungen, die Käufe, Münzen oder Platzierungen rückwirkend neu berechnen, ohne Rücksprache.
- **Deploys klein halten** und nichts mit Schülern-sichtbarer Wirkung während der Unterrichtszeit ausliefern, wenn es vermeidbar ist; bei Problemen zuerst Client zurückrollen, nie Daten „reparieren“, ohne die Ursache verstanden zu haben.
- Im Zweifel: **nicht ausführen, sondern der Lehrkraft das Risiko erklären und fragen.**

## Konventionen

- TypeScript strict, Vite, three.js 0.170.x gepinnt.
- Spieleroberfläche standardmäßig Englisch, in den Einstellungen auf Deutsch umschaltbar; einfache Sprache. Lehrerbereich Deutsch. Aufgaben-Inhalte und Lösungen bleiben unverändert; Code und Kommentare Englisch. Namen, IDs und Backend bleiben bestehen (Nutzerauftrag 26.10.2026; Details `docs/PLAYER_LANGUAGES.md`).
- Datumsangaben für Schüler als Montag der Woche (z. B. „Woche ab 09.11.“), **nie „KW“**.
- Zeitzone Europe/Berlin für Tageslimits und Wochenwechsel.
- Kleine, überprüfbare Schritte; jede Stufe endet deploybar.
- Vor dem Abschluss einer Aufgabe: `npm test`, Build, und bei UI-Änderungen ein Playwright-Screenshot. Bei Änderungen an `world/` oder am Dorf-Rendering: `npm run galerie` und die Bilder selbst ansehen.
- Erledigte Arbeitspakete in den PLAN-Tabellen abhaken (`[x]`), nicht nur in den Fortschrittsnotizen.

## Arbeitsreihenfolge

Arbeitspakete laut `docs/PLAN.md`, Stufe 1 → 1b → 2 → 3 → 4 → 5. **Stand 23.10.2026 (die App ist seit 29.10.2026 live, siehe „Live-Betrieb“; der folgende Stand kann veraltet sein – `docs/PLAN.md` prüfen):** Stufe 1b ist umgesetzt, Optik am Prototyp nachgezogen, Abnahme durch die Lehrkraft (L.11) steht aus. Das Erststart-Tutorial (PLAN Zwischenpaket E, SPEC §8a, Migration 0019) ist auf dem Zweig `feature/first-login-tutorial` fertig, aber **noch nicht auf `main` und Migration 0019 noch nirgends eingespielt**; Abnahme E.5 durch die Lehrkraft steht aus. Als Nächstes Stufe 2 (Stil-Test mit CC0-Modellen und Blender-Pipeline). Jede Änderung an Welt oder Rendering mit der Galerie prüfen. Nach jeder Stufe auf die Abnahme der Lehrkraft warten. Innerhalb von Stufe 2 zuerst der Stil-Test zur Abnahme durch die Lehrkraft, bevor alle Assets gebaut werden. Offene Punkte (SPEC §19) mit dem Standardwert umsetzen und konfigurierbar halten.
