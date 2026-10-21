# Tablet-UI und Navigation für Lerndorf – Design

**Stand:** 21.10.2026  
**Status:** Grundrichtung bestätigt: feste mobile Spielnavigation. Schriftliche Prüfung durch den Auftraggeber steht aus.

## 1. Ziel

Die wichtigsten Lern- und Dorfaktionen sollen auf Schul-Tablets schnell, verständlich und mit Touch oder Tastatur erreichbar sein. Shop, Inventar und Baumodus sollen eine gemeinsame Gegenstandsvorschau verwenden, damit Schüler vor dem Kauf oder Platzieren erkennen, wie ein Asset aussieht und wohin es passt.

Dieses Design behandelt Menüführung und Bedienbarkeit. Farben, Typografie, Illustration und sonstige visuelle Neugestaltung werden in einer späteren visuellen Arbeit festgelegt. Anwendung und Datenbank werden durch dieses Dokument nicht geändert.

## 2. Projektkontext

- Die Dorfansicht wird in `web/src/ui/villageView.ts` aufgebaut. Der HUD enthält derzeit Aufgaben, Konto, Shop, Bauen, Marktplatz, Mein Haus und Abmelden sowie die Grafikqualität.
- Shop und Aufgaben öffnen eigenständige Overlays. `shopView.ts` zeigt Gegenstände als Textzeilen mit Preis, Bestand und Kaufaktion; eine Vorschau fehlt.
- Der Baumodus in `web/src/render/buildMode.ts` hebt die festen Slots hervor. Nach der Slot- und Gegenstandswahl wird über eine separate Aktion platziert; eine Vorschau vor dem Speichern fehlt.
- `web/src/style.css` setzt bereits 18 px Grundschrift, mindestens 44 px hohe Buttons, Safe-Area-Abstände und ein dunkles Farbschema. Die vorhandenen Ansichten sind aber nicht als ein zusammenhängendes Tablet-Menü organisiert.
- Inventar, Münzen und Platzierungen werden über bestehende API-Funktionen und Supabase-RPCs gelesen beziehungsweise geändert. Diese Zuständigkeit bleibt erhalten.

## 3. Gewählte Richtung

Es gibt drei naheliegende Navigationsmodelle: eine feste Navigationsleiste, kontextabhängige Aktionen am Grundstück oder eine zentrale Menütafel. Die feste Leiste wird gewählt, weil die Hauptziele dadurch auf jeder Dorfansicht sichtbar bleiben und keine Aktion erst durch Antippen eines bestimmten Weltobjekts auffindbar wird.

### Hauptnavigation

Eine dauerhaft sichtbare, beschriftete Navigation bietet fünf Bereiche:

1. **Dorf** – zurück zur 3D-Welt und zu den Weltzielen wie Marktplatz und eigenes Grundstück.
2. **Aufgaben** – Daily Quests öffnen.
3. **Bauen** – eigenen Grundstücks-Baumodus starten.
4. **Shop** – Gegenstände ansehen und kaufen.
5. **Inventar** – eigene Gegenstände und ihre Verwendung ansehen.

Münzstand und Avatarname bleiben an einer leicht auffindbaren Statusstelle. Kontoauszug, Grafikqualität und Abmelden liegen in einem Konto-/Einstellungsmenü und belegen keinen Hauptplatz. Die Navigation bleibt beschriftet; Symbole sind zusätzliche Orientierung, keine alleinige Kennzeichnung. Der aktive Bereich ist programmatisch und visuell erkennbar.

Marktplatz und „Mein Haus“ bleiben als Ziele erhalten, werden aber aus dem globalen Menü in den Dorfbereich verschoben: „Marktplatz“ ist eine Welt-/Kameraziel-Aktion; das Grundstück wird über die Dorfkarte oder den eigenen Haus-Einstieg erreicht.

## 4. Gegenstände: Shop, Inventar und Bauen

Shop, Inventar und Baumodus verwenden eine gemeinsame Gegenstandsdarstellung und denselben Vorschau-Einstieg. Die UI zeigt pro Gegenstand Name, Kategorie, Besitzmenge beziehungsweise Platzierungsstatus, Kosten und passende Slots. Kauf-, Inventar- und Platzierungsdaten kommen weiterhin aus den bestehenden API-Funktionen.

### Shop-Ablauf

