# Lernboxen – Prototyp- und Integrationsspezifikation

**Stand:** 20.10.2026  
**Status:** Grober Entwurf für die Übergabe an Claude. Standalone-Prototyp beauftragt; Sammelideen und Live-Spielregeln sind noch nicht vollständig festgelegt.

## 1. Ziel

Die bisherige Lootbox-Demo soll als **Lernbox** in die Welt des Lerndorfs übersetzt werden. Die Animation soll einen Fund verständlich und erfreulich zeigen, zum Lerndorf-Look passen, auf Schultablets funktionieren und offen mit Chancen umgehen.

Zuerst wird ausschließlich ein eigenständiger UI-Prototyp gepflegt. Die Lernbox darf nicht in die laufende App, den Shop oder Supabase eingebaut werden, bis dafür ein eigener Auftrag vorliegt.

## 2. Projektkontext und verbindliche Grenzen

- Lerndorf ist ein Browser-Spiel für Schülerinnen und Schüler der Klassen 8a/8b; ein Teil nutzt geteilte Schul-Tablets.
- UI-Texte sind auf Deutsch und sollen für 13- bis 14-Jährige mit unterschiedlicher Lesekompetenz leicht verständlich sein.
- Maßgebliche Projektregeln stehen in `CLAUDE.md`, `docs/SCOPE.md`, `docs/SPEC.md`, `docs/LOOK.md` und `docs/ASSET_VERTRAG.md`.
- Laut `docs/SCOPE.md` sind Lootboxen derzeit **nicht Teil des MVP**. `docs/ASSET_VERTRAG.md` sagt, dass die Aufnahme in den Umfang später entschieden werden soll.
- Bestehender Prototyp: `web/public/prototypes/lernbox-prototyp.html`. Er ist eine eigenständige Vorschauseite und kein Teil des Shop- oder Dorfablaufs.
- Für den Lerndorf-Stil gelten Low-Poly-Formen, Flat Shading, gebrochene satte Farben, warmes Licht gegen kühle Abendfarben und keine grellen Neonfarben. Siehe `docs/LOOK.md`.
- Es dürfen keine echten Schülerdaten, Tracker, kostenpflichtigen Dienste oder Änderungen am externen Projekt „English Club 8“ eingebracht werden.

## 3. Umfang dieses Prototyps

### Enthalten

- Eigenständige Vorschauseite für die Lernbox.
- Eine kurze Öffnungssequenz mit Kistenbewegung, warmem Licht und anschließendem Fund.
- Die Sequenz dauert ungefähr 3,2 Sekunden und kann währenddessen übersprungen werden.
- Nach dem Fund kann dieselbe Vorschauanimation erneut abgespielt werden.
- Ein stilisiertes Beispielobjekt „Bank am Abend“ erscheint groß aus der Kiste.
- Sichtbare Beispiel-Chancen für die vier Seltenheitsstufen.
- Synthetische Klangfolgen für seltene, epische und legendäre Funde; Klangproben sind auf der Vorschauseite abrufbar.
- Ein sichtbarer Ton-Schalter.
- Eine Kennzeichnung, dass es sich um eine Vorschau ohne echte Ziehung und ohne Münzabbuchung handelt.
- Eine Erläuterung, dass bei einer späteren Spielversion der Server das Ergebnis vor Beginn der Animation bestimmt.

### Ausdrücklich nicht enthalten

- Shop-Integration, neue Navigationspunkte oder Änderungen an `web/src/ui/shopView.ts`.
- Kauf oder Verbrauch von Münzen, Inventaränderungen, Kontobuchungen oder Gewinnvergabe.
- Supabase-Tabellen, RPCs, Edge Functions, Secrets, Migrationen oder Änderungen an der Datenbank.
- Echte Zufallsauswahl, clientseitige Gewinnchancen oder Persistenz in `localStorage`.
- Albumseiten, Sammelfortschritt oder eine persistente Sammlung von Karten und Sehenswürdigkeiten.
- Meshy-Aufträge, neue 3D-Assets oder Änderungen an der Blender-Pipeline.
- Einführung oder Freigabe der Lernbox als Spielmechanik.

## 4. Gestaltung und Bedienung

### Erscheinungsbild

