# Erststart-Tutorial für Lerndorf – Design

**Stand:** 21.10.2026  
**Status:** Die drei Designabschnitte wurden in der Unterhaltung bestätigt. Die schriftliche Prüfung dieses Dokuments steht noch aus.

## 1. Ziel

Jeder Schüler durchläuft beim ersten Spiele-Login ein kurzes, geführtes Tutorial, das die Dorfwelt emotional einführt und unmittelbar zum Englischlernen führt. Der Schüler erhält fünf einfache Einstiegsfragen, verdient einmalig 50 Münzen, kauft damit das erste richtige Haus und übt, es selbst auf dem Grundstück zu platzieren.

Das Tutorial ist in die bestehende Dorfansicht integriert. Es ändert noch keine Anwendung, Datenbank oder Spielinhalte. Bezüge zu den Daily Quests folgen dem bestätigten Entwurf in [Daily Quests für Lerndorf](2026-10-20-daily-quests-design.md): drei normale Tagesquests plus die einmalige Tutorial-Quest.

## 2. Projektkontext

- Lerndorf ist ein browserbasiertes 3D-Spiel für die Klassen 8a und 8b, auch auf geteilten Schul-Tablets. UI-Sprache ist Deutsch, Englischaufgaben sind auf Englisch.
- Nach erfolgreichem Login wechselt `web/src/main.ts` direkt in `mountVillage`.
- Neue Profile starten derzeit ohne Grundstück (`profiles.plot_index = null`). Sie wählen ein Grundstück beim ersten Besuch manuell durch Antippen.
- Die Dorfansicht zeigt Haus- und Garagen-Sockel. Ohne Platzierung erscheinen die aktuellen Starter-Modelle `house_fachwerk` und `garage_holz`; `house_fachwerk` ist derzeit kostenlos und als Starter markiert.
- Der reguläre Hauskauf läuft über `buy_item`; die Platzierung erfolgt getrennt über `place_in_slot`. Shop und Baumodus lassen sich für eine Klasse unabhängig schließen.
- Mitschüler sehen die Grundstücks-Sockel der anderen Profile.

Das Tutorial ersetzt für neue bzw. noch nicht eingewiesene Schüler die manuelle Grundstückswahl und den bisherigen kostenlosen Haus-Fallback. Die bestehenden Shop- und Platzierungsabläufe bleiben für alle späteren Käufe und Bauaktionen bestehen.

## 3. Bestätigte Entscheidungen