Der Shop zeigt Kategorien für Häuser, Garagen, Autos, Deko und Avatar-Gegenstände. Eine Kategorie enthält kompakte Gegenstandskarten statt einer einzigen langen Liste. Antippen öffnet eine Detailansicht mit 3D-Vorschau, Preis, Besitzstatus, Passform/Slot und Kaufaktion. Vor dem Kauf wird der Gegenstand und Münzpreis eindeutig bestätigt. Nach Erfolg aktualisiert sich der Münzstand und die Detailansicht bietet den Weg zum Inventar oder direkt zum passenden Bauplatz an.

Wenn ein Modell nicht geladen werden kann, bleiben Name, Preis, Besitzstatus und Bedienung nutzbar; die Vorschau zeigt einen klaren Fehlerzustand mit Wiederholen-Aktion. Der Fehler darf keine Kauf- oder Platzierungsaktion auslösen.

### Inventar-Ablauf

Das Inventar gruppiert eigene Gegenstände nach Kategorie und zeigt sowohl unplatzierte als auch bereits verwendete Gegenstände. Die Detailansicht zeigt die Vorschau, den aktuellen Platzierungsort und die passende Aktion. Ein nicht platzierter Gegenstand kann von dort in den Baumodus übernommen werden. Ein bereits platzierter Gegenstand führt zum zugehörigen Slot und bietet die Aktionen, die für diesen Slot und Gegenstand bereits gelten.

### Baumodus-Ablauf

Der Schüler öffnet **Bauen**, wählt einen sichtbaren Slot aus einer zugänglichen Liste oder direkt in der Welt und sieht danach ausschließlich passende, verfügbare Inventargegenstände. Bei Auswahl erscheint das Asset als Vorschau am Slot, bevor die Platzierung gespeichert wird. Die UI bietet klar erkennbare Aktionen für **Platzieren**, **Drehen** (wo erlaubt), **Abbrechen** und vorhandene Slot-Aktionen wie Wegräumen. Erst **Platzieren** ruft die bestehende serverseitige Platzierungsaktion auf. Abbrechen lässt Besitz und aktuelle Platzierung unverändert.

Ein Einstieg vom Shop oder Inventar in den Baumodus übergibt den ausgewählten Gegenstand und hebt erlaubte Slots hervor. Dadurch muss der Schüler Kategorie und Gegenstand nicht erneut suchen.

## 5. Tablet- und barrierearme Bedienung

- Touch-Ziele bleiben mindestens 44 × 44 CSS-Pixel groß. Wichtige Aktionen bekommen genügend Abstand und stehen nicht dicht an Bildschirmrändern oder Geräteausschnitten.
- Die Oberfläche funktioniert im Hoch- und Querformat sowie mit vergrößerter Browser-Schrift. Überlaufende Kategorien und Inventare bleiben innerhalb ihrer Ansicht scrollbar; die Hauptnavigation bleibt erreichbar.
- Alle Aktionen sind per Tastatur erreichbar. Fokus ist sichtbar, die Reihenfolge ist nachvollziehbar und Dialoge setzen den Fokus beim Öffnen sinnvoll sowie beim Schließen zum Auslöser zurück.
- Overlays und Detaildialoge erhalten Namen und passende Dialog-/Überschriftenstruktur. Hintergrundaktionen sind während eines modalen Dialogs nicht versehentlich bedienbar. Escape schließt schließbare Dialoge; bei laufender Transaktion wird versehentliches Schließen verhindert oder verständlich behandelt.
- Screenreader erhalten verständliche Namen und Statusmeldungen, zum Beispiel für aktiven Navigationsbereich, Münzänderungen, Kaufresultate, Vorschaufehler und Platzierungsfehler.
- Auswahl, Verfügbarkeit und Seltenheit sind nicht ausschließlich durch Farbe unterschieden.
- Die 3D-Welt bleibt visuell bedienbar, bekommt aber für eigene Slots und verfügbare Aktionen eine gleichwertige 2D-Liste. Keine Pflichtaktion darf nur durch Präzisionstippen in der 3D-Szene erreichbar sein.
- Bei aktivierter Systemeinstellung `prefers-reduced-motion` sind Kamerafahrten und animierte Vorschauen reduziert. Keine Information darf nur durch Animation vermittelt werden.

## 6. Zuständigkeiten und Datenfluss

Die Navigation wechselt zwischen bestehenden Funktionsbereichen; sie ändert keine Spielregeln. Eine gemeinsame Gegenstandsansicht erhält die benötigten Katalog- und Inventardaten und zeigt passend zur Herkunft die zulässige Aktion. Die Vorschau verwendet das jeweilige vorhandene Modell und muss Eingaben zur 3D-Welt sauber von Menü-Touch-Eingaben trennen.

