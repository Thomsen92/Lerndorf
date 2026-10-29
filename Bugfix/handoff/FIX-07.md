# FIX-07 – BUG-010: Spelling Bee leichter machen

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bug:** [BUG-010](../BUGS.md#bug-010--spelling-bee-zu-schwer)
**Schwere:** S3 · **Aufwand:** M (L, falls Unit-Wörter erst aufbereitet werden)
**Status:** bestätigt

## 1. Auftrag

Mache die Spelling Bee für die Zielgruppe leichter – mit genau diesen
Änderungen:

1. **Mehr Buchstaben zur Auswahl.**
2. **3 Joker pro Spiel/Durchlauf.**
3. **Wörter möglichst aus der aktuellen Unit bzw. dem Lehrbuch.**
4. Insgesamt leichter, ohne die Spielidee zu ändern.

Keine Änderung an Layout, Optik oder Belohnungen ohne Freigabe.

## 2. Kontext

Die Spelling Bee ist im Dorf als Minigame erreichbar. Laut Lehrkraft ist sie
zu schwer: zu wenige Buchstaben, zu wenige Joker, Wörter nicht klar an der
Unit/dem Lehrbuch orientiert.

## 3. Nachstellen

1. `cd web && npm run dev`.
2. Ins Dorf gehen, Spelling Bee öffnen.
3. Eine Runde spielen.
4. Prüfen: Buchstabenauswahl, Joker, Wortherkunft, Schwierigkeit.

## 4. Änderungen

### 4.1 Mehr Buchstaben zur Auswahl

- Den Buchstabenpool vergrößern, sodass die benötigten Buchstaben häufiger
  verfügbar sind.
- Die Lösung muss immer vollständig legbar sein; keine fehlenden oder
  doppelten Buchstaben.
- Keine reine Zufalls-Erhöhung, die die Aufgabe unlösbar macht.

### 4.2 Drei Joker

- **3 Joker pro Spiel/Durchlauf**; sichtbarer Zähler.
- Verbrauch/Zurücksetzen klar definieren (z. B. pro Runde).
- Bestehende Joker-Mechanik prüfen und auf 3 setzen. Falls es noch keine
  gibt: eine einfache Mechanik im bestehenden UI-Stil ergänzen; keine neue
  Währung, keine Münzen als Joker.
- Joker dürfen die Lösung nicht direkt verraten, außer das ist die
  bestehende Mechanik.

### 4.3 Wörter aus der Unit/dem Lehrbuch

- Wortpool an die aktuelle Unit koppeln.
- Wörter aus dem Lehrbuch/Unit bevorzugen; keine unbekannten, zu schweren
  Wörter außerhalb des Lernstands.
- Wenn die Unit-Liste als Datei/Content vorliegt: daraus ziehen. Wenn nicht:
  bei der Lehrkraft anfragen, nicht raten.
- Keine echten Schülerdaten oder personenbezogenen Inhalte.

### 4.4 Schwierigkeit

- Wortlänge/Häufigkeit und Buchstabenpool so tunen, dass die Runde
  schaffbar ist.
- Keine Änderung an Münzen/XP/Besitz, außer die Lehrkraft gibt es frei.

## 5. Nicht ändern

- Layout, Optik, Animationen des Minigames.
- Belohnungs-/Münzlogik (ohne Freigabe).
- Andere Minigames oder Quests.
- Keine neuen Abhängigkeiten.
- Keine Produktivdaten ändern; reine Client-/Content-Anpassung.

## 6. Test und Abnahme

```bash
cd web
npm test
npm run build
```

Manuell:

| Prüfen | Erwartung |
|---|---|
| Buchstaben | mehr Auswahl als vorher; Lösung legbar |
| Joker | 3 pro Spiel, Zähler stimmt |
| Wörter | aus der aktuellen Unit/dem Lehrbuch |
| Schwierigkeit | von der Lehrkraft als leichter bestätigt |
| Bestehendes | Münzen/XP unverändert |

Abnahme:

- [ ] Mehr Buchstaben zur Auswahl; Lösung immer legbar.
- [ ] Genau 3 Joker pro Spiel/Durchlauf, sichtbar/nutzbar.
- [ ] Wortpool enthält Unit-/Lehrbuchwörter.
- [ ] Runde ist leichter; Lehrkraft bestätigt.
- [ ] Keine Änderung an Münzen/XP/Besitz ohne Freigabe.
- [ ] `npm test` und `npm run build` grün.
- [ ] Screenshot `bilder/BUG-010_02.png`.

## 7. Abschluss

1. In `BUGS.md` BUG-010 auf **„Fix da“** setzen und eine kurze Notiz
   ergänzen (Buchstabenpool, Joker, Wortquelle, Testergebnis).
2. Screenshot `bilder/BUG-010_02.png` verlinken.
3. Nur die betroffenen Dateien committen; keine unrelated Formatierungen.