- Das Tutorial erscheint für jedes Schülerkonto, das den Erststart noch nicht abgeschlossen hat, auch wenn das Konto bereits vor Einführung des Features angelegt wurde.
- Beim ersten Spiele-Login weist Lerndorf serverseitig automatisch ein freies Grundstück zu.
- Die Eröffnungsfahrt zeigt die Welt und endet am eigenen Grundstück. Sie dauert ungefähr 5–8 Sekunden und ist nicht überspringbar.
- Bei aktivierter Einstellung „Bewegung reduzieren“ zeigt die Fahrt dieselben Stationen ruhiger und kürzer.
- Bis zum Hauskauf steht dort eine echte Wellblech-Baracke. Mitschüler sehen sie ebenfalls; sie verschwindet erst, wenn das neue Haus platziert wurde.
- Vor der Avatarwahl verwendet die Eröffnung einen neutralen Beispiel-Avatar. Nach der Auswahl ersetzt ihn der gewählte Avatar.
- Zur Auswahl stehen zehn vorgefertigte Start-Avatare.
- Nach der Avatarwahl erklären kurze deutsche UI-Nachrichten nur Daily Quests und Münzen. Jede Nachricht bleibt bis zum Antippen von „Weiter“ sichtbar.
- Die einmalige Tutorial-Quest besteht aus fünf festen, einfachen Englischfragen. Sie ist zusätzlich zu den drei normalen Daily Quests.
- Für falsche Antworten gelten die bestehenden Daily-Quest-Regeln: unbegrenzte Versuche, kurzer englischer Hinweis, Lösung bleibt verborgen.
- Nach fünf richtigen Antworten erhält der Schüler einmalig 50 Münzen.
- Das vorhandene Fachwerkhaus wird zum festen Tutorial-Haus und kostet 50 Münzen.
- Der Kauf des Tutorial-Hauses ist verpflichtend, aber bleibt getrennt vom Platzieren. Der Kauf bleibt auch bei geschlossenem Klassenshop möglich.
- Der Schüler muss anschließend selbst das Fachwerkhaus im Haus-Sockel platzieren. Dieser eine geführte Platzierungsschritt bleibt auch bei geschlossenem Baumodus möglich; andere Shop- und Bauaktionen bleiben gesperrt.
- Nach dem erfolgreichen Platzieren erscheint das Fachwerkhaus für Mitschüler anstelle der Baracke.
- Danach zoomt die Kamera auf den Avatar. Er winkt glücklich und sagt: „Jetzt wird gelernt und Dailys gemacht!“ Anschließend öffnet Lerndorf direkt die Daily-Quest-Ansicht.
- Bei Logout oder Abbruch wird das Tutorial beim nächsten Login am zuletzt gespeicherten Schritt fortgesetzt.
- Bereits gespeicherter Avatar- und Grundstücksfortschritt wird nicht überschrieben; bereits erfüllte Schritte werden übersprungen.

## 4. Ablauf

### 4.1 Login und Grundstück

Nach dem ersten erfolgreichen Schüler-Login prüft Lerndorf den serverseitigen Tutorialstatus. Ist das Tutorial nicht abgeschlossen, startet die geführte Erststart-Ansicht. Vor der Kamerafahrt vergibt ein serverseitiger Vorgang atomar einen freien Grundstücksplatz. So können gleichzeitige Logins nicht denselben Platz beanspruchen.

### 4.2 Kamerafahrt und Begrüßung

Die bestehende Dorfwelt wird einmal aufgebaut und die Kamera fährt in etwa 5–8 Sekunden über die Welt bis zum zugewiesenen Grundstück. Der Schüler kann die Fahrt nicht überspringen. Mit `prefers-reduced-motion` bleiben dieselben Stationen erkennbar, die Bewegung wird aber kürzer und ruhiger.

Am Grundstück steht eine einfache, heruntergekommene Wellblech-Baracke im Haus-Sockel. Davor steht ein neutraler Beispiel-Avatar, winkt und blickt anschließend traurig zum Haus; eine traurige Sprechblase vermittelt die Situation ohne zusätzliche Erklärtexte. Die Baracke ist die sichtbare Darstellung eines noch nicht begonnenen Tutorials, kein kaufbares Haus und kein Shop-Gegenstand.

### 4.3 Avatar und kurze Erklärung

Der Schüler wählt einen von zehn Start-Avataren. Die Auswahl speichert ein Avatar-Rezept im Profil und ersetzt die neutrale Beispiel-Figur. Profile mit bereits gespeicherter Avatarwahl behalten diese; die Auswahl wird dann übersprungen.

Es folgen kurze deutsche Nachrichten zu zwei Themen: Daily Quests und Münzen. Jede Nachricht wird einzeln gezeigt und erst durch „Weiter“ fortgesetzt. Andere Funktionen wie Kamera-Bedienung, Shop-Kategorien oder Grundstücks-Dekoration werden hier nicht erklärt.

### 4.4 Tutorial-Quest

Die fünf festen Fragen sind eine einmalige, vom Wochenpaket unabhängige Lernaufgabe. Sie werden der Reihe nach beantwortet. Falsche Antworten zeigen jeweils einen knappen Hinweis auf Englisch, ohne die richtige Lösung zu verraten; unbegrenzt viele Versuche sind möglich.

