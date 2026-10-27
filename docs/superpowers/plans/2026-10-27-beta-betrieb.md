# Plan: Sicherer Betrieb für die offene Beta (Stufe 1 und 2)

Stand 27.10.2026 · Stufe 1 umgesetzt (Branch `feature/beta-betrieb`), siehe §10 · Stufe 2 offen

**Ziel:** Echte Schüler spielen. Kein Update darf ihre Münzen, Häuser, XP oder Konten zerstören. Wenn doch etwas schiefgeht, ist der Stand von gestern in unter 30 Minuten zurück.

---

## 1. Kurz gesagt

**Heute** geht jeder Push nach `main` sofort live, für die Webseite und für die Datenbank:

```
Push nach main ──► Cloudflare baut die Seite ──► LIVE
              └──► migrate.yml ändert die Datenbank ──► LIVE (ohne Rückfrage, ohne Sicherung)
```

**Danach** landet alles zuerst in einer Test-Umgebung. Live geht es erst, wenn du auf einen Knopf drückst. Vorher wird immer eine Sicherung gemacht.

```
feature/…  ──►  main  ──►  TEST  (eigene Datenbank „Lerndorf-Test“, Vorschau-Adresse von main)
                  │
                  │  du klickst in GitHub „Release“ und dann „Approve“
                  ▼
            release.yml:  1. Sicherung der Live-Datenbank
                          2. Datenbank-Update live
                          3. Branch „production“ ← main
                                   │
                                   ▼
                     Cloudflare baut die Seite ──► LIVE (heutige Adresse)

jede Nacht:  backup.yml ──► verschlüsselte Sicherung (30 Tage aufbewahrt)
```

Für die Beta heißt das:

- Ein Push nach `main` ist ungefährlich. Er betrifft nur die Test-Umgebung, auch Pushes von DeepSeek, Codex oder Claude.
- Die Webseite und die Datenbank gehen **gemeinsam und in der richtigen Reihenfolge** live: erst die Datenbank, dann die Seite.
- Löschende Migrationen fallen schon im Test durch.

---

## 2. Ausgangslage (geprüft am 27.10.2026)

