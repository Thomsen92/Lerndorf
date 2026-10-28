# Anleitung für die Lehrkraft

Diese Anleitung zeigt Schritt für Schritt, wie Lerndorf eingerichtet wird und wie man es im Alltag benutzt. Man braucht kein Programmierwissen.

Teil 1 (Einrichtung) macht man einmal. Teil 2 (Alltag) braucht man jede Woche.

**Spielsprache:** Lerndorf startet auf Englisch. Über das Profilmenü → Settings / Einstellungen lässt sich English oder Deutsch wählen. Die Wahl bleibt für diesen Browser gespeichert und gilt auf geteilten Tablets auch für die nächste Anmeldung. Beim Wechsel lädt die Seite neu; Anmeldung und gespeicherter Fortschritt bleiben erhalten. Der Lehrerbereich bleibt Deutsch.

---

## Teil 1: Einrichtung

### 1. GitHub-Repository

Das Repository `Lerndorf` gibt es schon (Konto `Thomsen92`). Es ist privat.

### 2. Supabase-Projekt

Supabase ist die Datenbank. Das Projekt `Lerndorf` gibt es schon.

Dort brauchst du drei Dinge. Alle findest du unter **Project Settings** (Zahnrad-Symbol links unten) und dann **API** bzw. **Database**:

| Was | Wo | Wofür |
| --- | --- | --- |
| Project URL (`https://….supabase.co`) | Settings → API | Adresse der Datenbank |
| `anon` public key | Settings → API | öffentlicher Schlüssel für die Seite |
| `service_role` key | Settings → API | **geheim**, nur für GitHub-Secrets |
| Datenbank-Passwort | Settings → Database | wurde beim Anlegen des Projekts vergeben |

Zusätzlich brauchst du einen **Access Token**: oben rechts im Profil-Menü → **Account** → **Access Tokens** → **Generate new token**. Den Token nur einmal kopieren.

> Wichtig: Den `service_role` key und das Datenbank-Passwort niemals in einen Chat, eine E-Mail oder in den Code schreiben. Sie gehören nur in die GitHub-Secrets.

### 3. Öffentliche Registrierung abschalten

Im Supabase-Projekt: **Authentication** → **Sign In / Providers** → **Email** → den Schalter **Allow new users to sign up** ausschalten. Danach können sich Fremde nicht selbst anmelden.

### 4. Lehrkonto anlegen

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Deine echte E-Mail-Adresse und ein sicheres Passwort eingeben. Haken bei **Auto Confirm User** setzen.
3. Danach im Menü **SQL Editor** öffnen, einen neuen Eintrag anlegen und folgenden Text einfügen. `DEINE-USER-ID` durch die ID ersetzen, die in der Benutzerliste bei deinem Konto steht:

```sql
insert into profiles (id, nickname, role, class_id)
values ('DEINE-USER-ID', 'lehrkraft', 'teacher', null);
```

Mit **Run** ausführen. Das muss nur einmal gemacht werden.

### 5. GitHub-Secrets eintragen

Im Repository auf GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Diese fünf Einträge anlegen:

| Name | Inhalt |
| --- | --- |
| `SUPABASE_URL` | Project URL aus Schritt 2 |
| `SUPABASE_ANON_KEY` | anon public key aus Schritt 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key aus Schritt 2 |
| `SUPABASE_ACCESS_TOKEN` | Access Token aus Schritt 2 |
| `SUPABASE_DB_PASSWORD` | Datenbank-Passwort aus Schritt 2 |

Den Namen genau so schreiben, Groß- und Kleinschreibung zählen.

### 6. Cloudflare Pages einrichten

1. Kostenloses Konto auf https://dash.cloudflare.com anlegen.
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git**. Das GitHub-Repo `Lerndorf` auswählen.
3. Einstellungen:
   - Projektname: `lerndorf`
   - Root directory: `web`
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
4. Unter **Environment variables** die beiden Werte eintragen: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` (dieselben Werte wie in den GitHub-Secrets).
5. **Save and Deploy**. Danach baut Cloudflare die Seite bei jedem Push auf `main` neu.

### 7. Ersten Lauf starten

Im Repository auf **Actions** gehen. Dort stehen diese Abläufe (Stand 27.10.2026):

- **tests**: prüft jede Änderung auf `main`. Ändert nichts an der Live-Seite.
- **release**: bringt Änderungen live – nur wenn du ihn startest und freigibst (Teil 3).
- **backup**: sichert die Datenbank jede Nacht verschlüsselt.
- **restore**: spielt eine Sicherung zurück (Notfall, Teil 3).
- **import-content**: spielt Quests ein.
- **keepalive**: hält das Supabase-Projekt wach. Läuft alle drei Tage.

Falls ein Ablauf rot wird, schick den Namen des Ablaufs und die Fehlermeldung an Claude Code. Die Meldung nicht selbst umformulieren.

Wenn alle grün sind, sind die Adressen:

- Schülerseite: Adresse des Cloudflare-Projekts `lerndorf` (z.B. `https://lerndorf.pages.dev/`)
- Lehrer-Bereich: `…/lehrer/` an dieser Adresse

---

## Teil 2: Alltag

### Im Lehrer-Bereich anmelden

Adresse öffnen, mit deiner E-Mail-Adresse und deinem Passwort anmelden. Oben wählst du die Klasse (8a oder 8b).

### Konten anlegen

**Einzeln:** Im Abschnitt „Konten“ unter „Einzeln anlegen“ Spitzname und Passwort eintragen, auf **Anlegen** klicken.

**Als Liste (empfohlen):** Eine Zeile pro Schüler, Aufbau:

```
anna;hund42;8a
ben;katze99;8a
```

Spitzname: 3 bis 16 Zeichen, nur Buchstaben a bis z, Ziffern und Unterstrich. Keine Umlaute, keine Leerzeichen. Passwort: mindestens 6 Zeichen. Die Seite zeigt Fehler mit Zeilennummer, wenn etwas nicht passt.

