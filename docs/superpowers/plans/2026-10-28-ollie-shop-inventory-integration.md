# Ollies Marktstand, Shop und Inventory — Implementierungsplan

> Für die Umsetzung: `executing-plans` oder nach ausdrücklicher Delegation
> `subagent-driven-development` verwenden. Die Aufgaben unten einzeln umsetzen
> und anhand ihrer Abnahmekriterien prüfen. Die Produktionsintegration wurde am
> 28.10.2026 freigegeben. Kein Commit, Push oder Live-Migration.

**Umsetzungsstand 28.10.2026:** AP 1–5 im Produktionscode integriert.
Isolierter Shop-Commit: 1.261 Tests (voller Arbeitsstand: 1.267);
15 Shop-Browserprüfungen; Produktionsbuild und
Migrationsprüfung erfolgreich. 72 Dorfansichten und 300 Layouts geprüft.
AP 6 ist softwareseitig geprüft, die echte Tablet-FPS-Abnahme und das
Nutzerreview bleiben offen. Der gezielte Shop-Harness enthält die 14 neuen
Waren; bestehende Starter-, Avatar-, Season-Verkaufs- und Truhenfälle werden
zusätzlich durch die bestehenden Regressionstests geprüft.
Vorher-/Nachher-Messung: +10 Calls, −34 bis +846 Dreiecke am Marktplatz
(24 Bewohner, drei Karten, beide Themen). Die alten globalen Budgets sind
weiterhin überschritten. Details: [Integrationsnotiz](../../OLLIE_SHOP_INTEGRATION.md).

**Ziel:** Den normalen Dorf-Shop gestalterisch und interaktiv nach
`Prototyp/shop/` erneuern, Ollie als dauerhaften Händler am Marktplatz einbauen
und das vorhandene Inventar vollständig erhalten. Englische Bezeichnung:
**Inventory**, deutsche Bezeichnung: **Inventar**. Kein zusätzliches „Bag“-System.

**Klarstellung der Lehrkraft:** Es gibt insgesamt **genau einen Shop**. Der
vorhandene Shop erhält das neue UI und alle 14 unten aufgeführten Gegenstände.
Ollies Stand, Haus-Menü und Kleiderschrank öffnen denselben Shop mit demselben
Katalog und Kaufpfad. Kein zweiter Ollie-Shop, Häuser-Shop oder Season-Shop.
Die Season-Truhenkachel bleibt Teil dieses einen Shops. Der Spooky-Stand öffnet
Welcome/Quiz/LearnPass und ist keine zweite Verkaufsoberfläche.

**Architektur:** Die bestehende Item-API, Kauf-RPC und Bereichsnavigation bleiben
die Grundlage. Der Prototyp liefert Gestaltung, Händler und Interaktionen;
Demo-Geld und Demo-Besitz werden nicht übernommen. Die freigegebenen neuen Waren
werden dem bestehenden Katalog hinzugefügt. Shop und Inventory
teilen Karten, Filter und Detailaktionen, haben aber unterschiedliche Aufgaben.

**Technik:** TypeScript strict, Vite, Three.js 0.170.0, Supabase/RLS/RPC,
vorhandenes i18n, Sound-System, Vitest und Playwright. Keine neue UI-Bibliothek.

## 1. Verbindliche Entscheidungen

1. `Inventory` ist der englische Name des **existierenden Inventars**. Interne
   bestehende Kennungen wie `inventar`, `ItemOrigin` und RPC-Namen bleiben erhalten.
2. Shop: tatsächliches kaufbares Sortiment. Inventory: tatsächlicher Besitz,
   einschließlich Starter, Mengen, Platzierungen und Season-Truhen.
3. Bestehende Kategorien: `house`, `garage`, `car`, `deco`, `avatar`.
   Anzeigen als Houses / Garages / Vehicles / Garden & decor / Avatar bzw.
   passende deutsche Übersetzungen. Die drei Demo-Kategorien nicht übernehmen.
4. Kategorien ohne aktuelle Treffer dürfen sichtbar bleiben; keine Artikel
   künstlich hinzufügen. „All items“ ist ein Filter, kein neuer Datenbank-Kind.
5. Preise, Freigaben und Besitz kommen aus dem vorhandenen System. Kein Startgeld
   von 180, kein Reset-demo-Knopf und keine lokale Münzbuchung. Die unten
   freigegebenen Prototyp-Waren werden mit den festgelegten Preisen integriert.
6. Häuser, Garagen, Autos und Avatarartikel folgen der existierenden Einmalregel;
   Deko darf mehrfach gekauft werden. `purchaseState()` verwenden.
