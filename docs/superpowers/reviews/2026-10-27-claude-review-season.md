# Test-Review: Season I & LearnPass (DeepSeek)

**Prüfer:** Claude · **Datum:** 27.10.2026 · **Branch:** `feature/season-learnpass` (36 Commits, `f0f4b32` … `e7de5e3`, nicht gepusht)
**Grundlage:** [Plan](../plans/2026-10-27-season-und-learnpass.md) §2, §3, §6, §7, §10, §14 · [Auftrag](../plans/2026-10-27-deepseek-auftrag.md) · [Bericht](deepseek-bericht.md)

## Ergebnis

**Nicht mergefähig. Eine Korrekturrunde ist nötig.**

Die Datenbank-Seite ist sauber und sehr nah am Plan:
- Schema, Rechte und RLS stimmen.
- Stufen, XP, Münzen und Chancen sind korrekt.
- Die Nachberechnung der Truhen-Serie ist idempotent.
- Die Besitzprüfung für Titel und Rahmen funktioniert.
- Die Lehrer-RPCs sperren die Saison-Zeile und schreiben ins Protokoll.

Die LearnPass-Seite trifft §14 sehr gut.

Nachtrag: Markt und Welt sind gestrichen, siehe W2/W3.

Es gibt aber **6 Blocker** (B6 aus dem Layout-Abgleich, §8):
- eine Funktion, die im echten Spiel fehlt (Stufe-40-Wahl),
- einen Fehler, bei dem Modelle aus dem Dorf verschwinden,
- einen Münzverlust bei Doppeltipp,
- falsch skalierte Modelle,
- einen roten Lint-Schritt, an dem die CI scheitert,
- falsche Seltenheiten im Fenster „What's inside?“.

Dazu kommen 5 wichtige und 6 kleinere Punkte.

## 1. Was ich selbst geprüft habe

| Prüfung | Ergebnis |
|---|---|
| `npm test` | ✅ 156 Dateien, **1004 Tests grün** |
| `npm run typecheck` | ✅ grün |
| `npx eslint src tests` (läuft in `deploy.yml`) | ❌ **20 Fehler** (siehe B4) |
| `npm run build` | ✅ grün (bekannte Chunk-Warnung, `main` 1.020 kB) |
| `npm run galerie` (36 Bilder, 3 Karten × 2 Seeds) | ✅ Dorf unverändert. Die Saison ist am 27.10. nicht aktiv, deshalb zeigt die Galerie keine Saison-Stimmung. |
| Playwright 1180×820 und 390×844, alle 8 Dev-Seiten | ✅ keine Konsolenfehler. Angesehen: LearnPass, Truhen, Shop, Profil, Lehrer, Markt, Modellschau. |
| Live-Messung im Browser (`loadGlbItem`, `Box3`) | ❌ geteilte Objekte, falsche Größen (B1, B5) |
| Diff 0028–0033 Zeile für Zeile gegen §3 | Befunde B3, W1, W5, K1, K3 |

## 2. Blocker (vor dem Merge beheben)

### B1 · GLB-Modelle sind ein einziges geteiltes Objekt

`web/src/render/glbItems.ts`:
- `loadGlbItem()` speichert **eine** Gruppe im Cache und gibt sie jedem Aufrufer zurück.
- `glbAsset()` hängt sie mit `lod.addLevel(model, 0)` ein.
- In three.js kann ein Objekt nur **einen** Elternknoten haben.

**Folgen:**
- Haben zwei Schüler dieselbe Fledermaus, verschwindet sie beim ersten Grundstück. Es bleibt eine leere LOD-Gruppe.
- `itemThumbs.ts` setzt `model.rotation.y = PREVIEW_STILL_YAW` auf genau dieses Objekt und nimmt es danach mit `scene.remove(model)` aus seinem Elternknoten. Ein Vorschaubild im Shop löscht also das Modell im Dorf und dreht es.

**Nachweis im Browser:**
- `loadGlbItem('season_bat') === loadGlbItem('season_bat')` ist `true`.
- Nach dem Öffnen des Shops haben `shop_toyoyo`, `shop_beatall`, `shop_president_car` und `shop_white_house` ein `rotation.y` von **0,60**.

**Korrektur:**
- Der Cache hält die normalisierte Vorlage. Jeder Aufrufer bekommt `template.clone(true)`. Geometrie und Material bleiben geteilt, sie werden nie `dispose`t.
- Die Vorschaubilder bekommen ebenfalls einen eigenen Klon.
- Test in `glbItems.test.ts`: Zwei `glbAsset('season_bat')` zeigen nach dem Laden beide ein Modell. Eine Vorschau ändert nichts an den Dorf-Instanzen.

