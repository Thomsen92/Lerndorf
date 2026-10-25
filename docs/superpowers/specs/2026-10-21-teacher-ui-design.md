# Lehrerbereich – Überarbeitung (Fassung 2)

**Stand:** 25.10.2026 (Fassung 1 vom 21.10.2026 in der Git-Geschichte) · **Status:** Umfang vom Auftraggeber am 25.10.2026 bestätigt (§2); Details „Entscheidung Claude“. Umsetzungsplan: `docs/superpowers/plans/2026-10-25-teacher-overhaul.md`.

## 1. Ziel

Der Lehrerbereich wird vom langen Formular zur Arbeitsoberfläche: klar getrennte Seiten, ein Blick auf den Spielstand und die Aktivität jedes Schülers, Münzen mit einem Klick (auch für mehrere Schüler und auch am Tablet), ein Tafelmodus für die ganze Klasse ohne Einzelwerte, eine Nachricht ins Dorf, QR-Codes zum Anmelden und eine Nur-ansehen-Ansicht des Dorfs aus Sicht eines Schülers. Der laufende Aufwand bleibt bei höchstens etwa 10 Minuten pro Woche (SCOPE).

## 2. Vorgaben des Auftraggebers

Aus Fassung 1 (21.10.2026, bestätigt): linke Navigation mit Arbeitsseiten, Schülerseite mit Spielstand, Schnellbuchungen **+5, +10, +20, +100, −5, −10** mit genau einem Klick über `adjust_coins` mit automatischem Buchungsgrund, Abzug deaktiviert bei zu wenig Münzen, freie Korrektur und Stempel bleiben, keine Funktion geht verloren, keine Passwörter in Übersichten.

Ergänzt am 25.10.2026 (Vorschläge 1, 3–10 angenommen, 2 abgelehnt):
1. **Aktivität pro Schüler** (Quests diese Woche, zuletzt aktiv, Hinweis bei Inaktivität).
2. *(abgelehnt: Schwierigkeit je Quest. Die alte Aufgaben-Statistik der Wochenaufgaben fällt damit aus der Oberfläche.)*
3. **Mehrere Schüler auf einmal** buchen.
4. **Grund per Knopf** bei Schnellbuchungen.
5. **Rückgängig** nach einer Schnellbuchung.
6. **Tafelmodus** mit Fortschritt der ganzen Klasse, ohne einzelne Münzstände.
7. **Nachricht ins Dorf.**
8. **QR-Code auf den Zugangskärtchen.**
9. **„Als Schüler ansehen“** (nur ansehen).
10. **Kontoauszug je Schüler.**
11. Die **Münzseite** funktioniert auch **am Tablet**; der Rest bleibt PC-orientiert.

## 3. Nicht-Ziele und Anti-Ziele

**Nicht-Ziele:** Noten oder Bewertungen, Ranglisten, Schwierigkeits-Statistik je Quest, Nachrichten an einzelne Schüler, Chat, Bearbeiten von Schülerdörfern durch die Lehrkraft, Export für die Notengebung.

**Anti-Ziele:**
- Die Tafel oder ein Beamerbild zeigt einzelne Münzstände, XP oder Inaktivität (öffentlicher Vergleich, SCOPE).
- Ein versehentlicher Doppelklick bucht doppelt.
- Ein QR-Code legt das Passwort irgendwo ab, wo es nicht hingehört (Server-Logs, Verlauf).
- „Als Schüler ansehen“ kann etwas verändern.

## 4. Seiten und Navigation

Linke, dauerhaft sichtbare Navigation (Textbeschriftungen, aktive Seite mit `aria-current="page"`); Kopfbereich mit Klassenwahl 8a/8b und Abmelden. Die gewählte Klasse und die Seite stehen in der Adresse (`/lehrer/#8a/muenzen`), damit Neuladen und Zurück-Taste funktionieren.

| Seite | Inhalt |
|---|---|
| **Übersicht** | Kennzahlen der Klasse (§5), Nachricht ins Dorf (§10), Knopf „Tafelmodus“ |
| **Schüler** | Tabelle mit Spielstand und Aktivität, Detailbereich (§6) |
| **Münzen & Stempel** | Schnell- und Mehrfachbuchung, Rückgängig, freie Korrektur, Stempel (§7); auch am Tablet |
| **Daily Quests** | der bestehende Bereich (Abdeckung, Importfehler, Vorschau 7 Tage mit Lösungen) |
| **Konten** | anlegen (einzeln/Liste), Zugangskärtchen mit QR (§11), Passwort zurücksetzen, löschen |
| **Dorf & Regeln** | Shop-/Bau-Schalter, Vorlage und Seed, Spielregeln, verkaufte Sachen |

