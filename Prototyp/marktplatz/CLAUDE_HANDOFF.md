# Übergabe an Claude · Halloween-Season / Lerndorf

**Maßgebliche Korrektur r14:** Aktiver Stand ist jetzt der gelieferte Halloween-Shop mit **genau einer großen Katze** und dem Candy Cauldron davor: `assets/season-starter/halloween-shop-event.glb`, 19.818 Dreiecke / drei Materialien; editierbar `sources/season-starter/halloween-shop-event.blend`. Der eigene violette Stand bleibt unter `assets/season-starter/bench/custom-stand-r1/` auf der Ersatzbank. `stand.html` zeigt das neue Ensemble. Welcome enthält nur Quiz (150 XP) und LearnPass, keine Sammelkarten-/Boxen-Erklärung oder Collection-Link. DeepSeek erhält zusätzlich `DEEPSEEK_WHATS_INSIDE_3D.md`: antippbare Gegenstände in „What’s in it?“ mit großer drehbarer 3D-Vorschau. Frühere r13-Standangaben unten sind historisch und durch diese Korrektur ersetzt.


Stand: **27.10.2026 · r14**. Auftraggeber: Thomas. **Claude übernimmt die gestalterische/fachliche Abnahme und anschließend die Integration.** Diese Übergabe beschreibt den tatsächlich vorhandenen Prototyp und trennt ihn von den noch zu implementierenden Anforderungen. Technische Prüfungen sind erfolgt; eine gestalterische Freigabe wird nicht behauptet.

**Ergänzung r13:** Eigener Spooky-Stand mit der gelieferten Halloween-Katze fertig als Asset: `assets/season-starter/spooky-stand.glb`, 11.022 Dreiecke/neun Materialien. Vorschau `stand.html`: normales Licht, Orbit/Zoom, Lichtumschaltung und tatsächlicher Klick Modell/Ticket → Welcome. Editierbare gepackte Quelle `sources/season-starter/spooky-stand.blend`, Builder und Quellenbeleg im selben Ordner. Katze separat und Stand-Shell zusätzlich vorhanden; kombinierte GLB enthält sie bereits. DeepSeek soll **nicht mehr modellieren**, nur ins normale Dorf platzieren und echte Spielaktionen anschließen. Neuer verbindlicher Integrationsauftrag `DEEPSEEK_SPOOKY_STARTER.md`: sichtbarer Einstieg unabhängig vom Halloween-Welttheme, Season-Ticket, Welcome-Links, zehn Klickfragen und einmalige 150 XP pro Season ohne Stempel. Private Fragenquelle enthält Lösungen und darf nicht ins Browserbundle. Vier Hörsätze für Edge TTS; Audiostatus im Manifest. Die Modellvorschau bucht keine XP und deaktiviert noch nicht angeschlossene Quiz-/Pass-Aktionen.

## 1. Arbeitsgrenze und Start