### B2 · Die freie Wahl auf Stufe 40 ist im Spiel nicht angeschlossen (E7)

- `learnpassView.ts:248` ruft `actions.onPickItem` auf. `openLearnPass` reicht das an `opts.onPickItem?.()` weiter.
- `villageView.ts:526` übergibt aber **kein** `onPickItem`.
- `api.choose()` und damit `choose_season_item` wird **nirgends** aufgerufen.

Ein Schüler auf Stufe 40 tippt also auf „Pick your item“, und es passiert nichts. Die Auswahl mit den 28 Kacheln (§14.5) gibt es nicht.

**Korrektur:**
- Auswahl nach §14.5 bauen: Raster der 28 Truhen-Gegenstände mit Bild, Namen und Seltenheit.
- Bei Besitz der Hinweis „Already owned – you get X coins“ vor dem Bestätigen.
- Danach `choose()` aufrufen, Münzen aktualisieren und die Karte auf „Chosen: …“ setzen.
- In `villageView` anschließen.
- Ein UI-Test für den ganzen Ablauf.

### B3 · Shop-Truhe: Doppeltipp kostet 50 Münzen ohne Truhe

`0029_season_rpc.sql`, `buy_season_chest()`:
- Die Wochenzahl wird **vor** der Profilsperre gezählt (`select count(*)`, erst danach `select … for update`).
- Danach werden die Münzen abgebucht, und die Truhe wird mit `on conflict do nothing` eingefügt.

Bei zwei gleichzeitigen Aufrufen (Doppeltipp auf dem Tablet) zählen beide 0. Der zweite wartet auf die Sperre, bucht −50 ab und versucht dann noch einmal `shop-<Montag>-1`. Der Konflikt wird still geschluckt: **Münzen weg, keine Truhe.** Das widerspricht §3.5: „Shop-Kauf unter Profil-Sperre“.

**Korrektur:**
- Zuerst `select coins … from profiles where id = v_uid for update`, **danach** zählen.
- Das Einfügen der Truhe ohne `on conflict do nothing`, oder mit `if not found then raise exception 'weekly limit'`. Dann rollt die Abbuchung mit zurück.
- Gleiches Muster in `season_book_tier` prüfen: Dort ist der Claim der Schutz, das ist in Ordnung.

### B4 · Lint ist rot, die CI scheitert

`deploy.yml` führt `npx eslint src tests` aus. Auf dem Branch kommen 20 Fehler:
- 19 × `no-explicit-any` in `tests/sql/season-edge.test.ts`, `season-rpc.test.ts` und `teacher-season.test.ts`,
- 1 × `prefer-const` in `src/teacher/pages/season.ts:84`.

Laut Auftrag §3 ist ein Paket erst mit grünen Prüfungen fertig. Typen für die RPC-Antworten anlegen, zum Beispiel aus `api/season.ts` übernehmen, oder `unknown` mit einer Engführung verwenden.

### B5 · Normalisierung vergrößert alles auf 3 m, Autos liegen quer

`normaliseGlb()`: `scale = min(max.w/x, max.d/z, max.h/y)` **vergrößert** jedes Modell, bis es die MAX_SIZE-Box füllt. Plan §6.3 sagt aber: auf MAX_SIZE **verkleinern**, nur Deko unter 0,8 m auf 0,8 m vergrößern.

Gemessen nach dem Laden (B×H×T in m):

| Modell | Ist | Erwartet |
|---|---|---|
| `season_candle` (Grablicht) | 2,65 × **3,00** × 1,95 | etwa 0,8 m hoch |
| `season_bat` | **3,00** × 1,46 × 0,84 | etwa 0,8–1 m |
| `shop_toyoyo` | **2,40** × 1,17 × **1,15** | etwa 1,9 × 1,5 × 4,4 (Front +Z) |
| `shop_beatall` | **2,40** × 0,90 × **0,92** | etwa 1,8 × 1,4 × 4,0 (Front +Z) |
| `season_dodge` | 1,89 × 1,56 × 4,60 | ✓ |

Toyoyo und Beatall fehlt der `yaw` aus §6.2 („Länge auf X statt Z“). Darum werden sie auf 2,4 m Länge zusammengedrückt und stehen quer.

**Korrektur:**
- `scale = min(1, fit)`, also nie über die Originalgröße hinaus. Bei einer kaputten Einheit (pumpkin-cat 203 m) greift trotzdem `fit`.
- Danach die 0,8-m-Regel nur für Deko.
- Für Toyoyo und Beatall `yaw: ±Math.PI / 2` eintragen, **vor** der Box-Messung anwenden und dann einpassen.
- Ein Test, der für alle 34 GLBs die Endmaße gegen eine Erwartungstabelle prüft.
- Die Modellschau `dev/season.html` neu ansehen.