- Eigenständige Lerndorf-Abendstimmung: kühles Blau/Violett im Hintergrund, warmes Licht aus der Holzkiste, grüne Dorfwiese und gedeckte Holzfarben.
- Die Kiste ist als klare Low-Poly-Silhouette erkennbar; die Animation bleibt ruhig und freundlich.
- Der Fund ist das visuelle Zentrum. Er erscheint größer als die Kiste und wird mit Name und Seltenheit beschriftet.
- Chancen und Hinweise stehen in einer separaten, gut lesbaren Karte.
- Layout muss auf Tablet- und Handybreite ohne horizontales Scrollen funktionieren.

### Ablauf

1. Startzustand: Kiste, Schaltfläche „Lernbox öffnen“, Chancen und Vorschauhinweis sind sichtbar.
2. Nach Betätigung wackelt die Kiste kurz und öffnet sich mit warmem Licht.
3. Ein kurzes Kartenband vermittelt die Erwartung, ohne die Wartezeit unnötig zu verlängern.
4. Das vorab festgelegte Beispielobjekt steigt aus der Kiste auf.
5. Name und Seltenheit erscheinen. Bei der derzeitigen Vorschau ist der feste Beispiel-Fund „Bank am Abend · Selten“.
6. Während der Animation kann „Fund direkt zeigen“ die Sequenz überspringen.
7. „Animation erneut ansehen“ spielt denselben festen Vorschau-Fund erneut ab; es wird kein neuer Gewinn gezogen.

### Bewegung und Zugänglichkeit

- `prefers-reduced-motion: reduce` muss die Bewegung stark verkürzen oder direkt zur Fundanzeige wechseln.
- Überspringen darf nicht davon abhängen, dass die Animation zu Ende läuft.
- Fokuszustände der Schaltflächen müssen sichtbar sein; Schaltflächen sind per Tastatur bedienbar.
- Blitze, Vollbild-Flash, starke Kamerabewegung und heftiges Schütteln sind nicht vorgesehen.

## 5. Klang

- Klang wird erst nach einer Nutzeraktion abgespielt; niemals beim Laden der Seite.
- Ton kann über einen sichtbaren Schalter abgeschaltet werden.
- Die Seltenheitsstufe bestimmt den Klang:
  - **Gewöhnlich:** kein Fund-Fanfare-Klang.
  - **Selten:** kurze, warme Zweiton-Folge.
  - **Episch:** längere, aufsteigende Vier-Ton-Folge.
  - **Legendär:** längste und deutlichste, aber weiterhin zurückhaltende Fünf-Ton-Folge.
- Die aktuellen Klänge sind synthetisch mit Web Audio erzeugt; keine externen Audiodateien, kein Netzwerkabruf.
- Klangproben auf der Vorschauseite dienen nur zum Vergleichen. Im Spiel würde der Fund-Klang beim Ergebnis abgespielt.
- `prefers-reduced-motion` reduziert Bewegung; der Ton-Schalter bleibt unabhängig davon bedienbar.

## 6. Chancen und Fairness

- Die Vorschau zeigt derzeit die Werte **Gewöhnlich 50 %, Selten 30 %, Episch 15 %, Legendär 5 %**.
- Diese Zahlen stammen aus der bisherigen Demo und sind **Beispielwerte, keine freigegebene Spielbalance**. Claude darf sie nicht als endgültige Vorgabe behandeln.
- Die vier Werte ergeben zusammen 100 %.
- Vor einer Live-Einführung müssen die Lehrkraft und die Spielregeln die Chancen, mögliche Gewinne, Münzkosten und den Umgang mit mehrfachen Gewinnen festlegen.
- Es dürfen keine Echtgeldkäufe, Premiumwährung, Kaufdruck, zeitlich begrenzten Kaufreize oder Aufforderungen zum sofortigen erneuten Öffnen entstehen.
- Die Lernbox ist für Lernmotivation gedacht. Seltenheit darf keine bessere Lernleistung oder einen Vorteil in Aufgaben versprechen.
- In einer späteren Spielversion müssen vor dem Öffnen die Chancen sichtbar sein. Die möglichen Gegenstände müssen nachvollziehbar sein; die effektive Chance eines Gegenstands darf nicht durch die angezeigte Seltenheitschance verschleiert werden.

## 7. Anforderungen für eine spätere Spielintegration

Dieser Abschnitt beschreibt notwendige Leitplanken, ist aber **keine Erlaubnis zur Integration**.

