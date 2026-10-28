# Ollie: Integration des bestehenden Shops

Stand: 28.10.2026. Produktionscode lokal integriert, Commit freigegeben;
keine Live-Migration und kein Push.

Es gibt weiterhin genau **einen Shop**. Ollies dauerhafter Marktstand, das Haus-Menü,
der Baumodus und der Kleiderschrank öffnen dieselbe Oberfläche und dieselbe Item-API.
Der Spooky-Stand bleibt der Eingang zu Welcome, Quiz und LearnPass. Er eröffnet
keinen zusätzlichen Warenkatalog. Shop-Sperre und Halloween-Weltstimmung sind unabhängig.

## Umgesetzt

- Gemeinsame helle Shop-/Inventory-Fläche mit großen Touch-Zielen, Kategorien,
  Suche, sitzungsinterner Merkliste und tatsächlichem Münz-/Besitzstand.
- Große dreh- und zoombare 3D-Ansicht des echten Gegenstands, Reset, Ladefehler und
  Wiederholung. Avatarteile verwenden weiterhin ihre eigene Outfit-Vorschau.
- Kauf mit separater Bestätigung, Restguthaben und Busy-Sperre; Rückmeldung mit
  Serverguthaben und Deko-Gesamtmenge. Keine optimistische Münzbuchung.
- Unklare Netzwerkantworten erlauben keine direkte Kaufwiederholung im selben
  Dialog. Zuerst Inventory prüfen; dabei werden Guthaben und Item-Buch neu gelesen.
  Die vorhandene RPC hat weiterhin keinen allgemeinen Idempotenzschlüssel.
- Inventory behält Starter, Mengen, aufgestellt/frei, Platzieren, Platz zeigen,
  Anziehen, Season-Verkauf und Truhen. Season-Flächen bleiben bei Filtern bestehen.
- Ollies Stand ersetzt einen bisherigen Dekostand in beiden Weltstimmungen.
  Die Platzierung wird aus dem Layout berechnet und lässt Wege und Bauflächen frei.
  Lehrer-/Besuchsansichten zeigen den Stand ohne Kaufaktionen.
- Ollie: herzlicher australischer Nachbarschaftshändler mit trockenem Humor.
  Sechs feste Dialog-IDs in `web/src/shopkeeper/lines.ts`, jeweils Englisch und
  Deutsch vertont mit ElevenLabs **Charlie** (australisch, männlich).
  Die zwölf MP3s liegen lokal unter `assets/shopkeeper/voice/`.
  Am 28.10.2026 auf ausdrücklichen Nutzerauftrag einmalig 989 Textzeichen aus dem
  vorhandenen Kontingent generiert; kein Zukauf, keine TTS-Anfragen im Spiel.
- Beim Sprechen bewegt sich das vorhandene Porträt bis etwa 14 px nach oben,
  mit leichter Neigung und Streckung abhängig vom Audiosignal. Kein weiterer
  3D-Renderer. Ende, neue Zeile, Tabwechsel, Mute und Schließen stoppen die Bewegung;
  „Weniger Bewegung“ hält das Porträt still. Musik wird während der Aufnahme leiser.
- Die gelieferten OGGs verwenden das vorhandene globale Sound-/Mute-System.
  Sir Byte wird vor Ollies Dialogen stillgesetzt. Keine zusätzliche Audio-Engine.

## Die 14 neuen Waren

| Gegenstand | Bestehender Kind | Münzen |
| --- | --- | ---: |
| Evening Lantern | deco | 40 |
| Sunday Bench | deco | 55 |
| Pocket Meadow | deco | 25 |
| One More Chapter | deco | 65 |
| Little Big Oak | deco | 45 |
| Emotional Support Duck | deco | 20 |
| Rainy-Day Barrel | deco | 35 |
| The Apple of My Eye | deco | 10 |
| Little Blue Cottage | house | 140 |
| Apple Gable Cottage | house | 100 |
| Moss Corner Cottage | house | 125 |
| Lantern House | house | 150 |
| Apple Gable Garage | garage | 75 |
| Moss Workshop | garage | 100 |