7. Ollies normaler Stand bleibt in Normal- **und** Halloween-Welt vorhanden.
   Der separate Spooky-Stand behält Welcome, Quiz und LearnPass.
8. Sammelkarten bleiben in **Collection → Cards** und ihren eigenen Tabellen.
   Gegenstands-Inventar, Merkliste und Kartenbesitz nicht zusammenlegen.
9. Merkliste zunächst nur im Arbeitsspeicher je angemeldeter Sitzung. Keine
   neue Tabelle oder persistente Browser-Übernahme zwischen Schülern auf Tablets.
10. Englische Spieleroberfläche standardmäßig; deutsche Übersetzung über i18n.
    Lehreroberfläche weiterhin Deutsch. Keine echten Schülerdaten/Analytics.
11. Ursprünglich ElevenLabs nur vorbereiten; am 28.10.2026 ausdrücklich zusätzlich
    beauftragt: zwölf feste lokale Aufnahmen mit Charlie (en/de). 989 Zeichen aus
    vorhandenem Kontingent. Kein Key im Client, keine TTS-Anfragen im laufenden Spiel.
12. Historische Migrationen, bestehende Modelle und `Prototyp/index.html` nicht
    verändern. Prototyp als Review-Referenz erhalten. Neue Gegenstände über eine
    neue Inhaltsmigration in bestehende Tabellen eintragen. Keine neuen Tabellen,
    Kategorien, Item-Kinds, Slots, Währungen oder Kauf-RPCs. Migration lokal testen;
    nicht automatisch in die Live-Datenbank einspielen.

### Freigegeben: 14 Gegenstände im bestehenden Shop

Diese Freigabe ersetzt die frühere Aussage, neue Waren seien ein separater
Auftrag. Auch Little Blue Cottage aufnehmen; nicht durch andere Häuser ersetzen.

| Quelle / Prototyp-ID          | Englischer Anzeigename | Bestehender Kind | Münzen |
| ----------------------------- | ---------------------- | ---------------- | -----: |
| `shop/lantern`                | Evening Lantern        | `deco`           |     40 |
| `shop/bench`                  | Sunday Bench           | `deco`           |     55 |
| `shop/flowers`                | Pocket Meadow          | `deco`           |     25 |
| `shop/reading`                | One More Chapter       | `deco`           |     65 |
| `shop/oak`                    | Little Big Oak         | `deco`           |     45 |
| `shop/duck`                   | Emotional Support Duck | `deco`           |     20 |
| `shop/barrel`                 | Rainy-Day Barrel       | `deco`           |     35 |
| `shop/apples`                 | The Apple of My Eye    | `deco`           |     10 |
| `shop/cottage`                | Little Blue Cottage    | `house`          |    140 |
| `hauswerkstatt/apfelgiebel`   | Apple Gable Cottage    | `house`          |    100 |
| `hauswerkstatt/mooswinkel`    | Moss Corner Cottage    | `house`          |    125 |
| `hauswerkstatt/laternenhaus`  | Lantern House          | `house`          |    150 |
| `hauswerkstatt/apfelgarage`   | Apple Gable Garage     | `garage`         |     75 |
| `hauswerkstatt/mooswerkstatt` | Moss Workshop          | `garage`         |    100 |

Quellen: `Prototyp/shop/` und `Prototyp/hauswerkstatt/`. Die erste Spalte bezeichnet
die Quelle, keine ungeprüft zu übernehmende Datenbank-ID. Ollie, Marktstand,
Ladenschild und Kookaburra sind öffentliche Ausstattung, keine Verkaufsartikel.
Bücherregal und Apfelkiste sind `deco`; keine Möbel-/Food-Kategorie und keine neuen
Innenräume. Die Demo-Filter `home`, `garden`, `extras` nicht ins Backend übernehmen.

## 2. Was schon existiert — nicht neu erfinden

