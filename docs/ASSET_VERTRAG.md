# Lerndorf – Asset-Vertrag für Grundstück, Shop und Lootbox (ENTWURF)

Stand: 20.10.2026, Fassung 2 · **Status: von der Lehrkraft freigegeben (20.10.2026) und umgesetzt** – Code: `web/src/world/plotPlan.ts`, Platzhalter-Modelle `web/src/render/plotAssets.ts`, Datenbank: Migration `0013_plot_slots.sql`. Leere Deko-Sockel bleiben grüne Wiese. Die Empfehlungen aus F gelten als Standard (F.5: die 14 Deko-Teile sind jetzt kleine 3×3-Szenen; Meshy und Lootbox sind noch nicht umgesetzt).

Kennzeichnung in diesem Dokument:

- **[P]** steht bereits im Projekt fest (Code, SPEC, LOOK, Datenbank)
- **[W]** ist der neue Wunsch der Lehrkraft vom 20.10.2026
- **[V]** ist ein Vorschlag von Claude, abgeleitet aus [P] und [W]; muss bestätigt werden
- **[O]** ist offen: Maß oder Entscheidung fehlt

Zwei Begriffe, die überall getrennt werden:

- **Raster-Fußabdruck:** die Rasterzellen (1 m × 1 m), die ein Asset auf dem Grundstück belegt. Danach prüft der Server.
- **Sichtbare Außenmaße:** die Bounding-Box des Meshes in Metern (Breite × Tiefe × Höhe), inklusive Dachüberstand, Vordach, Spiegel usw. Danach prüft die Asset-Pipeline.

---

## 0. Ausgangslage (was es heute gibt)

| Thema | Stand | Quelle |
| --- | --- | --- |
| Rasterzelle | 1 m × 1 m [P] | SPEC §10.5, `build/grid.ts` |
| Raster live (Supabase) | 7 × 6 Zellen, Haus hinten 2 Reihen, Tor vorne Mitte [P] | `classes.plot_cols/rows`, `cell_blocked` (0009) |
| Raster lokal (noch nicht veröffentlicht) | 10 × 10 Zellen, Haus hinten 3 Reihen [P, unveröffentlicht] | Migration 0013, `world/constants.ts` |
| Platzierung | frei auf dem Raster: `placements(cell_x, cell_z, rot 0–3)`, Kollision per Zellen [P] | `place_item` (0009) |
| Deko-Fußabdrücke | 14 Deko-Teile mit 1×1, 2×1, 1×2, 2×2 [P] | Tabelle `items` |
| Kategorien | nur `deco` und `avatar` [P] | `items.kind` |
| Haus | kein Asset, im Code gebaut (Platzhalter), 4,1–5,8 m breit, ≤ 2,9 m tief, bis 3,7 m Wand + 1,3–1,9 m Dach [P] | `render/village.ts` |
| Garage, Einfahrt, Auto | gibt es nicht [P] | – |
| Lootbox | nicht im Umfang (SCOPE) [P] | `docs/SCOPE.md` |
| Budgets | Deko ≤ 1.500 Dreiecke, Haus ≤ 4.000, Avatar ≤ 3.000; Download < 8 MB; Draw Calls < 150 [P] | SPEC §15, §16 |
| Pipeline | Blender ≥ 4.2 headless, `gltf-transform` (meshopt, KTX2), Umfärben nach `palette.json` – **noch nicht gebaut** [P] | SPEC §15 |
| Lizenz | nur CC0 oder eigene Modelle; 0 € [P] | CLAUDE.md |
| Avatar | ca. 1,64 m hoch (Platzhalter) [P] | `render/crowd.ts` |
| Optik | Low-Poly, Flat Shading, Farben aus LOOK-Palette, leuchtende Fenster als unbeleuchtetes Material [P] | LOOK §2, §3, §6 |

---

## A. Grundstücksplan

Fassung 2 (20.10.2026): vier Deko-Sockel 3 × 3 statt zwei Sockeln 3 × 5 [W].

### A.1 Raster [V]

- Einheit: 1 Zelle = 1 m × 1 m [P].
- **Raster 11 Spalten × 11 Reihen** [V]. Elf Spalten, damit zwei Sockel-Spalten, ein Weg zur Haustür und Garage mit Einfahrt nebeneinander passen; elf Reihen, damit zwei Sockel-Reihen mit einem Gang dazwischen vor das Haus passen.
- Grundstück = Raster + 0,7 m Rasen rundherum [P lokal] → **12,4 m × 12,4 m** inklusive Zaun.
- Koordinaten: Spalte x = 0…10 von links nach rechts, **von der Straße aus gesehen**; Reihe z = 0 hinten (am Haus), z = 10 vorne (an der Straße). Lokale +Z-Achse zeigt zur Straße [P: so rechnen `cellCentre` und der Zaun schon heute].
- Alle Grundstücke haben dieselbe Anordnung [W]. Gespiegelte Grundstücke gibt es nicht [V].

