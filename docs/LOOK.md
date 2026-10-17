# Lerndorf – Stil-Leitfaden (So soll das Dorf aussehen)

Stand: 17.10.2026 · **Verbindlich für alles in `render/`.** Gilt schon jetzt für die Platzhalter (Stufe 1b) und später für die Blender-Modelle (Stufe 2).

**Maßstab ist der Prototyp** (`Prototyp/index.html`). Er ist nicht „nur ein Test“, sondern das Soll-Bild, das die Lehrkraft freigegeben hat. Wenn eine Entscheidung zur Optik offen ist: so machen wie im Prototyp. Die Werte unten sind direkt aus seinem Code übernommen.

Soll/Ist-Vergleiche aus identischen Blickwinkeln: `Konzept/Stil_Referenz/01–05_*_Soll_Ist.jpg`. Reine Soll-Bilder: `Konzept/Stil_Referenz/Soll_*.jpg`. **Jedes Galerie-Bild (PLAN L.1) muss neben dem passenden Soll-Bild bestehen.**

---

## 1. Die Stimmung in einem Satz

Ein **gemütliches Low-Poly-Comicdorf am frühen Abend**: kühler blau-violetter Himmel, warmes flaches Sonnenlicht, überall kleine warme Lichter (Fenster, Laternen, Lichtkegel am Boden), sattes Grün mit Wald an den Hängen, und in jeder Ecke ein kleines Detail.

## 2. Die sieben Grundregeln

1. **Nie leer.** Jede Bildschirmfläche hat etwas zum Entdecken: Bäume, Blumen, Laterne, Fels, Zaun, Figur. Große einfarbige Flächen sind ein Fehler.
2. **Warm gegen kalt.** Szene kühl (Himmel, Schatten, Wasser), Lichter warm (Fenster, Laternen, Lichtkegel). Ohne warme Lichter wirkt das Dorf tot.
3. **Flat Shading, sichtbare Facetten.** Alles `flatShading: true`, Low-Poly-Formen (Kegel, Ikosaeder, Prismen). Keine glatten Kugeln, keine Pyramidendächer.
4. **Erkennbare Silhouetten.** Satteldach mit Überstand und Schornstein, Zaun aus Pfosten und Latten, Brücke mit Geländer, Laterne mit Kopf. Kein Objekt ist nur ein Quader.
5. **Kein Schwarz.** Dunkelste Farbe ist `#2b2b33` (Laternenmast, Schuhe). Dünne Teile (Zäune) nicht so dunkel einfärben, dass sie im Schatten schwarz werden.
6. **Gebrochene, satte Farben** aus der Palette unten. Keine Neonfarben, kein Reinweiß außer Markisenstreifen und Sprechblasen.
7. **Dichte nach Bedeutung.** Marktplatz am dichtesten, Dorfkern dicht, Außenbereich lockerer, Talrand wird Wald.

## 3. Licht, Himmel, Kamera

| Element | Wert |
| --- | --- |
| Renderer | `ACESFilmicToneMapping`, Belichtung `1.05`, `SRGBColorSpace`, Schatten `PCFSoftShadowMap`, PixelRatio max. 1,5 (Hoch) / 1 (Niedrig) |
| Himmel + Nebel | `#33405e`, `Fog(#33405e, 80, 170)` |
| Hemisphere-Licht | Himmel `#a9b8e8`, Boden `#3a5a3a`, Intensität `1.15` |
| Sonne | `#ffd2a1`, Intensität `1.6`, Position `(-40, 55, 25)`, Schattenbereich ±62, `bias -0.0006`, `normalBias 0.04`, Map 2048 |
| Standard-Material | `MeshStandardMaterial`, `vertexColors`, `flatShading: true`, `roughness 0.88` |
| Leuchtteile | `MeshBasicMaterial` (Fenster, Laternenköpfe, „!“) – leuchten ohne Lichtquelle |
| Kamera | FOV 38 (Hochformat 52), Start schräg von oben (Abstand ~75, Neigung ~40°), Polarwinkel 0,4–1,2 |

## 4. Gelände und Wasser