| Funktion         | Aktueller Vertrag                                                                    | Konsequenz                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Shop / Inventar  | `ui/shopView.ts`: `openShop`, `openItemArea`; `ui/inventoryView.ts`: `openInventory` | Bestehende Einstiege und `AreaHandle.close()` erhalten                                        |
| Bereichswechsel  | `ui/villageView.ts`, `ui/areas.ts`                                                   | Inventory öffnet `areas.select('inventar')`; Haus, Dorf und Kleiderschrank bleiben erreichbar |
| Item-Buch        | `api/items.ts`: `ItemEntry`, `supabaseItemApi`, `purchaseState`                      | `owned`, `free`, `placedIn`, `fits`, `starter`, `shopVisible` nutzen                          |
| Kauf             | `ItemApi.buy(id)` → `buy_item(p_item_id)` → `{coins, qty}`                           | Nur Serverantwort als neue Wahrheit übernehmen                                                |
| Detailaktionen   | `ui/itemDetail.ts`: `openItemDetail`                                                 | Kauf, Bestätigung, Platzieren, Anziehen, Verkaufen und Platzansicht nicht verlieren           |
| Truhen           | `ui/seasonShop.ts`, `ui/seasonChests.ts`                                             | Shop-Kaufkachel und Inventar-Truhen mit bestehenden Limits/Beständen erhalten                 |
| Bilder / Modelle | `render/itemThumbs.ts`, `render/glbItems.ts`, `render/itemOrbitView.ts`              | Tatsächliche Modelle und vorhandene Caches verwenden                                          |
| Audio            | `ui/sound.ts`: `Sound`, `SoundName`, `SOUND_FILES`                                   | Globalen Soundschalter nutzen; keine zweite Prototyp-Audioinstanz                             |
| Sprache          | `i18n/index.ts`, `i18n/en.ts`, `itemName()`                                          | UI- und Artikelnamen lokalisieren; keine englischen Texte fest einbetonieren                  |

### Zwei beim Lesen gefundene Integrationsfallen

**Artikel-Metadaten:** `api/economy.ts:loadCatalog()` selektiert bereits `season`
und `description`, übernimmt beide aktuell aber nicht in das zurückgegebene
`CatalogItem`. `buildItemBook()` erwartet diese Felder. Vor dem UI-Umbau gezielt
testen und die Zuordnung ergänzen; sonst fehlen Beschreibung und Erkennung
verkaufbarer Season-Gegenstände. Beschreibung ist derzeit englischer Inhalt;
nicht als deutsche Übersetzung ausgeben.

**Season-Blöcke:** `shopView.ts` hängt Truhenkacheln vor dem ersten Zeichnen in
`content`, während `draw()` anschließend `content.replaceChildren()` aufruft.
Die neue Struktur braucht einen stabilen Season-Container neben dem austauschbaren
Katalog. Einen Regressionstest schreiben: Truhen bleiben nach Laden, Filterwechsel
und Kauf erhalten. Nicht mit dem normalen Artikel-Grid wieder entfernen.

## 3. Zielverhalten

### Shop

- Oben Shop / Inventory, echtes Guthaben, Schließen bzw. Zurück zum vorherigen
  Bereich. Bei Start am Markt zurück ins Dorf; bei Start aus dem Kleiderschrank
  zurück dorthin. Bestehende Navigation aus dem Haus weiter unterstützen.
- Warenliste mit Thumbnail, verständlichem Namen, Preis, Besitzanzeige und Herz.
  Keine erfundenen Produktgrößen oder Demo-Sprüche zu echten fremden Artikeln.
- Suche und Kategorien kombinieren, anschließend optional „Saved“ filtern.
  Merkliste kann auch ungekaufte Artikel enthalten; daraus folgt kein Besitz.
- Artikelauswahl zeigt große dreh-/zoombare Vorschau, Beschreibung und passende
  Aktion. Tablet: große direkte Schaltflächen, kein Dropdown, mindestens 48 px.
- Bestätigung zeigt Preis und voraussichtliches Restguthaben. Bei laufendem Kauf
  Bestätigung sperren. Erfolg erst nach RPC-Antwort; bei Deko neue Gesamtmenge zeigen.
- Lehrer-Shop-Sperre und fehlendes Guthaben erklären. Kein Umgehen der Sperre
  durch den klickbaren Marktstand. Betrachten/Inventory bleiben erreichbar.

### Inventory

- Keine Kaufpreise als Hauptaktion. Je Item: **Owned / Placed / Available**, bei
  Avatarteilen geeignete Besitz-/Kompatibilitätsanzeige. Starter enthalten.
- **Place** nur bei `buildOpen && free > 0`; anschließend vorhandener Baumodus.
- **Wear** führt in den vorhandenen Kleiderschrank, mit Artikel-Vorauswahl.
- **Show placement** nutzt `onShowSlot`; bereits aufgestellte Dinge nicht als
  freie Exemplare ausgeben. Nichts allein durch das Betrachten entfernen.
- **Sell** nur nach vorhandenen Season-Regeln und über `SeasonApi.sell`.
  Aufgestellte oder anderweitig gesperrte Exemplare nicht anbieten.
- Season-Truhen oberhalb/neben den Gegenständen mit Öffnen und bestehendem Reveal.
  Leeres Artikel-Inventar darf vorhandene Truhen nicht verstecken.
- Header-Zähler beschreibt eindeutig, was er zählt: unterschiedliche sichtbare
  Gegenstandsarten, **nicht** Gesamtmenge, Karten oder ungeöffnete Truhen.
  Truhen-Badge gesondert aus den vorhandenen Season-Beständen ableiten.

