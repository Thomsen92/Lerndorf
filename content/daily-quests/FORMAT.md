# Format der Tagesaufgaben (Daily Quests)

Diese Datei beschreibt, wie eine Woche Tagesaufgaben aussehen muss. Sie ist für Claude im Wochenplan-Projekt gedacht, das die Dateien erzeugt. Die Erklärungen sind deutsch, die Aufgaben selbst englisch.

## Dateiname

Eine Datei pro Woche, benannt nach dem **Montag** der Woche: `2026-11-09.json`. Das Feld `week` muss genau diesem Datum entsprechen und ein Montag sein.

## Aufbau einer normalen Woche

- `week`: Montag, Format `JJJJ-MM-TT`.
- `days`: **genau 7 Tage** (Montag bis Sonntag), jeder mit `date` (Montag + 0 bis 6 Tage) und `quests`.
- `quests`: **3 oder 4 Aufgaben** pro Tag. Die Reihenfolge der Aufgaben im Tag ist ihr Platz (Slot 1 bis 4). Eine korrigierte Datei darf die Aufgaben eines Tages umsortieren.
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

Der `prompt` enthält `___` (drei Unterstriche). `solution` ist eine Liste erlaubter Antworten (1 bis 10). **Pflicht (seit 28.10.2026): `bank`** mit 2 bis 6 verschiedenen, nicht leeren Wörtern; mindestens eines davon muss eine richtige Lösung sein. Die Schüler tippen auf dem Tablet nur ein Wort der Wortbank an, sie tippen keinen Text mehr. `solution` bleibt getrennt und privat. Ohne `bank` lehnt der Import die Woche ab. (Schon importierte alte Lücken ohne Wortbank zeigen weiter ein Textfeld.)

```json
{
  "id": "mon-2",
  "type": "gap",
  "prompt": "Yesterday we ___ to Brooklyn.",
  "hint": "Think of the past of go.",
  "reward": 10,
  "bank": ["went", "go", "gone"],
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
  "hint": "Who does something? Start with them.",
  "reward": 15,
  "solution": ["the", "dog", "sees", "the", "cat"]
}
```

**Wichtig: nur ein Satz darf richtig sein.** Die Datenbank vergleicht die Wörter Stelle für Stelle mit `solution`. Sätze, bei denen man zwei Teile vertauschen kann und wieder einen richtigen Satz bekommt, sind nicht lösbar: „my pie is not as sweet as your cake“ lässt sich auch als „my cake is not as sweet as your pie“ legen (so geschehen am 30.10.2026). Nimm Sätze, bei denen nur eine Reihenfolge stimmt, z. B. mit einer Tatsache: „a bike is not as fast as a plane“ (andersherum ist es falsch). Der Hinweis (`hint`) darf auf die Tatsache zeigen („Which one is faster?“).

### listening (Hörverstehen)

`speak` ist der Text, der vorgelesen wird (höchstens 400 Zeichen). `mode` ist `choice` oder `gap` (nicht `match`, nicht `order`).

- `mode: "choice"`: wie bei choice mit `options` und `solution` (Text).
- `mode: "gap"`: wie bei gap, der `prompt` enthält `___`, `solution` ist eine Liste; ebenso Pflicht: `bank` mit 2–6 verschiedenen Wörtern, eines davon richtig.

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

Der Validator (`web/scripts/quests.ts`, Funktion `validatePackage`) liefert deutsche Fehlermeldungen mit Pfad, z. B. `days[2].date: 2026-11-11 erwartet` oder `days[0].quests: 3 bis 4 Aufgaben`. Eine Datei ist nur gültig, wenn keine Meldung erscheint. Eine vollständige Beispielwoche liegt in `web/tests/fixtures/quests/2026-11-09.json`.


## Hördateien erzeugen und mitliefern

Vor dem Import einer neuen Woche `web/stimmen.cmd` doppelklicken (oder im Ordner `web`: `node scripts/generate-listening.ts`). Voraussetzung: Node 24 und `edge-tts` 7.3 im PATH; bei Bedarf `python -m pip install edge-tts==7.3.1`. Stimme mit `edge-tts --list-voices` prüfen. Es werden vorhandene Wochen und der Tutorial-Hörtext mit `en-GB-SoniaNeural` bei `-10%` erzeugt. Der Aufruf übermittelt ausschließlich die Hörtexte an den TTS-Dienst; er benötigt keine Schülerdaten und keinen Supabase-Schlüssel.

`listeningPath(text, voice?, rate?)` aus `web/src/quests/listening.ts` bestimmt den Pfad `assets/listening/<8-stelliger Hash>.mp3`. Es gibt kein `data.audio`-Feld. Änderungen an Text, Stimme oder Tempo ergeben einen neuen Pfad. Vorhandene, nicht leere Dateien werden wiederverwendet; fehlgeschlagene Erzeugungen hinterlassen keine fertige Datei.

Neue MP3s unter `web/public/assets/listening/` zusammen mit den Wochen-Dateien versionieren und veröffentlichen. Erst die Audiodateien auf Cloudflare bereitstellen, dann die neue Woche in die Datenbank importieren. Der Import prüft lokal das Vorhandensein und die Dateigröße; er kann nicht prüfen, ob Cloudflare die neue Version bereits veröffentlicht hat. Fehlende oder leere Hördateien verhindern den Import der betroffenen Woche und werden im Lehrerbereich gemeldet. Eine bereits veröffentlichte Wochenfassung bleibt erhalten; andere gültige Wochen können weiter importiert werden.

## Wirtschaft ab Migration 0025

3–4 Quests pro Tag; Belohnungen weiterhin 1–20 Münzen pro Quest. Der Tagesbonus von 15 XP wird einmal nach allen aktiven heutigen Quests gebucht. Wochenstempel: standardmäßig 50 Münzen, weiterhin 100 XP. Bestehende abweichende Klassenregeln bleiben erhalten.

Truhen: `(10 + 3 × Level) × Größenfaktor × Wurffaktor`; große Truhe ×3, Serverwurf weiterhin 70 % einfach / 25 % doppelt / 5 % dreifach. Landhaus 600, Villa 1.000, Kleinwagen 350, Camper 600 Münzen. Die alte Goldkette `acc_04` ist im Shop verborgen; Besitz und Guthaben bleiben bestehen.

Preisrichtwerte für neue Ware: Garten-Deko 15–60, besondere Deko 80–120, Avatar 30–120, Haus/Auto 600–1.000 Münzen. Die oben genannten konkreten Bestandspreise haben Vorrang.