| Element | Wert |
| --- | --- |
| Wiese tief / mittel / hoch | `#4e7a45` → `#5f8f52` → `#7aa35c` (weich nach Höhe gemischt), dazu ±0,03 Helligkeitsrauschen, damit keine Fläche einfarbig ist |
| Ufer | `#a99b72`, 4–6,5 m vom Fluss eingeblendet |
| Fluss | Band mit wechselnder Breite **5,6–8,8 m** (halbe Breite 3,6 ± 0,8, sinusförmig), Höhe −0,55; zwei Blautöne `#5fb3d9` / `#3f8fbf` im Wechsel entlang des Laufs; `roughness 0.12`, `metalness 0.1`, `emissive #1d4f73` mit Intensität 0,5 ± 0,06 pulsierend (langsam, ~0,9 rad/s) |
| Schilf | dünne Zylinder `#6f8f45`, 0,9–1,4 m, in Gruppen 4,2–5,6 m vom Flussmittelpunkt, nicht an Brücken |
| Felsen | Dodekaeder `#8f8d86`, 0,3–0,9 m, zufällig gedreht, halb eingesunken |

## 5. Wege und Marktplatz

| Element | Wert |
| --- | --- |
| Hauptweg / Nebenweg / Gartenweg | 2,0–2,2 m / 1,5 m / 1,0 m; Farbe `#c9b48c`, Gartenweg `#cbb894` |
| Marktplatz-Pflaster | Scheibe Ø ~17,5 m, `#b9a98f`, leicht erhöhte Kante; **Ringmuster** aus dünnen Ringen `#9d8d75` alle 1,8 m ab r = 2,4 |
| Brunnen (Mitte) | Stein `#a7a3a0`: Becken r 2,0/2,2 h 0,6 · Säule r 0,35/0,45 h 1,4 · Schale r 0,8/0,6 h 0,25; Wasser `#6fc3e6` mit `emissive #2a6f9a` 0,45 pulsierend; **nicht Holz** |
| Aufgabentafel | zwei Pfosten `#7a4f2e` 0,2 × 3,0; Brett `#a0703f` 3,4 × 2,0; **rotes Satteldach** `#c4574b` (4,0 breit, 0,8 hoch); 6 Zettel in Pastell (`#fff8e1 #fff3c4 #e8f4ff #ffe8ec #eaffea`), leicht schräg, mit roter Nadel `#d64545`; zeigt mit der Vorderseite zum Hauptzugang |
| „!“ über der Tafel | gelb `#ffd23f`, MeshBasic, Balken 0,42 × 1,0 + Punkt 0,42, schwebt 4,9 m über dem Platz, wippt ±0,18 (2,4 rad/s), dreht sich (1,2 rad/s) |
| Marktstände (3) | Theke `#8a5a36` 2,4 × 0,9 × 1,1; 4 Pfosten 2,2 m; **gestreifte Markise** aus 6 schrägen Streifen (weiß / Farbe `#5a62b8`, `#3f8f88`, `#d08a3c`); Waren als bunte Kugeln (Obst) auf der Theke |
| Bänke (4) | Sitz und Lehne `#8a5a36`, Füße `#2b2b33`, am Rand mit Blick zur Mitte |
| Laternen am Platz (4) | wie §7, plus echtes Punktlicht (nur Qualität Hoch) |

## 6. Grundstück und Haus

