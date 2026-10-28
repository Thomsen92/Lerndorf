# Spooky-Stand, Season-Ticket und Spooky English Quiz · Implementation Plan r12

**Goal:** Auf dem normalen Marktplatz einen klar erkennbaren, anklickbaren Halloween-Stand anbieten. Ein gemeinsamer Welcome-Dialog lädt zum Spooky English Quiz mit 150 XP ein und öffnet den LearnPass. Keine Sammelkarten-/Boxenerklärung im Welcome. Zehn Tablet-Klickfragen ergeben einmal pro Season 150 XP und damit mindestens Tier 5 ohne Stempel.

**Architecture:** Stand und UI-Ticket sind zwei Einstiegspunkte in denselben Season-Hub. Der Hub und das Quiz sind unabhängig von der dunklen Halloween-Weltebene. Serverseitiger Quizfortschritt und bestehendes XP-Ledger vergeben atomar maximal 150 XP je Spieler/Season. Vorab mit Edge TTS erzeugte MP3s laufen lokal im Browser.

**Tech Stack:** Vorhandenes TypeScript/DOM/Three.js 0.170.0, Supabase-RPC/Postgres, Vitest/PGlite/Playwright, vorhandenes Edge-TTS-Skript und `listeningPath`. Kein neues UI-Framework, keine neue Quiz-Engine.

Stand: 27.10.2026 · r14. Ergänzt `DEEPSEEK_UMSETZUNGSPLAN.md`, hat bei abweichenden Welcome-/Einstiegsregeln Vorrang. **Der gelieferte Halloween-Shop mit genau einer großen Katze und Candy Cauldron davor ist als fertiges Ensemble vorbereitet. Der eigene violette Stand ist unter assets/season-starter/bench/custom-stand-r1 archiviert; nicht aktiv importieren. DeepSeek soll nichts neu modellieren.** Fertiges Asset: `assets/season-starter/halloween-shop-event.glb`; bearbeitbare Quelle: `sources/season-starter/halloween-shop-event.blend`; drehbare Klickvorschau: `stand.html`. Nur Platzierung und Spielanbindung sind noch Integrationsaufgaben. Alle jetzigen Schreibarbeiten bleiben unter `Prototyp/marktplatz/`. Produktionspfade unten sind Aufträge für DeepSeek, keine hier geänderten Dateien. Keine Commits, Pushes, Deployments oder Live-Migrationen ohne gesonderten Auftrag.

## 1. Verbindlicher Ablauf

```text
Normaler Marktplatz → Spooky-Stand antippen ┐
                                          ├→ Welcome to Season I
UI: Season-I-Jahrmarktticket antippen ──────┘   ├→ Open LearnPass
                                              ├→ Spooky English Quiz
                                              └→ Back to village
Quiz: 10 gelöste Fragen → 150 XP → LearnPass → Tier 5 abholen → Season chest
```

- Stand und Ticket dürfen beim Lehrer-Wechsel auf Normal **nicht verschwinden**, solange das Event läuft. Die dunkle Welt bleibt eine getrennte optische Einstellung der Lehrkraft.
- Während einer geplanten Season kündigt der Stand das Event mit dem tatsächlichen Startdatum an; Welcome und Vorschau dürfen geöffnet werden. Quiz-XP/Claims erst bei serverseitig laufender Season freigeben. Kein heimliches Vorziehen der Season.
- Während der laufenden Season: Stand und Ticket aktiv, Quiz bis zum Ende nachholbar. Einmal pro Season statt nur beim allerersten Kontologin, damit bestehende Konten dieselbe Chance erhalten. Nach Abschluss erneut anschauen, aber keine weiteren XP.
- Nach Season-Ende darf das Ticket den Almanach und vorhandenen Pass/Truhenbestand öffnen. Kein neuer Starter-XP-Grant außerhalb des Fensters. Für geplante nächste Season jeweils richtige Season-ID/Datum anzeigen.
- Automatische Welcome-Anzeige beim ersten Eintritt in die laufende Season hängt **nicht** vom aktiven Halloween-Welttheme ab. Welcome-Seen für den Hub je `(player,season,contentVersion)` speichern; kein erneutes Aufpoppen durch jeden Weltoptikwechsel. Vorhandene klassen-/revisionsgebundene Atmosphärenhinweise separat behandeln.
- Keine Kaskade gestapelter Dialoge: Welcome schließen, dann denselben vorhandenen LearnPass-/Quiz-Öffner verwenden. Vom Quiz zum Hub und Dorf zurückkehren können. Fokus und pausiertes Dorf korrekt wiederherstellen.

