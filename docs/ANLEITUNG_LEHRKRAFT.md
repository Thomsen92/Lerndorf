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

**Wichtig vorher lesen.** Das Tutorial liegt zurzeit nur auf dem Zweig `feature/first-login-tutorial`, **nicht** auf `main`. Die Datenbank-Änderung `0019_first_login_tutorial.sql` ist noch **nirgends eingespielt**. Die Test-Vorschau des Zweigs benutzt dieselbe Datenbank wie das echte Dorf. Um den Zweig zu testen, muss 0019 also **in die echte Datenbank**.

**Was das bedeutet (ehrlich):** Vom Einspielen bis zur Übernahme auf `main` trifft das alte, echte Dorf auf die neue Datenbank. In dieser Zeit ist die alte Grundstückswahl gesperrt, und das Fachwerkhaus kostet 50 Münzen statt nichts. Das ist nur unproblematisch, solange es **noch keine echten Schülerkonten** gibt. **In dieser Zeit bitte keine echten Schülerkonten anlegen.**

Weitere Folgen von 0019:
- Das Fachwerkhaus ist kein kostenloses Starterhaus mehr (kostet 50 Münzen).
- Migration und neuer Code müssen am Ende **zusammen** live gehen.
- Bitte außerhalb der Unterrichtszeit umstellen.

**Reihenfolge:** 1. Migration 0019 einspielen. 2. Die Vorschau des Zweigs testen. 3. Erst danach den Zweig auf `main` übernehmen.

**Achtung beim Einspielen:** Die Migration darf **nicht** über ein Werkzeug eingespielt werden, das selbst einen Zeitstempel als Versionsnummer einträgt (zum Beispiel `apply_migration` der Supabase-Verbindung). Der Eintrag in der Migrations-Liste muss genau die Version `0019` und den Namen `0019_first_login_tutorial` haben, sonst hält der Ablauf **migrate** die Migration später für „noch offen“ und wird rot.

**Ablauf (Claude Code übernimmt die Technik, oder Sie von Hand):**
1. Supabase-Dashboard → Ihr Projekt → links **SQL Editor** → **New query**.
2. Zuerst nachsehen, wie die bisherigen Einträge aussehen, und diese Schreibweise übernehmen:
   `select version, name from supabase_migrations.schema_migrations order by version;`
   (Erwartet, aber nicht geprüft: Version zum Beispiel `0018`, Name zum Beispiel `0018_character_choice`. Passt das Muster nicht zu dem unten genannten Eintrag, bitte erst Claude Code fragen.)
3. Neue Abfrage: Den Inhalt der Datei `supabase/migrations/0019_first_login_tutorial.sql` (auf GitHub, Zweig `feature/first-login-tutorial`, **Raw**) in **einem Stück** zwischen diese beiden Zeilen setzen und mit **Run** ausführen:
   ```
   begin;
   -- hier der gesamte Inhalt von 0019_first_login_tutorial.sql
   insert into supabase_migrations.schema_migrations (version, name) values ('0019', '0019_first_login_tutorial');
   commit;
   ```
   So entsteht der Eintrag nur, wenn die Migration vollständig gelungen ist. Bei einer roten Fehlermeldung: nichts weiter tun, Meldung an Claude Code schicken.
4. Die Vorschau-Adresse des Zweigs finden: Cloudflare-Dashboard → **Workers & Pages** → Projekt `lerndorf` → **Deployments** → Eintrag mit dem Zweig `feature/first-login-tutorial` → die Adresse darunter (`https://…lerndorf.pages.dev`).
5. Dort wie unter „Selbst ausprobieren“ mit einem Testkonto das Tutorial durchspielen.

**Solange 0019 live, aber noch nicht auf `main` ist:** Jeder andere Push auf `main`, der etwas unter `supabase/**` ändert, lässt den Ablauf **migrate** fehlschlagen, bis der Zweig übernommen ist (die Datenbank kennt dann eine Migration, die `main` noch nicht hat). In dieser Zeit also keine anderen Datenbank-Änderungen auf `main` schicken.

**Wenn der Test gut war:** Claude Code bitten, den Zweig auf `main` zu übernehmen. Danach auf GitHub unter **Actions** prüfen, dass **migrate** und **tests** (Datei `deploy.yml`) grün sind (siehe „Daily Quests einspielen“, Schritt 3). Bei rot: Ablaufname und Fehlermeldung an Claude Code schicken.

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

## Sir Byte begleitet die Schüler

Sir Byte ist der Roboter mit Melone neben der Aufgabentafel am Marktplatz. Einmal antippen: Er zeigt auf die Tafel. Noch einmal antippen: Die Quests öffnen sich. Tafel und Aufgaben-Knopf funktionieren weiter wie bisher.

Im Erststart-Tutorial begrüßt er neue Schüler am Markt und erklärt auf Englisch die nächsten Schritte. Bei den Fragen steht er in einem kleinen 3D-Fenster. Nach einer falschen Antwort ermutigt er zum nächsten Versuch, nach einer richtigen freut er sich. Die Knöpfe und Rückmeldungen bleiben Deutsch. „Anhören“ bei einer Hör-Aufgabe unterbricht seine Stimme.

