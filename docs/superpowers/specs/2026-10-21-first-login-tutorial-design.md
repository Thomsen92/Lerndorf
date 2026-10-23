# Erststart-Tutorial für Lerndorf – Design

**Stand:** 23.10.2026 (Abschnitte 1–8 an die Entscheidungen der Lehrkraft vom 23.10. angepasst; §9 bleibt als Entscheidungsprotokoll stehen und gilt bei jedem Widerspruch zuerst)
**Status:** Entscheidungen bestätigt. Die Ruine (Optik) wartet auf die Abnahme der Lehrkraft, bevor der Rest gebaut wird.

## 1. Ziel

Jeder Schüler ohne platziertes Haus durchläuft beim ersten Spiele-Login ein kurzes, geführtes Tutorial: Figur wählen, Kamerafahrt zum eigenen Grundstück mit einer Ruine, kurze Erklärungen zu Daily Quests und Münzen, fünf einfache Englischfragen, einmalig 50 Münzen, Kauf des Fachwerkhauses (50 Münzen) und eigenes Platzieren im Haus-Sockel. Zum Schluss tanzt die Figur, und die Daily-Quest-Ansicht öffnet sich.

## 2. Projektkontext (Ist-Stand vor der Umsetzung)

- Lerndorf ist ein browserbasiertes 3D-Spiel für die Klassen 8a und 8b, auch auf geteilten Schul-Tablets. UI-Sprache Deutsch, Englischaufgaben Englisch.
- Nach dem Login öffnet `web/src/main.ts` direkt `mountVillage`. Neue Profile haben `profiles.plot_index = null` und wählen ein Grundstück per Antippen (`claim_plot`, Migration 0012).
- Figurwahl Junge/Mädchen: `web/src/ui/characterPicker.ts`, RPC `set_character` (Migration 0018), gespeichert in `profiles.avatar.character`. Beim ersten Login ist sie Pflicht.
- Haus und Garage fallen auf Starter zurück (`STARTER` in `world/plotPlan.ts`: `house_fachwerk`, `garage_holz`; `house_fachwerk` ist kostenlos und `starter = true`, Migration 0013).
- Kauf über `buy_item`, Platzierung über `place_in_slot`; Shop und Baumodus lassen sich pro Klasse schließen (`classes.shop_open`, `classes.build_open`).
- Daily Quests: Migrationen 0015–0017, `web/src/ui/dailyQuestsView.ts`. Antwortprüfung über `answer_matches`/`quest_answer_matches`; Lösungen liegen in einer eigenen Tabelle ohne Client-Zugriff.

## 3. Bestätigte Entscheidungen

