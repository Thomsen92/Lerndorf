# LearnPass – Saison-Pass für Lerndorf – Design

**Stand:** 26.10.2026, am 27.10.2026 an den Umsetzungsplan angeglichen · **Status:** Design abgestimmt, **nichts umgesetzt**. Auftrag: „Konzipiere einen Battlepass (LearnPass), aber noch nichts einbauen, nur der Plan.“
**Vorrang:** Zahlen, Regeln und Datenmodell stehen verbindlich in `docs/superpowers/plans/2026-10-27-season-und-learnpass.md` (§2 Entscheidungen, §4 Stufentabelle, §13 geklärte Widersprüche).
**Saison I:** Halloween. **Stufen:** 40. **Truhen:** vier Seltenheiten mit Chancen.

## 1. Ziel

Ein Saison-Pass gibt dem Schulhalbjahr ein **sichtbares Ziel über die Tagesquests hinaus**: Wer regelmäßig lernt, steigt Stufen auf und öffnet Season-Truhen mit Gegenständen, die es **nur in dieser Saison** gibt. Er motiviert, ohne zu bestrafen, und kostet **0 €** – kein Kaufpass, keine Werbung, keine echten Käufe.

## 2. Grundentscheidungen

| Frage | Entscheidung | Begründung |
|---|---|---|
| Kaufbarer Pass? | **Nein.** Eine freie Spur. | Schule, Fairness, 0 €. |
| Saisonlänge | Season I: **Mi 28.10. – So 06.12.2026** (40 Tage), Europe/Berlin; Ende immer sonntags | Passt zu Schulphasen und zum Wochenplan |
| Stufen | **40** | Bei ~2.500–3.000 Saison-XP erreichbar; Stufe 40 ist ein Ziel, kein Muss |
| Punkte | **Saison-XP** aus dem vorhandenen `xp_ledger` | Keine neue Zählung, serverseitig manipulationssicher |
| Truhen | **Season-Truhen** mit vier Seltenheiten, nur kosmetische Inhalte | Spannung ohne Geldeinsatz; keine Vorteile im Spiel |
| Duplikate | bleiben als Menge im Inventar und sind verkaufbar; nur Einzelstücke (Haus, Garage, Auto) werden sofort zu Münzen | Kein Frust, Grundlage fürs spätere Tauschen |
| Verfall | Nicht abgeholte Belohnungen werden beim Saisonwechsel automatisch gutgeschrieben | Kein „verpasst“-Gefühl |
| Thema Saison I | **Halloween** | Klarer Wiedererkennungswert, viele Deko-Ideen |

## 3. Wo öffnet man den LearnPass?

Drei Orte sind möglich; Empfehlung ist eine Kombination aus A und B.

| Ort | Beschreibung | Aufwand | Bewertung |
|---|---|---|---|
| **A – Eigenes Gebäude am Markt** | Ein kleiner Saison-Stand (Halloween-Bude mit Kürbissen) neben der Aufgabentafel. Antippen öffnet den LearnPass. | Modell prozedural, ~0 Draw-Call-Sorgen, Tap wie bei Sir Byte | **Empfohlen:** Die Saison wird im Dorf sichtbar, nicht nur in einem Menü. |
| **B – Karte im Profil** | Große Karte „Season I · Halloween“ oben im Profil, mit Stufenstand | klein | **Empfohlen als Zweitzugang:** Wer den Stand nicht findet, kommt über das Profil rein. |
| C – Knopf unter dem Avatar | Dritte Glocke/Nav-Knopf neben News | klein | Zu viele Knöpfe oben rechts; nur als Notlösung. |
| D – Reiter in der Sammlung | LearnPass als Unterreiter | klein | Versteckt; die Saison soll auffallen. |

**Keine Auswahl nötig:** Es läuft immer die aktuelle Saison. „Season I – Halloween“ ist nur der Titel im Kopf der Ansicht. Alte Saisons sind im Lehrerbereich einsehbar, nicht für Schüler.

## 4. Stufen und Punkte

Saison-XP entstehen aus dem, was Schüler ohnehin tun: Quests (15/10/5), Tagesziel (15), Serie (5/Tag), Stempel (100/Woche), Tutorial (50).

Realistisch in 6 Wochen (5 Schultage/Woche): **2.500–3.000 XP**.

