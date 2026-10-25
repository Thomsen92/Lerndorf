# XP, Level, Truhen und Profil für Lerndorf – Design

**Stand:** 24.10.2026 · **Status:** Grundrichtung vom Auftraggeber vorgegeben (Antworten 24.10.2026, siehe §2); Details „Entscheidung Claude“ (freie Hand), Prüfung durch den Auftraggeber steht aus. Umsetzungsplan: `docs/superpowers/plans/2026-10-24-xp-level.md`.

## 1. Ziel

Lerndorf soll sich wie ein motivierendes Handygame anfühlen: Jede richtige Englisch-Aufgabe gibt sofort sichtbaren Fortschritt, regelmäßig gibt es kleine Höhepunkte (Level-Aufstieg, Truhe, neuer Titel, neuer Rahmen), und wer dranbleibt, sieht seine Serie wachsen. Münzen bleiben die Währung zum Gestalten; **XP und Level sind der Fortschritt**, der nie verloren geht.

Der positive Kreislauf:

```
Quest lösen → +XP (fliegt in die Avatar-Anzeige, Balken füllt sich)
   → Level-Aufstieg → Feier + Truhe (Münzen) + evtl. neuer Titel/Rahmen
   → Münzen → Shop/Bauen → schöneres Grundstück, sichtbares Level im Dorf
   → morgen wiederkommen (Serie 🔥, Tagesziel) → Quest lösen …
```

## 2. Vorgaben des Auftraggebers (24.10.2026)

1. **Level sichtbar, keine Rangliste.** Mitschüler sehen das Level (am Namensschild), es gibt keine Bestenliste und keinen Vergleich von XP- oder Münzständen.
2. **Belohnungen beim Level-Aufstieg:** zunächst nur **Belohnungstruhen**, **freischaltbare Titel** (an das Level gebunden, der Schüler wählt seinen Titel selbst) und **verschiedenfarbige Rahmen** für das Avatar-Feld. Das Avatar-Feld führt zu einer neuen **Profilseite**.
3. **XP nur automatisch** (Quests, Stempel, Serien, Bauen), keine XP-Vergabe durch die Lehrkraft, kein zusätzlicher Aufwand.
4. **Serie mit Schutz:** zählt nur Schultage Mo–Fr, Ferien pausieren, ein Schutzschild pro Woche rettet einen verpassten Tag.

## 3. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele:** schnelle erste Erfolge (Level 2 schon im Tutorial, Level 5 in der ersten Woche); danach etwa ein Level pro Woche für fleißige Schüler; jede Sitzung endet mit einem sichtbaren Plus; schwächere Schüler kommen auch voran.

**Nicht-Ziele (jetzt nicht):** Ranglisten, Klassen-Ziele, Abzeichen-Sammlung, Truhen mit Gegenständen, Push-Benachrichtigungen, XP durch die Lehrkraft, Profilseiten anderer Schüler.

**Anti-Ziele (wäre ein Fehlschlag, auch wenn es technisch läuft):**
- XP gehen verloren oder werden abgezogen. Es gibt nur Zuwachs.
- Schwache Schüler werden bloßgestellt (sichtbare Rangliste, „Serie verloren“-Schelte, rote Warnungen).
- Druck am Wochenende oder in den Ferien.
- XP lassen sich erschummeln (Raten, Wiederholen, Manipulation im Browser).
- Die Wirtschaft kippt (Truhen-Münzen entwerten den Shop).

## 4. Ansätze (Entscheidung Claude)