### A.2 Draufsicht

```
            x:  0   1   2   3   4   5   6   7   8   9   10
 z=0 hinten    .   H   H   H   H   H   H   .   G   G   G
 z=1           .   H   H   H   H   H   H   .   G   G   G
 z=2           .   H   H   H   H   H   H   .   G   G   G
 z=3           .   H   H   H  [T]  H   H   .   G   G   G      [T] = Haustür (Mitte der Hausfront)
 z=4           1   1   1   W   W   2   2   2   C   C   C
 z=5           1   1   1   W   W   2   2   2   C   C   C
 z=6           1   1   1   W   W   2   2   2   C   C   C
 z=7           .   .   .   W   W   .   .   .   C   C   C      Gang zwischen den Sockeln
 z=8           3   3   3   W   W   4   4   4   C   C   C
 z=9           3   3   3   W   W   4   4   4   E   E   E
 z=10 vorne    3   3   3   W   W   4   4   4   E   E   E
               ───────────[Tor]──────────────[Einfahrt offen]─  Zaun (0,7 m Rasen davor)
                               Straße / Weg
```

| Zeichen | Bereich | Zellen | Größe |
| --- | --- | --- | --- |
| H | Haus-Slot | x 1–6, z 0–3 | 6 × 4 = 24 Zellen |
| G | Garagen-Slot | x 8–10, z 0–3 | 3 × 4 = 12 Zellen |
| C | Auto-Sockel (liegt in der Einfahrt) | x 8–10, z 4–8 | 3 × 5 = 15 Zellen |
| E | Einfahrt ohne Sockel (Zufahrt) | x 8–10, z 9–10 | 3 × 2 = 6 Zellen |
| C + E | Einfahrt gesamt | x 8–10, z 4–10 | 3 × 7 = 21 Zellen |
| 1 | Deko-Sockel 1 | x 0–2, z 4–6 | 3 × 3 = 9 Zellen |
| 2 | Deko-Sockel 2 | x 5–7, z 4–6 | 3 × 3 = 9 Zellen |
| 3 | Deko-Sockel 3 | x 0–2, z 8–10 | 3 × 3 = 9 Zellen |
| 4 | Deko-Sockel 4 | x 5–7, z 8–10 | 3 × 3 = 9 Zellen |
| W | Weg Tor → Haustür | x 3–4, z 4–10 | 2 × 7 = 14 Zellen |
| . | Rasen, frei (Seitenstreifen x 0 und x 7 neben dem Haus, Gang z 7) | – | 14 Zellen |

Summe: 24 + 12 + 21 + 4 × 9 + 14 + 14 = 121 = 11 × 11. Deko-Fläche gesamt 36 m².

Bilder des Plans (nur Klötze in Maximalgröße, keine Modelle): `docs/img/grundstueck_plan_draufsicht.png`, `docs/img/grundstueck_plan_schraeg.png`. Das blaue Auto ist ein Platzhalter in Maximalgröße, die hellgrünen Glaskästen zeigen das Höchstvolumen eines Deko-Assets, die gelbe Säule ist ein Avatar (1,64 m) zum Größenvergleich.

### A.3 Feste Lage und Orientierung

(Umrechnung: Zellmitte x_lokal = x − 5, z_lokal = z − 5; Grundstücksmitte = 0/0.)

| Bereich | Mittelpunkt (lokal, m) | Vorderseite zeigt | Zugang |
| --- | --- | --- | --- |
| Haus | x = −1,5 · z = −3,5 | +Z (Straße) | Haustür in der Mitte der Front, trifft auf den Weg W |
| Garage | x = +4,0 · z = −3,5 | +Z | Tor in der Mitte der Front, trifft auf die Einfahrt |
| Auto-Sockel | x = +4,0 · z = +1,0 | +Z | – |
| Deko 1 | x = −4,0 · z = 0,0 | +Z | vom Weg W und vom Gang |
| Deko 2 | x = +1,0 · z = 0,0 | +Z | vom Weg W und vom Gang |
| Deko 3 | x = −4,0 · z = +4,0 | +Z | vom Weg W und vom Gang |
| Deko 4 | x = +1,0 · z = +4,0 | +Z | vom Weg W und vom Gang |
| Weg W | x = −1,5 · z = +2,0 | – | Tor im Zaun bei x 3–4 |
| Einfahrt | x = +4,0 · z = +2,0 | – | Zaun bei x 8–10 offen |

