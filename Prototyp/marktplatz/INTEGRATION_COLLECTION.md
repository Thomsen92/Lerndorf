# Übergabe · Collection / Cards / Achievements

Stand: 27.10.2026. Dieser Ordner ist eine eigenständige Design- und Implementierungsreferenz. Es wurden **keine Dateien unter `web/src/`, keine Datenbank, Konten oder Produktionsnavigation geändert**. Die visuelle Abnahme liegt beim Nutzer. Technische Nachweise: `assets/collection/browser-audit.json`, `model-audit.json`, `export-audit.json`.

**Maßgeblicher Stand r11:** 50 aktive Karten (18 Normal / 17 Rare / 14 Epic / eine Legendary). Normal/Rare werden zusätzlich zum Geld über LearnPass-Münzfelder vergeben; Epic/Legendary ausschließlich aus Seasonal Boxes. Jede Karte höchstens einmal pro Spieler. `assets/collection/card-acquisition.json` enthält die 35 festen Passkarten auf 24 Feldern und den 15-Karten-Truhenpool; Katalogdefinitionen enthalten `acquisition`. Produktionsschema: getrennte Kartendefinitionen, Besitz mit `quantity = 1`, eindeutige Grantbelege; serverseitig atomare Vergabe, vor Truhenziehung Besitz ausschließen und parallele Öffnungen pro Spieler serialisieren. Keine Duplikat-Münzen. Alte Pass-Claims nur um Karten ergänzen. Genaues Verfahren: `DEEPSEEK_UMSETZUNGSPLAN.md`, Pakete 8–9. Die folgenden r08-Angaben dokumentieren einen älteren Zwischenstand und werden durch r11 ersetzt.

**Aktualisierung r08:** 42 aktive Einträge = 30 Reliefkarten + zwölf bedruckte Flächen (`format: printed-surface`), Verteilung 15/14/12/1. Die acht Figuren bleiben archiviert. Aktuelle Abnahme-/Implementierungsübergabe: `CLAUDE_HANDOFF.md`, inklusive Lehrer-Schalter Normal/Halloween, weltweiter Synchronisierung innerhalb der Klassenwelt und Begrüßungsbanner/Seasonal Boxes. Druckdetails: `INTEGRATION_PRINTS.md`. Die ursprünglichen 30 Reliefkarten behalten ihre eigenen Motive; Druckobjekte haben einen separaten Exportweg.

## 1. Vorgesehene Navigation

```text
Collection
├─ Cards         → Almanach mit allen Kartendefinitionen
└─ Achievements  → derzeit nur „Coming later“
```

Cards enthält ein Inhaltsverzeichnis, Kapitel nach Seltenheit, Suche, Vor-/Zurückblättern und zwei 3D-Ansichten: **Card** für Vorder-/Rückseite der Karte, **Motif** für die unabhängigen Reliefmotive der ursprünglichen 30 Karten. Mit den zwölf Druckobjekten sind **42 Karten aktiv**; Druckobjekte blenden Motif aus. Die acht Figurenvarianten sind auf ausdrückliche Nutzerkorrektur unter `catalog.archivedCards` mit `status: benched` zurückgestellt und dürfen nicht als aktive Karten importiert werden. Ihre IDs, Modelle und Quellen bleiben erhalten. Die **Buch-Cover-Studie** unter `book.html` bleibt ein separates Texturbuch; Vertrag: `INTEGRATION_BOOK.md`. Sortierung: `normal`, `rare`, `epic`, `legendary`, innerhalb des Kapitels nach `number`.

Aktuelle Verteilung: 15 Normal / 14 Rare / 12 Epic / 1 Legendary. Das ist die Zusammensetzung des Entwurfs, **keine Dropchance**. Alle aktiven Karten können im Prototyp angesehen werden. „Pages“ bezeichnet sichtbare Katalogseiten, keinen Besitzstand.

