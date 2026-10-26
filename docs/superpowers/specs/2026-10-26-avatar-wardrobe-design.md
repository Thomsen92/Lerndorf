# Avatar-Editor: Kleiderschrank im eigenen Haus

Stand: 26.10.2026. Planungsentwurf auf Grundlage des Nutzerauftrags und der beiden lokalen Shop-Implementationen. Software inzwischen lokal umgesetzt; keine Live-Migration oder Veröffentlichung. Aktueller Stand: [Umsetzungsdokument](../../AVATAR_KLEIDERSCHRANK.md). Ausführung sequenziell durch einen Agenten.

## 1. Ziel und Bedienung

**Mein Haus → Kleiderschrank** öffnet eine eigene bildschirmfüllende Zimmer-Szene. Im Vordergrund steht die eigene Figur groß und scharf. Im Hintergrund erkennt man ein gemütliches generisches Zimmer mit geöffnetem Kleiderschrank; der Hintergrund ist bewusst unscharf. Das ist eine lokale Szeneninstanz innerhalb des Spiels, keine neue Klasse, Datenbankinstanz oder Mehrspielerwelt.

Die Figur lässt sich mit Finger oder Maus rundherum drehen. Daneben stehen ausschließlich passende, bereits besessene Teile und die kostenlose Grundausstattung. Ein Antippen legt ein Teil sofort zur Probe an. Erneutes Antippen legt es ab. Ein anderes Teil desselben Bereichs ersetzt das bisherige automatisch. **Fertig** speichert den gesamten Look einmalig und führt zurück zum Haus. Der Look erscheint anschließend an der Figur im Dorf und im Profilbild.

Der normale Haus-Shop verkauft die Teile weiterhin. Im Kleiderschrank gibt es keine Kaufkarten, Preise, Münzberechnungen oder gesperrte Sammlungen. Bei leerem Inventar hilft eine kurze Meldung mit „Zum Shop“. Grundfarben sind kostenlos. Ein geschlossener Shop sperrt weitere Käufe, nicht das Anziehen bereits besessener Dinge.

## 2. Geprüfter Ist-Zustand

Diese Befunde stammen aus dem tatsächlichen lokalen Code und den GLB-Dateien, nicht allein aus Aussagen der Lieferdokumente.

| Quelle | Verwertbarer Stand | Integrationsbedarf |
| --- | --- | --- |
| `Prototyp/StandardBoyShop/` | Vier starre Accessoires, Katalog, Vorschaubilder, Farbshader, Kurzhaar-Kopf unter der Kappe, `BoyCustomizer` | TypeScript und gemeinsamer Vertrag; Animationsanbindung; Inventar und Servervalidierung fehlen |
| `Prototyp/StandardGirlShop/` | Zehn starre Accessoires; zusätzlicher `bottoms`-Slot für Jeans/Rock; Farbshader; Rebinding geriggter Kleidung | Passende Base und finale Kleidungsrevision zusammen übernehmen; tatsächliche Spielanimationen prüfen |
| Junge im Spiel | Neues Modell vom 26.10., 65 Gelenke, neun Meshes, sechs Clips, keine Farb-Metadaten oder Kurzhaar-Variante | Ausgangsfigur/Identität erhalten; angepasste Shop-Base mit vorhandenen Clips kombinieren |
| Mädchen im Spiel | 65 Gelenke, 17 Meshes, fünf Clips, keine Farb-Metadaten | Shop-Base und Animationen zusammenführen |
| Shop-Bases | Junge: zehn Meshes; Mädchen original: 17, r10: 19. Alle ohne Animationsclips | Animationslose Dateien dürfen die laufenden Spielfiguren nicht direkt ersetzen |
| Aktuelles Spiel | `houseMenu.ts`, `areas.ts`, Shop, Inventar, `buy_item`, `profiles.avatar`, `set_character`, Crowd und Profilporträts existieren | Noch kein tragbarer Look, kein Editor, keine Runtime für die Shop-Assets |

Wichtige Abweichungen in den Liefernotizen:

- Die Boy-Notizen beschreiben noch den alten Jungen mit 66 Gelenken und den Faktor 1,1585. Der aktuelle Junge hat 65 Gelenke; in seinem GLB gibt es keine Icosphere. Diesen Faktor nicht übernehmen. Beide Rig-Paare haben dieselben normalisierten Gelenknamen; numerische Bind-Pose-Kompatibilität ist damit noch nicht bewiesen.
- `save_avatar` aus 0006 lehnt unbekannte JSON-Schlüssel nicht pauschal ab. Es validiert nur die alten Felder und überschreibt danach das ganze Avatar-Objekt. Ein bloß angehängtes neues Look-Objekt wäre folglich **ungeprüft** und könnte außerdem `character` verlieren.
- Migrationen 0021 und 0022 sind lokal bereits vergeben. Die nächste geplante Migration ist `0023_avatar_wardrobe.sql`; vor Ausführung Nummer erneut prüfen.
- Die Girl-Demo lädt `catalog-wardrobe.json` und damit die ältere r08-Kleidung. Es existieren inzwischen `refinement/catalog-r10.json`, eine angepasste r10-Base und r10-Kleidungsdateien. Die älteren r08-Abnahmetexte werden in `refinement-brief.md` für Problemzonen ausdrücklich zurückgenommen. Die r10-Dateien sind der Integrationskandidat, aber noch kein nachgewiesener WebGL-/Animations-Erfolg im Lerndorf.
- r10-Jeans: 6.546 Dreiecke und rund 3,78 MB; Boy-Kappe allein 4.499 Dreiecke. Das alte Budget „Avatar komplett ≤ 3.000 Dreiecke“ ist mit diesem Material nicht erfüllt. Messung und gezielte Optimierung gehören vor die Freigabe.

Gelesene Referenzen: beide `README.md`, Boy `INTEGRATION-NOTES.md`, Girl `README-WARDROBE.md` und `refinement-brief.md`, beide `avatar-customizer.js`, aktive und r10-Kataloge, vorhandene Export-/Testberichte, Girl `texture-provenance.json` sowie aktuelle Spiel-, API- und SQL-Implementationen. Lieferdokumente sind technische Referenzen; sie erweitern den Nutzerauftrag nicht um neue Modellierungsaufträge oder Dienste.

## 3. Gewählte Gestaltung

Verglichene Ansätze:

1. **Eigene Zimmer-Ansicht mit einer aktiven Figur – empfohlen.** Erfüllt den Szenenwechsel, gibt dem Avatar viel Platz und lässt sich auf Tablets unabhängig vom Dorf optimieren.
2. Ein Dialog über dem Dorf wäre kleiner umzusetzen, bietet aber weniger Platz und entspricht dem gewünschten Zimmerwechsel weniger gut.
3. Ein begehbarer Hausinnenraum mit echter Tiefenunschärfe wäre deutlich aufwendiger. Für das Umziehen sind weder Bewegung im Raum noch laufendes Depth-of-Field nötig.

Wir planen Ansatz 1. Ein eigener Editor-Renderer ist nur während dieser Ansicht aktiv; das Dorf pausiert. **Nutzerkorrektur:** Der Kleiderschrank wird nicht aus Code-Grundformen gebaut. Die Lehrkraft erstellt ihn mit Tripo anhand des Referenzbilds `blender/sources/references/wardrobe-open-reference.png` und liefert das Ergebnis zur Integration. Schrank und Teppich sind inzwischen geliefert und in der Spielkopie integriert. Boden, zwei Wände, kleiner Teppich und warmes Licht bilden darum das generische Zimmer. Der Raum wird beim Öffnen und nach Größenwechsel einmal in kleiner Auflösung gerendert und weichgezeichnet. Die Figur wird scharf darüber gerendert. Kein Blur auf DOM-Bedienelementen oder Figur und kein laufender teurer Tiefenunschärfe-Effekt.

### Tablet-Layout

```text
┌ Zurück                  Kleiderschrank                  Fertig ┐
│                                                              │
│    verschwommenes Zimmer      │  Kopf  Kleidung  Extras Farben │
│    und geöffneter Schrank     │                               │
│                              │  [Bild] [Bild] [Bild]         │
│       DEINE FIGUR            │  [Bild] [Bild] [Bild]         │
│       groß und drehbar       │                               │
│                              │  angezogenes Teil markiert    │
│       ↶             ↷        │                               │
└──────────────────────────────────────────────────────────────┘
```

