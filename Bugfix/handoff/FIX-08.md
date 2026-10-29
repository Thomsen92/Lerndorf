# FIX-08 – BUG-011: Legendäres Hausmodell ersetzen

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-011](../BUGS.md#bug-011--legendäres-hausmodell-ersetzen)
**Schwere:** S3 · **Aufwand:** M (L bei Animationen/Kollisionsumbau)
**Status:** bestätigt
**Bild:** `../bilder/BUG-011_01.png`
**Modell:** `../modelle/legendary-house-fantasy-treehouse.glb`
(10.875.488 Bytes, SHA-256 `0A367287…B79951`)

## 1. Auftrag

Ersetze das aktuelle legendäre Hausmodell, das als schwarze/grüne
Texturmasse rendert, durch die angehängte **Fantasy-Treehouse-GLB**.

Nur dieses Modell tauschen. Keine anderen Häuser, Items, Preise oder
Season-Logik ändern.

## 2. Kontext

Das aktuelle Modell ist im Dorf/Hausplatz nicht als Haus erkennbar: schwarze
und grüne, fleckige Flächen; Kürbisse/Zaun drumherum. Das neue Modell ist
eine glTF-2.0-Datei (Generator Tripo) mit einer Szene, einem Mesh, einem
Material und drei eingebetteten Texturen (Basecolor, RM, Normal); keine
Animationen.

**Lizenz:** Im GLB steht keine Lizenz. Vor dem Ausliefern klären, ob das
Modell eigen/CC0 ist, und die Quelle in `blender/sources/LICENSES.md`
eintragen. Wenn nicht geklärt: nicht einsetzen, Rücksprache.

## 3. Nachstellen

1. Dorf / Hausplatz öffnen.
2. Das legendäre Hausmodell ansehen: schwarze/grüne Masse statt Haus.

## 4. Umsetzung

1. **Referenz finden:** Suche die Stelle, die das legendäre Hausmodell lädt.
   Haus-Items liegen u. a. in `web/src/render/glbItems.ts` (Feld `kind:
   'house'`); Basishäuser in `web/src/render/plotAssets.ts`. Anhand des
   Screenshots/Item-Namens die richtige Referenz bestimmen.
2. **Asset ablegen:** GLB in den passenden Ordner unter
   `web/public/assets/...` kopieren, in dem auch das alte Modell liegt
   (Namenskonvention beibehalten). Nicht aus `Bugfix/` laden.
3. **Pfad umstellen:** Die Referenz auf die neue Datei zeigen lassen;
   Loader/Cache-Eintrag anpassen.
4. **Normalisieren:** Scale, Rotation und Pivot an den Hausplatz anpassen.
   Bounding Box und Y-Offset prüfen, sodass das Haus auf dem Boden steht und
   nicht schwebt/versinkt.
5. **Material/Textur:** Basecolor/RM/Normal korrekt laden; keine schwarzen
   Flächen. Beleuchtung/Schatten prüfen (cast/receive).
6. **Kollision:** Die vorhandene Kollisionsform an das neue Modell anpassen;
   keine unsichtbaren Wände, keine begehbaren Wände.
7. **Performance:** 10,9 MB GLB auf Mobil testen; Ladezeit/Framerate
   beobachten. Keine anderen Assets dadurch verändern.
8. **Lizenz:** Quelle/Rechte klären und in `blender/sources/LICENSES.md`
   dokumentieren.

## 5. Nicht ändern

- Andere Häuser, Items, Preise, Besitz oder Season-Logik.
- Platzierung/Anzahl der Hausplätze.
- Münzen/XP/RPCs.
- Keine Produktivdaten ändern.
- Keine neuen Abhängigkeiten.

## 6. Test und Abnahme

```bash
cd web
npm test
npm run build
npm run galerie
```

Manuell:

| Prüfen | Erwartung |
|---|---|
| Hausplatz | neues Treehouse sichtbar, richtig skaliert/gedreht |
| Texturen | keine schwarzen/grünen Flächen |
| Boden | Haus steht auf dem Platz, kein Schweben/Versinken |
| Kollision | begehbar wie vorher, keine unsichtbaren Wände |
| Andere Häuser | unverändert |
| Mobil | Ladezeit/Framerate akzeptabel |

Abnahme:

- [ ] Altes Modell vollständig ersetzt; keine schwarze/grüne Masse.
- [ ] Haus maßstabsgerecht, richtig gedreht, auf dem Boden.
- [ ] Texturen/Materialien korrekt; Schatten passen.
- [ ] Kollision stimmt; andere Häuser unverändert.
- [ ] Galerie/Mobil/Desktop geprüft; Performance akzeptabel.
- [ ] Lizenz/Quelle geklärt und in `LICENSES.md` eingetragen.
- [ ] `npm test`, `npm run build`, `npm run galerie` grün.
- [ ] Screenshot `bilder/BUG-011_02.png`.

## 7. Abschluss

1. In `BUGS.md` BUG-011 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Asset-Pfad, Referenz, Skalierung, Testergebnis).
2. Screenshot `bilder/BUG-011_02.png` verlinken.
3. Nur die betroffenen Dateien committen; keine unrelated Formatierungen.