- Die Belohnung wird vor der Animation serverseitig festgelegt. Der Client zeigt ausschließlich das bestätigte Ergebnis an und darf keine Ziehung durchführen.
- Auswahlberechtigt sind nur aktive, gültige Shop-Gegenstände mit `lootbox_weight > 0`, passender Kategorie und geprüftem Modell. Maßgeblich ist das Datenmodell aus `docs/ASSET_VERTRAG.md`.
- Das Ergebnis muss in einer serverseitigen Transaktion gebucht werden: Münzabbuchung, Inventargewinn und Kontoauszug müssen gemeinsam erfolgreich sein oder gemeinsam zurückgerollt werden.
- Berechtigung, Preis, Shop-Sperre, Klasseninstanz, Gewichtung, Besitz und Gültigkeit des Gegenstands werden serverseitig geprüft.
- Der Client darf weder Tabellen direkt schreiben noch den Fund ändern, wiederholen oder durch erneutes Laden neu auslosen.
- Fundanzeige, Inventar und Grundstücksplatzierung müssen die vorhandenen Kategorien und Slots aus dem Asset-Vertrag respektieren (`house`, `garage`, `car`, `deco`).
- Serverantworten dürfen keine anderen Klassendaten oder echte Schülernamen enthalten. Es gelten Spitznamen und bestehende RLS-Regeln.
- Vor einer Umsetzung sind SCOPE/SPEC/PLAN zu aktualisieren und eine gesonderte Freigabe für die Spielmechanik einzuholen. Migrationen oder Änderungen am Remote-Projekt dürfen nicht ohne gesonderten Auftrag ausgeführt werden.

## 8. Grober Sammelumfang

Dieser Abschnitt hält die bisherige gemeinsame Richtung fest. Er ist ein Ideengerüst und keine Freigabe, die Sammlung ins laufende Spiel zu integrieren.

### Albumseiten

1. **Spruchkarten** — englische Sprüche und Redewendungen, gesammelt in einem Album. Die Karten haben unterschiedliche Seltenheitsstufen. Die konkreten Stufen und Ziehchancen sind noch nicht endgültig beschlossen.
2. **Sehenswürdigkeiten** — eigene Albumseite für bekannte Orte und Bauwerke aus englischsprachigen Ländern. Beispiele für mögliche Themen: Big Ben oder Doppeldeckerbus (Großbritannien), Freiheitsstatue oder Golden Gate Bridge (USA), CN Tower (Kanada), Sydney Opera House (Australien), Blarney Castle (Irland). Namen, Länderzuordnung und Fakten müssen vor Verwendung sachlich geprüft werden.
3. **Sonstiges** — darunter als humoristischer Sammelgegenstand eine **„Hausordnung zum Abschreiben“**. Sie soll wie ein übertrieben offizielles, aber klar albernes Lerndorf-Dokument wirken, nicht wie eine echte Schulaufgabe.

### Gegenstände und Platzierung

- Das Grundstück hat laut Asset-Vertrag vier Deko-Sockel à 3 × 3 sowie getrennte Plätze für Haus, Garage und Auto. Haus und Garage sind voneinander unabhängige Assets.
- Sehenswürdigkeiten können als kleine Low-Poly-Miniaturen gestaltet werden. Eine erworbene Miniatur liegt im Inventar und kann auf einem freien Deko-Sockel ausgestellt werden; sie beansprucht keinen zusätzlichen Grundstücksplatz.
- Karten und die „Hausordnung zum Abschreiben“ sind Sammelobjekte für das Album und brauchen keinen Deko-Sockel.
- Gesammelte Einträge sollen im Album erhalten bleiben, auch wenn eine ausstellbare Miniatur später vom Grundstück genommen oder ersetzt wird. Technische Umsetzung dieses Sammlungsfortschritts gehört nicht zum aktuellen Vorschauumfang.

### Duplikate und Seltenheit

- **Vorläufige Duplikatregel:** zusätzliche Exemplare bleiben im Inventar. Sie werden weder automatisch umgetauscht noch gelöscht oder in eine andere Belohnung umgewandelt. Diese Regel gilt bis auf Weiteres für Sammelgegenstände.
- Für Spruchkarten sind unterschiedliche Seltenheitsstufen gewünscht. Die Seltenheit soll das Sammeln prägen; sie darf nicht den Lernwert, die Qualität der Erklärung oder einen Vorteil bei Englisch-Aufgaben bestimmen.
- Ob Sehenswürdigkeiten und sonstige Sammelobjekte ebenfalls Seltenheitsstufen erhalten, ist offen.
- Silhouetten für noch fehlende Album-Einträge, Fortschrittsanzeigen oder Belohnungen für vollständige Themen-Sets sind mögliche Ideen, aber noch nicht bestätigt.