- Das Tutorial erscheint für jeden Schüler, der noch kein Haus im Haus-Sockel platziert hat. Wer ein Haus platziert hat, bekommt es nie (derzeit gibt es noch keine Schülerkonten; keine Datenübernahme).
- Die Figurwahl (Junge/Mädchen) steht am Anfang, vor der Kamerafahrt, und ist Teil des Tutorials (nicht doppelt zeigen). Bereits gespeicherte Figur wird übersprungen.
- Beim ersten Login vergibt der Server atomar den niedrigsten freien Grundstücksplatz (von innen nach außen). Die manuelle Wahl entfällt für Schüler.
- Die Kamerafahrt zeigt die Welt und endet am eigenen Grundstück (ca. 5–8 s, nicht überspringbar; mit „Bewegung reduzieren“ kürzer und ruhiger).
- Im Haus-Sockel steht eine **Ruine** (Kenney-Teile, CC0), bis das Fachwerkhaus platziert ist. Sie ist kein Shop-Artikel, nicht im Inventar, nicht auswählbar. Mitschüler sehen sie ebenfalls.
- Vor der Ruine steht die eigene Figur mit trauriger Sprechblase. Eine Wink- oder Trauer-Animation gibt es nicht (Figuren haben nur walk, Catwalk, Tänze).
- Sprechblasen sind Comic-Blasen (abgerundet, weiß, dunkler Rand, Spitze zur Figur) mit der freien Schrift Comic Neue (SIL OFL, im Repo); Fallback `'Comic Sans MS', cursive`. Grafik aus Kenney UI Pack 2.0 (CC0). Gilt auch für die Begrüßungsblasen im Dorf.
- Nach der Fahrt erklären kurze deutsche Nachrichten nur Daily Quests und Münzen; jede bleibt bis „Weiter“ sichtbar.
- Die einmalige Tutorial-Quest hat fünf feste Fragen (Tabelle §5), getrennt von den drei normalen Daily Quests. Falsche Antworten: unbegrenzte Versuche, kurzer englischer Hinweis, Lösung bleibt verborgen.
- Nach fünf richtigen Antworten gibt es einmalig 50 Münzen (idempotent).
- Das Fachwerkhaus ist kein Starter mehr und kostet 50 Münzen. Der Kauf im Tutorial geht auch bei geschlossenem Shop; das Platzieren im Haus-Sockel auch bei geschlossenem Baumodus. Beides nur für dieses Haus, nur im jeweiligen Tutorialschritt.
- Nach der bestätigten Platzierung verschwindet die Ruine für alle; das Fachwerkhaus steht dort.
- Am Ende tanzt die Figur eine Runde ihres Tanzes; die Sprechblase sagt „Jetzt wird gelernt und Dailys gemacht!“. Danach öffnet sich die Daily-Quest-Ansicht.
- Abbruch oder Logout: Das Tutorial setzt beim nächsten Login am zuletzt bestätigten Schritt fort. Erledigte Schritte werden übersprungen, nichts wird überschrieben.

## 4. Ablauf

1. **Login:** Client fragt `tutorial_state()`. `needed = false` → normales Dorf.
2. **Figur:** fehlt `avatar.character`, öffnet sich der Pflicht-Figurwähler (`set_character`). Der Server vermerkt Schritt `intro`.
3. **Grundstück:** `tutorial_start()` vergibt atomar den niedrigsten freien Platz, falls `plot_index` leer ist (sonst bleibt er). Das Dorf wird aufgebaut.
4. **Kamerafahrt:** Panorama → eigenes Grundstück → Figur vor der Ruine, traurige Blase.
5. **Erklärungen:** 2 Nachrichten (Daily Quests, Münzen), jeweils „Weiter“. Danach Schritt `quiz`.
6. **Quiz:** fünf Fragen nacheinander (`tutorial_answer`). Nach der fünften schreibt der Server 50 Münzen gut → Schritt `buy`.
7. **Kauf:** geführter Kaufdialog nur für das Fachwerkhaus (`tutorial_buy_house`), 50 Münzen; → Schritt `place`.
8. **Platzieren:** geführter Baumodus hebt Inventar-Eintrag und Haus-Sockel hervor; der Schüler platziert selbst (`tutorial_place_house`); → Schritt `done`. Bis der Server bestätigt, bleibt die Ruine.
9. **Abschluss:** Kamera näher an die Figur, Tanz, Abschlussblase, dann Daily-Quest-Ansicht.

Bei Verbindungsfehlern bleibt der zuletzt bestätigte Schritt; jeder Schritt lässt sich wiederholen. Kauf und Gutschrift sind idempotent.

## 5. Die fünf Fragen (fest, Lösungen nur auf dem Server)

| Nr. | Typ | Aufgabe | Lösung | Hinweis (englisch) |
|---|---|---|---|---|
| 1 | choice | What is 'Haus' in English? – house / mouse / horse | house | You live in it. |
| 2 | gap | My name ___ Tom. | is | Use a form of 'be'. |
| 3 | choice | Which word is a colour? – red / run / rain | red | Think of a tomato. |
| 4 | match | dog – Hund, cat – Katze, bird – Vogel | Paare | Think of animals. |
| 5 | listening (choice) | Vorlesen: „Hello! I am your new neighbour. Welcome to the village!“ – Frage: Listen. Who is talking? – your new neighbour / your teacher / your mum | your new neighbour | Listen to the second sentence. |

## 6. Serverseitiger Entwurf (Entscheidungen innerhalb der SPEC)

