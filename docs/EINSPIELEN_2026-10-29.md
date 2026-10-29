# Einspielplan 29.10.2026: Bugfixes, neue Shop-Artikel, Spelling Bee

Stand: 29.10.2026. **Nichts davon ist live.** Dieser Plan beschreibt, wie es sicher live geht. Er führt selbst nichts aus.

## 1. Was live geht

**Datenbank (vier neue, rein additive Migrationen, Wächter `check-migrations` meldet kein `destructive-ok`):**

| Nr. | Inhalt | Was sich in der Datenbank ändert |
| --- | --- | --- |
| 0058 | sieben neue Shop-Artikel (Burg, Exo-Roboter, Obama-Statue, Simson, Moped, Roller, Fendt-Traktor) | 7 neue Zeilen in `items` (kein Besitz, keine Platzierung) |
| 0059 | Seltenheits-Etikett der bestehenden Shop-Artikel nach Preisstufe | `items.rarity` der bestehenden Shop-Artikel (die mit Preis ab 150, etwa die Hälfte) (nur Etikett, Shop-Artikel sind nicht verkaufbar und in keiner Kiste) |
| 0060 | Spelling Bee: 3 Joker je Runde | neue Spalte `spelling_rounds.hinted`, neue Funktion `spelling_hint`, Punkte für 3-Buchstaben-Wörter |
| 0061 | Spelling Bee: 40 USA-Rätsel | neue Spalte `spelling_puzzles.set_name`, 40 neue Zeilen (Nr. 101 bis 140), Tagesrätsel kommt danach aus diesem Satz |

**Seite (Client):** Bugfixes BUG-001 bis 005, 007 bis 009, 011, Musik leiser, Season-Ticket direkt zum LearnPass, Marktplatz-Anordnung und Titel, Horror-Haus als Treehouse mit Lichtsäule, Joker und 3-Buchstaben-Wörter in der Spelling Bee.

**Nicht verändert:** Münzen, Besitz, Platzierungen, Kontostände, gespielte Runden, Karten, XP. Kein `DELETE`, `DROP`, `TRUNCATE`.

## 2. Wichtig vorher

- Ich (Claude) habe lokal 28 Commits mehr als GitHub und es fehlt mir **ein** GitHub-Commit (`chore(release): freeze migrations …`, ein früherer Release hat 0054 bis 0057 eingefroren). Vor dem Release muss alles auf GitHub `main` liegen: erst `origin/main` einmischen, Tests laufen lassen, dann pushen. **Das Pushen mache ich nur auf dein Zeichen.**
- `npm run typecheck`, `eslint` und alle 1333 Tests laufen lokal grün (das sind dieselben Prüfungen wie im Release). Nur `npm run build` scheitert auf deinem Windows-Rechner an einem Temp-Ordner-Problem; das Release baut auf GitHub (Linux), dort tritt es nicht auf.
- Zeitfenster: **nicht Mo bis Fr 07:30 bis 15:30** (der Ablauf lehnt ab). Am besten nachmittags nach dem Unterricht oder am Wochenende. Grund für „nicht während der Stunden“: Mit 0061 wechselt das Tagesrätsel der Spelling Bee sofort.

## 3. Ablauf Schritt für Schritt

**Schritt A: Vorbereiten (Claude, braucht dein „Ja, pushen“)**
1. `origin/main` in den lokalen Stand einmischen (nur die Datei `supabase/migrations.lock` ist anders).
2. Tests, Typecheck und Lint noch einmal laufen lassen.
3. `main` auf GitHub pushen. Danach prüft GitHub **tests** automatisch; abwarten, bis grün.
4. Ich sage dir Bescheid, dass es losgehen kann.

**Schritt B: Vorher-Zahlen notieren (du, 5 Minuten)**
Supabase → Projekt **Lerndorf** → **SQL Editor** → diese reine Lese-Abfrage ausführen und das Ergebnis speichern (Foto oder Text). Sie ändert nichts:

```sql
select 'profiles' t, count(*) from profiles
union all select 'inventory', count(*) from inventory
union all select 'placements', count(*) from placements
union all select 'coin_ledger', count(*) from coin_ledger
union all select 'items', count(*) from items
union all select 'spelling_puzzles', count(*) from spelling_puzzles
union all select 'spelling_rounds', count(*) from spelling_rounds
union all select 'season_chests', count(*) from season_chests
union all select 'coins gesamt', coalesce(sum(coins), 0) from profiles;
```

(Der Release macht zusätzlich selbst eine verschlüsselte Sicherung mit Zeilenzahlen und legt sie 90 Tage unter dem Lauf ab.)

**Schritt C: Release starten (du)**
1. GitHub → **Actions** → **release** → **Run workflow** (das Häkchen „trotzdem während der Schulzeit“ **nicht** setzen) → **Run workflow**.
2. Den Lauf öffnen. Unter **Was live geht** müssen genau diese vier neuen Migrationen stehen: `0058_tripo_shop_items`, `0059_shop_rarities`, `0060_spelling_jokers`, `0061_spelling_usa_puzzles`. Steht dort etwas mit `destructive-ok` oder eine fünfte Migration: **nicht freigeben**, mir schreiben.
3. **Review deployments** → `production` anhaken → **Approve and deploy**.
4. Der Ablauf macht die Sicherung, spielt die Datenbank ein (`db push`), friert die Migrationen ein und setzt den Branch `production`. Cloudflare baut danach die Seite (ein bis zwei Minuten).

**Schritt D: Nachher prüfen (du, mit dem Testkonto, nicht mit einem Schülerkonto)**
1. Dieselbe Abfrage aus Schritt B noch einmal ausführen. Erwartet: `profiles`, `inventory`, `placements`, `coin_ledger`, `season_chests`, `spelling_rounds` und `coins gesamt` **gleich**; `items` **+7**; `spelling_puzzles` **+40**.
2. Seite neu laden (Strg+F5). Shop: die sieben neuen Artikel, Preise 1000/350/1000/700/300/400/300 und Seltenheiten sichtbar.
3. Spelling Bee: neues Rätsel, Joker-Knopf mit 3, Hinweis erscheint, 3-Buchstaben-Wort wird akzeptiert.
4. Dorf: Horror-Haus (falls im Besitz) mit Lichtsäule, Marktplatz-Titel, Questtafel am Rand.
5. Learnpass: Karten-Hinweis beim Abholen.

## 4. Wenn etwas schiefgeht

| Problem | Maßnahme |
| --- | --- |
| Seite sieht kaputt aus, Daten sind in Ordnung | **N1** der Anleitung: Cloudflare → **lerndorf** → **Deployments** → vorige Version → **Rollback**. Die Datenbank bleibt, die Migrationen sind rein additiv und stören die alte Seite nicht (die alte Seite zeigt nur keine Joker und akzeptiert keine 3-Buchstaben-Wörter). |
| Spelling Bee: Rätsel gefallen nicht | Notbremse, **nur nach Absprache mit mir**: `update spelling_puzzles set set_name = 'usa_off' where set_name = 'usa';` Dann kommt das Tagesrätsel wieder aus dem ersten Satz. Die Zeilen bleiben erhalten. |
| Shop-Artikel sollen weg | `update items set active = false where id in ('shop_medieval_castle','shop_exosuit_robot','shop_obama_statue','shop_simson_motorcycle','shop_moped','shop_scooter','shop_fendt_tractor');` (Nur ausblenden, bereits Gekaufte bleiben im Besitz.) |
| Daten beschädigt (unwahrscheinlich, nichts davon löscht oder ändert Besitzdaten) | **N2** der Anleitung: **restore** mit der Sicherung des Release-Laufs (Name `pre-release-…`). |

## 5. Was ich nicht mache

Ich schiebe nichts auf GitHub und starte keinen Release ohne dein Zeichen. Ich führe keine SQL-Befehle auf der Live-Datenbank aus. Schritt A ist das Einzige, was ich vorbereite; Schritte B bis D machst du.
