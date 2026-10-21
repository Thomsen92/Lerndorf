# Bau-Feedback für Lerndorf – Design

**Stand:** 21.10.2026 · **Status:** vom Auftraggeber beauftragt, Umsetzungsplan steht aus.

## Ziel
Bauen soll auf dem Tablet leicht zu bedienen sein und sich befriedigend anfühlen – mit minimalem Aufwand, ohne neue Dateien oder kostenpflichtige Dienste.

## 1. Bauplätze besser hervorheben
- Freie Plätze: pulsierende Umrandung (sanft, 1,5 s) plus schwebendes Symbol über dem Platz (🏠 Haus, 🚗 Auto, 🌷 Deko). Belegte Plätze: ruhige Umrandung.
- Gewählter Platz: kräftige Farbe **und** dickerer Rahmen (nicht nur Farbe).
- Tippfläche großzügig: der ganze Platz plus ca. 0,5 m Rand zählt.
- `prefers-reduced-motion`: kein Pulsieren, nur Rahmen.

## 2. Großes Platz-Menü (tabletgerecht)
- Tipp auf einen Platz (3D oder Platzliste) öffnet ein großes Bodenblatt (Hochformat unten, Querformat rechts, ca. 40 % der Fläche).
- Kopf: Platzname + aktueller Inhalt. Darunter **nur passende eigene Gegenstände** als große Karten mit Vorschaubild (≥ 96 px, Tippziel ≥ 64 px), Anzahl frei.
- Antippen einer Karte = Vorschau am Platz (bestehender Ablauf). Große Knöpfe: **Aufstellen**, **Drehen** (nur Deko), **Wegräumen**, **Zurück**.
- Leerer Zustand: „Du hast dafür noch nichts.“ + Knopf **Zum Shop**.
- Alles per Tastatur bedienbar, Dialog-Regeln wie im Tablet-UI-Spec.

## 3. Aufstellen-Effekt (erst nach Server-Bestätigung)
- Animation ca. 0,6 s: Gegenstand „ploppt“ – Skalierung 0 → 1,15 → 1 mit leichtem Hüpfen (Ease-out-back).
- Rauchwölkchen: 6–8 weiche, helle Low-Poly-Kugeln am Boden, wachsen und verblassen in 0,5 s (eine Geometrie, ein Material, wiederverwendet).
- Ton: kurzes „Plopp“ + helles „Ding“, per Web Audio API erzeugt (keine Audiodatei).

## 4. Wegräumen-Effekt
- Gegenstand schrumpft in 0,4 s mit kleiner Drehung, dazu dieselbe Rauchwolke (kleiner) und ein tiefes „Puff“.

## 5. Regeln
- Effekte nur lokal und nur nach erfolgreichem RPC (`place_in_slot` / `clear_slot`); bei Fehler kein Effekt.
- Ton nur nach Nutzeraktion (Browser-Autoplay), Lautstärke leise; Schalter **Töne an/aus** in den Einstellungen (Standard an, gemerkt in localStorage, mit try/catch).
- `prefers-reduced-motion`: keine Hüpf-/Schrumpf-Animation, nur kurzes Einblenden; Rauch entfällt.
- Leistung: Partikel ≤ 8, keine neuen Texturen, keine Draw-Call-Spitzen; Effekt-Code in `render/buildFx.ts`, Töne in `ui/sound.ts`.
- **Effekte nur für die bauende Person:** Animation, Rauch, Ton und Platz-Hervorhebung werden ausschließlich auf dem Gerät des Schülers gerendert, der gerade baut. Nichts davon wird gespeichert oder übertragen (kein Realtime-Event, keine Tabelle). Mitschüler sehen beim nächsten Laden nur das fertige Ergebnis.

## Abnahme
1. Freie Plätze sind auf dem Tablet sofort erkennbar, auch ohne Farbsehen.
2. Ein Tipp auf einen Platz öffnet das große Menü mit nur passenden Gegenständen.
3. Aufstellen zeigt Plopp-Animation, Rauch und Ton; Wegräumen Schrumpfen, Rauch und Ton.
4. Bei Serverfehler kein Effekt; Töne abschaltbar; reduzierte Bewegung wird beachtet.
5. Effekte erscheinen nur beim bauenden Schüler; auf anderen Geräten nie.