| Stufen | XP pro Stufe | Summe | Belohnung je Stufe |
|---|---|---|---|
| 1–10 | 30 | 300 | 5 Münzen; **Meilensteine 5, 10**; Rahmen 8 |
| 11–20 | 60 | 600 | 5 Münzen; **Meilensteine 15, 20**; Rahmen 18; Titel 12 |
| 21–30 | 90 | 900 | Pass-Szene (Kenney Graveyard); **Meilensteine 25, 30**; Rahmen 28; Titel 22 |
| 31–40 | 120 | 1.200 | Pass-Szene; **Meilensteine 35, 40**; Rahmen 38; Titel 32, 40 |

**Gesamt: 3.000 XP bis Stufe 40.** Wer fast täglich dabei ist, erreicht 40; wer 4 von 5 Schultagen schafft, landet um Stufe 30–35. Die vollständige Stufentabelle steht im Plan §4.1.

**Jede Stufe bringt etwas:** Stufen 1–20 je 5 Münzen (auch neben Rahmen, Titel oder Truhe), Stufen 21–40 eine Pass-Szene, einen Rahmen, einen Titel oder einen Meilenstein.

**Meilensteine** sind die Stufen **5, 10, 15, 20, 25, 30, 35, 40**. Sie sind auf der Spur **gold markiert mit Stern** und geben die große Belohnung: **eine Season-Truhe + 25 Münzen**. Auf Stufe 40 kommt der letzte Titel und die freie Wahl eines Truhen-Gegenstands dazu.

**Summe des Passes:** **300 Münzen** (100 auf den Stufen 1–20, 200 auf den Meilensteinen), 8 Truhen (Gegenwert ~318), 12 Pass-Szenen, 4 Rahmen, 4 Titel, 1 freie Wahl – etwa **618 Münzwert** plus Kosmetik über sechs Wochen.

**Truhen** auf den Stufen **5, 10, 15, 20, 25, 30, 35, 40** – acht aus dem Pass, dazu Serie und Shop (§5a).

## 5. Season-Truhen und Seltenheiten

Jede Truhe enthält **genau einen Gegenstand** aus dem Season-Pool. Die Seltenheit wird beim Öffnen serverseitig gewürfelt.

| Seltenheit | Farbe | Chance pro Truhe | Inhalt |
|---|---|---|---|
| **Normal** | Grau | 55 % | Deko |
| **Rare** | Blau | 30 % | Deko, Rahmen |
| **Epic** | Lila | 12 % | besondere Deko, Rahmen, Titel |
| **Legendary** | Gold | 3 % | die Saison-Highlights: **Horror-Haus** und **Warlock** (je 1,5 %) |

**Keine Münzbeutel in Truhen:** Jede Truhe enthält einen Gegenstand. Münzen gibt es auf den Pass-Stufen und beim Verkauf von Duplikaten.

**Fairness-Regeln:**

- **Stufe 40: freie Wahl** eines beliebigen Truhen-Gegenstands (alle 28) – feste Belohnung, keine Zufallstruhe. Bereits vorhandene Wahl wird zu Münzen (Hinweis vor dem Bestätigen). Die Wahl bleibt offen, bis sie getroffen ist, auch nach Saisonende.
- **Duplikate bleiben:** Ein zweites Exemplar wandert ins Inventar (`qty`), nicht automatisch in Münzen. Verkaufen geht jederzeit (§5b), Tauschen später. **Ausnahme Einzelstücke:** Ein schon besessenes Haus oder Auto wird sofort zum Verkaufswert seiner Seltenheit.
- **Verkaufspreise:** normal 15, rare 40, epic 100, legendary 250 Münzen.
- **Chancen sichtbar:** Die Prozente stehen in der Ansicht („So funktioniert’s“).
- **Nur Kosmetik:** keine Münz-Vorteile, keine XP-Booster, keine Spielvorteile.
- **Kein Echtgeld:** Truhen kommen aus Pass, Serie und Shop – der Shop nimmt nur verdiente Münzen.

**Öffnungs-Animation (motivierend, spannend):**

1. Truhe erscheint, wackelt kurz (vorhandene `chestControl`-Animation wiederverwenden).
2. Deckel öffnet sich, Lichtstrahl in der **Farbe der Seltenheit**.
3. Karte klappt auf: Gegenstand, Name, Seltenheit, kurzer Spruch von Sir Byte.
4. Bei Legendary: kurzer Goldregen und ein eigener Klang.
5. Ein Tipp „Weiter“, danach zurück zur Spur.