## 2. Stand und Ticket

### Fertigen Halloween-Shop auf dem Standard-Marktplatz integrieren

- Aktives Ensemble: `assets/season-starter/halloween-shop-event.glb`, 19.818 Dreiecke / drei Materialien. Besteht aus geliefertem Halloween-Shop, genau einer großen Katze und Candy Cauldron davor. Kleine Katzen wurden aus der Runtime-Ableitung entfernt; Original bleibt unverändert.
- Etwa 4,57 m breit / 3,64 m tief / 3,60 m hoch; GLB +Y oben / +Z Front, Bodenanker Ursprung. PBR-Maps eingebettet, maximal 1.024 px. Katze und Kessel sind im Ensemble enthalten: nicht doppelt hinzufügen.
- Einzelteile bei getrennter Lebenszyklusverwaltung: `halloween-shop.glb`, `halloween-cat-large.glb`, `halloween-candy-cauldron.glb`. Genaue Positionen und Quellen im Audit und `STAND_INTEGRATION.md`.
- Eigenen alten Stand nicht als aktuellen Stand verwenden. Er bleibt unter `assets/season-starter/bench/custom-stand-r1/` erhalten, ebenso seine editierbare Quelle. Modellbau ist kein DeepSeek-Arbeitspaket.
- Gesamten Shop gut antippbar machen, inklusive großzügiger Hit-Zone. Kameradrag/Pinch löst keinen Klick aus. Anklicken öffnet denselben Hub wie das UI-Ticket.
- Öffentliche Platzfläche relativ zu `layout.plaza` wählen; Wege, Sir Byte und Aufgabenbrett freihalten. Shop unabhängig vom Halloween-Overlay halten, beim Themewechsel keine Duplikate. Geteilte GLB-Ressourcen beim Entfernen nicht zerstören.

### Sichtbarer UI-Einstieg

- Vorbereitetes natives SVG: `assets/season-starter/season-ticket.svg`. Violettes Jahrmarktticket mit goldener Kante, Mond, Fledermaus und Kürbis. Eigene Grafik, keine neue Bildgenerierung notwendig.
- Im bestehenden Dorf-HUD als kompakter Account-/Season-Einstieg ergänzen, ohne die Hauptnavigation Aufgaben/Haus umzubauen. Mindestens 48 × 48 CSS-Pixel, daneben **„Season I“**; Accessible Name **„Open Season I – Halloween“**.
- Beim Antippen **Welcome-Hub** öffnen. Darin klarer großer LearnPass-Button. Kein dekoratives totes Icon, kein ausschließliches Tooltip. Maus, Touch und Tastatur funktionieren.
- Status kann „Soon“, „Live“ oder abgeschlossen anzeigen; aus Serverdaten ableiten. Keine erfundenen roten Benachrichtigungszähler und kein Kaufpreis für das Ticket.

## 3. Welcome-Inhalt und Belohnungsregel

Titel: **Welcome to Season I – Halloween!**

> A spooky season has arrived in Lerndorf! Try the Spooky English Quiz and earn 150 XP — enough to reach Tier 5 without a teacher stamp. Open your LearnPass to collect your rewards.

Buttons: **Spooky English Quiz**, **Open LearnPass**, **Back to village**. Deutschen UI-Text über bestehende i18n ergänzen. Hörfragen haben wie angefordert deutsche Bedeutungsoptionen auch bei englischer UI; diese Lerninhalte nicht automatisch übersetzen.

- Welcome erklärt ausschließlich: Spooky English Quiz machen, 150 XP verdienen, LearnPass öffnen und erreichte Belohnungen abholen. Keine Sammelkarten, Seltenheiten, Collection-Links oder Boxeninhalte in dieser Erklärung. Die separaten r11-Kartenregeln bleiben fachlich erhalten.
- 10 XP pro erstmals richtig gelöster Starterfrage + 50 XP einmaliger Abschlussbonus = **150 XP**. Bestehende Tagesquest-Regeln/Münzen bleiben unverändert. Der Starter vergibt selbst keine Münzen und keine zusätzliche freie Truhe; Tier-5-Belohnung folgt dem vorhandenen Pass-Claim.
- Fehlversuche führen zu einem kurzen Hint und erneutem Versuch. Kein Abzug der Starter-XP, kein Zeitlimit, kein Tageslimit. Unbegrenzt versuchen; Abschluss erfordert zehn richtige Antworten. Teilfortschritt speichern.
- Auch ohne Tutorial, Tagesquest, Serie, Platzierung oder Stempel sind 150 **innerhalb der laufenden Season verbuchte** XP erreichbar. Das neue Paket darf nicht von alten Tutorial-XP abhängen.

