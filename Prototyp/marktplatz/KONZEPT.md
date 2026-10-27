# Halloween-Marktplatz · Konzept

27.10.2026 · eigenständige Stilprobe für Englisch 8a/8b

**Bildidee.** Ein verwunschener, aber einladender Jahrmarkt unter einem großen rostroten Blutmond. Kaltes Indigo und lavendelgrauer Bodennebel treffen auf honigfarbene Lampions und Kürbisse. Gruselig ohne Gewalt oder Schreckeffekte. Die Low-Poly-Formen, Ringpflasterung, gestreiften Markisen, Holzfarben und warmen Lichtflecken aus `docs/LOOK.md` bleiben erkennbar.

**Aufbau.** Ein runder, gepflasterter Platz mit vier nach innen gerichteten Buden. Hinten die größere Kürbisbude mit lesbarem „Season I – Halloween“-Schild; seitlich Süßigkeiten, Tränke und Kürbisse. In der Mitte ein steinerner Kürbisbrunnen. Freier Zugang vorne; Gräber, zerbrochene Zäune, kahle Kürbisbäume und schiefe Tannen rahmen die Ränder. Drei sehr langsame Kenney-Figuren bleiben Nebenfiguren. Das zunächst erwogene Horrorhaus entfällt nach Sichtprüfung: seine sehr detaillierte Silhouette passt schlechter zum Comicstil und konkurriert mit der Season-Bude.

**Palette und Oberfläche.** Nachthimmel `#2d3a67`, dunkelstes Material `#2b2b33`, kalter Stein `#85839a`, verwittertes Holz `#8a5a36`, Kürbis `#d7833d`, Licht `#ffc56b`, Blutmond `#ba5849`. Sichtbare Facetten, keine schwarzen Flächen. Comic Neue lokal für Bedienung und Schilder, Georgia sparsam für den Titel. Die Szene füllt das Fenster; kleine Bedienelemente lassen das Bild frei.

**Assets.** Kenney Graveyard: Kürbisse, Grabsteine, Kerzen, Laternen, Schutt, Zäune, Gräber, Bank, schiefe Tannen sowie Zombie/Skelett. Kenney Fantasy Town: Marktstand, Steinbrunnen, kleine Felsen. Season I: Kürbisbaum, Hexenkessel, Kürbiskatze, Süßigkeitenhaufen. Details und vollständige Bestandsaufnahme: `assets/inventory.json`; Quellen in README. Nur verwendete GLBs und deren Texturen werden kopiert.

**Eigene Gestaltung.** Ringpflaster, Markisenfarben, Bretterschilder, Lampionketten, Blutmond/Halo, Nebel und Lichtflecken entstehen als einfache Three.js-Geometrie beziehungsweise Canvas-Texturen. Keine neuen externen Modellmotive und kein Blender-Export nötig. Vorhandener Kürbisbaum liefert die kahle Astsilhouette.

**Bewegung und Bedienung.** Sehr langsame automatische Umkreisung; Ziehen dreht, Rad beziehungsweise zwei Finger zoomen. Manuelles Drehen pausiert die Tour. Knopf an der Season-Bude sowie gleichwertiger Bildschirmknopf öffnen eine Willkommensmeldung. „Weniger Bewegung“ und Systemeinstellung stoppen Tour/Figuren/Nebelbewegung und reduzieren das Lampionflackern auf konstantes Licht. Verdeckte Seiten pausieren.

**Technik und Abnahme.** Three.js 0.170.0 vollständig lokal, GLTFLoader mit MeshoptDecoder, statischer Server ohne Build. Seed-basierte Platzierung; statische Geometrie zusammenführen, gleiche GLBs instanzieren, Schattenkarte nur bei Bedarf neu zeichnen. Ziel: unter 150.000 gerenderten Dreiecken und 150 Draw Calls. Desktop und Tabletformat aufnehmen, Schilder/Interaktion/Bewegungsreduktion prüfen und Renderkosten messen. Echte Schul-Tablet-FPS bleiben eine Geräteabnahme.

**Nutzerrevision.** Dunklere, rötlichere Nacht statt kühler Abendhelligkeit; großer tiefroter Blutmond mit betontem Halo. Schleppende Schritte und vorgebeugte Zombies. Insgesamt fünf Kenney-Figuren: zwei Zombies, ein Skelett, ein Vampir und ein Friedhofswärter. Die aktuelle visuelle Abnahme übernimmt der Nutzer; technische Prüfungen erfolgen ohne neue Screenshots.

**Brunnenrevision.** Rund 20 % größer, Blutwasser und ein großer Kürbis vorne auf der Mittelachse. Drei einzelne Kerzen mit echten Leuchtflammen und gemeinsamem warmem Licht, eingefasst von einem zurückhaltenden roten Beschwörungskreis. Acht feine Wasserstrahlen starten an der oberen Wasseroberfläche auf natürlichen Fallkurven; kontinuierliche Reflexe, kleine Aufprallspritzer und Wellen beleben die Oberfläche. Keine großen Perlen auf starren, kantigen Röhren. Bewegungsreduktion friert sämtliche Wasser-/Flammeneffekte ein. Visuelles Review weiterhin beim Nutzer.