Alle Arbeiten dieser Aufgabe liegen ausschließlich in **Prototyp/marktplatz/**. `Prototyp/index.html` ist das freigegebene Soll-Bild und bleibt unverändert. `docs/LOOK.md` ist Stilreferenz; unverändert. `web/src/`, Datenbank, echte Konten und Produktionsnavigation wurden hier nicht verändert. Keine Commits oder Pushes. Vor einer späteren Integration vorhandene Projektanweisungen sowie den aktuellen Arbeitsstand lesen; Änderungen anderer Chats nicht zurücksetzen. Keine echten Schülerdaten oder Analytics hinzufügen.

Start aus dem Repository-Hauptordner:

```powershell
npx serve Prototyp/marktplatz
```

Jeder statische Server ist möglich; kein Build erforderlich. Aktuelle lokale Review-Adresse ist `http://127.0.0.1:5188/`. Alle Laufzeit-Assets sind lokal/relativ. `vendor/` enthält Three.js 0.170.0, OrbitControls, GLTFLoader und MeshoptDecoder; die Season-GLBs brauchen den Decoder. Der bestehende lokale Server soll für die Abnahme erreichbar bleiben.

## 2. Tatsächlich umgesetzt

### Halloween-Marktplatz

`index.html`, `style.css`, `scene.js`, `world.js`, `fountain.js`, `plot.js` bilden die eigenständige Szene. Sie enthält dunkles rotes Licht, großen Blutmond mit Halo, Nachthimmel, Nebel, flackernde Lampions, Kürbisse, Gräber, tote Bäume und vier Marktstände. Der Season-Stand öffnet die Willkommensmeldung über UI und 3D-Interaktion.

Fünf dezente Figuren: zwei Zombies, Skelett, Vampir und Friedhofswärter. Die Zombies/Skelett bewegen sich mit kurzen, ungleichen Schritten und nachgezogenem Fuß. Quellen: vorhandene Kenney- und Season-I-Assets; kopiert, nicht aus dem Repository entfernt.

Der vergrößerte Brunnen hat blutrotes Wasser, einen großen Kürbis davor und drei leuchtende Kerzen. Acht gebogene Strahlen bewegen ihre **Geometrie** tatsächlich; dazu Reflexe, Spritzer und Wellen. Eine senkrechte Mittel-Fontäne pulst im kurz–kurz–lang-Rhythmus mit Pause. Das ist nach Nutzerkorrektur kein rein statischer Bogen mehr.

„Example plot“ zeigt ein entferntes umzäuntes Grundstück mit freier Baufläche. Saisonale Kürbisse/Lampen stehen ausschließlich am öffentlichen Rand und Zugangsweg, außerhalb des Baugrundstücks. Kamera: ruhige Umkreisung, manuelles Drehen und Zoomen. „Weniger Bewegung“ reduziert/stoppt dekorative Bewegung. Platzierung ist deterministisch mit eigenem Seed/PRNG.

### Begrüßungsbanner und Season-Erklärung

Aktuell r14: Banner und Welcome laden ausschließlich zum **Spooky English Quiz mit 150 XP** ein und verweisen auf den LearnPass. Keine Sammelkarten, Boxen-Erklärung oder Collection-Link im Welcome. In `stand.html` öffnen das gelieferte Shop-Ensemble und das Ticket denselben Dialog. Quiz-/LearnPass-Aktionen sind als noch nicht angeschlossene Spielaktionen deaktiviert. Dialog scrollbar, Escape/Fokus geprüft. Der Halloween-Marktplatz hat denselben vereinfachten Text; sein alter Season-Stand bleibt Teil der historischen Marktplatzszene, der neue Shop steht als eigene Integrationsvorlage bereit.

**Wichtig:** Boxen und LearnPass sind im Prototyp ausdrücklich Vorschau. Es gibt kein echtes Öffnen, keine Vergabe und keine Belohnungsbuchung. Banner/Dialog sind implementiert; automatische Anzeige beim ersten Eintritt in eine serverseitig aktivierte Season gehört zur folgenden Integrationsarbeit.

### Collection / Cards / Achievements

`collection.html`, `collection.css`, `almanac.js`: Almanach mit Inhaltsverzeichnis, Seltenheitsfiltern, Suche, Blättern, drehbarer Vorder-/Rückseite, Zoom und Downloads. **50 aktive Karten:** 18 Normal, 17 Rare, 14 Epic, **1 Legendary**. Das sind Bestandszahlen, keine Dropchancen. **Verbindliche Nutzerentscheidung r09:** Das Highlight-8-Halloween-Cover ist der Umschlag des saisonalen Almanachs **und** eine separat erwerbbare Sammelkarte. Diese Karte bleibt auch nach den acht neuen Spaßkarten die einzige aktive Legendary-Karte der Season. Die früheren Legendary-Karten `blood-moon-story`, `fortune-brave` und `knowledge-power` sind Epic, einschließlich Farbe und Kartenaufdruck.

30 bisherige Karten enthalten eigene Reliefmotive, darunter Grammatik, Vokabeln, traditionelle Sprichwörter, sechs belegte kurze Originalverse sowie Peter Piper. Originalverse tragen Autor/Werk/Quelle; sie stammen von Taylor, Lear, Stevenson, Blake, Rossetti und Shakespeare. `assets/collection/LITERARY_SOURCES.md` dokumentiert die Auszüge. Keine erfundenen Reime als Klassiker ausgeben.

12 zusätzliche Buchmotive sind **dünne bedruckte Flächen**, keine neu modellierten Personen oder Gebäude. Dazu zählen elf bisherige Buchmotive und die neue Legendary-Coverkarte. Die Original-Lernboxen werden als unveränderte PNGs in editierbaren SVG-Layouts eingebettet; neue Halloween-Beispiele stehen darunter. Die Postkartenfotos wurden mit dem eingebauten Imagegen-Werkzeug atmosphärisch bearbeitet. Keine externe KI-Schnittstelle wird zur Laufzeit aufgerufen.

| Druck-ID | Motiv / Inhalt |
| --- | --- |
| `empire-state-postcard` | Hochformat-Postkarte: Empire State Building mit Blutmond und Halloween-Beleuchtung |
| `manhattan-postcard` | Manhattan-Panorama als Halloween-Postkarte |
| `midnight-focus-card` | Original-Focus-Box zu Relativsätzen + Halloween-Beispiele |
| `two-ways-boo-card` | Original BE/AE-Tabelle + parallele Halloween-Sätze |
| `become-go-grow-card` | Original „werden“-Tabelle + become / go / grow im Halloween-Kontext |
| `spooky-sounds-card` | Original Buchstaben-/Lautschrift-Tabelle + zusätzliche Wortgruppen |
| `midnight-map-card` | Original Nordamerika-Karte mit Vokabelteil + Richtungsbeispiele |
| `midnight-bird-card` | Original Vogelgedicht und Bild + Lese-/Reimimpulse; Autor im Ausschnitt nicht genannt |
| `haunted-definitions-card` | Original Bild-/Definitionsaufgabe + neue who/which-Beispiele; Originalaufgabe nicht ausgefüllt |
| `spooky-as-as-card` | Original as … as-Focus-Box + Halloween-Vergleiche |
| `towers-after-dark-card` | Original Höhendiagramm samt Text + Vergleiche anhand der gezeigten Werte |
| `highlight-halloween-card` | **Einzige Legendary:** vorne Highlight-8-Halloween-Cover, hinten das bereits erstellte Meme; dieselben Bilddateien wie der Almanach-Umschlag |

Die sieben zuletzt gelieferten Motive sind die letzten sieben Tabellenzeilen. Fachlich insbesondere Relativsätze, Verbwahl, Aussprache, BE/AE, Gleichheitsvergleiche und die Lernimpulse zum Gedicht abnehmen. Karte und Diagramm wurden nicht durch Bildgenerierung neu gezeichnet oder als aktuelle neue Faktenbehauptung aufbereitet.

**Achievements bleibt Platzhalter.** Vier Rahmen und sechs Titelstudien sind unter `designs.html` erhalten, keine implementierten Erfolge/Freischaltungen.

### Separates Texturbuch

`book.html`, `book.js`, `book.css` zeigen das erkennbare Highlight-8-Buch als schlichtes 3D-Modell mit Rücken und Seitenkanten. Das vorhandene Cover wurde zur Halloween-Version bearbeitet und direkt auf den Vorderdeckel gelegt. Die vom Nutzer gelieferte Rückseite trägt das Meme aus der gelieferten Polizeiszene: „Do you know why I stopped you?“ / „Because I’m driving you batty?“ plus Idiom-Erklärung. Beide Texturen sind im GLB eingebettet; Rückseite ist beim Umdrehen richtig orientiert.

Direkt zur Rückseite: `book.html?view=back`. Native Quelle: `sources/collection/highlight-halloween-book.blend`. Modell: `assets/collection/textbook/highlight-halloween-book.glb`. Das dickere 3D-Buch dient als Almanach-Umschlagmodell. Zusätzlich gibt es die dünne Legendary-Karte `prints/highlight-halloween-card.glb`, die dieselbe Vorder-/Rückseitengrafik verwendet und in den 42 Karten enthalten ist. Beide Rollen sind sichtbar verlinkt: Umschlag anklicken/„Open the almanac“ öffnet den Almanachbereich; eigener Link öffnet die Legendary-Karte; das 3D-Buch bietet dieselben Einstiege.

**Rollen und Besitz trennen:** `catalog.almanacCover` beschreibt den gemeinsamen saisonalen Umschlag; `catalog.rarityPolicy.legendaryExclusiveCardId` bezeichnet die einzige Legendary-Karte. Der Almanach muss auch ohne Besitz dieser Karte zugänglich bleiben (`requiresCardOwnership: false`). Die Sichtbarkeit des Umschlags ist keine Vergabe und kein Besitznachweis. Das spätere Belohnungssystem soll die Karten-ID regulär vergeben können; im Prototyp sind weiterhin alle Definitionen nur frei anschaubar. Kein zusätzlicher Besitzdatensatz entsteht durch das Öffnen des Almanachs. Eine echte animierte 3D-Aufklappmechanik ist nicht implementiert; der Prototyp verbindet Umschlag und vorhandene Almanachansicht per Einstieg/Link.

### Neue Spaßkarten · Classroom Curses / r10

Acht vom Nutzer gewünschte Titel mit jeweils eigenem generierten Motiv, englischer Beschreibung, englischen imaginären Effekten, selbstironischem Kommentar und eigener Halloween-Rückseite. Die acht Bilddateien wurden mit separaten eingebauten Imagegen-Aufrufen erzeugt, in native SVG-Kartenlayouts eingebettet, lokal gerastert und als Front-/Rückseitentexturen in dünne GLBs gepackt. Es sind Texturen auf Kartenflächen, keine zusätzlich modellierten Raumobjekte. Der Knopf „8 Classroom Curses · British humour“ filtert genau diese acht.

| ID | Titel | Seltenheit |
| --- | --- | --- |
| `bloody-friday-card` | Bloody Friday | Epic |
| `school-rules-card` | Hausordnung abschreiben | Normal |
| `official-reprimand-card` | Verweis | Rare |
| `vaping-reprimand-card` | Verschärfter Verweis für Vapen | Epic |
| `forgotten-homework-card` | Strich! Hausaufgabe vergessen | Normal |
| `cool-box-card` | Kerim ab in die Kühlbox | Rare |
| `cuess-digga-card` | Cüss digga das Schwer | Rare |
| `toilet-question-card` | Can I go of the toilet | Normal |

Titel/Slang sind ausdrücklich als Nutzerzitate erhalten. Die Toilettenkarte erklärt „Can I go to the toilet, please?“ als Korrektur. Die Kerim-Formulierung ist ein fiktiver Kartentitel aus dem gelieferten Spruch, ohne Schülerdatensatz, Portrait, Nachnamen oder Verknüpfung zu einer Person. Die Motive zeigen Schulrequisiten/Geister, keine erkennbaren Schüler; die Kühlbox ist offen und enthält Requisiten, keine Person. Die Vaping-Karte persifliert Papierkram und Nebel, ohne Dampfanleitung oder Produktwerbung.

**Kein Disziplinar-/Gameplay-System:** Neue Felder sind `description`, `effects: string[]`, `flavour`, `satire: true`, `effectMode: flavour-only`, `kind: humour`, `series: classroom-curses`. Effekte sind sichtbarer englischer Kartentext und haben keine Funktionen, Klickaktionen, Strafen, Inventarbuchungen oder echten Spielwerte. Für die Integration als Inhalt behandeln; keinesfalls aus den Sprüchen echte Sanktionen, Hausaufgabenstriche oder Klassenentfernungen auslösen. Selbstironie richtet sich auf Karte/Bürokratie, nicht auf reale Schüler.

Quellen: `tools/classroom-curses-data.cjs` (Texte und genaue Prompts), `tools/classroom-curses.cjs` (SVG-Layouts/Definitionen), `assets/collection/prints/curses/generation-manifest.json` (exakte acht Bild-Prompts), `CLASSROOM-CURSES-BRIEF.md` im Quellenordner. Dateien unter `prints/curses/`: Original-Art-PNG, Front-/Back-SVG, Rastertexturen, Thumbnail und GLB je Karte. Alle acht sind in `textbook-prints.blend` enthalten. Das bestehende Gesamt-Katalogskript nimmt sie automatisch auf und erhält die exklusive Legendary-Regel. Native Quelle für die generierten Bilder ist jeweils die PNG-Datei; der Motivinhalt selbst ist keine editierbare Blender-Geometrie.

### Archivierte Figurenvarianten

Acht frühere Figurenvarianten (Sofia, Bella, Mason, Ryan, Selena, Liberty, Werhunde, Gamer) waren nicht die gewünschte Richtung. Sie bleiben in `catalog.archivedCards` mit `status: benched` und als Dateien erhalten, werden aber nicht in der aktiven Auswahl geladen. Ihre Nummern 31–38 nicht neu vergeben. Die aktiven Druckobjekte benutzen 39–49. Das frühere Ensemble-Konzept bleibt archiviert und ist kein Render der tatsächlichen Modelle.

## 3. Verbindliche Integrationsanforderung: Lehrer schaltet Normal ↔ Halloween

**Noch nicht implementiert.** Die jetzige Marktplatzseite ist ausschließlich die Halloween-Stilprobe; sie besitzt keinen Lehrer-Login und keinen echten globalen Season-Schalter. Der Auftraggeber verlangt zur Live-Season einen aktivierbaren Lehrer-Schalter für die Welt.

Erwartetes Verhalten:

1. Im vorhandenen Lehrerbereich eine klare Auswahl **Normal / Season I – Halloween** anbieten. Default ist die normale Welt. Den bestehenden Auth-/Klassen-/Weltenkontext verwenden; Berechtigung und Zielwelt serverseitig prüfen.
2. Eine Aktivierung gilt für die zugehörige ganze Klassenwelt, nicht nur für das Browserfenster der Lehrkraft. Bestehende sowie später beitretende Schüler erhalten denselben gültigen Zustand. Die konkrete Speicherung an den vorhandenen Server-/Datenvertrag anschließen; hier wurden keine Tabellen oder RPCs erfunden.
3. Halloween gemeinsam anwenden: Marktplatz-Deko, Season-Stand, Blutmond/Himmel, Nebel, Beleuchtung, dekorative Figuren und Grundstücksrand-Deko. Beispielgrundstück ist Referenz für öffentliche Dekorationszonen; reale Bauflächen, Häuser und persönliche Bauobjekte bleiben erhalten/frei.
4. Normal stellt die ursprüngliche Umgebung vollständig wieder her: ursprüngliches Licht, Himmel, Nebel und normale Platzgestaltung. Halloween-Objekte/Animationen/Lichter sauber entfernen oder deaktivieren und Ressourcen freigeben. Kein schrittweises Aufaddieren bei wiederholtem Umschalten.
5. Empfohlenes technisches Muster: isolierte saisonale Ebene/Gruppe plus Umgebungsprofil, mit klaren `apply`-/`dispose`-Grenzen. Normalwerte vor Anwendung sichern oder aus dem normalen Weltprofil beziehen. Szenenreferenzen und persönliche Bauobjekte nicht pauschal ersetzen. Kein dauerhafter zweiter Renderer/RAF.
6. Zustandswechsel gegen verspätete Asset-Loads absichern (Revision/Request-Token). Nach Aus- und Wiedereinschalten weder doppelte Lampen/Gräber noch weiterlaufende unsichtbare Zombies oder Fontänen. Bestehende Präferenz „Weniger Bewegung“ in beiden Zuständen respektieren.

Abnahme für den Schalter: Lehrkraft aktiviert/deaktiviert; Schüler können nicht aktivieren; alle Clients derselben Welt stimmen überein; andere Klassenwelten bleiben unberührt; neue Sitzung übernimmt den aktuellen Zustand; Normal → Halloween → Normal mehrfach hinterlässt korrekte Beleuchtung und keine Duplikate; Grundstücks-/Baudaten bleiben erhalten.

## 4. Begrüßung, Quiz-Einstieg und getrennte Belohnungsregeln

Beim ersten Eintritt in eine laufende Season Welcome anzeigen, unabhängig davon, ob die Klassenwelt normal oder dunkel gestaltet ist. Danach über Shop und Ticket wieder öffnen. Anzeigezustand serverseitig je Spieler/Season/Inhaltsversion wie im aktuellen Starterplan speichern; kein globales Tablet-localStorage-Flag. Nur Quiz mit 150 XP und LearnPass anbieten; kein Collection-Link und keine Sammelkartenwerbung. Schüler können schließen, Spiel bleibt zugänglich. Kartenvergaberegeln im nächsten Absatz sind davon getrennte Systemanforderungen.

**Verbindliche Ergänzung r11:** Normal (18) und Rare (17) werden schrittweise über den LearnPass freigeschaltet, zusätzlich zu Münzen auf denselben Feldern. Epic (14) und die einzige Legendary-Coverkarte kommen ausschließlich aus Seasonal Boxes. **Keine Kartenduplikate:** höchstens ein Besitzdatensatz mit Quantity 1 je Spieler/Karte; besessene Karten vor der Truhenziehung ausschließen. Der aktuelle Pass hat 24 Münzfelder (1–20, 25, 30, 35, 40); die 35 Karten sind dort als 13 Einer- und elf Zweierpakete hinterlegt, zuerst Normal, danach Rare. Verbindliche Feldzuordnung: `assets/collection/card-acquisition.json`; jede Definition enthält `acquisition` und der Katalog `acquisitionPolicy` / `passCardRewards`.

**Integration:** feste Karten in derselben Transaktion wie bisherige Tier-Rewards zusätzlich vergeben; ältere abgeholte Felder nur um fehlende Karten ergänzen, niemals Münzen erneut auszahlen. Verschiedene parallele Truhen über gemeinsame Spielersperre und Unique-Constraints duplikatfrei halten; Retry liefert gespeichertes Ergebnis. Sind alle 15 Truhenkarten gesammelt, bleibt die bisherige Dorfgegenstandsbelohnung erhalten, ohne weitere Karte oder erfundene Ersatzmünzen. Bestehende 28 Dorfgegenstände/Chancen bleiben unabhängig. Noch offen sind Karten-Trefferhäufigkeit pro Truhe und Epic-/Legendary-Gewichte, im Manifest bewusst `null`. Die Vergabewege und das Duplikatverbot sind entschieden. Technischer Vertrag und Prüfungen: `DEEPSEEK_UMSETZUNGSPLAN.md`, Pakete 8–9. Der Prototyp enthält nur Metadaten und Vorschau, keine echten Claims oder Öffnungen. Aktivierung der Optik oder Öffnen des Almanachs darf keine Karte vergeben.

## 5. Dateien und technische Verträge für die Übernahme

- `assets/collection/catalog.json`: öffentliche Definitionen, `cards` mit 50 aktiven Einträgen, `archivedCards` mit acht zurückgestellten, `bookStudy` als dickeres Umschlagmodell. `almanacCover` referenziert dieselbe Grafik und die Legendary-Karten-ID; `rarityPolicy` erzwingt genau diese eine Legendary. Kein Besitzstatus im Manifest. IDs stabil halten; Nummer ist Drucknummer, nicht gefilterte Seitenposition. Coverkarte: Nummer 50; die acht Spaßkarten: 51–58.
- `format: printed-surface`: komplette gedruckte Fläche; `motifModel` zeigt zur Kompatibilität auf dasselbe GLB. Keine zusätzliche Motif-Ansicht und keine doppelte Modellladung dafür implementieren. `front` ist die vollständige Druckquelle für den Detail-Link. `kind: poem` bezeichnet das gelieferte Vogelgedicht, ohne eine neue Autorzuschreibung.
- `reference.sourceImage`: Original-PNG für neun unverändert eingebettete Lern-/Bildboxen. Exakte Übereinstimmung wird im Browser-Prüfwerkzeug auf Dateiebene geprüft. Hinweise und Lizenzherkunft bei der Übernahme erhalten.
- `almanac.js`: nur aktives GLB laden, Vier-Modell-LRU-Cache, Freigabe beim Verdrängen, Request-Token bei schneller Auswahl. Kamera für Quer-/Hochformat anhand Modellmaßen, Sichtfeld und tatsächlichem Canvas-Seitenverhältnis berechnen. Druckbild-Link zum Lesen ohne 3D-Perspektive beibehalten.
- Für die Produktion in einen expliziten Mount/Dispose-Lebenszyklus überführen: DOM-Listener, ResizeObserver, Controls, RAF, Texturen, Materialien, Geometrien und Renderer freigeben; bei verdeckter Ansicht pausieren. Lokale `vendor/`-Kopie im Prototyp belassen und die bestehende App-Three.js-Version verwenden.
- `INTEGRATION_COLLECTION.md`, `INTEGRATION_PRINTS.md`, `INTEGRATION_BOOK.md`: weitere Daten-/Dateidetails. Dieser aktuelle Handoff hat bei älteren Bestandszahlen Vorrang.
- `assets/collection/LICENSES.md`, `LITERARY_SOURCES.md`: Herkunft, literarische Quellen und Rechte. Buchbilder und davon abgeleitete Bilder sind **nicht** Teil der pauschalen CC0-Erklärung eigenständiger Originalarbeit. Die vom Nutzer gelieferten Referenzen und exakten Bild-Prompts bleiben lokal dokumentiert.

## 6. Quellen und reproduzierbarer Export

Reliefkarten: `sources/collection/build-cards.py`, `halloween-almanac.blend`; ursprüngliche sechs Karten zusätzlich in `halloween-collection.blend`. Druckobjekte: `tools/print-studies.cjs`, `tools/more-print-studies.cjs`, `tools/print-textures.cjs`, `sources/collection/build-prints.py`, `textbook-prints.blend`. Buch: `build-book.py`, `highlight-halloween-book.blend`.

Die Druck-/Buch-GLBs sind eigenständig mit eingebetteten Texturen. Die alten Reliefwerkzeuge überspringen `printed-surface`, um sie nicht mit Reliefkarten zu überschreiben. Der vollständige Katalog entsteht über `tools/extend-almanac.cjs`, das die belegten Verse, den archivierten Figurenbestand und zwanzig Druckobjekte inklusive der Spaßkarten einbezieht. `tools/season-rarities.cjs` erzwingt abschließend die exklusive Legendary-Regel und die doppelte Rolle des Umschlags. Bei künftigen Kartenänderungen diese Regel erhalten; historische Seltenheiten archivierter Entwürfe sind kein aktiver Drop-Pool.

Rebuild aus Repository-Hauptordner (nur bei Änderungen nötig):

```powershell
node Prototyp/marktplatz/tools/extend-almanac.cjs
node Prototyp/marktplatz/tools/print-textures.cjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python 'Prototyp/marktplatz/sources/collection/build-prints.py'
```

Das Rasterwerkzeug erwartet den lokalen Server auf Port 5188 und verwendet das vorhandene Playwright aus `web/node_modules`. Das ist eine Entwicklungsabhängigkeit; der Prototyp selbst benötigt nur den statischen Server. Kein Node/Blender zur Laufzeit.

## 7. Technische Nachweise und offene Abnahme

- Zwanzig Druck-GLBs in Blender reimportiert: je **112 Dreiecke, drei Materialien**, vollständige Vorder-/Rückseiten-UVs, richtige Orientierung, Texturkante maximal 1024 Pixel. Bericht: `assets/collection/prints/model-audit.json`; Rastergrößen: `texture-audit.json`. Die Legendary-Coverkarte hat eine goldene Papierkante; die Covergrafik selbst bleibt unverändert.
- Buch: **868 Dreiecke, fünf Materialien**, zwei eingebettete 744 × 1024 Texturen; Vorder-/Rückseite und nicht gespiegelte Rückseiten-UVs geprüft. Berichte: `assets/collection/textbook/book-audit.json`, `book-browser-audit.json`.
- Vollständiger Almanach: `assets/collection/browser-audit.json`. Prüft alle 50 Karten, die exklusive Legendary-Regel, doppelte Umschlagrolle, aktualisierte Epic-Aufdrucke, Druckquellen, tatsächliches Drehen, Umdrehen, Suche, Cache, komplette Druckflächen im Desktop-/Hochformat und fehlende Ressourcen. `prints/curses/browser-audit.json` ergänzt 48 Checks zu den acht Spaßkarten: genaue Titel, eingebettete generierte Bilder, englische Effekte, Textgrenzen beider Druckseiten, Packfilter, Korrektur der Toilettenfrage und kein Übersprechen auf andere Karten.
- Begrüßung: `screenshots/welcome-audit.json`, zehn Checks zu Banner/Erklärungen, Dialog, Fokus, Kamerapause, Link und Hochformat.
- Marktplatz: bestehende `screenshots/verification-revision.json` und `fountain-motion.json`. Historische Desktopmessung etwa 115.000 sichtbare Dreiecke / unter 150 Calls; erster Schattenpass wird gesondert mitgezählt. Desktop mit RTX 4070 ist **kein** Nachweis für ein echtes Schul-Tablet. Budget/30 FPS am Zielgerät nach der Integration messen.
- Keine neuen Screenshots oder selbst erklärte gestalterische Freigabe. Vorhandene alte Screenshots zeigen teilweise frühere Fassungen. Maßgeblich für Claudes Abnahme ist die laufende aktuelle Vorschau.

Noch abnehmen: Halloween-Stimmung, Lesbarkeit der zwanzig Druckmotive, richtige neue Englischbeispiele, Humor/Ton der acht Classroom Curses, Umschlag plus Legendary-Coverkarte, Wiedererkennbarkeit des Buchs/Memes, Begrüßungstext sowie Zielgerät-Bedienung. Noch implementieren: autorisierter Lehrer-Schalter, Synchronisierung der Klassenwelt, Live-Ersteintrittsbegrüßung, echte Vergabe/Seasonal Boxes/LearnPass und spätere Achievement-/Besitzlogik. Die Spaßkarteneffekte bleiben Flavour-Text. Keine dieser Produktionsfunktionen als bereits fertig ausgeben.
