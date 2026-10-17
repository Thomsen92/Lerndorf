# Lerndorf – Hinweise für Claude Code

Gamification-App für Englisch 8a/8b: 3D-Klassendorf im Browser (Three.js) mit Supabase-Backend. Lies vor jeder Arbeit:

1. `docs/SCOPE.md` – was gebaut wird und was nicht
2. `docs/SPEC.md` – Architektur, Datenmodell, RPCs, Abnahmekriterien
3. `Prototyp/index.html` – funktionierende Referenz für Gelände, Wegenetz und Figurenverhalten

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
- Welt-Generierung **deterministisch** aus dem Seed (eigener PRNG, kein `Math.random` in `world/`).

## Konventionen

- TypeScript strict, Vite, three.js 0.170.x gepinnt.
- UI-Texte Deutsch, einfache Sprache; Aufgaben-Inhalte Englisch; Code und Kommentare Englisch.
- Datumsangaben für Schüler als Montag der Woche (z. B. „Woche ab 09.11.“), **nie „KW“**.
- Zeitzone Europe/Berlin für Tageslimits und Wochenwechsel.
- Kleine, überprüfbare Schritte; jede Stufe endet deploybar.
- Vor dem Abschluss einer Aufgabe: `npm test`, Build, und bei UI-Änderungen ein Playwright-Screenshot.

## Arbeitsreihenfolge

Stufe 1 → 2 → 3 → 4 → 5 laut SCOPE. Innerhalb von Stufe 2 zuerst der Stil-Test zur Abnahme durch die Lehrkraft, bevor alle Assets gebaut werden. Offene Punkte (SPEC §19) mit dem Standardwert umsetzen und konfigurierbar halten.
