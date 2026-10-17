# Review Dorf-Layout – 17.10.2026

Geprüft: Stand nach Commit `3751b1a` (Stufe 4.5). Das Dorf wurde aus dem echten Code (`world/layout.ts`, `render/village.ts`, `render/crowd.ts`) mit Beispieldaten gerendert: 34 Grundstücke, 24 Bewohner, Seed 11 (8a) und 23 (8b). Blender-Modelle und Shop-Gegenstände sind bewusst noch nicht dran und wurden nicht bewertet.

Bilder: `Konzept/Review_2026-10-17/` (00 = Ziel aus dem Prototyp, 01–07 = aktueller Stand).

## Kurzfazit

Die Welt-Logik (Gelände, Fluss, Brücken, Wegegraph, Grundstücke, Determinismus) ist sauber portiert und getestet. Beim **Aussehen** ist das Dorf aber hinter den Prototyp zurückgefallen: Alles, was den Prototyp gemütlich gemacht hat, fehlt (Bäume, Wald, Laternen, Licht, Marktplatz-Ausstattung, Gartenwege). Dazu kommen Darstellungsfehler an Wegen und Fluss, und die Draw Calls liegen beim 3-Fachen des Budgets. Das ist keine Blender-Frage: Positionen und Platzhalter für Bäume, Laternen und Marktplatz gehören jetzt in den Layout-Code, Blender tauscht später nur die Meshes.

## Befunde

| # | Befund | Bild | Gewicht |
| --- | --- | --- | --- |
| 1 | **Keine Vegetation**: keine Bäume, kein Waldgürtel an den Hängen, keine Büsche, Felsen, Schilf. Das Tal wirkt leer und steril; große Wiesenflächen ohne Inhalt (v. a. südlich des Marktplatzes) | 01, 07 | hoch |
| 2 | **Marktplatz leer**: Platzhalter-Brunnen (brauner Zylinder), Tafel als schwarze Platte, keine Stände, Bänke, Laternen, Pflastermuster. Platz hat dieselbe Farbe wie die Wege | 04 | hoch |
| 3 | **Kein Abendlicht**: keine Laternen entlang der Wege, keine leuchtenden Fenster, keine Lichtflecken. Der „gemütliche Abend“-Look des Prototyps ist weg | 01 vs. 00 | hoch |
| 4 | **Wege flackern/zacken**: Weg-Bänder liegen über dem Gelände, an Hängen stechen Geländedreiecke durch (Sägezahn-Ränder) | 04, 05, 07 | hoch |
| 5 | **Flussufer zackig**: Gelände ragt am Rand ins Wasser, Fluss hat überall dieselbe Breite (7 m), keine Ufersteine | 06 | mittel |
| 6 | **Brücken** sind flache Bretter ohne Geländer, Rampen und Pfeiler | 06 | mittel |
| 7 | **Grundstücke**: Zaun als durchgehende dunkle Wand, Haus klebt am hinteren Zaun, Tür/Fenster fehlen, Pyramiden-Dach ragt über den Zaun, **kein Gartenweg** vom Tor zur Straße | 05 | mittel |
| 8 | **Böschungen**: Grundstücke an Hängen werden mit steilen Erdrampen eingeebnet (dunkle Ränder in der Draufsicht) | 03 | mittel |
| 9 | **Sackgassen**: mehrere Wege enden im Nichts (Nordweg, Nordost-Schleife, Ostende) | 01, 03 | mittel |
| 10 | **8a und 8b sehen fast gleich aus**: Fluss und Wege sind fest, nur Grundstücke und Hügel variieren leicht | 01 vs. 02 | mittel |
| 11 | **Leere Grundstücke**: Es gibt immer 34 Häuser; bei 24 Schülern stehen 10 Häuser ohne Bewohner. Unbewohnte Häuser wirken wie Geisterhäuser und nehmen Neuen das Gefühl „mein eigenes Haus“ | 01 | mittel |
| 12 | **Doppelte Namensschilder** (Haus + Figur) überladen das Bild; aus der Übersicht unlesbar klein | 01, 04 | niedrig |
| 13 | **Draw Calls 400–480** in der Übersicht (Budget < 150). Jedes Grundstück besteht aus vielen Einzel-Meshes, nichts ist zusammengefasst | – | hoch |
| 14 | Figuren drängen sich am Marktplatz (nach ~20 s Simulation stehen ~15 von 24 dort) | 07 | niedrig |