## 4. Arbeitspakete in Reihenfolge

### AP 0 — Ausgangsstand und bestehende Verträge sichern

**Dateien:** Lesen: `CLAUDE.md`, `docs/LOOK.md`, `docs/SPEC.md`,
`docs/PLAYER_LANGUAGES.md`, `Prototyp/shop/README.md`, `IMPLEMENTATION.md`.

- [ ] Aktuellen Branch und `git status` prüfen. Fremde Änderungen erhalten;
      Umsetzung in einem eigenen `codex/ollie-shop-inventory`-Branch bzw. dafür
      geeigneten isolierten Checkout. Uncommittete Arbeit nicht ungefragt mitnehmen.
- [ ] Bestehende Tests als Baseline ausführen, keine feste Testanzahl voraussetzen:

```sh
cd web
npm test -- tests/ui/itemAreas.test.ts tests/ui/itemDetail.test.ts tests/ui/items.test.ts tests/sql/economy.test.ts
npm run typecheck
```

- [ ] Normalen Shop, Inventory und Season-Truhen vor Änderungen in einem lokalen
      Harness aufnehmen. Keine echten Schülerkonten verwenden.

**Abnahme:** Fehler der Baseline sind benannt; keine bestehende Funktion wird
versehentlich für eine neue Erfindung gehalten.

### AP 1 — Reale Daten und Mengenregeln vollständig vorbereiten

**Ändern:** `web/src/api/economy.ts`, bei Bedarf `api/items.ts`.
**Tests:** `web/tests/ui/items.test.ts` und eine neue
`web/tests/api/economyCatalog.test.ts` mit gemocktem Supabase-Read.

- [x] Zuerst Test für einen gelieferten Datensatz mit `season`, `description`
      schreiben: Beide Werte müssen nach `loadCatalog()` und `buildItemBook()` ankommen.
- [x] In der vorhandenen Mapping-Funktion ergänzen:

```ts
season: r.season ?? null,
description: r.description ?? null,
```

- [x] Bestehende Felder und `itemName(r.id, r.name_de)` erhalten. Keine Preise
      außerhalb der freigegebenen Preistabelle oder Demo-Eigentumswerte importieren.
- [x] Folgende Regelmatrix prüfen:

| Beispiel               | owned | placed | free | Shop-Aktion               | Inventory-Aktion         |
| ---------------------- | ----: | -----: | ---: | ------------------------- | ------------------------ |
| Deko                   |     3 |      2 |    1 | weiteres Exemplar kaufbar | ein Exemplar aufstellbar |
| Deko                   |     2 |      2 |    0 | weiteres Exemplar kaufbar | Platzierungen ansehen    |
| Haus                   |     1 |      1 |    0 | bereits im Besitz         | Platzierung ansehen      |
| passendes Avatarteil   |     1 |      – |    – | bereits im Besitz         | Anziehen                 |
| unpassendes Avatarteil |     1 |      – |    – | Kompatibilität beachten   | nicht anziehen           |

- [x] Klassen- und Shopfreigaben weiter serverseitig prüfen. UI-Filter sind kein
      Zugriffsschutz. Keine neue Datenbanktabelle für UI-Zustand hinzufügen.

**Abnahme:** Beschreibung, Season-Verkaufserkennung und echte Mengen funktionieren
unabhängig von der neuen Gestaltung.

### AP 1b — Freigegebene Gegenstände in den vorhandenen Katalog aufnehmen

**Neu:** eine neue Inhaltsmigration mit der bei Umsetzung nächsten freien Nummer,
Runtime-GLBs unter `web/public/assets/shop/` sowie ein Katalog-Vertragstest.
**Ändern:** vorhandenes Modellregister `web/src/render/glbItems.ts`, vorhandenes
Shop-Manifest, deutsche/englische Artikelnamen und zentrale Quellenliste.

- [x] Alle 14 Tabellenzeilen den tatsächlichen Modellen zuordnen. Vorhandene IDs
      prüfen: nur bei identischem Gegenstand wiederverwenden; keine doppelten Einträge
      für denselben Artikel erzeugen. Neue IDs folgen bestehenden Konventionen.
- [x] Prozedurale Waren aus `Prototyp/shop/models.mjs` als wiederverwendbare
      Runtime-Modelle bereitstellen; Hauswerkstatt-GLBs übernehmen. Größen inklusive
      Überständen gegen vorhandene Haus-/Garagen-/Deko-Slots prüfen, Quellen dokumentieren.
