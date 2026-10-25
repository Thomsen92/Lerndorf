# Sir Byte – Maskottchen im Lerndorf – Design

**Stand:** 25.10.2026 · **Status:** Vom Auftraggeber zur selbständigen Umsetzung freigegeben und lokal umgesetzt. 814 Tests, Build und ESLint bestanden; Browserabläufe und 36 Galeriebilder geprüft. Veröffentlichung und Abnahme auf dem Schul-Tablet (PLAN B.7) stehen aus. Umsetzungsplan: `docs/superpowers/plans/2026-10-25-sir-byte-mascot.md`.

## Abgleich mit der Umsetzung

- `createCompanion` in `mascot/mascotStage.ts` verbindet das kleine 3D-Fenster mit den Quest-Reaktionen; separate öffentliche `MascotStage`-/`QuestMascot`-Hüllen sind dadurch nicht nötig. Die Lernlogik und alle Serverprüfungen bleiben in den vorhandenen Ansichten.
- Die Blasen haben eigene, lokal begrenzte Stile (`mascot/mascot.css` / `.byte-bubble`), damit die Schülerblasen und das übrige Dorf unverändert bleiben.
- Am Markt und im Tutorial wird **dieselbe Figur umgesetzt**; es gibt keine zweite gleichzeitig sichtbare Dorfkopie. Die Kameraposen passen sich an beide Figuren und das Bildschirmformat an (`render/tutorialFraming.ts`).
- Die neuen Begrüßungs- und Erklärsätze im Tutorial bleiben Text, da dafür keine passende Aufnahme existiert. „Ready when you are.“ wird als vorhandene Quest-Begrüßung verwendet. Es gibt keine künstliche Wartezeit auf eine Aufnahme; gesprochenes Englisch und angezeigter Satz stimmen immer überein.
- Das Ersatzbild ist ein neu gerendertes 320-px-Porträt desselben Modells statt eines verkleinerten Screenshots der gesamten Prototyp-Seite. Export: `web/scripts/byte-preview.mjs`.
- Ein Tagesziel bei gleichzeitigem Level-Aufstieg zeigt die Überraschung vor der Level-Feier; die Feier hat Vorrang vor einer zusätzlichen Abschlussfolge. Auch nach einem Wechsel zu „Anhören“ oder einer neueren Reaktion darf keine alte Abschlusszeile nachlaufen.
- Galerie-Messung ohne Sir-Byte-Schatten (Qualität „Niedrig“): 19 zusätzliche Draw Calls / 25 594 sichtbare Dreiecke in Ruhe, 23 / 26 546 während der Gehstock-Geste, identisch auf allen drei Karten. Das vollständige Modell umfasst 24 Meshes / 26 930 Dreiecke. Gesamtbudget und echte Tablet-Bildrate bleiben gesonderte Abnahmepunkte.

## 1. Ziel

