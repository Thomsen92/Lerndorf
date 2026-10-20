# Daily Quests für Lerndorf – Design

**Stand:** 20.10.2026  
**Status:** Die Designabschnitte wurden in der Unterhaltung bestätigt. Die schriftliche Prüfung durch den Auftraggeber steht noch aus.

## 1. Ziel und Abgrenzung

Daily Quests sind kurze Englischaufgaben, mit denen Schülerinnen und Schüler Münzen verdienen. Sie ersetzen das bisherige wöchentliche Aufgabensystem vollständig; beide Systeme laufen nicht parallel. Der physische Wochenplan bleibt außerhalb der App. Claude erstellt auf Grundlage des aktuellen Lernstoffs wöchentlich ein strukturiertes Quest-Paket im Lerndorf-Repository.

Dieses Dokument beschreibt das freigegebene Produkt- und Datenflussdesign. Es ändert noch keine Anwendung, Datenbank, Pipeline oder bestehende Aufgaben.

## 2. Bestätigte Entscheidungen

- Pro Kalendertag gibt es drei neue, kurze Quests.
- Alle Klassen erhalten dasselbe Quest-Paket.
- Die Woche umfasst Montag bis Sonntag. Auch Samstag und Sonntag haben Aufgaben.
- Der Tageswechsel und die Freischaltung richten sich nach Mitternacht in `Europe/Berlin`.
- Claude erstellt die wöchentlichen Inhalte als strukturierte Datei im Lerndorf-Projekt-Repository.
- Ein Commit oder Merge in den Hauptbranch löst automatische Validierung und Import aus. Es gibt keine manuelle Lehrkraftfreigabe.
- Die Tagespakete werden vor ihrem Datum importiert, bleiben aber bis zu ihrem Datum verborgen.
- Bei fehlendem oder technisch ungültigem Paket gibt es für den betreffenden Tag keine neuen Quests; die Lehrkraft erhält einen Hinweis im Lerndorf-Lehrerbereich.
- Erlaubte Formate: Multiple Choice, Lückentext, Zuordnen, Satz ordnen und Listening.
- Listening wird von Lerndorf per Text-to-Speech vorgelesen.
- Bei falscher Antwort sieht der Schüler einen kurzen Hinweis auf Englisch. Die richtige Lösung bleibt verborgen.
- Versuche sind unbegrenzt. Münzen werden je Quest nur einmal beim ersten richtigen Abschluss vergeben.
- Nicht erledigte Quests bleiben am Folgetag zusätzlich als Nachholaufgaben offen. Sie geben die halbe Belohnung, aufgerundet, und verfallen anschließend.
- Neue Tagesquests und Nachholquests sind parallel verfügbar; damit können bis zu sechs Aufgaben gleichzeitig offen sein.
- Es gibt keine zusätzliche Münzobergrenze pro Tag. Die Anzahl der Aufgaben begrenzt die Anzahl der Belohnungsmöglichkeiten; die Höhe je Aufgabe wird individuell im Paket festgelegt.

## 3. Gewählter Daten- und Veröffentlichungsweg

Die Datei im Repository ist die nachvollziehbare Quelle des Wocheninhalts. Vorgeschlagener Pfad:

```text
content/daily-quests/<montag-der-woche>.json
```

Zum Beispiel `content/daily-quests/2026-11-09.json`. Der Inhalt wird als Wochenpaket mit sieben Tagespaketen gespeichert. Nach Commit oder Merge in den Hauptbranch prüft die Import-Pipeline das ganze Paket. Nur ein vollständig gültiges Paket wird übernommen. Die sieben Tagespakete werden anhand ihres Datums einzeln freigeschaltet.

Die vorhandene wöchentliche Aufgabentafel und deren Veröffentlichungsregeln werden bei einer späteren Implementierung durch die Daily-Quest-Anzeige ersetzt. Altes Wochenaufgabenverhalten wie ein Versuchslimit oder ein tägliches Münzlimit gilt für Daily Quests nicht.

## 4. Inhalt eines Tagespakets

Jedes Wochenpaket enthält genau sieben Kalendertage (Montag bis Sonntag), und jeder Tag enthält genau drei Aufgaben. Die Aufgaben gelten identisch für alle Klassen.

Jede Aufgabe benötigt mindestens:

- eine innerhalb des Wochenpakets eindeutige ID,
- ein unterstütztes Aufgabenformat,
- englischen Aufgabentext,
- alle für Darstellung und Antwortprüfung nötigen Daten,
- eine oder mehrere hinterlegte richtige Lösungen,
- einen kurzen englischen Hinweis für falsche Antworten,
- eine positive ganzzahlige Münzbelohnung.

Listening-Aufgaben benötigen zusätzlich den englischen Text, den das Gerät vorliest. Lerndorf verwendet eine verfügbare englische Browser-Stimme; falls keine englische Stimme verfügbar ist, wird der Text sichtbar angezeigt und die Aufgabe bleibt lösbar. Als Sprachwahl wird `en-GB` bevorzugt, andernfalls wird eine andere verfügbare englische Stimme verwendet.

Der konkrete JSON-Schema-Vertrag wird vor der Implementierung festgelegt und muss alle Aufgabentypen eindeutig beschreiben. Das Beispiel ist bewusst ein Paketformat und kein verbindliches Feldschema.

Für Ergebnisse und Münzbuchungen wird die Quest-ID zusammen mit dem Aufgabedatum verwendet. Dadurch bleibt die Kennung auch über mehrere Wochenpakete eindeutig.

## 5. Schülerablauf und Belohnungen