### 5a. Weitere Wege zu Season-Truhen

| Weg | Regel | Grenze pro Saison |
|---|---|---|
| **Pass** | Stufen 5, 10, 15, 20, 25, 30, 35, 40 | 8 |
| **Serie** | alle **3 Kalendertage** in Folge (auch Wochenende; ein Tag zählt mit mindestens einer gelösten Quest) → 1 Truhe, automatisch gutgeschrieben. Eigener Zähler „Truhen-Serie“, die Schultags-Serie bleibt unverändert. | bis 13 |
| **Shop** | **50 Münzen** pro Truhe, nur während der Saison | **2 pro Woche**, also bis 12 |

- **Serie:** Die Truhe erscheint sofort im LearnPass unter „Truhen“, mit Hinweis „Serie: Truhe verdient“. Kein Extra-Klick im Alltag nötig.
- **Shop:** Zähler wird **montags** (Europe/Berlin) zurückgesetzt; der Knopf zeigt „1/2 diese Woche“.
- **Gemeinsame Chancen:** dieselben Prozente über alle Wege, kein Aufweichen pro Quelle.
- **Kein Wunschkauf** – bewusst verworfen.
- **Wirtschaft:** Erwartungswert einer Truhe ≈ **39,75 Münzen**, Preis 50 → die Shop-Truhe bleibt ein Münz-Sink. Duplikate bleiben als Exemplar und bringen beim Verkauf 15 / 40 / 100 / 250 Münzen.
- **Wert des Passes:** **300 Münzen** (100 auf den Stufen 1–20, 200 auf den Meilensteinen) plus acht Truhen im Gegenwert von ~318 → rund **618 Münzen** sowie Rahmen, Titel und Deko. Der Pass ist damit vor allem kosmetisch; das Hauptgeld kommt weiter aus den Quests.

**Wo die Truhen liegen:** Jede verdiente Season-Truhe wandert **ins Inventar** (eigener Abschnitt „Season-Truhen“ mit Anzahl). Geöffnet wird **dort** – der LearnPass zeigt nur, dass eine Truhe wartet, und verlinkt hin.

**Anzeige, damit es einfach bleibt:** Im LearnPass gibt es **einen** Bereich „Truhen“ mit drei Zeilen und einem Knopf „Zum Inventar“:

```text
Pass     Stufe 15 erreicht          [Zum Inventar]
Serie    noch 1 Tag bis zur Truhe     –
Shop     50 Münzen · 1/2 übrig       [Kaufen]
```

Sind mehrere Truhen da, steht im Inventar „Season-Truhe ×3“ mit einem Öffnen-Knopf; geöffnet wird immer eine nach der anderen.

Darunter ein kleiner Fortschrittsring für die Serie.

### 5b. Doppelte verkaufen, später tauschen

- Das Inventar führt Gegenstände mit **Menge** (`qty`). Ein Duplikat aus einer Truhe erhöht die Menge, statt zu verschwinden.
- **Verkaufen:** im Inventar ein Knopf „Verkaufen“ mit dem Preis der Seltenheit (15 / 40 / 100 / 250). Eine RPC (`sell_item`) bucht den Erlös; die Menge sinkt um eins. Kein Verkauf von platzierten Stücken, nur aus dem Inventar. **Nur Season-Gegenstände** sind verkaufbar: Starter-Gegenstände kosten 0 und wären sonst sofort Münzen wert, und ein künftiger günstiger Shop-Artikel mit hoher Seltenheit würde zum Gelddrucker.
- **Tauschen (später, nicht in Saison I):** gleiche Klasse, nur Gegenstände (keine Münzen), höchstens drei Täusche pro Tag, jede Seite bestätigt, Lehrkraft sieht die Liste. Season-Exklusives wird erst nach Saisonende tauschbar. Kein Zwang: Ablehnen ist immer möglich und wird nicht gemeldet.
- **Warum behalten statt automatisch umwandeln:** Nur so gibt es später etwas zu tauschen, und der Schüler entscheidet selbst, ob ihm Münzen oder das zweite Exemplar lieber sind.

### 5c. Münzen in der Truhe?

**Entschieden: Nein.** Jede Truhe enthält genau einen Gegenstand; Münzbeutel gibt es nicht. Münzen kommen aus dem Pass (**5 pro Stufe 1–20, zusammen 100, plus 25 je Meilenstein, zusammen 200**) und aus dem Verkauf von Duplikaten (15 / 40 / 100 / 250).