Zur Marktbegrüßung spricht er die vorhandene Aufnahme „Ready when you are.“. „Weiter“ kann sie sofort unterbrechen. Sein Lob wechselt zwischen acht kurzen Texten und verschiedenen Gesten; die zwei passenden Lob-Aufnahmen kommen mit mindestens 20 Sekunden Abstand bei der Auswahl und werden nicht direkt identisch wiederholt. Dazwischen bleibt das Lob stumm. Am Tagesende gibt es keine zweite gesprochene Lobkette.

Es werden nur seine sechs vorhandenen Aufnahmen verwendet. Der Schalter **Töne** in den Einstellungen schaltet auch seine Stimme aus; vor dem ersten Klick bleibt er still. Bei **Weniger Bewegung** entfallen Körpergesten. Ohne 3D-Unterstützung erscheint ein Standbild, die Texte funktionieren weiter. Es gibt keinen Chat und keine zusätzlichen Schülerdaten. Sir Byte selbst braucht keine Datenbankänderung.

Lokale Testansichten ohne Schülerkonto: `web/dev/byte.html` (Quests), `web/dev/tutorial.html` (gesamtes Tutorial), `web/dev/galerie.html?view=byte` (Markt-Nahansicht). Diese Testseiten sind kein Teil der veröffentlichten Website.

## XP, Level und Profil benutzen

Schüler tippen oben rechts auf ihr Figurenbild. Im Profil sehen sie den Fortschritt bis zum nächsten Level, Münzen, ihre Serie, heutige Quests und Truhen. „Sammlung“ führt auf eine eigene Seite mit den Reitern „Titel“ und „Rahmen“: Dort sind freigeschaltete und noch gesperrte Einträge zu sehen. Antippen des Figurenbilds oder Titels im Profil führt direkt zur passenden Auswahl. Die drei Hauptknöpfe bleiben unverändert. Während des Tutorials öffnet das Figurenbild weiterhin die Einstellungen.

Richtige Quests bringen auch nach dem dritten Versuch noch XP. Ein vollständiges Tagesziel bringt zusätzliche XP. Stempel geben automatisch 100 XP; dafür muss die Lehrkraft nichts zusätzlich buchen. In der Klassenübersicht stehen Level, XP und Serie. Die Liste bleibt nach Spitzname sortiert.

Zum Öffnen tippen Schüler direkt auf die 3D-Truhe. Mit der Maus wackelt sie und ihre Umrisse leuchten. Der Deckel öffnet sich erst nach der Bestätigung des Servers. Bei einem Netzfehler kann der Schüler dieselbe Truhe erneut antippen; sie bucht ihre Münzen höchstens einmal. Das funktioniert ebenso in der Level-Feier, ohne zweiten Dialog. Die Münzen stehen im Kontoauszug als „Truhe“. Titel und Rahmen sind in der Sammlung erst ab dem angegebenen Level wählbar. XP werden nie abgezogen. Die Rechenregeln werden Schülern nicht als Tabelle angezeigt.

### Datenbank-Änderung 0020 einspielen

Die neue Oberfläche braucht die Datei `supabase/migrations/0020_xp_levels.sql`. Die Migrationen 0001–0019 sind am 25.10.2026 online geprüft und bereits vorhanden. Migration 0020 berechnet aus früher gelösten Daily Quests, Stempeln und abgeschlossenen Tutorials einmalig XP nach und vergibt dabei höchstens drei Truhen. Bestehende Münzen und Gegenstände bleiben erhalten.

1. Zuerst die fertige Änderung samt Prüfung ansehen. Noch nicht allein die neue Oberfläche veröffentlichen.
2. Im Lerndorf-Projekt die Supabase-CLI anmelden und mit dem vorhandenen Projekt verknüpfen, falls die Sitzung abgelaufen ist.
3. Mit `npx supabase db push --linked --dry-run` prüfen: Als neue Datei darf nur `0020_xp_levels.sql` erscheinen.
4. Mit `npx supabase db push --linked` die geprüfte Änderung anwenden. Anschließend mit `npx supabase migration list --linked` kontrollieren: 0020 muss lokal und online stehen. Alternativ übernimmt der vorhandene GitHub-Workflow „migrate“ das Einspielen, wenn die Änderung auf `main` veröffentlicht wird.
5. Danach den passenden Website-Stand veröffentlichen und ein Schülerkonto prüfen: Profil öffnen, Quest lösen, gegebenenfalls eine Truhe öffnen. Mit einem neuen Testkonto zusätzlich das Tutorial bis zur Level-2-Feier durchlaufen.

### Abnahme auf dem Schul-Tablet

- Figurenbild, Rahmen, Wappen und XP-Balken sind gut lesbar. Das Profil ist bedienbar und lässt sich schließen.
- Eine richtige Quest zeigt XP; ein Level-Aufstieg zeigt eine Feier mit Truhe.
- Das Tutorial endet mit der Level-2-Feier vor den Daily Quests.
- Truhenmünzen erscheinen genau einmal im Kontoauszug, auch bei erneutem Antippen.
- Gesperrte Titel und Rahmen sind erkennbar; freigeschaltete lassen sich wählen.
- Töne lassen sich ausschalten; reduzierte Bewegung wird beachtet.
- Das Dorf läuft auf dem ältesten Tablet weiterhin flüssig (Ziel mindestens 30 Bilder pro Sekunde).

Entwicklungsbilder: `web/test-results/xp-gallery/`; Tutorial: `web/test-results/tutorial/`; Dorf-Galerie: `web/test-results/layout-xp/`. Diese Prüfdateien bleiben lokal und werden nicht veröffentlicht.
