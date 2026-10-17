# Lerndorf

Gamification für Englisch 8a/8b: Jede Klasse hat ein eigenes 3D-Dorf im Browser. Jeder Schüler hat einen Avatar und ein Haus mit Grundstück, in der Mitte liegt ein Marktplatz mit Aufgabentafel. Münzen gibt es für Aufgaben am Marktplatz und für Wochenplan-Stempel; damit gestalten die Schüler Avatar und Grundstück.

Dieser Ordner enthält nur das Lerndorf. Die Wochenpläne und die Website English Club 8 bleiben davon getrennt und werden nicht verändert.

## Für die Weiterentwicklung

- `docs/SCOPE.md` – Umfang, Nicht-Umfang, Stufen, Erfolgskriterien
- `docs/SPEC.md` – technische Spezifikation (Architektur, Datenmodell, Spiellogik, Abnahme)
- `CLAUDE.md` – Regeln für Claude Code

## Inhalt

| Ordner / Datei | Was es ist |
| --- | --- |
| `Konzept/Lerndorf_Konzept.docx` | Konzept für Kollegen: Spielprinzip, Technik, Datenmodell, Aufwand, Risiken, offene Fragen (Stand 16.10.2026) |
| `Konzept/Dorfszene_Konzept_v1.jpg` | erste Konzept-Szene (noch rundes Ring-Layout) |
| `Prototyp/index.html` | aktueller Prototyp (Stufe 0): Gelände mit Hügeln, Fluss, zwei Brücken, verstreute Grundstücke, Figuren laufen, grüßen, setzen sich; Leistungsanzeige für Tablet-Tests |
| `Prototyp/Screenshots/` | Bilder der Prototyp-Versionen |

## Prototyp öffnen

`Prototyp/index.html` im Browser öffnen (Doppelklick). Es braucht eine Internetverbindung, weil Three.js von cdn.jsdelivr.net geladen wird. Online-Version: privates Claude-Artifact „Lerndorf Prototyp“.

Bedienung: Ein Finger verschiebt, zwei Finger drehen und zoomen, Figur antippen lässt sie winken. Unten: Anzahl Figuren (8/24/40, gleich viele Grundstücke), Qualität (Auto/Hoch/Niedrig), „Neues Layout“ würfelt Hügel, Grundstücke und Bäume neu.

## Entscheidungen

- Jede Klasse (8a, 8b) bekommt ein eigenes Dorf.
- Datenbank: Supabase (Free-Plan, Region Frankfurt); Website-Hosting später über ein eigenes, neues GitHub-Repository.
- Darstellung: Three.js im Browser, gemütlicher Low-Poly-Comic-Look mit Abendlicht.
- Avatare laufen selbständig (nicht steuerbar), sollen cool, individuell und niedlich wirken.
- Dorf-Layout organisch: Hügel, Fluss mit Brücken, Grundstücke unterschiedlich weit auseinander.
- Nur Spitznamen, keine echten Schülerdaten.
- Prototyp lief auf den Schul-Tablets gut.

## Stand und nächste Schritte

| Stufe | Inhalt | Stand |
| --- | --- | --- |
| 0 · Prototyp | Dorf aus Platzhaltern, Figuren auf dem Wegenetz, Tablet-Test | erledigt |
| Stil-Test | CC0-Modelle (z. B. Kenney, Quaternius) per Blender-Skript umfärben, Licht einbacken, als GLB einbauen; eine animierte Figur | als Nächstes |
| 1 · Fundament | Supabase, Login mit Spitznamen, Lehrer-Seite, Weck-Auftrag | offen |
| 2 · Dorf | echte Modelle, Avatar-Baukasten, Animationen | offen |
| 3 · Aufgaben | Aufgabentafel, serverseitige Prüfung, Tageslimit | offen |
| 4 · Bauen | Shop, Inventar, Baumodus | offen |

Offen: Klassengröße 8a und 8b (Anzahl Grundstücke), Münzbeträge und Tageslimit, ältestes Tablet-Modell.

## Geplante Ordnerstruktur

```
Lerndorf/
  Konzept/      Konzeptpapiere, Bilder
  Prototyp/     Testversionen
  assets/       Modelle (GLB), Texturen  – kommt mit dem Stil-Test
  blender/      Blender-Skripte und Quelldateien
  supabase/     Datenbank-Schema und Funktionen
  web/          die eigentliche Lerndorf-Seite
```
