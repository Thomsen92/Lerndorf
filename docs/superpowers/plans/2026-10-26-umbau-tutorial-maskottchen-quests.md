# Umbau: Sir Byte, Tutorial, Daily Quests – Übersicht

Dieser Plan ist auf zwei Bearbeiter aufgeteilt. Jeder Teil ist eigenständig lesbar, mit eigenen Dateien, Tests und Commits.

| Teil | Bearbeiter | Inhalt | Datei |
|---|---|---|---|
| **1** | ChatGPT | Datenbank und Server: 4 Quests pro Tag, Wortbank, Edge-TTS-Pipeline, Wirtschaft | [Teil 1 – Daten & Server](2026-10-26-teil-1-daten-server.md) |
| **2** | Claude | Oberfläche: Sir Byte, Tutorial mit Sprache, Comic-Wisch, Münzploppen, Tablet-Kacheln | [Teil 2 – Oberfläche](2026-10-26-teil-2-oberflaeche-tutorial.md) |

## Schnittstelle zwischen beiden Teilen

```ts
// web/src/quests/listening.ts  (Teil 1 legt sie an, Teil 2 importiert sie)
export function listeningPath(text: string, voice?: string, rate?: string): string;
// → "assets/listening/1a2b3c4d.mp3"
```

- Kein `data.audio`-Feld: beide Seiten rechnen den Pfad aus `data.speak`.
- Lückentext: `data.bank?: string[]` (Teil 1 reicht durch, Teil 2 zeigt Kacheln).
- Ein Tag hat 3 oder 4 Quests, `slot` 1–4 (Teil 1; die Oberfläche rechnet dynamisch).

## Reihenfolge

1. Teil 1: D1 → D2 → D3 → D4 → D5.
2. Teil 2: U1 → U2 → U3 → U4 → U5 → U6 → U7 → U8.
3. U7 (Hördateien im Browser) erst nach D3.
4. Merge: Daten zuerst, Oberfläche danach; `docs/SPEC.md` abschnittsweise, damit sich die Bearbeiter nicht überschreiben.

## Migrationsnummern

`0023` bleibt für den Avatar-Kleiderschrank reserviert (unfertige Arbeit im Arbeitsordner). Teil 1 nutzt **0024** (Quests) und **0025** (Wirtschaft). Teil 2 hat keine Migration.

## Was die Lehrkraft tut

1. **18 Aufnahmen** in ElevenLabs erzeugen und nach `web/public/assets/sir-byte/voice/` legen (Namen und Sätze siehe Teil 2, Aufgabe U2).
2. **Edge-TTS prüfen:** `edge-tts --list-voices | findstr en-GB`.
3. **Stimmen erzeugen:** vor jeder neuen Woche `web/stimmen.cmd` doppelklicken.
4. **Abnahme** nach jedem Teil auf dem Schul-Tablet; Prüfpunkte stehen am Ende der Teile.
