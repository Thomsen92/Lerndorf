# Halloween-Marktplatz

**Maßgebliche Korrektur r14:** Aktiver Stand ist jetzt der gelieferte Halloween-Shop mit **genau einer großen Katze** und dem Candy Cauldron davor: `assets/season-starter/halloween-shop-event.glb`, 19.818 Dreiecke / drei Materialien; editierbar `sources/season-starter/halloween-shop-event.blend`. Der eigene violette Stand bleibt unter `assets/season-starter/bench/custom-stand-r1/` auf der Ersatzbank. `stand.html` zeigt das neue Ensemble. Welcome enthält nur Quiz (150 XP) und LearnPass, keine Sammelkarten-/Boxen-Erklärung oder Collection-Link. DeepSeek erhält zusätzlich `DEEPSEEK_WHATS_INSIDE_3D.md`: antippbare Gegenstände in „What’s in it?“ mit großer drehbarer 3D-Vorschau. Frühere r13-Standangaben unten sind historisch und durch diese Korrektur ersetzt.


Eigenständiger 3D-Stilprototyp für Lerndorf / Englisch 8a und 8b. Stand: 27.10.2026.

**Neu: fertiger Spooky-Stand mit deiner Halloween-Katze als Maskottchen.** `stand.html` zeigt ihn drehbar im normalen Dorflicht; Modell oder Ticket anklicken öffnet die Welcome-Vorschau. GLB: `assets/season-starter/spooky-stand.glb` (11.022 Dreiecke, neun Materialien, Katze bereits enthalten). Bearbeitbare Quelle: `sources/season-starter/spooky-stand.blend`. Der Standbau ist aus DeepSeeks Aufgaben entfernt; Platzierung und echte Spielaktionen stehen in `DEEPSEEK_SPOOKY_STARTER.md`, kompakte Asset-Übergabe in `STAND_INTEGRATION.md`. Zehn Quizfragen, Ticket und vier Edge-TTS-MP3s sind vorbereitet; Quiz-/LearnPass-Buttons bleiben in dieser Modellvorschau ausdrücklich deaktiviert.

Aktuell: **50 aktive Karten** – 30 Reliefkarten, zwölf Buch-/Cover-Druckkarten und acht neue **Classroom Curses** mit selbstironischen englischen Beschreibungen und imaginären Effekten. Das Highlight-8-Cover bleibt Almanach-Umschlag und einzige Legendary. Die acht früheren Figurenvarianten bleiben auf der Ersatzbank. **Aktuelle Abnahme- und Implementierungsübergabe für Claude: `CLAUDE_HANDOFF.md`.**

**Vergaberegel r11 für die spätere Integration:** 18 Normal + 17 Rare zusätzlich zum Geld auf den 24 LearnPass-Münzfeldern (ein/zwei Karten je Feld); 14 Epic + eine Legendary ausschließlich aus Seasonal Boxes. Keine Kartenduplikate. Zuordnung und Regeln: `assets/collection/card-acquisition.json`; detaillierter Server-/Datenbankplan: `DEEPSEEK_UMSETZUNGSPLAN.md`, Pakete 8–9. Bereits abgeholte Passfelder bekommen nur fehlende Karten nachgetragen. Truhen-Kartenchancen sind noch festzulegen. Im Prototyp sind alle Karten anschaubar; echte Vergabe/Besitz sind nicht angeschlossen.

Überarbeitung nach Nutzerfeedback: deutlich dunklere, rötliche Beleuchtung, fast doppelt so großer tiefroter Blutmond mit stärkerem rotem Halo. Zombies und Skelett haben kurze, ungleiche Schritte mit nachgezogenem Fuß; Vampir und Friedhofswärter ergänzen die Szene auf insgesamt fünf Figuren. Die visuelle Abnahme dieser Überarbeitung übernimmt der Auftraggeber. Die sieben vorhandenen Screenshots zeigen noch die erste Fassung; der neue rein technische Prüfbericht ist `screenshots/verification-revision.json`.

