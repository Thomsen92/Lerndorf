# FIX-06 – BUG-009: Inventar-Platzhalter aufräumen

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-009](../BUGS.md#bug-009--inventar-platzhalter-gegenstände-mit-falschem-icon)
**Schwere:** S3 · **Aufwand:** M (L, falls Assets/Produktivdaten)
**Status:** bestätigt
**Bild:** `../bilder/BUG-009_01.png` (433 × 429 px)

## 1. Auftrag

Räume die Platzhalter-Gegenstände im Inventar/Kleiderschrank auf:

- „Short hair“, „Ponytail“, „Messy hair“ und „T-shirt“ zeigen alle
  dasselbe grüne T-Shirt-Bild.
- Die Items wirken wie Test-/Platzhalter und sollen nicht als normale
  Inventar-Items erscheinen.
- Haar-Items brauchen Haar-Icons; das T-Shirt das T-Shirt-Icon.

**Kein Redesign, keine neuen Features.** Nur Platzhalter entfernen/ausblenden
und das Icon-Mapping korrigieren.

## 2. Kontext

Screenshot: 2 × 2-Raster mit vier Karten. Jede Karte hat ein Herz
(Favorit), „For your avatar“ und „For a different character“. Alle vier
zeigen dasselbe grüne T-Shirt – auch die drei Haar-Items.

## 3. Nachstellen

1. `cd web && npm run dev`.
2. Inventar / Kleiderschrank öffnen.
3. Die vier Karten prüfen: gleiches T-Shirt-Icon bei allen.

## 4. Bestand aufnehmen (zuerst)

- Welche Item-IDs/-Namen sind die Platzhalter?
- Woher kommen sie: Katalog, Seed, Migration, echtes Inventar?
- Sind sie nur im Testkonto oder bei echten Schülern sichtbar?
- Welcher Item-Typ (`kind`) und welcher Icon-Pfad ist hinterlegt?
- Gibt es bereits echte Haar-Icons, oder fehlen die Assets?

**Wichtig:** Die App ist live. Keine Produktivdaten löschen, ohne vorher
die betroffenen Zeilen zu prüfen, zu sichern und die Lehrkraft zu fragen.

## 5. Umsetzung

1. **Platzhalter aus dem sichtbaren Katalog nehmen** oder hinter ein
   Test-/Dev-Flag legen, sodass Schüler sie nicht sehen.
2. **Icon-Mapping korrigieren:** Haar-Items → Haar-Icon, T-Shirt →
   T-Shirt-Icon. Kein generisches T-Shirt als Fallback für andere Typen.
3. **Fallback:** Wenn für ein Item kein Icon existiert, das Item nicht mit
   einem falschen Platzhalter anzeigen – ausblenden oder korrektes Asset
   ergänzen (CC0/eigenes, Quelle dokumentieren).
4. **Testdaten trennen:** Seed-/Test-Items dürfen nicht im Live-Inventar
   erscheinen.
5. **Bestand prüfen:** Inventar-Anzahl, Favoriten, Detailansicht bleiben
   konsistent.

## 6. Nicht ändern

- Layout/Raster des Inventars.
- Karten-Design, Texte, Herz/Favorit.
- Besitz-/Münz-Logik oder RPCs.
- Keine Produktivdaten löschen ohne Freigabe.
- Keine neuen Abhängigkeiten.

## 7. Test und Abnahme

```bash
cd web
npm test
npm run build
```

Manuell:

| Größe | Prüfen |
|---|---|
| 433 × 429 | keine Platzhalter, korrekte Icons |
| 380 × 844 | dito, Raster und Herz |
| Klick | Detailansicht öffnet |
| Favorit | Herz setzen/entfernen funktioniert |
| Inventar-Zahl | unverändert/korrekt |

Abnahme:

- [ ] Keine Platzhalter-Items mehr sichtbar.
- [ ] Haare haben Haar-Icons, T-Shirt das T-Shirt-Icon.
- [ ] Raster, Herz und Detailansicht funktionieren.
- [ ] Keine echten Besitzdaten gelöscht; Inventar-Zahl stimmt.
- [ ] Testkonto und Live-Inventar geprüft.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot `bilder/BUG-009_02.png`.

## 8. Abschluss

1. In `BUGS.md` BUG-009 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Item-IDs, Icon-Mapping, Datenprüfung, Testergebnis).
2. Screenshot `bilder/BUG-009_02.png` verlinken.
3. Nur die betroffenen Dateien committen; keine unrelated Formatierungen.
