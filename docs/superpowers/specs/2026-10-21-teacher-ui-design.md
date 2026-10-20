# Lehrerbereich – PC-orientierte UI-Überarbeitung

**Stand:** 21.10.2026  
**Status:** Grundrichtung vom Auftraggeber bestätigt; schriftliche Prüfung steht aus.

## 1. Ziel

Der Lehrerbereich soll auf einem PC schnell bedienbar und übersichtlich sein. Die lange, vertikal gestapelte Seite wird in klar getrennte Arbeitsbereiche aufgeteilt. Lehrkräfte können feste Münzbeträge direkt per Knopfdruck buchen und auf einer eigenen Schülerseite den relevanten Spielstand jedes Schülers überblicken.

Dieses Design beschreibt Bedienabläufe und Informationsstruktur. Die visuelle Gestaltung bleibt zunächst offen. Der Anwendungscode und die Datenbank werden durch dieses Dokument nicht geändert.

## 2. Projektkontext

- `web/src/teacher/teacherView.ts` rendert derzeit Klassenwahl, Übersicht, Stempel, Konten, Münzkorrektur, Schalter, Dorfeinstellungen und Aufgabenstatistik untereinander auf einer Seite.
- Die aktuelle Übersicht zeigt Spitzname, Münzstand und Grundstück.
- Münzänderungen verwenden die RPC `adjust_coins`. Sie erfordert einen Buchungsgrund, verhindert ungültige Kontostände und schreibt in den Kontoauszug.
- Lehrkräfte können über RLS aktuelle Profile und Kontodaten lesen. Inventar und Grundstücksplatzierungen werden in eigenen Tabellen verwaltet.
- Der Lehrerbereich ist eine von der Schüleransicht getrennte PC-Seite. Dieses Vorhaben priorisiert Maus und Tastatur am PC; Tablet- und Smartphone-Layouts sind kein Gestaltungsziel.

## 3. Seitenstruktur und Navigation

Ein dauerhaft sichtbares linkes Navigationsmenü teilt den Lehrerbereich in Arbeitsseiten:

1. **Übersicht** – kurze Zusammenfassung der gewählten Klasse und Einstieg in häufige Arbeitsbereiche.
2. **Schüler** – Tabelle und Detailansichten zum Spielstand einzelner Schüler.
3. **Münzen & Stempel** – Schnellbuchungen, manuelle Münzkorrekturen und Stempelvergabe.
4. **Konten** – einzelne und gebündelte Kontoanlage, Zugangskarten, Passwort zurücksetzen und Konto löschen.
5. **Dorf & Regeln** – Dorfvorlage, Seed, Klassenregeln, Shop- und Baumodus-Schalter.
6. **Aufgaben** – vorhandene Aufgabenstatistik und spätere Lernberichte.

Klassenwechsel und Abmelden bleiben im Kopfbereich sichtbar. Beim Wechsel zwischen Seiten bleibt die ausgewählte Klasse erhalten. Der aktive Navigationspunkt ist eindeutig markiert und auch programmatisch erkennbar.

## 4. Schülerübersicht

Die Seite **Schüler** zeigt eine alphabetisch sortierte, durchsuchbare Tabelle. Ihre erste Ansicht enthält:

- Spitzname,
- aktuellen Münzstand,
- Grundstücksnummer oder Hinweis, dass noch kein Grundstück zugewiesen ist,
- Haus und Garage,
- platzierte Autos und Deko,
- Anzahl beziehungsweise Liste der unplatzierten Inventargegenstände.

Eine Schülerzeile lässt sich öffnen und zeigt die Details desselben Spielstands, ohne die Klassenübersicht zu verlassen. Gespeicherte Passwörter, Zugangsdaten und andere nicht erforderliche Geheimnisse werden nicht angezeigt. Neue pädagogische Kennzahlen werden nur aufgenommen, wenn sie für die Lehrkraft verfügbar und fachlich eindeutig sind; diese Änderung erfindet keine individuellen Quizwerte aus Klassensummen.

Die Ansicht nutzt vorhandene Profildaten, Inventar, Slots/Platzierungen und Asset-Namen. Falls Inventar- oder Platzierungsdaten nicht geladen werden können, bleiben Schülername und Münzstand sichtbar und der Datenfehler wird getrennt ausgewiesen.

## 5. Münzen und Stempel

### Schnellbuchung pro Schüler

Auf **Münzen & Stempel** zeigt eine Schülerliste je Zeile Spitzname und aktuellen Münzstand. Daneben stehen die festen Aktionen:

- **+5**, **+10**, **+20**, **+100** Münzen,
- **−5**, **−10** Münzen.

Ein Klick auf eine klar beschriftete Aktion bucht den angezeigten Betrag sofort für genau diesen Schüler. Eine zusätzliche Betragseingabe oder eine separate Bestätigung ist bei diesen ausdrücklich bezifferten Knöpfen nicht erforderlich. Die Aktion sendet den eindeutigen Schülerbezug und Betrag an die vorhandene `adjust_coins`-RPC. Als erforderlicher Buchungsgrund wird automatisch ein verständlicher Eintrag wie „Lehrkraft-Schnellbuchung +20“ übergeben; der Kontoauszug enthält weiterhin Zeit und Lehrkraftkonto.

Ein Abzug ist deaktiviert, wenn der angezeigte Kontostand dafür nicht reicht. Die RPC bleibt die maßgebliche Prüfung, damit auch bei parallelen Änderungen kein negativer Kontostand entsteht. Nach erfolgreicher Buchung aktualisiert sich die betreffende Zeile unmittelbar; Fehler werden in einer verständlichen Statusmeldung gezeigt und ändern den angezeigten Stand nicht optimistisch.