### A.4 Was frei bleiben muss [V]

- **Weg W** (x 3–4, z 4–10): immer frei, weder Deko noch Auto. Figuren laufen hier vom Tor zur Haustür.
- **Zufahrt E** (x 8–10, z 9–10): frei, das Auto steht dahinter auf dem Sockel.
- **Gang** z 7 bei x 0–2 und x 5–7: frei; trennt die vorderen von den hinteren Sockeln sichtbar.
- **Seitenstreifen** x 0 und x 7 neben dem Haus (z 0–3): frei; trennt Haus und Garage optisch.
- Ein Zaun-Tor (1,6 m) bei x 3–4 und eine Zaunlücke (3 m) bei x 8–10 [V]. Zwischen Sockel 3/4 und Zaun liegen die 0,7 m Rasenrand.

---

## B. Asset-Vertrag pro Kategorie

Gemeinsam für alle Kategorien [V]:

- **Einheit:** 1 Blender-Einheit = 1 m. Export als glTF/GLB, Y oben, Vorderseite +Z (glTF-Standard, so erwartet three.js es).
- **Ursprung (Pivot):** Mitte des Raster-Fußabdrucks, auf Bodenhöhe (y = 0 = Oberkante Rasen). Nichts unter y = −0,05.
- **Ein Wurzelknoten**, Transformationen angewendet (Skalierung 1, Rotation 0), keine Kameras, Lichter oder Animationen (Ausnahme siehe offen O9).
- **Materialien:** höchstens 3 – `solid` (Vertex-Farben, Flat Shading), `glow` (leuchtende Fenster/Lampen, unbeleuchtet), optional `glass`. Farben aus `blender/palette.json` (= LOOK-Palette). Kein Schwarz, dunkelste Farbe `#2b2b33` [P, LOOK §2].
- **Texturen:** standardmäßig keine (Vertex-Farben). Falls doch: ein Atlas ≤ 512 × 512, KTX2 [V].
- **Export-Schritt:** `gltf-transform` mit meshopt, dedup, prune [P SPEC §15].
- **Prüfung in der Pipeline:** Bounding-Box ≤ sichtbare Höchstmaße, Ursprung in der Fußabdruck-Mitte, Boden bei y = 0, Dreieckszahl ≤ Budget, Materialnamen erlaubt. Ein Asset, das das nicht erfüllt, wird nicht exportiert.

### B.1 Haus

| Punkt | Regel |
| --- | --- |
| Slot | `house` (genau einer pro Grundstück) |
| Raster-Fußabdruck | **6 × 4** (B × T) [V], fest |
| Sichtbare Höchstmaße | **6,0 × 4,0 m** inklusive Dachüberstand und Vordach (nichts ragt über den Fußabdruck) [V]; Wände ≤ 5,4 × 3,4 m, damit 0,3 m Dachüberstand ringsum bleiben [V]; **Höhe ≤ 6,0 m** inklusive Schornstein [O – Vorschlag; heute bis ca. 5,6 m] |
| Ursprung | Mitte des 6×4-Fußabdrucks, Bodenhöhe |
| Eingang | Haustür in der Mitte der Vorderseite (+Z), Unterkante y = 0; Anker-Objekt `door` in der Mitte der Vorderwand bei (0, 0, z), z ≤ +2,0 [V]; Türhöhe ≥ 1,9 m, weil der Avatar ca. 1,64 m groß ist [V; heutige Platzhalter-Tür 1,35 m ist zu niedrig] |
| Drehung | keine (immer 0°) |
| Überstände | keine über den Fußabdruck hinaus; Wege und Sockel bleiben frei |
| Budget | ≤ 4.000 Dreiecke [P] |
| Pflichtteile | mindestens 2 leuchtende Fenster vorne (Material `glow`) [P LOOK §6] |

### B.2 Garage