| Punkt | Befund |
|---|---|
| Supabase | Ein Projekt „Lerndorf“ (`ygopamapzhlwrpjzjunq`, eu-west-1), **Free-Plan**, Postgres 17, Stand Migration 0027, 7 Konten, 2 Klassen, 13 MB |
| Sicherungen | Der Free-Plan bietet **keine Sicherungen zum Zurückspielen**. Es gibt heute keine einzige Sicherung. |
| `migrate.yml` | `supabase db push` bei jedem Push auf `main` mit `supabase/**`, ohne Freigabe, ohne Sicherung, mit `setup-cli version: latest` (nicht festgelegt) |
| Cloudflare | **Worker mit statischen Dateien** (Workers Builds, nicht Pages; `web/wrangler.jsonc`), Projekt `lerndorf`, Production branch `main`, Deploy `npx wrangler deploy`, Build-Variablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`. Vorschau-Builds laufen im alten Modell **mit den Live-Einstellungen**, eine Branch-Vorschau würde also gegen die Live-Datenbank laufen. |
| Repository | `Thomsen92/Lerndorf` ist **öffentlich**. Logs und Artefakte von Actions kann jeder angemeldete GitHub-Nutzer sehen. |
| Schon passiert | `0013_plot_slots.sql:33` enthält `delete from placements;` und hat damals alle aufgestellten Gegenstände gelöscht. |
| Andere Workflows | `deploy.yml` (nur Tests), `import-content.yml` (Quests mit Service-Key nach LIVE), `keepalive.yml` (alle 3 Tage) |
| Login | Schüler melden sich mit Spitzname und Passwort an (`signInWithPassword`, E-Mail wird aus dem Spitznamen gebildet). Es gibt keine Redirect-URLs und keinen Supabase Storage. |

---

## 3. Entscheidungen (Vorschlag, bitte bestätigen oder ändern)

| Nr | Entscheidung | Standardwert |
|---|---|---|
| B-E1 | Wohin mit den Sicherungen? | **GitHub-Actions-Artefakte, verschlüsselt** (AES-256, Passwort nur bei dir). Kostenlos, keine weiteren Konten. |
| B-E2 | Wie lange aufbewahren? | Nächtliche Sicherung **30 Tage**, Sicherung vor einem Release **90 Tage** (Höchstwert bei GitHub). Einmal im Monat lädst du zusätzlich eine Sicherung auf deinen Rechner. |
| B-E3 | Wer gibt Releases frei? | Nur du (`Thomsen92`), als Pflicht-Prüfer in der GitHub-Umgebung `production`. |
| B-E4 | Wann darf ein Release laufen? | Nicht Mo–Fr 07:30–15:30 (Berlin), außer du setzt beim Start das Häkchen „trotzdem jetzt“. |
| B-E5 | Quests (`content/**`) | Gehen weiterhin **direkt** live und zusätzlich in die Test-Umgebung. Quests sind Inhalte, keine Spielerdaten, und werden geprüft. So musst du nicht jede Woche einen Release starten. |
| B-E6 | Test-Umgebung | Zweites kostenloses Supabase-Projekt „Lerndorf-Test“. Die Webseite dazu ist die Cloudflare-Vorschau (Worker Preview) von `main` mit eigener Adresse. Sie zeigt ein Band „TESTUMGEBUNG“ und wird nicht von Suchmaschinen erfasst. |
| B-E7 | Daten in der Test-Umgebung | Auf Knopfdruck eine Kopie der letzten Live-Sicherung. Dieselben Spitznamen und Passwörter funktionieren dort. Die Test-Umgebung wird am Schuljahresende gelöscht. |
| B-E8 | Zurück zur alten Version | Webseite: in Cloudflare „Rollback“ (1 Klick). Datenbank: Fehler werden mit einer neuen Migration behoben. Sicherungen spielen wir nur zurück, wenn Daten beschädigt sind. |

---

## 4. Stufe 1: bevor echte Schüler kommen

### B1 · Nächtliche Sicherung (`backup.yml`)

- Zeitplan: täglich 02:30 Berlin, außerdem von Hand startbar.
- Drei Dateien nach der Supabase-Anleitung „Backup and restore using the CLI“:
  ```bash
  supabase db dump --db-url "$SUPABASE_DB_URL" -f roles.sql  --role-only
  supabase db dump --db-url "$SUPABASE_DB_URL" -f schema.sql
  supabase db dump --db-url "$SUPABASE_DB_URL" -f data.sql   --use-copy --data-only
  ```
  Die Sicherung muss auch `auth.users`/`auth.identities` (die Konten) und `supabase_migrations.schema_migrations` (den Migrationsstand) enthalten. Wenn `--data-only` das nicht von selbst tut, kommen sie über `--schema` dazu. Das wird in B1 **nachgewiesen**, nicht angenommen.
- Danach packen (`tar.gz`), verschlüsseln (`gpg --batch --symmetric --cipher-algo AES256`, Passwort aus dem Secret `BACKUP_PASSPHRASE`) und als Artefakt `backup-JJJJ-MM-TT` hochladen. Unverschlüsselt bleibt nichts liegen.
- **Selbstprüfung jede Nacht:** Im selben Lauf wird die Sicherung in einen Wegwerf-Container `supabase/postgres:17.x` zurückgespielt. Dann werden Anzahlen verglichen: Konten, Klassen, Inventar, Münz-Buchungen, letzte Migration. Weicht etwas ab, wird der Lauf rot und GitHub schickt dir eine E-Mail.
- Logs: Es werden nur Anzahlen ausgegeben, nie Zeilen, Spitznamen oder Verbindungsdaten.
- Verbindung: GitHub-Runner können nur IPv4, die direkte Datenbankadresse von Supabase nur IPv6. Darum wird der **Session-Pooler** benutzt (`…pooler.supabase.com:5432`). Die Adresse steht als neues Secret `SUPABASE_DB_URL` bereit.
- **Abnahme:** Ein Lauf ist grün. Das Artefakt lässt sich mit dem Passwort öffnen. Die Anzahlen stimmen mit der Live-Datenbank überein (Stand heute 7 Konten, 2 Klassen).

### B2 · Migrations-Wächter (Test in `npm test`)

Ein Skript `web/scripts/check-migrations.ts` mit Vitest-Test, der in CI und lokal läuft:

1. **Eingespielte Migrationen sind eingefroren.** Die Datei `supabase/migrations.lock` enthält für 0001–0027 je eine SHA-256-Prüfsumme. Wer eine bereits eingespielte Datei ändert, bekommt einen roten Test. `db push` würde solche Änderungen still überspringen, und Test und Live würden auseinanderlaufen.
2. **Neue Migrationen dürfen nichts wegnehmen.** Diese Muster sind verboten: `drop table`, `drop column`, `drop schema`, `truncate`, `delete from …` ohne `where`, `alter column … type`, `alter table … rename`, `drop function`, wenn sie im selben File nicht neu angelegt wird.
3. Ausnahme nur mit einer Zeile `-- destructive-ok: <Grund>` in der Migration. Der Release zeigt diese Zeile dann vor der Freigabe groß an (B3).
4. Fortlaufende Nummern, keine Lücken, keine doppelten Nummern.

- **Abnahme:** Der Test fällt bei einer Probe-Migration mit `delete from placements;` durch und besteht ohne sie. Die alte `0013` löst keinen Alarm aus, weil sie eingefroren ist.

### B3 · Release mit Freigabe (`release.yml`, Branch `production`)

- Neuer Branch `production`. **Nur** `release.yml` schreibt dorthin. Branch-Schutz: kein direkter Push.
- In Cloudflare wird der **Production-Branch auf `production` umgestellt**. Ab dann geht ein Push nach `main` nicht mehr live.
- `release.yml` startest du von Hand („Run workflow“). Der Lauf hat die Umgebung `production` mit dir als Pflicht-Prüfer und macht nacheinander:
  1. Tests und Wächter (B2) auf dem Stand von `main`.
  2. Er zeigt an, was live geht: neue Migrationen seit dem letzten Release, alle `destructive-ok`-Zeilen und die Commit-Liste.
  3. **Wartet auf dein „Approve“.**
  4. Prüft das Zeitfenster (B-E4).
  5. **Sicherung** wie in B1, Aufbewahrung 90 Tage, Name `pre-release-<commit>`. Schlägt die Sicherung fehl, endet der Lauf hier.
  6. `supabase db push` und `functions deploy admin-accounts` auf LIVE, mit fest eingetragener CLI-Version.
  7. `production` wird auf den freigegebenen Commit vorgespult (`git push origin <sha>:production`, nur Fast-Forward). Danach baut Cloudflare die Seite.
- `migrate.yml` fällt weg. Seine Aufgabe übernimmt `release.yml` für LIVE und `migrate-test.yml` für TEST (T2).
- Die Secrets `SUPABASE_ACCESS_TOKEN` und `SUPABASE_DB_PASSWORD` für LIVE ziehen in die Umgebung `production`. Ohne deine Freigabe kann dann kein Ablauf die Live-Datenbank umbauen.
- **Bis T2 fertig ist:** Cloudflare-Vorschauen aus (Reiter „Previews Base“ → „Builds for Preview branches“ aus). Sonst laufen Branch-Vorschauen gegen die Live-Datenbank.
- **Abnahme:** Ein Push nach `main` mit einer Probe-Migration ändert LIVE nicht. Ein Release ohne „Approve“ tut nichts. Ein Release mit „Approve“ legt die Sicherung an, spielt die Migration ein, und die Live-Seite zeigt den neuen Stand.

### B4 · Notfall-Anleitung und Probe

- Neuer Abschnitt in `docs/ANLEITUNG_LEHRKRAFT.md`, Teil 3 „Notfälle“, in einfachen Schritten:
  - **N1 Seite kaputt, Daten in Ordnung:** In Cloudflare unter „Deployments“ die vorige Version auswählen und „Rollback“ klicken.
  - **N2 Ein Update hat Daten beschädigt:** Den Ablauf `restore.yml` mit dem Namen der `pre-release`-Sicherung starten und freigeben. Er spielt die Sicherung in die Datenbank zurück. Spielstände seit dieser Sicherung gehen verloren, darum vorher den Klassen Bescheid geben.
  - **N3 Live-Projekt ganz verloren:** Die Sicherung in das Test-Projekt einspielen und Cloudflare und die Secrets auf das Test-Projekt umstellen. Ausführlich mit Bildschirm-Beschreibungen.
- `restore.yml`: von Hand gestartet, Umgebung `production`, **macht vorher selbst eine Sicherung**. Dann wird `public`, `auth` und der Migrationsstand mit `session_replication_role = replica` in **einer** Transaktion zurückgespielt. Anschließend vergleicht der Ablauf die Anzahlen.
- **Probe:** Einmal N2 gegen die Test-Umgebung durchspielen (das geht erst nach T1). Bis dahin übernimmt die nächtliche Selbstprüfung aus B1 diese Rolle.
- **Abnahme:** Du hast die Anleitung gelesen und verstanden. Die Probe ist erfolgreich und im PLAN protokolliert.

### B5 · Was du in Stufe 1 selbst klicken musst (etwa 20 Minuten)

Die genaue Klick-Anleitung kommt mit der Umsetzung.

1. Supabase → Project Settings → Database → „Connect“ → **Session pooler**: Die Adresse kopieren und als Secret `SUPABASE_DB_URL` eintragen.
2. Ein langes Passwort ausdenken, in deinem Passwort-Manager speichern und als Secret `BACKUP_PASSPHRASE` eintragen. **Ohne dieses Passwort sind alle Sicherungen wertlos.**
3. GitHub → Settings → Environments → `production` anlegen → „Required reviewers“: dich eintragen.
4. Cloudflare → `lerndorf` → Settings → Builds → Reiter „Production“ → Production branch: `production` (erst mit B3). Reiter „Previews Base“ → „Builds for Preview branches“ **aus** (geht schon jetzt).
5. GitHub → Settings → Branches → Schutzregel für `production` anlegen.

---

## 5. Stufe 2: Test-Umgebung und weiche Updates

### T1 · Test-Projekt

- Neues Supabase-Projekt „Lerndorf-Test“ anlegen, Free-Plan, eu-west-1. Der Free-Plan erlaubt zwei Projekte, damit sind beide Plätze belegt.
- Neue Umgebung `test` in GitHub mit eigenen Secrets: `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_DB_URL`, `TEST_SUPABASE_DB_PASSWORD`, `TEST_SUPABASE_SERVICE_ROLE_KEY`. Die Namen sind **bewusst anders** als bei LIVE. So kann ein vergessenes `environment:` nie aus Versehen LIVE treffen.
- Ein Lehrer-Konto für die Test-Umgebung entsteht durch die Kopie (T3).
- **Abnahme:** `supabase db push` gegen das Test-Projekt spielt 0001–0027 sauber ein.

### T2 · `main` ist die Test-Umgebung

- `migrate-test.yml`: Bei einem Push auf `main` mit `supabase/**` werden Migrationen und die Edge Function ins **Test**-Projekt gespielt. Ohne Freigabe, es ist ja nur der Test.
- `import-content.yml` importiert Quests nach TEST und nach LIVE (B-E5).
- Cloudflare (Workers Builds): einmalig auf **Worker Previews** umstellen (Banner „Set up Worker Previews“; nicht umkehrbar, ab dann nutzen Vorschauen **eigene** Einstellungen statt der Live-Werte). Vorschau-Builds wieder an, aber nur für `main`, wenn Cloudflare das erlaubt. Sonst entsteht die Vorschau stattdessen über einen GitHub-Ablauf mit `wrangler preview` nur für `main`. Die Build-Variablen der Vorschau sind `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` des Test-Projekts und `VITE_ENV=test`. Ob Build-Variablen pro Vorschau getrennt einstellbar sind, wird in T2 geprüft. Falls nicht, baut der GitHub-Ablauf mit den Test-Werten.
- Bei `VITE_ENV=test` zeigt die Seite oben ein festes Band „TESTUMGEBUNG – nicht für den Unterricht“ und setzt `<meta name="robots" content="noindex">`.
- `keepalive.yml` weckt beide Projekte.
- **Abnahme:** Ein Push nach `main` erscheint unter der Vorschau-Adresse mit Band und Test-Datenbank. Die Live-Adresse bleibt unverändert.

### T3 · Live-Daten in die Test-Umgebung kopieren (`refresh-test.yml`)

- Startest du von Hand. Nimmt die letzte nächtliche Sicherung (oder macht eine neue), setzt das Test-Projekt zurück und spielt sie ein. Danach laufen die Migrationen von `main` darüber.
- Das ist gleichzeitig die **Generalprobe für jeden Release**: Laufen die neuen Migrationen fehlerfrei über echte Daten, laufen sie auch live fehlerfrei. Das gilt zum Beispiel für die Saison-Migrationen 0028–0032 mit der Nachberechnung der Truhen-Serie.
- Und es ist die **Probe für N2** aus B4.
- **Abnahme:** Nach dem Lauf stimmen die Anzahlen in TEST mit LIVE überein. Ein Schüler-Login aus LIVE funktioniert in TEST. Die Saison-Migrationen laufen über die Kopie ohne Fehler.

### T4 · Alte und neue Version vertragen sich

- **Regel für alle Migrationen** (im Wächter-Kommentar und in `CLAUDE.md`): Eine RPC-Funktion, die die Live-Seite benutzt, wird in einem Release nicht umbenannt, nicht gelöscht und bekommt keine neuen Pflicht-Parameter. Neue Parameter bekommen `default`. Ändert sich eine Funktion grundlegend, entsteht eine neue (`…_v2`), und die alte fällt frühestens einen Release später weg.
- **Versionshinweis im Spiel:** Der Build schreibt `version.json` mit der Commit-Kennung. Das Spiel prüft diese Datei beim Zurückkehren in den Tab und alle 15 Minuten. Ist sie neu, erscheint ein Hinweis „New version – tap to reload“ (DE: „Neue Version – tippen zum Neuladen“). Es lädt nie mitten in einer Aufgabe von selbst neu.
- **Abnahme:** Ein E2E-Test simuliert eine geänderte `version.json`, und der Hinweis erscheint. Der Wächter bemängelt ein `drop function` ohne Nachfolger.

### T5 · Dokumentation und Aufträge

- SPEC §17 „Deploy und Betrieb“ neu schreiben, ANLEITUNG Teil 1 (Schritt 6 und 7) und Teil 3 anpassen. Den Ablauf in `CLAUDE.md` kurz festhalten: „Push auf main = Test; live nur über Release“.
- Den DeepSeek-Auftrag anpassen: „nie nach main pushen“ wird zu „über main in die Test-Umgebung, live nur über Release durch die Lehrkraft“.

### T6 · Was du in Stufe 2 selbst klicken musst (etwa 25 Minuten)

1. Supabase → „New project“ → „Lerndorf-Test“, Region Irland. Das Datenbank-Passwort im Passwort-Manager speichern.
2. GitHub → Environments → `test` anlegen und die fünf `TEST_…`-Secrets eintragen.
3. Cloudflare → Builds → „Set up Worker Previews“ bestätigen, Vorschau-Builds für `main` an, die drei Preview-Variablen eintragen. Die genaue Klickfolge kommt mit T2.

---

## 6. Ablauf im Alltag (nach Stufe 2)

1. Neue Funktion fertig, Review bestanden → Merge nach `main`.
2. Automatisch: Tests laufen, und die Test-Umgebung bekommt Datenbank und Seite.
3. Bei Datenbank-Änderungen: `refresh-test` starten, damit die Migration über eine frische Kopie echter Daten läuft.
4. Du schaust auf die Vorschau-Adresse von `main` mit einem Schüler-Konto aus der Kopie und hakst die Prüfliste ab: Anmelden, Dorf, Quest lösen, Shop, Lehrerbereich.
5. Abends: Actions → Release → „Run workflow“ → „Approve“.
6. Am nächsten Morgen: Die Seite ist live. Notfall-Wege siehe B4.

---

## 7. Reihenfolge und Aufwand

| Schritt | Pakete | Wer | Ungefähre Dauer |
|---|---|---|---|
| 1 | B5 Punkte 1–2 (Secrets) | Lehrkraft | 10 min |
| 2 | B1, B2 | Claude | 1 Sitzung |
| 3 | B5 Punkte 3–5, B3 | Lehrkraft + Claude | 10 min + ½ Sitzung |
| 4 | T6, T1, T2 | Lehrkraft + Claude | 25 min + ½ Sitzung |
| 5 | T3, B4 (mit Probe), T4, T5 | Claude, Probe mit Lehrkraft | 1 Sitzung |

**Stufe 1 ist Pflicht vor dem ersten echten Schüler.** Stufe 2 sollte vor dem Saison-Release (0028–0032) stehen. Dann läuft die Saison zuerst über eine Kopie echter Daten. Weil die Saison-XP rückwirkend ab 28.10. zählen, schadet ein paar Tage späterer Start nichts.

Alles bleibt bei 0 €: GitHub Actions ist für öffentliche Repos kostenlos, Supabase läuft zweimal im Free-Plan, Cloudflare Workers im Free-Plan.

---

## 8. Risiken und Grenzen

| Risiko | Gegenmaßnahme |
|---|---|
| `BACKUP_PASSPHRASE` geht verloren | Im Passwort-Manager speichern und zusätzlich auf Papier in der Schule hinterlegen. Eine monatliche Sicherung auf dem eigenen Rechner ist ebenfalls verschlüsselt. |
| GitHub-Artefakte werden nach 30/90 Tagen gelöscht | Einmal im Monat eine Sicherung selbst herunterladen (Erinnerung in der ANLEITUNG). |
| Sicherung ist unbemerkt unbrauchbar | Die Selbstprüfung jede Nacht (B1) und die Generalprobe T3 vor jedem Release. |
| Öffentliches Repo: Logs sind lesbar | Keine Zeilen und keine Spitznamen in Logs, nur Anzahlen. Secrets maskiert GitHub. Artefakte nur verschlüsselt. |
| Free-Projekt schläft nach 7 Tagen ein | keepalive für beide Projekte, in den Ferien ebenso. |
| Spieler mit offenem Tab nutzt alte Seite | T4: RPC-Regel und Versionshinweis. |
| Release in der Unterrichtszeit | Zeitfenster-Sperre B-E4. |
| Migration läuft live anders als im Test | T3: Test mit Kopie echter Daten. Ein Release bricht ab, wenn die Sicherung fehlschlägt. `db push` läuft je Migration in einer Transaktion. |
| Quests gehen direkt live (B-E5) | Der Import prüft die Inhalte schon heute. Quests ändern keine Spielerdaten. |
| Test-Umgebung enthält echte Spitznamen | Dieselbe Art Daten wie LIVE (nur Spitznamen). Das Band „TESTUMGEBUNG“, `noindex`, Löschen am Schuljahresende. |

---

## 9. Offene Fragen an die Lehrkraft

1. Passen die Standardwerte B-E1 bis B-E8? Besonders das Zeitfenster (B-E4) und dass Quests direkt live gehen (B-E5).
2. Soll die Test-Adresse zusätzlich mit Cloudflare Access gesperrt werden (nur deine E-Mail)? Das ist kostenlos, braucht aber eventuell eine hinterlegte Zahlungsart bei Cloudflare. Ohne Sperre ist sie wie die Live-Seite nur mit Login nutzbar.
3. Gibt es von der Schule Vorgaben, wo Sicherungen mit Schülerspitznamen liegen dürfen? Zum Beispiel nur auf einem Dienstgerät.

---

## 10. Umsetzung Stufe 1 (27.10.2026)

| Paket | Datei | Abweichung vom Plan |
|---|---|---|
| B1 | `.github/workflows/backup.yml`, `.github/actions/db-backup/action.yml`, `.github/scripts/db_tools.py` | Die nächtliche Selbstprüfung spielt die Sicherung nicht in einen Container zurück (ein passendes Supabase-Postgres-Image ist im Runner nicht verlässlich verfügbar). Stattdessen vergleicht sie die Zeilenzahlen der Sicherung mit der Live-Datenbank und verlangt Konten, Profile und Klassen. Die echte Rückspiel-Probe ist `restore.yml` mit Ziel `test`. Der Migrationsstand wird nach der Supabase-Anleitung getrennt gesichert. |
| B2 | `web/scripts/check-migrations.ts`, `web/tests/sql/migration-guard.test.ts`, `supabase/migrations.lock` | Funktionskörper (`as $$ … $$`) prüft der Wächter nicht, weil sie erst beim Aufruf laufen; `do $$ … $$`-Blöcke prüft er. Zeilenenden zählen nicht (Windows/CI). |
| B3 | `.github/workflows/release.yml`; `migrate.yml` entfernt; `deploy.yml` ohne `paths-ignore` | Nach `db push` schreibt der Ablauf `migrations.lock` fort und committet sie nach `main`. `production` bekommt genau den freigegebenen Commit. Die Secrets `SUPABASE_ACCESS_TOKEN` und `SUPABASE_DB_PASSWORD` dürfen auf Repository-Ebene bleiben; die Freigabe hängt am Job, nicht am Secret. |
| B4 | `.github/workflows/restore.yml`, `docs/ANLEITUNG_LEHRKRAFT.md` Teil 3 | Ziel `test` spielt vorher die Migrationen von `main` ins Test-Projekt, damit ist ein Teil von T1/T3 schon da. Geleert und geladen werden genau die Tabellen der Sicherung; Storage und beide Migrationsverläufe (`supabase_migrations`, `auth.schema_migrations`) bleiben unberührt. |
| B5 | Anleitung Teil 3 „Einmal einrichten“ | Reihenfolge: erst ein Release (legt `production` an), dann Cloudflare umstellen, dann Ruleset. |

**Nicht lokal prüfbar:** Die Abläufe laufen nur auf GitHub. Lokal geprüft sind der Wächter (Tests), die Hilfsskripte an einer Probe-Sicherung und die YAML-Syntax. Der erste echte Lauf von `backup` und die Probe `restore` → `test` stehen aus (PLAN O B6).
