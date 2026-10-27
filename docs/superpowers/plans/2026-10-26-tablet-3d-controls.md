# Tablet-Steuerung – freigegebene Umsetzung

Nutzerauftrag: Vorschläge zur 3D-Tablet-Steuerung umsetzen. Dorf: ein Finger verschiebt, zwei Finger zoomen/drehen; begrenzte Kamera und schnelle Rückkehr zum eigenen Haus. Kleiderschrank: ein Finger dreht die Figur, Pinch zoomt auf Details, Reset stellt die ganze Figur wieder her. Kameraknöpfe mindestens 48 px. Ziehen, Pinch und abgebrochene Gesten dürfen keine Objekte auslösen.

1. [x] Tap-Erkennung über den gesamten Bewegungsverlauf absichern.
2. [x] Eigenes aufräumbares Gestenmodul für den Kleiderschrank, begrenzter Detailzoom und zugängliche Zoomknöpfe.
3. [x] Dorf-Kamerakonfiguration, Grenzen, sanfte Dämpfung und kompakte Kameraknöpfe; Flüge/Tutorial/Baumodus erhalten.
4. [x] Technische Tests und Build; Sichtabnahme durch den Nutzer am lokalen Server. Keine Datenbankänderung. Parallel laufende UI-/Tutorial-Arbeit erhalten.

Ergebnis: Ein Finger verschiebt das Dorf auf der Bodenebene. Pinch zoomt, Zwei-Finger-Drehung ändert die Blickrichtung; kleine Winkelbewegungen werden vor dem Drehen toleriert. Zielpunkt bleibt im Dorf, Kamerahöhe über Gelände und Zoom/Neigung begrenzt. Dämpfung ist bei reduzierter Bewegung aus, erneutes Anfassen stoppt Nachlauf. Plus/Minus und Zentrieren zum eigenen Haus unten rechts, außerhalb des Dorfs/Tutorials verborgen.

Kleiderschrank: ein Finger dreht, zwei zoomen; Zoom 1–2,4 mit Fokus auf Oberkörper/Schmuck, kein Drehsprung beim Wechsel zwischen einem und zwei Fingern. Plus/Minus oben rechts; Ansicht zurücksetzen stellt Figurendrehung und Zoom wieder her. Rad und Plus/Minus-Tasten funktionieren ebenfalls. Gesten sind auf die 3D-Fläche begrenzt, Inventar bleibt scrollbar. Touch-Ziele mindestens 48 px; Texte auf Deutsch und Englisch.

Nachweise: 930 Tests in 134 Dateien, Produktionsbuild und ESLint erfolgreich. Zwei lokale Browserprüfungen bestanden: echte Pinch-Ereignisse ändern das gerenderte Bild, Reset stellt das Ausgangsbild exakt wieder her; Dorf lädt und Kameraknöpfe funktionieren ohne Laufzeitfehler. Screenshots: `web/test-results/tablet/wardrobe-zoom.png`, `village-camera.png`. Kein Commit, Push oder Deployment dieses Pakets. Die geänderte `villageView.ts` enthält weiterhin die separate, schon vorher laufende Tutorial-Arbeit; diese beim späteren Commit nicht versehentlich mit aufnehmen.

Lokale Tests:
- Dorf mit Testdaten: `http://127.0.0.1:5175/dev/tutorial.html?step=done&char=girl&wait=0`
- Kleiderschrank: `http://127.0.0.1:5175/dev/wardrobe.html?character=girl`
