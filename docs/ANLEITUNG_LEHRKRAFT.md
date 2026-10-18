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
2. **Workers & Pages** → **Create** → **Pages** → **Upload assets** (Direct Upload). Projektname: `lerndorf`. Hochladen ist nicht nötig, der Workflow macht das. Einfach einen Platzhalter hochladen und das Projekt anlegen.
3. Einen API-Token erstellen: **My Profile** → **API Tokens** → **Create Token** → Vorlage **Edit Cloudflare Workers** oder Recht **Account → Cloudflare Pages → Edit**.
4. Die **Account ID** steht im Dashboard rechts auf der Startseite.
5. In GitHub unter **Settings → Secrets and variables → Actions** die beiden Secrets `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` eintragen.

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

## Neue Aufgabenwoche einspielen

Die Aufgaben einer Woche kommen als eine Datei in den Ordner `content/tasks/`. Die Datei heißt wie der **Montag** der Woche, zum Beispiel `2026-11-09.json`. Die Schüler sehen die Aufgaben ab diesem Montag.

1. Die Datei für die Woche erstellen. Vorlage: `content/schema.json` zeigt den Aufbau. Ein Beispiel für jede Aufgabenart:

```json
{
  "week": "2026-11-09",
  "class": null,
  "tasks": [
    { "id": "v01", "type": "choice", "reward": 5, "prompt": "What is 'Fahrkarte'?",
      "options": ["ticket", "card", "map", "fare"], "solution": "ticket" },
    { "id": "g01", "type": "gap", "reward": 10, "prompt": "Yesterday we ___ to Brooklyn.",
      "solution": ["went"] },
    { "id": "m01", "type": "match", "reward": 15, "prompt": "Ordne zu.",
      "pairs": [["subway", "U-Bahn"], ["sidewalk", "Gehweg"], ["block", "Häuserblock"]] },
    { "id": "o01", "type": "order", "reward": 10, "prompt": "Bring the words in order.",
      "solution": ["I", "went", "home"] }
  ]
}
```

2. Die Regeln:
   - `reward` ist 5, 10 oder 15 Münzen (leicht, mittel, schwer).
   - `class` ist `null` für beide Klassen oder `"8a"` bzw. `"8b"`.
   - Die Lösungen stehen in der Datei und werden nie an die Schüler geschickt.
   - Die Datei muss ein gültiges JSON sein. Kommas am Ende sind nicht erlaubt.

3. Die Datei nach `content/tasks/` legen und auf GitHub hochladen (Commit auf `main`).

4. Im Repository auf **Actions** prüfen, ob der Ablauf **import-content** grün ist. Bei einem Fehler zeigt er die Zeile und die Stelle an, zum Beispiel „tasks[2].reward: 5, 10 oder 15“. Die Datei korrigieren und erneut hochladen.

5. Nach dem Lauf erscheinen die Aufgaben in der Aufgabentafel der Schüler.

Ergebnisse sieht man im Lehrer-Bereich unter **Aufgaben-Statistik**: Zu jeder Aufgabe steht, wie viele Antworten es gab und wie hoch der Anteil richtiger Antworten ist.