Achievements ist noch nicht implementiert: keine Erfolgsdefinitionen, Fortschrittszähler, Belohnungsbuchungen oder Freischaltlogik. Die früheren vier Rahmen und sechs Titel bleiben in `designs.html` als Entwurfsarchiv erreichbar. Deren Ideen sind mögliche spätere Belohnungen und keine bereits implementierten Erfolge.

## 2. Konkrete Dateien

| Datei | Aufgabe bei der Übernahme |
| --- | --- |
| `collection.html`, `collection.css` | Struktur und Stil des Almanachs; Achievements-Platzhalter |
| `almanac.js` | Aktueller Controller: Filtern, Suche, Blättern, Card/Motif, Kamera, Lazy Loading, Cache und Aufräumen beim Verdrängen |
| `assets/collection/catalog.json` | Stabile Definitionen, Texte, Seltenheiten und relative Assetpfade; Schema-Version 2 |
| `assets/collection/cards/*.glb` | 38 komplette Karten mit eingebetteten Vorder-/Rückseiten-Atlanten |
| `assets/collection/motifs/*.glb` | 38 separate Motive, vollständig unabhängig von der Karte drehbar |
| `assets/collection/cards/*-thumb.png` | Kleine 128 × 192 Vorschauen für den Index |
| `assets/collection/cards/*-front.svg`, `*-back.svg` | Editierbare Druckvorlagen |
| `sources/collection/halloween-almanac.blend` | Editierbare Blender-Quelle der 38 Karten und Motive |
| `sources/collection/build-cards.py` | Reproduzierbarer Modellbau und Export |
| `sources/collection/halloween-collection.blend` | Erhaltene Quelle der ursprünglichen sechs Karten |
| `designs.html`, `designs.js` | Bestehende Rahmen-/Titelstudien; gehört noch nicht zur Achievements-Implementierung |
| `collection.js` | Erhaltene erste Galerie-Version; wird von der neuen Collection-Seite nicht mehr geladen |

## 3. Datenvertrag

Die Definitionen sind öffentliche Lern-/Sammelinhalte. Noch **kein** `owned`, `unlocked`, `acquiredAt` oder Fortschritt im statischen Katalog. Benutzerzustand später separat anhand stabiler Karten-IDs lesen.

```ts
type CardRarity = 'normal' | 'rare' | 'epic' | 'legendary';
type CardKind = 'grammar' | 'vocabulary' | 'proverb' | 'rhyme'
  | 'simile' | 'tongue-twister' | 'poem';

interface CollectionCard {
  id: string;           // unveränderlicher Schlüssel, z. B. "friend-in-need"
  number: number;       // stabile Drucknummer, nicht die aktuelle Seitenposition
  name: string;
  topic: string;
  kind: CardKind;
  rarity: CardRarity;
  color: string;
  icon: string;
  key: string;
  example: string;
  notes: string[];
  tip: string;
  model: string;        // relativ zu assets/collection/
  motifModel: string;   // separates 3D-Motiv
  front: string;
  back: string;
  atlas: string;
  thumbnail: string;
  series?: 'textbook-after-dark' | 'textbook-prints'; // erste 30 ohne series
  format?: 'printed-surface'; // ganze Fläche; kein zusätzlicher Motif-Modus
  figure?: string;       // lokale Modellbau-Variante, kein Laufzeit-Skript
  source?: {
    type: 'original-excerpt'; author: string; work: string;
    location: string; url: string; publisher: string;
    excerptLines: string[]; verifiedOn: string; rights: string;
    authorNote?: string; additionalUrl?: string;
  };
  reference?: {
    type: 'user-supplied-textbook-adaptation'; work: string;
    publisher: string; page: string; note: string;
  };
}
```

Die aktiven 30 IDs und die acht archivierten IDs sind eindeutig. Nummern 31–38 gehören zu den zurückgestellten Varianten. Anzeigenamen können übersetzt werden, IDs nicht. Frühere Karten mit `rarity: uncommon` wurden auf `normal` abgebildet; die Karten-IDs blieben gleich. In einem künftigen Importer alte `uncommon`-Werte einmalig auf `normal` normalisieren, statt bestehende Besitzdatensätze umzubenennen. `number` bleibt bei Filtern und Kapitelwechsel unverändert. Historische IDs wie `rain-train` bleiben stabil, auch wenn die Karte nun Rossettis Gedicht zeigt.