Käufe, Münzen und Slotänderungen werden weiterhin ausschließlich über bestehende serverseitige Funktionen/RPCs abgewickelt. Die Vorschau ist lokal und unverbindlich. Vor einer bestätigten Platzierung oder einem Kauf wird nichts dauerhaft geändert. RLS, Serverprüfungen, Inventarregeln und Klassenschalter bleiben maßgeblich.

## 7. Fehler- und Leerzustände

- Laden Shop oder Inventar nicht, erscheint eine verständliche Meldung mit Wiederholen- oder Schließen-Aktion; die Hauptnavigation bleibt nutzbar.
- Bei leeren Kategorien und leerem Inventar erklärt die Ansicht, was dort angezeigt wird und – falls passend – wie ein Gegenstand erhältlich ist.
- Bei zu wenig Münzen, geschlossenem Shop/Baumodus oder bereits belegtem Slot wird die Ursache in Text genannt und die nicht mögliche Aktion ist deaktiviert.
- Ein fehlgeschlagener Kauf oder eine fehlgeschlagene Platzierung ändert weder Münzen noch Platzierung lokal und bietet einen erneuten Versuch.
- Beim Wechsel zwischen Hauptbereichen wird der zuletzt sinnvolle Zustand erhalten, soweit es nicht mit einem bestätigungspflichtigen Kauf oder einer Platzierung kollidiert.

## 8. Abnahmekriterien für spätere Umsetzung

1. Die fünf Hauptbereiche sind auf Tablet-Ansichten ständig erkennbar und mit höchstens einem Tippen erreichbar.
2. Kontoauszug, Grafikqualität und Abmelden bleiben erreichbar, verdrängen aber keine Hauptfunktion.
3. Shop und Inventar zeigen Gegenstände kategorisiert und verfügen über eine gemeinsame Detailansicht mit Modellvorschau, Besitz-/Platzierungsstatus und passenden Aktionen.
4. Aus dem Shop kann ein gekaufter Gegenstand direkt in den passenden Baumodus übergeben werden.
5. Im Baumodus ist vor dem Speichern sichtbar, wie der ausgewählte Gegenstand auf dem gewählten Slot aussieht.
6. Abbrechen der Vorschau speichert keine Platzierung und verbraucht keinen Gegenstand.
7. Kauf und Platzierung verwenden weiterhin die serverseitigen Funktionen; UI-Vorschau kann Münzen, Besitz oder Platzierung nicht verändern.
8. Alle Kernaktionen funktionieren durch Touch und Tastatur; Screenreader können Navigation, Status, Dialoge, Aktionen und Fehler erkennen.
9. Die eigenen Slots und ihre Aktionen sind zusätzlich ohne präzises Tippen in der 3D-Welt bedienbar.
10. Layout und Navigation funktionieren in Hoch- und Querformat mit Safe-Area-Abständen und bei reduzierter Bewegung.

## 9. Bewusst offen gelassen

- Exakte visuelle Gestaltung, Farben, Icons, Animationen und Größenverhältnisse.
- Ob die Hauptnavigation im Querformat unten oder als seitliche Leiste sitzt. Standardvorschlag für die Umsetzung ist eine beschriftete untere Leiste, sofern sie im getesteten Tablet-Querformat nicht zu viel Spielfläche verdeckt.
- Vorschau-Technik und Wiederverwendung vorhandener Three.js-Modelle; dies wird bei der Umsetzungsplanung anhand des Asset-Katalogs entschieden.
- Zusätzliche Sortier- und Filteroptionen jenseits von Kategorie, Preis und Besitzstatus.

Diese offenen Punkte ändern nicht die bestätigte Hauptnavigation oder die geforderten Vorschau- und Bedienabläufe.

## 10. Präzisierungen nach Prüfung (21.10.2026)

Diese Punkte lösen Widersprüche und Lücken der Abschnitte 3–9 auf. Sie gelten für die Umsetzung (`docs/superpowers/plans/2026-10-21-tablet-ui-navigation.md`).