Bitte **keine echten Namen** als Spitznamen verwenden. Die Zuordnung Spitzname zu Person schreibst du nur auf Papier.

### Zugangskärtchen drucken

Direkt nach dem Anlegen auf **Karten drucken** klicken. Es erscheint eine Druckvorschau mit Spitzname und Passwort. Ausschneiden und verteilen.

Wichtig: Die Passwörter werden nach dem Schließen der Seite nicht mehr angezeigt. Wenn du Karten brauchst, drucke sie gleich nach dem Anlegen.

### Passwort zurücksetzen

Schüler wählen, neues Passwort eingeben, **Setzen** klicken. Dann neue Karte drucken, falls nötig.

### Stempel buchen (ca. 3 Minuten pro Klasse)

1. Unter „Stempel buchen“ die Woche wählen. Das Datum muss ein **Montag** sein. Die Seite korrigiert ein anderes Datum auf den Montag der Woche.
2. Die Schüler anhaken, die den Wochenplan vollständig abgegeben haben.
3. **Stempel buchen** klicken.

Schüler, die für diese Woche schon einen Stempel haben, sind ausgegraut. Man kann keinen Stempel doppelt buchen.

### Münzen korrigieren

Schüler wählen, Betrag eingeben (positiv zum Dazugeben, negativ zum Abziehen), eine **Notiz** eintragen, **Buchen** klicken. Die Notiz ist Pflicht und bleibt im Kontoauszug.

### Shop und Bauen ein- oder ausschalten

Unter „Schalter“ die Haken setzen und **Speichern** klicken. Ohne Haken sind Shop oder Bauen für die Klasse gesperrt.

### Konto löschen

Vorsicht: Das Löschen entfernt Konto, Haus und alle Münzen unwiderruflich. Schüler wählen, **Ich bin sicher** anhaken, **Löschen** klicken.

---

## Wenn etwas nicht klappt

| Problem | Was tun |
| --- | --- |
| Schüler kann sich nicht anmelden | Spitzname und Passwort prüfen (Groß- und Kleinschreibung, Umlaute). Passwort zurücksetzen. |
| Seite lädt nicht, „Keine Verbindung“ | Kurz warten und neu laden. Wenn es bleibt: Supabase-Projekt im Dashboard prüfen (es könnte pausiert sein, dann **Restore project** anklicken). |
| Ein GitHub-Ablauf ist rot | Name des Ablaufs und Fehlermeldung an Claude Code schicken. |

---

## Teil 3: Sicherer Betrieb mit echten Schülern

Seit 27.10.2026 geht nichts mehr automatisch live. Jede Nacht entsteht eine verschlüsselte Sicherung, und live geht es nur, wenn du **release** startest und freigibst.

### Einmal einrichten (etwa 10 Minuten)

Schon erledigt hast du: das Test-Projekt, `BACKUP_PASSPHRASE`, `SUPABASE_DB_URL`, die Umgebungen `production` (mit dir als Prüfer) und `test` (mit fünf Secrets).

Jetzt fehlen noch drei Schritte, **in dieser Reihenfolge**:

1. **Erster Release.** GitHub → **Actions** → links **release** → rechts **Run workflow** → Branch `main` lassen → grüner Knopf **Run workflow**. Nach ein paar Minuten steht gelb „Waiting for review“. Den Lauf anklicken → **Review deployments** → Haken bei `production` → **Approve and deploy**. Der Ablauf macht eine Sicherung, spielt die Datenbank ein und legt den Branch `production` an. Wird er rot, die Meldung an Claude schicken.
2. **Cloudflare umstellen.** https://dash.cloudflare.com → **Workers & Pages** → **lerndorf** → **Settings** → **Builds** → Reiter **Production** → **Production branch**: `production` auswählen und speichern. Ab jetzt baut Cloudflare die Live-Seite nur noch aus diesem Branch.
3. **Branch schützen.** GitHub → **Settings** → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**. Name `production`, Enforcement **Active**, bei **Target branches** → **Add target** → **Include by pattern** → `production`. Angehakt lassen: **Restrict deletions** und **Block force pushes**. Alles andere aus. **Create**.

### So geht ein Update live

1. Am besten abends oder am Wochenende (Mo–Fr 07:30–15:30 lehnt der Ablauf ab).
2. **Actions** → **release** → **Run workflow** → **Run workflow**.
3. Den Lauf anklicken. Unter „Was live geht“ steht, welche Datenbank-Änderungen dabei sind. Steht hinter einer Migration `destructive-ok`, erst bei Claude nachfragen.
4. **Review deployments** → `production` anhaken → **Approve and deploy**.
5. Wird alles grün, ist das Update in ein bis zwei Minuten live. Die Sicherung von vorher liegt 90 Tage unter dem Lauf bei **Artifacts**.

### Sicherungen

- Jede Nacht läuft **backup**. Ist ein Lauf rot, schickt dir GitHub eine E-Mail; dann die Meldung an Claude weitergeben.
- Unter jedem Lauf steht eine Tabelle mit Zeilenzahlen (Konten, Klassen, Inventar …). Namen stehen dort nie.
- Die Datei unter **Artifacts** ist verschlüsselt und lässt sich nur mit `BACKUP_PASSPHRASE` öffnen. **Dieses Passwort nie verlieren** – im Passwort-Manager und auf Papier in der Schule aufbewahren.
- Einmal im Monat eine Sicherung herunterladen (Lauf öffnen → **Artifacts** → Name anklicken) und auf deinem Rechner ablegen. GitHub löscht nächtliche Sicherungen nach 30 Tagen.

### Notfälle

**N1 · Die Seite ist kaputt, die Daten sind in Ordnung.**
Cloudflare → **lerndorf** → **Deployments** → bei der vorigen Version **⋯** → **Rollback**. Die Seite ist sofort wieder die alte.

