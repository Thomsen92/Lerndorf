# FIX-03 – BUG-005: Bau-Modus – direkte Auswahl statt großer Liste

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-005](../BUGS.md#bug-005--bau-modus-feldauswahl-verdeckt-das-dorf-direkter-klick-auf-gebäudedeko-fehlt)
**Schwere:** S3 · **Aufwand:** M (L, falls die 3D-Auswahl neu gebaut werden muss)
**Status:** bestätigt, noch nicht gefixt
**Bild:** `../bilder/BUG-005_01.png` (380 × 844 px)

## 1. Auftrag

Baue die Auswahl im Bau-Modus so um, dass man **direkt auf das Gebäude oder
die Deko im 3D-Dorf tippt**, um es zu ändern. Die große Liste
(„Choose a space …“) darf nicht mehr den halben Bildschirm verdecken.
Für leere Plätze reicht eine kompakte Auswahl.

**Nur UI/Interaktion.** Keine Änderung an Bau-Logik, Preisen, Besitz,
Platzierung, Münzen oder Datenbank.

## 2. Kontext

Auf dem Smartphone (380 × 844) beginnt die Liste bei ca. y = 355 und reicht
bis zum unteren Rand. Sie enthält alle sieben Plätze – auch leere – als
große Knöpfe, plus „Done“. Die 3D-Ansicht bleibt nur ca. 355 px hoch; das
Objekt, das man ändern will, kann dahinter liegen.

Der Nutzer sagt: **„direkter Klick auf das zu ändernde Gebäude/Deko reicht.“**
Die Liste ist damit der falsche primäre Einstieg.

## 3. Nachstellen

1. `cd web && npm run dev`, Browser auf 380 × 844 px.
2. Ins Dorf gehen, Bau-Modus öffnen.
3. Liste beobachten; versuchen, ein Gebäude/eine Deko direkt anzutippen.
4. Prüfen: Öffnet der Tap den Editor? Oder ist nur die Liste der Weg?

## 4. Vor dem Umbau prüfen

- Gibt es bereits einen Klick-/Raycast-Handler auf Bauplätze oder Objekte?
- Wie werden belegte und leere Plätze intern unterschieden?
- Welche Editoren gibt es (Haus, Garage, Auto, Deko 1–4), und wie werden
  sie heute aus der Liste geöffnet?
- Wie funktioniert die Kamera im Bau-Modus (Ziehen = drehen)? Ein Tap darf
  nicht mit einem Drag verwechselt werden (Bewegungsschwelle).
- Gibt es bestehende Tests/Screenshots für den Bau-Modus?

## 5. Umsetzung

1. **Direktauswahl:** Tap auf ein belegtes Objekt wählt den Platz aus,
   markiert ihn sichtbar (Highlight/Rahmen) und öffnet den bestehenden
   Editor. Kein zweiter Dialog dazwischen.
2. **Leere Plätze:** entweder Tap auf den Boden (mit klarer Markierung) oder
   eine kompakte Chip-Leiste („House · Garage · Car · Deko 1–4“). Nicht die
   volle Liste.
3. **Fallback-Liste:** nur wenn der Tap nicht eindeutig ist; einklappbar,
   max. 2–3 Zeilen, „Done“ sticky/immer erreichbar.
4. **Touch vs. Drag:** kurzer Tap (< ca. 8 px Bewegung) wählt aus; Ziehen
   dreht weiterhin die Kamera.
5. **Barrierefreiheit:** Tastatur-/Screenreader-Weg über die kompakte Liste
   erhalten; Fokus nach dem Öffnen in den Editor setzen.
6. **Optik:** bestehende Bau-Optik und Halloween-Stil nicht verändern;
   keine neuen Bibliotheken.

## 6. Randbedingungen

- `CLAUDE.md`, `docs/SCOPE.md`, `docs/SPEC.md`, `docs/LOOK.md` lesen.
- **Live-Betrieb:** keine DB-Resets, keine Migration, keine manuellen
  Münz-/Besitz-Korrekturen. Der Fix ist clientseitig.
- Keine echten Schülerdaten; Testkonto/Spitznamen.
- Münzen/Besitz/Platzierungen nur über RPCs – hier gar nicht anfassen.
- Keine Änderung an Platzierungsregeln, Preisen oder Besitzständen.
- Kein Service-Key in Client/Repo/Log.
- Keine neuen Abhängigkeiten; kleine, prüfbare Schritte.
- Wenn die 3D-Auswahl ohne Eingriff in die Bau-Logik nicht sauber geht:
  stoppen und den Fall dokumentieren, nicht die Logik umbauen.

## 7. Test und Abnahme

```bash
cd web
npm test
npm run build
```

Manuell:

| Breite × Höhe | Prüfen |
|---|---|
| 360 × 800 | 3D-Ansicht ≥ 50 %, direkter Tap, leere Plätze |
| 380 × 844 | wie Screenshot; Liste verdeckt nicht mehr die Hälfte |
| 430 × 932 | direkter Tap, „Done“ erreichbar |
| 1280 × 800 | Desktop weiterhin korrekt (Liste als Fallback) |

Abnahme:

- [ ] Tap auf belegtes Gebäude/Deko wählt es aus und öffnet den Editor.
- [ ] Leere Plätze sind ohne große Liste erreichbar.
- [ ] 3D-Ansicht bleibt mindestens zur Hälfte sichtbar.
- [ ] „Done“ ist immer sichtbar/erreichbar.
- [ ] Ziehen dreht weiterhin die Kamera; kein versehentliches Auswählen.
- [ ] Keine Änderung an Bau-/Preis-/Besitzlogik.
- [ ] Tastatur/Fokus funktioniert.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot `bilder/BUG-005_02.png`.

## 8. Abschluss

1. In `BUGS.md` BUG-005 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Datei, Interaktion, Testergebnis).
2. Screenshot `bilder/BUG-005_02.png` verlinken.
3. Nur die betroffenen Dateien committen; keine unrelated Formatierungen.