Nach der fünften richtigen Antwort schreibt der Server 50 Münzen einmalig gut. Die Gutschrift ist unabhängig von den regulären Tagesquests und deren Tagesregeln. Wiederholte Requests oder ein erneutes Laden der Seite können sie nicht verdoppeln.

### 4.5 Hauskauf und Platzierung

Nach der Münzgutschrift öffnet sich der geführte Kaufdialog für genau das Fachwerkhaus zum Preis von 50 Münzen. Während dieses Tutorial-Schritts darf dieses eine Haus auch dann gekauft werden, wenn der Klassenshop geschlossen ist. Das Haus wird wie vorgesehen zunächst dem Inventar gutgeschrieben.

Danach öffnet Lerndorf den geführten Baumodus. Er hebt das Fachwerkhaus im Inventar und den Haus-Sockel hervor. Der Schüler wählt das Haus und platziert es selbst. Bis der Server die Platzierung bestätigt, bleibt die Baracke sichtbar. Erst die bestätigte Platzierung ersetzt sie für alle Schüler der Klasse.

Falls Kauf oder Platzierung wegen eines Verbindungsfehlers scheitert, bleibt der zuletzt bestätigte Schritt gespeichert und der Schüler kann es erneut versuchen. Der Kauf darf nicht doppelt berechnet werden; eine bereits gekaufte Tutorial-Hauskopie bleibt verfügbar.

### 4.6 Abschluss und Übergang

Nach der Platzierung fährt die Kamera näher an den ausgewählten Avatar. Der Avatar winkt glücklich und zeigt die Abschlusszeile „Jetzt wird gelernt und Dailys gemacht!“. Lerndorf öffnet danach die Daily-Quest-Ansicht. Wenn für den aktuellen Tag kein gültiges Daily-Quest-Paket vorliegt, greift deren eigener Fehlerzustand: Es werden keine neuen Quests gezeigt und die Lehrkraft sieht einen Hinweis im Lehrerbereich.

## 5. Fortschritt, Sicherheit und Wiederaufnahme

Der Tutorialstatus wird pro Profil serverseitig gespeichert. Er enthält den aktuellen Abschnitt, den Fortschritt der fünf Fragen, den Status der Münzgutschrift, den Hauskauf, die Platzierung und den Abschluss. Browser-Speicher ist nicht maßgeblich, da mehrere Schüler dasselbe Tablet verwenden.

Der Client darf weder Tutorialstatus, korrekte Lösungen, Münzgutschrift noch Hausbesitz selbst festlegen. Antworten, Belohnung und Kauf werden serverseitig geprüft und verbucht. Die 50 Münzen werden nach allen fünf richtigen Antworten atomar und einmalig gutgeschrieben. Der Hauskauf zieht 50 Münzen über den bestehenden Münzbuchungsweg ab. Die Platzierung wird über die vorhandene Slotlogik im Haus-Sockel gespeichert.

Der besondere Kauf- und Platzierungszugriff ist eng begrenzt: Er gilt nur für das Fachwerkhaus und nur für den angemeldeten Schüler, dessen Tutorial gerade den jeweiligen Schritt erfordert. Er schaltet weder den restlichen Shop noch den restlichen Baumodus frei.

## 6. Änderungen am bestehenden Produkt bei späterer Umsetzung

Die Umsetzung wird voraussichtlich folgende vorhandene Abläufe betreffen:

- `web/src/main.ts`: nach dem Login erst den Tutorialstatus prüfen und abhängig davon Dorf oder Erststart öffnen.
- Grundstücksvergabe: die manuelle Grundstücksauswahl im Erststart durch eine atomare automatische Zuweisung ersetzen.
- Grundstücksdarstellung: den bisherigen Fallback `house_fachwerk` vor dem Kauf durch die Wellblech-Baracke ersetzen und den Status allen Mitschülern sichtbar machen.
- Shop-Katalog: `house_fachwerk` von kostenlosem Starterhaus auf ein kaufbares Tutorial-Haus für 50 Münzen umstellen.
- Serverfunktionen: Tutorialstatus, fünf Antwortschritte und einmalige 50-Münzen-Belohnung serverseitig verwalten; begrenzte Ausnahmen für den Tutorial-Kauf und die Hausplatzierung unterstützen.
- UI: Kamerafahrt, Avatar-Preset-Auswahl, Nachrichten, Quiz und geführte Schritte im bestehenden Dorfkontext integrieren.