**N2 · Ein Update hat Daten beschädigt.**
1. Den Klassen sagen, dass alles seit der Sicherung verloren geht (meist nur der Abend).
2. Den Lauf mit der passenden Sicherung öffnen (meist der letzte **release**-Lauf). Seine Nummer steht in der Adresszeile nach `/runs/`, den Namen siehst du unter **Artifacts** (z. B. `pre-release-…`).
3. **Actions** → **restore** → **Run workflow**: Wohin `live`, Nummer und Name eintragen, `WIEDERHERSTELLEN` eintippen → **Run workflow** → freigeben.
4. Der Ablauf sichert vorher den jetzigen Stand und zeigt danach eine Tabelle. Jede Zeile muss gleich sein.

**N3 · Das Live-Projekt ist weg.**
Die letzte Sicherung mit **restore** nach `test` spielen und dann Claude bitten, Cloudflare und die Secrets auf das Test-Projekt umzustellen.

### Probe (einmal, und gern vor jedem großen Update)

**Actions** → **restore** → **Run workflow**: Wohin `test`, Nummer und Name der letzten nächtlichen Sicherung, `WIEDERHERSTELLEN`. Danach steht im Test-Projekt eine Kopie der echten Daten, und die Tabelle zeigt, dass die Sicherung vollständig ist.

---

## Erststart-Tutorial

### Was Schüler beim ersten Anmelden erleben

Wer sich zum ersten Mal anmeldet, bekommt automatisch ein kurzes Tutorial (etwa 5 Minuten). Ein Grundstück wählen die Schüler nicht mehr selbst: Das Dorf vergibt das nächste freie.

1. Sie wählen ihre **Figur** (Junge oder Mädchen).
2. Die Kamera fliegt über das Dorf zum eigenen Grundstück. Dort steht die Figur vor einer **Ruine** und sagt traurig: „Oh nein, mein Haus ist eine Ruine!“
3. Zwei kurze Nachrichten erklären **Daily Quests** und **Münzen**. Jede bleibt, bis man auf „Weiter“ tippt.
4. **Drei leichte Fragen** (Wörter, Grammatik, Hören), mit großen Antwortknöpfen. Einmal antippen prüft die Antwort, ohne Schreiben oder Dropdown. Falsch ist nicht schlimm: Es gibt einen kurzen englischen Tipp und man darf es noch einmal versuchen. Nach der dritten richtigen Antwort gibt es **50 Münzen**, einmalig.
5. Mit den Münzen **kaufen** sie das Fachwerkhaus (50 Münzen) und **stellen** es selbst auf den Platz der Ruine. Das geht auch, wenn Shop und Bauen für die Klasse ausgeschaltet sind.
6. Die Figur **tanzt**, sagt „Jetzt wird gelernt und Dailys gemacht!“, und die Daily Quests öffnen sich.

Bricht jemand ab oder meldet sich ab, geht es beim nächsten Mal am letzten abgeschlossenen Schritt weiter. Bereits gelöste Schritte kommen nicht noch einmal, und die 50 Münzen gibt es nie doppelt.

### Selbst ausprobieren

1. Im Lehrer-Bereich unter **Konten** ein neues **Schülerkonto** anlegen (zum Beispiel `testfuchs;test123;8a`).
2. Im Dorf (nicht im Lehrer-Bereich) mit diesem Konto anmelden. Das Tutorial startet sofort.
3. Zum Wiederholen: ein weiteres Testkonto anlegen. Ein Konto, das das Tutorial beendet hat, bekommt es nicht noch einmal. Testkonten danach im Lehrer-Bereich löschen.

Ihr eigenes Lehrkonto sieht das Tutorial nie.

### Datenbankstand des Tutorials

Migrationen 0019, 0020 und 0021 sind bereits online (am 26.10.2026 geprüft). Das Drei-Fragen-Tutorial ist damit auch serverseitig eingerichtet. Für den neuen Lehrerbereich fehlt noch 0022; siehe unten „Lehrerbereich bereitstellen“. Die lokale Tutorial-Vorschau verwendet Testdaten und benötigt dafür keine Live-Änderung.

---

## Daily Quests einspielen

Seit Oktober 2026 gibt es statt der Wochenaufgaben **Daily Quests**: jeden Tag (auch am Wochenende) 3 kurze Englisch-Aufgaben. Die Schüler öffnen sie mit dem Knopf **Aufgaben** oder durch Antippen der Tafel am Marktplatz. Was von gestern noch offen ist, steht darunter unter „Nachholen von gestern“ und bringt die halben Münzen. Versuche sind unbegrenzt. Wer im 1. oder 2. Versuch richtig liegt, bekommt die vollen Münzen, danach gibt es die Hälfte (aufgerundet). Alles wird auf dem Tablet nur angetippt: Antwort-Kacheln, bei Lücken eine Wortbank, beim Zuordnen erst ein Wort und dann sein Partner, beim Satzbau die Wörter der Reihe nach. Ein „Prüfen“-Knopf ist nicht nötig. Wenn du neue Wochen schreibst: Jede Lücke braucht jetzt eine `bank` mit 2–6 Wörtern (siehe `content/daily-quests/FORMAT.md`).

### Wer schreibt die Quests?

Die Quests einer Woche stehen in **einer Datei**. Sie heißt wie der **Montag** der Woche, zum Beispiel `2026-11-09.json`, und liegt im Ordner `content/daily-quests/`. Die Datei schreiben Sie nicht selbst: Claude im **Wochenplan-Projekt** erstellt sie aus der Jahresplanung und hält sich dabei an die Beschreibung `content/daily-quests/FORMAT.md`. Sie bitten dort zum Beispiel: „Erstelle die Daily Quests für die Woche ab 09.11. nach FORMAT.md.“

Für **Ferienwochen** gibt es eine kurze Ferien-Datei, damit der Lehrer-Bereich keine Warnung zeigt. Sie heißt wie der **Montag der Ferienwoche**, zum Beispiel `2026-12-21.json`, und hat nur eine Zeile:

```json
{ "week": "2026-12-21", "holiday": true }
```

### Das erste Mal: zuerst die Datenbank, dann die Quests