| Punkt | Regel |
| --- | --- |
| Slot | `garage` (genau einer pro Grundstück) |
| Raster-Fußabdruck | **3 × 4** [V], fest |
| Sichtbare Höchstmaße | **3,0 × 4,0 m**, **Höhe ≤ 3,5 m** [O – Vorschlag] |
| Ursprung | Mitte des 3×4-Fußabdrucks, Bodenhöhe |
| Eingang | Garagentor in der Mitte der Vorderseite (+Z), Breite ≥ 2,4 m; Anker `door` in der Mitte der Vorderwand bei (0, 0, z), z ≤ +2,0 [V] |
| Drehung | keine |
| Einfahrt | **gehört zum Grundstück, nicht zur Garage** [V]: Kies-/Pflasterfläche wird vom Dorf-Code gezeichnet und bleibt beim Garagentausch liegen |
| Budget | ≤ 2.000 Dreiecke [O – Vorschlag, im Projekt nicht festgelegt] |

### B.3 Gartendeko

| Punkt | Regel |
| --- | --- |
| Slot-Typ | `deco` → passt auf die Sockel `deco_1` bis `deco_4` |
| Raster-Fußabdruck | **3 × 3** (= ganzer Sockel) [W] |
| Sichtbare Höchstmaße | **3,0 × 3,0 m**, **Höhe ≤ 3,0 m** [O – Vorschlag: niedriger als die Traufe des Hauses, damit das Haus sichtbar bleibt] |
| Ursprung | Mitte des 3×3-Fußabdrucks, Bodenhöhe = Oberkante Sockelplatte |
| Drehung | 0°, 90°, 180°, 270° [V – geht, weil der Sockel quadratisch ist] |
| Überstände | keine; nichts ragt auf Weg, Gang, Einfahrt oder einen anderen Sockel |
| Budget | ≤ 1.500 Dreiecke [P] |
| Inhalt | ein Objekt oder eine kleine Szene, die den Sockel füllt (z. B. Teich mit Steinrand, Bank mit Laterne, Zelt) [V] |

### B.4 Auto

| Punkt | Regel |
| --- | --- |
| Slot-Typ | `car` → passt nur auf Sockel `car` |
| Raster-Fußabdruck | **3 × 5** (= Auto-Sockel) [V] |
| Sichtbare Höchstmaße | **2,4 × 4,6 × 2,2 m** (B × T × H) [O – Vorschlag; lässt 0,3 m Rand zum Zaun und zur Garage] |
| Ursprung | Mitte des 3×5-Sockels, Bodenhöhe = Unterkante Reifen |
| Vorwärtsrichtung | Kühler zur Straße (+Z) [O – Alternative: Kühler zur Garage] |
| Drehung | keine |
| Budget | ≤ 2.500 Dreiecke [O – Vorschlag] |
| Platzhalter | blauer Klotz 1,9 × 4,0 m mit Kabine (siehe Bilder) [W] |

### B.5 Meshy und Blender

**Lizenz-Konflikt, muss vor jeder Meshy-Nutzung entschieden werden:** Laut Meshy-Preisseite stehen Ausgaben des kostenlosen Plans unter CC BY 4.0 (Namensnennung nötig), die privaten Lizenzen gibt es nur in bezahlten Plänen. Beides widerspricht den Projektregeln „nur CC0 oder eigene“ und „0 €“ [P]. Quelle: https://docs.meshy.ai/en/webapp/pricing

Wenn Meshy erlaubt wird [O], dann gilt die Arbeitsteilung:

| Meshy darf erzeugen | In Blender wird vereinheitlicht (Pflicht) |
| --- | --- |
| Grundform und Stil (Hausform, Dachform, Autoform, Deko-Motiv) | Maßstab auf die sichtbaren Höchstmaße |
| Proportionen und Details innerhalb der Höchstmaße | Ursprung in die Fußabdruck-Mitte, Boden auf y = 0, Vorderseite +Z |
| Farbidee | Umfärben auf `palette.json`, Flat Shading, Vertex-Farben statt Foto-Texturen |
| – | Dreiecke reduzieren (Decimate) auf das Budget, innen liegende Flächen entfernen |
| – | Anker `door` an Haus und Garage setzen, Fenster auf Material `glow` |
| – | Materialien auf `solid` / `glow` / `glass` zusammenführen, Export nach B (gemeinsame Regeln) |

---

## C. Austausch- und Platzierungsregeln

### C.1 Regeln [W, technisch ausgearbeitet als V]