Inhalte: 11 traditionelle Sprichwörter mit einfacher englischer Bedeutung/Beispiel, sechs belegte Originalauszüge aus klassischen Versen, der traditionelle Peter Piper sowie Grammatik und Vokabeln. Bei `source` den Originalauszug, Autor/Werk und Quellenlink sichtbar erhalten. Lernnotizen und neue Halloween-Dialoge sind eigene Bearbeitungen, keine Originalzitate. Nachweise: `assets/collection/LITERARY_SOURCES.md`. Die Buchvarianten haben `reference` statt einer vorgetäuschten literarischen Zitatquelle. Herkunft und Rechte der drei Nutzerreferenzen und ihrer Ableitungen stehen in `assets/collection/LICENSES.md`; diese Materialien fallen nicht unter die CC0-Erklärung der eigenständigen Originalarbeiten.

Beispiele sind keine bewerteten Aufgaben. Bei einer späteren Aufgabenverknüpfung tatsächliche Lösungen entsprechend der bestehenden SPEC auf dem Server halten; nicht in dieses öffentliche Manifest schreiben. Das frühere Ensemblebild ist zurückgestellt. Der neue Teaser zeigt die tatsächliche bearbeitete Covertextur der separaten Buchstudie. Modelle und Referenzmaterial bei der späteren Paketierung bewusst zuordnen.

## 4. Übernahme in die Anwendung

Die folgenden Modulnamen sind ein **Vorschlag für die spätere Implementierung**, keine bereits angelegten App-Dateien:

1. Neue Ansicht `web/src/ui/collectionView.ts` mit dem bestehenden Ansichts-/Modal-Lebenszyklus verbinden. Vorhandene Muster in `web/src/ui/inventoryView.ts`, `accountMenu.ts` und `progressFlow.ts` prüfen; deren Abläufe hier nicht überschreiben.
2. Den global startenden Prototyp-Controller in eine explizite `mountCollection(...)`-/`dispose()`-Struktur überführen. Alle DOM-Listener, `ResizeObserver`, OrbitControls, RAF, Geometrien, Materialien, Texturen und Renderer wieder freigeben. `almanac.js` ist noch kein direkt importierbares Produktionsmodul.
3. Den vorhandenen Three.js-Stand der Anwendung verwenden; die lokale `vendor/`-Kopie ist nur für den eigenständigen Prototyp. Karten-/Motiv-GLBs benötigen keinen zusätzlichen Decoder. Schon vorhandene meshopt-komprimierte Season-Modelle weiterhin mit dem bestehenden MeshoptDecoder laden.
4. Assetbasis konfigurierbar machen, z. B. `assetBase + card.model`, damit Hosting-Unterpfade funktionieren. Keine absoluten lokalen Dateipfade übernehmen.
5. Die Dorfsimulation beim offenen Almanach pausieren und nach dem Schließen gezielt wieder aufnehmen. Nicht versehentlich zwei dauerhafte Renderloops starten. Ein getrenntes Vorschaurenderer-Objekt muss einen klaren Besitzer und eine Freigabe haben.
6. Die derzeit öffentlichen Kartendefinitionen bei Bedarf mit einem separat geladenen Besitzstatus zusammenführen. Noch offene Produktentscheidung: dürfen nicht besessene Karten weiter vollständig betrachtet werden oder nur als Silhouette? Der Prototyp zeigt ausdrücklich alle Karten.
7. Achievements zunächst als nicht verfügbaren Bereich behalten. Erst später eine eigenständige Definition und serverseitige Belohnungsbuchung ergänzen. Rahmen-/Titel-IDs aus dem Entwurfsarchiv bei dieser Entscheidung erhalten oder bewusst migrieren.