## 4. Konkreter Fragenumfang

Private Seedquelle: `sources/season-starter/quiz.private.json`. Enthält vollständige Prompts, drei/vier Optionen, Lösungen und Hints. **Nicht in `web/public/`, öffentliche Runtime-Manifeste oder das Browserbundle kopieren.** Importserver/SQL-Seed liest die Quelldatei und liefert dem Client nur ausdrücklich projizierte Felder.

| IDs | Inhalt | Interaktion |
|---|---|---|
| `odd-characters`, `odd-animals` | Odd one out: Halloweenfiguren / Tiere | Ein Wort antippen |
| `scarier-than`, `biggest-pumpkin` | scarier than / the biggest | Richtige Steigerung antippen |
| `british-american-sweets`, `british-american-colour` | sweets/candy; favourite colour/favorite color | Wort oder Satz antippen |
| `listen-trick-or-treat` | “Trick or treat!” | Anhören → deutsche Bedeutung antippen |
| `listen-happy-halloween` | “Happy Halloween!” | Anhören → deutsche Bedeutung antippen |
| `listen-dressing-up` | “What are you dressing up as?” | Anhören → deutsche Bedeutung antippen |
| `listen-sweets` | “Would you like some sweets?” | Anhören → deutsche Bedeutung antippen |

Alle Fragen technisch `choice` bzw. `listening` mit `mode='choice'`. Odd one out und Steigerung sind Inhaltskategorien, keine zusätzlichen Antwortprüfer. Vorhandene `quest_answer_matches`-Choice-Prüfung wiederverwenden.

## 5. Tablet-Bedienung

- Eine Frage pro Ansicht, „Question 3 of 10“, kurze Aufgabenstellung, große vollständig beschriftete Antwortflächen. Mindestens 52 Pixel Höhe und 10 Pixel Abstand; bei langen deutschen Sätzen Umbruch statt Abschneiden.
- **Ein Tap auf eine Antwort sendet sie sofort.** Keine Dropdowns, Radio-/Checkboxen, Häkchen zum Auswählen, Texteingaben, Drag-and-drop und kein zusätzlicher „Prüfen“-Button. Die bestehende Daily-Quest-Oberfläche hierfür nicht unverändert kopieren: sie hat einen zusätzlichen Prüfen-Schritt und Browser-TTS.
- Während Serverantwort aussteht alle Antwortflächen dieser Frage sperren; anschließend richtige Antwort als Textstatus „Correct! +10 XP“ oder Hint anzeigen. „Next question“ bleibt ein eigener großer Button, damit nichts unerwartet wegspringt.
- Bei Verbindungsfehler keine Erfolgsmeldung/XP vorspielen; gleichen Versuch erneut senden können. Antwortdaten beim Logout verwerfen. Korrekte Rückmeldung nicht nur farblich geben.
- Tastatur: Tab/Enter/Space, sichtbarer Fokus. Auf 768×1024, 1024×768 und 390×844 kein horizontales Scrollen und erreichbare Navigation. Reduzierte Bewegung ohne Kartenflug/Konfetti.
- Audio-Play und Replay sind Buttons. Kein Autoplay, auch beim Fragenwechsel. Vorherigen Clip beim Wechsel/Schließen pausieren, auf Anfang setzen und Audio-Events entfernen. Lange Texte dürfen vertikal scrollen.

## 6. Edge TTS: vorhandenen Audioweg nutzen

Vorhandene Dateien zuerst lesen: `web/src/quests/listening.ts`, `web/scripts/generate-listening.ts`, `web/scripts/listening.ts`, `content/daily-quests/FORMAT.md`. `dailyQuestsView.ts` benutzt aktuell noch `speakEnglish`/SpeechSynthesis; diese ältere Laufzeitvariante für das neue Quiz **nicht** übernehmen.