Brunnen-Revision: knapp 20 % größerer Steinbrunnen mit blutrotem Wasser. Ein großer Kürbis steht vorne auf der Mittelachse, davor drei einzelne leuchtende Kerzen auf einem dezenten Beschwörungskreis. Acht dünne, glatte Wasserstrahlen starten direkt über dem oberen Wasserspiegel und fallen auf Schwerkraftkurven ins Becken. Bewegte Reflexe, kleine Spritzer am Auftreffpunkt und sich ausbreitende Wellen ersetzen die zuvor zu kantigen Strahlen mit großen Tropfen. Bei „Weniger Bewegung“ bleiben Wasser und Flammen still.

Bewegungsfix: Die Strahlgeometrie selbst bewegt sich nun durch sanfte Druckschwankungen und laufende Wellen; feine Reflexe wandern sichtbar entlang der Bögen. Zuvor war die Geometrie unverändert geblieben, während nur sehr schwache Reflexe/Spritzer animiert wurden. `tools/fountain-motion.cjs` prüft echte Vertexkoordinaten zwischen Frames und die Bewegungspause; Ergebnis in `screenshots/fountain-motion.json`.

Neu: eine zusätzliche senkrechte Fontäne in der Mitte mit „kurz–kurz–lang“-Stößen und Pause in einer 2,8-Sekunden-Schleife. „Example plot“ zeigt ein entferntes, umzäuntes Beispielgrundstück mit freier Rasen-Baufläche. Sechs Lampen und zehn Kürbisse stehen ausschließlich im öffentlichen Randstreifen und am Zugangsweg. Ein zweiter Klick führt zurück zum Markt.

## Season-Sammlung

„Season collection“ öffnet `collection.html` im gleichen Ordner. **Cards** ist ein Almanach mit zwei Buchseiten, Inhaltsverzeichnis, Suche und Vor-/Zurückblättern. Kapitel: **Normal (18), Rare (17), Epic (14), Legendary (1)**. Der Knopf **8 Classroom Curses · British humour** filtert das neue Spaßkarten-Set. **Achievements** zeigt ausschließlich „Coming later“; Erfolgs- und Freischaltlogik sind noch nicht implementiert.

- **50 aktive Karten**, jeweils drehbar und als GLB herunterladbar. Die bisherigen 30 haben zusätzlich separate 3D-Reliefmotive. Zwanzig Druckobjekte sind dünne Karten/Postkarten mit Texturen. Alle lassen sich umdrehen; „Druckbild in voller Größe“ öffnet die volle Druckquelle. Maus, Touch, Mausrad/Pinch und Pfeiltasten bedienen die Ansicht.
- Inhalte: **11 traditionelle Sprichwörter**, **6 belegte Originalverse** von Taylor, Lear, Stevenson, Blake, Rossetti und Shakespeare, Grammatik, Vokabeln und der traditionelle Zungenbrecher **Peter Piper**. Die Originalauszüge zeigen Autor, Werk und Quellenlink; Nachweise unter `assets/collection/LITERARY_SOURCES.md`.
- **Buchstudie:** Einstieg über den Cover-Teaser → `book.html`. Das Buchcover selbst ist die Halloween-Version: vertrautes Layout, Blutmond, Nebel und Kürbisfackel. Schlichtes 3D-Buch mit vollständiger Covertextur; kein Figurenmotiv und kein Kartenrahmen. Die acht früheren Figurenkarten sind zurückgestellt und werden nicht geladen.
- Beispiele: **Better Late Than Never**, **Practice Makes Perfect**, **The Star**, **The Tyger**, **The Witches’ Chant** und **Peter Piper’s Practice**.
- Vier Profilrahmen und sechs Titel bleiben unter `designs.html` als Entwurfsarchiv erhalten; sie sind keine bereits implementierten Achievements.

