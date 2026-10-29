# FIX-02 – Learnpass auf Smartphones: Freeze, Übergröße, Scrollen

**Repo:** `C:\Users\Thomas\Projekte\Wochenpläne 8r\Lerndorf`
**Bugs:** [BUG-002](../BUGS.md#bug-002--learnpass-münzen-einsammeln-friert-die-seite-ein) (S1),
[BUG-003](../BUGS.md#bug-003--learnpass-ansicht-zu-groß-für-smartphones) (S3),
[BUG-004](../BUGS.md#bug-004--scrollen-im-learnpass-ruckelt) (S3)
**Status:** bestätigt, noch nicht gefixt
**Bild:** `../bilder/BUG-002_01.png` (380 × 839 px)

## 0. Reihenfolge und Umfang

1. **BUG-002 – Freeze beim Münzen-Einsammeln (P1, zuerst).** Ein Hard Reset
   ist der schwerste Effekt; alles andere wartet.
2. **BUG-003 – Ansicht zu groß (P2).** Danach, weil die Größe das Scrollen
   beeinflusst.
3. **BUG-004 – Scrollen ruckelt (P3).** Zuletzt; prüfen, ob der Fehler mit
   BUG-002/003 schon verschwindet.

**Nur diese drei Befunde bearbeiten.** Kein Redesign des Learnpass, keine
Änderung an Rewards, Season-Logik oder Münz-RPCs.

## 1. BUG-002 – Münzen einsammeln friert die Seite ein

### Nachstellen

1. `cd web && npm run dev`, im Browser auf 380 × 839 px stellen.
2. Einloggen, Learnpass öffnen (Season I Halloween).
3. Münzen einsammeln (Karte/„Collected“/Sammel-Aktion – genauen Tap zuerst
   herausfinden).
4. Beobachten: Bleibt die Seite stehen? Kommt noch ein Klick an? Läuft ein
   Timer/Animation weiter?

### Zuerst diagnostizieren, nicht blind ändern

- **Konsole:** Fehler, unbehandelte Promise-Rejections, Endlosschleifen.
- **Network:** Hängt ein Supabase-RPC? Kommt eine Antwort?
- **Performance-Trace:** Long Task, der die UI blockiert?
- **DOM-Zustand im Freeze:** `document.body`/`html` auf `overflow`,
  `inert`, `pointer-events` prüfen; ist ein Overlay/Dialog noch offen?
- **Fokus:** Steckt der Fokus in einem Element fest (`aria-modal`,
  Focus-Trap)?
- **Varianten:** mit `prefers-reduced-motion: reduce`, ohne Ton, im
  Offline-Modus, mit Doppel-Tap.
- **Münzen:** Wurden sie vor dem Freeze gutgeschrieben? Nach dem Neustart
  genau einmal vorhanden? (Testkonto, keine echten Schülerdaten.)

### Suchrichtungen (Hypothesen, keine belegten Ursachen)

- Celebration-/Coin-Animation, die nie endet oder den Layer nicht freigibt.
- Scroll-/Fokus-Sperre, die nach dem Einsammeln nicht gelöst wird.
- Hängender RPC oder Retry-Schleife.
- Doppel-Tap/Race zwischen zwei Collect-Aufrufen.

### Abnahme

- [ ] Collect funktioniert auf 380 × 839 ohne Freeze.
- [ ] Seite bleibt bedienbar; Schließen und Scrollen gehen danach.
- [ ] Münzen genau einmal gutgeschrieben.
- [ ] Keine Konsolenfehler, keine hängenden Timer/Promises.
- [ ] Mit reduzierter Bewegung und auf einem echten Mobilgerät geprüft.

## 2. BUG-003 – Ansicht zu groß für Smartphones

### Nachstellen

1. Learnpass auf 360 × 800, 380 × 839 und 430 × 932 px öffnen.
2. Kartenreihe, Kopfzeile (X, „38 days left“), unteren Bereich
   („0 chests waiting“) ansehen.
3. Prüfen: Sind die Tier-Karten erreichbar? Gibt es horizontales Scrollen
   der ganzen Seite?

### Prüfen

- Breite/Höhe des Learnpass-Containers, `min-width`, `max-width`,
  `overflow`.
- Karten-Rail: seitliches Padding, `scroll-snap`, `overflow-x`,
  `touch-action`.
- Kopfzeile: Warum sitzt der X-Knopf neben der Münzzahl statt am Rand?
- UI-Zoom `--ui` und Safe-Area (`env(safe-area-inset-*)`).
- Ob der untere Bereich durch eine feste Höhe abgeschnitten wird.

### Abnahme

- [ ] Nichts ragt aus dem Viewport (360/380/430 px).
- [ ] Alle Tiers erreichbar; Rail scrollt horizontal mit Rand.
- [ ] X-Knopf oben rechts sichtbar und bedienbar.
- [ ] Unterer Bereich vollständig erreichbar.
- [ ] Kein horizontales Scrollen der ganzen Seite.
- [ ] Screenshot `bilder/BUG-003_02.png`.

## 3. BUG-004 – Scrollen im Learnpass ruckelt

### Nachstellen

1. Learnpass öffnen.
2. **Im Learnpass selbst** (nicht auf der Dorf-Seite dahinter) langsam
   vertikal scrollen.
3. Auf der Kartenreihe horizontal ziehen.
4. Mit `prefers-reduced-motion` wiederholen.

### Prüfen

- Welche Container **im Learnpass** scrollen? Gibt es verschachtelte
  Scrollbereiche?
- `touch-action`, `overscroll-behavior`, `scroll-snap`.
- Schwere Effekte während des Scrollens (Blur, Schatten, Animationen).
- Tritt das Ruckeln auch nach dem Fix von BUG-002/003 auf?

**Eigener Befund:** BUG-004 nicht als bloße Folge von BUG-003 abtun.
Nach dem Layout-Fix erneut prüfen; erst dann schließen, wenn das Scrollen
im Learnpass nachweislich flüssig ist.

### Abnahme

- [ ] Vertikales Scrollen im Learnpass flüssig, kein Springen.
- [ ] Kartenreihe scrollt nur horizontal.
- [ ] Keine hängenden Gesten/toten Zonen.
- [ ] Mit reduzierter Bewegung benutzbar.
- [ ] Screenshot/Video `bilder/BUG-004_02.png`.

## 4. Randbedingungen

- `CLAUDE.md`, `docs/SCOPE.md`, `docs/SPEC.md`, `docs/LOOK.md` lesen.
- Keine echten Schülerdaten; Testkonto/Spitznamen verwenden.
- Münzen/Besitz/Platzierungen nur über RPCs; keine direkten Tabellen-Writes.
- Keine Änderung an Rewards, Season-Fortschritt oder Quest-Logik.
- Kein Service-Key in Client/Repo/Log.
- Optik nicht schlechter als der Prototyp; Halloween-Optik erhalten.
- Keine neuen Abhängigkeiten.
- Kleine, prüfbare Schritte; nichts Unbeteiligtes umbauen.
- Wenn der Freeze nicht reproduzierbar ist: Versuche dokumentieren und
  rückfragen, **nicht** auf Verdacht schließen.
- **Live-Betrieb:** keine DB-Resets, keine Migration, keine manuellen
  Münz-/Besitz-Korrekturen. Der Fix ist clientseitig. Wenn eine
  Datenänderung nötig erscheint: stoppen und die Lehrkraft fragen.

## 5. Test und Abnahme

```bash
cd web
npm test
npm run build
```

Manuell (jeweils Screenshot):

| Breite × Höhe | Prüfen |
|---|---|
| 360 × 800 | kein Überlauf, Collect ohne Freeze, Scrollen im Learnpass |
| 380 × 839 | wie Screenshot; Kopfzeile und X frei |
| 430 × 932 | Karten und unterer Bereich erreichbar |
| 1280 × 800 | Learnpass weiterhin korrekt (Regression) |

Zusätzlich:

- [ ] Ein echtes Mobilgerät (oder Emulation mit Touch) getestet.
- [ ] `prefers-reduced-motion` getestet.
- [ ] Vor/nach jedem Fix ein Screenshot.
- [ ] Keine neuen Konsolenfehler.

## 6. Abschluss

1. In `BUGS.md` die Status auf **„Fix da“** setzen und pro Bug eine kurze
   Änderungsnotiz ergänzen (Datei, Ursache, Fix, Testergebnis).
2. Screenshots als `bilder/BUG-003_02.png` und `bilder/BUG-004_02.png`
   ablegen und verlinken.
3. Nur die betroffenen Dateien committen; keine unrelated Formatierungen.
4. Wenn BUG-004 durch den Fix von BUG-002/003 entfällt: das ausdrücklich
   in `BUGS.md` notieren.
