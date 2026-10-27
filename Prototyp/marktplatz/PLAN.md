# Umsetzung und Prüfung

Alle Arbeit ausschließlich in diesem Ordner; keine Commits, keine Integration.

- [x] Stilreferenz und vorhandenen Prototyp lesen; Assetkatalog mit Dreieckszahlen sichten.
- [x] Konzept auf einer Seite festhalten; lokale Bibliotheken und gewählte Assets kopieren.
- [x] `index.html`, `style.css`: bildfüllende Bühne, lokale Schrift, Start-/Fehleranzeige, Season-Meldung und zugängliche Steuerung.
- [x] `scene.js`: deterministischer Rundplatz, vier Marktstände, Season-Schild, vorhandene Halloween-Modelle, Blutmond, Nebel und warmes Licht.
- [x] Rendering bündeln; ruhige Umkreisung, manuelle Kamera, Bewegungsreduktion und Pause bei verdecktem Tab.
- [x] Statischen Server starten; Desktop-/Tablet-/Mobilansichten selbst ansehen und an Stilreferenz abgleichen.
- [x] Browserprüfung für Ladefehler, Season-Meldung, Kamera, Bewegungsreduktion, Determinismus und Performance; Messungen und Screenshots lokal speichern.
- [x] README mit Start, Asset-Liste, Messergebnissen und Integrationsnotiz abschließen; Schutzdatei-Hashes und Dateiumfang prüfen.

Ergebnis: 43 erfolgreiche Browser-/Dateiprüfungen, keine Laufzeitfehler oder externen Requests. 71 Draw Calls / 95.564 Dreiecke laufend; 78 / 105.102 einschließlich erstem Schattenpass. Hardwaretest am Desktop ca. 70 FPS, auch im emulierten Tabletformat. Echte Schul-Tablet-Abnahme noch offen. `Prototyp/index.html` und `docs/LOOK.md` identisch zum Start-Hash. Eine zeitgleiche Änderung der beobachteten `blender/sources/LICENSES.md` ist im Prüfprotokoll vermerkt und wurde von dieser Arbeit nicht angerührt. Keine Commits, kein Push.

Revision nach Nutzerfeedback: dunkleres rotes Licht, größerer roter Blutmond/Halo, schleppender Gang mit bewegten Beinen und zusätzlich Vampir/Friedhofswärter (insgesamt fünf Figuren). 47 technische Prüfungen erfolgreich, keine Screenshots; visuelles Review durch Nutzer. Aktuell 97.809 Dreiecke / 101 Draw Calls; erster Schattenpass maximal 107.347 / 108. Desktop-GPU ca. 70 FPS; echte Tablet-Abnahme bleibt offen. Bericht: screenshots/verification-revision.json.

Brunnenrevision: Steinbrunnen auf 1,72 m Höhe vergrößert, Blutwasser, großer Kürbis davor und drei Kenney-Einzelkerzen mit Licht/Flammen und Beschwörungskreis. Wasserstrahlen nach Nutzerbild nochmals überarbeitet: Start an der Oberfläche, dünne glatte Schwerkraftkurven mit Verjüngung, laufende Reflexe sowie feine Aufprallspritzer/Wellen. 53 technische Prüfungen erfolgreich, keine neuen Screenshots. 106.589 Dreiecke / 106 Draw Calls laufend; maximal 116.127 / 113 inklusive Schattenkarte. Visuelles Review durch Nutzer.

Bewegungsfehler der Fontäne behoben: Vorher statische Strahlgeometrie trotz laufender Reflex-/Spritzeranimation. Jetzt animierte Vertexkoordinaten mit Druckpulsation, wandernden Oberflächenwellen und feinen mitlaufenden Reflexen. Regression vor Fix: 0 m Vertexbewegung (Test fehlgeschlagen); nach Fix: 0.1434 m in 0,65 s. Bewegungsreduktion hält echte Geometrie an. 55 vollständige technische Prüfungen erfolgreich; 108.317 Dreiecke / 106 Draw Calls, Spitze 117.855 / 113; ca. 70 FPS auf Desktop-GPU. Keine neuen Screenshots.

Erweiterung: senkrechter mittlerer Wasserstoß im Kurz-kurz-lang-Loop (2,8 s), weiter entferntes Beispielgrundstück mit 6 Lampen und 10 Kürbissen ausschließlich außerhalb der Baufläche; Kamera-Knopf hin/zurück. 62 technische Marktprüfungen plus Staccato-Regressionsprüfung erfolgreich. Markt bis 115.179 Dreiecke / 112 Draw Calls; erster Schattenpass maximal 125.437 / 120.

Season-Sammlung: 4 eigene SVG-Rahmen, 6 Titelplaketten und 6 dreh-/wendbare GLB-Karten mit Englischbezug. Blender 5.2, editierbare Quelle und eigener Builder, alle Texturen eingebettet. 6 GLB-Reimporte stimmen technisch mit Quelle überein; 25 Browserchecks erfolgreich. Eigene Sammlungsseite mit Link vom Markt; keine Spielintegration. Visuelles Review durch Nutzer.

Almanach-Erweiterung: 24 neue Karten, insgesamt 30 (Normal 10 / Rare 10 / Epic 7 / Legendary 3), darunter 11 Sprichwörter und 6 eigene Reimpaare. Jede Karte mit eigenständigem drehbarem Motiv-GLB. Collection → Cards (Wälzer mit Index/Suche/Blättern) und Achievements (nur Platzhalter). Rahmen/Titel als Archiv erhalten. 60 Exporte technisch reimportiert, 143 Browserprüfungen erfolgreich. INTEGRATION_COLLECTION.md enthält den Implementierungsvertrag. Keine Änderungen an web/src, keine Commits/Pushes.