### Pädagogische Leitlinien für Karten

- Mögliche Karteninhalte: englischer Spruch, leicht verständliche deutsche Bedeutung, kurzer Beispielsatz und eine humorvolle Illustration.
- Beispielthemen: „It’s raining cats and dogs“, „piece of cake“, „butterflies in my stomach“ und „once in a blue moon“.
- Sprüche und Erklärungen werden vor einer Live-Verwendung altersgerecht und fachlich geprüft.
- Karteninhalte können später freiwillige Übung oder Wiederholung unterstützen. Wichtige Lerninhalte, Lösungen und Prüfungsvorteile dürfen nicht exklusiv zufällig aus Lernboxen kommen.

### Noch nicht festgelegt

- Ob eine Lernbox Spruchkarten, Sehenswürdigkeiten und „Sonstiges“ gemeinsam enthalten kann oder ob es verschiedene Box-Typen gibt.
- Ob eine Sehenswürdigkeit nur im Album zählt oder zusätzlich als Miniatur für das Grundstück vergeben wird.
- Welche Karten und Miniaturen zu welcher Seltenheit gehören und welche konkreten Chancen gelten.
- Ob Album-Kategorien, Länder-Sets oder vollständige Sammlungen eine zusätzliche Belohnung haben.

## 9. Abnahmekriterien für den Standalone-Prototyp

1. Die Vorschauseite bleibt getrennt vom App-Einstieg und vom Shop.
2. Ein Öffnen zeigt immer denselben Beispiel-Fund; kein Zufall, kein Münzverbrauch und kein Inventareintrag.
3. Die Öffnung dauert ungefähr 3,2 Sekunden, ist überspringbar und wiederholbar.
4. Das Beispielobjekt steigt sichtbar aus der Kiste auf und wird mit Name sowie Seltenheit gezeigt.
5. Die Chancewerte sind sichtbar als Beispiele gekennzeichnet und summieren sich auf 100 %.
6. Selten, Episch und Legendär haben unterscheidbare Klangfolgen; gewöhnlich hat keinen Fund-Fanfare-Klang.
7. Ton kann ein- und ausgeschaltet werden; Klangproben können einzeln abgespielt werden.
8. Die Seite lädt keine externen Fonts, Skripte, Bilder oder Audiodateien.
9. Tablet- und Handybreite funktionieren ohne horizontales Scrollen; Tastaturfokus und reduzierte Bewegung werden unterstützt.
10. Es werden weder Dateien aus `Prototyp/` verändert noch Änderungen an Shop, Backend, Datenbank oder Dorf vorgenommen.

## 10. Offene Entscheidungen vor Live-Einsatz

Claude soll diese Punkte im Rahmen einer Übergabe sichtbar lassen und keine Werte erfinden:

1. Soll die Lernbox nach pädagogischer Prüfung überhaupt in das Spiel aufgenommen werden? Die aktuelle Projektplanung sagt: später entscheiden.
2. Welche Münzkosten gelten, und wie oft darf ein Schüler sie öffnen? Kein Echtgeld.
3. Sind die Beispielchancen 50/30/15/5 gewünscht? Wenn nicht, welche genehmigte Verteilung gilt?
4. Welche Gegenstände sind enthalten, und sollen zusätzlich zur Seltenheitschance Einzelchancen angezeigt werden?
5. Soll die vorläufige Duplikatregel (weitere Exemplare bleiben im Inventar) auch für alle späteren Live-Sammelobjekte gelten?
6. Soll jede Box dieselbe Tabelle verwenden, oder gibt es verschiedene Lernbox-Typen?
7. Darf die Lehrkraft die Lernbox je Klasse freischalten und sperren?
8. Wie werden Öffnungsversuche, Münzen und Ergebnisse für Schüler nachvollziehbar gemacht, ohne eine öffentliche Rangliste einzuführen?

## 11. Übergabehinweis an Claude

Vor dem Start Code und Projektstatus erneut lesen. Zuerst nur den Standalone-Prototyp anhand dieser Spezifikation bearbeiten. **Nicht** die Shop- oder Spielintegration beginnen, keine Migration schreiben oder anwenden und keine Live-Chancen oder Münzpreise festlegen, solange dafür keine neue ausdrückliche Freigabe vorliegt. Bestehende, nicht zu dieser Aufgabe gehörende Arbeitsänderungen im Repository unangetastet lassen.