| Element | Wert |
| --- | --- |
| Rasen | `#5f8f52` / `#6a9c58` im Wechsel, als flache Platte |
| Zaun | **Pfosten** `#8a5a36` 0,13 × 0,7 alle 1,2 m + **eine Latte** 0,08 hoch auf 0,5 m; vorne mittig **1,6 m Toröffnung**; nie als durchgehende Wand |
| Briefkasten | Pfosten `#6b4a2f` 0,9 m + Kasten `#3c4a7a` neben dem Tor |
| Wände | `#efe6d6 #e8dcc6 #f1e9dc #e4d7c0 #f3e2cf` (deterministisch gewählt) |
| Fachwerk-Band | `#6b4a35`, 0,14 hoch auf halber Wandhöhe, rundum |
| Dach | **Satteldach** (Prisma), Überstand 0,35 je Seite, Tiefe = Haus + 0,6, Höhe 1,2–1,8; Farben `#c4574b #3f8f88 #5a62b8 #d08a3c #8c5aa8 #4f8f5f #b86a8a` |
| Schornstein | `#9a5a48`, 0,42 × 1,0, auf einer Dachseite |
| Tür | `#5a3a26`, 0,7 × 1,2, vorne zum Tor |
| Fenster | 0,55 × 0,55, **leuchtend `#ffad42`** (MeshBasic), ca. 80 % leuchten, 20 % dunkel; vorne 2, Seite 1; bei 2 Stockwerken 3 weitere oben |
| Hausgrößen | klein 3,0–3,6 × 2,5–2,8 m, Wand 2,0–2,5; groß 4,2–4,8 × 3,2–3,5 m, 70 % davon zweistöckig (Wand 3,4) |
| Lage | Haus im hinteren Drittel, seitlich leicht versetzt; Dach bleibt innerhalb des Zauns |
| Vorgarten (Startausstattung, deterministisch je Platz) | eine von: 2 Blumenbeete · rosa Baum + Bank · Teich + Beet · 2 kleine Bäume · nichts. Blumenbeet: Erde `#5a3e2b` 1,5 × 0,9 mit 5–9 Blüten (Kugeln r 0,11) in `#f2c94c #eb5757 #f2a7d0 #ffffff #bb6bd9`; Teich `#5aa9d6` r 0,9 |
| Freier Platz | Rasen + 4 Eckpflöcke `#8a5a36` + kleines Holzschild, kein Haus |

## 7. Laternen und Lichtkegel

| Element | Wert |
| --- | --- |
| Laterne | Mast `#2b2b33` r 0,07/0,09 h 2,2; Kopf **leuchtend** `#ffc56b` 0,35 × 0,4 × 0,35; Kappe `#2b2b33` 0,45 × 0,08 |
| Abstand | entlang der Wege alle ~11 m, 1,6 m neben der Wegmitte, nicht in Flussnähe |
| **Lichtkegel am Boden** | Quadrat 7 × 7 m, flach 0,1 über dem Boden, radialer Verlauf `rgba(255,190,110,0.55)` → `rgba(255,170,90,0.18)` bei 50 % → transparent; `AdditiveBlending`, `depthWrite false`; **alle als ein InstancedMesh**; einer auch vor der Aufgabentafel (Größe 1,1) |
| Punktlichter | nur die 4 am Marktplatz: `#ffb35c`, Intensität 14, Reichweite 9, Abfall 1,6 |

Die Lichtkegel sind der wichtigste Einzeleffekt für die Abendstimmung: billig, aber sie machen den Unterschied zwischen „leer“ und „gemütlich“.

## 8. Bäume und Wald

| Element | Wert |
| --- | --- |
| Stamm | `#6b4a2f`, r 0,18/0,25, h 1,2 |
| Nadelbaum | 2 gestapelte Kegel (7 Segmente): r 1,2 h 1,8 auf 1,7 m + r 0,9 h 1,4 auf 2,5 m |
| Laubbaum | 2 Ikosaeder (Detail 0): r 1,1 auf 1,9 m + r 0,8 versetzt (0,5 / 2,4 / 0,2) |
| Farben | `#2f7d5b #3a8f63 #2c6e57 #4d9a5d #5d8f3e`; Akzentbaum rosa `#d98cc5` (selten, in Gärten) |
| Größe | Skalierung 0,9–1,8, zufällige Drehung |
| Verteilung | Waldgürtel ab ~40 m vom Zentrum dicht, im Tal Baumgruppen; je eine Baumreihe zwischen manchen Grundstücken; nie auf Wegen, Platz, Grundstücken, Brücken, Wasser |

## 9. Brücken

| Element | Wert |
| --- | --- |
| Deck | `#9a6a40`, 2,4 breit, 0,25 dick, Länge = Flussquerung + 1,2 |
| Bohlen | Querleisten `#7a4f2e` 0,06 hoch alle 1,1 m (gibt die Holzstruktur) |
| Geländer | beidseitig: Handlauf `#7a4f2e` auf 0,85 m, Pfosten 0,16 × 0,85 an Anfang, Ende und je Viertel |
| Pfeiler | Stein `#8a8682` 0,5 × 1,6 nahe beider Ufer, im Wasser stehend |
| Ausrichtung | genau in Wegrichtung, Wege laufen bündig auf das Deck |

