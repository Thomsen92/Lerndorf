# Avatar-Kleiderschrank – Umsetzung vom 26.10.2026

## Bedienung

„Mein Haus“ → **Kleiderschrank** führt in ein eigenes Zimmer mit dem gelieferten Schrank und Teppich. Der Raum ist unscharf; die Figur steht scharf davor. Fingerziehen, Mausziehen oder die Drehknöpfe drehen die Figur. Kopf, Kleidung, Extras und Farben sind große direkt antippbare Bereiche. Nur passende besessene Artikel erscheinen; die Originalkleidung und Farben bleiben kostenlos nutzbar.

Antippen probiert ein Teil an; erneutes Antippen legt es ab. Sich ausschließende Teile wechseln automatisch. „Fertig“ speichert den gesamten Look und führt zum Haus zurück. Bei ungespeicherten Änderungen fragt „Zurück“ nach Verwerfen oder Weiteranziehen. Ein Speicherfehler erhält den Entwurf. Ein geschlossener Shop verhindert neue Käufe, nicht das Tragen vorhandener Sachen.

Neue Dinge kommen aus dem bisherigen Haus-Shop. Nach einem Kauf führt „Zum Kleiderschrank“ zur direkten Anprobe, im Inventar gibt es „Anziehen“. Junge und Mädchen behalten getrennte Looks und ihren gemeinsamen Besitz. Artikel für die andere Figur bleiben im Inventar; sie werden beim Figurenwechsel verfügbar. Nicht modellierte alte Avatar-Artikel werden nicht still umbenannt oder gelöscht und nicht weiter verkauft.

## Lokale Vorschau und Live-Stand

- Vorschau mit Testbesitz: `http://localhost:5175/dev/wardrobe.html` und `?character=girl`.
- Vollständiger Haus-/Shop-Einstieg mit leerem Testinventar: `?house&empty`.
- Die Vorschau verwendet echte 3D-Dateien und die tatsächlichen UI-Komponenten, aber simulierte Käufe und Sitzungsspeicherung. Keine echten Schülerkonten oder Münzbuchungen.
- Die echte Anwendung verwendet ausschließlich Supabase-RPCs. **Migration `0023_avatar_wardrobe.sql` ist lokal vorbereitet; in diesem Umsetzungsschritt nicht live angewendet. Kein Deployment.** Vor Veröffentlichung die gesamte noch ausstehende Migrationsfolge prüfen, einschließlich 0022.
- Die Leistung auf dem ältesten Schul-Tablet und die Abnahme durch die Lehrkraft bleiben gesondert offen. Software-WebGL auf dem Entwicklungsrechner ist keine Hardware-FPS-Abnahme.

## Assets und Abweichungen vom ursprünglichen Plan

Die modularen Bases kommen aus den beiden gelieferten Shop-Paketen, beim Mädchen aus Revision r10. Die ursprünglichen Prototyp-Ordner bleiben unverändert. Der neue Junge vom 26.10. bleibt Identität und Animationsspender. Namen, Resttransformationen und inverse Bind-Matrizen wurden geprüft (maximale Abweichung jeweils unter 0,00002).

Anstelle eines Blender-Neuexports fügt `web/scripts/prepare-wardrobe.mjs` die passenden Animations-Accessor-/Bufferdaten direkt in die modularen GLBs ein und ordnet ihre Zielknoten namentlich zu. Dadurch bleiben Skins, Geometrie, Texturen und Farb-Metadaten erhalten. Die GLBs haben danach alle bisherigen Lauf-, Catwalk- und Jubelclips. Das ist eine bewusste technische Abweichung von A1, keine Ersetzung durch bewegungslose Shop-Bases.

Der r10-Katalog verwies auf zwei nicht vorhandene Vorschaubilder; die tatsächlich gelieferten r10-Frontbilder werden verwendet. Boy-Kappe schaltet auf die mitgelieferte Kurzhaar-Variante um. Starre Teile nutzen ihre Bone-Matrix; Jeans und Rock werden an das vorhandene Skelett gebunden.

Bei den tatsächlichen Spielclips zeigte der Rock zunächst die Innenhose durch den Stoff. `fit-skirt-animation.mjs` erhöht die Beinanbindung des unteren Stoffs und ergänzt bis zu 18 % Tiefenfreiheit zum Saum; Bund, Rig und Originalquelle bleiben erhalten. Normalen und Accessor-Bounds werden angepasst. Diese Korrektur betrifft ausschließlich die ausgelieferte Spielkopie.

Schrank und Teppich stammen aus den am 26.10. gelieferten Tripo-GLBs in Downloads. Ihre Originale bleiben unverändert. Die neuen ausgelieferten Texturen werden auf höchstens 1024² reduziert; Farbtexturen ohne Transparenz als JPEG, Normal-/Rauheitskarten und transparente Texturen als PNG. Keine neue Laufzeitbibliothek erforderlich.