Beim ersten Mal muss die Reihenfolge stimmen. Sonst versucht GitHub, Quests in eine Datenbank zu schreiben, die die Quest-Tabellen noch gar nicht hat.

1. **Datenbank zuerst.** Claude Code lädt die neue Version des Lerndorfs auf GitHub hoch (Zweig `main`). Darin sind die Datenbank-Änderungen (Migrationen `0015` bis `0017`), aber noch **keine** Quest-Datei.
2. Auf GitHub im Repository **Lerndorf** oben auf **Actions** klicken.
3. Die Datenbank-Änderung mit **release** live bringen (Teil 3, „So geht ein Update live“). Warten, bis der Lauf einen **grünen Haken** hat. Ist er rot: den Namen des Ablaufs und die Fehlermeldung an Claude Code schicken und **nicht** weitermachen.
   - Es läuft auch **import-content**, weil die Beschreibung `FORMAT.md` im Ordner `content/` neu ist. Er ist grün, weil noch keine Quest-Datei da ist.
   - Bis **release** grün ist, kann bei Schülern „Die Quests konnten nicht geladen werden.“ stehen. Laden Sie deshalb außerhalb der Unterrichtszeit hoch.
   - Bis die erste Quest-Datei eingespielt ist, sehen die Schüler „Heute gibt es keine neuen Quests.“ Das ist normal.
4. **Erst jetzt die Quests.** Die erste Wochendatei (zum Beispiel `2026-11-09.json`) und, falls nötig, Ferien-Dateien in den Ordner `content/daily-quests/` legen und auf GitHub hochladen (Commit auf `main`). Das kann auch Claude Code für Sie tun.
5. Wieder auf **Actions** gehen und warten, bis der neue Lauf **import-content** grün ist.
6. Im **Lehrer-Bereich** den Abschnitt **Daily Quests** ansehen (siehe unten). Dort muss jetzt stehen, bis wann Quests vorhanden sind.

### Jede weitere Woche

1. Die neue Wochendatei aus dem Wochenplan-Projekt in `content/daily-quests/` legen und hochladen. Am besten ein paar Tage vor dem Montag.
2. Auf **Actions** prüfen, ob **import-content** grün ist.
3. Im Lehrer-Bereich unter **Daily Quests** nachsehen.

Eine Woche darf auch später noch einmal hochgeladen werden, zum Beispiel um einen Fehler zu korrigieren. Dann gilt die neue Fassung. Was Schüler schon gelöst haben, bleibt gelöst, und ihre Münzen bleiben. Hat die neue Fassung einen Fehler, bleibt die alte Fassung online.

### Was der Lehrer-Bereich zeigt

Im Lehrer-Bereich gibt es den Abschnitt **Daily Quests**:

- **Grüner Strich:** „Daily Quests vorhanden bis So 15.11.“: bis zu diesem Tag ist alles da.
- **Gelber Strich:** „Morgen gibt es noch keine Daily Quests.“ oder „Heute gibt es keine Daily Quests. Bitte das Quest-Paket für die Woche ab … hochladen.“: die nächste Wochendatei fehlt.
- **Roter Strich, rote Schrift:** „Das Quest-Paket für die Woche ab … hat Fehler und wurde nicht übernommen: …“: Die Datei hatte einen Fehler. Die Meldung sagt, wo (zum Beispiel `days[2].quests[1].hint`). Die Meldung an Claude im Wochenplan-Projekt geben, die Datei korrigieren lassen und erneut hochladen.
- **Grüner Strich** „Woche ab 21.12.: Ferien, keine Quests.“: eine Ferien-Datei ist eingespielt.
- **Vorschau: die nächsten 7 Tage**: alle kommenden Quests mit Tipp, Münzen und **Lösung**. So können Sie die Aufgaben vorher prüfen. Die Schüler sehen die Lösungen nie.

Mit einem Lehrkonto kann man im Dorf keine Quests lösen; dort steht dann „Nur Schülerkonten können Quests lösen.“ Zum Ansehen ist die Vorschau im Lehrer-Bereich da.

Die alte Aufgaben-Statistik wird nicht mehr angezeigt. Die Schülerseite zeigt jetzt den aktuellen Spielstand und die Aktivität.

## Sir Byte begleitet die Schüler

Sir Byte ist der Roboter mit Melone neben der Aufgabentafel am Marktplatz. Einmal antippen: Er zeigt auf die Tafel. Noch einmal antippen: Die Quests öffnen sich. Tafel und Aufgaben-Knopf funktionieren weiter wie bisher.

Im Erststart-Tutorial begrüßt er neue Schüler am Markt und erklärt auf Englisch die nächsten Schritte. Bei den Fragen steht er in einem kleinen 3D-Fenster. Nach einer falschen Antwort ermutigt er zum nächsten Versuch, nach einer richtigen freut er sich. Die Knöpfe und Rückmeldungen bleiben Deutsch. „Anhören“ bei einer Hör-Aufgabe unterbricht seine Stimme.

Zur Marktbegrüßung spricht er die vorhandene Aufnahme „Ready when you are.“. „Weiter“ kann sie sofort unterbrechen. Sein Lob wechselt zwischen acht kurzen Texten und verschiedenen Gesten; die zwei passenden Lob-Aufnahmen kommen mit mindestens 20 Sekunden Abstand bei der Auswahl und werden nicht direkt identisch wiederholt. Dazwischen bleibt das Lob stumm. Am Tagesende gibt es keine zweite gesprochene Lobkette.

Es werden nur seine sechs vorhandenen Aufnahmen verwendet. Der Schalter **Töne** in den Einstellungen schaltet auch seine Stimme aus; vor dem ersten Klick bleibt er still. Bei **Weniger Bewegung** entfallen Körpergesten. Ohne 3D-Unterstützung erscheint ein Standbild, die Texte funktionieren weiter. Es gibt keinen Chat und keine zusätzlichen Schülerdaten. Sir Byte selbst braucht keine Datenbankänderung.