## 5. Performance und Ressourcen

Nur das ausgewählte GLB laden. Kleine Vorschaubilder im Index benutzen, nicht alle vollständigen Kartenmodelle vorab laden. Aktuell maximal **vier** Karten-/Motivmodelle im LRU-Cache; beim Verdrängen Geometrien, Materialien und Texturen freigeben. Schnelle Auswahlwechsel sind durch einen Request-Token abgesichert, damit ein verspäteter Ladevorgang die zuletzt gewählte Seite nicht überschreibt.

Jede Karten-Datei hat einen eingebetteten Atlas von 1024 × 768 Pixeln. Motive haben keine externen Texturen. Keine Schattenkarten oder teuren Nachbearbeitungseffekte in der Kartenansicht. Auf kleinen Geräten maximal Pixelratio 1,5; tatsächliche Grenzen am ältesten Schul-Tablet prüfen. Die Messungen des Prototyps sind kein Nachweis für das kombinierte Spiel auf Schul-Hardware.

Bei verdecktem Browserfenster und im Achievements-Platzhalter pausiert der Renderloop. `prefers-reduced-motion` schaltet die sanfte Umdrehanimation aus; manuelles Drehen und Zoomen bleiben möglich. Ein vollständiger `dispose()`-Lebenszyklus ist bei der In-App-Übernahme zusätzlich erforderlich, da die Standalone-Seite bisher beim Verlassen vom Browser abgeräumt wird.

## 6. Sicherheits- und Zustandsgrenzen

Keine Schülerdaten, Analytics oder Kontozugriffe im Prototyp. Besitz, Fortschritt und Belohnungen gehören später in den vorhandenen authentifizierten Server-/RPC-Pfad. Kein Client-Schalter darf Besitz oder Belohnungen dauerhaft ändern. Klassen-/Benutzerzuordnung aus der bestehenden Anmeldung ableiten; nicht aus frei übergebenen fremden Benutzer-IDs. Für doppelte Belohnungsereignisse später Idempotenz vorsehen. Es wurde dafür hier kein Tabellenname oder RPC implementiert.

## 7. Abnahme vor der Integration

- Alle 30 aktiven Karten und Motive laden; archivierte Figuren nicht in der aktiven Auswahl zeigen. Quellenangaben erhalten. Das separate 3D-Buch gemäß `INTEGRATION_BOOK.md` prüfen.
- Sortierung, Suche, leere Treffer, Seitenenden, Moduswechsel und schnelle Auswahlwechsel prüfen.
- Quelle/Export: 38 Karten und 38 Motive gegen `export-audit.json` prüfen; Maße/UVs/Texturen erhalten.
- Echte Schul-Tablets, Hochformat, Tastatur, Bewegungsreduktion und Schließen/Wiederöffnen der Ansicht testen.
- Speicher nach wiederholten Wechseln/Schließen kontrollieren; keine Listener oder Renderer ansammeln.
- Besitz-/Belohnungsregeln separat testen, sobald sie überhaupt implementiert werden.
- Visuelles Review durch den Nutzer. Keine Commits, kein Push und keine Produktionsänderung wurden in diesem Auftrag vorgenommen.

## r10 · aktueller Gesamtvertrag

50 aktive Karten: 18 Normal / 17 Rare / 14 Epic / eine Legendary (weiterhin ausschließlich highlight-halloween-card). Zu den bisherigen Inhalten kommen acht Classroom Curses mit selbstironischer Beschreibung, englischen imaginären Effekten und Halloween-Bildtexturen. kind akzeptiert zusätzlich humour; series zusätzlich classroom-curses. description, effects[], flavour, satire und effectMode=flavour-only sind reine Darstellungsdaten. Kein Effekt-Parser und keine echten Sanktionen oder Statusänderungen daraus erzeugen. Aktuelle Abnahme-/Implementierungsquelle: CLAUDE_HANDOFF.md; genaue Bild-Prompts: assets/collection/prints/curses/generation-manifest.json.