**Wirtschaft:** Erwartungswert 39,75 bei 50 Münzen Preis – die Shop-Truhe bleibt ein Sink. Ein 100-Münzen-Gutschein als Zufallsinhalt würde die Truhe schon ab etwa 15 % zum Gelddrucker machen und ist deshalb verworfen.

### 5d. Truhen-Vorschau auf der LearnPass-Seite

Damit niemand blind öffnet, steht auf der LearnPass-Seite eine **Season-Truhen-Karte** mit Knopf **„Inhalt ansehen“**. Sie öffnet eine Übersicht:

- die vier Seltenheiten mit **Prozenten** (55 / 30 / 12 / 3),
- **welche Gegenstände** in jeder Seltenheit möglich sind (Name + Symbol),
- der Hinweis **„jede Truhe enthält genau einen Gegenstand“**.

Gezeigt wird der **Pool**, nie das nächste Ergebnis. So bleibt die Spannung, aber die Chancen sind offen – dieselbe Vorschau gilt für Shop-, Pass- und Serien-Truhen.

## 6. Belohnungen neben den Truhen

- **Season-Rahmen** (Stufen 8, 18, 28, 38): Kürbis, Spinnennetz, Grabstein, Hexenkessel – nur in dieser Saison.
- **Titel** (Stufen 12, 22, 32, 40): „Pumpkin Rookie“, „Ghost Hunter“, „Witch’s Friend“, „Halloween Legend“.
- **12 Pass-Szenen** (Stufen 21–40 ohne Meilenstein, Rahmen oder Titel): kleine Halloween-Szenen aus dem Kenney Graveyard Kit (CC0), nur über den Pass, nicht in Truhen. Liste im Plan §6.1.
- **Kleine Münzschritte bis Stufe 20:** 5 Münzen pro Stufe, zusammen 100 – danach nur noch die 25 Münzen der Meilensteine.

## 7. Saison I – Halloween: Gegenstände

**Truhen-Pool (verbindlich, 28 fertige Modelle; alle nur in Saison I, `shop_visible = false`):**

| Seltenheit | Gegenstände |
|---|---|
| Normal (8) | Süßigkeiteneimer, Fledermaus, Grablicht, Kleiner Geist, Grabstein, Kürbislaterne, Besen, Halloween-Schild |
| Rare (13) | Süßigkeitenhaufen, Friedhofsecke, Zaun mit Laterne, Hexe (Statue), Kürbismädchen, Hexe (Figur), Mumie, Skelett, Zombie, Hexenkatze, Hexenkessel, Kürbiskatze, Geisterkatze |
| Epic (5) | Kürbisfeld, Spuk-Uhrturm, Dodge Pickup (Auto), Monsterpflanze, Kürbisbaum |
| Legendary (2) | **Horror-Haus** – ersetzt das eigene Haus · **Warlock** (2,95 m Statue) |

Die früher vorgeschlagenen schweren Originale (Vampir, Vogelscheuche, Horrorpuppe, Schwarzer Fuchs, Skelettkatze, Kürbis-Auto, Halloween-Auto, Devilish Hot Rod, Kürbis-Zauberer) sind **nicht** im Pool, bis sie optimiert sind. Die Kenney-Graveyard-Teile kommen als 12 Pass-Szenen (§6), nicht in die Truhen.

**Zuordnung zu den Objekttypen** (`items.kind` muss zum Slot passen, sonst lehnt `place_in_slot` ab):

| Asset | kind | Slot | Max. Größe (m) | Anmerkung |
|---|---|---|---|---|
| Horror-Haus | `house` | `house` | 6 × 4 × 6 | ersetzt das eigene Haus |
| Dodge Pickup, Kürbis-Auto, Halloween-Auto, **Devilish Hot Rod** | `car` | `car` | 2,4 × 4,6 × 2,2 | Hot Rod liegt im Deko-Ordner, ist aber ein **Auto** |
| Spuk-Uhrturm | `deco` | `deco_1–4` | 3 × 3 × 3 | auf 3 m Höhe kürzen, sonst Gartenornament |
| Hexe, Kürbismädchen, Vampir, Vogelscheuche, Horrorpuppe, Schwarzer Fuchs, Skelettkatze, Kürbis-Zauberer | `deco` | `deco_1–4` | 3 × 3 × 3 | als **Statue** im Garten, nicht als laufender NPC |
| Kürbis (groß, 31 MB) | `deco` | `deco_1–4` | 3 × 3 × 3 | Doppelung zum Kenney-Kürbis – **weglassen** |
| Red Demon Mask, Venom-Maske | `avatar` | `face`/`headwear` | – | **ausgeschlossen** (Marke, 1,9 Mio Dreiecke) |