Statusmeldungen gehören zur aktiven Seite (`role="status"`) und bleiben bis zur nächsten Aktion stehen. Bestehende Schutzschritte (Konto löschen, Dorf neu festlegen) bleiben.

## 5. Übersicht

- Schüler gesamt; **Tutorial noch nicht fertig** (Anzahl, Link auf die gefilterte Schülerliste); **nicht aktiv seit 5 Tagen oder mehr** (Anzahl, Link); **Stempel für diese Woche** gebucht für x von y; **Daily Quests** vorhanden bis … oder Warnung (aus `quest_status()`); aktive **Nachricht ins Dorf** mit Bearbeiten.
- Alle Zahlen gelten für die gewählte Klasse. Fehlt eine Datenquelle, steht an ihrer Stelle „nicht verfügbar“, der Rest bleibt sichtbar.

## 6. Schüler

**Tabelle** (alphabetisch, Suche nach Spitzname, Filter „Tutorial offen“ und „nicht aktiv“): Spitzname · Münzen · Grundstück (Nummer, oder „Tutorial: <Schritt>“) · Quests diese Woche (`gelöst / angeboten`, z. B. „12 / 21“) · zuletzt aktiv („heute“, „gestern“, „vor 6 Tagen“) mit Hinweis „seit 6 Tagen nicht aktiv“ ab 5 Tagen · Knopf „Details“ · Knopf „Als Schüler ansehen“. Wenn das XP-Paket vorhanden ist, zusätzlich Level, XP und Serie.

- **Zuletzt aktiv** = spätester Zeitpunkt aus letzter Anmeldung (`auth.users.last_sign_in_at`) und letzter Quest-Antwort. **Quests diese Woche** = gelöste heutige oder nachgeholte Quests mit Tag in der Woche ab Montag (Europe/Berlin) / aktive Quests der Woche bis heute. In Ferienwochen ohne Quests: „Ferien“, kein Inaktivitäts-Hinweis.
- Der Hinweis ist neutral formuliert und nur für die Lehrkraft sichtbar.

**Details** (seitlicher Bereich, die Tabelle bleibt sichtbar): Haus, Garage, Auto, Deko-Plätze mit Gegenstandsnamen; unplatzierte Gegenstände; Tutorial-Schritt; Quests dieser Woche je Tag (gelöst/offen/nachgeholt, Versuche); **Kontoauszug** (letzte 50 Buchungen mit Datum, Betrag mit Vorzeichen, Grund, Notiz). Ladefehler eines Teils werden nur in diesem Teil gemeldet.

Keine Passwörter, keine Pseudo-E-Mail-Adressen.

## 7. Münzen & Stempel (auch am Tablet)

**Schnellbuchung je Zeile:** Spitzname, Münzstand, Knöpfe **+5 +10 +20 +100 −5 −10**. Zugängliche Namen: „20 Münzen zu Lea hinzufügen“, „5 Münzen von Lea abziehen“.

**Grund per Knopf:** Über der Liste eine Auswahl „Grund“: *kein Grund* (Standard), **Mitarbeit**, **Hausaufgabe**, **Hilfsbereit**, **Verhalten**. Der gewählte Grund gilt für die folgenden Klicks, bis er geändert wird. Buchungsnotiz: `Schnellbuchung +10` bzw. `Schnellbuchung +10 · Mitarbeit` (Kontoauszug-Grund bleibt `teacher`).

**Mehrfachbuchung:** Häkchen je Zeile und „alle“; darüber die Leiste „Für <n> markierte: +5 +10 +20 +100“. Abzüge gibt es nur einzeln. Die Buchung gilt für alle oder keinen (eine Server-Funktion, eine Transaktion).