- Querformat ab 900 CSS-Pixeln: ca. 60 % Bühne, 40 % ruhiger Inventarbereich, mindestens 320 px breit. Zwei bis drei Karten pro Zeile.
- Hochformat darunter: Figur in der oberen Hälfte, Inventar als unteres Panel. Kopfzeile und „Fertig“ bleiben erreichbar, nur die Gegenstandsliste scrollt. Mindestprüfung 768×1024, 1024×768, 820×1180 und ergänzend 390×844.
- Hauptkategorien sind große Schaltflächen mit Symbol **und** kurzem Text, kein Dropdown. Unterbereiche erscheinen nur, wenn passende Dinge vorhanden sind. Leere Kategorien werden ausgeblendet; „Farben“ bleibt verfügbar.
- Karten mit tatsächlichem Produktbild, kurzem deutschen Namen und klarem ausgewähltem Zustand. Keine Checkbox mit zusätzlicher Bestätigung. `aria-pressed` und deutliches Rahmen-/Flächensignal; Auswahl nicht allein über Farbe vermitteln.
- Bedienziele mindestens 48×48 CSS-Pixel, Karten mindestens 96×112 px, Text mindestens 16 px. Sichere Abstände, sichtbarer Fokus, Safe-Area-Ränder und kein Hover als Voraussetzung.
- Fingerziehen über der Bühne dreht ausschließlich die Figur um ihre Hochachse. Kein Pan, kein freies Kamerakippen, keine unerwartete Zoom-Geste. Zwei Drehknöpfe ermöglichen dieselbe Bedienung per Tastatur; „Ansicht zurücksetzen“ ist zugänglich.
- Einmaliger kurzer Hinweis „Ziehe, um dich zu drehen“. Keine Dauertipps und kein wiederkehrendes Lob. Sanfter Wechsel von 150–220 ms; bei reduzierter Bewegung ohne Kamerafahrt oder automatisches Drehen.
- Bestehende Comic-Neue-Typografie und Lerndorf-Farbwelt: kühles Blau `#2d3a67`, warmes Holz `#86603f`, helle Panel-Fläche `#fff5dc`, dunkle Schrift `#34343f`, Akzent `#64864c`. Bestehende Tokens zuerst wiederverwenden, neue Werte auf den Editor begrenzen. Modernität entsteht durch Platz, klare Auswahl und direkte Reaktion.

## 4. Inhalte und Verhalten

Das Zubehör bleibt zunächst figurenspezifisch: keine ungeprüfte Übertragung der Boy-Teile auf das Girl-Rig oder umgekehrt. Besitz bleibt auch nach Figurenwechsel erhalten. Für jede Figur wird ein eigener Look gespeichert; beim Zurückwechseln ist der frühere Look wieder da.

| Figur | Teile | Geplante deutsche Anzeige / Preis in Münzen |
| --- | --- | --- |
| Junge | feathered-helmet, gucci-sunglasses, gold-chain, halberd | Federkappe 120, Sonnenbrille 80, Goldkette 100, Hellebarde 180 |
| Mädchen | cloud-beat, pixel-cat, daisy-bucket, heart-pop | Stern-Kopfhörer 80, Katzenohren 60, Blumenhut 70, Herzbrille 60 |
| Mädchen | shooting-stars, starpack, crescent, candy-orbit | Stern-Haarclips 40, Stern-Rucksack 100, Umhängetasche 100, Perlenarmband 30 |
| Mädchen | bloom, soft-bow, slim-jeans, pleated-skirt | Blumenkette 70, Haarschleife 40, Jeans 120, Faltenrock 120 |

Preise sind Planungswerte im bestehenden Wirtschaftsrahmen, keine bereits gespeicherten Käufe. IDs und Kaufregeln kommen vom Server; technische Prototype-IDs bleiben über eine explizite Zuordnung erhalten.