**Was daraus folgt:**

- Nur `deco` darf gedreht werden; Haus, Garage und Auto haben feste Ausrichtung.
- Autos und Häuser sind **Einzelstücke**: Ein zweites Auto aus einer Truhe ergibt keinen Sinn. Der Truhen-RPC wandelt ein bereits besessenes Auto/Haus in den Verkaufswert seiner Seltenheit um (Dodge 100, Horror-Haus 250).
- **Gemessen 27.10.:** Mehrere Modelle sind zu groß oder sitzen neben ihrem Ursprung (Plan §6.2). Der Loader normalisiert sie beim Laden auf den Asset-Vertrag; für das Dreiecks-Budget gibt es Fernversionen (Plan §6.3).
- Ein Uhrturm über 3 m passt in keinen Deko-Platz; das Modell wird auf Gartenhöhe skaliert.
- Die Masken würden als Avatar-Teil einen ganz anderen Weg brauchen (Kleiderschrank, `face`/`headwear`) – entfallen wegen Lizenz und Größe.



**Ausgeschlossen:** `red demon mask` und `venom spider-man mask` – fremde Marken (Marvel/Spider-Man), keine CC0-Freigabe. Ohne Lizenznachweis werden sie nicht verwendet.

**Vor dem Einbau zu klären:**

- **Lizenz:** Vom Auftraggeber als **CC0 1.0** bestätigt (26.10.2026), Eintrag in `blender/sources/LICENSES.md`.
- **Größe:** Die Originaldateien sind **2–60 MB** groß – für Schultablets viel zu schwer. Fertige Modelle liegen bei 130–940 KB.
- **Ort:** 28 Modelle liegen unter `web/public/assets/season1/` (siehe `manifest.json`); die Quelldateien liegen unter `Lerndorf/Assets/Season I` (nicht im Spiel-Bundle).

Dazu die vier Rahmen und vier Titel aus §6.

**Aus dem Kenney Graveyard Kit** (CC0, liegt im Repo unter `web/public/assets/kenney/graveyard/`): `pumpkin-carved`, `detail-bowl`, `lantern-candle`, `candle-multiple`, `gravestone-round`, `pumpkin`. Spinnennetz und Fledermaus gibt es im Kit nicht – dafür stehen Kerzengruppe und Grabstein. Die Modelle werden auf 0,8–1,4 m skaliert und wie die übrige Deko als Instanz gesetzt.

**Bestand und Aufwand (gemessen 26.10.2026):**

| Rarität | Modell | MB | Dreiecke | Ziel nach Optimierung |
|---|---|---:|---:|---:|
| Legendary | Horror-Haus | 29,9 | 952.942 | ≤ 10.000 |
| Epic | Dodge Pickup | 8,4 | 79.184 | ≤ 10.000 |
| Epic | Kürbis-Auto | 30,6 | 973.020 | ≤ 10.000 |
| Epic | Halloween-Auto | 30,4 | 941.242 | ≤ 10.000 |
| Epic | Devilish Hot Rod | 35,0 | 1.000.056 | ≤ 10.000 |
| Epic | Spuk-Uhrturm | 5,0 | 89.607 | ≤ 10.000 |
| Epic | Kürbis-Zauberer | 44,0 | 1.458.348 | ≤ 10.000 |
| Rare | Hexe | 2,3 | 48.436 | ≤ 8.000 |
| Rare | Kürbismädchen | 3,6 | 48.566 | ≤ 8.000 |
| Rare | Skelettkatze | 55,4 | 1.868.125 | ≤ 8.000 |
| Rare | Vampir | 30,0 | 960.008 | ≤ 8.000 |
| Rare | Vogelscheuche | 55,1 | 1.893.565 | ≤ 8.000 |
| Rare | Horrorpuppe | 55,6 | 1.879.500 | ≤ 8.000 |
| Rare | Schwarzer Fuchs | 58,0 | 1.912.970 | ≤ 8.000 |
| — | Red Demon Mask | 54,1 | 1.888.314 | **ausgeschlossen (Marke)** |
| — | Venom/Spider-Man-Maske | 56,7 | 1.898.249 | **ausgeschlossen (Marke)** |