IDs, deutsche Namen, Beschreibungen und Quellen stehen in
[`content/shop/ollie-items.json`](../content/shop/ollie-items.json).
Die Modelle sind 158–3.819 Dreiecke groß und eigenständig texturiert.
Die fünf Hauswerkstatt-Modelle bleiben auf ihrer geprüften Originalgröße.
Diese 14 explizit geprüften Low-Poly-Modelle benötigen keine zweite LOD-Datei;
der Asset-Vertrag misst ihre tatsächlichen Dreiecke und erhält die bisherigen
LOD-Anforderungen für alle anderen Modelle.

## Datenbank und Auslieferung

[`0054_ollie_shop_items.sql`](../supabase/migrations/0054_ollie_shop_items.sql)
fügt ausschließlich die neuen Waren in die bestehende `items`-Tabelle ein.
Keine neuen Tabellen, Kategorien, Slots, Währungen oder Kauf-RPCs.
Die Inhaltsmigration ist wiederholbar und verändert bestehende Käufe, Guthaben,
Platzierungen und Klassenfreigaben nicht. **Sie wurde nur lokal mit PGlite geprüft.**
Damit alle 14 Artikel im echten Spiel erscheinen, müssen bei der späteren
Auslieferung sowohl die neuen Webdateien/Assets als auch Migration 0054
veröffentlicht werden. Die Produktionsoberfläche liest den Katalog aus Supabase;
sie ersetzt ihn nicht durch Demo-Daten.

## Lokal ansehen und prüfen

```powershell
cd web
npm run dev -- --host 127.0.0.1
```

`/dev/ollie-shop.html` zeigt die echten UI-/3D-Komponenten mit ausdrücklich
synthetischer Review-API. Beispiele: `?lang=de`, `?closed=1`, `?coins=9`,
`?uncertain=1`, `?slow=1`. Das verändert keine echten Konten.

Abnahme des isolierten Shop-Commits: 1.261 Tests, 15 Browserprüfungen,
Typecheck/Produktionsbuild und Migrationsprüfung erfolgreich.
Prüfungen: vollständige Vitest-Suite, Typecheck/Produktionsbuild,
Migrationsprüfung und `e2e/ollie-shop.spec.ts`. Die Browserprüfung umfasst
14 Waren, Kauf/Inventory/Platzierungs-Callback, Doppel-Tap, Mehrfach-Deko,
Einmalkauf bei Häusern, Shop-Sperre, Geldmangel, Netzwerk-Ungewissheit,
Fokus, Sprache, 1440×1000, 1024×768, 768×1024 und 390×844.
Zehn Öffnen-/Schließen-Zyklen mit 20 Vorschauen prüfen die Freigabe aller
Shop-WebGL-Kontexte. Der reale Dorf-Kontext bleibt im Spiel separat erhalten.

72 vollständige Dorfansichten (drei Vorlagen, zwei Seeds, sechs Blickwinkel,
Normal/Halloween) liegen lokal unter `output/ollie-gallery-*`; sechs nähere
Standansichten unter `output/ollie-world`. Die Shop-Screenshots und Testprotokolle
stehen unter `web/test-results/ollie-*`.
300 Layouts wurden auf freie Standplatzierung geprüft; tatsächlicher Radius
1,706 m, reservierter Radius 1,8 m.

Die alten globalen Leistungsziele (<150 Calls gesamt/<60 Welt) sind mit den
bestehenden Figuren und Weltinhalten weiterhin überschritten; auch das frühere
150.000-Dreiecke-Ziel wird von der Gesamtwelt überschritten. Der direkte
Vorher-/Nachher-Vergleich am Marktplatz (drei Karten, beide Weltstimmungen,
Seed 11, 24 Bewohner, identische Kamera und Assets) ergab **+10 Calls** und
**−34 bis +846 Dreiecke** durch den Austausch des bisherigen Dekostands.
Rohdaten samt Basis-Commit: `output/ollie-performance.json`. Die Galeriedaten
sind Software-WebGL-Messungen und belegen keine Tablet-FPS. Die Abnahme mit
mindestens 30 fps auf dem ältesten Schul-Tablet und das Nutzerreview bleiben offen.

Quellen und Lizenztexte: `content/shop/README.md`,
`web/public/assets/shopkeeper/credits.json`, `blender/sources/LICENSES.md`.
Die neuen Modelle sind eigene/CC0-Geometrie bzw. Kenney CC0. Die gelieferten
Cozy-Sounds von friedspin haben ihre separate App-Lizenz und sind kein CC0-Paket.
Die freigegebenen Prototypdateien wurden für diese Integration nicht bearbeitet.