**Schutz und Rückgängig:**
- Während eine Buchung läuft, sind die Knöpfe dieser Zeile (bzw. die Mehrfachleiste) gesperrt; ein Doppelklick bucht nie doppelt.
- Nach Erfolg aktualisiert sich nur die Zeile; die Statuszeile meldet „+10 Münzen für Lea (Mitarbeit)“ mit Knopf **Rückgängig** für 10 Sekunden. Rückgängig bucht den Gegenbetrag mit Notiz `Rückgängig: <ursprüngliche Notiz>`; bei Mehrfachbuchung für alle betroffenen. Scheitert das (zum Beispiel weil der Schüler die Münzen schon ausgegeben hat), erscheint der Grund, nichts wird halb zurückgebucht.
- Abzug deaktiviert, wenn der angezeigte Stand nicht reicht; die Server-Prüfung bleibt maßgeblich. Kein optimistisches Anzeigen.

**Freie Korrektur** (Betrag + Pflichtnotiz) und **Stempel** (Woche = Montag, gebuchte ausgegraut) bleiben wie bisher in eigenen Abschnitten.

**Tablet:** Diese Seite funktioniert ab 768 px Breite im Hoch- und Querformat mit Touch: Knöpfe mindestens 44 × 44 px, Abstände so, dass benachbarte Knöpfe nicht versehentlich getroffen werden, die Navigation klappt unter 1 024 px zu einem Menü-Knopf ein, keine waagrechte Seitenrolle. Die anderen Seiten müssen am Tablet nur benutzbar, nicht optimiert sein.

## 8. Daily Quests

Der bestehende Bereich (`teacher/questsView.ts`) wird unverändert zur eigenen Seite. Die alte „Aufgaben-Statistik“ der Wochenaufgaben verschwindet aus der Oberfläche (Daten und RPC `task_stats` bleiben).

## 9. Tafelmodus

Eigene Vollbild-Ansicht (Knopf „Tafelmodus“ auf der Übersicht, Adresse `/lehrer/#8a/tafel`), große Schrift, für Beamer und digitale Tafel:
- Klassenname und Woche („8a · Woche ab 26.10.“).
- **Quests diese Woche:** Summe der gelösten Quests der Klasse, mit Balken zum Wochenziel = Schüler × angebotene Quests der Woche („312 von 504“).
- **Heute:** gelöste Quests heute.
- **Klassen-Serie 🔥:** Schultage in Folge (Mo–Fr mit aktiven Quests), an denen mindestens die Hälfte der Klasse eine heutige Quest gelöst hat; Ferien und Wochenenden unterbrechen nicht.
- **Wochenpläne:** „Stempel diese Woche: 18“ (nur Anzahl).
- Die aktive **Nachricht ins Dorf**, falls vorhanden.
- **Keine Namen, keine Münzen, keine Einzelwerte.** Aktualisiert sich jede Minute; Knopf „Vollbild“ und „Zurück“ (Escape). Die Navigation ist ausgeblendet, der Kopf zeigt nur die Klasse.

## 10. Nachricht ins Dorf

- Auf der Übersicht: Textfeld (höchstens 140 Zeichen, eine pro Klasse), „Veröffentlichen“, „Entfernen“, optional „gültig bis“ (Datum, Standard 7 Tage).
- Im Schülerspiel: ein Zettel an der Aufgabentafel am Marktplatz (Text als Bild auf dem Zettel) und beim nächsten Einloggen einmal eine Karte „Nachricht von deiner Lehrkraft“ mit dem Text und „OK“ (gesehen-Merker je Nachricht im `localStorage`, mit try/catch). Ist Sir Byte vorhanden (Sir-Byte-Plan), darf er die Karte begleiten, ohne die Nachricht vorzulesen (keine passende Aufnahme).
- Der Text wird nur als Text angezeigt (nie als HTML). Sprache wählt die Lehrkraft.

## 11. Zugangskärtchen mit QR-Code

- Jedes gedruckte Kärtchen (nur direkt nach Anlegen oder Passwort-Zurücksetzen, weil Passwörter nicht gespeichert werden) zeigt zusätzlich einen QR-Code. Er öffnet die Schülerseite mit den Zugangsdaten im **Fragment** der Adresse (`…/#login=<kodiert>`). Das Fragment wird nie an einen Server geschickt.
- Die Anmeldeseite liest das Fragment, entfernt es sofort aus Adresse und Verlauf (`history.replaceState`) und meldet an. Gelingt das nicht, steht der Spitzname im Feld und die Meldung lautet wie bei falscher Eingabe.
- Gleiches Risiko wie das bisherige Papierkärtchen (wer es hat, kann sich anmelden); bei Verlust Passwort zurücksetzen. Hinweis dazu auf der Druckseite.
- QR-Erzeugung im Browser der Lehrkraft mit einer kleinen MIT-Bibliothek, nur im Lehrer-Bundle.