**Das Dorf-Budget liegt bei unter 150.000 Dreiecken für die gesamte Szene.** Ein einziges dieser Modelle sprengt es um das Sechs- bis Zwölffache. Vor dem Einbau muss jedes Modell in Blender **decimiert** (auf 1–7 % der Dreiecke), die Texturen auf 512–1024 px verkleinert und als Draco/meshopt-GLB exportiert werden. Ziel: **≤ 1–2 MB und ≤ 10.000 Dreiecke** pro Modell.

**Stand 27.10.2026:** **28 Modelle** sind fertig und liegen unter `web/public/assets/season1/` mit `manifest.json`:

- **5 aus `Assets/Season I` (jetzt `Lerndorf/Assets/Season I`):** Horror-Haus, Hexe (Statue), Kürbismädchen, Spuk-Uhrturm, Dodge Pickup
- **15 Einzelteile aus dem Halloween-Set:** Süßigkeiteneimer, Fledermaus, Grablicht, Kleiner Geist, Grabstein, Kürbislaterne, Besen, Halloween-Schild, Hexe (Figur), Mumie, Skelett, Zombie, Hexenkatze, Hexenkessel, Monsterpflanze
- **4 Einzelmodelle:** Kürbisbaum, Kürbiskatze, Geisterkatze, Warlock
- **4 Deko-Bündel:** Süßigkeitenhaufen, Kürbisfeld, Friedhofsecke, Zaun mit Laterne

Alle **146–940 KB** (Haus 835 KB, Warlock 599 KB), 984–67.142 Dreiecke, Texturen 512–1024 px als WebP, eingebettet. Jedes Modell ist **ein Mesh mit einem Material** – also ein Draw Call.

**Warlock (Legendary):** **2,95 m** hohe Figur mit **2,77 × 2,77 m** Grundfläche – füllt den 3 × 3 × 3-Platz fast vollständig, aber passt hinein. **15.966 Dreiecke**, 582 KB – von Tripo retopologisiert und mit intakter Textur geliefert. Eigene 30k-Versuche zerstörten die UVs (schwarze Flecken), deshalb der Tripo-Weg.

**Horror-Haus:** auf **4,37 × 3,8 × 5,38 m** skaliert (Hausplatz 6 × 4 × 6 m), Boden auf 0, Tür nach +Z, **37.912 Dreiecke**, 835 KB. Der Blender-Decimator kommt nicht unter ~38.000; die Optik stimmt dafür (Fenster, Tür, Kürbis, Geist erhalten).

**Die übrigen schweren Originale bleiben als Ziel erhalten** (nicht ersetzt): Kürbis-Auto, Halloween-Auto, Devilish Hot Rod, Kürbis-Zauberer, Skelettkatze, Vampir, Vogelscheuche, Horrorpuppe, Schwarzer Fuchs, großer Kürbis.

**Retopologie funktioniert automatisiert:** Voxel-Remesh (Größe = Modellgröße/140) → Decimate → Smart-UV → Diffuse-Backen auf 1024 px. Am Kürbis-Auto getestet: 973.020 → **14.924 Dreiecke**, 1,05 MB, Optik erhalten. Damit lassen sich auch die schweren Modelle auf Dorfmaß bringen; jedes braucht etwa 1–3 Minuten Rechenzeit.

## 8. Datenmodell (erster Vorschlag – überholt)

**Verbindlich ist das Datenmodell im Plan §3** (u. a. mehrere Belohnungen pro Stufe, eigene Tabellen für Season-Truhen, Truhen-Serie und Besitz von Season-Titeln/-Rahmen, Berlin-Datum als Zeitfenster). Der folgende Entwurf bleibt nur zur Nachvollziehbarkeit stehen.

```sql
create table seasons (
  id text primary key,            -- "2026-11-halloween"
  label text not null,            -- "Season I – Halloween"
  starts_on date not null,        -- Montag
  ends_on date not null,          -- Sonntag der 6. Woche
  theme text not null             -- "halloween"
);

create table learnpass_tiers (
  season text references seasons(id),
  tier int not null check (tier between 1 and 40),
  points int not null,            -- kumulierte XP
  reward_kind text not null,      -- coins | chest | title | frame | item
  reward_id text,
  amount int not null default 1,
  primary key (season, tier)
);

create table learnpass_claims (
  player_id uuid references profiles(id) on delete cascade,
  season text references seasons(id),
  tier int not null,
  claimed_at timestamptz not null default now(),
  primary key (player_id, season, tier)
);

alter table items add column if not exists season text;  -- null = immer, sonst Saison-ID
```

