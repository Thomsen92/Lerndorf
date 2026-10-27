# Buch-Cover-Studie · aktuelle Revision r05

Die Nutzerkorrektur ist der aktuelle Auftrag: **nur das vorhandene Buchcover als Halloween-Version bearbeiten und direkt auf ein erkennbares 3D-Buch legen**. Die vorherigen acht Figurenvarianten kommen auf die Ersatzbank. Keine Änderungen außerhalb Prototyp/marktplatz, keine Commits oder Pushes, visuelles Review beim Nutzer.

Umsetzung: ein flaches, vollständig lesbares Coverbild mit erhaltenem Titel, Schulart, 8, R, gelben Farbbändern und Verlagslogo. Halloween-Änderungen im Motiv: Blutmond, Nebel, Fledermäuse und Kürbisfackel. Das ganze Bild wird ohne Beschnitt auf den Vorderdeckel gelegt. Schlichter gelber Rücken/Rückdeckel, cremefarbener Seitenblock und feine Seitenkanten. Keine Figur auf der Buchfläche, kein Kartenrahmen, keine neue Personenszene.

Eigene Vorschau: book.html / book.js / book.css. Einstieg über den Buch-Teaser in collection.html. Manuell drehen/zoomen, Cover-/Rückseitenknopf; keine automatische Drehung. Bei reduzierter Bewegung ohne Kamera-Nachlauf. Die aktive Sammlung enthält wieder 30 Karten; acht Figurendefinitionen stehen mit status=benched unter catalog.archivedCards. Ihre GLBs, Druckvorlagen, Blender-Quelle und das alte Ensemblebild bleiben erhalten.

Quellen: build-book.py und highlight-halloween-book.blend. Modell: assets/collection/textbook/highlight-halloween-book.glb. Original und bearbeitetes Cover bleiben separat; die eingebettete Textur ist 744 × 1024 Pixel groß. Prompt und Herkunft: BOOK-COVER-PROMPT.md. Keine Behauptung einer künstlerischen Freigabe. Der neue Buch-Export wird getrennt von den Karten geprüft.

Technischer Nachweis: 866 Dreiecke, vier Materialien/Draw Calls. GLB in Blender reimportiert; Maße, Dreiecke, Frontnormale und vollständige UV-Abdeckung stimmen. Buchvorschau mit 15 Browserprüfungen; Bericht unter assets/collection/textbook/book-browser-audit.json. Weitere Kartenprüfungen unter assets/collection/browser-audit.json. Keine neuen Screenshots.