Lokale Testansichten ohne Schülerkonto: `web/dev/byte.html` (Quests), `web/dev/tutorial.html` (gesamtes Tutorial), `web/dev/galerie.html?view=byte` (Markt-Nahansicht). Diese Testseiten sind kein Teil der veröffentlichten Website.

## XP, Level und Profil benutzen

Schüler tippen oben rechts auf ihr Figurenbild. Im Profil sehen sie den Fortschritt bis zum nächsten Level, Münzen, ihre Serie, heutige Quests und Truhen. „Sammlung“ führt auf eine eigene Seite mit den Reitern „Titel“ und „Rahmen“: Dort sind freigeschaltete und noch gesperrte Einträge zu sehen. Antippen des Figurenbilds oder Titels im Profil führt direkt zur passenden Auswahl. Aufgaben und Mein Haus stehen als zwei Symbole neben dem Figurenbild. Während des Tutorials öffnet das Figurenbild weiterhin die Einstellungen.

Richtige Quests bringen auch nach dem dritten Versuch noch XP. Ein vollständiges Tagesziel bringt zusätzliche XP. Stempel geben automatisch 100 XP; dafür muss die Lehrkraft nichts zusätzlich buchen. In der Klassenübersicht stehen Level, XP und Serie. Die Liste bleibt nach Spitzname sortiert.

Zum Öffnen tippen Schüler direkt auf die 3D-Truhe. Mit der Maus wackelt sie und ihre Umrisse leuchten. Der Deckel öffnet sich erst nach der Bestätigung des Servers. Bei einem Netzfehler kann der Schüler dieselbe Truhe erneut antippen; sie bucht ihre Münzen höchstens einmal. Das funktioniert ebenso in der Level-Feier, ohne zweiten Dialog. Die Münzen stehen im Kontoauszug als „Truhe“. Titel und Rahmen sind in der Sammlung erst ab dem angegebenen Level wählbar. XP werden nie abgezogen. Die Rechenregeln werden Schülern nicht als Tabelle angezeigt.

### Datenbank-Änderungen vorbereiten

0020 berechnet aus früher gelösten Daily Quests, Stempeln und abgeschlossenen Tutorials einmalig XP nach und vergibt dabei höchstens drei Truhen. 0021 verkürzt das Tutorial auf drei Fragen; 0022 ergänzt den Lehrerbereich. Bestehende Münzen und Gegenstände bleiben erhalten. Die geprüfte Reihenfolge und die Veröffentlichung stehen unten unter „Lehrerbereich bereitstellen“.

### Abnahme auf dem Schul-Tablet

- Figurenbild, Rahmen, Wappen und XP-Balken sind gut lesbar. Das Profil ist bedienbar und lässt sich schließen.
- Eine richtige Quest zeigt XP; ein Level-Aufstieg zeigt eine Feier mit Truhe.
- Das Tutorial endet mit der Level-2-Feier vor den Daily Quests.
- Truhenmünzen erscheinen genau einmal im Kontoauszug, auch bei erneutem Antippen.
- Gesperrte Titel und Rahmen sind erkennbar; freigeschaltete lassen sich wählen.
- Töne lassen sich ausschalten; reduzierte Bewegung wird beachtet.
- Das Dorf läuft auf dem ältesten Tablet weiterhin flüssig (Ziel mindestens 30 Bilder pro Sekunde).

Entwicklungsbilder: `web/test-results/xp-gallery/`; Tutorial: `web/test-results/tutorial/`; Dorf-Galerie: `web/test-results/layout-xp/`. Diese Prüfdateien bleiben lokal und werden nicht veröffentlicht.

## Lehrerbereich benutzen

Die neue lokale Vorschau ist unter `http://localhost:5175/dev/teacher.html` erreichbar. Sie verwendet ausschließlich erfundene Testdaten: Hier lassen sich die neuen Abläufe ausprobieren, ohne Konten oder Münzen der echten Klasse zu verändern. Nach der Veröffentlichung benutzen Sie wie bisher `/lehrer/`.

### Die sechs Arbeitsseiten

Oben wählen Sie **Klasse 8a** oder **Klasse 8b**. Die Adresse merkt sich die Klasse und die aktuelle Seite, auch beim Neuladen und bei der Zurück-Taste. Auf Tablets öffnet **Menü** die Seitenauswahl.

- **Übersicht:** Anzahl der Schüler, offenes Tutorial, Inaktivität, gebuchte Wochenstempel und Quest-Abdeckung. „Schüler anzeigen“ öffnet die passende gefilterte Liste.
- **Schüler:** Spitznamen suchen oder nach offenem Tutorial und Inaktivität filtern. „Details“ zeigt Haus, Gegenstände, Wochenquests und die letzten 50 Münzbuchungen. Level, XP und Serie stehen klein beim Spitznamen. Es gibt keine Rangliste.
- **Münzen & Stempel:** kleine Belohnungen, Korrekturen und Wochenplan-Stempel.
- **Daily Quests:** Abdeckung, Importfehler und Vorschau mit Lösungen wie bisher.
- **Konten:** einzeln oder als Liste anlegen, Karten drucken, Passwort zurücksetzen und Konto löschen.
- **Dorf & Regeln:** Shop/Bauen öffnen oder sperren, Vorlage und Seed ändern, Spielregeln und verkaufte Gegenstände festlegen. Neu ist hier die **Weltstimmung** (Normal oder Halloween) je Klasse. Das Neufestlegen des Dorfs braucht weiterhin eine Bestätigung.

### Weltstimmung: Normal oder Halloween

Unter **Dorf & Regeln → Weltstimmung** wählen Sie für die gerade ausgewählte Klasse **Normal** oder **Season I – Halloween** und speichern. Die Einstellung gilt sofort für diese Klasse; die andere Klasse bleibt unverändert. Sichtbare Schülergeräte übernehmen sie spätestens nach 30 Sekunden, beim Zurückkehren in den Tab sofort.