Karten-GLBs liegen unter `assets/collection/cards/` und enthalten ihren 1024 × 768 Texturatlas. Je Karte **1.020–2.288 Dreiecke**. Motive liegen unter `assets/collection/motifs/` und haben **64–1.332 Dreiecke**. Die physische Kartenfläche ist 72 × 108 mm; Karton etwa 3 mm, mit Relief tiefer. Kleine 128 × 192 Vorschaubilder halten den Index leicht. Nur das aktive GLB wird geladen; maximal vier Karten-/Motivmodelle bleiben im Cache.

Editierbare erweiterte Blender-Quelle: `sources/collection/halloween-almanac.blend`. Die ursprüngliche Sechs-Karten-Quelle `halloween-collection.blend` bleibt erhalten. Reproduzierbare Quellen: `build-cards.py`, `textbook-figures.py`, `tools/extend-almanac.cjs` (ruft `classic-verses.cjs` und `textbook-cards.cjs` auf), `tools/collection-art.cjs`, `tools/collection-atlas.cjs`; SVG-Kartenseiten liegen neben den GLBs.

`assets/collection/catalog.json` enthält stabile IDs, Seltenheiten, Englischtexte und Quellen. `cards` enthält 42 aktive Karten; `archivedCards` enthält die acht zurückgestellten Figuren. Druckobjekte haben `format: printed-surface`. `bookStudy` verweist auf die separate Coverstudie. Keine Besitz- oder Freischaltlogik. Eigenständige Originalarbeiten sind CC0; Buchreferenzen und davon abgeleitete Bilder sind ausgenommen. Details: `assets/collection/LICENSES.md`. Kartenprüfung: `browser-audit.json` (240 Checks); Druckexporte: `prints/model-audit.json` (zwölf Modelle); Buchprüfung: `textbook/book-audit.json` und `book-browser-audit.json` (19 Checks). Gestalterische/fachliche Abnahme durch Claude/Nutzer, keine neuen Screenshots.

Die zwölf Druckobjekte liegen unter `assets/collection/prints/`. Je **112 Dreiecke, drei Materialien**, zwei eingebettete Texturen mit maximal 1024 Pixeln pro Kante. Neun Originalausschnitte sind unveränderte PNGs in editierbaren SVG-Layouts; neue Beispiele stehen darunter. Die beiden Foto-Postkarten wurden mit dem eingebauten Imagegen-Werkzeug bearbeitet. Native Quelle: `sources/collection/textbook-prints.blend`, Builder: `build-prints.py`. Daten/Layout: `tools/print-studies.cjs`, `tools/more-print-studies.cjs`; Rasterisierung: `tools/print-textures.cjs`. Prompts und Referenzentscheidungen: `sources/collection/PRINT-STUDIES-PROMPTS.md`.

Das alte Ensemblebild und die Figurenmodelle bleiben als zurückgestelltes Entwurfsmaterial erhalten; sie werden aktuell nicht in der Vorschau gezeigt. Das **bearbeitete Buchcover** liegt unter `assets/collection/textbook/highlight-halloween-cover.png`, die neue Meme-Rückseite unter `highlight-halloween-back.png` im gleichen Ordner. Die Rückseite verwendet die gelieferte Polizeiszene mit „Do you know why I stopped you?“ / „Because I’m driving you batty?“ und einer kleinen Idiom-Erklärung. Direkte Vorschau: `book.html?view=back`. Beide Seiten sind direkt auf den Buchdeckeln texturiert; die Rückseite ist beim Umdrehen nicht gespiegelt. Genaue Imagegen-Prompts: `sources/collection/BOOK-COVER-PROMPT.md` und `BOOK-BACK-PROMPT.md`. Das Buchmodell: `textbook/highlight-halloween-book.glb`, **868 Dreiecke, fünf Materialien**, zwei eingebettete Texturen mit je 744 × 1024. Native Quelle: `sources/collection/highlight-halloween-book.blend`, Builder: `build-book.py`. Die ursprünglichen Referenzen bleiben separat erhalten. 18 technische Buch-Browserprüfungen erfolgreich; visuelles Review beim Nutzer.

