# Übergabe · gedruckte Buchmotive / r07

**Aktueller Stand r08:** elf Druckobjekte, insgesamt 41 aktive Karten (15/14/9/3). Die sieben neuen Motive ergänzen werden, Aussprache, Nordamerika-Karte, Vogelgedicht, Definitionen, as … as und Höhendiagramm; Originalbilder und Regeln bleiben erhalten. Layouts/Definitionen der Ergänzung: `tools/more-print-studies.cjs`. Nummern der elf Druckobjekte 39–49; neun unveränderte Originalausschnitte werden bei der Prüfung bytegenau verglichen. Aktuelle Gesamtübergabe an Claude: `CLAUDE_HANDOFF.md`. Die folgenden Angaben zum ersten Viererset dokumentieren dessen Ursprung; der technische Druckvertrag gilt für alle elf.

Vier zusätzliche Druckobjekte im bestehenden Almanach, keine neuen plastischen Figuren: Empire-State-Postkarte im Hochformat, Manhattan-Panorama-Postkarte, Focus-Karte mit Relativsätzen und British-/American-English-Karte. Die Nutzerklarstellung lautet: Originalkern behalten, um Halloween-Beispiele ergänzen. Die aktive Collection umfasst nun **34 Karten**, Verteilung Normal/Rare/Epic/Legendary **12/11/8/3**. Die acht früheren Figurenvarianten bleiben auf der Ersatzbank; Buchcover und Meme-Rückseite bleiben separat erhalten.

## Daten und Dateien

`assets/collection/prints/manifest.json` ist das Liefermanifest der vier Druckflächen. `tools/print-studies.cjs` erzeugt die beiden Lernkarten-Layouts und alle Rückseiten, ergänzt die Definitionen unter `catalog.cards` und wird von `tools/extend-almanac.cjs` aufgerufen. Stabile IDs: `empire-state-postcard`, `manhattan-postcard`, `midnight-focus-card`, `two-ways-boo-card`; Drucknummern 39–42 erhalten die Nummern 31–38 der archivierten Varianten.

Diese Einträge haben `format: printed-surface` und `series: textbook-prints`. Das Modell ist die ganze bedruckte Fläche. `motifModel` verweist zur Kompatibilität auf dasselbe GLB; es gibt ausdrücklich kein zusätzliches plastisches Motiv. Deshalb blendet die UI die Motif-Auswahl aus und zeigt Karte, Umdrehen, Download und „Druckbild in voller Größe“. Ein späterer Importer soll `format` beachten und nicht zwei identische Dateien laden. Die ersten 30 Karten behalten ihre unabhängigen Reliefmotive.

`front` und `back` verweisen auf die Druckquellen (PNG oder SVG), `frontTexture`/`backTexture` auf die pro Objekt eingebetteten Rasterdateien unter prints/. `thumbnail` ist eine kleine Vorschau mit erhaltenem Bildseitenverhältnis. Die Druckquellen und Originalreferenzen bleiben als Entwicklungs-/Reviewmaterial separat, die GLBs brauchen keine externen Texturen.

## Quellen und Bearbeitung

Empire State und Manhattan: Halloween-Bildbearbeitung der beiden gelieferten Buchfotos über eingebautes Imagegen. Die Architektur bleibt das erkennbare Motiv; beschnittene fremde Seitenfragmente werden im Druckbild bereinigt. Prompts: `sources/collection/PRINT-STUDIES-PROMPTS.md`.

Focus und Sprachentabelle: native SVG-Drucklayouts mit den gelieferten Original-PNGs unverändert als eingebettete Bilder. Die Originalboxen werden nicht durch ein Bildmodell neu geschrieben. Unter dem Original stehen klar getrennte neue Beispiele. Die Relativsatzkarte ergänzt „The witch who lives next door is friendly“ und „This is the lantern which lights our gate“. Die Sprachkarte ergänzt parallel britische und amerikanische Sätze mit favourite/favorite, colour/color, neighbour/neighbor und biscuits/cookies. Die originalen Aussparungen und Tabellen der Buchbilder bleiben erhalten. Neues Lern-/Postkartenmaterial ist keine Buchquotation und keine bewertete Aufgabe.

User-supplied book images and their derivative print artwork retain their original provenance and are excluded from the independent-work CC0 declaration; see assets/collection/LICENSES.md. No learner data or analytics are used.