- **Tabelle `tutorial_progress`** (`player_id` PK → profiles, `step` ∈ `intro|quiz|buy|place|done`, `answered int`, `reward_paid bool`, `house_bought bool`, `completed_at`): RLS an, nur Lesen der eigenen Zeile; Schreiben ausschließlich über RPCs.
- **Tabellen `tutorial_questions`** (Nr, Typ, Aufgabe, Daten, Hinweis) und **`tutorial_solutions`** (Nr, Lösung): RLS an, keine Client-Policy. Die Fragen kommen nur über `tutorial_question()` (ohne Lösung, nur die aktuelle Frage).
- **Gutschrift:** `coin_ledger.reason = 'tutorial'` mit Unique-Index je Spieler; zusätzlich Sperre der Fortschrittszeile (`for update`).
- **Katalog:** `house_fachwerk`: `starter = false`, `price = 50`. Ein Haus-Slot ohne Platzierung zeigt auf dem Client die Ruine (`STARTER.house` entfällt). `place_in_slot` und `buy_item` bleiben unverändert streng; die Tutorial-RPCs sind die einzigen Ausnahmen für geschlossenen Shop/Baumodus.
- **Grundstück:** `tutorial_start()` sperrt die Klasse (Advisory-Lock) und vergibt `min(frei)`; `claim_plot` wird für Schüler gesperrt.
- **Wer ein Haus platziert hat:** `tutorial_state()` meldet `needed = false` und legt den Schritt `done` an.

## 7. Abnahmekriterien

1. Erster Login ohne Haus: Figurwahl vor der Kamerafahrt; danach genau ein freier Platz, der niedrigste Index; gleichzeitige Logins bekommen verschiedene Plätze.
2. Die Kamerafahrt (5–8 s, nicht überspringbar, „Bewegung reduzieren“ beachtet) endet an der Figur vor der Ruine mit trauriger Sprechblase.
3. Mitschüler sehen die Ruine auf dem Platz, bis ein Haus platziert ist.
4. Zwei Erklärungsnachrichten (nur Daily Quests und Münzen), jede mit „Weiter“.
5. Genau fünf Fragen laut §5; Hinweise englisch; Lösungen verlassen den Server nicht.
6. Nach der fünften richtigen Antwort genau 50 Münzen, auch bei wiederholten Aufrufen.
7. Fachwerkhaus kostet 50 und ist kein Starter; Kauf im Tutorial bei geschlossenem Shop möglich, anderer Kauf bei geschlossenem Shop nicht.
8. Platzieren im Tutorial bei geschlossenem Baumodus möglich, andere Bauaktionen nicht.
9. Nach bestätigter Platzierung ersetzt das Haus die Ruine für alle.
10. Figur tanzt, Blase zeigt die Abschlusszeile, danach öffnet sich die Daily-Quest-Ansicht.
11. Abbruch an jedem Schritt: Wiederaufnahme am letzten bestätigten Schritt, nichts doppelt.
12. Schüler mit platziertem Haus sehen kein Tutorial.
13. Clients können Tutorialstatus, Münzen, Besitz und Platzierungen nicht direkt ändern (RLS, nur RPC).
14. Comic-Sprechblasen mit Comic Neue; Lizenzen in `blender/sources/LICENSES.md`.

## 8. Offen / bewusst nicht Teil dieses Designs

- Die Ruine wird erst nach Abnahme der Vorschau (Galerie „plot“) eingebaut.
- Tripo-Lizenz der Figuren (siehe LICENSES.md) bleibt Sache der Lehrkraft.

## 9. Änderungen nach Entscheidung der Lehrkraft (23.10.2026)

Diese Entscheidungen gelten vor den Abschnitten 1–8. Wo der Text oben abweicht, gilt dieser Abschnitt.