Die anstehende Integration ist in **`INTEGRATION_COLLECTION.md`** beschrieben: Navigation, Datenvertrag, stabile IDs, Besitz-/RPC-Grenzen, Cache, Renderer-Lebenszyklus, offene Produktentscheidungen und Achievements-Abgrenzung. Der Prototyp verändert die eigentliche Anwendung nicht.

## Start

Im Hauptordner des Repositorys:

```powershell
npx serve Prototyp/marktplatz
```

Die vom Server angezeigte lokale Adresse öffnen, normalerweise `http://localhost:3000`.
Alternative mit vorhandenem Python, ohne Installation weiterer Pakete:

```powershell
python -m http.server 5188 --bind 127.0.0.1 --directory Prototyp/marktplatz
```

Dann `http://127.0.0.1:5188` öffnen. `index.html` braucht einen HTTP-Server; ein Doppelklick über `file://` genügt für die Module/GLBs nicht. Der komplette Ordner lässt sich an einen anderen Ort kopieren und dort statisch ausliefern. Alle Laufzeitmodule, Modelle, Texturen und Schriften sind lokal und relativ verlinkt; kein Build, CDN oder Konto nötig.

## Inhalt und Bedienung

- Blutmond mit Halo und Sternen, kalter Nachthimmel, Distanznebel und langsame Bodennebelschwaden.
- Vier gestreifte Marktstände: Kürbisbude „Season I – Halloween“, Tränke, Süßigkeiten und Kürbisse. Zentraler Blutbrunnen mit animierten Wasserstrahlen; großer Kürbis und drei Kerzen davor.
- 24 flackernde Lampions an zwei durchhängenden Ketten, warme Lichtflecken, leuchtende Kürbisse, kahle Kürbisbäume, Gräber, Kerzen, kaputte Zäune und schiefe Tannen.
- Fünf langsame Nebenfiguren: zwei Kenney-Zombies, ein Skelett, ein Vampir und ein Friedhofswärter. Schleppender Gang mit bewegten Beinen bei Zombies/Skelett; ruhiger, gleichmäßiger Gang bei Vampir/Wärter. Keine Schreckeffekte oder Gewalt.
- Ruhige Umkreisung beim Start. Mit Maus oder einem Finger ziehen: drehen. Mausrad oder zwei Finger: zoomen. Manuelles Drehen stoppt die Tour; „Start tour“ setzt sie fort. Der runde Pfeil setzt die Kamera zurück. Nach Fokus auf die Szene funktionieren auch Pfeiltasten.
- „Enter the season“ oder der kleine „Welcome ↗“-Knopf direkt an der Season-Bude öffnet die Willkommensmeldung. Escape oder Schließen führt zurück. Der Dialog pausiert die Umkreisung.
- „Weniger Bewegung“ berücksichtigt beim Start auch die Systemeinstellung. Es stoppt Umkreisung, Figuren und Nebelbewegung und macht die Lampions konstant. Die Kamera bleibt von Hand bedienbar. Verdeckte Browserseiten stoppen ihre Animationsschleife.
- „Scene details“ zeigt aktuelle FPS, Draw Calls, Dreiecke und Auflösung.

## Dateien