## 12. Als Schüler ansehen

- Öffnet das Klassendorf aus Sicht eines Schülers in einem neuen Tab, **nur ansehen**: Kamera am Grundstück des Schülers, sein Haus als eigenes markiert, Figuren laufen. Ein Band oben: „Ansicht von Lea – nur ansehen“ und „Zurück zum Lehrerbereich“.
- Shop, Bauen, Inventar, Profil, Tutorial, Aufgaben-Lösen und alle Buchungen sind ausgeschaltet. Stattdessen zeigt der Knopf „Aufgaben“ eine Nur-lesen-Liste der heutigen Quests dieses Schülers (gelöst/offen, Versuche).
- Technisch: eigene Lehrer-Server-Funktionen für Mitglieder und Quest-Stand; Schreibfunktionen werden gar nicht erst aufgerufen, und selbst wenn, lehnt der Server sie für die Lehrkraft ab (Rolle `teacher`).

## 13. Daten und Server (Entscheidung Claude)

Eine Migration mit der **nächsten freien Nummer** (`00NN_teacher_overhaul.sql`):
- `teacher_class_pupils(p_class_id text, p_week date) returns setof record`: id, nickname, coins, plot_index, tutorial_step (null = fertig oder nie begonnen → `'not_started'` wenn keine Zeile und kein Haus), last_sign_in_at, last_answer_at, quests_solved_week, quests_offered_week, holiday_week boolean.
- `teacher_pupil_detail(p_player_id uuid)`: slots, unplatzierte Gegenstände, Tutorial-Schritt, Quests der Woche je Tag, Kontoauszug (letzte 50).
- `adjust_coins_many(p_player_ids uuid[], p_delta int, p_note text) returns int`: wie `adjust_coins` (Notiz Pflicht, Ergebnis ≥ 0), alle oder keiner, nur Schülerkonten, keine doppelten Ids; leere Liste → Fehler.
- `class_board(p_class_id text)`: Kennzahlen aus §9.
- Tabelle `class_notices (class_id pk, text ≤ 140, valid_until date, created_by, created_at)`; `set_class_notice(p_class_id, p_text, p_valid_until)` (null = entfernen); Schüler lesen die Zeile ihrer Klasse, solange `valid_until ≥ heute`.
- `teacher_village_members(p_class_id)` wie `village_members()` für die Lehrkraft; `teacher_pupil_quests(p_player_id)` heutige und gestrige Quests des Schülers mit gelöst/Versuche, ohne Lösungen.
- Alle Funktionen: `security definer`, Rollenprüfung Lehrkraft, `revoke … from public, anon`.

## 14. Abnahme

1. Sechs Seiten plus Tafelmodus; Klasse und Seite bleiben beim Neuladen erhalten; keine bisherige Funktion fehlt.
2. Schülertabelle zeigt Münzen, Grundstück oder Tutorial-Schritt, Quests diese Woche, zuletzt aktiv mit Hinweis; Details zeigen Spielstand und Kontoauszug.
3. Jede Schnellbuchung mit einem Klick, mit optionalem Grund; Doppelklick bucht einmal; Rückgängig innerhalb von 10 s; Mehrfachbuchung für markierte Schüler in einer Transaktion.
4. Münzseite auf dem Tablet im Hoch- und Querformat bedienbar.
5. Tafelmodus zeigt nur Klassenwerte, keine Namen oder Münzen.
6. Nachricht erscheint als Zettel an der Tafel und einmal als Karte beim Einloggen.
7. QR-Code meldet an; danach steht das Passwort nicht mehr in der Adresse.
8. „Als Schüler ansehen“ zeigt das Dorf des Schülers und kann nichts verändern.

## 15. Offen (mit Standardwert umsetzen)

| # | Frage | Standard |
|---|---|---|
| 1 | Gründe der Schnellbuchung | Mitarbeit, Hausaufgabe, Hilfsbereit, Verhalten (in einer Liste im Code) |
| 2 | Inaktivitäts-Schwelle | 5 Tage |
| 3 | Klassen-Serie-Schwelle | die Hälfte der Klasse |
| 4 | Gültigkeit der Nachricht | 7 Tage |
