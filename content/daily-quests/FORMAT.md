# Format der Tagesaufgaben (Daily Quests)

Diese Datei beschreibt, wie eine Woche Tagesaufgaben aussehen muss. Sie ist für Claude im Wochenplan-Projekt gedacht, das die Dateien erzeugt. Die Erklärungen sind deutsch, die Aufgaben selbst englisch.

## Dateiname

Eine Datei pro Woche, benannt nach dem **Montag** der Woche: `2026-11-09.json`. Das Feld `week` muss genau diesem Datum entsprechen und ein Montag sein.

## Aufbau einer normalen Woche

- `week`: Montag, Format `JJJJ-MM-TT`.
- `days`: **genau 7 Tage** (Montag bis Sonntag), jeder mit `date` (Montag + 0 bis 6 Tage) und `quests`.
- `quests`: **genau 3 Aufgaben** pro Tag.
- Jede `id` kommt in der ganzen Datei nur **einmal** vor. Schema: Tageskürzel plus Nummer, z. B. `tue-2`. Erlaubt sind Kleinbuchstaben, Ziffern und Bindestrich (max. 31 Zeichen).

Gemeinsame Felder jeder Aufgabe:

| Feld | Regel |
| --- | --- |
| `id` | siehe oben |
| `type` | `choice`, `gap`, `match`, `order` oder `listening` |
| `prompt` | Text, höchstens 200 Zeichen |
| `hint` | Tipp, höchstens 120 Zeichen, **nicht leer** |
| `reward` | ganze Zahl von 1 bis 20 (Münzen) |

### Hinweise (hint)

Ein Hint ist **ein kurzer Satz in sehr einfachem Englisch** und verrät die Lösung nicht.

### Belohnung (reward)

Richtwert: **5** leicht, **10** mittel, **15** schwer. Erlaubt sind 1 bis 20.

### Auszahlung (Entscheidung der Lehrkraft)

Versuche sind unbegrenzt. Münzen gibt es nur, wenn die richtige Antwort **innerhalb der ersten 3 Versuche** kommt. Wer eine Aufgabe erst am nächsten Tag nachholt, bekommt die **Hälfte** (aufgerundet). Das muss in der Datei nichts ändern; es hilft nur bei der Wahl der `reward`-Werte.

## Beispiele je Typ

### choice (eine richtige Antwort)

2 bis 6 verschiedene `options`; `solution` ist genau eine davon.

```json
{
  "id": "mon-1",
  "type": "choice",
  "prompt": "What is 'Fahrkarte' in English?",
  "hint": "It is a small paper for the bus.",
  "reward": 5,
  "options": ["ticket", "card", "map", "fare"],
  "solution": "ticket"
}
```

### gap (Lückentext)

Der `prompt` enthält `___` (drei Unterstriche). `solution` ist eine Liste erlaubter Antworten (1 bis 10).

```json
{
  "id": "mon-2",
  "type": "gap",
  "prompt": "Yesterday we ___ to Brooklyn.",
  "hint": "Think of the past of go.",
  "reward": 10,
  "solution": ["went"]
}
```

### match (Paare zuordnen)

2 bis 6 Paare `[englisch, deutsch]`. Kein Wort darf links oder rechts doppelt vorkommen. Die rechte Spalte wird beim Import gemischt.

```json
{
  "id": "mon-3",
  "type": "match",
  "prompt": "Match the words.",
  "hint": "Look at the first letters.",
  "reward": 10,
  "pairs": [["bridge", "Brücke"], ["street", "Straße"], ["river", "Fluss"]]
}
```

### order (Wörter ordnen)

`solution` ist die richtige Reihenfolge, 2 bis 12 Wörter. Die Wörter werden beim Import gemischt (nie in der Lösungsreihenfolge).

```json
{
  "id": "tue-1",
  "type": "order",
  "prompt": "Put the words in order.",
  "hint": "The sentence starts with the.",
  "reward": 15,
  "solution": ["the", "dog", "sees", "the", "cat"]
}
```

### listening (Hörverstehen)

`speak` ist der Text, der vorgelesen wird (höchstens 400 Zeichen). `mode` ist `choice` oder `gap` (nicht `match`, nicht `order`).

- `mode: "choice"`: wie bei choice mit `options` und `solution` (Text).
- `mode: "gap"`: wie bei gap, der `prompt` enthält `___`, `solution` ist eine Liste.

```json
{
  "id": "tue-2",
  "type": "listening",
  "prompt": "Listen. Where is the girl going?",
  "hint": "Listen for a place.",
  "reward": 5,
  "speak": "The girl is going to the station.",
  "mode": "choice",
  "options": ["the station", "the school", "the park"],
  "solution": "the station"
}
```

```json
{
  "id": "wed-1",
  "type": "listening",
  "prompt": "Listen and fill the gap: He is waiting at ___.",
  "hint": "Listen for the place.",
  "reward": 10,
  "speak": "He is waiting at the station.",
  "mode": "gap",
  "solution": ["the station"]
}
```

## Ferienwoche oder Feiertagswoche

Für Wochen ohne Aufgaben genügt eine Datei mit genau diesen Feldern, **ohne** `days`:

```json
{ "week": "2026-11-02", "holiday": true }
```

## Prüfen

Der Validator (`web/scripts/quests.ts`, Funktion `validatePackage`) liefert deutsche Fehlermeldungen mit Pfad, z. B. `days[2].date: 2026-11-11 erwartet` oder `days[0].quests: genau 3 Aufgaben`. Eine Datei ist nur gültig, wenn keine Meldung erscheint. Eine vollständige Beispielwoche liegt in `web/tests/fixtures/quests/2026-11-09.json`.