Sir Byte ist der englische Roboter-Butler mit Melone, Fliege und schwebendem Gehstock aus dem eigenen Prototyp (Repo `Thomsen92/Sir-Byte`, Demo https://thomsen92.github.io/Sir-Byte/). Im Lerndorf wird er das **Maskottchen, das den Schüler begleitet**: Er begrüßt neue Schüler, führt durch das Tutorial, fiebert bei den Daily Quests mit und wartet am Marktplatz neben der Aufgabentafel. Er macht das Spiel persönlicher und lustiger und bringt nebenbei Englisch ins Spiel, weil er nur Englisch spricht.

## 2. Vorgaben des Auftraggebers (25.10.2026)

1. **Tutorial:** Sir Byte begrüßt den Schüler und begleitet ihn mit Sprechblasen durch das Tutorial.
2. **Aufgaben:** Er macht bei den Daily Quests mit und reagiert auf richtige und falsche Antworten.
3. **Marktplatz:** Er steht auf dem Marktplatz neben der **bestehenden** Aufgabentafel.
4. **Sprache:** Seine Sprechblasen sind **nur Englisch**. Die übrige Oberfläche (Knöpfe, Fehlermeldungen, Rückmeldetexte) bleibt deutsch (CLAUDE.md).
5. **Stimme:** Nur die **vorhandenen Aufnahmen** werden verwendet, keine neuen. Sätze ohne Aufnahme erscheinen nur als Text.
6. **Bei den Aufgaben:** Er bekommt ein **eigenes kleines 3D-Fenster** in der Aufgaben-Ansicht.

## 3. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele:** Sir Byte wirkt lebendig (Augen, Blinzeln, Gesten, Stimme); jede Antwort bekommt sofort eine Reaktion von ihm; Neue fühlen sich vom ersten Moment an begrüßt; die Optik des Dorfs leidet nicht und die Bildrate auf dem ältesten Tablet bleibt bei ≥ 30 fps.

**Nicht-Ziele (jetzt nicht):** Freies Gespräch oder Chatbot (kein KI-Dienst, keine Kosten, kein Datenschutzrisiko), neue Sprachaufnahmen, Sir Byte im Lehrer-Bereich, Sir Byte läuft frei durchs Dorf, Sir Byte im Baumodus oder Shop.

**Anti-Ziele:**
- Sir Byte macht sich über Schüler lustig. Die frechen Aufnahmen „Oh dear. Not even close, old bean …“ und „Well, well. Even a broken clock …“ werden **nicht** verwendet. 13- bis 14-Jährige mit schwacher Lesekompetenz sollen ermutigt werden, nicht verspottet.
- Er nervt oder hält auf: Keine Pflichtpause, kein Text, den man wegklicken muss, um weiterzumachen (außer im Tutorial, wo „Weiter“ den Takt angibt). Keine Stimme beim Öffnen der Seite ohne vorherigen Tipp.
- Er verdeckt Aufgaben, Knöpfe oder das eigene Grundstück.
- Er kostet Leistung: Er darf das Dorf auf dem ältesten Tablet nicht unter 30 fps drücken.

## 4. Was es schon gibt (Sir-Byte-Repo, Stand `ea10e0c`)

- `sir-byte.mjs` → `createSirByte()` baut die Figur prozedural aus 24 Teilen (Meshes) und 26 930 Dreiecken (inklusive Gehstock), etwa 3,7 Einheiten hoch; mit three.js 0.170.0 am 25.10.2026 geprüft: baut und animiert ohne Änderung. Die Augen sind ein eigener Shader. Rückgabe: `{root, head, behavior, update, playCane, pointAtTask, makeExportModel, triangles}`.
- `behavior.mjs` → Zustände `idle`, `point`, `cheeky`, `celebrate`, `think`, `support`, `surprise`, `dry`, `smug`; `feedback(correct)` (erster Fehler `cheeky`, weitere `support`, richtig `celebrate` und Zähler zurück); `lookAt(x, y)`.
- `speech-motion.mjs` → Sprechbewegung nach Audiozeit und Lautstärke.
- `voice-clips.mjs` + `audio/*.mp3` → 8 ElevenLabs-Aufnahmen; jede Aufnahme hat ihren festen Satz (`EXPRESSIONS[state].line`).
- `pointAtTask(weltposition)` → Zeigepose mit Gehstock auf einen Punkt in der Welt; endet mit jeder anderen Reaktion.
- Eingebaute seltene Gehstock-Geste in Ruhe (nach 9 s); „Weniger Bewegung“ schaltet Körpergesten ab.
- three.js **0.180** im Prototyp; das Lerndorf ist auf **0.170.0** festgelegt.

## 5. Ansätze für die Übernahme (Entscheidung Claude)

| Ansatz | Kurz | Vor- und Nachteile |
| --- | --- | --- |
| **A – Kopie mit Herkunftsvermerk (gewählt)** | Die vier Module unverändert nach `web/src/mascot/vendor/` kopieren (mit Commit-Stand im Kopfkommentar), dazu Typen (`.d.mts`) und eine Lerndorf-Hülle `mascot/sirByte.ts`; Aufnahmen nach `web/public/assets/sir-byte/` | Läuft mit dem gepinnten three.js 0.170, keine neue Abhängigkeit, das Repo bleibt Werkstatt; ein Update ist eine neue Kopie plus Test |
| B – Als npm-Abhängigkeit aus GitHub | `"sir-byte": "github:Thomsen92/Sir-Byte#…"` | Bringt three 0.180 als zweite Version mit (Konflikt mit dem Pin), Repo hat kein Paketformat |
| C – Neu in TypeScript schreiben | Figur im Lerndorf neu bauen | Doppelte Arbeit, Abweichung vom Prototyp, Augen-Shader neu |

Die Hülle `sirByte.ts` ist der einzige Ort, der die Kopie benutzt. Sie ergänzt: Leistungsstufe (bei „Niedrig“ statt `MeshPhysicalMaterial` einfache `MeshStandardMaterial`, keine Schatten), Ton über den Lerndorf-Schalter, Sprechblase, Abspielen der Aufnahmen mit Sprechbewegung und eine Liste der erlaubten Reaktionen (ohne `dry`, `smug`).

## 6. Stimme und Sätze

**Verwendete Aufnahmen** (Satz = genau der Text in der Blase, während sie läuft):

| Reaktion | Datei | Satz |
|---|---|---|
| `idle` | `ready.mp3` | Ready when you are. |
| `celebrate` | `splendid.mp3` | Splendid! Nicely done. |
| `cheeky` | `nearly.mp3` | Nearly. Have another go! |
| `support` | `support.mp3` | Take your time. You've got this. |
| `think` | `thinking.mp3` | Hmm. Let me think. |
| `surprise` | `surprised.mp3` | Oh! Rather impressive. |

Nicht verwendet: `oh-dear.mp3`, `broken-clock.mp3` (Anti-Ziel), `sir-byte-splendid.mp3` (14 s, zu lang).

**Text-Sätze ohne Stimme** (Entscheidung Claude; einfaches Englisch A1/A2, kurze Sätze, je Blase höchstens 2 Sätze). Alle Texte stehen in einer Datei `web/src/mascot/lines.ts`, damit sie leicht zu ändern sind:

| Schlüssel | Text |
|---|---|
| `hello` | Hello! I'm Sir Byte. |
| `welcome` | Welcome to Lerndorf, your class village! |
| `toHouse` | Let's go to your house! |
| `ruin` | Oh no, your house is a ruin! Let's fix it. |
| `quests` | Every day there are Daily Quests. They are short English tasks. |
| `coins` | Right answers give you coins. You can buy things for your house. |
| `quiz` | Answer five easy questions. Then you get coins for a new house. |
| `buy` | Well done! Now buy the new house. |
| `place` | Put your new house here. |
| `final` | Now let's do your Daily Quests! |
| `board` | Your Daily Quests are on this board! |
| `allDone` | That's all for today. See you tomorrow! |
| `allDoneMarket` | You did all your quests today. Splendid! |
| `catchUp` | You can still do yesterday's quests. |

**Abspielregeln:** Stimme nur nach einem Tipp oder Klick in derselben Sitzung (Browser-Regel), nur wenn „Töne: an“ (Schalter aus dem Bau-Feedback, `ui/sound.ts`), nie zwei Stimmen gleichzeitig (eine neue Reaktion beendet die laufende Stimme). Die Lautstärke ist etwas lauter als die Effekt-Töne (Stimme 0,8, Effekte 0,35). Ist Ton aus oder nicht verfügbar, erscheint derselbe Satz als Text und die Sprechbewegung läuft über die Zeit weiter.

## 7. Sprechblase

- Comic-Blase wie im Tutorial (`ui/speechBubble.ts`, Comic Neue) mit eigener Variante `speech-bubble--byte` (Farbe von Sir Bytes Display-Türkis, oben klein „SIR BYTE“). Die Spitze zeigt auf seinen Kopf: im Dorf über die projizierte Kopfposition, im kleinen Fenster an der Fensterkante.
- Text immer mit `textContent`; `role="status"`, damit Screenreader ihn vorlesen.
- Eine Blase mit Stimme bleibt so lange wie die Aufnahme plus 1,5 s; ohne Stimme 2,5 s + 0,06 s je Zeichen (höchstens 8 s); im Tutorial bleibt sie stehen, bis „Weiter“ getippt wird.
- Die Blase verdeckt keine Bedienelemente: im kleinen Fenster liegt sie im Fenster selbst, im Dorf wird sie aus dem Bereich von Navigation und Avatar-Feld herausgeschoben.

## 8. Orte und Abläufe

### 8.1 Marktplatz (Dauerplatz)
- Sir Byte schwebt **links neben der Aufgabentafel** (vom Platz aus gesehen), etwa 1 m über dem Boden, dem Platz zugewandt; Größe so, dass er etwa so hoch wie eine Schülerfigur wirkt (Kopf auf Augenhöhe der Figuren). Die genaue Lage wird aus `layout.board` und der Drehung der Tafel berechnet und in der Galerie geprüft (`npm run galerie`).
- Ruhe: blinzelt, schaut zur Kamera, wenn sie näher als 25 m ist, sonst über den Platz; die eingebaute Gehstock-Geste läuft selten.
- **Antippen von Sir Byte:**
  - Heutige Quests offen → zeigt mit dem Stock auf die Tafel (`pointAtTask`) und Blase `board`; ein zweites Antippen innerhalb dieser Pose öffnet die Daily Quests (wie Tafel antippen).
  - Alle heutigen Quests gelöst → `celebrate` mit Stimme und danach Blase `allDoneMarket`.
  - Nur Nachholen offen → Blase `catchUp` und Zeigen auf die Tafel.
  - Tippen ist nie die einzige Möglichkeit: Die Tafel und der Knopf „Aufgaben“ öffnen die Quests wie bisher.
- **Leistung:** Ist die Kamera weiter als 60 m entfernt oder Sir Byte außerhalb des Bildes, wird er nicht aktualisiert (keine Animation, keine Shaderzeit) und bei über 90 m ausgeblendet. Qualität „Niedrig“: einfache Materialien, kein Schattenwurf.

### 8.2 Tutorial
Ablauf mit Sir Byte (der bestehende Ablauf bleibt, Sir Byte kommt dazu und ersetzt die Erzählkarten):

1. Figurenwahl (unverändert).
2. Die Kamerafahrt „Panorama → Marktplatz → Grundstück“ **hält am Marktplatz** vor Sir Byte. Er winkt (`surprise`-Pose ohne Ton), Blasen `hello` → `welcome` (je mit „Weiter“). Mit dem Tipp auf „Weiter“ ist der Ton freigeschaltet; dann `idle` mit Stimme „Ready when you are.“ und Blase `toHouse`.
3. Sir Byte verschwindet mit dem Gehstock-„Plopp“ und erscheint am Grundstück neben dem Tor wieder (Tutorial-Kopie der Figur am Grundstück; am Marktplatz ist er so lange ausgeblendet). Die Kamera fährt weiter zum Grundstück.
4. Die eigene Figur zeigt wie bisher ihre traurige Blase („Oh nein, mein Haus ist eine Ruine!“, deutsch, weil es der Schüler selbst sagt). Danach Sir Byte: `ruin`, `quests`, `coins` (ersetzen die bisherigen Erzählkarten `MESSAGES`), je mit „Weiter“.
5. Quiz: Das Quiz-Fenster bekommt das kleine Sir-Byte-Fenster (§8.3). Blase `quiz` zu Beginn; Reaktionen auf Antworten wie in §8.3.
6. Kaufen: Blase `buy` neben dem Kauf-Dialog (Sir Byte am Grundstück).
7. Hinstellen: Sir Byte zeigt mit dem Stock auf den Haus-Sockel (`pointAtTask` mit der Weltposition des Sockels) und sagt `place`.
8. Haus steht: `celebrate` mit Stimme „Splendid! Nicely done.“, dann tanzt die Figur wie bisher. Sir Byte sagt `final` (ersetzt `FINAL_TEXT`).
9. Ende: Sir Byte am Grundstück verschwindet mit „Plopp“ und steht wieder am Marktplatz; die Daily Quests öffnen sich wie bisher.

Bei Abbruch (Abmelden) oder Fortsetzen nach Neuladen beginnt Sir Byte an der Stelle des Server-Schritts: Schritt `quiz`, `buy`, `place` → er steht schon am Grundstück, ohne Begrüßung.

### 8.3 Daily Quests (und Tutorial-Quiz): kleines Fenster
- Ein kleines 3D-Fenster (eigener Renderer, quadratisch, im Querformat links neben der Aufgabenliste etwa 220 px, im Hochformat über der Liste etwa 160 px hoch und rechtsbündig) zeigt Sir Byte von vorn mit Melone. Die Blase liegt im Fenster daneben.
- Solange das Fenster offen ist, zeichnet das Dorf nicht (wie bisher bei offenen Bereichen); es gibt also nie zwei aktive 3D-Szenen. Das Fenster wird beim Schließen vollständig freigegeben.
- **Öffnen:** einmal pro Tag `idle` mit Stimme „Ready when you are.“; sonst still. Er schaut zur aufgeklappten Quest.
- **Absenden:** während der Server prüft → `think` ohne Stimme (Pose und Augen).
- **Falsch:** erster Fehler bei dieser Quest → `cheeky` mit Stimme; jeder weitere Fehler → `support` mit Stimme. Die deutsche Rückmeldung („Leider falsch. Tipp: …“) bleibt unverändert unter der Aufgabe.
- **Richtig:** `celebrate` mit Stimme (Siegespose mit Gehstock). War es die letzte heutige Quest → danach `surprise` mit Stimme und Blase `allDone`.
- Der Fehlerzähler gilt je Quest und beginnt bei einer anderen Quest neu (eigene Zählung in der Hülle, nicht der globale Zähler aus `behavior.mjs`).
- Bei reduzierter Bewegung: keine Körpergesten, Augen und Blinzeln bleiben, Blasen und Stimme bleiben.
- WebGL nicht verfügbar: Fenster zeigt das Standbild `preview.png` (aus dem Repo, verkleinert) und die Blasen funktionieren weiter.

### 8.4 Zusammenspiel mit XP und Level (falls umgesetzt)
Wenn das XP-Paket (`2026-10-24-xp-level-design.md`) vorhanden ist: Bei einem Level-Aufstieg in den Daily Quests macht Sir Byte `surprise` mit Stimme, bevor die Level-Feier erscheint. Sonst keine Abhängigkeit.

## 9. Technik (Entscheidung Claude)

- **Dateien:** `web/src/mascot/vendor/sir-byte.mjs`, `behavior.mjs`, `speech-motion.mjs`, `voice-clips.mjs` (Kopie, Kopfkommentar „Quelle: github.com/Thomsen92/Sir-Byte @ ea10e0c, unverändert bis auf Importpfade“), dazu `*.d.mts` mit den Typen; `mascot/sirByte.ts` (Hülle), `mascot/voice.ts` (Aufnahmen über Web Audio mit Analyser für `speechLevel`), `mascot/lines.ts`, `mascot/mascotStage.ts` (kleines Fenster), `mascot/marketByte.ts` (Platz am Markt, Antippen, Entfernungs-Logik).
- **Aufnahmen:** die 6 verwendeten MP3 nach `web/public/assets/sir-byte/voice/`, erst beim ersten Bedarf geladen (zusammen etwa 370 KB). Das GLB wird nicht gebraucht.
- **three.js:** Die Kopie läuft mit 0.170.0; ein Test baut die Figur in Node und prüft Teile, Dreiecke (26 000–28 000) und dass `update()` ohne Fehler läuft.
- **Licht:** Im Dorf gilt das Dorflicht (LOOK.md); im kleinen Fenster ein eigenes, weiches Licht wie in der Vorschau von `render/itemPreview.ts`. Kein Bloom, keine Umgebungskarte. Die Optik wird mit dem Soll-Bild verglichen (CLAUDE.md: nie schlechter als der Prototyp).
- **Leistungsbudget:** Sir Byte am Markt höchstens 24 Draw Calls (Gehstock nur sichtbar, wenn er gebraucht wird) und 27 000 Dreiecke (SPEC §16: gesamt < 150 Draw Calls, < 150 000 Dreiecke); in Qualität „Niedrig“ ohne Schatten und mit einfachen Materialien. Messung mit Qualität „Auto“ in der Galerie und auf dem Tablet.
- **Tippen:** Sir Byte bekommt `userData.kind = 'byte'` auf allen Teilen; `villageView` erkennt den Treffer wie bei der Tafel.
- **Keine Daten im Server:** keine Migration, keine RPC, kein Tracking. „Begrüßung heute schon gehört“ steht nur in `localStorage` (mit try/catch; fehlt es, gibt es die Begrüßung eben noch einmal).
- **Lizenz:** Figur, Code und Stimme sind eigene Werke des Auftraggebers (Stimme erzeugt mit ElevenLabs); Eintrag in `blender/sources/LICENSES.md` als „eigenes Werk, Repo Thomsen92/Sir-Byte“.

## 10. Fehler- und Randfälle

- Aufnahme lädt nicht oder Ton aus → Text-Blase mit demselben Satz, Bewegung zeitgesteuert, kein Fehlerdialog.
- Hören-Aufgabe (`listening`, Vorlesen per Systemstimme) → Sir Byte schweigt, solange vorgelesen wird; eine laufende Sir-Byte-Stimme stoppt beim Tipp auf „▶ Anhören“.
- Schnelles Antworten hintereinander → die neue Reaktion unterbricht die alte (Stimme stoppt, neue startet), nie zwei Stimmen.
- Aufgaben-Fenster schließen, während Sir Byte spricht → Stimme stoppt sofort, Renderer wird freigegeben.
- Abmelden mitten im Tutorial → alle Blasen weg, Sir Byte am Markt sichtbar, Tutorial-Kopie entfernt.
- Kein eigenes Grundstück (Lehrkonto, Fehler) → Sir Byte nur am Markt.
- Lehrkonto in den Daily Quests (keine Quests lösbar) → kein Sir-Byte-Fenster.
- Kontext verloren (WebGL) im kleinen Fenster → Standbild wie in §8.3.

## 11. Abnahme

1. Beim ersten Login begrüßt Sir Byte am Marktplatz auf Englisch, die Stimme ist nach dem ersten Tipp zu hören, er begleitet das ganze Tutorial mit Blasen, zeigt auf den Haus-Sockel und freut sich, wenn das Haus steht.
2. In den Daily Quests sitzt er im kleinen Fenster: erster Fehler „Nearly. Have another go!“, weitere „Take your time. You've got this.“, richtig „Splendid! Nicely done.“, alle drei geschafft „Oh! Rather impressive.“.
3. Am Marktplatz schwebt er neben der Tafel; Antippen lässt ihn auf die Tafel zeigen.
4. Keine frechen Sprüche, keine Stimme ohne vorherigen Tipp, Ton-Schalter wirkt, reduzierte Bewegung wird beachtet.
5. Dorf auf dem ältesten Tablet weiterhin ≥ 30 fps mit Qualität „Auto“; Galerie-Bilder nicht schlechter als vorher.

## 12. Offen (mit Standardwert umsetzen)

| # | Frage | Standard |
|---|---|---|
| 1 | Texte der Blasen | §6, in `mascot/lines.ts` änderbar |
| 2 | Platz und Größe am Markt | links neben der Tafel, Figurenhöhe; Feinjustierung nach Galerie |
| 3 | Später neue Aufnahmen | Satz in `lines.ts` bekommt dann eine Datei; die Hülle unterstützt Text mit und ohne Aufnahme schon |
| 4 | Sir Byte in Shop, Bauen, Profil | später |