- [x] Ausschließlich Gegenstandsdaten in bestehende `items` und gegebenenfalls
      bestehende Freigabetabellen eintragen. Vorhandene Spalten für Modell, Preis,
      Name, Beschreibung und Sichtbarkeit verwenden. `house`, `garage`, `deco` aus
      der Tabelle oben zuweisen. Keine Schema-, Enum-, Kategorie- oder Slot-Erweiterung.
- [x] Neue Waren sind normale kaufbare Nicht-Season-Artikel, keine Starter und
      keine Lootbox-/LearnPass-Belohnungen. Bestehende Klassenfreigaben respektieren.
- [x] Englische Namen und Beschreibungen sowie deutsche Übersetzungen zuordnen.
      Freigegebene Preise exakt übernehmen; alte Artikelpreise und Besitzdaten erhalten.
- [x] Migration wiederholbar/idempotent für die Datenpflege gestalten. Das ist
      unabhängig von der Wiederholungssicherheit einer Kaufanfrage.
- [x] Katalogtest prüft alle 14 Zuordnungen, Preise, Modellpfade und erlaubten Kinds.
      UI-Test prüft einen neuen Artikel je verwendetem Kind: Kauf über denselben
      `ItemApi.buy`-Pfad und anschließender Besitz im existierenden Inventory.

**Abnahme:** Alle freigegebenen Waren stehen im einen bestehenden Shop. Vorhandenes
Sortiment bleibt erreichbar; keine neuen Kategorien oder parallele Kauf-API.

### AP 2 — Gemeinsame responsive Shop-/Inventory-Fläche

**Ändern:** `web/src/ui/shopView.ts`, `ui/inventoryView.ts`,
`ui/villageView.ts`, `i18n/en.ts`.
**Neu:** `web/src/ui/itemArea.css`, `ui/itemCatalogFilter.ts`.
**Tests:** `web/tests/ui/itemAreas.test.ts`, neue `itemCatalogFilter.test.ts`.

- [x] Erst Filtertests für Kategorien, Suche, Merkliste, Besitz und Avatar-
      Kompatibilität schreiben. `ItemEntry[]` als Eingabe; kein Demo-`Set` als Besitz.
- [x] Die Filterfunktion erhält folgenden Vertrag:

```ts
export interface ItemCatalogFilter {
  origin: 'shop' | 'inventar';
  category: import('../api/items').ItemKind | null; // null = All items
  query: string;
  savedOnly: boolean;
  savedIds: ReadonlySet<string>;
}
export function filterItemCatalog(
  entries: readonly import('../api/items').ItemEntry[],
  filter: ItemCatalogFilter,
): import('../api/items').ItemEntry[];
```

- [x] `shopVisible`, Starter-Ausschluss im Shop und Besitz einschließlich Starter
      im Inventory anwenden. Vorhandenes `canWear` zusätzlich im Aufrufer berücksichtigen.
- [x] `openShop()` und `openInventory()` als öffentliche Einstiege erhalten;
      `openItemArea()` gemeinsam modernisieren. CSS vollständig mit `.item-area`
      kapseln; keine globalen Regeln für alle `button`, `header`, `h1` oder `body`.
- [x] `seasonHost`, `filterHost`, `gridHost`, `statusHost` getrennt anlegen.
      Nur Grid/Status beim Zeichnen ersetzen; Season-Komponenten korrekt schließen.
- [x] `onCategory`, bereits gewählte Kategorie und aufgelöste Thumbnails bei
      Neuzeichnen behalten. Filteränderungen dürfen keine laufenden Käufe starten.
- [x] Ein einziger Sitzungsspeicher für die Merkliste: `Set<string>` in der
      laufenden Spieleransicht, an Shop und Inventory geben, bei Logout verwerfen.
      Keine globalen Nutzerlisten und kein unscoped localStorage auf Schultablets.
- [x] Bestehenden Inventory-Namen englisch `Inventory`, deutsch `Inventar`
      verwenden. Die interne Area-ID bleibt `inventar`.
- [x] Close-/Back-Aktion in beiden Flächen sichtbar anbieten. Herkunft des
      Shop-Einstiegs merken: Dorf / Haus / Kleiderschrank. Nicht alle Fälle pauschal
      zum Haus schicken; vorhandenes `shopFromWardrobe` erhalten oder sauber ersetzen.
- [x] Loading, Read-Fehler mit Retry, leere Kategorie, leere Suche, leere Merkliste
      und echtes leeres Inventory unterscheiden. Guthaben zentral von `getCoins()`.

**Abnahme:** Vorhandene Tests plus Filtertests grün; ein Kauf und ein Season-
Truheneinstieg funktionieren noch. Produkttexte sind über i18n übersetzbar.

