# DeepSeek-Zusatzauftrag · What’s in it? → große 3D-Gegenstandsansicht

Verbindlicher Nutzerauftrag 27.10.2026, r14. **Noch zu implementieren, hier keine Produktionsdatei geändert.** Gilt für die bestehende Inhaltsübersicht der Season-Truhe aus LearnPass, Inventar und Shop.

## Gewünschtes Verhalten

1. „What’s in it?“ / „Was ist in einer Season-Truhe?“ zeigt weiterhin den tatsächlichen serverseitigen Gegenstandspool und dessen aktuelle Seltenheiten/Chancen.
2. **Jeder Gegenstand ist antippbar:** Bild und Name gehören zu einem einzigen großen Button. Accessible Name beispielsweise „View Warlock in 3D“. Kein Hoverzwang und kein winziger zusätzlicher Link.
3. Antippen öffnet eine große 3D-Detailansicht des tatsächlichen Modells: auf dem Tablet fast bildschirmfüllend, mit Name, Seltenheit und gut erreichbarem Schließen-/Zurück-Button. Mit Finger/Maus drehen; Pinch/Scroll zoomen; „Reset view“ verfügbar.
4. Schließen kehrt zur gleichen Position der Gegenstandsliste zurück und fokussiert genau den ursprünglichen Gegenstandsbutton. Danach kann ein anderer Gegenstand geöffnet werden. Die Truhe bleibt ungeöffnet und der Besitz unverändert.

## Konkrete Ausgangsdateien

- `web/src/ui/learnpass/insideModal.ts`: `openInside(host,opts)` erzeugt derzeit nicht interaktive `figure` / `div.inside-box` / `figcaption`. Diesen einen Öffner erweitern, damit alle drei bisherigen Aufruforte profitieren.
- `web/src/ui/learnpass/insideModal.css`: große Touchflächen, Fokusdarstellung und mobile Detailansicht ergänzen.
- `web/src/api/season.ts`: `PoolItem` enthält derzeit `id`, `kind`, `rarity`, `sell`, **keinen Modellpfad**. Keine nicht vorhandene `item.model`-Eigenschaft voraussetzen.
- `web/src/render/glbItems.ts`: vorhandene `GLB_ITEMS`, `isGlbItem`, `loadGlbItem` und Meshopt-Loaderkonfiguration verwenden. Für nicht als GLB hinterlegte Gegenstände den bestehenden Modellaufbau aus der Thumbnail-/Inventardarstellung wiederverwenden; keine neuen generischen Platzhalter als fertige Modelle ausgeben.
- `web/src/render/itemThumbs.ts`: vorhandene Modellauflösung/Kamerahilfe prüfen. Wiederverwendbare Modellfactory bei Bedarf gezielt exportieren, nicht einen zweiten Gegenstands-ID-Katalog kopieren.
- Neu vorgeschlagen: `web/src/ui/item3dPreview.ts`, `item3dPreview.css`, `web/tests/ui/item3dPreview.test.ts`, `web/tests/ui/insidePreview.test.ts`, `web/e2e/season-item-preview.spec.ts`. E2E-Datei in der tatsächlichen Playwright-Projektauswahl berücksichtigen.

Schnittstelle für einen gemeinsamen Öffner:

```ts
interface Item3dPreviewOptions {
  item: Pick<PoolItem, 'id' | 'kind' | 'rarity'>;
  opener: HTMLElement;
  onClose?: () => void;
}
interface Item3dPreviewHandle { close(): void; }
// openItem3dPreview(host: HTMLElement, opts: Item3dPreviewOptions): Item3dPreviewHandle
```

## Darstellung und Ressourcen