| Ansatz | Kurz | Vor- und Nachteile |
| --- | --- | --- |
| **A – XP-Buchungen auf dem Server (gewählt)** | Eigene Tabelle `xp_ledger` wie `coin_ledger`; bestehende RPCs rufen eine interne Funktion `grant_xp` in derselben Transaktion auf | Manipulationssicher, nachvollziehbar, Level-Aufstieg und Truhe entstehen atomar mit der Buchung; etwas mehr SQL |
| B – XP im Browser aus vorhandenen Daten berechnen | Level aus gelösten Quests und Stempeln ableiten, nichts Neues speichern | Wenig Aufwand, aber Truhen, Serien-Schutz und „schon gesehen“ brauchen trotzdem Speicher; manipulierbar; Mitschüler bräuchten fremde Ergebnisdaten |
| C – Ereignis-Tabelle mit Triggern | Jede Buchung schreibt ein Ereignis, Trigger rechnen XP | Entkoppelt, aber versteckte Logik, schwer zu testen, Reihenfolge-Probleme |

A passt zur bestehenden Regel „Münzen, Besitz, Platzierungen ändern sich nur über RPC“ (CLAUDE.md) und zum Muster von `coin_ledger`.

## 5. XP-Quellen (Entscheidung Claude, Werte in einer SQL-Funktion `xp_rule(text)` änderbar)

| Quelle | XP | Regel |
| --- | --- | --- |
| Daily Quest richtig, 1. Versuch | 15 | einmal je Quest und Schüler |
| Daily Quest richtig, 2.–3. Versuch | 10 | |
| Daily Quest richtig, ab 4. Versuch | 5 | auch ohne Münzen: Dranbleiben zählt |
| Nachholen (gestrige Quest) | Hälfte, aufgerundet | wie bei den Münzen |
| Tagesziel: alle 3 heutigen Quests gelöst | 15 | einmal pro Tag |
| Serien-Tag (§7) | 5 × min(Serie, 5) | also 5, 10, … höchstens 25 pro Schultag |
| Stempel (vollständiger Wochenplan) | 100 | zusammen mit der Münzbuchung in `add_stamps` |
| Tutorial abgeschlossen | 50 | einmal; reicht genau für Level 2 |
| Gegenstand zum ersten Mal aufgestellt | 10 | einmal je Gegenstands-Id (nicht je Platzierung, kein Hin- und Herstellen) |

Falsche Antworten geben keine XP. Jede Buchung hat einen eindeutigen Bezug (`reason` + `ref`), doppelte Aufrufe buchen nicht doppelt.

## 6. Level-Kurve und Truhen

**Kurve (Entscheidung Claude):** Von Level n nach n+1 braucht man `50 + 25·(n−1)` XP. Gesamt-XP für ein Level:

| Level | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| XP gesamt | 50 | 125 | 225 | 350 | 500 | 875 | 1 350 | 2 975 | 5 225 | 8 100 | 11 600 |

Schätzung: Ein fleißiger Schüler (alle Quests, Serie, Stempel) sammelt etwa 500 XP pro Woche und erreicht Level 5 in Woche 1, Level 10 in Woche 3, Level 20 nach etwa 10 Wochen, Level 30 nach etwa einem halben Jahr. Ein durchschnittlicher Schüler (etwa die Hälfte, Stempel) sammelt etwa 250 XP und kommt zum Schuljahresende auf Level 20–25. Es gibt kein Höchstlevel; über 30 bringt jedes Level weiter eine Truhe.

**Truhen:**
- Jeder Level-Aufstieg gibt eine **Truhe**, jedes 5. Level eine **große Truhe**. Serien-Meilensteine (§7) geben ebenfalls eine große Truhe.
- Truhen bleiben ungeöffnet gespeichert, bis der Schüler sie öffnet (Profilseite oder direkt in der Level-Feier). Ein Punkt am Avatar-Feld zeigt ungeöffnete Truhen an.
- Inhalt v1: **nur Münzen**, gewürfelt auf dem Server beim Öffnen. Grundbetrag `20 + 5·Level` (große Truhe: ×3). Wurf: 70 % normal, 25 % doppelt („Super!“), 5 % dreifach („Jackpot!“). Beispiel Level 6: 50 / 100 / 150 Münzen.
- Wirtschaft: Bei etwa einem Level pro Woche kommen rund 60–100 Münzen pro Woche dazu, also etwa ein Viertel mehr als bisher. Die Shop-Preise bleiben vorerst gleich (offener Punkt §14).

