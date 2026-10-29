# Auftrag für Claude Code – Lerndorf Bugfixes

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Stand:** 29.10.2026
**Grundlage:** `Bugfix/BUGS.md` und die dort verlinkten Fix-Pakete.

Du bist die Fix-KI. Arbeite die offenen Bugs in der Reihenfolge unten ab –
**einen Fix pro Commit/PR**, jeden einzeln testen und dokumentieren.
Die App ist **live**; echte Schüler spielen. Datenverlust ist der schlimmste
denkbare Fehler.

## 0. Zuerst lesen

1. `CLAUDE.md` (inkl. Abschnitt „Live-Betrieb“)
2. `docs/SCOPE.md`, `docs/SPEC.md`, `docs/PLAN.md`, `docs/LOOK.md`
3. `Bugfix/BUGS.md`
4. Das jeweilige `handoff/FIX-xx.md` **vollständig**, bevor du Code anfasst.

## 1. Reihenfolge

| # | ID | Titel | Schwere | Aufwand | Paket |
|---|---|---|---|---|---|
| 1 | **BUG-001** | HUD überdeckt Overlay-Kopfzeilen (Daily Quests + Profil/Settings) | S2 | S | `FIX-01` |
| 2 | **BUG-002** | Learnpass: Münzen einsammeln friert die Seite ein (Hard Reset) | S1 | L | `FIX-02` |
| 3 | **BUG-008** | Learnpass: „Open in inventory“ überlappt die Kartenkante | S3 | S | `FIX-05` |
| 4 | **BUG-007** | Season-Hub: My Almanac direkt unter Season 1 | S3 | S | `FIX-04` |
| 5 | **BUG-005** | Bau-Modus: Feldauswahl verdeckt das Dorf; direkter Klick fehlt | S3 | M | `FIX-03` |
| 6 | **BUG-003 + BUG-004** | Learnpass: zu groß / Scrollen ruckelt (gemeinsam prüfen) | S3 | M | `FIX-02` |
| 7 | **BUG-009** | Inventar: Platzhalter-Gegenstände und falsches Icon | S3 | M | `FIX-06` |
| 8 | **BUG-010** | Spelling Bee: leichter, mehr Buchstaben, 3 Joker, Unit-Wörter | S3 | M | `FIX-07` |
| 9 | **BUG-011** | Legendäres Hausmodell durch Fantasy-Treehouse ersetzen | S3 | M | `FIX-08` |

**BUG-001 zuerst** – der Auftraggeber hat die Überlappung als nächsten Fix
gesetzt. **BUG-002 (S1)** direkt danach, weil ein Freeze mit Hard Reset die
höchste Schwere hat.

**Nicht bearbeiten:**

- **BUG-006** – Meldung unvollständig (Season-Pass-Kachel). Warten, bis die
  Beschreibung ergänzt ist.
- **UX-001 / UX-002** – das sind Gestaltungsvorhaben, keine Bugs. Nur
  umsetzen, wenn die Lehrkraft es ausdrücklich freigibt.

## 2. Pro Fix

1. **Lesen:** `FIX-xx.md` und die betroffenen Dateien.
2. **Nachstellen:** den Fehler zuerst reproduzieren (Browser/DevTools,
   ggf. Mobil-Emulation). Nicht blind ändern.
3. **Fix:** nur den dokumentierten Umfang. Kein Redesign, keine
   „Verbesserungen“, keine unrelated Formatierungen.
4. **Testen:** `cd web && npm test` und `npm run build`; bei Welt/Rendering
   zusätzlich `npm run galerie` und die Bilder ansehen; bei UI einen
   Screenshot.
5. **Dokumentieren:** In `Bugfix/BUGS.md` den Status auf **„Fix da“** setzen
   und eine kurze Notiz ergänzen (Datei, Ursache, Fix, Testergebnis,
   Screenshot).
6. **Committen:** ein Commit/PR pro Fix; nichts Unbeteiligtes mitnehmen.

## 3. Harte Regeln

- **Live-DB:** kein `db reset`, `TRUNCATE`, `DROP`, kein `DELETE`/`UPDATE`
  ohne enges `WHERE`, keine Seeds gegen Produktion. Migrationen nur additiv
  und nur nach Freigabe.
- **Keine echten Schülerdaten**, keine Tracker/Analytics.
- **Münzen/Besitz/Platzierungen** nur über RPCs; keine direkten
  Tabellen-Writes.
- **Lösungen** nie vor Ablauf der Versuche an den Client.
- **Service-Key** nie in Client/Repo/Log.
- **Keine Datenänderung** als „Nebenwirkung“ eines UI-Fixes. Wenn ein Fix
  Datenänderungen braucht: **stoppen und die Lehrkraft fragen.**
- **Lizenz:** Bei BUG-011 (Tripo-GLB) vor dem Einsatz klären, ob eigen/CC0;
  Quelle in `blender/sources/LICENSES.md` eintragen. Ungeklärt = nicht
  ausliefern.
- **Optik** nie schlechter als der Prototyp; `docs/LOOK.md` gilt.
- **Keine neuen Abhängigkeiten**, keine unrelated Umbauten.

## 4. Stop-Bedingungen

Sofort stoppen und fragen, wenn:

- ein Fix Produktivdaten ändern müsste,
- die Lizenz eines Assets unklar ist,
- der Fehler nicht reproduzierbar ist und der Fix nur geraten wäre,
- ein Ticket eine Design-/Produktentscheidung verlangt (z. B. UX-001/002),
- Tests oder Build aus einem nicht zusammenhängenden Grund rot sind.

## 5. Definition of Done

- [ ] Der dokumentierte Fehler ist behoben (Abnahmekriterien im FIX-Paket).
- [ ] `npm test` und `npm run build` grün.
- [ ] Bei UI: Screenshot vorher/nachher; bei Welt: Galerie geprüft.
- [ ] `BUGS.md` Status + Notiz + Screenshot-Verweis aktualisiert.
- [ ] Keine unrelated Änderungen; keine Datenänderung.
- [ ] Ein Commit/PR pro Fix mit klarer Nachricht.

## 6. Rückmeldung am Ende

Kurz berichten:

- welche IDs gefixt wurden,
- welche Tests/Builds gelaufen sind,
- welche Screenshots/Galeriebilder geprüft wurden,
- was offen oder blockiert ist (mit Grund).

**Wichtig:** Dies ist ein Bugfix-Auftrag. Keine Verbesserungsvorschläge,
keine Redesigns, keine UX-Vorhaben ohne ausdrückliche Freigabe.