- Stimme `en-GB-SoniaNeural`, Rate `-10%`; Pfad ausschließlich über vorhandenes `listeningPath(text,voice,rate)`. Keine parallele eigene Hashfunktion.
- **Vier MP3s wurden erfolgreich mit Edge TTS erzeugt**, unter `assets/listening/`; Zuordnung und Dateigrößen in `assets/season-starter/audio-manifest.json`. DeepSeek kopiert sie nach `web/public/assets/listening/`; die private Fragenquelle bleibt außerhalb des Public-Verzeichnisses.
- Vorbereitung/Prüfung im Prototyp:

```powershell
node Prototyp/marktplatz/tools/prepare-season-starter.cjs --generate --verify-audio
```

- Der Aufruf sendet nur vier vorgegebene englische Sätze an Edge TTS, keine Schülerdaten. Bereits vorhandene nichtleere MP3s werden wiederverwendet; temporäre Dateien bei Fehler bereinigt. Laufzeitstreaming zum TTS-Dienst ist nicht erforderlich.
- Für künftigen Build den bestehenden Generator um die vier privaten Seed-Hörtexte erweitern bzw. `extraTexts` verwenden; keine Wochenaufgaben verändern oder komplett neu importieren, um den Starter hinzuzufügen.
- `audio.play()` im direkten Tap-Handler aufrufen und Promise-Fehler abfangen. Kein asynchroner Download vor dem eigentlichen `play()`, der den iPad-Nutzergestus verliert. Audioausgabe funktioniert auch ohne installierte englische Systemstimme.
- Bei MP3-Fehler „Audio could not play. Try again.“ mit Replay. Optional expliziter „Show English text“-Button als barrierearmer Ersatz, gleiche XP; kein stiller Wechsel zur Browserstimme. Deutsche richtige Antwort weiterhin geheim halten.
- Vor Veröffentlichung prüfen: vier MP3-Dateien vorhanden, nicht leer und decodierbar; kein 404 unter App-Basepfad. Audioassets vor aktivem Fragen-Seed ausliefern.

## 7. Serverseitiger Vertrag und sichere XP

Neue Migration mit **nächster freier Nummer**, nicht bestehende Migrationen ändern. Tabellen/Spalten an tatsächliche bestehende Schlüssel anpassen:

- `season_starter_questions`: `(season_id,id)` als Schlüssel, Reihenfolge, Typ/Kategorie, Prompt, öffentliche Optionen, privates `solution` und `hint`, optional `speak`, Content-Version. Keine direkten SELECT-/Schreibrechte für Clientrollen; Read-RPC projiziert nur erlaubte Felder. Lösungen dürfen alternativ in einer eigenen privaten Tabelle liegen, wie bei Daily Quests.
- `season_starter_results`: eindeutiges `(player_id,season_id,question_id)`, Versuche, `solved_at`. Auf Spieler und zusammengesetzten Fragen-Key referenzieren; RLS, keine Clientwrites.
- Interne feste Regel `10` je Frage und `50` für zehn gelöste Fragen. Kein vom Client übergebener XP-Wert, keine zufällige Bonushöhe. Neue Quizfragen nach Live-Start nicht still austauschen; Version und Bestand migrieren.

```ts
interface SeasonStarterState {
  seasonId: string;
  state: 'upcoming' | 'running' | 'ended' | 'closed';
  solved: number; total: 10; awardedXp: number; completed: boolean;
  questions: Array<{
    id: string; kind: string; prompt: string; options: string[];
    audioPath?: string; solved: boolean;
  }>;
}
// Read: my_season_starter(p_season text) -> SeasonStarterState
// Write: submit_season_starter_answer(p_season text,p_question text,p_answer text)
// -> {correct,alreadySolved,hint,solved,total,awardedXp,completionBonusXp,progress}
// awardedXp/completionBonusXp here are deltas for this call; progress is the existing ProgressDelta.
```

