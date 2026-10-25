# Bau-Feedback für Lerndorf – Design

**Stand:** 25.10.2026 · **Status:** Umgesetzt laut Plan 2026-10-24; Abnahme durch die Lehrkraft (B.9) steht aus. Umsetzungsplan `docs/superpowers/plans/2026-10-24-build-feedback.md`. §6 geht §1–§5 vor.

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

## 6. Präzisierungen für die Umsetzung (24.10.2026)
1. **Kenney-Effekte statt selbst erzeugter Töne und Kugeln** (Wunsch Auftraggeber 24.10.2026). Quelle `Kenny/Effects` (CC0): Töne aus *Interface Sounds* und *Impact Sounds*, Rauch aus *Smoke Particles* („White puff“). Die Töne werden einmalig nach MP3 umgewandelt (ältere iPads spielen kein OGG ab), der Rauch auf 128 × 128 px verkleinert; beides liegt in `web/public/assets/kenney/fx/` und steht in `blender/sources/LICENSES.md`. Das ersetzt „Low-Poly-Kugeln“ (§3, §4), „per Web Audio API erzeugt (keine Audiodatei)“ (§3) und „keine neuen Texturen“ (§5): Es gibt genau eine kleine Rauch-Textur.
2. **Tonzuordnung** (Standard, an einer Stelle austauschbar): Aufstellen = `drop_002` („Plopp“) und 0,12 s später `confirmation_001` („Ding“); Wegräumen = `impactSoft_heavy_000` („Puff“); nur gedreht (gleicher Gegenstand) = nur „Ding“. Die Lehrkraft hört bei der Abnahme rein.
3. **Platz-Menü:** Ohne gewählten Platz bleibt die kompakte Leiste mit den sieben Plätzen und „Fertig“. Ein gewählter Platz macht daraus das große Blatt. Das Blatt ist *kein* modaler Dialog: Die Vorschau im Dorf muss sichtbar und ein anderer Platz antippbar bleiben. Beim Öffnen springt der Fokus auf die Überschrift, Escape wirkt wie „Zurück“, danach liegt der Fokus auf dem Platz-Knopf. „Aufstellen“ ersetzt „Speichern“, „Zurück“ ersetzt „Abbrechen“ und verwirft die Vorschau. Solange das Blatt offen ist, rückt die Kamera das Grundstück in den freien Teil des Bildschirms.
4. **Leerer Zustand** einheitlich „Du hast dafür noch nichts.“ (auch beim Auto) mit Knopf „Zum Shop“.
5. **Tutorial:** Das erste Haus im Tutorial bekommt denselben Aufstellen-Effekt (nach Bestätigung durch `tutorial_place_house`). Die Tutorial-Leiste selbst bleibt kompakt.
6. **Reduzierte Bewegung:** Der Gegenstand erscheint bzw. verschwindet sofort (kein Einblenden, weil die Materialien geteilt sind), kein Rauch, kein Pulsieren. Töne bleiben (abschaltbar).
7. **Tippfläche:** Ein Tipp genau auf einen Platz gilt immer. Ein Tipp daneben zählt bis 0,5 m für den nächstgelegenen Platz (manche Plätze grenzen direkt aneinander).
8. **Freier Platz** = leer oder Ruine im Haus-Platz.