1. **Bereiche statt Vollbild-Dialoge.** Shop, Inventar und Aufgaben sind nicht-modale *Bereiche*: Sie füllen die Spielfläche, die Hauptnavigation bleibt daneben bedienbar. Modal (Hintergrund und Navigation gesperrt, Escape schließt) sind nur die Gegenstands-Detailansicht mit Kaufbestätigung und das Konto-Menü mit Kontoauszug. So passen „Navigation immer erreichbar“ (§5) und „Hintergrund im Dialog gesperrt“ (§5) zusammen.
2. **Lage der Navigation.** Hochformat: beschriftete Leiste unten. Querformat: beschriftete Seitenleiste links, weil die Bau-Leiste unten sitzt und zwei Leisten unten im Querformat zu viel Spielfläche verdecken. Umschaltung nur per CSS-Medienabfrage.
3. **Aufgaben.** Solange die Daily Quests nicht gebaut sind, öffnet „Aufgaben“ die bestehende Aufgabentafel. Das Antippen der Tafel im Dorf öffnet denselben Bereich.
4. **Avatar-Gegenstände** haben noch kein 3D-Modell und keinen Grundstücksplatz. Shop und Inventar zeigen sie ohne Vorschau mit dem Hinweis „Vorschau gibt es mit dem Avatar-Editor.“ und ohne Bauen-Aktion.
5. **Haus-Menü statt fünf Hauptbereiche (Entscheidung Auftraggeber 21.10.2026, ersetzt §3 „Hauptnavigation“ und Abnahmekriterium §8.1).** Die feste Leiste hat nur noch drei Knöpfe: **Dorf**, **Aufgaben**, **Mein Haus**. „Mein Haus“ antippen *oder* direkt auf das eigene Grundstück in der 3D-Welt tippen führt zum selben Ergebnis: Die Kamera fährt zum eigenen Haus und bleibt dort fest (keine Drehung, kein Zoom, kein Verschieben), und das Haus-Menü öffnet sich mit **Bauen**, **Shop**, **Inventar**, **Einstellungen** und **Zurück**. Shop und Inventar sind damit mit zwei Tipps erreichbar. „Zurück“ (oder „Dorf“) löst die Kamera wieder. Schließen von Shop oder Inventar führt zurück ins Haus-Menü; „Fertig“ im Baumodus ebenso. Im Baumodus darf die Kamera um das Haus gedreht und gezoomt werden, aber nicht verschoben. „Einstellungen“ enthält Kontoauszug, Grafik-Qualität und Abmelden; dasselbe Menü öffnet auch die Statusanzeige (Spitzname, Münzen), damit Abmelden auch ohne Grundstück erreichbar ist. Ohne eigenes Grundstück zeigt „Mein Haus“ den Hinweis „Du hast noch kein Grundstück.“ Im Bereich „Dorf“ bleibt ein Knopf „Marktplatz“ (Kamerasprung). Bei `prefers-reduced-motion` springt die Kamera ohne Fahrt.
6. **Vorschau-Technik.** Detailansicht: ein kleiner, eigener Three.js-Renderer nur solange die Ansicht offen ist; er nutzt die vorhandenen Modelle aus `render/plotAssets.ts`. Während ein Bereich oder Dialog offen ist, zeichnet das Dorf keine Bilder (Leistung und Akku auf Tablets). Fehlerzustand = WebGL nicht verfügbar oder Kontext verloren.
7. **Vorschau im Baumodus** ohne zusätzlichen Renderer: Der gewählte Gegenstand erscheint direkt auf dem eigenen Grundstück am gewählten Platz (gleiche Darstellung wie nach dem Speichern), dazu der Text „Vorschau – noch nicht gespeichert“. **Drehen ändert nur die Vorschau**, erst „Speichern“ ruft `place_in_slot` auf (bisher drehte der Knopf sofort auf dem Server). „Wegräumen“ bleibt eine sofortige Aktion.
8. **2D-Platzliste.** Ohne gewählten Platz zeigt die Bau-Leiste alle sieben Plätze als Knöpfe mit aktuellem Inhalt; Antippen in der 3D-Welt bleibt zusätzlich möglich.
9. **Zustand beim Bereichswechsel.** Erhalten bleibt die zuletzt gewählte Kategorie in Shop und Inventar. Eine nicht gespeicherte Bauvorschau wird beim Verlassen von „Bauen“ verworfen; ein laufender Kauf verhindert das Schließen der Detailansicht.
10. **Nicht Teil dieser Umsetzung:** Sperren der Navigation für das Erststart-Tutorial (kommt mit dem Tutorial), Ersatz von `window.confirm` bei der Grundstückswahl (entfällt mit dem Tutorial), Daily Quests, visuelle Neugestaltung.