## 7. Serie („Streak“)

- Ein **Serien-Tag** ist ein Schultag (Mo–Fr, Europe/Berlin), an dem der Schüler mindestens **eine heutige** Daily Quest richtig löst. Nachholen zählt für die Serie nicht, gibt aber XP.
- Tage ohne aktive Quests (Wochenende, Ferienwoche laut §9 D6 SPEC, fehlendes Paket) **zählen nicht und brechen nichts**. Am Wochenende gelöste Quests geben normal XP.
- **Schutzschild:** Jeden Montag gibt es 1 Schild (höchstens 1, er sammelt sich nicht an). Verpasst der Schüler einen Schultag, wird der Schild automatisch verbraucht und die Serie bleibt erhalten. Ohne Schild beginnt beim nächsten Serien-Tag eine neue Serie bei 1. Die beste Serie bleibt gespeichert.
- Die Serie wird auf dem Server beim Lösen nachgerechnet (fehlende Schultage seit dem letzten Serien-Tag zählen, Schild verwenden oder neu beginnen). Es gibt keinen nächtlichen Auftrag.
- **Meilensteine** 5, 10, 20, 30, 50, 75, 100 Serien-Tage: große Truhe.
- Ton: keine Schelte. Beginnt eine neue Serie, steht dort „Neue Serie: 1 Tag 🔥 – weiter so!“, nicht „Serie verloren“.

## 8. Titel und Rahmen

Beides wird mit dem Level freigeschaltet und auf der Profilseite selbst gewählt. Gesperrte Einträge sind sichtbar, mit Schloss und Text „ab Level 12“, damit es ein Ziel gibt. Katalog in der Tabelle `level_rewards` (ein Ort, Server und Browser lesen dasselbe). Die Titel sind englisch, weil Englisch das Fach ist; die Oberfläche bleibt deutsch.

**Titel (Entscheidung Claude):**

| Level | Titel |
|---|---|
| 1 | Newcomer |
| 3 | Word Collector |
| 5 | Quest Rookie |
| 7 | Busy Bee |
| 10 | Grammar Explorer |
| 12 | Verb Tamer |
| 15 | Vocab Hero |
| 18 | Storyteller |
| 20 | Village Star |
| 23 | English Wizard |
| 25 | Quest Master |
| 28 | Village Legend |
| 30 | Lerndorf Champion |

**Rahmen (um das Figurenbild, wählbar):** Holz (1), Bronze (5), Silber (10), Gold (15), Smaragd (20), Saphir (25), Regenbogen (30). Die Rahmen sind verzierte Ringe wie in Handyspielen (Ergänzung 25.10.2026, Vorbild: Bild des Auftraggebers): Holz schlicht mit Maserung, Bronze mit Nieten, Silber mit kleinen Zacken, Gold mit Krone oben, Smaragd und Saphir mit eingefassten Edelsteinen, Regenbogen schimmernd (bei reduzierter Bewegung stehend). Sie unterscheiden sich also durch Form und Verzierung, nicht nur durch die Farbe; ihr Name steht als Text dabei. Standard: Holz; nach dem Freischalten wechselt der Rahmen nicht von selbst, die Level-Feier bietet aber „Jetzt anlegen“ an.

**Level-Wappen (automatisch, nicht wählbar; Ergänzung 25.10.2026):** Ein Schild mit einem Band unten, darauf „Lv.<n>“. Die Stufe des Wappens folgt dem Level: Holz (1–4), Bronze (5–9), Silber (10–14), Gold (15–19), Smaragd (20–24), Saphir (25–29), Regenbogen (ab 30). Mit jeder Stufe wird es prächtiger: Holz einfacher Schild; Bronze mit Nieten; Silber mit kleinen Flügeln; Gold mit großen Flügeln und Zackenkrone; Smaragd und Saphir zusätzlich mit Edelstein in der Mitte; Regenbogen mit schimmerndem Verlauf. Für Screenreader: „Level 7, Wappen Bronze“. Das Wappen steht im Avatar-Feld rechts neben dem Figurenbild, groß auf der Profilseite und in der Level-Feier, klein am Namensschild im Dorf.

