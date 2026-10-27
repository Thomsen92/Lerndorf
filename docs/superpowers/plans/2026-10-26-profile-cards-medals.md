# Medaillen, Hauskarten und Besucherprofile

Freigegebener Nutzerauftrag: Kenney-Medaillons mit großer Levelzahl; ruhigere Adventure-Holz-/Metallrahmen unter Erhalt bestehender Freischaltungen. Klare Hauskarten mit Name, Titel und Level, 200–240 CSS-Pixel breit, über dem Grundstück verankert. Eigenes Haus sichtbar, fremde bei Nähe/Auswahl. Antippen eines fremden Grundstücks öffnet ein Besucherprofil mit aktuellem Outfit, Level, Serie und Titel.

1. Kenney-Vektorgrafiken ableiten und Herkunft dokumentieren; bestehende Frame-IDs/Levelgrenzen erhalten.
2. Scharfe, zugängliche Hauskarten mit Projektion aus der Welt; keine doppelten 3D-Namensschilder oder großer gelber Kegel in der Spieleransicht.
3. Migration 0027: reiner Profil-Lesezugriff für Schüler derselben Klasse, ohne Münzen/XP/Lernverlauf und ohne Aufweichen der Tabellen-RLS. Besucherprofil mit Lade-/Fehlerzustand, Fokusführung und Tablet-Darstellung.
4. Fremde Grundstücke und Karten anbinden, Fortschrittsänderungen am eigenen Schild aktualisieren, Kamera-/Tutorial-Modi berücksichtigen.
5. SQL-, UI- und Projektprüfungen, lokale Vorschau und Dokumentation. Kein Push oder Live-Migration ohne weiteren Auftrag. Parallele Arbeiten erhalten; ein Agent.


## Umgesetzt – 27.10.2026

- [x] Kenney-Medaillen und Adventure-Portraitrahmen; sieben bestehende Rangstufen, unveränderte Frame-IDs und Freischaltgrenzen. SVG- und Canvas-Darstellung sowie CC0-Quellen dokumentiert.
- [x] 232 px breite, scharfe Hauskarten mit Level, Name und Titel. Eigenes Haus und ein nahes sichtbares Nachbarhaus; Projektion folgt der Kamera, doppelte Beschriftungen und großer gelber Kegel entfernt.
- [x] Fremdes Grundstück oder Hauskarte öffnet ein Besucherprofil; eigenes Grundstück öffnet weiterhin das Hausmenü. Level/Titel werden bei Profilabruf aktualisiert.
- [x] Besucherprofil mit aktuellem Avatar-Look, gewähltem Rahmen, Level, Serie und Titel. Ladezustand, Wiederholen, Tastaturfokus und mobile Darstellung als Bottom Sheet.
- [x] Migration 0027 mit eng begrenztem Lese-RPC: nur Schüler derselben Klasse. Keine Münzen, XP, Lernhistorie oder fremden Wardrobe-Rezepte; bestehende Tabellen-RLS bleibt unverändert.
- [x] Gesamtsuite: 937 Tests erfolgreich. Danach 16 gezielte Tests inklusive zusätzlicher Sichtbarkeitsregression sowie drei Browserfälle für Desktop, Touchscreen und Dorf-Integration erfolgreich. Produktionsbuild und ESLint erfolgreich.

### Vorschau und Auslieferung

- `http://127.0.0.1:5175/dev/awards.html?lang=en`: alle Rangstufen; Rang antippen öffnet eine Beispiel-Profilkarte.
- `http://127.0.0.1:5175/dev/tutorial.html?step=done&char=girl&wait=0&lang=en`: echtes Dorf-UI mit lokalen Beispieldaten. Nachbargrundstück antippen; Kamera zu Nachbarn verschieben.
- Lokale SQL-Tests bestätigen die Zugriffe innerhalb einer Klasse und die Sperre für andere Klassen, Lehrer und anonyme Aufrufe.
- Noch nicht live angewandt: `supabase/migrations/0027_public_visitor_profiles.sql`. Vor einer Produktionsveröffentlichung zusammen mit den bereits ausstehenden Migrationen in Reihenfolge ausrollen. Ohne 0027 zeigt ein echter Profilaufruf einen wiederholbaren Fehlerzustand.
- Kein Commit, Push oder Live-Datenbankeingriff in diesem Auftrag.


## Visuelle Überarbeitung nach Nutzerfeedback – 27.10.2026

Die zunächst eingebauten, matten Kenney-Medaillons und eckigen Rahmen wurden durch eigene, kräftig gefärbte Rangschilde und runde Avatarrahmen ersetzt. Stilrichtung nach den gelieferten Spielrang-Referenzen: metallische Lichtkanten, facettierte Edelsteine, Kronen, Flügel und die farbigste Silhouette für den höchsten Rang. Die Avataröffnung bleibt bei allen Rängen transparent. Gemeinsame Vektorpfade versorgen SVG-UI und Canvas-Beschriftungen; die Levelzahl bleibt im HUD und auf Hauskarten kontrastreich. Der höchste Rang erhält einen zurückhaltenden Glanzimpuls; reduzierte Bewegung deaktiviert ihn. Bestehende Frame-IDs, Levelgrenzen, Datenbankwerte und Freischaltungen bleiben unverändert. Vorschau weiterhin unter `/dev/awards.html?lang=en`.

Abschluss der visuellen Überarbeitung: Produktionsbuild, ESLint und acht gezielte UI-/Beschriftungstests erfolgreich; Browserprüfung auf 1180 × 820 und 390 × 844 sowie Profilaufruf im Dorf. Keine Datenbankänderung für diese Überarbeitung erforderlich.


## Titelplaketten – 27.10.2026

Nutzerfreigabe: Das Spiel ist noch nicht veröffentlicht; frühere Freischaltungen dürfen bei einer späteren Neugestaltung ersetzt werden. Für die Titelplaketten ist kein Datenreset erforderlich.

Umgesetzt: sieben zum Rangsystem passende metallische Titelrahmen in `rankArtwork.ts` und eine gemeinsame Anzeige-Komponente `titlePlaque.ts`. Die Gestaltung folgt dem aktuellen Spielerlevel (1–4, 5–9, 10–14, 15–19, 20–24, 25–29, ab 30), unabhängig vom gewählten Titel. Sichtbar im eigenen Profil, Besucherprofil, auf Hauskarten, bei Levelaufstieg und in der Titelsammlung. Noch gesperrte Titel zeigen in der Sammlung mindestens die Stufe ihres Freischaltlevels. Kompakte Hauskarten kürzen lange Titel; der vollständige Text bleibt als Titelattribut und in der Profilansicht erhalten. Die Titelsammlung verwendet breitere Karten, auf schmalen Bildschirmen eine Spalte.

Lokale Vorschau: `/dev/awards.html?lang=en` zeigt alle sieben Rahmenfamilien sowie die Titelrahmen in voller Größe; `/dev/profile.html?view=profil&lang=en` zeigt das eigene Profil mit Titelauswahl.

Prüfung: zwölf gezielte Tests, Produktionsbuild und ESLint erfolgreich. Vier Browserfälle prüfen Desktop, Touchscreen, Profil/Collection ohne Überlauf und den Profilaufruf im Dorf. Keine Migration oder Änderung bestehender Spielerdaten für diese Ergänzung.