### B6 · „What's inside?“ zeigt bei 6 Gegenständen die falsche Seltenheit

`web/src/ui/learnpass/insideModal.ts` hat eine **eigene, fest eingetragene** Pool-Liste (`POOL`). Sie weicht von Datenbank (0030), Manifest und Plan §12.3 ab:

| Gegenstand | Fenster zeigt | richtig (0030, Manifest, §12.3) |
|---|---|---|
| Warlock | Epic, „sells for 100“ | **Legendary**, 250 |
| Pickup truck (Dodge) | **Legendary**, 250 | Epic, 100 |
| Witch statue | Epic | Rare |
| Pumpkin girl | Epic | Rare |
| Monster plant | Rare | **Epic** |
| Pumpkin tree | Rare | **Epic** |

Die Schüler sehen also falsche Chancen für einzelne Gegenstände. Bei Truhen mit offenen Chancen (§9 Nr. 7) ist das der eine Punkt, der stimmen **muss**.

**Korrektur:**
- Den Pool **aus der Datenbank** laden: `items` mit `season = <id>` und `lootbox_weight > 0`, Seltenheit und Verkaufswert von dort. Alternativ als Teil von `season_state()`.
- Keine zweite Liste im Client.
- Ein Test vergleicht die angezeigten Seltenheiten mit 0030.

## 3. Wichtig (in dieser Runde beheben)

### W1 · „Neueste Saison“ statt „aktuelle Saison“

`season_state`, `claim_season_tier`, `choose_season_item` und `buy_season_chest` wählen die Saison über `order by starts_on desc limit 1`.

Sobald eine Season II als **geplant** in der Tabelle steht (E25, die Lehrer-Seite zeigt das schon im Dev-Mock), passiert Folgendes:
- Alle Schüler sehen mitten in Season I nur „Season II startet …“.
- Sie können keine Stufe mehr abholen.
- Die Stufe-40-Wahl von Season I ist nicht mehr möglich. Das widerspricht E7: „auch nach Saisonende“.

**Korrektur:**
- Eine Hilfsfunktion `season_current()`: laufende Saison, sonst die zuletzt **begonnene**, sonst die nächste geplante.
- `choose_season_item(p_item_id, p_season default null)` sucht den offenen Stufe-40-Claim über alle Saisons.
- SQL-Test mit einer geplanten Season II.

### W2 / W3 · entfallen – Markt und Welt sind gestrichen

**Nachtrag 27.10. (Lehrkraft):** Halloween-Stimmung im Dorf und am Markt gehört **nicht mehr** zu diesem Plan, ChatGPT baut den Marktplatz getrennt. U6 ist gestrichen (Plan E1, §5.1, §8, §12.5, §13 Nr. 23).

Claude hat den Code dazu zurückgenommen:
- `web/src/render/plaza.ts` und `web/src/render/scene.ts` entsprechen wieder `main`.
- `web/src/world/seasonWindow.ts`, `web/tests/world/seasonWindow.test.ts` und `web/dev/season-market.html` sind gelöscht.
- In `villageView.ts` sind Kürbisbude, Banner, Hover und Tap entfernt. Profilkarte, Inventar-Badge und Shop-Truhe bleiben.
- CSS `.season-welcome` und die beiden Banner-Texte in `en.ts` sind entfernt.
- SPEC, PLAN, Anleitung und Design-README sind angepasst.

**Für dich heißt das:**
- An `plaza.ts`, `scene.ts` und anderen Welt-Dateien nichts mehr ändern.
- Keine Saison-Stimmung, kein Punktlicht, kein Blutmond im Dorf.
- Der Blutmond **auf der LearnPass-Seite** (§14.3, CSS) bleibt, das ist Oberfläche.

### W4 · Lehrer-Reiter „Saison“

Im Vergleich mit §3.6:
- **Jetzt starten** und **Daten speichern** laufen ohne Bestätigung. Laut Plan gilt „jeweils mit Bestätigung“. Beim Speichern gehört der Hinweis zu den abgeholten Stufen in die Rückfrage.
- Fehlermeldungen kommen roh aus der Datenbank, auf Englisch, zum Beispiel `end must be Sunday`. Sie müssen auf Deutsch übersetzt werden: „Das Ende muss ein Sonntag sein.“, „Überschneidet sich mit …“.
- Die Daten werden als `2026-10-22 – 2026-11-01` angezeigt. Richtig ist `22.10.2026 – 01.11.2026`.
- Eine geplante Saison zeigt „0 Tage übrig“. Richtig ist „startet am 01.02.2027“.