- UID ausschließlich `auth.uid()`, Schülerrolle und Season serverseitig prüfen. Nur laufende Season darf neue XP buchen; Optik Normal/Halloween ist keine Teilnahmebedingung. Lehrer-Vorschau separat und ohne Vergabe.
- Profilezeile **zuerst sperren**, danach Ergebniszeile; mit bestehenden Pass-/Truhen-RPCs konsistente Reihenfolge prüfen. Antwort gegen private Lösung auf dem Server prüfen. Keine Lösung vor erfolgreichem Abschluss ausliefern.
- Vorhandenes `grant_xp` wiederverwenden. Bestehender zulässiger Grund `quest`, eindeutige Referenzen `season-starter:<seasonId>:<questionId>` und `season-starter:<seasonId>:complete`. Starterzählung aus eigener Ergebnistabelle, nie aus allen Daily-Quest-Ergebnissen.
- Richtige erstmalige Antwort: Ergebnis markieren und 10 XP buchen. Wenn dadurch alle zehn gelöst, im selben gesperrten Transaktionspfad 50 XP Abschlussbonus buchen. Vorhandenes Ledger-Unique `(player_id,reason,ref)` und Result-Key verhindern Doppelvergütung. Atomar: bei Fehler weder halbe XP-Buchung noch halber Abschluss.
- Bereits gelöste Antwort wiederholt: gespeicherten Fortschritt mit Delta 0 zurückgeben. Andere richtige letzte Frage gleichzeitig löst den Bonus ebenfalls höchstens einmal aus. Kein weiterer Login-/Free-XP-Grant.
- `progress_result` mit Cursor vor Buchung nutzen und echten Pass-State nach Abschluss aktualisieren. Season-XP stammen bereits aus dem XP-Ledger im Datumfenster; keinen zweiten XP-Zähler bauen. Tier 5 wird über bestehenden Pass-Claim abgeholt.

## 8. Arbeitspakete für DeepSeek

### S1 — Hub, Stand und Ticket unabhängig vom Halloween-Overlay

**Geplant neu:** `web/src/season/seasonHub.ts`, `web/src/render/season/spookyTeaserStand.ts`, `web/public/assets/ui/season-ticket.svg`. **Gezielt erweitern:** `ui/villageView.ts`, aktuelle HUD-/Profilintegration, i18n. Bestehenden `openLearnPass` verwenden; Collection bleibt ein separater Einstieg außerhalb dieser Begrüßung.

- [ ] Test zuerst: Normalwelt + laufende Season zeigt Stand/Ticket; Klick öffnet denselben Hub. Planned zeigt Datum, Quiz gesperrt. Themewechsel lässt Einstieg erreichbar und erzeugt keine Duplikate.
- [ ] Fertiges `assets/season-starter/halloween-shop-event.glb` samt eingebauter Katze nach Runtime kopieren; Hit-Zone und Drag-Abgrenzung ergänzen. **Modellbau ist erledigt und kein DeepSeek-Arbeitspaket.** Ticket und Hub mit echten Serverzuständen verbinden; keine neue Hauptnav. Einzelteile nur bei getrennter Anbindung verwenden; Ensemble enthält große Katze und Kessel bereits. Die kleine Katzengruppe und der eigene benchte Stand bleiben inaktiv.
- [ ] Welcome-Seen-Vertrag vom Theme entkoppeln, Tutorial-/Modal-Reihenfolge und manuellen Wiederaufruf beachten.
- [ ] Hub-Buttons und Fokus-/Lifecycle-Tests erfolgreich ausführen.

### S2 — Privat importierte Fragen und atomare XP

**Geplant neu:** nächste Migration `*_season_starter.sql`, `web/scripts/import-season-starter.ts`, `web/src/api/seasonStarter.ts`, `web/tests/sql/season-starter.test.ts`.

- [ ] Tests zuerst: zehn eindeutige Fragen, keine Lösung im Read; Lehrer/anon/fremder Schüler können nicht falsch zugreifen; geplanter/beendeter Zeitraum blockiert neue Grants.
- [ ] Privaten Seed importieren, oben beschriebenen Read-/Write-Vertrag umsetzen. Nur `choice`-/Listening-Choice-Prüfer nutzen.
- [ ] Retry, parallele letzte Antworten und erneuter Login: insgesamt exakt 150 XP, niemals 160/200. Fehlversuche mindern Starter-XP nicht; kein Einfluss auf Tagesquests/Tagesbonus/Streak/Münzen.
- [ ] Test ohne sonstige XP: zehn Lösungen → 150 Season-XP → `season_reached_tier` mindestens 5 → bestehender Claim funktioniert.

### S3 — Tablet-Klickquiz und lokale Audios