1. Jedes Grundstück hat genau sieben Slots: `house`, `garage`, `car`, `deco_1`, `deco_2`, `deco_3`, `deco_4`. Ihre Lage ist im Code fest (A.2, `world/plotPlan.ts`) und für alle gleich.
2. Ein Slot enthält höchstens ein Asset.
3. Erlaubte Zuordnung: Kategorie `house` → `house`; `garage` → `garage`; `car` → `car`; `deco` → `deco_1` bis `deco_4`. Alles andere lehnt der Server ab.
4. Haus tauschen: nur der Inhalt von `house` ändert sich. Garage, Einfahrt, Sockel und Deko bleiben an ihrer Stelle, weil ihre Lage nicht vom Haus abhängt.
5. Garage tauschen: nur `garage` ändert sich. Die Einfahrt ist Grundstücks-Geometrie und bleibt.
6. Wird ein Slot neu belegt, geht das vorherige Asset zurück ins Inventar (nichts geht verloren).
7. `house` und `garage` sind nie leer: jeder Schüler startet mit einem Starter-Haus und einer Starter-Garage [O – Vorschlag]. `car` und die vier Deko-Sockel dürfen leer sein; leere Deko-Sockel bleiben grüne Wiese, ein leerer Auto-Platz ist leere Einfahrt [W].

### C.2 Prüfung auf dem Server [V]

- **RPC `place_in_slot(item_id, slot, rot)`** (Migration 0013) ersetzt das freie Setzen auf Zellen; `clear_slot(slot)` räumt Auto und Deko weg. Sie prüft: angemeldeter Schüler, Bauen in der Klasse offen, Schüler besitzt eine freie Kopie, Kategorie passt zum Slot (Tabelle C.1), `rot` erlaubt (Deko 0/90/180/270°, sonst 0).
- **Tabelle `placements`** bekommt die Spalte `slot` mit Eindeutigkeit pro Schüler und Slot (`unique(player_id, slot)`); `cell_x/cell_z` entfallen.
- **Skalierung:** wird nie vom Client geschickt und nie gespeichert. Jedes Asset wird in Originalgröße gezeigt; die Größe ist vorher in der Pipeline geprüft.
- **Kollision:** braucht der Server nicht zu rechnen, weil Slots sich nicht überlappen und jedes Asset seinen Slot nicht überschreitet. Abgesichert wird das beim Katalog-Import: Er lehnt jedes Asset ab, dessen gemessene Bounding-Box (`bounds`) größer ist als das Höchstmaß seiner Kategorie.
- **Rotation:** Haus, Garage, Auto immer 0°; Deko in 90°-Schritten. Andere Werte lehnt die RPC ab.

### C.3 Lootbox [V, nur wenn freigegeben – heute nicht im Umfang]

- Eine Lootbox wählt auf dem Server (nicht im Browser) aus `items` mit `active = true`, `lootbox_weight > 0`, gültiger Kategorie (`house`, `garage`, `car`, `deco`) und vorhandener, geprüfter GLB-Datei.
- Ziehung per RPC `open_lootbox(box_id)`; Münzen werden gebucht und das Ergebnis im Kontoauszug eingetragen.
- Bezahlt wird nur mit im Spiel verdienten Münzen, nie mit Geld. Gewinnchancen werden im Shop angezeigt [V]. Lootboxen gelten im Jugendschutz als heikle Spielmechanik; das sollte die Lehrkraft vor der Einführung bewusst entscheiden [O].

---

## D. Katalogdaten je Asset [V]

| Feld | Typ | Beispiel | Zweck |
| --- | --- | --- | --- |
| `id` | Text | `house_cottage_01` | eindeutig |
| `kind` | `house` / `garage` / `car` / `deco` / `avatar` | `house` | Kategorie |
| `slot_type` | `house` / `garage` / `car` / `deco` | `house` | wohin es passt |
| `name_de` | Text | „Fachwerkhaus“ | Anzeige |
| `model` | Pfad | `assets/house_cottage_01.glb` | Datei |
| `footprint` | [B, T] | [6, 4] | muss zum Slot passen (Import prüft) |
| `bounds` | [B, T, H] in m | [5,9, 3,9, 5,6] | gemessen von der Pipeline |
| `max_height` | m | 6,0 | Höhenlimit der Kategorie |
| `pivot_rule` | Version | `center-floor-zplus-v1` | welche Ausricht-Regel gilt |
| `rotations` | Liste | [0] bzw. [0, 1, 2, 3] | erlaubte Drehungen (Vielfache von 90°) |
| `tris` | Zahl | 3.420 | Budget-Kontrolle |
| `price` | Münzen | 400 | Shop |
| `rarity` | `common` / `rare` / `epic` / `legendary` | `rare` | Shop und Lootbox |
| `lootbox_weight` | Zahl ≥ 0 | 10 | 0 = nicht in Lootboxen |
| `shop_visible` | ja/nein | ja | auch nur per Lootbox erhältlich möglich |
| `starter` | ja/nein | nein | Grundausstattung |
| `active` | ja/nein | ja | ausgeblendet ohne Löschen |
| `source` / `license` | Text | „eigenes Modell“ / „CC0, Kenney“ | Lizenznachweis (`LICENSES.md`) |
| `version` | Zahl | 1 | Austausch einer GLB ohne neue ID |

