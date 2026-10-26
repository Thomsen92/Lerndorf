# Teil 1 – Daten & Server (für ChatGPT) – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Ziel:** Vier Daily Quests pro Tag, Wortbänke für Lückentexte, vorproduzierte Hördateien über Edge-TTS und eine ausbalancierte Wirtschaft – alles serverseitig bzw. in den Skripten, ohne die Oberfläche anzufassen.

**Architektur:** Fünf Arbeitspakete. D1 erweitert das Quest-Format auf 4 Slots und macht das XP-Tagesziel dynamisch. D2 reicht eine optionale Wortbank (`bank`) an die Questdaten durch. D3 baut die Edge-TTS-Pipeline (gemeinsames Pfadmodul, Generator, Import-Prüfung). D4 justiert Truhen, Stempel und Preise. D5 schreibt die Server-Doku.

**Tech Stack:** Postgres/Supabase (Migrationen 0024–0025), Node 24 (Skripte, TypeScript direkt), Vitest, PGlite für SQL-Tests, edge-tts 7.3.

## Besitz und Grenzen

**Diese Person ändert ausschließlich:**
- `supabase/migrations/0024_four_daily_quests.sql`, `0025_economy_balance.sql`
- `web/scripts/quests.ts`, `web/scripts/import-quests.ts`
- `web/scripts/listening.ts` → **neu**, `web/scripts/generate-listening.ts` → **neu**, `web/stimmen.cmd` → **neu**
- `web/src/quests/listening.ts` → **neu** (Pfadmodul, von der Oberfläche mitbenutzt)
- `web/tests/content/**`, `web/tests/sql/**`, `web/tests/quests/listening.test.ts`
- `content/daily-quests/FORMAT.md`, `docs/SPEC.md` **nur §9 und §12**

**Nicht anfassen:** `web/src/ui/**`, `web/src/mascot/**`, `web/src/render/**`, `web/src/style.css`, `docs/SPEC.md` §8a/§11a, `docs/PLAN.md`, `docs/ANLEITUNG_LEHRKRAFT.md`. Diese gehören Teil 2. Wer zuerst fertig ist, rebased vor dem Merge auf den anderen.

**Migrationsnummern:** 0023 ist für den Avatar-Kleiderschrank reserviert (unfertige Arbeit im Arbeitsordner). Hier: **0024** (Quests), **0025** (Wirtschaft).

## Gemeinsame Schnittstelle (beide Teile halten sich daran)

```ts
// web/src/quests/listening.ts  – von Skripten UND Oberfläche importiert
export const LISTENING_VOICE = 'en-GB-SoniaNeural';
export const LISTENING_RATE = '-10%';
/** Dateipfad relativ zu web/public, z. B. assets/listening/1a2b3c4d.mp3 */
export function listeningPath(text: string, voice?: string, rate?: string): string;
```

- Es gibt **kein** `data.audio`-Feld. Die Oberfläche rechnet den Pfad aus `data.speak` mit derselben Funktion.
- Lückentext: `data.bank?: string[]` (2–6 Wörter). Fehlt `bank`, zeigt die Oberfläche die Tastatur.
- Ein Tag hat **3 oder 4** Quests; `slot` ist 1–4. Alte Wochen mit 3 bleiben gültig.

---

### Aufgabe D1: Vier Quests pro Tag

**Dateien:**
- Neu: `supabase/migrations/0024_four_daily_quests.sql`
- Ändern: `web/scripts/quests.ts` (Validierung, `QuestRow.slot`)
- Ändern: `content/daily-quests/FORMAT.md`, `docs/SPEC.md` (§9, §12)
- Test: `web/tests/content/quests.test.ts`, `web/tests/sql/daily-quests.test.ts`, `web/tests/sql/xp-sources.test.ts`

- [x] **Schritt 1: Test schreiben**

```ts
it('accepts three and four quests, rejects five', () => {
  expect(validatePackage(weekWith(3))).toEqual([]);
  expect(validatePackage(weekWith(4))).toEqual([]);
  expect(validatePackage(weekWith(5))).not.toEqual([]);
});
```

- [x] **Schritt 2: Fehlschlag sehen**

`cd web && npx vitest run tests/content/quests.test.ts` → FAIL (vier wird abgelehnt).

- [x] **Schritt 3: Umsetzen**

In `validatePackage` (heute `web/scripts/quests.ts:152`):

```ts
if (!Array.isArray(day.quests) || day.quests.length < 3 || day.quests.length > 4) {
  errors.push(`${dayWhere}.quests: 3 bis 4 Aufgaben`);
  return;
}
```

In `QuestRow` (heute `slot: 1 | 2 | 3`) und in `packageToRows` (`slot: (index + 1) as 1 | 2 | 3`) auf `1 | 2 | 3 | 4` erweitern.