## 9. Oberfläche

### 9.1 Avatar-Feld (ersetzt die Statusanzeige oben rechts)
Aufbau wie das Vorbild des Auftraggebers: links das **runde Figurenbild** im gewählten verzierten **Rahmen**, rechts daneben das **Level-Wappen** mit dem Band „Lv.6“; darunter bzw. daneben kompakt Spitzname, ein schmaler **XP-Balken** zum nächsten Level, die Münzen und die Serie (🔥 6). Ein Punkt zeigt ungeöffnete Truhen an. Antippen öffnet die **Profilseite**. Ausnahme: Während des Tutorials öffnet es wie bisher die Einstellungen, damit Abmelden immer möglich bleibt. Mindestgröße 44 px, Name für Screenreader: „Profil: <Spitzname>, Level 6, 120 von 175 XP, 230 Münzen“.

**Figurenbild (Ergänzung 25.10.2026):** ein gerendertes **Brustbild** (Kopf und Schultern) der eigenen 3D-Spielfigur, kein gezeichnetes Bild: **weißer Hintergrund**, **Dreiviertelansicht** (die Figur ist etwa 30° zur Seite gedreht, die Kamera etwas über Augenhöhe, also nicht frontal), **gutes, weiches Licht** (Hauptlicht schräg vorn oben, schwaches Aufhelllicht von der anderen Seite, leichtes Kantenlicht von hinten, damit sich Haare und Schultern vom Weiß abheben). Die Figur steht dabei in der ruhigen Grundhaltung (erstes Bild der Laufanimation), mit leicht freundlichem Blick zur Kamera, falls das Modell das hergibt. Gerendert wird einmal pro Figur und Sitzung mit einem unsichtbaren Renderer (wie die Vorschaubilder im Shop), dann zwischengespeichert. Bis es fertig ist, oder ohne WebGL, erscheint das bisherige Bild aus der Figurenwahl. Dieselbe Funktion liefert später auch das Bild für den Avatar-Editor (Stufe 2), dann mit dem Rezept des Schülers.

### 9.2 Profilseite (neuer Bereich, nicht modal, wie Shop)
1. Kopf: großes Figurenbild im Rahmen, Spitzname, gewählter Titel, „Level 6“, XP-Balken mit „120 / 175 XP bis Level 7“.
2. **Serie:** „🔥 6 Schultage in Folge“, „Beste Serie: 9“, Schild „🛡 1 Schutzschild diese Woche“ bzw. „Schild verbraucht“, „Heute: 2 von 3 Quests“ (Tagesziel).
3. **Truhen:** ungeöffnete Truhen mit Knopf „Öffnen“; ohne Truhen: „Nächste Truhe bei Level 7.“
4. **Titel wählen:** Liste, gewählter Titel markiert (Text „gewählt“), gesperrte mit „ab Level n“. Auch „Kein Titel“ ist möglich.
5. **Rahmen wählen:** Musterkacheln mit Namen, gesperrte mit „ab Level n“.
6. **Meine Erfolge:** Quests gelöst (gesamt), Stempel, beste Serie, höchstes Level.
7. **„So bekommst du XP“:** die Tabelle aus §5 in einfachen Worten.
8. Knopf **Einstellungen** (öffnet das bisherige Einstellungen-Menü).

Erreichbar über das Avatar-Feld. Die Hauptnavigation bleibt bei drei Knöpfen. Während die Profilseite offen ist, pausiert das Dorf wie bei Shop und Inventar.

