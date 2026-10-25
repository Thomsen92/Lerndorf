# Profil und interaktive Truhen

Auftrag vom 25.10.2026: echte 3D-Truhen, bei Hover/Fokus wackeln und leuchtende Silhouette; Klick/Tippen öffnet direkt, ohne zusätzliche Öffnen-Schaltfläche. Weniger Informationen auf der Profilseite, Freischaltungen auf einer eigenen Seite. Umsetzung sequenziell ohne Teilagenten.

Stand: lokal umgesetzt. 801 Tests, Build und ESLint bestanden; acht Browserprüfungen mit Erststart, fortgesetztem Tutorial, direkter Truhenöffnung, Tastatur und reduzierter Bewegung. Bilder auf Desktop-, Tablet- und Handybreite unter `web/test-results/profile-interaction/` geprüft. Keine Veröffentlichung oder Datenbankmigration vorgenommen; Migration 0020 und Abnahme am Schul-Tablet bleiben offen.

## Aufbau

- **Mein Profil:** Figurenbild und aktuell gewählter Titel/Rahmen, Level-Wappen, ein Fortschrittsbalken mit „Noch … XP“, Münzen. Kompakte Karten für heutige Quests und laufende Serie. Darunter direkt anklickbare 3D-Truhen und ein klarer Zugang zur Sammlung.
- **Meine Sammlung:** eigene Ansicht mit Zurück-zum-Profil-Knopf und Reitern „Titel“ / „Rahmen“. Nur die gewählte Kategorie ist sichtbar. Freie Einträge lassen sich wählen, gesperrte zeigen Schloss und benötigtes Level. Auswahl erscheint sofort im Profil.
- Die Tabelle „So bekommst du XP“, Rechenregeln, historische Summen und doppelte Level-/Serienangaben entfallen aus der Schüleransicht. Die Regeln bleiben in der technischen Dokumentation.
- Die globale Navigation behält drei Knöpfe. Sammlung ist eine eigene Ansicht innerhalb des Profilbereichs; die Dorfansicht bleibt pausiert.

## Gestaltung und Verhalten

Die Übersicht wirkt wie eine Spielerkarte im nächtlichen Dorf: dunkelblaue Flächen (#1b2238 / #252e49), heller Text (#f4ecd9), warmes Gold (#ffd16d), grüner Fortschritt (#83bf8a). Schrift: vorhandene gut lesbare UI-Schrift, keine Tabellenoptik. Das zentrale interaktive Element ist die beleuchtete Holztruhe mit Metallbändern und beweglichem Deckel.

Die Truhe ist ein eigenes, im Code gebautes Three.js-Modell mit Deckelscharnier. Alle Truhen teilen einen WebGL-Renderer und zeichnen in eigene Canvas-Flächen. Ruhende Truhen rendern ein Standbild; nur Hover, ausstehende Serverantwort und Öffnung animieren. Hover und Tastaturfokus aktivieren die goldene Kontur. Reduzierte Bewegung zeigt dieselben Zustände ohne Wackeln. Ohne WebGL gibt es eine bedienbare isometrische SVG-Ersatzansicht.

Ein Klick auf das Objekt startet genau einen `open_chest`-Aufruf. Bis zur Serverbestätigung bleibt der Deckel geschlossen und die Truhe wackelt. Erst danach öffnet sich der Deckel und der bestätigte Münzgewinn erscheint. Bei Fehler kann das Objekt erneut angeklickt werden. Die Level-Feier verwendet dieselben Truhen direkt, ohne zweiten Dialog. Tastatur und Touch funktionieren ohne Hover.

## Umsetzung und Prüfung

1. 3D-Modell, Pose und gemeinsamer Vorschau-Renderer; Geometrie-/Animations-Tests.
2. Interaktives Truhen-Steuerelement; Tests für Doppelklick, Serverwartezeit, Fehler, reduzierte Bewegung und Aufräumen.
3. Kompakte Profilübersicht und eigene Sammlung; Navigation, Auswahl und Ladefehler testen.
4. Level-Feier und Browser-Vorschauen anpassen; Tablet-/Mobilbilder ansehen, npm test, Build und ESLint ausführen. Keine Datenbankänderung nötig.
