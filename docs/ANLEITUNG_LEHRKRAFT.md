# Anleitung für die Lehrkraft

Diese Anleitung zeigt Schritt für Schritt, wie Lerndorf eingerichtet wird und wie man es im Alltag benutzt. Man braucht kein Programmierwissen.

Teil 1 (Einrichtung) macht man einmal. Teil 2 (Alltag) braucht man jede Woche.

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

Im Repository auf **Actions** gehen. Dort sieht man drei Abläufe:

- **migrate**: richtet die Datenbank ein. Läuft automatisch bei jeder Änderung.
- **deploy**: baut die Seite und veröffentlicht sie. Läuft automatisch bei jeder Änderung am Code.
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

## Erststart-Tutorial

### Was Schüler beim ersten Anmelden erleben

Wer sich zum ersten Mal anmeldet, bekommt automatisch ein kurzes Tutorial (etwa 5 Minuten). Ein Grundstück wählen die Schüler nicht mehr selbst: Das Dorf vergibt das nächste freie.

1. Sie wählen ihre **Figur** (Junge oder Mädchen).
2. Die Kamera fliegt über das Dorf zum eigenen Grundstück. Dort steht die Figur vor einer **Ruine** und sagt traurig: „Oh nein, mein Haus ist eine Ruine!“
3. Zwei kurze Nachrichten erklären **Daily Quests** und **Münzen**. Jede bleibt, bis man auf „Weiter“ tippt.
4. **Fünf ganz leichte Fragen** (Wörter, Lücke, Zuordnen, Hören). Falsch ist nicht schlimm: Es gibt einen kurzen englischen Tipp und man darf es noch einmal versuchen. Nach der fünften richtigen Antwort gibt es **50 Münzen**, einmalig.
5. Mit den Münzen **kaufen** sie das Fachwerkhaus (50 Münzen) und **stellen** es selbst auf den Platz der Ruine. Das geht auch, wenn Shop und Bauen für die Klasse ausgeschaltet sind.
6. Die Figur **tanzt**, sagt „Jetzt wird gelernt und Dailys gemacht!“, und die Daily Quests öffnen sich.

Bricht jemand ab oder meldet sich ab, geht es beim nächsten Mal am letzten abgeschlossenen Schritt weiter. Bereits gelöste Schritte kommen nicht noch einmal, und die 50 Münzen gibt es nie doppelt.

### Selbst ausprobieren

1. Im Lehrer-Bereich unter **Konten** ein neues **Schülerkonto** anlegen (zum Beispiel `testfuchs;test123;8a`).
2. Im Dorf (nicht im Lehrer-Bereich) mit diesem Konto anmelden. Das Tutorial startet sofort.
3. Zum Wiederholen: ein weiteres Testkonto anlegen. Ein Konto, das das Tutorial beendet hat, bekommt es nicht noch einmal. Testkonten danach im Lehrer-Bereich löschen.

Ihr eigenes Lehrkonto sieht das Tutorial nie.

### Die Datenbank-Änderung (Migration 0019) einspielen

**Wichtig vorher lesen.** Das Tutorial liegt zurzeit nur auf dem Zweig `feature/first-login-tutorial`, **nicht** auf `main`. Die Datenbank-Änderung `0019_first_login_tutorial.sql` ist noch **nirgends eingespielt**. Der Ablauf **migrate** (siehe Einrichtung) spielt Datenbank-Änderungen **automatisch** ein, sobald sie auf `main` landen. Deshalb gilt: **Erst den Zweig testen, dann erst auf `main` übernehmen.** Was auf `main` ist, ist für Schüler sofort live.

Folgen von 0019, auf die Sie achten sollten:
- Das Fachwerkhaus ist kein kostenloses Starterhaus mehr (kostet 50 Münzen).
- Die alte Grundstückswahl per Antippen ist abgeschaltet. Die alte Fassung des Dorfes (ohne Tutorial) kann mit der neuen Datenbank nicht mehr richtig arbeiten. Migration und neuer Code müssen also **zusammen** live gehen.
- Bitte außerhalb der Unterrichtszeit umstellen.

**So testen Sie vorher (Claude Code übernimmt die Technik):**
1. Claude Code bittet man: „Spiele Migration 0019 in die Datenbank ein, damit ich den Zweig testen kann.“ Claude Code spielt sie über die Supabase-Verbindung ein und trägt sie als erledigt ein. So versucht der Ablauf **migrate** sie später nicht noch einmal.
2. Die Vorschau-Adresse des Zweigs finden: Cloudflare-Dashboard → **Workers & Pages** → Projekt `lerndorf` → **Deployments** → Eintrag mit dem Zweig `feature/first-login-tutorial` → die Adresse darunter (`https://…lerndorf.pages.dev`). Diese Seite benutzt dieselbe Datenbank wie die echte.
3. Dort wie unter „Selbst ausprobieren“ mit einem Testkonto das Tutorial durchspielen.

**Ohne Claude Code, von Hand (nur wenn nötig):**
1. Supabase-Dashboard → Ihr Projekt → links **SQL Editor** → **New query**.
2. Die Datei `supabase/migrations/0019_first_login_tutorial.sql` aus dem Repository auf GitHub öffnen (Zweig `feature/first-login-tutorial`), **Raw** anklicken, alles markieren und kopieren.
3. In den SQL Editor einfügen und **Run** klicken. Es muss „Success“ erscheinen. Bei einer roten Fehlermeldung: nichts weiter tun, Meldung an Claude Code schicken.
4. Danach **muss** zusätzlich diese eine Zeile ausgeführt werden (neue Abfrage, **Run**), damit **migrate** später nicht doppelt einspielt und rot wird: `insert into supabase_migrations.schema_migrations (version, name) values ('0019', 'first_login_tutorial');` Im Zweifel lieber Claude Code fragen.

**Wenn der Test gut war:** Claude Code bitten, den Zweig auf `main` zu übernehmen. Danach auf GitHub unter **Actions** prüfen, dass **migrate** und **deploy** grün sind (siehe „Daily Quests einspielen“, Schritt 3). Bei rot: Ablaufname und Fehlermeldung an Claude Code schicken.

---

## Daily Quests einspielen

Seit Oktober 2026 gibt es statt der Wochenaufgaben **Daily Quests**: jeden Tag (auch am Wochenende) 3 kurze Englisch-Aufgaben. Die Schüler öffnen sie mit dem Knopf **Aufgaben** oder durch Antippen der Tafel am Marktplatz. Was von gestern noch offen ist, steht darunter unter „Nachholen von gestern“ und bringt die halben Münzen. Versuche sind unbegrenzt, Münzen gibt es aber nur, wenn die richtige Antwort unter den ersten 3 Versuchen ist.

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
3. In der Liste den neuesten Lauf **migrate** suchen. Warten, bis er einen **grünen Haken** hat (meist 1–2 Minuten). Ist er rot: den Namen des Ablaufs und die Fehlermeldung an Claude Code schicken und **nicht** weitermachen.
   - Es läuft auch **import-content**, weil die Beschreibung `FORMAT.md` im Ordner `content/` neu ist. Er ist grün, weil noch keine Quest-Datei da ist.
   - Bis **migrate** grün ist, kann bei Schülern „Die Quests konnten nicht geladen werden.“ stehen. Laden Sie deshalb außerhalb der Unterrichtszeit hoch.
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

Der Abschnitt **Aufgaben-Statistik** zeigt nur noch die alten Wochenaufgaben von früher.
