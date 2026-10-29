# FIX-05 – BUG-008: „Open in inventory“-Button überlappt die Karte

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-008](../BUGS.md#bug-008--learnpass-open-in-inventory-button-überlappt-die-karte)
**Schwere:** S3 · **Aufwand:** S · **Status:** bestätigt
**Bild:** `../bilder/BUG-008_01.png` (642 × 229 px)

## 1. Auftrag

Behebe den Überlauf in der Learnpass-Karte „1 chest waiting“: Der Knopf
**„Open in inventory“** ist zu breit, sitzt bündig auf der rechten
Kartenkante und stößt fast an die nächste Karte („Chest streak“). Der Knopf
muss vollständig innerhalb des Karteninhalts bleiben.

**Nur Layout.** Keine Änderung an Text, Farbe, Klickziel, Kartenreihen-Logik
oder Daten.

## 2. Kontext

Die untere Learnpass-Reihe ist eine horizontal scrollbare Kartenliste. In der
ersten sichtbaren Karte steht ein orangener Button, der bis an die
Kartenkante reicht. Der rechte Innenabstand fehlt; der Button überdeckt den
Rahmen und berührt fast die nächste Karte.

Screenshot: `bilder/BUG-008_01.png`.

## 3. Nachstellen

1. `cd web && npm run dev`.
2. Learnpass / Season-Hub öffnen.
3. Zur unteren Kartenreihe „1 chest waiting“ scrollen.
4. Prüfen: „Open in inventory“ endet an der Kartenkante, nicht am
   Content-Rand.

## 4. Umsetzung

- Knopfbreite auf den Karteninhalt begrenzen:
  `width: 100%; max-width: 100%; box-sizing: border-box;`.
- Sicherstellen, dass der Karteninhalt seinen Innenabstand behält und der
  Knopf nicht aus dem Content-Bereich wächst.
- In Flex-Zeilen `min-width: 0` für das Karten-/Button-Element setzen, damit
  es schrumpfen kann.
- Text darf notfalls umbrechen; keine abgeschnittene Beschriftung.
- Keine `overflow: hidden`-Notlösung, die den Fokusring oder Schatten
  abschneidet.

## 5. Nicht ändern

- Text, Farbe, Icon, Klickziel des Buttons.
- Kartenreihen-/Scroll-Logik.
- Season-, Chest- oder Inventar-Daten.
- Keine neuen Abhängigkeiten.

## 6. Test und Abnahme

```bash
cd web
npm test
npm run build
```

Manuell:

| Größe | Prüfen |
|---|---|
| 642 × 229 | Button innerhalb der Karte, kein Kontakt zur nächsten |
| 430 × 932 | dito |
| 380 × 844 | dito, Text vollständig |
| 360 × 800 | dito, kein horizontales Überlaufen der Karte |

Abnahme:

- [ ] Button bleibt vollständig innerhalb der Karte.
- [ ] Kein Überdecken der Kartenkante, kein Kontakt zur nächsten Karte.
- [ ] Text vollständig sichtbar.
- [ ] Kartenreihe scrollt weiterhin horizontal.
- [ ] Klick öffnet weiterhin das Inventar.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot `bilder/BUG-008_02.png`.

## 7. Abschluss

1. In `BUGS.md` BUG-008 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Datei, CSS-Ursache, Testergebnis).
2. Screenshot `bilder/BUG-008_02.png` verlinken.
3. Nur die betroffene Datei committen; keine unrelated Formatierungen.