Positiv: Gelände mit Hügeln, Flusslauf und Brücken an der richtigen Stelle; Wege geschwungen; Grundstücke verstreut in unterschiedlichem Abstand; Figuren grüßen sich; Ladezeit der Welt ~0,5 s.

## Was zu tun ist

Neue Stufe **1b „Dorf-Layout“** im PLAN (vor dem Stil-Test der Stufe 2), Regeln in SPEC §10 (überarbeitet). Kernpunkte:

1. **Kartenvorlagen**: 3 handgestaltete Tal-Vorlagen (Flusslauf, Hauptwege, Wahrzeichen), 8a und 8b bekommen verschiedene. Der Seed streut nur noch Grundstücke, Bäume und Details.
2. **Wege und Platz ins Gelände malen** (Vertex-Farbe/Splat mit weichem Rand) statt schwebender Bänder.
3. **Vegetation und Details deterministisch platzieren**: Waldgürtel, Baumgruppen, Hecken, Blumenwiesen, Felsen, Schilf.
4. **Marktplatz ausstatten**, **Laternen** an den Wegen, **Fenster leuchten**.
5. **Grundstücke**: Gartenweg, Zaun mit Pfosten und Tor, Haus mit Tür/Fenstern, Hangregel, Reihenfolge der Vergabe von innen nach außen, freie Grundstücke als Bauplatz statt leerem Haus.
6. **Jeder Weg endet an etwas** (Aussichtspunkt, Steg, Mühle, Obstwiese, Waldhütte).
7. **Draw Calls** durch Zusammenfassen und Instancing unter Budget.
8. **Layout-Galerie** (Screenshots aus festen Blickwinkeln) als Abnahmewerkzeug.

## Stand nach Stufe 1b (18.10.2026)

Geprüft an der Galerie (`Konzept/Galerie/2026-10-17/`, Seeds 11 und 23, drei Vorlagen). Abnahme auf dem Tablet und durch die Lehrkraft steht noch aus (L.11).

| # | Stand | Was geschehen ist, was offen ist |
| --- | --- | --- |
| 1 | teilweise | Bäume, Waldgürtel, Büsche, Felsen, Schilf, Hecken und Blumenwiesen sind platziert. Offen: freie Grundstücke sind noch kahl |
| 2 | erledigt | Marktplatz mit Pflaster, Brunnen mit Wasser, Tafel, drei Stände, Bänke, Kübel (L.7) |
| 3 | erledigt | Laternen an den Wegen, leuchtende Fenster, Lichtkegel. Licht nach LOOK nachgezogen |
| 4 | erledigt | Wege sind ins Gelände gemalt, das Gelände darunter ist geglättet (L.3). Auf dem Tablet zu prüfen |
| 5 | teilweise | Ufersteine, Breite wechselt. Offen: Uferschnitt an steilen Hängen |
| 6 | teilweise | Bögen, Geländer und Enden auf Ufer-Höhe. Offen: Rampen zum Weg |
| 7 | teilweise | Zaun mit Tor, Haus mit Tür und Fenstern, Gartenweg. Offen: Vergabe von innen nach außen prüfen |
| 8 | teilweise | Einebnung wird an steilen Hängen breiter (max. 1,1 m pro m, vorher 1,8). Offen: einzelne keilförmige Grundstücke |
| 9 | erledigt | Verbindungswege in allen Vorlagen, Test „keine Sackgassen“ |
| 10 | erledigt | Drei Vorlagen plus Seed, die Lehrkraft wählt pro Klasse (I.3) |
| 11 | offen | Freie Plätze als Bauplatz stehen aus (Rest von L.5) |
| 12 | teilweise | Namen nur in der Nähe der Kamera. Offen: Name beim Antippen |
| 13 | erledigt | Übersicht: rund 60 Draw Calls, Welt rund 35 (Budget < 150) |
| 14 | erledigt | Höchstens 40 % der Figuren am Platz |