- Ein Teil pro Slot: `headwear`, `hair`, `face`, `necklace`, `back`, `bag`, `wrist`, `bottoms`. Girl-Kopf-/Haar-Konflikte aus dem Katalog gelten auch serverseitig. Die Boy-Kappe schaltet zwischen Originalhaar und Kurzhaar um.
- Starre Teile werden mit ihrer geprüften `attachmentMatrix` vor `bone.add` befestigt. Geriggte Kleidung bindet an das vorhandene Skelett; keine zusätzliche Achsenkorrektur, keine zweite animierte Figur.
- „Ohne“ bei Accessoires stellt den unbelegten Slot wieder her. „Original“ bei Kleidung zeigt die Cargo-/Grundhose. Darunterliegende Meshes werden korrekt wieder eingeblendet. Der vollständig bekleidete Ausgangsavatar bleibt immer eine mögliche Kombination.
- Farben: feste große Farbfelder, kein freier Farbwähler. Gemeinsame Kanäle `hair`, `skin`, `shoes`, `bottoms`, zusätzlich `top` nur beim Mädchen; dessen technischer Kanal heißt `tshirt`. Boy hat keinen gelieferten Oberteil-Farbkanal. Haut nutzt eine eigene natürliche Palette, Kleidung/Haar zunächst die vorhandene Palette. „Original“ entfernt die jeweilige Tönung.
- Keine neuen Frisuren, Oberteile, Tiere, Körperformen oder Cloth-Simulation im ersten Paket. Die früher in SPEC §7 aufgezählten 3 Frisuren/3 Oberteile sind mit den gelieferten Assets nicht vorhanden und dürfen nicht als fertige Auswahl erscheinen.

## 5. Daten und Schutz bestehender Spielstände

`profiles.avatar.character` bleibt unverändert die Figurenwahl. Neues verschachteltes Feld:

```json
{
  "character": "boy",
  "wardrobe": {
    "v": 1,
    "revision": 3,
    "boy": { "items": ["avatar_boy_gold_chain"], "colors": { "hair": "#5b3a29" } },
    "girl": { "items": [], "colors": {} }
  }
}
```

Nicht gezeigte bisherige Avatar-Schlüssel bleiben erhalten. Fehlendes `wardrobe` bedeutet unveränderte Grundfigur. `revision` schützt vor dem Überschreiben eines zwischenzeitlich gespeicherten Looks. IDs sind kanonische `items.id`; technische Dateipfade oder Shaderparameter werden nie aus dem Rezept übernommen.

Neue Tabelle `avatar_parts` ordnet `items.id` einer Figur, Runtime-ID, einem Slot und Konflikt-IDs zu. Katalog und SQL werden aus demselben geprüften Manifest erzeugt. Sie enthält keine Münzstände oder Besitzdaten. Neue RPC `save_avatar_look(p_character, p_look, p_expected_revision)` prüft Rolle, aktuelle Figur, JSON-Struktur, Version, Palette, aktive kompatible Teile, Inventar/Starter, Konflikte und Revision. Sie ersetzt nur den Look der angesprochenen Figur und erhöht die Revision atomar. Kein Münzabzug beim Umziehen.

Das alte `save_avatar` darf das neue Feld nicht umgehen oder löschen: reservierte neue Schlüssel ablehnen, `character` und `wardrobe` aus dem gespeicherten Profil erhalten. `set_character` bleibt für die Figurenwahl zuständig und behält beide Looks. Rollen-/RLS-Grenzen und Klassen-Trennung bleiben bestehen. Mitschüler sehen nur das gespeicherte Aussehen, keine fremden Inventare oder Münzen.

`buy_item` bleibt der einzige Kaufweg. Neue Avatar-Artikel werden wie einmalig besitzbare Artikel behandelt; Doppelkäufe auch bei zwei gleichzeitigen Anfragen unter einer Profilsperre verhindern. Vorhandene Mengen größer eins nicht nachträglich löschen. Shop-Sperre, Klassenkatalog, Münzen und Buchungsjournal bleiben wirksam.

Alte Platzhalter-Artikel wie `hat_01`/`acc_01` haben nicht automatisch ein passendes neues Modell. Keine stille Umdeutung in Federkappe oder Girl-Kopfhörer. Vorhandener Besitz bleibt im bisherigen Inventar erhalten; weitere Käufe solcher nicht darstellbaren Artikel deaktivieren und in der Shop-Ansicht `shop_visible` beachten. Der neue Kleiderschrank zeigt nur geprüfte, tragbare Artikel.

## 6. Ladeverhalten, Fehler und Ressourcen

