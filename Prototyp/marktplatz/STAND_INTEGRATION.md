# Halloween-Shop · Integration r14

Aktiv ist der **gelieferte Halloween-Shop mit genau einer großen Katze und dem Candy Cauldron davor**. Der eigene violette Stand ist auf der Ersatzbank. Modellbau ist erledigt; DeepSeek übernimmt Platzierung und Spielanbindung.

## Aktive Lieferdateien

| Datei | Verwendung |
|---|---|
| `assets/season-starter/halloween-shop-event.glb` | Vollständiges aktuelles Ensemble, bevorzugter Import |
| `assets/season-starter/halloween-shop.glb` | Shop einzeln |
| `assets/season-starter/halloween-cat-large.glb` | Nur die große Katze, kleinere Figuren entfernt |
| `assets/season-starter/halloween-candy-cauldron.glb` | Candy Cauldron einzeln |
| `sources/season-starter/halloween-shop-event.blend` | Editierbare Quelle, Maps gepackt |
| `sources/season-starter/build-supplied-shop.py` | Reproduzierbarer Builder für r14 |
| `assets/season-starter/season-ticket.svg` | UI-Ticket |
| `stand.html` | Drehbare Klickvorschau des aktuellen Ensembles |

Ensemble: **4,57 m breit × 3,64 m tief × 3,60 m hoch**, **19.818 Dreiecke / drei Material-Primitives**. GLB +Y oben, +Z Front; Bodenanker Ursprung. Eingebettete Maps maximal 1.024 px; kein Meshopt-/Draco-Decoder erforderlich.

Die Katze wurde anhand ihrer größten zusammenhängenden Geometriegruppe aus dem gelieferten Vierkatzen-GLB isoliert. Nur die große Figur ist aktiv: 3.487 Dreiecke, ein logischer Geometrieverbund. UVs und PBR-Zuordnung bleiben erhalten; kleinere Katzen sind aus dieser Ableitung entfernt. Original-GLB unverändert gesichert. Katze steht links vorne, Candy Cauldron rechts vorne; alle drei Teile bodenbündig, ohne gegenseitige Überschneidung.

Bei getrenntem Import haben die Einzelteile ihren eigenen Bodenanker im Ursprung. Platzierungen im Ensemble in GLB-Koordinaten: Shop `(0,0,0)`, Katze `(-0.55,0,1.86)`, Kessel `(1.15,0,1.90)`. Katze 1,15 m hoch, Kessel 1,0 m hoch. Diese Teile **nicht zusätzlich** zur kombinierten Ensembledatei laden.

## Ersatzbank und Originale

- `assets/season-starter/bench/custom-stand-r1/`: eigener violetter Stand, Shell, ursprüngliche Katzen-Gruppen-Ableitung, vorherige Audits und Vorschau.
- `sources/season-starter/custom-stand-r1.blend`: editierbare Quelle des eigenen Stands. Ursprüngliche `.blend` bleibt ebenfalls vorhanden.
- Die alten Top-Level-Dateien `spooky-stand.glb`, `spooky-stand-shell.glb`, `halloween-cat-mascot.glb` sind historische r13-Dateien, **nicht aktiv importieren**. Keine bestehende Datei wurde entfernt.
- Gelieferte Originale aus Downloads sind unverändert nach `sources/season-starter/` kopiert. Quellen/Hashes in `model-audit.json`; Lizenzbeleg `sources/season-starter/LICENSES.md`.

## DeepSeeks verbleibender Auftrag

1. Fertiges Ensemble auf öffentlicher Fläche des normalen Marktplatzes platzieren. Wege, Sir Byte und Aufgabenbrett freihalten. Stand bleibt bei normaler Weltstimmung sichtbar, unabhängig vom dunklen Halloween-Overlay.
2. Großzügige Hit-Zone auf dem Shop sowie UI-Ticket öffnen denselben Welcome-Hub. Kameradrag ab sechs Pixeln und Mehrfingergesten lösen keine Aktivierung aus.
3. **Welcome nur:** Spooky English Quiz machen → 150 XP verdienen → LearnPass öffnen und Belohnungen abholen. Keine Sammelkarten, Seltenheiten, Collection-Verlinkung oder Boxenerklärung in diesem Dialog. Quiz-/LearnPass-Aktionen sind in der Modellvorschau noch deaktiviert; echte App-Öffner integriert DeepSeek.
4. Zusätzlicher Nutzerauftrag: Gegenstände in „What’s in it?“ antippbar machen und große dreh-/zoombare 3D-Detailansicht öffnen. Vollständige Anforderungen in `DEEPSEEK_WHATS_INSIDE_3D.md`.

Vorhandene GLB-Loader können Modelle normalisieren: reale Metermaße/Skalierung beachten. Eingebettete Material-/PBR-Zuordnungen erhalten, nicht pauschal überschreiben. Kein Rig/Katzenanimation enthalten. Geteilte Cache-Geometrien beim Preview-Schließen nicht zerstören. Shop, Katze und Kessel nicht automatisch als Loot in `items` eintragen.

## Technische Nachweise

`assets/season-starter/model-audit.json`: Reimport, identische Maße/Dreiecke, größte Katze isoliert, Boden-/Freiraumkontakt geprüft. `browser-audit.json`: tatsächlicher GLB-Load, nur eine Katzenkomponente, Welcome ohne Kartenwerbung, Klick/Drag, Ticket, Escape/Fokus, Tablet-/Handyansicht und vier decodierbare Edge-TTS-MP3s. Die Vorschau einschließlich Boden/Pflaster rendert 20.204 Dreiecke in sieben Draw Calls; keine FPS-Aussage für die vollständige Welt oder ein echtes Tablet.

Gestalterische Abnahme bleibt beim Nutzer/Claude. `stand-preview.png` dient als Ansichtsnachweis.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --disable-autoexec --python-exit-code 1 --python 'Prototyp/marktplatz/sources/season-starter/build-supplied-shop.py'
node Prototyp/marktplatz/tools/verify-stand.cjs
```

Schreibarbeiten nur in diesem Prototypordner. Keine geöffnete Blender-Szene, Produktionsdateien, Datenbanken oder Originale im Downloads-Ordner verändert.
