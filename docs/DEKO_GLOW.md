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
Originalmodellen und allen Seltenheiten ohne Anmeldung oder Backend.
Qualität und Bewegungsreduktion können dort verglichen werden.

Tests: `npx vitest run tests/render/decoPresentation.test.ts tests/render/decoRemoval.test.ts tests/api/decoRarities.test.ts`.
Zusätzlich Build, bestehende Gesamtprüfung und Dorf-Galerie ausführen.
Die Bildrate auf dem ältesten echten Schul-Tablet ist weiterhin separat abzunehmen.
