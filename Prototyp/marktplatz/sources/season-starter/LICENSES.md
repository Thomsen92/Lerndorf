# Quellen · Spooky-Stand / Season I

- **Stand, Markise, Holzbau, Lampions, Kürbisse, Beschilderung und Ticket-SVG:** eigener Entwurf für Lerndorf, erstellt am 27.10.2026. Geometrie/Code/Grafik können unter CC0 verwendet werden. Stil nach `docs/LOOK.md`, keine externen Standmodelle kopiert. Schriftformen als Mesh, keine Fontdatei mitgeliefert.
- **Halloween-Katze:** ausdrücklich vom Auftraggeber als Maskottchen bereitgestellt: `C:/Users/Thomas/Downloads/halloween+cat+3d+model_Clone1.glb`. Unveränderte Sicherung `halloween-cat-original.glb`, SHA-256 `cecee5c953cef238d04989662c6affe9463d7291fff392e1324ecd75165b1f49`. Interne Mesh-/Materialnamen enthalten Tripo. Keine CC0-Lizenzangabe für dieses gelieferte Fremdmodell bekannt; die eigene CC0-Erklärung des Stands bezieht sich nicht auf die Katze. Keine zusätzliche Quelle/Lizenz erfinden.
- Runtime-Ableitung der Katze: Geometrie unverändert (7.372 Dreiecke), auf 1,08 m Höhe skaliert, bodenbündig zentriert; PBR-Maps auf maximal 1.024 px begrenzt und eingebettet. Die kombinierte Standdatei enthält die Katze bereits; separate Katze nicht zusätzlich platzieren.
- **Quiztexte:** neue kurze Englisch-Lernaufgaben und allgemein gebräuchliche Halloween-Sätze. Keine echten Schülerdaten. Audios werden ausschließlich aus den vier festen Hörsätzen über Edge TTS erzeugt; Status im Audio-Manifest.

Das zentrale `blender/sources/LICENSES.md` wird wegen der ausdrücklichen Schreibgrenze dieses Auftrags nicht verändert. Bei späterer Integration diesen lokalen Quellenbeleg dorthin übertragen.

## Maßgebliche Ergänzung r14: gelieferter Shop und Kessel

Aktive Assembly `halloween-shop-event.glb` besteht jetzt ausschließlich aus den vom Nutzer bereitgestellten Modellen; die eigene CC0-Standgeometrie oben ist bencht. Zusätzlich geliefert: `halloween+shop+3d+model.glb` (SHA-256 5a7cc805e5236cf71f44eefbf2320c15a4f0989b948671a48e7575810aed6841) und `halloween+candy+cauldron+3d+model.glb` (SHA-256 10ed34fac4d587888cbe3eae4472639a80da6e249d5b66b240c7142248238ad1). Keine eigenen CC0-Rechte für diese Fremdmodelle behaupten; Nutzung als gelieferte Auftragsassets, keine zusätzliche Lizenzangabe bekannt. Originale unverändert unter sources/season-starter gesichert.

Aktive Katze `halloween-cat-large.glb` enthält nur die größte zusammenhängende Figur (3.487 Dreiecke). Die kleinere Katzengruppe wurde aus der Runtime-Ableitung entfernt, UVs/Maps bleiben erhalten. Keine Originaldatei verändert oder entfernt. Runtime-Maps aller drei Modelle auf 1.024 px begrenzt und eingebettet. Der alte Eigenentwurf verbleibt mit seinen eigenen Lizenzangaben in assets/season-starter/bench/custom-stand-r1.