### 9.3 Rückmeldungen (das „Handygame-Gefühl“)
- **XP-Gewinn:** Nach einer richtigen Antwort fliegt „+15 XP“ von der Quest zum Avatar-Feld, der Balken füllt sich animiert, dazu ein kurzer Ton. Tagesziel und Serien-Tag erscheinen als eigene kleine Einblendungen („Tagesziel geschafft! +15 XP“, „🔥 Serie: 6 Tage! +25 XP“).
- **Level-Aufstieg:** Vollbild-Feier (modal): „Level 7!“, Konfetti (Kenney Particle Pack, Sterne), Fanfare (Kenney Interface Sounds), dazu die Freischaltungen („Neuer Titel: Busy Bee“ mit „Jetzt wählen“, „Neuer Rahmen: …“ mit „Jetzt anlegen“) und die Truhe mit „Truhe öffnen“. Mehrere Level auf einmal ergeben eine einzige Feier mit allen Truhen.
- **Truhe öffnen:** Die Truhe wackelt, springt auf, Münzen fliegen heraus, die Zahl zählt hoch („+100 Münzen – Super!“), dazu ein Ton. Das Ergebnis kommt vom Server, die Animation startet erst nach der Antwort (bei langsamem Netz: Wackeln bis zur Antwort).
- **Willkommen zurück:** Beim Einloggen zeigt eine Karte, was seit dem letzten Besuch passiert ist, zum Beispiel ein von der Lehrkraft gebuchter Stempel („Stempel für die Woche ab 19.10.: +100 XP“) und ein dadurch erreichtes Level. Danach folgt die Level-Feier.
- **Aufgaben-Knopf:** Ein Abzeichen zeigt die offenen heutigen Quests („2“), bei erreichtem Tagesziel ein Häkchen.
- **Reduzierte Bewegung:** kein Fliegen, kein Konfetti, keine Wackel-Animation; Zahlen und Texte erscheinen direkt. Töne folgen dem Schalter „Töne: an/aus“ (Bau-Feedback-Spec §6, `ui/sound.ts`).
- **Barrierearm:** Alle Einblendungen werden zusätzlich über die Live-Region angesagt (`role="status"`). Die Level-Feier ist ein Dialog nach den Regeln von `ui/dialog.ts`. Nichts wird nur über Farbe vermittelt.

### 9.4 Im Dorf
Namensschild am Haus und Schild über der Figur zeigen ein **kleines Level-Wappen** (Stufe und Zahl wie im Avatar-Feld) vor dem Spitznamen. Das Haus-Schild zeigt in einer zweiten, kleineren Zeile den **Titel**. Mitschüler sehen dafür nur Level, Wappen und Titel, keine XP, keine Münzen, keine Serie.

### 9.5 Tutorial
Der Abschluss (`tutorial_finish`) bucht 50 XP und führt so zum ersten Level-Aufstieg. Die Level-2-Feier mit der ersten Truhe erscheint nach dem Tanz-Moment und bevor sich die Daily Quests öffnen. Das ist das erste „Wow“.

## 10. Daten und Server (Entscheidung Claude)

Neue Migration mit der nächsten freien Nummer (`<NNNN>_xp_levels.sql`).

- `profiles` bekommt `xp int not null default 0 check (xp >= 0)`, `level int` (gespeichert, nur von `grant_xp` geschrieben, = `level_for_xp(xp)`), `title_id text null`, `frame_id text not null default 'frame_wood'`, `progress_seen_id bigint not null default 0` (letzte gesehene XP-Buchung, für „Willkommen zurück“).
- `xp_ledger (id bigserial, player_id uuid, delta int > 0, reason text, ref text, created_at)`, `unique (player_id, reason, ref)`. Gründe: `quest`, `day_goal`, `streak`, `stamp`, `tutorial`, `first_place`, `backfill`. **Invariante:** `profiles.xp` = Summe `xp_ledger.delta`.
- `level_rewards (id text pk, kind 'title'|'frame', level int, label text, sort int)` mit dem Katalog aus §8.
- `chests (id bigserial, player_id, size 'normal'|'big', source 'level'|'streak'|'backfill', ref text, created_at, opened_at, roll 'normal'|'double'|'triple' null, coins int null)`, `unique (player_id, source, ref)`.
- `streaks (player_id pk, current int, best int, last_day date, shield_week date, shield_left int)`.
- `coin_ledger.reason` bekommt `chest`.
- RLS: Schüler lesen nur eigene Zeilen von `xp_ledger`, `chests`, `streaks`. `level_rewards` lesen alle angemeldeten Nutzer. Die Lehrkraft liest alles. Schreiben nur über RPCs.