### W5 · „Jetzt beenden“ am Start- oder Folgetag scheitert

`teacher_end_season_now` setzt `ends_on = heute − 1`. Ist die Saison heute oder gestern gestartet, verletzt das `check (ends_on > starts_on)`, und die Lehrkraft bekommt einen Datenbankfehler.

**Korrektur:**
- Die Prüfung auf `ends_on >= starts_on` lockern.
- `ends_on = greatest(heute − 1, starts_on)` setzen und bei `starts_on = heute` direkt `closed_at` setzen.
- Mit SQL-Test.

### W6 · Englische Namen fehlen für Shop-Artikel und Szenen

- Im Shop steht bei englischer Oberfläche **„Blockhütte“, „Weißes Haus“, „Präsidentenwagen“** (Screenshot `shop-season`). §14.7 und §5.5 verlangen englische Namen.
- Die Namen liegen an zwei Stellen: `ITEM_NAMES` und `NAMES`/`NAMES_DE` in `seasonChests.ts`.
- Korrektur: **eine** Quelle für alle 46 neuen IDs (28 + 12 + 6), Englisch und Deutsch, von Shop, Inventar, Bauen, LearnPass und What's inside gemeinsam genutzt.
- Außerdem steht `TIER` in `learnpassView.ts` fest im Code statt über `tr()` („Stufe“ auf Deutsch).
- Test: Jede neue Item-ID hat einen englischen und einen deutschen Namen.

### W7 · Button im Button

Jede Karte ist ein `<button class="lp-card">`, darin steckt der Abholen-Button `<button class="lp-btn">`.
- Das ist ungültiges HTML.
- Screenreader lesen es doppelt.
- Auf iPad-Safari kann der äußere Klick den inneren schlucken.

**Korrektur:** Die Karte wird ein `<article>` (oder `div` mit `role="group"`) mit `aria-label`. Nur „Collect“ ist ein Button. „Jump to tier“ scrollt per `scrollIntoView`.

## 4. Kleiner (gern in derselben Runde)

| Nr | Stelle | Befund | Vorschlag |
|---|---|---|---|
| K1 | `claim_season_tier` | `perform season_finish_player(...)` steht direkt vor `raise exception 'season ended'`. Die Ausnahme rollt die Gutschrift wieder zurück, der Aufruf ist wirkungslos. | Entfernen. Die Gutschrift erledigt `season_state`. |
| K2 | `glbAsset` | `lod.remove(placeholder)` lässt den Platzhalter in `lod.levels` stehen. | `lod.removeLevel(0)` vor `addLevel`, oder Platzhalter als eigenes Kind außerhalb des LOD. |
| K3 | `coin_ledger.ref` | Stufenmünzen haben `ref = 'tier-5'` ohne Saison und sind ab Season II nicht mehr eindeutig. | `'season:<id>:tier-5'`, ebenso `season_dup:` und `season_choice:`. |
| K4 | Tests | Chancen-Test mit 400 Ziehungen. §7 Nr. 4 verlangt 10.000 mit ±2 %. Die Playwright-Abläufe aus §7 (Abholen, Truhe öffnen, Shop-Truhe kaufen, Stufe-40-Wahl, Sprachwechsel) fehlen. | Auf 10.000 erhöhen und mindestens einen E2E-Ablauf auf einer Harness-Seite mit Mock-API anlegen. |
| K5 | Willkommensbanner | Erscheint bei **jedem** Laden des Dorfs. | Nach dem Schließen pro Saison merken (`localStorage`, in try/catch). |
| K6 | Bericht | „58–433 Draw Calls“ ohne Bezug zur Grenze aus SPEC §16 (gesamt < 150, Welt < 60). Meine Galerie zeigt gesamt bis 433, Welt bis 113. Da die Saison heute nicht aktiv ist, kommt das **nicht** von diesem Branch. Der Bericht muss Überschreitungen aber benennen. | Im nächsten Bericht: Zahlen auf `main` und auf dem Branch, mit und ohne Saison, gegen die SPEC-Grenzen. |

## 5. Was gut ist (bitte so lassen)