Die Daily-Quest-Ansicht zeigt die drei Aufgaben des aktuellen Kalendertags. Zusätzlich zeigt sie offene Nachholaufgaben vom Vortag klar als solche markiert. Jede Quest zeigt ihren Münzwert; Nachholquests zeigen die halbierte, aufgerundete Belohnung.

Bei falscher Antwort bleibt die Aufgabe offen und zeigt einen kurzen Hinweis auf Englisch. Die richtige Lösung wird nicht offengelegt. Weitere Versuche sind möglich. Beim ersten richtigen Abschluss wird die Quest als gelöst markiert und die Münzbelohnung genau einmal verbucht. Weitere Aufrufe oder erneutes Absenden derselben Antwort dürfen keine zweite Gutschrift auslösen.

Für eine Nachholquest gilt weiterhin dieselbe einmalige Abschlussregel. Die Belohnung entspricht `ceil(reward / 2)`. Eine am Folgetag nicht gelöste Quest verfällt beim darauffolgenden Tageswechsel.

## 6. Validierung und Fehlerbehandlung

Die automatische Prüfung ist technisch, nicht pädagogisch. Sie prüft mindestens:

1. Datei ist gültiges JSON und entspricht dem vereinbarten Schema.
2. Wochenbeginn ist ein Montag; genau sieben aufeinanderfolgende Daten folgen.
3. Jeder Tag enthält genau drei Aufgaben.
4. Jede Aufgabe hat eine eindeutige ID, einen unterstützten Typ, Aufgabentext, Antwortdaten, Lösung, englischen Hinweis und positive ganzzahlige Belohnung.
5. Listening-Aufgaben haben einen nichtleeren Vorlesetext.
6. Aufgabentypen enthalten die für die Darstellung erforderlichen Felder; beispielsweise passen Antwortoptionen und Lösung bei Multiple Choice zusammen.

Der Import erfolgt als Ganzes oder gar nicht. Teilweise gültige Wochen werden nicht veröffentlicht. Eine technisch gültige Datei kann trotzdem einen fachlichen oder didaktischen Fehler enthalten; die automatische Prüfung kann dies nicht zuverlässig ausschließen.

Bei fehlendem oder ungültigem Paket:

- werden für betroffene Daten keine neuen Quests angezeigt,
- bleiben gültige Nachholquests vom Vortag bis zu ihrem Ablaufdatum verfügbar,
- wird ein Importstatus gespeichert, damit der Lehrerbereich einen klaren Hinweis anzeigen kann,
- wird nach einem späteren erfolgreichen Import der Fehlerhinweis aktualisiert oder entfernt.

## 7. Münzsicherheit und Datensicherheit

Münzen und Lösungsprüfung bleiben serverseitig. Der Client erhält die Lösung nicht vor einem erfolgreichen Abschluss. Die Import-Pipeline trennt sichtbare Aufgabendaten von geschützten Lösungen. Die Antwortprüfung und Buchung laufen über eine serverseitige Funktion beziehungsweise RPC.

Die Gutschrift muss idempotent sein: Für einen Schüler und eine Quest kann maximal eine positive Buchung entstehen. Das gilt auch bei wiederholten Anfragen, Verbindungsabbrüchen oder der Anzeige derselben Aufgabe als Nachholquest am Folgetag. Jede Buchung referenziert die eindeutige Quest-ID im bestehenden Münzjournal.

## 8. Abnahmekriterien für eine spätere Umsetzung

1. Ein vollständiges Paket mit sieben Tagen und je drei Aufgaben wird beim Merge in den Hauptbranch automatisch geprüft und importiert.
2. Aufgaben werden vor ihrem Kalenderdatum nicht angezeigt und ab 00:00 `Europe/Berlin` freigeschaltet.
3. Schüler aller Klassen sehen dasselbe Tagespaket; Wochenenden sind eingeschlossen.
4. Die fünf freigegebenen Aufgabentypen sind darstellbar und lösbar; Listening kann vorgelesen werden und bleibt bei fehlender englischer Gerätestimme durch sichtbaren Text lösbar.
5. Schüler können unbegrenzt versuchen; falsche Antworten zeigen einen kurzen englischen Hinweis, richtige Lösungen bleiben verborgen.
6. Richtige Antworten schreiben die individuelle Belohnung genau einmal gut.
7. Nachholquests bleiben genau einen weiteren Kalendertag verfügbar, zahlen `ceil(reward / 2)` und verfallen danach.
8. Eine ungültige oder fehlende Datei erzeugt keine Teilveröffentlichung und zeigt einen verständlichen Hinweis im Lehrerbereich.
9. Keine Lösung wird vor dem Abschluss an den Browser ausgeliefert; wiederholte Requests können keine doppelte Gutschrift erzeugen.
10. Der alte Wochenaufgabenablauf wird nicht parallel zur Daily-Quest-Oberfläche angezeigt.

## 9. Noch vor Umsetzung festzulegen

- Das vollständige JSON-Schema einschließlich Feldnamen, IDs und Antwortstruktur je Aufgabentyp.
- Welche konkrete Browser-Stimme für `en-GB` genutzt wird, sofern mehrere Stimmen verfügbar sind; die in Abschnitt 4 beschriebene Fallback-Regel gilt als Startstandard.
- Wie mit bereits importierten Wochen umgegangen wird, wenn eine spätere Änderung derselben Datei in den Hauptbranch gemergt wird (z. B. Korrektur einer Aufgabe oder eines Münzwerts nach Freischaltung).
- Wie bereits vorhandene Wochenaufgaben-Ergebnisse historisch aufbewahrt werden, wenn das alte Aufgabenmodell später ersetzt wird.

Diese offenen Punkte sind Implementierungsentscheidungen und ändern die bestätigten Produktregeln nicht.