**Interne Funktionen:** `level_for_xp(int)` und `xp_for_level(int)` (immutable, Kurve aus §6), `xp_rule(text)` (Werte aus §5), `grant_xp(player, delta, reason, ref)` → bucht idempotent, erhöht `xp` und `level` und legt für jedes neu erreichte Level eine Truhe an; `touch_streak(player, day)` → Serie nachrechnen, Serien-XP und Meilenstein-Truhe.

**Erweiterte RPCs (gleiches Verhalten, zusätzliche Felder in der Rückgabe):**
- `submit_quest_answer` bucht bei richtiger Antwort Quest-XP, Tagesziel und Serie und liefert zusätzlich `progress: {gained: [{reason, xp}], xp, level, level_before, new_chests, streak}`.
- `add_stamps` bucht je Schüler 100 XP (`ref` = Woche).
- `tutorial_finish` bucht 50 XP (`ref` = `tutorial`), Rückgabe mit `progress`.
- `place_in_slot` bucht 10 XP beim ersten Aufstellen eines Gegenstands (`ref` = Gegenstands-Id), Rückgabe mit `progress`.
- `village_members()` liefert zusätzlich `level`, `title_label`, `frame_id`.

**Neue RPCs (nur Schüler):**
- `my_progress()` → `{xp, level, level_xp, next_level_xp, title_id, frame_id, streak: {current, best, shield_left, today_done}, today: {solved, total}, chests: [{id, size}], unseen: [{id, reason, ref, delta, created_at}], stats: {quests, stamps, best_streak}}`.
- `mark_progress_seen(p_id bigint)`.
- `open_chest(p_id bigint)` → würfelt (`random()` auf dem Server), bucht Münzen (`coin_ledger.reason = 'chest'`), `{coins_won, roll, coins}`; zweites Öffnen liefert dasselbe Ergebnis ohne neue Buchung.
- `set_title(p_id text | null)`, `set_frame(p_id text)` → prüfen `level ≥ level_rewards.level`.

**Nachträglich für bestehende Schüler (Migration):** XP aus der bisherigen Geschichte einmalig buchen (`reason = 'backfill'`): gelöste Daily Quests (10 XP je Quest), Stempel (100), abgeschlossenes Tutorial (50). Keine Serie rückwirkend. Truhen: für die so erreichten Level, **höchstens 3** (`source = 'backfill'`). Beim ersten Login erscheint dann die Willkommen-Karte mit Feier.

**Lehrer-Bereich:** Die Klassen-Übersicht bekommt die Spalten Level, XP und aktuelle Serie. Es gibt keine Bearbeitung, keine XP-Vergabe und keine Rangliste (Sortierung bleibt nach Spitzname).

## 11. Fehler- und Randfälle

- RPC-Fehler oder kein Netz: keine Einblendung, keine Feier; die Profilseite zeigt „Das hat nicht geklappt. Nochmal versuchen“. XP gehen nie verloren, weil der Server bucht.
- Zwei Geräte gleichzeitig (Schul-Tablet und Handy): Buchungen sind idempotent, die Feier erscheint auf dem Gerät, das die Antwort bekam; das andere zeigt sie über `unseen` beim nächsten Laden.
- Eine Truhe wird während der Animation geschlossen oder der Schüler meldet sich ab: Die Münzen sind gebucht; beim nächsten Öffnen zeigt die Profilseite die Truhe als geöffnet mit Ergebnis.
- Lehrkonto: keine XP, kein Avatar-Feld-Fortschritt (wie bei Quests: „Nur Schülerkonten …“).
- Mehrere Level-Aufstiege auf einmal (Stempel + Backfill): eine Feier, alle Truhen, alle Freischaltungen in einer Liste.
- Zeitzone: Schultag und Montag immer nach Europe/Berlin (`quest_today()`).