- Beim Öffnen erscheinen Raum und Ladezustand. Erst nach geladenem Look ist die Auswahl aktiv. Bei Fehler: „Der Kleiderschrank konnte nicht geladen werden“ mit „Erneut versuchen“ und „Zurück“.
- Anprobieren ist lokal. Nur erfolgreich geladene Teile werden als ausgewählt angezeigt. Bei Ladefehler bleiben bisheriger Look und Auswahl erhalten.
- Pro Slot gilt die letzte Eingabe; Konflikte müssen auch noch laufende Anlege-Anfragen anderer Slots abbrechen. Veraltete Antworten dürfen keine Teile nachträglich einsetzen.
- „Fertig“ ist während Laden/Speichern gesperrt. Bei Speicherfehler bleibt der Entwurf offen und erneut speicherbar; Dorf/Porträt übernehmen ausschließlich bestätigten Serverstand. Bei Revisionskonflikt gespeicherten Look neu laden statt überschreiben.
- „Zurück“ bei unverändertem Look geht sofort zum Haus. Bei ungespeicherten Änderungen eine kleine Entscheidung „Weiter anziehen“ / „Verwerfen“. Logout erzwingt Aufräumen ohne blockierenden Dialog.
- Dorfkamera und Zeitschritt bleiben erhalten. Dorf-Taps, Namensschilder und Sir Byte sind während der Ansicht inaktiv. Nach Rückkehr kein Sprung durch aufgelaufene Zeit.
- Gecachte GLB-Geometrien/Texturen sind gemeinsam; Materialien/Farbuniforms pro Avatar. Ausschließlich selbst besessene Klone und Ladeobjekte entsorgen. Ein Editor-Renderer, keine Renderer pro Inventarkarte; vorhandene PNG-Thumbnails verwenden.
- Geladen werden nur benötigte Figur und angezogene Teile. Nach Schließen Listener, Mixer, Render-Targets, Shader und Editor-Context freigeben. Verdeckte Tabs pausieren. PixelRatio maximal 1,5 beziehungsweise 1 in niedriger Qualität.

## 7. Abnahme

Erfolg bedeutet den vollständigen Weg Haus → Zimmer → gekauftes Teil antippen → drehen → speichern → identischer Look in Dorf, Profil und nach Neuladen. Beide Figuren, Konflikte, Ablegen, Farben, Wechsel der Figur, Shop-Sperre und langsames/fehlgeschlagenes Laden gehören dazu. Die Lehrer-Dorfansicht zeigt ebenfalls den gespeicherten Look, bietet aber keinen Editor.

Die modularen Bases müssen sämtliche bisher verwendeten Lauf-/Catwalk-/Jubelclips erhalten. Alle 16 Artikel sind mit den konkreten Spielclips in Vorder-, Rück- und Seitenansicht zu prüfen; kritische Kontakte sind Kappe/Haar, Brille/Gesicht, Kette/Brust, Riemen/Arme, Bund/Knöchel und Rock/Beine. Prototyp-Berichte ersetzen diese Abnahme nicht.

Leistungsabnahme: keine fortlaufenden Raum-/Blur-Pässe im Leerlauf, stabiler Speicher nach zehn Öffnen-/Schließen-Zyklen, kein aktives Dorf-Rendering parallel. Lastfall mit 32 unterschiedlich ausgerüsteten Figuren messen. Ziel mindestens 30 fps auf dem ältesten Schul-Tablet; Desktop-/Software-WebGL-Ergebnisse nicht als Hardware-Abnahme ausgeben. Tatsächliche Dreiecke, Draw Calls und Downloads dokumentieren, statt die alten Budgets als erfüllt zu markieren.

## 8. Reihenfolge und Grenzen

Zuerst Rig/Animationen und finale Assets sichern, danach gemeinsamen Runtime-Vertrag und Datenbankvalidierung, dann ein vollständiger Kleiderschrank-Durchlauf, anschließend Shop/Inventar sowie Crowd/Porträts und die vollständige Abnahme. Details stehen im [Umsetzungsplan](../plans/2026-10-26-avatar-wardrobe.md).

Dieses Dokument plant die Umsetzung. Es ändert noch keine Modelle, Spielregeln oder Supabase-Daten. Die beiden Prototyp-Ordner bleiben unverändert.