### AP 3 — Große 3D-Details und verlässlicher Kauf-/Aktionsablauf

**Ändern:** `web/src/ui/itemDetail.ts`, `render/itemOrbitView.ts` bzw.
`render/itemPreview.ts`, `ui/itemArea.css`.
**Tests:** `web/tests/ui/itemDetail.test.ts`, `web/tests/ui/insidePreview.test.ts`
und neue Tests für den Shop-Detail-Host, falls er getrennt wird.

- [x] Vorhandene `DetailOptions` und Aktionsregeln als Ausgangspunkt nehmen.
      Kein zweiter Kaufcontroller, der unabhängig vom bestehenden Dialog bucht.
- [x] Detailfläche mit großer Bild-/Modellhälfte und Text-/Aktionshälfte gestalten;
      auf Handy untereinander. Vorhandenen Modal-Host zuerst behalten und passend
      gestalten; ein späterer eingebetteter Detail-Host muss dieselben Aktionen und
      Schließ-/Fokusregeln übernehmen. Kein Umbau ohne laufende Regressionstests.
- [x] Orbit-Darstellung aus `itemOrbitView` für echte GLB-/prozedurale Objekte
      nutzen; Kamera anhand Bounding Box setzen. Großen Wagen, Haus, kleine Deko und
      passendes Avatarteil prüfen. Avatarteile weiter über die vorhandene Outfit-
      Vorschau behandeln, nicht blind als Grundstücksmodell laden.
- [x] Zuerst Tests ergänzen: Doppeltippen während laufender RPC ruft `buy` einmal
      auf; Abbrechen bucht nichts; ein abgewiesener Kauf zeigt Fehler; bestätigter
      Kauf übernimmt exakt `{coins, qty}` und lädt das Item-Buch neu.
- [x] Reihenfolge: Detail → Bestätigung → Busy → Erfolg/Fehler. Keine optimistische
      lokale Münzabbuchung. UI-Callbacks nach Erfolg dürfen den Kauf nicht wiederholen.
- [x] Bei erfolgreicher Deko-Buchung weitere Exemplare erlauben. In Inventory
      `owned`, `placedIn.length` und `free` getrennt anzeigen; Platzieren/Anziehen/
      Verkaufen über bestehende Callbacks und RPCs.
- [x] **Netzwerk-Ungewissheit:** `buy_item(p_item_id)` hat derzeit keinen
      Request-ID-Parameter. Eine UI-Busy-Sperre ist keine allgemeine serverseitige
      Idempotenz. Einen unklaren Timeout nicht automatisch erneut buchen; zunächst
      den autoritativen Zustand aktualisieren und eine neutrale Meldung zeigen.
      Eine zusätzliche garantierte Wiederholungssicherheit braucht einen eigenen
      RPC-/Migrationsentwurf; sie gehört nicht stillschweigend zum UI-Umbau.
- [x] Schließen/Logout während spätem Modellladen: Token ungültig machen,
      keinen DOM-Remount, keine Sounds mehr. Geteilte Dorf-Modelle nicht entsorgen.

**Abnahme:** Alle bestehenden Inventory-Aktionen bleiben verfügbar. Kein falscher
Erfolgston vor Serverantwort; Focus/Escape/Backdrop bleiben bedienbar.

### AP 4 — Dauerhaften Ollie-Stand in die echte Karte einsetzen

**Neu:** `web/src/render/marketShop.ts`,
`web/public/assets/shopkeeper/ollie-shopkeeper.glb` und `credits.json`.
**Ändern:** `render/plaza.ts`, `render/village.ts`, `ui/villageView.ts`;
Read-only-Szenen nur hinsichtlich Darstellung.
**Tests:** neue `web/tests/render/marketShop.test.ts`,
bestehende `seasonPlaza.test.ts` und Karten-/Pfadtests.

- [x] Eigene Ollie-GLB aus `Prototyp/shop/assets/own/` kopieren. Kenney-Stand,
      Laternen und Fass aus vorhandenen Runtime-Assets wiederverwenden.
      Das komplette Demo-Gelände mit Wald und Pflaster **nicht** zusätzlich importieren.
- [x] Eine Platzierung deterministisch aus Layout und freier Marktfläche ableiten.
      Belegte Marktstände/Tafel, Brunnen, Spooky-Stand, Zugänge, Wegbreiten und fremde
      Grundstücke prüfen. Keine harte Weltposition und kein `Math.random()`.
- [x] Einen bestehenden unbenutzten Dekostand ersetzen oder eine nachweislich
      freie Position wählen; keinen vierten/fünften Stand blind darüberstellen.