## 12. Technik-Hinweise für den Bau

- Neue Dateien im Browser: `api/progress.ts` (Typen + RPC-Aufrufe, injizierbar wie `ItemApi`), `ui/avatarBadge.ts` (Avatar-Feld, ersetzt den Status-Knopf in `gameNav.ts`), `ui/profileView.ts` (Bereich `profil`), `ui/levelUp.ts` (Feier + Truhe), `ui/xpToast.ts` (fliegende XP und Einblendungen), `ui/frames.ts` (verzierte Rahmen als SVG), `ui/crest.ts` (Level-Wappen als SVG, dieselben Formen auch für das Namensschild-Canvas), `render/portrait.ts` (Brustbild der Figur).
- `render/village.ts` / `render/crowd.ts`: Namensschild-Canvas mit Abzeichen und Titelzeile. Keine zusätzlichen Draw Calls (dasselbe Sprite, nur ein anderes Canvas). `npm run galerie` prüfen.
- Kenney-Assets (CC0, `Kenny/`, nur lesen): Konfetti und Sterne aus *Particle Pack* (`star_*`, ≤ 3 Texturen, je ≤ 128 px), Fanfare und Münzton aus *Interface Sounds* bzw. *UI Pack Sounds*, umgewandelt nach MP3 wie in der Bau-Feedback-Spec §6.1; Truhe als einfaches eigenes 2D-Bild (CSS/SVG) oder Kenney-UI-Grafik. Jede Quelle in `blender/sources/LICENSES.md`.
- Ton über `ui/sound.ts` aus dem Bau-Feedback-Plan (Aufgabe 2); gleicher Schalter „Töne: an/aus“.

## 13. Abnahme

1. Nach dem Tutorial erscheint die Level-2-Feier mit Truhe; Öffnen bucht Münzen, sichtbar im Kontoauszug als „Truhe“.
2. Eine richtig gelöste Quest zeigt „+XP“, den sich füllenden Balken und beim Erreichen der Grenze die Level-Feier.
3. Titel und Rahmen lassen sich nur ab dem passenden Level wählen; Mitschüler sehen Level, Titel und Rahmen am Namensschild, sonst nichts.
4. Die Serie zählt Mo–Fr, Wochenende und Ferien brechen sie nicht, ein verpasster Schultag pro Woche wird vom Schild aufgefangen.
5. Ein gebuchter Stempel erscheint beim nächsten Login in der Willkommen-Karte.
6. Im Browser lässt sich weder XP noch Level noch Truhen-Inhalt verändern (alles nur über RPC, SQL-Tests).
7. Reduzierte Bewegung und Töne aus werden beachtet; alles per Touch und Tastatur bedienbar.
8. Auf dem ältesten Tablet weiterhin ≥ 30 fps im Dorf (Namensschilder ohne zusätzliche Draw Calls).

## 14. Offen (mit Standardwert umsetzen, später anpassbar)

| # | Frage | Standard |
|---|---|---|
| 1 | XP-Werte und Kurve | §5, §6 (in `xp_rule` / `xp_for_level`) |
| 2 | Truhen-Münzen und Shop-Preise | §6; nach 4 Wochen Kontoauszüge ansehen und ggf. anpassen |
| 3 | Titel-Liste (englisch) | §8; Lehrkraft kann Texte in `level_rewards` ändern |
| 4 | Profilseiten anderer Schüler ansehen | nein (später möglich) |
| 5 | Truhen mit Gegenständen (exklusive Deko) | später |
