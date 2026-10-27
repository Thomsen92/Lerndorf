# Sir Byte: Marktplatz-Zugang und Questtafel

Nutzerauftrag: ein Sir-Byte-Button führt direkt zum Marktplatz und richtet die Kamera auf Sir Byte und die Questtafel. Ein auffälliger Pfeil und eine Kontur machen die Tafel als Zugang zu den täglichen Quests erkennbar.

## Umgesetzt

- [x] Sir-Byte-Portraitbutton neben der Glocke unter dem Avatar; deutsche/englische zugängliche Beschriftung. Im Tutorial gesperrt.
- [x] Bestehende Unteransicht schließen und zum Dorf zurückkehren; kurze Kamerafahrt auf die Vorderseite der Tafel und den danebenstehenden Sir Byte. Bei reduzierter Bewegung sofortige Ansicht. Bildausschnitt berücksichtigt Hochformat und Orbit-Grenzen; Kamerazielhöhe bleibt nach der Fahrt erhalten.
- [x] Gelber Hinweis-Pfeil aus Kenney UI Pack 2.0 (CC0), Text „Daily quests“/„Tagesaufgaben“. Leichtes Auf-und-Ab, bei reduzierter Bewegung statisch. Hinweis selbst ist per Touch, Maus und Tastatur anklickbar.
- [x] Goldene Kontur um Dach, Pfosten und Tafel; hellere Hervorhebung bei Hover/Fokus. Auch Dach, Papier und Pfosten öffnen per Klick die Daily Quests.
- [x] Pfeil und Kontur werden während Tutorial und anderen Bereichen ausgeblendet; Cleanup entfernt Marker, Geometrie und Material.

## Prüfung und Vorschau

26 gezielte Tests prüfen Navigation/Tutorial-Sperre, Kameraausschnitte auf drei Karten und vier Seitenverhältnissen, Kameragrenzen, Hover, Ausblenden und Cleanup. Drei Browserfälle bei 1180×820, 768×1024 und 390×844 prüfen den Button und den tatsächlichen 3D-Tafelklick unabhängig vom Hinweis-Button.

Lokale Vorschau: http://127.0.0.1:5175/dev/tutorial.html?step=done&char=girl&wait=0&lang=en — Sir Byte unter dem Avatar anklicken.

Keine Datenbankänderung erforderlich. Kein Commit oder Push in diesem Auftrag.

Während der gezielten Marktplatzansicht sind Hauskarten ausgeblendet, damit sie im Hochformat nicht mit dem HUD kollidieren; Kamera-Interaktion und Haus-Reset stellen sie wieder her. Produktionsbuild und ESLint erfolgreich.

HUD-Ausrichtung nach Nutzerfeedback: gemeinsame kompakte Karte oben rechts, Statuszeile über einer durchgehend ausgerichteten Reihe aus Aufgaben, Haus, Sir Byte und Glocke. Einheitliche 48-Pixel-Buttons, Abstände und Außenkante; keine separat schwebenden Bedienelemente. CSS-Änderung ohne Änderung der Funktionen.


## Ansage nach Ankunft

Nach der abgeschlossenen Kamerafahrt spielt Sir Byte `assets/sir-byte/voice/board.mp3` („Your Daily Quests are on this board!“) über den bestehenden Sprachspieler ab und zeigt die zugehörige Sprechblase. Bei reduzierter Bewegung startet die Ansage nach dem direkten Kamerawechsel. Der Abschluss-Callback läuft einmal pro Besuch; abgebrochene Fahrten, andere geöffnete Bereiche und Modals lösen ihn nicht aus. Haus-Reset und Wechsel in Hausbereiche stoppen eine laufende Ansage. Die vorhandenen Regeln für Ton-aus, Nutzerinteraktion und abgebrochene Audio-Ladevorgänge bleiben wirksam.

Prüfung: elf gezielte Sprach-/Marktplatz-/Tutorialtests, Produktionsbuild und ESLint erfolgreich. Drei Browserfälle bestätigen den Abruf der tatsächlichen MP3 auf Desktop, Tablet und Smartphone.