- [x] Händler-Gruppe außerhalb von `normalSeasonPlaza` und austauschbaren
      `halloweenStalls` halten. Falls ein Dekostand ersetzt wurde, beide Themen-
      Varianten berücksichtigen. Fünf Themenwechsel erzeugen keine doppelten Händler.
- [x] Statische Teile zusammenfassen, animierte Knoten `Head`, `Eyes`, `Mouth`,
      `Arm_L`, `Arm_R` erhalten. Händler-Gruppe über `userData.bakeStatic = false`
      vor dem globalen Zusammenbacken schützen; nur ihre statischen Unterteile lokal
      zusammenfassen. Ein klarer kleiner Hit-Bereich, z. B.
      `userData.kind = 'marketShop'`; nicht das gesamte Pflaster anklickbar machen.
- [x] Im bestehenden Tap-Handler vor allgemeinen Grundstücksaktionen den Shop
      öffnen; vorhandenen `createTapDetector` und Sichtbarkeitsfilter nutzen.
      Drag/Pinch, Tutorial und aktiver Baumodus öffnen keinen Shop.
- [x] Ollies Idle im vorhandenen Dorf-Update aktualisieren, keine unabhängige
      zusätzliche Spielschleife. Reduzierte Bewegung und versteckter Tab berücksichtigt.
- [x] Lehrer-/Besuchsansicht: Stand sichtbar, keine Spieler-Kauf-RPCs erlauben.
      Shop-Sperre einer Klasse sperrt Kauf; Stand kann weiterhin betrachtet werden.

**Abnahme:** Normal und Halloween auf allen drei Kartenvorlagen und zwei Seeds
ohne Überschneidung; Tafel, Sir Byte, Brunnen und Event-Stand bleiben bedienbar.

### AP 5 — Dialoge und Cozy-Sounds an das Spiel anbinden

**Neu:** `web/src/shopkeeper/lines.ts`, `shopkeeper/dialogue.ts` und
`web/public/assets/audio/ollie-ui/` mit verwendeten OGGs und Lizenz.
**Ändern:** `ui/sound.ts`, `i18n/en.ts`, zentrale Quellenliste
`blender/sources/LICENSES.md`.
**Tests:** `web/tests/ui/sound.test.ts`, neue `web/tests/shopkeeper/dialogue.test.ts`.

- [x] Ollies Charakterprofil und feste Dialog-IDs aus
      `Prototyp/shop/IMPLEMENTATION.md` übernehmen. Begrüßung, Waren-Tipp, Münzfrage,
      Hintergrund, Kauf und Verabschiedung bleiben kurz und schülergerecht.
- [x] Prototyp-Warenempfehlung an reales Sortiment anpassen: nicht von einer
      kaufbaren Ente sprechen, wenn der Artikel im echten Katalog nicht existiert.
      Entweder echte verfügbare Ware einsetzen oder allgemeine Zeile verwenden.
- [x] Texte lokalisieren. Ein späteres Voice-Manifest ordnet Dialog-ID und Sprache
      einer lokalen Audiodatei zu; fehlende Aufnahme nutzt Text und leise Blips.
- [x] Gelieferte Sound-Namen zum vorhandenen `SoundName`/`SOUND_FILES` hinzufügen;
      keine neue `AudioContext`-Instanz aus `Prototyp/shop/audio.mjs` kopieren.
      Globales Mute, Gesture-Unlock, Tabwechsel und `dispose()` müssen sie abdecken.
- [x] Hover drosseln und nur bei Maus; Dialog-Blips begrenzen. Kein Level-up-
      Jingle für normales Einkaufen. Nicht denselben Kauf doppelt mit globalem Coin-
      Effekt und neuem Coin-Sound beschallen.
- [x] Ollie und Sir Byte sprechen nicht gleichzeitig. Vorhandene VoicePlayer-
      Stop-/Sequence-Regeln berücksichtigen; Ollie nicht als Sir-Byte-Zeile registrieren.
      Bei lokaler Aufnahme keine Typing-Blips darüber abspielen.
- [x] Lizenztext und Credit `SFX by friedspin` erhalten. Kein eigenständiges
      Soundpack anbieten. Keine TTS-Anfragen im Spiel oder öffentliche API-Schlüssel;
      einmalige Offline-Vertonung ist inzwischen ausdrücklich beauftragt.

**Abnahme:** Globales Mute schaltet beide NPCs und Effekte stumm; Schließen/
Logout/Tabwechsel stoppen Dialog und ausstehende Wiedergaben.

### AP 6 — Tablet-Leistung, Lifecycle und vollständige Abnahme