- [x] **Schritt 4: Migration schreiben**

```sql
-- 0024_four_daily_quests.sql
alter table daily_quests drop constraint if exists daily_quests_slot_check;
alter table daily_quests add constraint daily_quests_slot_check check (slot between 1 and 4);

-- Das Tagesziel feuert ab jetzt, wenn alle aktiven Quests des Tages gelöst sind –
-- egal ob es drei oder vier sind. Rumpf von submit_quest_answer aus 0020_xp_levels.sql:150-225
-- übernehmen und NUR den Block "if (select count(*) ... )=3" ersetzen:
create or replace function public.submit_quest_answer(p_key text, p_answer jsonb) returns jsonb
 language plpgsql security definer set search_path=public as $$
 declare … ;  -- unverändert aus 0020
 begin
  …
  if (select count(*) from daily_quests where day = v_today and active) > 0
   and (select count(*) from daily_quests where day = v_today and active)
     = (select count(*) from daily_quest_results r
          join daily_quests q on q.key = r.quest_key
         where q.day = v_today and q.active
           and r.player_id = v_uid and r.solved_at is not null) then
    perform grant_xp(v_uid, xp_rule('day_goal'), 'day_goal', v_today::text);
  end if;
  …
 end $$;
```

- [x] **Schritt 5: SQL-Test ergänzen**

In `web/tests/sql/xp-sources.test.ts`: eine Woche mit 4 Quests importieren, alle 4 lösen, prüfen, dass `day_goal` genau einmal mit 15 XP gebucht ist; mit 3 Quests ebenso.

- [x] **Schritt 6: Tests und Commit**

```bash
cd web && npx vitest run tests/content/quests.test.ts tests/sql
git add supabase/migrations/0024_four_daily_quests.sql web/scripts/quests.ts content/daily-quests/FORMAT.md docs/SPEC.md web/tests
git commit -m "feat(quests): four daily quests per day"
```

### Aufgabe D2: Wortbank für Lückentexte

**Dateien:**
- Ändern: `web/scripts/quests.ts` (`QuestSpec`, Validierung, `packageToRows`)
- Ändern: `content/daily-quests/FORMAT.md`
- Test: `web/tests/content/quests.test.ts`

- [x] **Schritt 1: Test schreiben**

```ts
it('passes an optional word bank through, without touching the solution', () => {
  const pkg = weekWithGap({ bank: ['egg', 'milk', 'bread'], solution: ['egg'] });
  expect(validatePackage(pkg)).toEqual([]);
  const { quests } = packageToRows(pkg);
  const gap = quests.find((q) => q.type === 'gap')!;
  expect(gap.data.bank).toEqual(['egg', 'milk', 'bread']);
  expect(JSON.stringify(gap.data)).not.toContain('solution');
});
```

- [x] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/content/quests.test.ts` → FAIL.

- [x] **Schritt 3: Umsetzen**

`QuestSpec`: `bank?: string[]`. In `validateTypeFields` für `gap` (und `listening` mit `mode: 'gap'`):

```ts
if (q.bank !== undefined && (!isStrList(q.bank, 2, 6) || new Set(q.bank).size !== q.bank.length)) {
  errors.push(`${where}.bank: 2 bis 6 verschiedene Wörter`);
}
```

In `packageToRows`:

```ts
case 'gap':
  data = q.bank ? { bank: q.bank } : {};
  solution = q.solution;
  break;
// listening:
data = { speak: q.speak, mode: q.mode };
if (q.mode === 'choice') data.options = q.options;
if (q.mode === 'gap' && q.bank) data.bank = q.bank;
```

- [x] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/content/quests.test.ts
git add web/scripts/quests.ts content/daily-quests/FORMAT.md web/tests/content/quests.test.ts
git commit -m "feat(quests): optional word bank for gap tasks"
```

### Aufgabe D3: Hören mit Edge-TTS

**Dateien:**
- Neu: `web/src/quests/listening.ts` (Pfadmodul), `web/scripts/generate-listening.ts`, `web/stimmen.cmd`
- Ändern: `web/scripts/import-quests.ts`
- Test: `web/tests/quests/listening.test.ts`, `web/tests/content/import-quests.test.ts`

- [x] **Schritt 1: Test schreiben**

```ts
it('derives a stable file name from text, voice and rate', () => {
  expect(listeningPath('Hello!')).toBe(listeningPath('Hello!'));
  expect(listeningPath('Hello!')).not.toBe(listeningPath('Hello?'));
  expect(listeningPath('Hello!')).toMatch(/^assets\/listening\/[0-9a-f]{8}\.mp3$/);
});
```

