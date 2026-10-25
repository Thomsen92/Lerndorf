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

Stand 25.10.2026. Maßgeblich sind die Arbeitspakete und Abnahmen in [docs/PLAN.md](docs/PLAN.md).

| Bereich | Stand | Nächster Schritt |
| --- | --- | --- |
| Grundfunktionen, Dorf, Daily Quests, Shop/Bauen und Erststart-Tutorial | im Code vorhanden; Migrationen 0001–0019 online bestätigt | offene Abnahmen laut PLAN |
| XP, Level und Profil | lokal umgesetzt; 796 Tests, Build, ESLint und Browser-Prüfungen grün | Migration 0020 einspielen, auf dem Schul-Tablet abnehmen |
| Lehrerbereich überarbeiten | Design und Umsetzungsplan vorhanden | nächstes geplantes Funktionspaket |
| Sir Byte als Begleiter | Design und Umsetzungsplan vorhanden | anschließend umsetzen |
| Avatar-Baukasten und weitere Asset-Arbeit | Restumfang in Stufe 2 | nach PLAN und Abnahme |

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