- GLB erst bei Auswahl laden; nicht alle 28 Gegenstände als große 3D-Modelle vorab laden. Vorhandene kleine Thumbnails unverändert lazy verwenden.
- Nur ein aktiver Detailrenderer und ein aktives Modell. Schneller Wechsel nutzt Request-Token; eine verspätete Antwort darf keine neuere Auswahl überschreiben. Controls/RAF pausieren bei verborgenem Tab.
- Bounding Box und Canvas-Seitenverhältnis bestimmen Kameraabstand und Orbit-Ziel. Warlock, Horror-Haus, kleine Pflanze und breite Deko müssen ohne Abschneiden vollständig passen. Keine fest codierte Einheitskamera für alle Modelle.
- Vorhandene Three-Version und MeshoptDecoder nutzen. Beleuchtung zeigt Materialien klar; zusätzliche rote Halloween-Beleuchtung darf die Lesbarkeit des Modells nicht ersetzen. Keine Browser-TTS/Audio oder neue Animation nötig. Reduzierte Bewegung: keine automatische Rotation.
- Echte Loading-/Fehleranzeige mit Retry, währenddessen Name/Zurück erreichbar. Kein Zugriff auf Reward-/Kauf-RPCs aus der Vorschau.
- Browserdom über vorhandenes Modal-/Focus-/Inert-System koordinieren. `openInside` hat bereits einen Escape-Listener in Capture-Phase: solange die Detailansicht offen ist, darf derselbe Escape **nicht zugleich beide Ebenen schließen**. Am besten `openInside` mit einem sichtbaren Listen-/Detailzustand betreiben oder den Eltern-Escape bewusst delegieren. Beim Schließen der gesamten Elternansicht auch Detailansicht abbauen.
- Nach Schließen Controls, ResizeObserver, Events, RAF und eigene Rendererressourcen freigeben. Von `loadGlbItem` geliehene Geometrien/Materialien sind mit Welt/Inventar geteilt; nicht pauschal `dispose()` darauf aufrufen. Ein separates Preview-Licht/Renderer kann freigegeben werden.
- Rasterbuttons mindestens 48 × 48 Pixel, fokussierbar mit Tab, Enter/Space aktivieren. Auf 768×1024 und 1024×768 Name, Modell und Schließen sichtbar; bei 390×844 keine horizontale Überbreite. Keine Dropdowns/Checkboxen nötig.

## Umsetzung und konkrete Abnahme

- [ ] Tests zuerst: Klick auf Bild/Name aktiviert den passenden Gegenstand, gleiche Funktion aus LearnPass/Inventar/Shop; ID/Name stimmen mit Pool überein.
- [ ] Listenbuttons und gemeinsamen 3D-Öffner ergänzen. Pool weiterhin vom Server lesen; Besitz/Chancen unverändert.
- [ ] Alle tatsächlich im Pool vorkommenden IDs einmal öffnen. Richtige Modelle statt nur hochskalierter PNGs; Bilder sind allein Thumbnails.
- [ ] Touchdrehen/Pinch, Mausdrehen/Zoom und Reset prüfen. Sehr große und sehr kleine Modelle vollständig einrahmen.
- [ ] Langsamer Load A → Auswahl B → Antwort A: B bleibt ausgewählt. Fehlender GLB-Pfad liefert Retry, kein defektes leeres Fenster.
- [ ] Escape schließt zuerst Detail, ein weiterer Escape die Liste. Fokus/Scrollposition zurück zum ursprünglichen Button, keine verwaisten `inert`-Attribute.
- [ ] Zwanzigmal öffnen/schließen, danach keine wachsenden WebGL-Kontexte/RAF-/Listenerbestände. Modell derselben ID in der Dorfwelt bleibt nach Preview-Schließen sichtbar.
- [ ] Coin-/XP-/Inventar-/Truhenstatus vor und nach Vorschau identisch. Diese Ansicht ist keine Ziehung, kein Kauf und kein Besitznachweis.

Nach Umsetzung gezielte UI-Tests, Typecheck, Build und neue E2E ausführen; echte Tabletbedienung gesondert abnehmen. Der neue Shop/Katzen-/Kessel-Aufbau hat mit den möglichen Truheninhalten nichts zu tun: nicht versehentlich automatisch als Loot in `items` eintragen.
