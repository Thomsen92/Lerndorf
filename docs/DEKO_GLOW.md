# Deko-Präsentation im Spiel

Lokaler Feature-Branch `codex/deko-glow-spiel`; keine Auslieferung und kein Push.
Die freigegebene Demo bleibt auf `codex/deko-glow-prototyp` erhalten.

Jeder belegte Deko-Slot erhält einen 2,8-m-Sockel (0,22 m hoch), warmen
Lichtschein und genau einen festen Ring. Originalmodelle behalten ihre
Proportionen und werden um die Sockelhöhe angehoben. Die tatsächliche Seltenheit
wird einmal lesend aus `items.rarity` geladen. Fehlende oder unbekannte Werte
werden gewöhnlich dargestellt. Keine Änderung von Besitz, Preisen oder Platzierungen.

Selten: blau, episch: lila, legendär: gold. Diese Stufen erhalten den
freigegebenen Lichtnebel, gerade Strahlen und aufsteigende Funken. Kein Bloom,
keine schwebenden Ringe, kein Wabern des Sockelrings.

Die Garageneinfahrt erhält einen flachen Lichtschein mit weichen Leuchtkanten.
Die Farbe folgt dem abgestellten Auto, unabhängig von der Garage. Ohne Auto
bleibt die Einfahrt dezent warm beleuchtet.
Gewöhnlich: warm, selten: blau, episch: lila, legendär: gold. Farbnebel und
aufsteigende Funken ergänzen die seltenen Stufen. Kein weiterer Sockel und keine
zusätzlichen echten Lichtquellen. Die Einfahrt reicht unverändert von der Garage
bis zum Tor; beim Fahrzeugwechsel wird ihr Effekt mit ausgetauscht.
Niedrige Qualität halbiert die Funkenzahl (12/18/24 statt 24/36/48).
Reduzierte Bewegung friert die Leuchtkanten und den Nebel ein und entfernt Funken.

Die bestehende Spielschleife aktualisiert die Effekte und berücksichtigt
Qualität, verdeckte Tabs sowie reduzierte Bewegung. Höchstens vier nahe
Deko-Spots sind gleichzeitig sichtbar; in größerer Entfernung bleiben Sockel
und warmer grafischer Lichtschein erhalten. Zusatzeffekte enden ab 35 m in
Niedrig beziehungsweise 50 m in Hoch. Geometrien werden geteilt, Partikelpuffer
wiederverwendet. Entfernen, Austausch und Schließen geben Effektressourcen frei;
die gemeinsamen GLB-Materialien werden nicht freigegeben oder verändert.

## Lokale Prüfung

In `web/`: `npm ci`, dann `npx vite --host 127.0.0.1 --port 5401`.
`http://127.0.0.1:5401/dev/deko-world.html` zeigt die echte Welt mit vier
Originalmodellen und allen Seltenheiten sowie einem seltenen Auto mit blauer
Einfahrt ohne Anmeldung oder Backend.
Qualität und Bewegungsreduktion können dort verglichen werden.

Tests: `npx vitest run tests/render/decoPresentation.test.ts tests/render/drivewayGlow.test.ts tests/render/decoRemoval.test.ts tests/api/decoRarities.test.ts`.
Zusätzlich Build, bestehende Gesamtprüfung und Dorf-Galerie ausführen.
Die Bildrate auf dem ältesten echten Schul-Tablet ist weiterhin separat abzunehmen.