**Geplant neu:** `web/src/season/spookyQuizView.ts`, `spookyQuiz.css`, API-Adapter, vier MP3s im vorhandenen Public-Audioordner. **Tests:** `web/tests/ui/spookyQuiz.test.ts`, `web/e2e/spooky-season.spec.ts`; vorhandene Playwright-Projektauswahl für neue E2E-Datei prüfen.

- [ ] Viewtest zuerst: jede Antwort ein Button; kein `select`, `input`, Dropdown oder zusätzlicher Prüfen-Knopf; Anfrage durch einen Tap, Pending-Sperre, Fehler/Retry und Resume.
- [ ] Audios kopieren und prüfen; Player nur nach Tap, beliebig wiederholen. Keine SpeechSynthesis-Abhängigkeit. Hörtext nicht automatisch als Überschrift zeigen.
- [ ] Alle zehn Fragen mit Serverdaten darstellen; deutsche Hörbedeutungen im Kern erhalten; Texte mit `textContent` statt unkontrolliertem HTML.
- [ ] Abschluss zeigt „150 XP earned · Tier 5 reached“ nur, wenn der Server das bestätigt. LearnPass-Button öffnet echten aktualisierten Pass. Kein Demo-XP-Wert als Live-Resultat.

### S4 — Abnahme und Nachweise

```powershell
cd web
npm run test -- tests/sql/season-starter.test.ts tests/ui/spookyQuiz.test.ts
npm run typecheck
npm run build
npm run test:e2e -- e2e/spooky-season.spec.ts
```

- [ ] Neue Tests nach Implementierung grün; bestehende Season-/LearnPass-/Daily-Quest-Tests weiterhin grün.
- [ ] Tablet-Touch unter 768×1024 und 1024×768 sowie 390×844 testen; Hörclips auf echtem Schul-iPad prüfen. Desktop-Chromium allein belegt keinen iPad-Audiotest.
- [ ] End-to-end: Standardwelt → Stand → Welcome → Quiz → absichtlich falsch → korrigieren → ausloggen → weiter → 150 XP → Tier 5 → Truhe. Ohne Stempel und ohne Tutorial-/Tagesquest-XP.
- [ ] Gleichzeitig zwei Tabs, langsames Netz, Audiofehler, doppelter letzter Tap und bereits abgeschlossener Kurs. Kein doppelter Bonus, kein zusätzlicher Dialog/Audio nach Schließen.
- [ ] Gestalterische/fachliche Abnahme durch Thomas/Claude; Produktionsstartdatum nicht eigenmächtig ändern. Zuordnung 35 Passkarten/15 Truhenkarten aus r11 bleibt unverändert.

## 9. Tatsächlich vorbereitet vs. noch offen

**Vorbereitet:** gelieferter Halloween-Shop mit genau einer großen Katze und Candy Cauldron davor; kombiniertes Ensemble und drei Einzel-GLBs, gepackte bearbeitbare Blender-Datei, Builder und Reimport-Audit; drehbare Vorschau `stand.html` mit tatsächlichem Klick auf Modell/Ticket → Welcome-Dialog. Dazu dieser Integrationsauftrag, zehn vollständige Quizfragen mit privatem Lösungsschlüssel, eigenes Ticket-SVG, Audiogenerator mit bestehendem Pfadvertrag und Audio-Zuordnungsmanifest. Der Audioprüflauf nennt, ob alle vier MP3s erzeugt wurden.

**Noch durch DeepSeek zu implementieren:** fertigen Stand im normalen Dorf platzieren, produktives HUD-Ticket, Welcome-Hub mit echten Spiel-Öffnern, Quiz-RPCs/Fortschritt/XP und Tablet-View. Die Vorschau zeigt die späteren Quiz-/LearnPass-Aktionen als deaktiviert; kein Collection-Link und keine Sammelkartenwerbung im Welcome. Das bisherige `Prototyp/index.html`, Produktionscode und Live-Datenbank bleiben in diesem Schritt unangetastet. Keine Fertigmeldung dieser Produktionsfunktionen aus der Existenz der Quelldateien ableiten.

## 10. Zusatzauftrag: What’s in it? → große interaktive 3D-Ansicht

Verbindlicher Auftrag in `DEEPSEEK_WHATS_INSIDE_3D.md`: Jeder Gegenstand in der Inhaltsübersicht einer Truhe ist antippbar und öffnet ein großes dreh-/zoombares 3D-Modell. Das ist eine Vorschau, keine Vergabe, kein Kauf und kein Öffnen der Truhe.