## 10. Figuren (Platzhalter bis Stufe 2)

Die Platzhalter-Figuren des Prototyps sind besser als Kugelkopf-Figuren und dienen als Soll für die späteren Modelle:

| Element | Wert |
| --- | --- |
| Proportionen | **Chibi**: Kopf-Würfel 0,82 × 0,78 × 0,78 (≈ 40 % der Höhe), Körper 0,62 × 0,6 × 0,42, Beine 0,22 × 0,42 mit Schuhen `#2b2b33`, Arme mit Händen in Hautfarbe |
| Gesicht | Augen `#1b1b25` 0,1 × 0,16 (blinzeln alle 2–6 s), Wangen `#f29a9a` |
| Vielfalt | 5 Hauttöne, 8 Haarfarben, 5 Frisuren, 10 Oberteil-, 5 Hosenfarben, Zubehör (Brille, Kopfhörer, Rucksack, Kappe) |
| Gehen | Beine/Arme schwingen gegenläufig (Amplitude 0,7), Körper hüpft 0,11 pro Schritt, leichtes Wiegen 0,05, Kopf nickt minimal; sanftes Anfahren/Bremsen; Tempo 1,3–1,8 m/s |
| Stehen | atmet (±0,012), schaut sich um (Kopf ±0,45) |
| Schatten | weicher Fleck unter jeder Figur (InstancedMesh, Deckkraft 0,28) |
| Namensschild | Pille `rgba(20,24,40,0.8)`, weiße fette Schrift, über dem Kopf; eigener Name gelb hinterlegt |
| Sprechblase | weiß, abgerundet, mit Spitze; nur kurze englische Grüße (Hi!, Hey!, Yo!, Hello!, Hiya!) |

## 11. Häufige Fehler (aus dem Review vom 17.10.)

| Nicht so | Sondern so |
| --- | --- |
| Pyramidendach (`ConeGeometry` mit 4 Seiten) | Satteldach als extrudiertes Dreieck mit Überstand + Schornstein |
| Zaun als durchgehende dunkle Wand | Pfosten + Latte, Toröffnung vorne |
| Haus ohne Tür und Fenster | Tür zum Tor, leuchtende Fenster |
| Brunnen als brauner Holzzylinder | Steinbrunnen mit leuchtendem Wasser |
| Tafel als schwarze Platte | Holztafel mit rotem Dach, bunten Zetteln, schwebendem „!“ |
| Platz in Wegfarbe ohne Muster | eigene Pflasterfarbe + Ringe, Stände, Bänke, Laternen |
| Weg als schwebendes Band mit Zacken | Weg sauber auf/im Gelände, kein Durchstechen |
| Fluss mit fester Breite und zackigem Ufer | wechselnde Breite, zwei Blautöne, Sandufer, Schilf, Steine |
| Brücke als Brett | Deck mit Bohlen, Geländer, Pfeiler |
| keine Bäume | Waldgürtel + Baumgruppen + Gartenbäume |
| keine Lichter | Laternen, Lichtkegel, leuchtende Fenster |
| Namen an jedem Haus und jeder Figur | nur Figuren in der Nähe; Hausname beim Antippen |
| Kugelkopf-Figuren | Chibi-Würfelfiguren wie im Prototyp |

## 12. Abnahme der Optik

1. `npm run galerie` erzeugen.
2. Jedes Bild neben das Soll-Bild aus `Konzept/Stil_Referenz/` legen (gleicher Blickwinkel).
3. Für jedes Bild prüfen: Stimmung (warm/kalt), Dichte (nichts leer), Silhouetten (§2.4), Farben aus diesem Leitfaden, keine Fehler aus §11.
4. Erst wenn alle Blickwinkel mindestens so gut wie das Soll aussehen, gilt das AP als fertig. Die Lehrkraft entscheidet bei L.11.

Leistung bleibt dabei Pflicht (SPEC §10.11): Die Schönheit kommt aus Farben, Formen, Instancing und Lichtkegeln, nicht aus teuren Lichtern oder Shadern.