Reproduzierbare lokale Asset-Pipeline (im Ordner `web`, gelieferte Prototyp-/Download-Dateien und Python mit Pillow erforderlich):

```powershell
node scripts/prepare-wardrobe.mjs
python scripts/optimize-wardrobe.py
node scripts/fit-skirt-animation.mjs
node scripts/audit-wardrobe.mjs
```

`sync-wardrobe-catalog.mjs` erzeugt die Katalog-Seeds der noch nicht angewendeten Migration aus demselben Manifest wie der Client. Bereits veröffentlichte Migrationen später nicht damit umschreiben.

## Leistung und Darstellung

Nur ein Editor-Renderer ist aktiv; das Dorf pausiert. Der Raum wird beim Öffnen/Größenwechsel einmal weichgezeichnet; es gibt keinen laufenden Tiefenunschärfe-Effekt oder Renderer pro Karte. Das Inventar nutzt PNGs. Rendern der Figur erfolgt bei Änderungen; PixelRatio maximal 1,5, in niedriger Qualität maximal 1. Schließen bricht die Bühneninitialisierung ab und gibt den Context frei. Ein fehlgeschlagenes Charakterladen ist wiederholbar.

Grundfigur plus Raumdateien: ca. 5,7 MB. Gemessene ausgelieferte GLBs: Boy-Base 1,93 MB, Girl-Base 1,98 MB; Schrank 1,48 MB, Teppich 2,28 MB. Jeans nach Optimierung ca. 0,94 MB statt 3,78 MB. Alle Boy-Teile mit Base ca. 2,62 MB, alle Girl-Teile mit Base ca. 3,35 MB. Exakte aktuelle Werte stehen in `content/avatar/delivery-audit.json`.

Der alte Zielwert „Avatar komplett ≤ 3.000 Dreiecke“ wird mit diesen gelieferten Modellen nicht erfüllt. Die Fernansicht verwendet ab 45 m eine schlichte Grundfigur; beim Näherkommen unter 38 m erscheinen die Outfitdetails wieder. Getragener Look und Farben bleiben gespeichert, Zimmer und Porträt zeigen alle Details. Dadurch sank der gemessene 32-Figuren-Lastfall in der Übersicht von 841 auf 365 Draw Calls (drei Ansichten nach Optimierung: 365/327/484). Die Zahlen sind Software-WebGL-Messungen; das frühere Gesamtziel unter 150 ist damit nicht erreicht.

## Prüfungen und Nachweise

Abschlussstand: 871 Tests in 120 Dateien, Produktionsbuild und ESLint erfolgreich. Neun Kleiderschrank-Browserprüfungen bestanden; 36 Dorfansichten und die beschriebenen Animationsbilder sind lokal vorhanden. Nutzer übernimmt das abschließende Review.

- SQL-Regeln: Rollen, Eigentum, Figur, Slots/Konflikte, Palette, Revision, einmaliger Kauf und Erhalt von Figur/Look bei Legacy-Aufrufen.
- Runtime: Instanzisolierung, konkurrierendes Laden, atomare Fehlerbehandlung, Aufräumen und Detailwechsel ohne Rezeptänderung.
- UI: ein Tap, nur eigene passende Teile, Speicherfehler, Transportfehler und Abbruch während Laden.
- Browser: beide Figuren, Haus-/Kauf-/Anziehfluss, Kleidung wechseln, Persistenz nach Neuladen, Verwerfen, Touch in 1024×768 / 768×1024 / 820×1180 / 390×844 sowie zehn Besuche ohne verbleibende WebGL-Kontexte.
- Echte Renderbilder: alle 16 Einzelteile, über den Clip verteilte Lauf-/Catwalk-/Jubelposen inklusive zweiter Girl-Jubelanimation, Jeans und Rock, beide Porträts. 32 Einzelbilder und 88 Kombinationsbilder; Kontaktbögen und Raumaufnahmen unter `web/test-results/wardrobe/`.
- Finale Dorf-Galerie: `web/test-results/layout-wardrobe/`, alle 36 Ansichten selbst geprüft. Der Galerie-Ready-Zustand wartet nun auch auf die geladenen Charaktere, statt deren mögliche Platzhalter zu messen.

Keine Cloth-Simulation und kein Nachweis für beliebige künftige Animationsclips. Getestete Clips bleiben die bestehenden Spielclips. Parallelität der Kauf-Sperre ist im SQL durch eine Profilsperre abgesichert; lokale PGlite-Prüfungen ersetzen keinen zusätzlichen Mehrverbindungstest auf echtem PostgreSQL.