- Halloween wirkt nur, solange die Season im Kalender läuft. Wenn Sie vorher umstellen, steht dort **vorgemerkt**; die dunkle Welt beginnt mit dem Season-Start.
- Die Weltstimmung ändert **nur** Himmel, Licht, Nebel, Platzdekoration und die Gruselfiguren. LearnPass, Season-Zeitraum, XP, Münzen, Häuser und Grundstücke bleiben unverändert.
- **Normal** stellt die ursprüngliche Welt vollständig wieder her. Mehrfaches Umschalten erzeugt keine doppelten Lampen, Gräber oder Figuren.
- Der Halloween-Shop, das Ticket und die Begrüßung bleiben auch in der normalen Welt erreichbar. Die Begrüßung erscheint einmal pro Season und Inhalt, unabhängig von der Weltoptik, und lässt sich am Stand oder über das Ticket erneut öffnen.
- Wenn die Seite „Weltstimmung konnte nicht geladen werden“ zeigt, laden Sie neu. Die übrigen Dorf-Einstellungen bleiben in diesem Fall benutzbar.

### Schnell Münzen buchen – auch am Tablet

1. **Münzen & Stempel** öffnen.
2. Wenn gewünscht oben einen **Grund** wählen, zum Beispiel Mitarbeit. Der Grund bleibt ausgewählt, bis Sie ihn wechseln.
3. In der Zeile des Schülers **+5**, **+10**, **+20** oder **+100** antippen. **−5** und **−10** ziehen Münzen ab; die Knöpfe sind bei zu wenig Münzen ausgeschaltet.
4. Die bestätigte Buchung erscheint mit Betrag und Grund. Für zehn Sekunden lässt sie sich mit **Rückgängig** ausgleichen. Die ursprüngliche Buchung und die Gegenbuchung stehen beide im Kontoauszug.

**Mehrere Schüler:** die Namen markieren oder „alle“ wählen, dann in der Leiste „Für … markierte“ den Betrag antippen. Es wird für alle oder für niemanden gebucht. Während einer Anfrage sind die betroffenen Knöpfe gesperrt.

Hat ein Schüler die Münzen inzwischen ausgegeben, kann „Rückgängig“ scheitern. Dann bleibt die ursprüngliche Buchung stehen und die Seite zeigt den Grund. Bei einer Mehrfachbuchung wird niemals nur ein Teil zurückgenommen.

Für andere Beträge gibt es **Freie Korrektur** mit Pflichtnotiz. Unter **Stempel buchen** wählen Sie den Montag der Woche, markieren die abgegebenen Wochenpläne und buchen wie bisher. Bereits gestempelte Schüler sind ausgegraut; pro Woche gibt es keinen doppelten Stempel.

### Tafelmodus für die Klasse

Auf der **Übersicht** auf **Tafelmodus** klicken. Er zeigt nur Quests der ganzen Klasse, Klassen-Serie, Anzahl der Wochenstempel und die Dorfnachricht. Namen, individuelle Münzen, XP und Inaktivität bleiben verborgen. **Vollbild** nutzt den ganzen Bildschirm, **Zurück** oder Escape führt zur Übersicht. Die Werte werden jede Minute nachgeladen.

### Nachricht ins Dorf schicken

Auf der **Übersicht** unter **Nachricht ins Dorf** bis zu 140 Zeichen schreiben. Standardmäßig bleibt sie sieben Tage gültig; das Datum ist änderbar. **Veröffentlichen** speichert, **Entfernen** löscht die Nachricht. Schüler sehen einen Zettel an der Markttafel und einmal eine Karte mit **OK**. Während des Tutorials wartet die Karte bis zum Ende. Sir Byte liest die Nachricht nicht vor.

### QR-Zugangskärtchen

Direkt nach dem Anlegen oder Passwort-Zurücksetzen auf **Karten drucken** klicken. Jedes Kärtchen zeigt Spitzname, Passwort und QR-Code. Beim Scannen meldet sich der Schüler direkt an. Die Zugangsdaten verschwinden sofort aus der Adresse. Bei einem falschen oder alten Passwort bleibt die normale Anmeldung mit vorausgefülltem Spitznamen stehen.

Die Passwörter bleiben nur für diese Sitzung im Speicher. Nach Abmelden/Schließen stehen die Karten nicht mehr zur Verfügung. Nach einem Passwortwechsel enthält die Karte nur das neue Passwort. **Bei Verlust: Passwort zurücksetzen und eine neue Karte drucken.** Bitte die Druckkarten genauso wie bisher sicher verteilen.

### Als Schüler ansehen

Auf **Schüler** neben einem Namen **Als Schüler ansehen** öffnen. Ein neuer Tab zeigt dessen Dorf und markiertes Haus. Oben steht „Ansicht von … – nur ansehen“. Die Kamera und die Bewohner funktionieren; Shop, Bauen, Inventar, Profil und Tutorial bleiben ausgeschaltet. **Aufgaben** zeigt nur den Aufgabenstand, keine Eingabe und keine Lösungen. **Zurück zum Lehrerbereich** führt zur Schülerliste.

### Lehrerbereich bereitstellen

Der neue Lehrerbereich ist noch nicht veröffentlicht. Die Live-Datenbank wurde in diesem Arbeitsschritt nur gelesen. Am 26.10.2026 wurde folgender Stand bestätigt:

1. `0020_xp_levels.sql`: Fortschritt, Level und Profil – bereits online.
2. `0021_tutorial_tap_questions.sql`: drei Tutorialfragen – bereits online.
3. `0022_teacher_overhaul.sql`: neuer Lehrerbereich, Nachrichten und Leseansichten – **noch ausstehend**.

Nach der Prüfung durch die Lehrkraft in dieser Reihenfolge vorgehen:

1. Im Projektordner die bestehende Supabase-Verknüpfung `ygopamapzhlwrpjzjunq` prüfen: `npx supabase migration list --linked`.
2. Vorschau: `npx supabase db push --linked --dry-run`. Als ausstehende Datei wird nur 0022 erwartet. Bei weiteren oder abweichenden Dateien erst den Unterschied klären.
3. Außerhalb der Unterrichtszeit `npx supabase db push --linked` ausführen. Die CLI wendet Migration 0022 auf den bereits vorhandenen Vorgängern an. Seit 27.10.2026 übernimmt das der Ablauf **release** mit Sicherung und Freigabe (Teil 3).
4. Mit `npx supabase migration list --linked` kontrollieren, dass 0022 nun ebenfalls lokal und online steht.
5. Den passenden Website-Stand veröffentlichen. Danach mit einem Testkonto Anmeldung, drei Tutorialfragen, Profil und Nachricht prüfen; im Lehrerbereich eine kleine Buchung samt Rückgängig testen.

**Keine einzelne neue Oberfläche vor den Datenbankänderungen veröffentlichen.** Auch nach einem erfolgreichen lokalen Test fehlen die Live-Funktionen bis zu dieser Umstellung.

### Abnahme Lehrerbereich (L.14)

- Alle sechs Seiten und Klassenwechsel öffnen; Neuladen behält die Seite.
- Schülerdetails, Aktivität und Kontoauszug mit einem Testkonto prüfen.
- Am Tablet im Hoch- und Querformat eine Einzel-/Mehrfachbuchung und Rückgängig testen.
- Tafelmodus am Beamer ansehen: ausschließlich Klassenwerte.
- Dorfnachricht veröffentlichen, als Schüler einmal bestätigen, anschließend erneut anmelden.
- QR-Karte nach Anlegen und Passwortwechsel auf dem Schulgerät scannen.
- „Als Schüler ansehen“ prüfen: kein Ändern oder Lösen möglich.

Lokale Prüf-Bilder: `web/test-results/teacher/`, Dorf-Galerie: `web/test-results/layout-teacher/`. Diese Bilder und Testdaten werden nicht veröffentlicht.


## Kleiderschrank (lokale Umsetzung 26.10.2026)

Im Hausmenü öffnet „Kleiderschrank“ das Ankleidezimmer. Die Figur wird mit Finger oder Maus gedreht. Einmal auf eine Karte tippen probiert ein gekauftes Teil an; „Fertig“ speichert den Look. Bei Problemen mit dem Speichern bleibt die Auswahl erhalten. „Original“ stellt Grundkleidung oder Originalfarbe wieder her.

Kaufen erfolgt weiter im Haus-Shop. Danach gibt es „Zum Kleiderschrank“, im Inventar „Anziehen“. Ein geschlossener Shop sperrt neue Käufe; bereits gekaufte Dinge bleiben anziehbar. Jede Figur behält einen eigenen Look.

Aktuell lokal vorbereitet: Die neue Migration 0023 und die Veröffentlichung sind noch nicht live ausgeführt. Eine Vorschau mit Testbesitz läuft unter http://localhost:5175/dev/wardrobe.html (Mädchen: ?character=girl). Weitere Details und Prüfstand: [Avatar-Kleiderschrank](AVATAR_KLEIDERSCHRANK.md).

## Season I – Halloween (LearnPass)

Eine Saison ist ein Zeitraum von etwa sechs Wochen mit 40 Stufen. In Season I (28.10.–06.12.2026) sammeln die Schüler **Season-XP** und holen sich Münzen, Truhen, Titel, Rahmen und Gartenszenen. Am Ende winkt eine freie Wahl aus allen Truhen-Gegenständen.

### Wo finden die Schüler den LearnPass?

- **Profilkarte:** Im Profil steht unter dem XP-Balken „Season I – Halloween“ mit Stufe, Restzeit und der Zahl wartender Truhen. Antippen öffnet den Pass.

### Was die Schüler tun

1. **Spooky English Quiz** – am Halloween-Stand oder über das „Season I“-Ticket im Dorf: zehn Klickfragen (Odd one out, Steigerung, BE/AE, vier Hörfragen). Je erste richtige Antwort 10 XP, nach allen zehn 50 XP Bonus – zusammen **genau 150 XP = Stufe 5**, einmal pro Saison, ohne Stempel. Falsche Antworten geben einen Tipp und kosten nichts.
2. **Quests lösen** – jede Buchung im Saisonfenster zählt als Season-XP.
3. **Stufen abholen** – erreichte Stufen leuchten orange; „Abholen“ gibt Münzen, Truhen, Titel, Rahmen oder eine Gartenszene.
4. **Truhen öffnen** – im Inventar unter „Season-Truhen“. Pass-Truhen kommen auf Stufe 5, 10, 15, …, 40; die **Truhen-Serie** gibt zusätzlich eine Truhe an jedem dritten Tag in Folge mit gelöster Quest; im Shop gibt es **zwei Truhen pro Woche für je 50 Münzen**.
5. **Stufe 40** – Truhe, Titel „Halloween Legend“, 25 Münzen und eine **freie Wahl** aus den 28 Truhen-Gegenständen. Wer den Gegenstand schon besitzt, bekommt stattdessen seinen Verkaufswert in Münzen.
6. **Was ist drin?** – in der Truhen-Übersicht jeden Gegenstand antippen: Er erscheint groß in 3D zum Drehen und Zoomen. Das ist nur eine Vorschau, es wird nichts geöffnet oder gekauft.
7. **Doppelte verkaufen** – im Inventar bei den Season-Gegenständen. Nur unplatzierte Exemplare, Werte: 15 / 40 / 100 / 250 Münzen je Seltenheit.

### Musik und Klänge

Im Dorf läuft leise Hintergrundmusik, in den Quizfenstern eine ruhigere Denk-Musik. Richtige und falsche Antworten haben einen eigenen Klang, Sir Byte „blippt“ bei jeder neuen Sprechblase. Unter **Einstellungen** lassen sich **Musik** und **Töne** getrennt ausschalten; das merkt sich jedes Gerät.

### Saison steuern (Lehrerbereich)