- **0028:** entspricht §3.1 fast wörtlich. RLS, `revoke` und `grant select` sind vollständig, die Sequenzen gesperrt. Die Sonntagsprüfung in die Funktion zu verlegen, ist sinnvoll und im Bericht begründet.
- **0030:** XP-Stufen (30/60/90/120 → 3.000), Münzen (5 auf 1–20, +25 auf Meilensteinen = 300), Truhen, Titel, Rahmen und Szenen stimmen mit §4.1 überein. Die Nachberechnung der Serie ist idempotent und rechnet nur im Fenster.
- **0029:** Die Würfel stimmen (3/12/30/55), die Einzelstück-Regel und das zweite Öffnen ohne Buchung funktionieren. `sell_item` rechnet korrekt mit „Inventar enthält auch platzierte Exemplare“. Hilfsfunktionen haben kein `execute`-Recht.
- **0032/0033:** Sperren, Überschneidungsprüfung und Protokoll. `set_title` und `set_frame` prüfen bei Season-Einträgen den Besitz.
- **LearnPass-Seite:** Kopf, Stand-Leiste, „Du“-Marke, Kartenspur, Meilensteine, untere Kacheln und Handy-Layout treffen §14 sehr genau.
- **Pass-Szenen:** werden pro Grundstück geklont (`scene.clone(true)`). Genau so muss es auch B1 machen.

## 6. Vorgehen für die Korrekturrunde

1. Auf `feature/season-learnpass` weiterarbeiten, **nicht** nach `main`.
2. Reihenfolge: B4 → B3 → W1 → W5 → K1 → K3 (SQL), dann B1 → B5 → K2 (3D), dann B6 → B2 → L1–L9 (§8) → W6 → W7 → W4 → K5 (Oberfläche), dann K4 (Tests). W2/W3 entfallen.
3. **Keine** neuen Migrationen für die Korrekturen. Die Dateien 0028–0033 sind noch nirgends eingespielt und dürfen direkt geändert werden.
4. Ein Commit pro Befund, Nachricht mit der Befund-Nummer, zum Beispiel `fix(season): B3 lock profile before counting shop chests`.
5. Am Ende `deepseek-bericht.md` um den Abschnitt „Korrekturrunde 1“ ergänzen. Dort pro Befund: erledigt, Commit, Nachweis (Test-Name oder Screenshot). Dazu Lint, Tests, Build, Galerie mit und ohne Saison.

## 7. Hinweis zum Live-Gang

Erst nach dieser Runde und meiner Nachprüfung mergen. Wichtig ist außerdem die Reihenfolge der Aufträge:
- Ein Push nach `main` spielt die Migrationen über `migrate.yml` **sofort** in die echte Datenbank ein.
- Für die offene Beta ist ein Release mit Sicherung und Freigabe geplant ([Beta-Betrieb](../plans/2026-10-27-beta-betrieb.md), Stufe 1).
- Die Saison sollte erst über diesen Weg live gehen. Die XP zählen ab 28.10. rückwirkend, es geht also nichts verloren.

## 8. Layout-Abgleich LearnPass gegen §14 (Nachtrag 27.10.)

Geprüft im Browser mit 1180 × 820 und 390 × 844. Verglichen habe ich mit den Referenzbildern in `docs/superpowers/designs/learnpass/` und mit Maßen, die ich direkt im Browser gemessen habe (`getComputedStyle` und `getBoundingClientRect`).

### Stimmt mit §14 überein

| Was | Soll | Ist |
|---|---|---|
| Karte normal / Meilenstein / Stufe 40 | 156 × 252 / 196 × 284 / 230 breit | ✓ 156 × 252 / 196 × 284 / 230 × 284 |
| Radius, Rand, Schatten | 18, 2 px `#3d2c52`, `0 10px 24px #0008` | ✓ |
| Abstand, Innenrand, Spurhöhe | 14 px, 40 px, ≈ 330 px | ✓ 14 / 40 / 330 |
| Wischen | `overflow-x: auto`, `pan-x`, Snap x, Karte mittig | ✓ |
| Beim Öffnen steht die aktuelle Stufe in der Mitte, „YOU“-Schild, „Jump to tier 12“ | ✓ | ✓ |
| Stufen-Abzeichen, Schließen | 64 × 70, 48 × 48 | ✓ |
| Panels | `#160e22` 85–90 %, Blur 6–8 px | ≈ (80 % Deckkraft, Blur 7 px) |
| Titel | Comic Neue 700, groß, 40 / 30 px | ✓ Größe und Gewicht, aber siehe L6 |
| Zustände | Abgeholt grün `#a6e05a`, bereit pulsiert, gesperrt entsättigt | ✓ |
| Fokus, „Weniger Bewegung“ | 3 px `#ffd16d`, Abstand 3 | ✓ |
| Handy | Kacheln untereinander, kein waagerechtes Scrollen der Seite | ✓ |
| Spur-`aria-label` | „LearnPass tiers, swipe left and right“ | ✓ |
| Untere Kacheln | vier, Texte nach §14.7 | ✓ bis auf L8 |

### Abweichungen (korrigieren)