### Manuelle Korrektur und Stempel

Die bestehende manuelle Münzkorrektur bleibt für frei gewählte Beträge erhalten und verlangt weiterhin eine eigene Notiz. Stempelbuchung behält die bestehende Montags-/Wochenlogik. Diese Funktionen liegen auf derselben Arbeitsseite, aber in getrennten, eindeutig überschriebenen Bereichen.

## 6. Bestehende Lehrerfunktionen

Die Neustrukturierung verschiebt die vorhandenen Funktionen in passende Bereiche, statt sie zu entfernen:

- Kontoanlage und Zugangskarten unter **Konten**,
- Passwortzurücksetzung und Kontolöschung ebenfalls unter **Konten**,
- Shop-/Baumodus-Schalter, Dorfvorlage und Spielregeln unter **Dorf & Regeln**,
- Aufgabenstatistik unter **Aufgaben**.

Klassenwahl bleibt global sichtbar. Status- und Fehlermeldungen gehören zur aktiven Arbeitsseite und bleiben bis zur nächsten Aktion verständlich sichtbar.

## 7. PC-Bedienbarkeit und Zugänglichkeit

- Die linke Navigation bietet gut lesbare Textbeschriftungen und eine eindeutige aktive Seite.
- Schnellbuchungen sind mit Maus und Tastatur bedienbar. Ihre zugänglichen Namen nennen Schüler, Richtung und Betrag, beispielsweise „20 Münzen zu testa hinzufügen“.
- Tabellen haben semantische Spaltenüberschriften. Schülerdetails werden über einen echten Button oder Link geöffnet, nicht über einen unbeschrifteten Klickbereich.
- Tastaturfokus ist sichtbar; Tab-Reihenfolge folgt der inhaltlichen Reihenfolge. Statusmeldungen nach Buchungen sind programmatisch erkennbar.
- Erfolg und Fehler werden nicht ausschließlich über Farbe unterschieden. Die Beträge mit Vorzeichen bleiben im Text sichtbar.
- Für Aktionen mit größerer Auswirkung, etwa Konto löschen oder Dorf neu anordnen, bleiben die bestehenden Schutz- und Bestätigungsschritte erhalten.

## 8. Datenfluss, Sicherheit und Fehlerverhalten

Die neue Navigation ändert keine Berechtigungen. Profil-, Inventar- und Platzierungsdaten werden nur im authentifizierten Lehrerbereich geladen. Münzen werden ausschließlich über `adjust_coins` verändert; Tabellen werden nicht direkt beschrieben. Der automatische Buchungsgrund erfüllt die bestehende RPC-Anforderung und kennzeichnet Schnellaktionen nachvollziehbar.

Wenn eine Buchung abgelehnt wird – etwa bei unzureichendem Kontostand, abgelaufener Sitzung oder Verbindungsfehler – wird kein lokaler Erfolg vorgetäuscht. Die Lehrkraft sieht eine Fehlermeldung und kann erneut laden oder versuchen. Bei erfolgreicher Buchung wird nur die betroffene Tabellenzeile aktualisiert.

## 9. Abnahmekriterien für eine spätere Umsetzung

1. Der Lehrerbereich bietet sechs getrennte Navigationsseiten und zeigt immer, welche Klasse aktiv ist.
2. Die bisherige vertikale Gesamtliste ist in die passenden Seiten aufgeteilt; keine vorhandene Lehrerfunktion geht dabei verloren.
3. Die Schülerseite zeigt für jeden Schüler Münzen, Grundstück, platzierte Gegenstände und Inventar in einer durchsuchbaren Übersicht mit Detailzugriff.
4. Auf der Münzseite kann jede der sechs festen Buchungen mit genau einem Klick auf den Knopf des gewünschten Schülers ausgelöst werden.
5. Jede Schnellbuchung wird über `adjust_coins` ausgeführt und erhält einen verständlichen automatisch erzeugten Buchungsgrund im Kontoauszug.
6. Abzüge, die den sichtbaren Kontostand übersteigen, sind deaktiviert; die Serverprüfung verhindert ungültige Buchungen auch bei parallelen Änderungen.
7. Bei Buchungsfehlern bleiben der angezeigte Kontostand und der Kontoauszug unverändert; der Fehler wird klar gemeldet.
8. Freie Münzkorrekturen mit eigener Pflichtnotiz und die vorhandene Stempelvergabe bleiben verfügbar.
9. Tabellen, Navigation und Buchungsaktionen funktionieren mit Maus und Tastatur; Statusmeldungen sind zugänglich.
10. Zugangsdaten und Passwörter erscheinen in keiner Schülerübersicht.

## 10. Bewusst offen gelassen

- Die endgültige visuelle Gestaltung, Farbgebung, Icons und Abstände.
- Ob Schülerdetails als seitliches Detailfeld oder als eigene Unterseite erscheinen; die Umsetzungsplanung wählt die einfachere Variante, solange die Klassenübersicht leicht wieder erreichbar bleibt.
- Zusätzliche Lernverlaufskennzahlen pro Schüler. Sie werden nur ergänzt, wenn die Datenquelle individuelle und verlässliche Werte bereitstellt.

Diese offenen Punkte ändern weder die bestätigte PC-Navigation noch die sechs Schnellbuchungsbeträge oder den Umfang der ersten Schülerübersicht.