1. Im Lehrerbereich anmelden und oben **Saison** wählen.
2. Jede Saison erscheint als Karte mit Zustand: **geplant**, **läuft**, **beendet** oder **abgeschlossen**.
3. **Daten ändern:** Start und Ende eintragen, „Daten speichern“. Das Ende muss ein **Sonntag** sein, nach dem Start liegen und darf sich nicht mit einer anderen Saison überschneiden. Solange die Saison läuft, darf das Ende nicht vor heute liegen – dafür gibt es „Jetzt beenden“.
4. **Jetzt starten:** Eine geplante Saison beginnt heute. Das geht nur, wenn keine andere Saison läuft.
5. **Jetzt beenden:** Die Saison endet gestern. Erreichte, noch nicht abgeholte Stufen werden **allen Schülern sofort gutgeschrieben**. Ungeöffnete Truhen bleiben danach noch öffnbar.
6. **Saison abschließen:** nach dem Ende möglich; schreibt offene Stufen gut und sperrt die Daten endgültig.
7. Die Tabelle darunter zeigt je Schüler: Saison-XP, Stufe, abgeholte Stufen, wartende und geöffnete Truhen sowie die Truhen-Serie.

**Wichtig bei Datumsänderungen:** Abgeholte Stufen bleiben abgeholt. XP, die vor dem neuen Start gesammelt wurden, zählen nicht mehr – die Oberfläche weist darauf hin.

### Nach der Saison

Season-Gegenstände bleiben im Besitz, sind aber nicht mehr im Shop zu kaufen. Truhen lassen sich weiterhin öffnen, und die Stufe-40-Wahl bleibt offen, bis sie getroffen wurde. Gartenszenen, Titel und Rahmen bleiben dauerhaft.

### Wenn etwas nicht klappt

| Meldung | Bedeutung |
| --- | --- |
| „Die Saison läuft nicht.“ | Der Shop verkauft keine Truhen außerhalb des Saisonfensters. |
| „Limit erreicht“ | Zwei Shop-Truhen pro Woche sind gekauft; nächste Woche wieder zwei. |
| „Dafür reichen die Münzen nicht.“ | Der Shop-Kauf kostet 50 Münzen; Quests bringen neue. |
| „Saison beendet“ | Stufen werden automatisch gutgeschrieben; nichts weiter tun. |
| „Ende muss Sonntag sein“ | Beim Ändern der Daten ein Sonntagsdatum wählen. |

## Sammelkarten: The Midnight Collection

Die Halloween-Sammlung ist **kein Ersatz** für die 28 Dorfgegenstände und ändert deren Truhenchancen nicht.

### Wo finden die Schüler die Karten?

Profil öffnen und unten auf **Sammelkarten** tippen. Zuerst erscheint der Almanach-Umschlag. **Almanach öffnen** zeigt alle 50 Karten mit Suche und Filtern (Seltenheit, Classroom Curses). Eine Karte antippen zeigt Inhalt und Quellen; **In 3D ansehen** öffnet das gedrehte Modell mit **Umdrehen**, **Ansicht zurücksetzen** und bei Druckkarten **Druckbild ansehen**. Die Vorschau vergibt nichts und ändert keinen Besitz. **Erfolge** ist ausdrücklich noch ein Platzhalter.

- **50 aktive Karten:** 18 normal, 17 rare, 14 epic und genau eine legendary (`Highlight 8`). Acht frühere Figuren bleiben archiviert und erscheinen nie.
- **35 Karten über den LearnPass:** normal und rare zusätzlich zu den Münzen auf denselben 24 Münzfeldern. Bereits abgeholte Felder werden beim nächsten Öffnen der Sammlung nachgetragen; Münzen werden dabei nicht erneut gebucht.
- **15 Karten über Season-Truhen:** 14 epic und die eine legendary, nur solange die Karte noch nicht besessen wird. Keine Karte kann doppelt besessen werden.
- **Truhen-Kartenchance:** Der Kartenbonus in Truhen ist **absichtlich ausgeschaltet**, bis Trefferhäufigkeit und Gewichte festgelegt sind. Dorfgegenstand und Münzen aus der Truhe bleiben unverändert. Vor dieser Änderung geöffnete Truhen ziehen keine Karte nach.

### Neue Datenbank-Migrationen

Für diese Funktionen kommen fünf neue Migrationen dazu:

| Migration | Inhalt |
| --- | --- |
| `0034_class_world_theme.sql` | Weltstimmung je Klasse und Welcome-Quittung |
| `0049_collection_cards.sql` | Kartendefinitionen, Besitz, serverseitige Vergabe |
| `0050_collection_chest_rewards.sql` | feste Passkarten, Truhen-Kartenbonus (aus), Nachbuchung |
| `0051_season_starter.sql` | Spooky English Quiz: zehn Fragen, Fortschritt, 150 XP einmal pro Saison |
| `0052_season_item_rarities.sql` | Kürbismädchen und Hexen-Statue werden Episch, das Kürbisfeld Selten |

Sie werden – wie alle Migrationen – beim Merge nach `main` automatisch eingespielt. Vorher nichts von Hand in Supabase ausführen. Nach der Live-Prüfung friert der technische Lauf die Migrationen mit `npm run migrations:lock` ein. Der Branch `codex/halloween-collection` ist bewusst **noch nicht gepusht**.

### Wenn etwas nicht klappt

| Meldung | Bedeutung |
| --- | --- |
| „Die Sammlung konnte nicht geladen werden.“ | Katalog oder Besitz nicht erreichbar; Seite neu laden. Der Besitz bleibt serverseitig erhalten. |
| „3D-Ansicht ist auf diesem Gerät nicht verfügbar.“ | Der Browser kann kein WebGL öffnen; Karte und Quellen bleiben lesbar. |
| „Das Modell konnte nicht geladen werden.“ | Modelldatei fehlt oder Netzwerkfehler; **Erneut versuchen** antippen. |
| Leere Sammlung trotz Abholung | Profil neu öffnen; die Nachbuchung läuft beim Lesen der Sammlung automatisch. |