| Nr | §14 | Soll | Ist |
|---|---|---|---|
| **L1** | 14.4 | „What's inside?“: Überschrift „What's inside a season chest?“, der Satz aus §14.7, **vier Bänder Legendary → Normal**, links große Prozentzahl und „LEGENDARY · 2 ITEMS“, rechts ein Raster mit **3D-Vorschaubildern** (≥ 78 px, Rand in Seltenheitsfarbe, Name darunter) | Balken oben in umgekehrter Reihenfolge (Common → Legendary), darunter eine **Textliste ohne Bilder** mit „sells for …“. Die Überschrift ist nur „What's inside?“, der Satz fehlt. Verkaufswerte gehören nicht ins Fenster. Seltenheiten falsch (B6). |
| **L2** | 14.2 | Bilder je Belohnung: echte **3D-Truhe** `createChestModel('big')` in `#5b2c6f`, Münzstapel mit Stern-Prägung, `titlePlaque()`, Porträt im Season-Rahmen, **gerenderte Pass-Szene**, Stufe 40 = Warlock + Horror-Haus. Lichtschein hinter jedem Bild in der Farbe aus der Tabelle. „Keine Emojis, keine flachen Symbole“ | Alles sind **flache SVGs** (Truhe, Münzen, eigenes Titelschild). Es gibt **keinen Lichtschein**. Im Kopf steht das Schloss als Emoji 🔒. Das Design-README nennt das als Abweichung, der Plan erlaubt es aber nicht. Die 3D-Bilder sollen über **einen** Vorschau-Renderer (`itemThumbs`) laufen, zwischengespeichert, mit SVG nur als Rückfall ohne WebGL. |
| **L3** | 14.1 / 14.2 | Unter **jeder** Karte ein Punkt auf einer geraden Schiene, die mit der Spur scrollt. 4 px, bis zur aktuellen Stufe orange-gold gefüllt, Punkte 14 px, die aktuelle Stufe 22 px Gold mit Hof | Eine **eigene Punktreihe** mit 40 dicht gedrängten Punkten (`.lp-rail`, 1136 px breit, fest). Die Punkte stehen nicht unter ihren Karten und scrollen nicht mit (vergleiche `learnpass-tablet.png`). |
| **L4** | 14.3 | Silhouette (Friedhof, Dächer, Kreuze `#0d0814`) hinter dem Kopf, Nebelstreifen `#2a1f3a66` hinter der Spur, Blutmond als Verlaufskugel mit Hof | Keine Silhouette, kein Nebelstreifen. Der Mond besteht aus harten konzentrischen Ringen, die bis in die Chips reichen. |
| **L5** | 14.5 | Profilkarte: Blutmond-Ecke, „SEASON I · HALLOWEEN“, Chip „Tier 12“, **Balken**, „26 days left · 1 chest waiting“, Knopf **Open LearnPass** | Eine schmale Zeile mit Truhen-Symbol, „Tier 12 of 40 · 26 days left“, Abzeichen ×2 und Pfeil. Balken, Chip, Mond-Ecke und Knopf fehlen. Auf 390 px läuft die Karte im Dev-Harness rechts über den Rand. |
| **L6** | 14.6 | Schrift **lokal** einbinden (kein CDN), Titel mit 2 px Ruß-Kontur | Es gibt keine `@font-face` für Comic Neue. Der Browser nimmt Comic Sans MS (Windows) oder `system-ui` (iPad). Die Kontur fehlt (`-webkit-text-stroke: 0`). **Korrektur:** Comic Neue 700 als `woff2` unter `web/public/fonts/` (OFL), Eintrag in `LICENSES.md`, Kontur ergänzen. |
| **L7** | 14.2 / 14.6 | Kopfzeile der Karte 30 px. Abgeholt: grünlicher Rand und grünes ✓. `aria-label` wie „Tier 12: Title Pumpkin Rookie, + 5 coins, ready“. Tippflächen ≥ 44 px, Hauptknöpfe ≥ 48 px. Pfeiltasten scrollen die Spur. | Kopf 24 px. Bei abgeholten Karten bleiben Rand und ✓ grau. Das `aria-label` ist nur „Tier 12: New title, ready“, ohne Titelname und Münzen. „Collect“ ist 36–40 px hoch. Pfeiltasten bewegen die Spur nicht: gemessen 2 px, dann zieht das Einrasten zurück. **Korrektur:** Pfeil links/rechts scrollt um eine Karte (`scrollBy` mit Kartenbreite). |
| **L8** | 14.1 | Pass-Truhe: „From tier 10“. Shop-Kachel: Münzbild, **Buy mit Bestätigung** | „From the pass“. Truhenbild statt Münze. **Buy kauft sofort ohne Rückfrage** (geprüft: kein `confirm`, kein Dialog). |
| **L9** | 14.5 | Truhe öffnen: vorhandene 3D-Truhe wackelt → Strahlenkranz und Rand in Seltenheitsfarbe → **Bild des Gegenstands 160 px**, Abzeichen, Name, „New! It's in your inventory now.“ / „Duplicate – sell for 40 coins“ / „Already owned – 100 coins“, **Next** | Flache SVG-Truhe, Abzeichen und Name, aber **kein Bild des Gegenstands**, kein Strahlenkranz. Der Text lautet „New in your collection“. |
| (B2) | 14.5 | Stufe-40-Wahl: Raster mit 6 Spalten (Handy 4), „owned“, Auswahlrand, Hinweis und **Pick this item** mit Rückfrage | fehlt ganz, siehe B2 |