- **`learnpass_state()`** liefert Saison, Punkte, Stufen und erreichte/abgeholte Stufen.
- **`claim_learnpass_tier(tier)`** prüft Punkte und Idempotenz; bucht Münzen/Titel/Rahmen oder legt eine Season-Truhe an.
- **`open_season_chest(chest_id)`** würfelt serverseitig Seltenheit und Gegenstand, prüft Duplikate, bucht ggf. Münzen. Kein Client-Wurf.
- Alle Belohnungen laufen über die vorhandenen Tabellen (`coin_ledger`, `chests`, `items`, `inventory`, `profiles.title_id/frame_id`).
- RLS wie überall: Lesen nur eigener Fortschritt, Schreiben nur über RPCs.

## 9. Anzeige und Bedienung

- **Kopf:** „Season I · Halloween“, Restzeit („noch 18 Tage“).
- **Spur:** waagerecht scrollbar, 40 Kacheln, große Ziele; Zustände `gesperrt / erreicht / abgeholt`; Truhen mit Farbe.
- **Truhen im Inventar:** eigener Abschnitt oben im Inventar mit Anzahl und „Öffnen“; ein kleiner Punkt am Inventar-Knopf zeigt wartende Truhen, auch außerhalb des LearnPass.

- **Sprache:** Englisch als Standard, Deutsch wählbar; Zahlen wie im XP-Feld.
- **Barrierefreiheit:** Kacheln als Buttons mit `aria-label`, Ergebnis als `role="status"`, Animationen bei „Weniger Bewegung“ reduziert.

## 10. Randfälle

| Fall | Verhalten |
|---|---|
| Einstieg in Woche 3 | Punkte ab Saisonstart; frühe Stufen sind schnell erreichbar |
| Saisonende | letzte Abholung bis Sonntag 23:59 Europe/Berlin; Rest wird beim nächsten Aufruf oder per Lehrer-Knopf automatisch gutgeschrieben; Truhen bleiben öffnbar, die Stufe-40-Wahl bleibt offen |
| Doppelter Tipp | RPC idempotent |
| Duplikat | bleibt als Menge, Anzeige „Doppelt – Verkaufen für 40“ |
| Einzelstück doppelt (Haus/Auto) | wird zu Münzen, Anzeige „schon vorhanden – 100 Münzen“ |
| WebGL fehlt | Truhe als Karte ohne 3D, gleiche Chancen |
| Lehrer korrigiert Münzen | unabhängig; LearnPass bucht nur eigene Belohnungen |
| Klassenwechsel | Saison ist klassenunabhängig |

## 11. Was nicht dazugehört

- Kein Kauf, keine Premium-Spur, keine Schlüssel, **keine Echtgeld- oder Kauf-Truhen**.
- **Season-Truhen sind ausdrücklich gewollt**, auch wenn sie formal Lootboxen sind: kostenlos, nur kosmetisch, offene Chancen, Duplikate verkaufbar. Die frühere Regel „keine Lootboxen“ ist damit hinfällig; sie bezog sich auf den MVP und auf Kauf-Truhen.
- Keine Spielvorteile aus Truhen (nur Kosmetik und Münzen).
- Keine Rangliste, keine Bestrafung für Fehltage.
- Keine neuen Schülerdaten außer Fortschritt und Claims.

## 12. Geklärte Fragen (27.10.2026)

1. **Einstieg:** beides – Saison-Stand am Markt (A) und Profilkarte (B).
2. **Saisonfenster:** Mi 28.10. – So 06.12.2026 (40 Tage); XP zählen rückwirkend ab 28.10., auch wenn der LearnPass später live geht.
3. **Legendary:** Horror-Haus als Haus-Platz, dazu Warlock als Deko.
4. **Nach der Saison:** Season-Gegenstände bleiben exklusiv.
5. **Chancen:** 55 / 30 / 12 / 3.

## 13. Umsetzung

Arbeitspakete, Reihenfolge und Definition of Done stehen im Plan §8 und §12.6.