- [x] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/quests/listening.test.ts` → FAIL.

- [x] **Schritt 3: Pfadmodul schreiben**

```ts
export const LISTENING_VOICE = 'en-GB-SoniaNeural';
export const LISTENING_RATE = '-10%';

export function listeningPath(text: string, voice = LISTENING_VOICE, rate = LISTENING_RATE): string {
  const input = `${voice}|${rate}|${text}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `assets/listening/${h.toString(16).padStart(8, '0')}.mp3`;
}
```

- [x] **Schritt 4: Generator schreiben**

`web/scripts/generate-listening.ts`:

```ts
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listeningPath } from '../src/quests/listening.ts';

const weeks = new URL('../../content/daily-quests/', import.meta.url);
const out = new URL('../public/assets/listening/', import.meta.url);
mkdirSync(out, { recursive: true });

const texts = new Set<string>();
for (const file of readdirSync(weeks).filter((f) => f.endsWith('.json'))) {
  const pkg = JSON.parse(readFileSync(new URL(file, weeks), 'utf8'));
  for (const day of pkg.days ?? []) for (const q of day.quests ?? []) if (q.type === 'listening') texts.add(q.speak);
}

let created = 0, skipped = 0;
for (const text of texts) {
  const path = listeningPath(text);
  const file = new URL(path.replace('assets/listening/', ''), out);
  if (existsSync(file)) { skipped++; continue; }
  const r = spawnSync('edge-tts', ['--voice', 'en-GB-SoniaNeural', '--rate=-10%', '--text', text, '--write-media', fileURLToPath(file)], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`edge-tts fehlgeschlagen für: ${text.slice(0, 40)}…`);
  created++;
}
console.log(`Stimmen: ${created} neu, ${skipped} vorhanden.`);
```

`web/stimmen.cmd`:

```bat
@echo off
cd /d "%~dp0"
node scripts/generate-listening.ts
pause
```

- [x] **Schritt 5: Import prüfen**

In `web/scripts/import-quests.ts` nach `packageToRows` jede Hör-Aufgabe prüfen:

```ts
const missing = quests
  .filter((q) => q.type === 'listening')
  .map((q) => listeningPath(String(q.data.speak)))
  .filter((p) => !existsSync(new URL(`../public/${p}`, import.meta.url)));
if (missing.length > 0) {
  await fail([`Hörtext ohne Audiodatei: ${missing.join(', ')}. Bitte „Stimmen erzeugen.cmd“ ausführen.`]);
  continue;
}
```

- [x] **Schritt 6: Test und Commit**

```bash
cd web && npx vitest run tests/quests/listening.test.ts tests/content/import-quests.test.ts
git add web/src/quests/listening.ts web/scripts/generate-listening.ts web/stimmen.cmd web/scripts/import-quests.ts web/tests
git commit -m "feat(quests): edge-tts listening pipeline"
```

### Aufgabe D4: Wirtschaft

**Dateien:**
- Neu: `supabase/migrations/0025_economy_balance.sql`
- Test: `web/tests/sql/xp-levels.test.ts`, neu `web/tests/sql/economy.test.ts`

- [x] **Schritt 1: Test schreiben**

```ts
it('pays smaller level chests, dearer houses and a cheaper stamp', async () => {
  expect(await chestCoins({ level: 2, size: 'normal' })).toBeLessThan(30);
  expect(await price('house_villa')).toBe(1000);
  expect(await price('house_landhaus')).toBe(600);
  expect(await stampReward()).toBe(50);
  expect(await shopVisible('acc_04')).toBe(false);
});
```

- [x] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/sql/economy.test.ts` → FAIL.

- [x] **Schritt 3: Migration schreiben**

```sql
alter table classes alter column stamp_reward set default 50;
update classes set stamp_reward = 50 where stamp_reward = 100;
update items set price = 600  where id = 'house_landhaus';
update items set price = 1000 where id = 'house_villa';
update items set price = 350  where id = 'car_kleinwagen';
update items set price = 600  where id = 'car_camper';
update items set shop_visible = false where id = 'acc_04';

-- open_chest aus 0020_xp_levels.sql:417-436 übernehmen, NUR die Münzzeile ändern:
--   vorher: c.coins := (20 + 5 * v_level) * (case when c.size = 'big' then 3 else 1 end) * v_factor;
--   nachher:
c.coins := (10 + 3 * v_level) * (case when c.size = 'big' then 3 else 1 end) * v_factor;
```

- [x] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/sql
git add supabase/migrations/0025_economy_balance.sql web/tests/sql
git commit -m "feat(economy): smaller chests, dearer houses, cheaper stamp"
```

### Aufgabe D5: Server-Doku

- [x] `docs/SPEC.md` §9/§12: 3–4 Quests, Truhenformel `(10 + 3 × Level)`, Stempel 50, Preise (Haus 600/1.000, Auto 350/600), Preis-Politik für neue Ware: Garten-Deko 15–60, besondere Deko 80–120, Avatar 30–120, Haus/Auto 600–1.000.
- [x] `content/daily-quests/FORMAT.md`: 3–4 Quests, `bank`, „Stimmen erzeugen“.
- [x] Commit `docs: quest count, word banks and economy`.

## Übergabe an Teil 2 (Oberfläche)

Am Ende melden:

1. Branch und Commit-Hashes.
2. Ob `listeningPath` wie vereinbart exportiert ist.
3. Die Pfade der erzeugten Hördateien (Beispiel).
4. Ob Migrationen lokal gegen PGlite grün sind.

Teil 2 braucht nur diese drei Dinge: `listeningPath`, `data.bank`, `slot` 1–4. Alles andere ist unabhängig.


## Umsetzungsstand 26.10.2026

D1–D5 umgesetzt auf `codex/quest-data-server`, sequenziell durch einen Agenten. Die parallel bearbeiteten Oberflächen-/Sir-Byte-Dateien wurden nicht verändert oder in diese Commits aufgenommen. Keine Live-Migration, kein Push, kein Deployment.

- D1 `d0debd2`: Slot 1–4, Prüfer akzeptiert 3/4; Tagesziel nach allen aktiven heutigen Quests, weiterhin einmalig. Neue SQL-Prüfung importiert eine vollständige 28-Quest-Woche über `import_quest_week`, liest vier öffentliche Aufgaben und prüft die Trennung der Lösungen.
- D2 `cca279b`: optionale Wortbanken für normale und Hör-Lückentexte, 2–6 verschiedene Wörter, Lösungen unverändert privat.
- D3 `06fb297`: gemeinsames `listeningPath(text, voice?, rate?)`, Generator, `stimmen.cmd`, Importprüfung vor dem Schreib-RPC. Zehn echte MP3s mit Edge-TTS 7.3.1 / `en-GB-SoniaNeural` / `-10%` erzeugt; der Tutorial-Hörtext aus 0021 ist zusätzlich enthalten. Zweiter Generatorlauf: 0 neu, 10 vorhanden. Fehlgeschlagene Erzeugungen hinterlassen keine fertige Datei.
- D4 `6ef0838`: Migration 0025 ändert nur künftige Stempel-/Truhenauszahlungen und Käufe. Historische Guthaben, Besitz und geöffnete Truhen bleiben erhalten; individuelle Stempelregeln außer bisherigem 100er-Standard bleiben bestehen. Stempel-XP bleiben 100.
- D5: `docs/SPEC.md` ausschließlich §9/§12 und `content/daily-quests/FORMAT.md` aktualisiert. Die neuen Werte ersetzen ausdrücklich die älteren Angaben in den hier nicht bearbeiteten Abschnitten §8b/§14.

Nachweise: 918 Tests in 132 Dateien erfolgreich, vollständiger Produktionsbuild und abschließende Typprüfung erfolgreich, ESLint für alle Dateien von Teil 1 erfolgreich. Inhalts-/SQL-Prüfungen umfassen Größen-/Formaterkennung der realen MP3s, fehlende/leere Dateien, Import ohne Beschädigung einer vorhandenen Woche, 3/4-Quest-Tagesziel, Privilegien, Buchungs-Idempotenz und alte Besitzstände. Der größere Haupt-JavaScript-Chunk meldet weiterhin die bekannte Vite-Größenwarnung.

### Übergabe an Teil 2

- `web/src/quests/listening.ts` exportiert die vereinbarte synchrone, browserfähige Funktion und die beiden Konstanten. Keine `data.audio`-Eigenschaft.
- Wortbank: `data.bank?: string[]`; Slots intern 1–4, Tageslisten 3 oder 4. Bestehende Wochen werden nicht automatisch um zusätzliche Fragen ergänzt.
- MP3-Verzeichnis: `web/public/assets/listening/`; Beispiele: `assets/listening/0abd5435.mp3`, `assets/listening/0cab1adc.mp3`. Der genaue Pfad für jeden Text kommt aus `listeningPath`.
- Die Wortkachel-/Audio-Wiedergabe ist Aufgabe U6/U7 des anderen Teils. Änderungen dort dürfen dieses Pfadmodul nicht kopieren oder neu hashen. Auch Zähler/Profilpunkte müssen vier Aufgaben abbilden.
- Veröffentlichung: zuerst Migrationen bereitstellen und Hördateien auf Cloudflare veröffentlichen, danach neue Wochen importieren. Eine lokale Audiodatei beweist kein abgeschlossenes Cloudflare-Deployment. Nicht die parallel bearbeiteten UI-Dateien ungeprüft mit veröffentlichen.
