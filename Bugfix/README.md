# Lerndorf – Bugfix-Werkstatt

Stand: 29.10.2026

Hier werden Fehler, Glitches und Unstimmigkeiten in Lerndorf gesammelt,
nach Schweregrad und **Fix-Aufwand** einsortiert und als fertiges Paket an
die nächste KI übergeben, die den Fix umsetzt.

## 1. So kommt ein Fehler herein

1. Screenshot/Foto nach `_eingang/` legen (oder direkt in den Chat hängen),
   am besten nummeriert: `01_questkarte.png`.
2. Dazu **ein Satz**: Was hast du gemacht? Was war falsch?
3. Wenn bekannt: Ort (Dorf, Quest, Shop, Almanach, Lehrerbereich …) und
   Gerät/Browser (z. B. iPad Safari, Windows Chrome).

Ein Bild allein ist oft mehrdeutig – der Satz entscheidet, ob ich den Fehler
richtig einordne.

## 2. Was du zurückbekommst

**`BUGS.md`** – Register mit einem Steckbrief pro Fehler:

| Feld | Bedeutung |
|---|---|
| ID | `BUG-001`, `BUG-002` … |
| Titel | kurz und konkret |
| Ort | Modul/Seite |
| Schweregrad | S1–S5 |
| Aufwand | S/M/L/XL |
| Status | neu → bestätigt → Fix beauftragt → Fix da → abgenommen |
| Bild | `bilder/BUG-xxx_01.png` |
| Repro | Schritte zum Nachstellen |
| Ist / Soll | was passiert / was passieren sollte |
| Vermutung | mögliche Ursache + Dateien für die Fix-KI |
| Abnahme | woran man den Fix erkennt |

**`handoff/FIX-xx.md`** – pro Fix-Paket ein copy-paste-fertiger Auftrag für die
nächste KI: Kontext, Dateien, Randbedingungen, Testbefehle, Abnahmekriterien.

**UI/UX-Vorhaben** (keine Fehler) bekommen eine eigene Nummer `UX-001`, einen
Steckbrief im Abschnitt „UI/UX-Vorhaben“ und ein Konzept/Mockup unter
`konzepte/`. Sie werden nicht als S1–S5 gewertet.

## 3. Aufwand (Kosten des Fixes – nicht Schweregrad!)

| Stufe | Zeit | Typischer Umfang |
|---|---|---|
| **S** | ≤ 30 Min | 1 Datei, Text/CSS/Wert, kein Datenmodell |
| **M** | 0,5–2 Std | 2–5 Dateien, Logik + Test, keine Migration |
| **L** | 2–6 Std | modulübergreifend, UI + Logik |
| **XL** | > 1 Tag | Datenmodell/RPC/Migration, Rendering, mehrere Module |

Ein hässlicher, aber harmloser CSS-Fehler kann „S“ sein; ein winziger
Anzeigefehler mit falscher Datenquelle kann „L“ sein.

## 4. Schweregrad

| Stufe | Bedeutung | Beispiel |
|---|---|---|
| **S1** | Blocker: unbenutzbar, Datenverlust, Sicherheit | Login geht nicht, Münzen weg |
| **S2** | Hoch: Kernfunktion kaputt, kein Workaround | Quest lässt sich nicht abgeben |
| **S3** | Mittel: stört, Workaround vorhanden | falsche Zahl, Umweg nötig |
| **S4** | Niedrig: Optik/Text/Timing | Figur schwebt, Text abgeschnitten |
| **S5** | Kosmetik | Tippfehler, 1 px Versatz |

Priorität = Schweregrad × Häufigkeit, abgewogen gegen Aufwand.
Faustregel: erst S1/S2, dann schnelle S3/S4, dann L/XL.

## 5. Ablauf

1. **Eingang** – Tickets/Bugreports, Bilder.
2. **Triage** – Doppelte zusammenfassen, Aufwand schätzen, Steckbriefe schreiben.
3. **Priorisierung** – du entscheidest (ich schlage vor).
4. **Fix-Paket** – `handoff/FIX-xx.md`.
5. **Fix** – nächste KI setzt um, testet, dokumentiert.
6. **Abnahme** – du prüfst; Status „abgenommen“ oder zurück auf „offen“.

## 6. Regeln für die Fix-KI (stehen in jedem Handoff)

- `CLAUDE.md`, `docs/SCOPE.md`, `docs/SPEC.md`, `docs/LOOK.md` lesen.
- Keine echten Schülerdaten, keine Tracker, keine Analytics.
- Münzen/Besitz/Platzierungen nur über RPCs; keine direkten Tabellen-Writes.
- Lösungen nie vor Ablauf der Versuche an den Client.
- Kein Service-Key im Client/Repo/Log.
- Optik nie schlechter als `Prototyp/index.html`; bei Welt/Rendering Galerie prüfen.
- Vor „fertig“: `cd web && npm test`, `npm run build`, bei UI einen Screenshot.
- Kleine, prüfbare Schritte; nichts Unbeteiligtes umbauen.

## 7. Ordner

```
Bugfix/
  README.md          diese Anleitung
  BUGS.md            Register + Steckbriefe
  VORLAGE.md         leere Steckbrief-Vorlage
  _eingang/          neue Screenshots
  bilder/            benannte Befund-Bilder (BUG-001_01.png …)
  handoff/           Fix-Pakete für die nächste KI
  konzepte/          statische UI/UX-Mockups (HTML, keine App-Logik)
```