1. **Figurwahl statt zehn Start-Avatare.** Es gibt zwei Figuren, Junge und Mädchen (`web/src/ui/characterPicker.ts`, RPC `set_character`, Migration 0018). Die Wahl kommt **vor** der Kamerafahrt. Einen neutralen Beispiel-Avatar gibt es nicht: Vor der Baracke steht bereits die eigene Figur. Die bisherige Pflicht-Auswahl beim ersten Login wird in den Tutorialablauf übernommen (nicht doppelt anzeigen).
2. **Keine Wink- und Trauer-Animation.** Die Figuren haben nur walk, Catwalk und Tänze. Am Anfang steht die Figur vor der Ruine und zeigt eine traurige Sprechblase. Am Ende tanzt sie (eine Runde ihres Tanzes) statt zu winken; die Abschlusszeile „Jetzt wird gelernt und Dailys gemacht!“ steht in der Sprechblase.
3. **Sprechblasen im Comic-Stil.** Abgerundete weiße Blase mit dunklem Rand und Spitze zur Figur, Schrift im Comic-Stil. Comic Sans ist auf iPads und Android-Tablets meist nicht installiert und darf nicht mitgeliefert werden; deshalb die freie Schrift **Comic Neue** (SIL OFL) als Datei im Repo mitliefern, Fallback `'Comic Sans MS', cursive`. Grafik aus dem **Kenney UI Pack 2.0** (CC0, `Kenny/UI`, eine fertige Sprechblase enthält es nicht): Körper der Blase aus `PNG/Grey/Default/button_rectangle_depth_border.png` als 9-Slice (`border-image`, hell eingefärbt), Spitze zur Figur aus `PNG/Grey/Default/arrow_basic_s.png`. Die Kenney-Schrift „Future“ passt nicht zum Comic-Stil und wird nicht verwendet. Optional für Tutorial-Knöpfe („Weiter“): `Sounds/tap-a.ogg`. Quellen in `blender/sources/LICENSES.md` eintragen. Gilt auch für die normalen Begrüßungsblasen im Dorf.
4. **Grundstück automatisch.** Beim ersten Login vergibt der Server atomar den niedrigsten freien Grundstücksplatz (von innen nach außen). Die manuelle Wahl durch Antippen (`claim_plot`, Hinweis „Tippe auf eine freie Wiese“) entfällt für Schüler.
5. **Wer schon ein Haus platziert hat, bekommt kein Tutorial.** Derzeit hat noch kein Schüler ein Konto oder Haus; eine Datenübernahme ist nicht nötig.
6. **Ruine statt Wellblech-Baracke und statt kostenlosem Starterhaus.** Vor dem Tutorial-Hauskauf steht im Haus-Sockel eine **Ruine** (heruntergekommenes Haus), zusammengesetzt aus Kenney-Teilen (CC0) in `Kenny/`, z. B. Fantasy Town `wall-wood-broken`, `wall-broken`, `wall-wood-window-shutters`, `planks`, `planks-half`, `fence-broken`, ein schiefes/halbes Dach aus `roof-*`, dazu Survival `structure-metal-wall`/`metal-panel-*` als geflickte Stellen und `floor-old`; Maße nach `docs/ASSET_VERTRAG.md` (Haus-Sockel 6×4). Die Ruine ist kein Shop-Artikel, nicht im Inventar und nicht auswählbar; nach der Platzierung des Fachwerkhauses verschwindet sie für alle. Vorschaubild vor dem Einbau der Lehrkraft zeigen.
7. **Die fünf Tutorial-Fragen** (ganz einfach, fest im Code bzw. in einer Migration, Lösungen nur auf dem Server):

| Nr. | Typ | Aufgabe | Lösung | Hinweis (englisch) |
|---|---|---|---|---|
| 1 | choice | What is 'Haus' in English? – house / mouse / horse | house | You live in it. |
| 2 | gap | My name ___ Tom. | is | Use a form of 'be'. |
| 3 | choice | Which word is a colour? – red / run / rain | red | Think of a tomato. |
| 4 | match | dog – Hund, cat – Katze, bird – Vogel | Paare | Think of animals. |
| 5 | listening (choice) | Vorlesen: „Hello! I am your new neighbour. Welcome to the village!“ – Frage: Listen. Who is talking? – your new neighbour / your teacher / your mum | your new neighbour | Listen to the second sentence. |