**Neu:** `web/dev/ollie-shop.html`, `web/e2e/ollie-shop.spec.ts`.
**Ändern:** `web/playwright.config.ts` für Harness-Zuordnung,
`docs/PLAN.md`, `docs/ANLEITUNG_LEHRKRAFT.md`; Quellen wie oben.

- [ ] Harness mit echten UI-Komponenten und ausschließlich synthetischer API:
      kaufbar, Geldmangel, Lehrer-Sperre, Netzfehler, mehrfache Deko, falscher Avatar,
      aufgestellte Deko, Starter, Season-Truhen und verkaufbare Season-Deko.
- [ ] E2E: Markt-Tap → Shop → Bestätigung → Kauf → Inventory → Platzieren;
      Avatar kaufen → Kleiderschrank; Inventory-Truhe öffnen; Season-Shop-Kachel;
      Zurück zum richtigen Ursprungsbereich. Kaufzustände und fokusierte Controls prüfen.
- [ ] Screenshots 1440×1000, 1024×768, 768×1024, 390×844, Deutsch/Englisch und
      reduzierte Bewegung. Lange echte Artikelnamen/Preise dürfen nicht überlaufen.
- [ ] Zehn Öffnen-/Schließen-Zyklen und 20 Artikelwechsel: stabile Listener,
      Geometrien und Texturen; kein nachträglicher DOM-Remount; keine Browserfehler.
- [ ] Kein WebGL-Renderer pro Warenkarte. Vorhandenen Thumbnail-Cache lazy und
      seriell verwenden; große Artikel erst auf Auswahl laden. Nicht bei jedem
      Shop-Öffnen das gesamte Sortiment wie die neun Demo-Artikel vorbacken.
- [ ] **Renderer ehrlich zählen:** Der Prototyp hat einen Kontext. Im Spiel bleibt
      der Dorf-Kontext gewöhnlich pausiert erhalten; Vordergrund und Thumbnail-
      Renderer haben eigene Ressourcen. Keine Behauptung „global nur ein Kontext“.
      Nur einen aktiven großen Detail-/Händler-Renderer gleichzeitig betreiben;
      Idle-Händler im Shop gegebenenfalls als vorgerendertes Bild zeigen.
- [ ] Normal/Halloween vor/nachher mit gleicher Kamera und Bewohnerzahl messen.
      Prototypwert 7.016 Dreiecke / 41 Calls ist kein Delta für die echte Gesamtwelt.
      Auf dem ältesten Schul-Tablet mindestens 30 fps prüfen; Software-WebGL-
      Screenshots ersetzen diesen Test nicht. Keine globale Qualitätsabsenkung ohne Befund.
- [ ] Finale Prüfungen:

```sh
cd web
npm test
npm run typecheck
npm run build
npm run migrations:check
npx playwright test e2e/ollie-shop.spec.ts --project=harness
npm run galerie
```

- [ ] Galeriebilder selbst mit `Konzept/Stil_Referenz/` vergleichen. Händler darf
      die bestehende Bildsprache und die Marktplatz-Bedienung nicht verschlechtern.
- [ ] Dokumentieren: tatsächliche Dateien, geprüfte Fehlerfälle, Assets/Lizenzen,
      Messwerte und verbleibende Gerätetests. Lehrer-Anleitung erklärt: Shop-Sperre
      kontrolliert Käufe, Weltstimmung kontrolliert Halloween; zwei getrennte Funktionen.
- [ ] Nutzerreview anhand laufender Vorschau. Nichts automatisch committen,
      pushen, migrieren oder veröffentlichen.

**Fertig bedeutet:** Genau ein bestehender Shop mit allen 14 freigegebenen Waren;
Shop und Inventory sind funktional vollständig,
neues Erscheinungsbild und Händler sind integriert, keine doppelte Wirtschaft oder
Besitzhaltung, Tests und visuelle Prüfung belegt. Offene echte Tablet-Abnahme
ausdrücklich benennen, falls kein Gerät verfügbar ist.

## 5. Bewusst separat

- Weitere Waren außerhalb der freigegebenen 14: eigener Inhaltsauftrag.
- Persistente Merkliste über Geräte hinweg: eigener Datenvertrag/RLS, falls gewünscht.
- Zusätzliche garantiert idempotente Kauf-RPC: separater Backendauftrag.
- Weitere Stimmen/Sprachaufnahmen außerhalb der zwölf freigegebenen Ollie-Clips:
  separater Audioauftrag. Siehe `2026-10-28-ollie-speaking.md` zur ausgeführten Ergänzung.
- Sammelkarten-Vergabe, LearnPass-XP und Halloween-Aktivierung bleiben in ihren
  vorhandenen Systemen. Ollies Stand verändert deren Regeln nicht.
