# Buch-Cover-Studie · Übergabe

Aktueller Stand r05: Die Figurenversionen waren ein Missverständnis der gewünschten Cover-Bearbeitung. Es sind wieder **30 Karten aktiv**, unverändert mit den belegten Originalversen. Die acht Figurenvarianten sind vollständig erhalten und unter `catalog.archivedCards` mit `status: benched` zurückgestellt. Die UI liest ausschließlich `catalog.cards`; archivierte Einträge nicht als aktive oder freischaltbare Karten importieren.

`catalog.bookStudy` verweist auf eine **separate Buchstudie**, keinen zusätzlichen Karten-/Achievement-Typ. Einstieg `collection.html` → `book.html`; `book.html?view=back` öffnet direkt die neue Meme-Rückseite. Beide bearbeiteten Umschlagseiten liegen als vollständige Texturen direkt auf einem einfachen geschlossenen 3D-Buch. Cover, blauer Titelzusatz, Jahrgang und gelbe Bänder bleiben erkennbar. Die gelieferte Rückseite und Polizeiszene werden zum Halloween-Wortspiel „driving you batty“. Vorderdeckel, Rücken, Rückdeckel und Papierkanten sind echte Geometrie. Keine Spielintegration, Konten oder Besitzlogik.

Dateien:

- `book.html`, `book.css`, `book.js`: eigenständige lokale Vorschau mit OrbitControls, Cover/Rückseite, Download und Tastaturbedienung.
- `assets/collection/textbook/highlight-halloween-cover.png`: vollständige Imagegen-Cover-Bearbeitung der gelieferten Referenz.
- `assets/collection/textbook/reference-book-cover.png`: zugehörige Originalreferenz.
- `assets/collection/textbook/highlight-halloween-texture.png`: eingebettete Drucktextur, 744 × 1024.
- `assets/collection/textbook/highlight-halloween-back.png`: Meme-Rückseite aus gelieferter Rückseitenvorlage und Polizeiszene; zugehörige Referenzen `reference-back-cover.png` und `reference-traffic-stop.png`.
- `assets/collection/textbook/highlight-halloween-back-texture.png`: zweite eingebettete Textur, 744 × 1024; Rückseiten-UVs lesen von hinten korrekt und sind nicht gespiegelt.
- `assets/collection/textbook/highlight-halloween-book.glb`: eigenständiges GLB mit beiden eingebetteten Texturen; 868 Dreiecke, fünf Materialien.
- `sources/collection/build-book.py`, `highlight-halloween-book.blend`: reproduzierbare Geometrie und editierbare native Quelle.
- `sources/collection/BOOK-COVER-PROMPT.md`, `BOOK-BACK-PROMPT.md`: genaue Prompts und Herkunft; der neue Meme-Text ist keine Schulbuchquotation.
- `assets/collection/textbook/book-audit.json`, `book-browser-audit.json`: Export- und Browserprüfung; gestalterische Abnahme beim Nutzer.

Für eine spätere Übernahme die bestehende Three.js-Version des Spiels verwenden und Renderer, ResizeObserver, Controls, Events und RAF in den Ansichts-Lebenszyklus integrieren/freigeben. Covertextur im GLB halten; keine absoluten Dateipfade übernehmen. `KHR_materials_unlit` erhält die Coverfarben, Buchkanten bleiben physisch beleuchtet. Die Vorschau dreht nicht automatisch; bei reduzierter Bewegung ist der Kamera-Nachlauf aus. Verdeckte Seite pausiert die Renderloop. Das Gesamtbudget später auf Schul-Tablets prüfen.

Die alten Figurenmodelle und das Ensemble-Konzept sind archiviertes Entwurfsmaterial. Das Konzeptbild ist kein Render des Buches. Rechte der bereitgestellten Buchvorlage bleiben bei den jeweiligen Rechteinhabern; das bearbeitete Cover gehört nicht zur CC0-Erklärung eigenständiger Originalarbeiten. Die Bildbearbeitung erfolgt auf Basis der vom Nutzer gelieferten Vorlage; diese Herkunft zusammen mit den Assets erhalten.

## r09 · zwei Rollen desselben Covers

Das bestehende Cover/Meme dient nun zugleich als Umschlag des Seasonal Almanac und als einzige Legendary-Sammelkarte (`highlight-halloween-card`, Nummer 50). Das dicke Buchmodell bleibt unter textbook/; die dünne Karte liegt unter prints/highlight-halloween-card.glb. Bilddaten werden wiederverwendet, nicht neu generiert. `catalog.almanacCover` beschreibt den unabhängig vom Kartenbesitz zugänglichen Umschlag; die Karte ist eine separate spätere Besitz-/Belohnungsdefinition. UI-Einstiege verlinken Almanach und Karte, keine aufwendige Aufklappanimation. Genaue Integrationsentscheidung und Seltenheitsregel: `CLAUDE_HANDOFF.md`.