**Prüfung nach der Korrektur:**
- Playwright `web/e2e/learnpass.spec.ts` (§14.8) mit Screenshots 1180 × 820 und 390 × 844 von Seite, Fenster „What's inside?“, Profilkarte, Truhe öffnen und Stufe-40-Wahl.
- Jedes Bild neben das Referenzbild aus `docs/superpowers/designs/learnpass/` legen und im Bericht als Paar nennen.

## 9. Korrekturrunde – umgesetzt von Claude (27.10.2026)

Die Lehrkraft hat entschieden, dass Claude die Korrekturen selbst umsetzt und sie die Abnahme macht. DeepSeek arbeitet an diesem Branch nicht weiter. Noch nichts ist committet.

**Prüfungen nach der Runde:**
- `npm test`: 157 Dateien, **1019 Tests grün**.
- `npm run typecheck` grün, `npx eslint src tests` grün, `npm run build` grün.
- `npm run galerie`: 36 Bilder; die Welt-Draw-Calls sind in allen 36 Ansichten **gleich** wie vor der Runde. Markt und Dorf sind unverändert.
- Screenshots 1180 × 820 und 390 × 844 liegen in `docs/superpowers/designs/learnpass/korrektur/`: Seite (EN und DE), „What's inside?“, Stufe-40-Wahl, Truhe öffnen, Profilkarte, Shop-Kachel. Keine Seite scrollt seitlich.