---

## E. Abweichungen zwischen Wunsch und Projektstand

| # | Projekt heute [P] | Neuer Wunsch [W] | Folge |
| --- | --- | --- | --- |
| 1 | freies Zellenraster mit Drehung 0–3 | feste Slots | `placements`, `place_item`, `cell_blocked`, Baumodus und Tests werden ersetzt |
| 2 | Raster 7×6 live, 10×10 lokal | 11×11 mit festen Bereichen (V) | Migration 0013 (10×10) **nicht** einspielen, sondern durch die neue ersetzen. Die Karte muss größer werden: Mit 12,4 × 12,4 m passen bei Maßstab 1,5 nur 30–34 der 34 Grundstücke (geprüft für alle drei Vorlagen); Vorschlag Maßstab ca. 1,65 |
| 3 | Haus belegt die ganze Rasterbreite hinten (10×3 lokal) | Haus kleiner, fester Slot | Haus 6×4 = 24 m² statt 30 m² (lokal) |
| 4 | Haus im Code gebaut, kein Asset | Haus als austauschbares Asset | Platzhalter-Haus wird zum ersten Starter-Asset |
| 5 | keine Garage, Einfahrt, Auto | Garage, Einfahrt, Auto-Sockel | neue Kategorien `garage`, `car`; `items.kind` erweitern |
| 6 | 14 Deko-Teile mit 1×1 bis 2×2 | einheitlich, ein Sockel pro Teil | die 14 Teile passen nicht; siehe Entscheidung 5 |
| 7 | beliebig viele Deko-Teile pro Grundstück | genau 4 Deko-Plätze à 3 × 3 | weniger Teile, dafür größere und schönere |
| 8 | Tor vorne in der Mitte | Tor vor der Haustür (x 3–4), Zaunlücke für die Einfahrt | Zaun, Gartenweg und Figuren-Wege anpassen |
| 9 | nur CC0 oder eigene Modelle, 0 € | Meshy | Lizenz-Konflikt (B.5) |
| 10 | Lootbox nicht im Umfang | Lootbox geplant | SCOPE erweitern, falls gewünscht |

---

## F. Entscheidungen, die die Lehrkraft bestätigen muss

| # | Frage | Empfehlung |
| --- | --- | --- |
| 1 | Raster 11 × 11 mit der Anordnung aus A.2 (Haus links, Garage rechts, Weg zur Tür, vier Sockel 3×3 mit Gang)? | ja |
| 2 | Haus-Slot 6 × 4, sichtbar höchstens 6,0 × 4,0 m, Höhe ≤ 6,0 m? | ja |
| 3 | Garage 3 × 4, Höhe ≤ 3,5 m; Einfahrt gehört zum Grundstück (bleibt beim Tausch)? | ja |
| 4 | Deko-Sockel 3 × 3, Deko-Höhe ≤ 3,0 m, Drehung in 90°-Schritten? | ja |
| 5 | Was passiert mit den 14 bisherigen Deko-Teilen (1×1 bis 2×2)? | jedes zu einer kleinen 3×3-Szene ausbauen (z. B. Brunnen mit Beet, Bank mit Laterne); bisher hat niemand eines gekauft |
| 6 | Auto: Sockel 3 × 5, sichtbar ≤ 2,4 × 4,6 × 2,2 m, Kühler zur Straße? | ja |
| 7 | Starter-Haus und Starter-Garage für alle, Auto und Deko am Anfang leer? | ja |
| 8 | Budgets für Garage (2.000) und Auto (2.500 Dreiecke)? | ja |
| 9 | Meshy trotz Lizenz-Konflikt? Oder nur CC0-Pakete (z. B. Kenney) plus eigene Blender-Modelle? | erst CC0/eigene; Meshy nur, wenn die Projektregel bewusst geändert wird |
| 10 | Lootbox in den Umfang aufnehmen (nur mit verdienten Münzen, Chancen sichtbar)? | später entscheiden, erst Shop mit Slots fertig machen |