| Datei / Ordner | Inhalt |
| --- | --- |
| `index.html`, `style.css` | Bühne, lokale Schrift, Bedienelemente, Meldung |
| `scene.js` | Renderer, Laden, Himmel/Nebel, Kamera, Bewegung, Interaktion und Messwerte |
| `world.js` | Platzaufbau, eigener PRNG, Seed `131026`, Materialbündelung und Instancing |
| `fountain.js` | Dünne Wasserstrahlen auf ballistischen Kurven, animierte Reflexe, Spritzer, Wasserwellen und drei Kerzenflammen |
| `plot.js` | Freies Beispielgrundstück mit ausschließlich außen liegender saisonaler Dekoration |
| `collection.html`, `collection.css`, `almanac.js` | Almanach, Seltenheitskapitel, Suche, drehbare Karten/Motive und Achievements-Platzhalter |
| `designs.html`, `designs.js` | Erhaltenes Entwurfsarchiv für Rahmen und Titel |
| `assets/` | Ausschließlich verwendete GLBs, benötigte Farbtexturen und lokale Schrift |
| `assets/inventory.json` | Bestandsaufnahme der sechs bereitgestellten Kenney-Bereiche und aller 28 Season-I-Modelle |
| `assets/used-assets.json` | Benutzte Marktplatzmodelle, Instanzanzahlen, Dateigrößen und Quelldreiecke; Sammlungsmodelle separat unter `assets/collection/` |
| `vendor/` | Three.js **0.170.0**, OrbitControls, GLTFLoader, BufferGeometryUtils, MeshoptDecoder und MIT-Lizenzen |
| `KONZEPT.md`, `PLAN.md` | Bildkonzept und abgearbeiteter Ablauf |
| `screenshots/` | Selbst geprüfte Desktop-, Detail-, Tablet- und Hochformatansichten; Messprotokoll |
| `tools/` | Optionale Entwicklungsprüfung mit dem bereits im Repository vorhandenen Playwright; für den Betrieb nicht erforderlich |

## Asset-Liste und Quellen

Alle Modellkopien bleiben geometrisch unverändert. Farbvarianten der vorhandenen Standmarkise entstehen erst beim Rendern. Externe Kenney-Texturen liegen jeweils unter `Textures/colormap.png`. Season-I-Texturen sind in den GLBs eingebettet. Der MeshoptDecoder wird vor dem Laden registriert und lokal mitgeliefert.

| Quelle | Kopierte Modelle | Lizenz |
| --- | --- | --- |
| `web/public/assets/kenney/graveyard/` | `pumpkin`, `pumpkin-carved`, `gravestone-round`, `lantern-candle`, `candle-multiple`, `fence-damaged`, `debris`, `detail-bowl` | Kenney Graveyard Kit, CC0; Originaltext in `assets/kenney/graveyard/LICENSE.txt` |
| `Kenny/Graveyard/Models/GLB format/` | `character-zombie`, `character-skeleton`, `character-vampire`, `character-keeper`, `candle`, `bench`, `iron-fence`, `grave`, `pine-crooked` | Gleiches Kenney-Paket, CC0 |
| `web/public/assets/kenney/town/` | `stall-green`, `fountain-round-detail`, `rock-small` | Kenney Fantasy Town Kit, CC0; Originaltext in `assets/kenney/town/LICENSE.txt` |
| `web/public/assets/season1/` | `jack-o-lantern-tree`, `kit-cauldron`, `spooky-pumpkin-cat`, `candy-pile` | CC0 laut vorhandenem Season-I-Manifest, vom Auftraggeber am 26.10.2026 bestätigt |
| `web/public/fonts/` | Comic Neue Regular/Bold, `OFL.txt` | SIL Open Font License |
| Eigene Geometrie und Canvas-Texturen | Pflasterringe und Fugen, Weg, Schilder, Lampions und Ketten, Licht-/Schattenflecken, Mond, Halo, Nebel, Blätter, Beschwörungskreis sowie Wasser-/Flammeneffekte | Eigene Erstellung; diese prozeduralen Bild-/Geometrieelemente dürfen als CC0 weiterverwendet werden |

