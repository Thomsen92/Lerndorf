# Auftrag an ChatGPT – Halloween-Marktplatz (Prototyp)

Dieser Text ist zum Kopieren in eine ChatGPT-Session mit Repo-Zugriff gedacht.

---

Du arbeitest im Repository **Lerndorf** (TypeScript, Vite, three.js 0.170.x, Supabase). Das Dorf ist eine 3D-Klassendorf-Szene für Englisch 8a/8b.

Dein Auftrag: **Baue einen eigenständigen Prototyp des Halloween-Marktplatzes im Ordner `Prototyp/marktplatz/`.** Es geht um die Gestaltung und Stimmung – noch nicht um die Integration ins Spiel.

**Wichtig:** Der bestehende `Prototyp/index.html` ist das freigegebene Soll-Bild und bleibt **unangetastet**. Du legst einen **neuen Unterordner** an und arbeitest nur dort.

## Ziel

Ein Marktplatz im Halloween-Look: **Blutmond, Nebel, flackernde Lampions, Kürbisse, Gräber, tote Bäume, Marktstände** und ein **Season-Stand mit Willkommensnachricht** („Season I – Halloween“). Gruselig, aber nicht bedrohlich für Achtklässler.

**Referenz:** `web/dev/marktplatz.html` (grober Three.js-Prototyp von mir) und `web/test-results/learnpass/markt-final.png`.

## Muss

- Blutmond mit Halo, Nachthimmel, Nebel, düsteres Licht.
- Lampions mit Flackern, Kürbisse, Gräber, tote Bäume, 3–4 Marktstände.
- **Season-Stand** (Kürbisbude) mit Schild und Willkommensnachricht; im Prototyp ein Knopf, der eine Meldung zeigt (der echte LearnPass kommt später).
- Optional: max. 5 dezente Zombies, langsam, ohne Erschrecken.
- Kamera: ruhige Umkreisung, Maus zum Drehen, Scrollen zum Zoomen.
- Auf dem Schultablet flüssig (≥ 30 fps).

## Ordner und Dateien

```
Prototyp/marktplatz/
  index.html          ← der Prototyp
  README.md           ← wie man ihn startet, was drin ist
  assets/             ← kopierte GLBs/Texturen, die du brauchst
  vendor/             ← three.module.js + benötigte Addons (OrbitControls, GLTFLoader, MeshoptDecoder)
```

- Alles **relativ** verlinken, damit der Ordner für sich läuft.
- Start: `npx serve Prototyp/marktplatz` (oder ein beliebiger statischer Server). Kein Build nötig.
- Keine Änderungen an `web/src/`, `Prototyp/index.html` oder anderen bestehenden Dateien.

## Assets

**Kenney (CC0):** `web/public/assets/kenney/{forests,survival,town,food,nature,graveyard}/` – kopiere nur, was du verwendest.

**Season I (28 Modelle, fertig):** `web/public/assets/season1/` mit `manifest.json` – u. a. Horror-Haus, Warlock, Monsterpflanze, Kürbisbaum, Kürbisfeld, Gräber, Geisterkatze, Hexe, Kürbismädchen. **Achtung:** Diese GLBs sind meshopt-komprimiert; ohne `MeshoptDecoder` laden sie nicht.

**Quellen (nicht im Bundle):** `Lerndorf/Assets/Season I/` – `Deko/Klein`, `Deko/Gross`, `Deko/Figuren`, `Boden`, `Bauwerke`, `Fahrzeuge`, `Nicht Season`, `SORTIERUNG.md`.

**Accessoires:** `Lerndorf/Assets/Accesoires/` (Helm, Kette, Brille, Hellebarde) – nur, wenn es zur Szene passt.

Wenn ein Motiv fehlt: **baue es selbst in Blender** – low-poly, passend zum Dorf-Look, CC0 oder eigen, als GLB exportiert, Eintrag in `blender/sources/LICENSES.md`.

## Technik

- three.js 0.170.x, TypeScript ist hier nicht nötig – ein sauberes Modul-Skript reicht.
- **Deterministisch**: feste Zufallszahlen (eigener PRNG mit Seed), kein `Math.random` für die Platzierung.
- **Budget:** < 150.000 Dreiecke, < 150 Draw Calls, ≥ 30 fps auf dem Tablet.
- `docs/LOOK.md` beachten (Farben, Stil).
- Bei „Weniger Bewegung“: Flackern und Zombies reduzieren.

## Prozess

1. **Bestandsaufnahme:** Assets sichten, kurz auflisten, was du nimmst.
2. **Konzept (max. 1 Seite):** Aufbau, Stimmung, Asset-Liste, was selbst gebaut wird.
3. **Umsetzung in kleinen Schritten**, nach jedem Schritt Screenshot selbst ansehen und mit `Konzept/Stil_Referenz/` vergleichen.
4. **Abschluss:** Performance messen (Draw Calls, Dreiecke, fps), README schreiben, Screenshots ablegen.

## Regeln

- **Nichts committen oder pushen**, außer ich bitte darum.
- Nur **CC0** oder eigene Assets; Quellen in `blender/sources/LICENSES.md`.
- Keine echten Schülerdaten, keine Analytics.
- `Prototyp/index.html` und andere bestehende Dateien **nicht ändern**, nur den neuen Unterordner anlegen.
- `Konzept/`, `../Referenz` und `Thomsen92/English-Club-8` nicht anfassen.
- Bestehende Modelle nicht entfernen.

## Übergabe

- `Prototyp/marktplatz/index.html`, die läuft,
- README mit Startbefehl und Asset-Liste,
- 2–3 Screenshots (Totale, Detail Season-Stand, Nachtstimmung),
- Messwerte (Dreiecke, Draw Calls, fps),
- kurze Notiz, was für die spätere Integration ins Dorf zu beachten ist.