## Modellbau und Ressourcen

Reihenfolge bei Änderungen: `node tools/print-studies.cjs`, `node tools/print-textures.cjs`, dann Blender mit `sources/collection/build-prints.py`. Die Pfade hier gelten relativ zu Prototyp/marktplatz; das Texturwerkzeug erwartet den lokalen Server auf Port 5188. Das vollständige Basis-Katalogskript heißt `tools/extend-almanac.cjs`.

Native Quelle: `sources/collection/textbook-prints.blend`; vier separate Papierflächen mit geringfügig gerundeten Kanten und vollständigen Vorder-/Rückseiten-UVs. Je 112 Dreiecke, drei Materialien/Draw Calls. Texturen maximal 1024 Pixel pro Kante. Exportbericht: `assets/collection/prints/model-audit.json`, Rastergrößen: `texture-audit.json`. Der Builder importiert alle vier Exporte erneut und vergleicht Geometrie, Maße, Materialien und Druckseitenorientierung. Visuelle Abnahme bleibt beim Nutzer; keine neuen Screenshots.

Die alten Relief-Builder/Atlaswerkzeuge überspringen `printed-surface`, damit sie die neuen Druckdateien nicht als Reliefkarten überschreiben. Der Druck-Builder ist ein eigener Exportweg.

## Vorschau und spätere Integration

Nur das aktive Modell laden, vorhandenen Vier-Modell-Cache und Disposal weiterverwenden. Bei Druckkarten auf die längste Kante normalisieren und die Kamera aus Breite, Höhe, Sichtfeld und tatsächlichem Canvas-Seitenverhältnis berechnen. Beim Wechsel auf eine normale Karte die ursprünglichen Zoomgrenzen zurücksetzen. Querformate müssen auch im Hochformat vollständig sichtbar sein; der Rohdruck-Link erlaubt das Lesen ohne 3D-Perspektive. Unlit-Druckmaterial und NoToneMapping erhalten Schrift-/Bildfarben; die Papierkante wird beleuchtet.

Im eigentlichen Spiel Renderer und Controls an den bestehenden Mount/Dispose-Lebenszyklus anschließen, keine eigene endlose zweite Dorf-Renderloop übernehmen. Datenvertrag, Besitz-/RPC-Grenzen und Achievements-Platzhalter bleiben wie in INTEGRATION_COLLECTION.md; diese Druckstudien implementieren keine Belohnungen und keine Spielintegration.

## r09 · zusätzlicher Legendary-Coverdruck

Jetzt zwölf Druckobjekte und insgesamt 42 aktive Karten: 15 Normal, 14 Rare, 12 Epic, eine Legendary. Die neue `highlight-halloween-card` (Nummer 50) verwendet das vorhandene Highlight-8-Halloween-Cover samt Meme-Rückseite, hat eine goldene Kante und ist die einzige aktive Legendary-Karte. Dasselbe Bild dient als sichtbarer Almanach-Umschlag. `catalog.almanacCover.requiresCardOwnership` ist false; Darstellung und späterer Besitz sind getrennt. Die Druckkarte ist ein weiteres thin-paper GLB mit 112 Dreiecken und drei Materialien. `season-rarities.cjs` erzwingt die Exklusivität. Die drei früheren aktiven Legendary-Karten wurden zu Epic umgestellt. Gesamtübergabe: `CLAUDE_HANDOFF.md`.

## r10 · Classroom Curses

Acht weitere gedruckte Spaßkarten ergänzen das Set auf zwanzig Druckobjekte und insgesamt fünfzig aktive Karten (18 Normal / 17 Rare / 14 Epic / eine Legendary). Serie classroom-curses, Nummern 51–58. Original-Bilder mit exakten Imagegen-Prompts und alle Druckdateien liegen unter prints/curses/. kind=humour, description/effects/flavour sind getrennte englische Inhaltsfelder. satire=true und effectMode=flavour-only schließen jede echte Disziplinar-/Gameplay-Aktion aus. Die UI zeigt English Imaginary effect und Self-aware remark; Packfilter grenzt genau die acht Karten ein. tools/classroom-curses.cjs wird vom bestehenden Kataloggenerator aufgerufen; season-rarities.cjs erhält die einzelne Legendary-Coverkarte. Quellen und Aufrufe in CLAUDE_HANDOFF.md.