Paketquellen: [Kenney Graveyard Kit](https://kenney.nl/assets/graveyard-kit), [Kenney Fantasy Town Kit](https://kenney.nl/assets/fantasy-town-kit). Softwarelizenzen: `vendor/LICENSE` und `vendor/LICENSE-meshoptimizer.md`.

Für die Marktplatzdekoration war kein neues Blender-Modell nötig. Die anschließend gewünschten sechs Sammelkarten wurden als eigene Blender-Modelle erstellt; Quellen und Lizenznotizen liegen ausschließlich in diesem Prototypordner. Das zunächst betrachtete Horrorhaus wurde nach Sichtprüfung weggelassen: zu detailliert für die gewünschte Comic-Silhouette. Seine Originaldatei bleibt bestehen.

## Sichtprüfung und Leistung

Die Übersicht und Detailansichten der ersten Fassung wurden selbst angesehen und mit `Konzept/Stil_Referenz/Soll_02_Marktplatz.jpg` sowie `docs/LOOK.md` verglichen. Die nun dunklere und rötlichere Überarbeitung wartet gemäß Nutzerwunsch auf dessen visuelles Review. Die Hochformatansicht hat kompaktere Bedienelemente.

Gerenderte Szene: **bis zu 115.179 Dreiecke, 112 Draw Calls**. Beim ersten Bild einschließlich Schattenkarte maximal **125.437 Dreiecke, 120 Draw Calls**. Damit bleiben beide Budgets auch beim Schattenaufbau unter 150.000 / 150. Statische Geometrie wird nach Material zusammengeführt, gleiche Modelle werden instanziert. Die Schattenkarte wird einmal aufgebaut; fünf warme Punktlichter einschließlich Kerzen- und Grundstückslicht werfen keine zusätzlichen Schatten. Pixelratio maximal 1,5, im Tabletformat 1; bei niedriger Bildrate wird eine höhere Auflösung auf 1 zurückgenommen.

Die aktuellen FPS und der Grafiktreiber stehen in `screenshots/verification-revision.json`; `screenshots/verification.json` dokumentiert die erste Fassung. Gemessen wird über mehrere Sekunden nach dem Laden, nicht nur aus einem einzelnen Frame. Der GPU-Test nutzt einen Desktop mit NVIDIA GeForce RTX 4070 / Chromium / Direct3D11, auch für das emulierte Tabletformat 1024 × 768. **Das ist keine Messung auf einem echten Schul-Tablet. Die geforderten mindestens 30 FPS dort müssen noch am Gerät bestätigt werden.** Ein früher Software-WebGL-Test lag unter 30 FPS; er wird nicht als Tablet-Nachweis verwendet.

| Messung mit Desktop-GPU | Mittelwert | 95. Perzentil der Framezeit |
| --- | --- | --- |
| 1440 × 960, normale Bewegung | 70,0 FPS | 14,4 ms |
| 1024 × 768, Systemeinstellung „Weniger Bewegung“ | 69,9 FPS | 14,4 ms |

Die Browserprüfung kontrolliert beide Season-Knöpfe, Dialog/Fokus, Drehen/Zoomen, Touch, automatische Umkreisung, System-/manuelle Bewegungsreduktion, unveränderte Seed-Platzierung über mehrere Ladevorgänge, lokale Requests ohne Ladefehler und die Renderbudgets. Alle Ergebnisse stehen im JSON-Protokoll.

Die optionale Wiederholung benötigt die Entwicklungsabhängigkeiten unter `web/node_modules`, einen gestarteten Server auf Port 5188 und ein installiertes Playwright-Chromium:

```powershell
node Prototyp/marktplatz/tools/verify.cjs
```

Bei abweichender Installation lassen sich `MARKET_CHROMIUM` (absoluter Browserpfad), `MARKET_URL` (Serveradresse mit abschließendem `/`), `MARKET_ANGLE` (z. B. `d3d11`) und `MARKET_SOFTWARE=1` setzen. Die Prüfwerkzeuge schreiben ihre Ergebnisse nur in diesen Prototypordner. Ein Hash-Audit schützt insbesondere den freigegebenen `Prototyp/index.html` und `docs/LOOK.md`. Zeitgleich auftretende externe Änderungen an anderen beobachteten Dateien werden protokolliert und bleiben erhalten.

## Spätere Integration ins Dorf

1. Aufbau und Asset-Zuordnung aus `buildWorld()` in ein eigenes saisonales Szenenmodul übernehmen; Seed und Koordinaten an den bestehenden Marktplatz binden. Den vorhandenen Dorf-Renderer samt Kamera und Animationsschleife weiterverwenden.
2. Vorhandene Three.js-/Loader-Instanzen nutzen; diese lokale Vendor-Kopie gehört nur zum eigenständigen Prototyp. `setMeshoptDecoder()` muss vor Season-I-Ladevorgängen bestehen bleiben.
3. Beide Welcome-Aktionen an den echten LearnPass-Einstieg anschließen. Hier gibt es ausschließlich einen lokalen Dialog und keinerlei Belohnungs-, Konto- oder Fortschrittslogik.
4. Season-Objekte beim Szenenwechsel geordnet entfernen und Geometrien, Materialien, Texturen und Listener freigeben. Die gemeinsame Schattenkarte nur nach tatsächlichen Szenenänderungen aktualisieren.
5. Nach Integration das kombinierte Dorf-Budget und 30 FPS erneut auf dem ältesten Schul-Tablet prüfen; das Budget dieser isolierten Szene ist kein Gesamtbudget des Dorfes.

Keine Schülerdaten, Netzwerkanalysen oder Analytics. Keine Commits und kein Push. Die Arbeiten an diesem Prototyp schreiben ausschließlich unter `Prototyp/marktplatz/`.

## Verbindliche Rollen und Seltenheiten · r09

Das Highlight-8-Halloween-Cover ist **beides**: Umschlag des Seasonal Almanac und eigenständige Sammelkarte `highlight-halloween-card` (Nummer 50). Die Coverkarte ist die **einzige aktive Legendary**. Verteilung: 15 Normal / 14 Rare / 12 Epic / 1 Legendary; insgesamt 42 Karten. Blood Moon Story, Fortune Favours the Brave und Knowledge Is Power sind nun Epic; ihre Aufdrucke und GLBs wurden entsprechend aktualisiert. `tools/season-rarities.cjs` erzwingt die Regel reproduzierbar. Almanachzugang hängt nicht vom Besitz der Karte ab; der Umschlag vergibt keine Belohnung. Echte Kartenvergabe bleibt Teil der späteren Integration durch Claude. `catalog.almanacCover`, `rarityPolicy` und `bookStudy.almanacCoverCardId` halten die Rollen fest. Sichtbare Einstiege öffnen den Almanachbereich, das dickere 3D-Buch oder die dünne Legendary-Karte. Aktuelle Details in `CLAUDE_HANDOFF.md`.

## Classroom Curses · r10

Acht neue Spaßkarten: Bloody Friday; Hausordnung abschreiben; Verweis; Verschärfter Verweis für Vapen; Strich! Hausaufgabe vergessen; Kerim ab in die Kühlbox; Cüss digga das Schwer; Can I go of the toilet. Jede hat ein eigenes mit dem eingebauten Imagegen-Werkzeug erzeugtes Bild, scharf gesetzte englische Beschreibung/Effekte, selbstironischen Kommentar und Halloween-Rückseite. Neue Felder: description, effects, flavour, satire=true, effectMode=flavour-only, kind=humour. Es werden keine Sanktionen oder Spielmodifikatoren ausgeführt. Die Sprüche sind Titelzitate, keine Personen-/Disziplinardaten. Zur Toilettenfrage wird die korrekte Form angeboten.

Dateien: assets/collection/prints/curses/ mit acht Original-Art-PNGs, Front-/Back-SVGs, Rastertexturen, GLBs und Thumbnails. Exakte Bild-Prompts: generation-manifest.json in diesem Ordner sowie tools/classroom-curses-data.cjs. Layout/Daten: tools/classroom-curses.cjs. Alle acht sind in sources/collection/textbook-prints.blend enthalten. Bestehender Raster-/Druckbuilder wird weiterverwendet. Je 112 Dreiecke, drei Materialien und maximal 1024 Pixel pro Texturkante. Die neue Serie hat drei Normal-, drei Rare- und zwei Epic-Karten; Highlight 8 bleibt als einzige Karte Legendary. Gesamtbestand jetzt 50 Karten, Verteilung 18/17/14/1. Aktuelle Berichte: 288 Almanachprüfungen, 48 spezielle Spaßkartenprüfungen und 19 Buchprüfungen erfolgreich. Frühere Bestandszahlen weiter oben dokumentieren die jeweiligen historischen Revisionen.
