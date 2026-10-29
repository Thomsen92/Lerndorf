# FIX-04 – BUG-007: My Almanac direkt unter Season 1

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-007](../BUGS.md#bug-007--season-hub-almanac-direkt-unter-season-1)
**Schwere:** S3 · **Aufwand:** S · **Status:** bestätigt
**Bild:** `../bilder/BUG-007_01.png` (536 × 521 px)

## 1. Auftrag

Verschiebe die bestehende Karte **„My Almanac“** im Season-Hub direkt unter
den Season-1-Block (Titel „SEASON I · HALLOWEEN“, Fortschritt,
„Open LearnPass“). Sie soll **vor** „Your streak / Today“, „Your chests“ und
„Collection“ stehen.

**Nur die Position ändern.** Kein Redesign, keine neuen Inhalte, keine
Änderung an Almanac, Season-Logik oder Daten.

## 2. Kontext

Aktuelle Reihenfolge:

1. Season I · Halloween
2. Your streak / Today
3. Your chests
4. Collection
5. My Almanac („The Midnight Collection“)

Gewünscht:

1. Season I · Halloween
2. **My Almanac**
3. Your streak / Today
4. Your chests
5. Collection

Season 1 und Almanac gehören zusammen; der Almanac soll nicht mehr am Ende
der Seite stehen.

## 3. Nachstellen

1. `cd web && npm run dev`.
2. Season-Hub öffnen (bzw. 536 × 521 px einstellen).
3. Reihenfolge prüfen: My Almanac steht ganz unten nach Collection.

## 4. Umsetzung

1. Das Markup der Season-Hub-Seite finden (der Block mit „SEASON I ·
   HALLOWEEN“, Fortschrittsbalken, „38 days left“, „Open LearnPass“).
2. Die bestehende **My-Almanac-Karte** aus ihrem aktuellen Platz am Ende
   ausschneiden und **direkt nach dem Season-1-Block** einsetzen.
3. Keine CSS-`order`-/Flex-Reihenfolge verwenden, die von der DOM- und
   Tab-Reihenfolge abweicht.
4. Keine zweite Almanac-Karte erzeugen; die bestehende Komponente/Karte
   wiederverwenden.
5. Fokus-/Tab-Reihenfolge und Klickziel prüfen.

## 5. Nicht ändern

- Card-Design, Text, Icon, Linkziel des Almanac.
- Season-Fortschritt, Chests, Streak, Collection.
- Daten, RPCs, Preise, Besitz.
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
| 536 × 521 | Almanac direkt unter Season 1, vor Streak |
| 380 × 844 | gleiche Reihenfolge, Karte vollständig sichtbar |
| 1280 × 800 | gleiche Reihenfolge |
| Tastatur | Tab-Reihenfolge = sichtbare Reihenfolge |
| Klick | Almanac öffnet weiterhin den Almanac |

Abnahme:

- [ ] My Almanac steht direkt unter Season 1.
- [ ] Almanac steht vor Streak/Today, Chests und Collection.
- [ ] Keine doppelte Karte.
- [ ] Klick und Tastatur funktionieren.
- [ ] Mobil und Desktop dieselbe Reihenfolge.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot `bilder/BUG-007_02.png`.

## 7. Abschluss

1. In `BUGS.md` BUG-007 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Datei, alte/neue Position, Testergebnis).
2. Screenshot `bilder/BUG-007_02.png` verlinken.
3. Nur die betroffene Datei committen; keine unrelated Formatierungen.
