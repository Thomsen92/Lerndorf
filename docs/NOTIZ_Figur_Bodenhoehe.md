# Notiz: Figur (Junge) versinkt leicht im Boden

Stand: 22.10.2026 · Betrifft: `web/src/render/character.ts`, `web/src/render/crowd.ts`

## Befund

Das Tripo-Modell (`web/public/assets/characters/boy.glb`) sinkt beim Laufen und am Hang etwas in den Boden ein (Screenshot der Lehrkraft vom 22.10.2026).

## Ursachen

1. **Hüfte senkt sich beim Laufen.** In Ruhe stehen die Füße auf y = 0, in der Laufanimation geht die Hüfte tiefer, die Füße landen dann leicht unter 0.
2. **Hang.** Die Höhe wird nur in der Figurenmitte gemessen (`walkHeight` in `crowd.ts`). Am Hang sinkt der bergseitige Fuß ein.

## Lösung (wenig Aufwand, empfohlen: 1 + 3)

1. **Fester Höhenversatz:** in `instantiate()` (`character.ts`) `root.position.y = 0.06` setzen, Wert im Browser feinjustieren.
2. **Höchster Bodenpunkt (optional):** Bodenhöhe an 2–3 Punkten um die Figur messen (Radius ca. 0,25 m) und den höchsten Wert nehmen (dort, wo `walkHeight` aufgerufen wird, ca. 5 Zeilen).
3. **Schatten-Fleck:** weiche dunkle Scheibe knapp über dem Boden unter jeder Figur (eine Textur, kann als InstancedMesh für alle Figuren laufen). Die Figur wirkt aufgesetzt; kleine Abweichungen fallen nicht mehr auf.

## Prüfen

`npm run dev`: Figur auf ebenem Weg, am Hang und auf der Brücke ansehen; danach `npm run galerie` (CLAUDE.md).