Die tatsächliche Migration und Ablösung des aktuellen Haus-Fallbacks ist Teil einer späteren Umsetzungsplanung und nicht Teil dieses Dokuments.

## 7. Abnahmekriterien

1. Ein Schülerkonto ohne abgeschlossenen Erststart erhält beim ersten Spiele-Login automatisch genau ein freies Grundstück.
2. Nach dem Login läuft die nicht überspringbare Kamerafahrt bis zur eigenen Baracke; sie dauert im Normalfall etwa 5–8 Sekunden und berücksichtigt „Bewegung reduzieren“.
3. Mitschüler sehen die Wellblech-Baracke auf einem unvollständigen Grundstück. Sie bleibt dort bis zur bestätigten Platzierung eines Hauses.
4. Die Avatarwahl bietet zehn vorgefertigte Start-Avatare; eine vorhandene gespeicherte Wahl wird nicht überschrieben.
5. Die deutschen Nachrichten behandeln ausschließlich Daily Quests und Münzen; jede wird manuell mit „Weiter“ bestätigt.
6. Die einmalige Tutorial-Quest hat genau fünf einfache Englischfragen und ist getrennt von den drei normalen Tagesquests.
7. Falsche Antworten zeigen einen englischen Hinweis und lassen weitere Versuche zu. Lösungen bleiben bis zum erfolgreichen Abschluss verborgen.
8. Nach fünf richtigen Antworten gibt es genau eine Gutschrift über 50 Münzen; wiederholte Anfragen erzeugen keine weitere Gutschrift.
9. Das feste Fachwerkhaus kostet 50 Münzen und kann im vorgesehenen Tutorial-Kaufschritt auch bei geschlossenem Shop erworben werden.
10. Der Schüler muss das Fachwerkhaus selbst im Haus-Sockel platzieren. Bei geschlossenem Baumodus ist ausschließlich dieser Tutorial-Schritt erlaubt.
11. Nach bestätigter Platzierung sehen alle Mitschüler das Fachwerkhaus statt der Baracke.
12. Nach dem glücklichen Avatar-Moment öffnet sich die Daily-Quest-Ansicht.
13. Ein Abbruch setzt beim nächsten Login an der zuletzt bestätigten Tutorialstufe fort; Belohnung und Kauf bleiben einmalig.
14. Profile, Münzen und Hausplatzierungen können nicht durch direkte Client-Änderungen manipuliert werden.

## 8. Noch zu prüfen oder auszuarbeiten

- Die fünf konkreten Einstiegsfragen und ihre Hinweise werden als eigener Inhalt festgelegt; dieses Design setzt noch keine Fragen fest.
- Die genauen zehn Avatar-Rezepte werden aus den verfügbaren Startteilen zusammengestellt.
- Für die automatische Grundstücksvergabe gilt als Umsetzungsvorschlag: atomar den niedrigsten freien Grundstücksindex vergeben. Da die Indizes nach Nähe zum Marktplatz sortiert sind, weist das Plätze der Reihe nach von innen nach außen zu.
- Die exakte Darstellung der Wellblech-Baracke folgt dem Lerndorf-Look und dem vorhandenen Haus-Sockel; Stil und Form werden vor visueller Umsetzung anhand einer Vorschau geprüft.

Diese Punkte betreffen die spätere Inhalts- und Umsetzungsplanung, nicht die bestätigte Tutorial-Reihenfolge.