| Befund | Status | Wo |
|---|---|---|
| B1 geteiltes 3D-Objekt | ✅ Jeder Aufrufer bekommt einen Klon. Test mit zwei Grundstücken und einer Vorschau | `render/glbItems.ts`, `tests/render/glbItems.test.ts` |
| B2 Stufe-40-Wahl | ✅ Auswahl mit 28 Bildern, „schon da“, Münz-Hinweis, zweiter Tipp zum Bestätigen | `ui/learnpass/seasonPick.ts`, `openLearnPass.ts` |
| B3 Doppeltipp Shop-Truhe | ✅ Erst Profilsperre, dann zählen; kein stilles `on conflict` | `0029` `buy_season_chest` |
| B4 Lint | ✅ grün | Tests mit Typen statt `any` |
| B5 Größen und Autos | ✅ Nie größer als modelliert, kleine Deko auf 0,8 m (längste Seite), Toyoyo/Beatall um 90° gedreht, beide Katzen auf ≈ 1 m gedeckelt. Gemessen: Grablicht 0,8 m, Fledermaus 0,8 m, Toyoyo 2,16 × 4,51 m, Beatall 1,77 × 4,60 m | `render/glbItems.ts` |
| B6 falsche Seltenheiten | ✅ Pool kommt aus `items` (Datenbank) | `api/season.ts` `pool()`, `insideModal.ts` |
| W1 aktuelle Saison | ✅ `season_current()`; die Wahl richtet sich nach dem offenen Claim, nicht nach dem Kalender. SQL-Tests mit geplanter und laufender Season II | `0029` |
| W2/W3 | entfällt (Markt und Welt gestrichen) | – |
| W4 Lehrer-Reiter | ✅ Rückfrage auch bei „Jetzt starten“ und „Daten speichern“, deutsche Fehlermeldungen, Daten als TT.MM.JJJJ, geplante Saison „startet am …“ | `teacher/pages/season.ts`, `tests/teacher/seasonPage.test.ts` |
| W5 Beenden am Starttag | ✅ Prüfung `ends_on >= starts_on`, Ende frühestens am Starttag, Abschluss über die interne `season_close_now` | `0028`, `0029`, `0032`, SQL-Test |
| W6 englische Namen | ✅ Alle 46 neuen IDs in `ITEM_NAMES` (Deutsch) und `en.ts` (Englisch), eine Quelle für Shop, Inventar, Bauen und Pass | `i18n/itemNames.ts`, `i18n/en.ts` |
| W7 Button im Button | ✅ Karte ist `<article>`, nur „Collect“/„Pick“ sind Buttons | `learnpassView.ts` |
| L1 What's inside | ✅ Vier Bänder Legendary → Normal, Prozent groß, 3D-Bilder, Text nach §14.7, ohne Verkaufswerte; öffnet aus Pass, Inventar und Shop | `insideModal.ts` |
| L2 Karten-Bilder | ✅ 3D-Truhe (lila), Münzstapel mit Stern, `titlePlaque()`, eigenes Porträt im Season-Rahmen, gerenderte Szene, Stufe 40 = Warlock + Horror-Haus, Lichtschein je Art; Schloss und Haken als SVG | `rewardArt.ts`, `itemThumbs.ts` (wartet jetzt auch auf Pass-Szenen) |
| L3 Schiene | ✅ Ein Punkt unter jeder Karte, Schiene scrollt mit, bis zur aktuellen Stufe gefüllt | `learnpassView.ts` |
| L4 Stimmung der Seite | ✅ Silhouette, Nebelstreifen, Mond als Verlauf mit Hof | `learnpass.css` |
| L5 Profilkarte | ✅ Mond-Ecke, Titel, Chip „Tier 12“, Balken, „26 days left · 2 chests waiting“, Knopf „Open LearnPass“ | `seasonCard.ts` |
| L6 Schrift | **Korrektur meines Befunds:** Comic Neue ist im Spiel über `style.css` eingebunden, es fehlte nur auf DeepSeeks Testseite. Ergänzt ist die 2-px-Kontur des Titels | `learnpass.css` |
| L7 Kartendetails | ✅ Kopf 30 px, abgeholt mit grünem Rand und grünem Haken, `aria-label` mit Titelname und Münzen, „Collect“ ≥ 44 px, Pfeiltasten springen eine Karte weiter | `learnpassView.ts`, `rewardArt.ts` |
| L8 Kacheln | ✅ „From tier 10“, Münzbild beim Kaufen, Kaufen mit Rückfrage (zweiter Tipp) | `learnpassView.ts` |
| L9 Truhe öffnen | ✅ 3D-Truhe wackelt, dann Strahlenkranz und Rand in Seltenheitsfarbe, Bild 160 px, Texte nach §14.7 | `seasonChests.ts` |
| K1 toter Aufruf | ✅ entfernt | `0029` |
| K2 LOD-Platzhalter | ✅ Platzhalter liegt außerhalb des LOD | `glbItems.ts` |
| K3 Münz-Referenzen | ✅ `season:<id>:tier-N`, `…:choice:…`, `…:shop-…` | `0029` |
| K4 Tests | ✅ 10.000 Würfe ±2 Punkte; neue UI-Tests für Wahl, Kaufen, Karten, Schiene, Profilkarte. Einen echten Playwright-E2E-Lauf gibt es weiter nicht, die Screenshots entstehen aus den Harness-Seiten | `tests/` |
| K5 Banner | entfällt (mit Markt gestrichen) | – |
| K6 Draw Calls | Bleibt offen und gehört nicht zu diesem Branch: Die Welt liegt in der Galerie bei bis zu 113 Draw Calls (SPEC: < 60), schon auf `main` | – |

**Zusätzlich gefunden und behoben:**
- **Die SQL-Tests hingen am Datum 27.10.** Ab morgen wären sie rot geworden. Jetzt liest jede Saisonregel `public.season_today()`, und die Tests stellen diese Uhr fest ein (`tests/sql/seasonClock.ts`).
- **Die vier Season-Rahmen fehlten** in `frames.ts`. Im Profil wäre der Holzrahmen erschienen (Plan §9 Nr. 5). Jetzt gibt es Kürbis, Spinnennetz, Grabstein und Hexenkessel mit eigenem Motiv.
- **Vorschaubilder der Pass-Szenen** zeigten nur den Platzhalter, weil `itemThumbs` nicht auf die Szene wartete.
- **Seltenheits- und Rahmen-Namen** wurden beim Laden des Moduls übersetzt und blieben bei einem Sprachwechsel in der alten Sprache.
- **Knöpfe im Inventar, Shop und Profil** wurden vom allgemeinen Stil `.panel button` überdeckt und waren nicht orange.

**Offen für die Abnahme (R2):**
- Die Screenshots in `docs/superpowers/designs/learnpass/korrektur/` neben die Entwurfsbilder legen.
- Die Größen auf dem Grundstück im echten Dorf ansehen. Das geht erst mit Datenbank, also in der Test-Umgebung.
- Ein Durchlauf gegen eine echte Supabase-Datenbank fehlt. Die Migrationen 0028–0033 sind noch nirgends eingespielt.
