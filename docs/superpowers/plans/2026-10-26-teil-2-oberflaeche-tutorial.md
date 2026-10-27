# Teil 2 – Oberfläche, Tutorial, Maskottchen (für Claude) – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Ziel:** Sir Byte wirkt am Markt präsenter, das Tutorial spricht durchgehend Englisch und endet an der Aufgabentafel, die Daily Quests lassen sich auf dem Tablet mit großen Kacheln bedienen, und jede Münzbelohnung ploppt und klingt.

**Architektur:** Acht Pakete, alle nur in `web/src/**` und den zugehörigen UI-Tests. Die Datenseite (vier Quests, Wortbank, Hördateien, Wirtschaft) liefert Teil 1; dieser Teil rechnet nur mit ihren Feldern.

**Tech Stack:** TypeScript strict, Vite, three.js 0.170, Vitest, Playwright, Web Animations API, Web Audio.

## Besitz und Grenzen

**Diese Person ändert ausschließlich:**
- `web/src/mascot/**`, `web/src/ui/**`, `web/src/render/tutorialFraming.ts`, `web/src/style.css`
- `web/tests/mascot/**`, `web/tests/ui/**`, `web/tests/render/tutorialFraming.test.ts`
- `docs/SPEC.md` **nur §8a und §11a**, `docs/SCOPE.md`, `docs/PLAN.md`, `docs/ANLEITUNG_LEHRKRAFT.md`
- `docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md`

**Nicht anfassen:** `supabase/migrations/**`, `web/scripts/**`, `web/src/quests/listening.ts`, `content/daily-quests/**`, `web/tests/sql/**`. Das ist Teil 1.

**Git:** Der Agent führt **keine** schreibenden Git-Befehle aus – kein `add`, `commit`, `push`, kein Branchwechsel. Alle Commits macht der Auftraggeber. Die Commit-Schritte in den Aufgaben sind nur Vorschläge für ihn.

## Voraussetzungen aus Teil 1

| Was | Wo | Wird gebraucht von |
|---|---|---|
| `listeningPath(text): string` | `web/src/quests/listening.ts` | U7 |
| `data.bank?: string[]` | Questdaten | U6 |
| `slot` 1–4, 3–4 Quests pro Tag | DB/Prüfer | keine UI-Änderung nötig (Listen sind dynamisch) |

Fehlt eines davon, funktionieren U1–U5 trotzdem; U7 erst nach Teil 1 mergen.

## Nachtrag 26.10.2026 – Spielsprache

Seit der Sprachumstellung (`docs/PLAYER_LANGUAGES.md`) ist die Spieleroberfläche **standardmäßig Englisch**; Deutsch ist in den Einstellungen wählbar. Quelltexte bleiben deutsch und laufen über `tr()`, `msg` und `html` aus `web/src/i18n.ts`; die englischen Texte stehen in `web/src/i18n/en.ts`.

Folgen für diesen Plan:

- `bubble.ask` nutzt bereits `tr('Weiter')` – nicht wieder hart „Weiter“ einsetzen.
- Neue sichtbare Texte immer über `tr()` bzw. `html`; deutsche Quelle schreiben, englische Übersetzung in `en.ts` ergänzen.
- `SAD_TEXT`, `FINAL_TEXT`, `QUIZ_INTRO` sind bereits übersetzt; B3/B4 ändern die **Quelltexte und die `en.ts`-Einträge**, nicht nur eine Sprache.
- Tests, die deutsche Texte prüfen, setzen vorher `setLocale('de')`; ein zusätzlicher Test prüft den englischen Standard.
- Aufgabeninhalte und Sir Bytes Sätze bleiben unverändert – die Audios werden nicht übersetzt.

## Vorgaben

- `web/src/mascot/vendor/` bleibt unverändert; alles in `mascot/sirByte.ts`.
- Keine neue Abhängigkeit.
- Spielertexte über `tr()` (Englisch als Standard, Deutsch als Quelle), Sir Bytes Sätze und Aufgaben bleiben englischer Inhalt.
- Nach jedem Paket: Tests, Build, ESLint. Bei Optik: `npm run galerie` und Bilder ansehen.
- Keine Münzen/Platzierungen direkt schreiben; nur die vorhandenen RPCs.

---

### Aufgabe U1: Sir Byte – Material, Platz, Kamera

**Dateien:**
- Ändern: `web/src/mascot/sirByte.ts`, `web/src/mascot/marketByte.ts`, `web/src/ui/villageView.ts`
- Test: `web/tests/mascot/mascot.test.ts`, `web/tests/mascot/market.test.ts`, `web/tests/ui/villageTutorial.test.ts`

**Schnittstellen:**
- `createMascot({ voice, quality?, lift? })` – `lift` überlebt `setQuality()`.
- `marketPose(layout)` – 3,5 m seitlich, 1,0 m zum Platz (Achtung: großer Wert auf der Seitenachse `(-cos, +sin)`).
- `flyMarket(reduced)` – 5,5 m Abstand, Höhe `+2,6`, Ziel `+1,35`.

- [ ] **Schritt 1: Drei Tests schreiben**

```ts
// mascot.test.ts
it('lifts materials only when asked', () => {
  const plain = createMascot({ voice: fakeVoice(), quality: 'low' });
  const lifted = createMascot({ voice: fakeVoice(), quality: 'low', lift: true });
  const sum = (m: ReturnType<typeof createMascot>) => {
    let n = 0, emissive = 0;
    m.root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        n += o.material.color.r + o.material.color.g + o.material.color.b;
        emissive += o.material.emissive.r;
      }
    });
    return { n, emissive };
  };
  expect(sum(lifted).n).toBeGreaterThan(sum(plain).n * 1.05);
  expect(sum(lifted).emissive).toBeGreaterThan(0);
  expect(sum(plain).emissive).toBe(0);
});

// market.test.ts
it('stands further from the board and closer to the plaza', () => {
  const layout = layoutFixture();
  const { position } = marketPose(layout);
  const dx = position.x - layout.board.x, dz = position.z - layout.board.z;
  const face = Math.atan2(layout.plaza.x - layout.board.x, layout.plaza.z - layout.board.z);
  expect(dx * Math.sin(face) + dz * Math.cos(face)).toBeCloseTo(1.0, 1);
  expect(-dx * Math.cos(face) + dz * Math.sin(face)).toBeCloseTo(3.5, 1);
});

// villageTutorial.test.ts
it('frames Sir Byte from 5.5 m', async () => {
  const v = await tutorialVillageFixture();
  await v.flyMarket(false);
  const p = cameraPose(), b = bytePosition();
  expect(Math.hypot(p.position.x - b.x, p.position.z - b.z)).toBeCloseTo(5.5, 0);
});
```

- [ ] **Schritt 2: Fehlschläge sehen**

`cd web && npx vitest run tests/mascot tests/ui/villageTutorial.test.ts` → drei FAIL.

- [ ] **Schritt 3: Umsetzen**

Material (nur Markt): in `createMascot` das Flag merken und beim Materialaufbau anwenden:

```ts
const brighten = (m: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial => {
  const copy = m.clone();
  copy.color.multiplyScalar(1.12);
  copy.emissive.copy(copy.color).multiplyScalar(0.1);
  lifted.add(copy);
  return copy;
};
```

`marketByte.ts`: `createMascot({ voice, quality: 'low', lift: true })` – **nicht** in `mascotStage.ts`.

Platz: `3.0` → `3.5`, `0.6` → `1.0`.
Kamera: `7` → `5.5`, `3.2` → `2.6`, Ziel `1.2` → `1.35`.

- [ ] **Schritt 4: Tests, Build, Galerie**

```bash
cd web && npx vitest run tests/mascot tests/ui/villageTutorial.test.ts && npm run build && npm run galerie
```

Bilder in `web/test-results/layout-byte/` ansehen: Sir Byte neben der Tafel, nicht davor, Umriss klar.

- [ ] **Schritt 5: Commit**

```bash
git add web/src/mascot web/src/ui/villageView.ts web/tests/mascot web/tests/ui/villageTutorial.test.ts
git commit -m "feat(mascot): brighter and better framed at the market"
```

### Aufgabe U2: Alle Sätze mit Stimme

**Dateien:**
- Ändern: `web/src/mascot/lines.ts`, `sirByte.ts`, `voice.ts`, `marketByte.ts`, `mascotStage.ts`
- Test: `web/tests/mascot/mascot.test.ts`, `web/tests/mascot/voice.test.ts`

**Schnittstellen:**
- `CLIPS: Partial<Record<LineKey, string>>`
- `VoicePlayer.playFile(file: string): Promise<number | null>`
- `Mascot.say(key: LineKey): Promise<Say>`

- [ ] **Schritt 1: Test schreiben**

```ts
it('speaks a tutorial line and reports its real length', async () => {
  const played: string[] = [];
  const mascot = createMascot({ voice: fakeVoice(played), quality: 'low' });
  const say = await mascot.say('hello');
  expect(played).toEqual(['hello']);
  expect(say).toMatchObject({ text: LINES.hello, voiced: true });
  expect(say.seconds).toBeGreaterThan(1.5);
});

it('ships every tutorial clip', () => {
  for (const file of new Set(Object.values(CLIPS))) {
    const size = statSync(new URL(`../../public/assets/sir-byte/voice/${file}.mp3`, import.meta.url)).size;
    expect(size).toBeGreaterThan(5_000);
    expect(size).toBeLessThan(120_000);
  }
});
```

- [ ] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/mascot` → FAIL.

- [ ] **Schritt 3: Umsetzen**

```ts
export const CLIPS: Partial<Record<LineKey, string>> = {
  hello: 'hello', ruin: 'ruin', quests: 'quests', coins: 'coins', quiz: 'quiz',
  buy: 'buy', place: 'place', final: 'final', board: 'board',
  catchUp: 'catch-up', allDone: 'all-done', allDoneMarket: 'all-done-market',
};
```

`voice.ts`: `play` zu `playFile(file)` umbauen; `play(reaction)` ruft `playFile(VOICE[reaction].file)`.
`sirByte.ts`: `say` async, spielt `CLIPS[key]` (falls vorhanden), baut `Say` mit echter Länge.
Aufrufer in `marketByte.ts` und `mascotStage.ts` anpassen.

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/mascot
git add web/src/mascot web/tests/mascot
git commit -m "feat(mascot): voice every tutorial line"
```

### Aufgabe U3: Blase = gesprochener Satz, englische Figurzeile

**Dateien:**
- Ändern: `web/src/mascot/bubble.ts`, `marketByte.ts`, `web/src/ui/tutorial/messages.ts`, `flow.ts`, `quizView.ts`
- Test: `web/tests/ui/tutorialFlow.test.ts`, `web/tests/ui/tutorialQuiz.test.ts`

- [ ] **Schritt 1: Tests schreiben**

```ts
it('shows the spoken sentence and stops the voice on Weiter', async () => {
  const { guide, voice } = guideFixture();
  const next = guide.ask('ruin');
  await Promise.resolve();
  expect(bubbleText()).toBe(LINES.ruin);
  clickWeiter();
  await next;
  expect(voice.stopped).toBe(true);
});

it('lets the pupil speak English and never shows two bubbles', async () => {
  const flow = flowFixture();
  await flow.runIntro();
  expect(shownTexts()).toContain('Oh no! My house is a ruin.');
  expect(shownBubbles().length).toBeLessThanOrEqual(1);
});
```

- [ ] **Schritt 2: Fehlschläge sehen:** `cd web && npx vitest run tests/ui/tutorialFlow.test.ts` → FAIL.

- [ ] **Schritt 3: Umsetzen**

`ask(key)`: `await mascot.say(key)` → `bubble.ask(say.text)`; beim Auflösen `mascot.stopVoice()`.
`SAD_TEXT = 'Oh no! My house is a ruin.'`; `FINAL_TEXT = "Now let's do our Daily Quests!"`.
`flow.ts`: Trauerblase nach 1,5 s ausblenden, bevor `guide.ask('ruin')` beginnt.
`quizView.ts`: `QUIZ_INTRO` und den deutschen Merksatz entfernen.

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/ui/tutorialFlow.test.ts tests/ui/tutorialQuiz.test.ts
git add web/src/mascot/bubble.ts web/src/mascot/marketByte.ts web/src/ui/tutorial web/tests/ui
git commit -m "feat(tutorial): English lines, one bubble, no duplicate intro"
```

### Aufgabe U4: Comic-Wisch – Einstieg und Ende

**Dateien:**
- Neu: `web/src/ui/comicWipe.ts`, `web/src/ui/comicWipe.css`
- Ändern: `web/src/ui/villageView.ts`, `web/src/ui/tutorial/flow.ts`, `web/src/mascot/marketByte.ts`
- Test: `web/tests/ui/comicWipe.test.ts`, `web/tests/ui/tutorialFlow.test.ts`

**Schnittstellen:**
- `runComicWipe(onCovered: () => void, reduced: boolean): Promise<void>`
- `TutorialVillage.showPlot(reduced)`, `showMarketBoard(reduced)`, `zoomBoard(reduced)`
- `TutorialGuide.pointBoard(): void`

- [ ] **Schritt 1: Tests schreiben**

```ts
it('covers once, cleans up', async () => {
  const covered = vi.fn();
  const done = runComicWipe(covered, false);
  expect(document.querySelector('.comic-wipe')).not.toBeNull();
  await done;
  expect(covered).toHaveBeenCalledTimes(1);
  expect(document.querySelector('.comic-wipe')).toBeNull();
});

it('dances, walks to the board, then opens the quests', async () => {
  const flow = flowFixture();
  await flow.toEnd();
  expect(order()).toEqual(['dance', 'ask:final', 'marketBoard', 'pointBoard', 'ask:board', 'zoomBoard', 'quests']);
});
```

- [ ] **Schritt 2: Fehlschläge sehen:** `cd web && npx vitest run tests/ui/comicWipe.test.ts tests/ui/tutorialFlow.test.ts` → FAIL.

- [ ] **Schritt 3: Umsetzen**

CSS:

```css
.comic-wipe {
  position: fixed; inset: -20% -10%; z-index: 60; pointer-events: none;
  background: linear-gradient(100deg, transparent 0 18%, #fff 18% 55%, transparent 55%);
}
```

`runComicWipe`: Element anhängen, per Web Animations API in 0,7 s durchschieben, `setTimeout(onCovered, 320)`; bei `reduced` 0,32 s Aufblenden und `onCovered` sofort; am Ende entfernen.

`flow.ts` Einstieg: nach `ready` `village.showPlot(reduced())` statt `flyIntro`.
`flow.ts` Ende:

```ts
await ui.guard(guide.ask('final'));
await ui.guard(village.showMarketBoard(reduced()));
guide.pointBoard();
await ui.guard(guide.ask('board'));
await ui.guard(village.zoomBoard(reduced()));
```

`villageView.ts`: neue Methoden; `showPlot` setzt die Endpose hinter dem Wisch, `showMarketBoard` stellt Sir Byte an den Markt und rahmt Tafel + Figur, `zoomBoard` schiebt 0,4 s auf die Tafel.
`marketByte.ts`: `pointBoard()` zeigt mit dem Stock, ohne zu öffnen.

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/ui/comicWipe.test.ts tests/ui/tutorialFlow.test.ts tests/ui/villageTutorial.test.ts
git add web/src/ui/comicWipe.* web/src/ui/villageView.ts web/src/ui/tutorial/flow.ts web/src/mascot/marketByte.ts web/tests/ui
git commit -m "feat(tutorial): comic wipe in, board ending out"
```

### Aufgabe U5: Münzen ploppen und klingen

**Dateien:**
- Neu: `web/src/ui/coinBurst.ts`, `web/src/ui/coinBurst.css`
- Ändern: `web/src/ui/gameNav.ts`, `web/src/ui/tutorial/quizView.ts`, `web/src/ui/dailyQuestsView.ts`, `web/src/ui/chestControl.ts`
- Test: `web/tests/ui/coinBurst.test.ts`, `web/tests/ui/gameNav.test.ts`

**Schnittstellen:**
- `coinBurst({ from, to, amount, reduced, sound }): Promise<void>`
- `GameNav.setCoins(coins: number, animate?: boolean)`

- [ ] **Schritt 1: Test schreiben**

```ts
it('spawns coins, counts up and cleans up', async () => {
  const nav = mountNav({ coins: 10 });
  const done = coinBurst({ from: rect(0, 0, 10, 10), to: nav.coinTarget(), amount: 50, reduced: false });
  expect(document.querySelectorAll('.coin-burst-coin').length).toBeGreaterThan(8);
  await done;
  expect(nav.text()).toContain('60');
  expect(document.querySelector('.coin-burst-coin')).toBeNull();
});
```

- [ ] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/ui/coinBurst.test.ts` → FAIL.

- [ ] **Schritt 3: Umsetzen**

14 Münzen, 30–60 ms Versatz, drei Keyframes (Start, Bogen, Ziel) über `element.animate`; Ziel aus `to.getBoundingClientRect()`; beim ersten Auftreffen `setCoins(neu, true)` und `sound.play('coins')`; `+50` steigt auf und verblasst. Bei `reduced`: kein Flug, nur Zähler und Label.
Einbau: Quiz (`r.done`), Daily Quest (`res.value.correct`), Truhe (`openChest`).

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/ui/coinBurst.test.ts tests/ui/gameNav.test.ts
git add web/src/ui/coinBurst.* web/src/ui/gameNav.ts web/src/ui/tutorial/quizView.ts web/src/ui/dailyQuestsView.ts web/src/ui/chestControl.ts web/tests/ui
git commit -m "feat(ui): coin burst for every reward"
```

### Aufgabe U6: Tablet-Kacheln ohne Dropdown

**Dateien:**
- Ändern: `web/src/ui/answerForms.ts`, `web/src/style.css`, `web/src/ui/dailyQuestsView.ts`
- Test: `web/tests/ui/answerForms.test.ts`, `web/tests/ui/dailyQuests.test.ts`

- [ ] **Schritt 1: Test schreiben**

```ts
it('renders tiles instead of selects and radios', () => {
  const match = answerForm({ type: 'match', data: { left: ['dog'], right: ['Hund'] } }, emptyState(matchSpec));
  expect(match).not.toContain('<select');
  expect(match).toContain('data-pair-left');
  const gap = answerForm({ type: 'gap', data: { bank: ['egg', 'milk'] } }, { type: 'gap', text: '' });
  expect(gap).toContain('data-bank');
  expect(gap).not.toContain('<input');
});
```

- [ ] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/ui/answerForms.test.ts` → FAIL.

- [ ] **Schritt 3: Umsetzen**

- Auswahl: `<button class="answer-tile" role="radio" aria-checked>`; Klick setzt `state.picked`.
- Zuordnen: zwei Spalten `data-pair-left`/`data-pair-right`; links antippen (`is-armed`), rechts antippen → Paar; gematchtes Paar löst sich beim Antippen.
- Lücke: `bank` → Kacheln `data-bank`; ohne `bank` bleibt `<input>`.
- Reihenfolge: Chips mit Nummer, Chip antippen entfernt.
- CSS: 56 px Mindesthöhe, `touch-action: manipulation`, `:active { transform: scale(.97) }`, `.is-picked`, `.is-correct`, `.is-wrong`, `.shake`.
- „Prüfen“ erst aktiv bei `buildAnswer(state) !== null`.

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/ui/answerForms.test.ts tests/ui/dailyQuests.test.ts
git add web/src/ui/answerForms.ts web/src/style.css web/src/ui/dailyQuestsView.ts web/tests/ui
git commit -m "feat(quests): tablet answer tiles with pressed feedback"
```

### Aufgabe U7: Hördateien im Browser (nach Teil 1)

**Dateien:**
- Ändern: `web/src/ui/dailyQuestsView.ts`, `web/src/ui/tutorial/quizView.ts`
- Test: `web/tests/ui/dailyQuests.test.ts`

- [ ] **Schritt 1: Test schreiben**

```ts
it('plays the pre-generated clip and falls back to the text', async () => {
  const view = openQuest({ type: 'listening', data: { speak: 'Hello!', mode: 'choice', options: ['a'] } });
  clickListen();
  expect(audioSrc()).toBe(`/assets/listening/${listeningPath('Hello!').split('/').pop()}`);
  failAudio();
  expect(textFallback()).toContain('Hello!');
});
```

- [ ] **Schritt 2: Fehlschlag sehen:** `cd web && npx vitest run tests/ui/dailyQuests.test.ts` → FAIL.

- [ ] **Schritt 3: Umsetzen**

`<audio>` mit `src = import.meta.env.BASE_URL + listeningPath(String(data.speak))`; Knopf `▶ Anhören` startet es, `byte.listen()` stoppt Sir Byte; `error`-Ereignis blendet den Text ein. In `quizView` genauso; `speakEnglish` entfällt für Hör-Aufgaben.

- [ ] **Schritt 4: Test und Commit**

```bash
cd web && npx vitest run tests/ui/dailyQuests.test.ts tests/ui/tutorialQuiz.test.ts
git add web/src/ui/dailyQuestsView.ts web/src/ui/tutorial/quizView.ts web/tests/ui
git commit -m "feat(quests): play edge-tts clips in the browser"
```

### Aufgabe U8: Doku und Abschluss

- [ ] `docs/SPEC.md` §8a/§11a: Sprache, Comic-Wisch, Ende an der Tafel, Münzploppen.
- [ ] `docs/SCOPE.md`, `docs/PLAN.md`: neues Paket mit U1–U8 und Abnahmepunkten.
- [ ] `docs/ANLEITUNG_LEHRKRAFT.md`: Sir Byte spricht; Tutorial endet an der Tafel; Tablet-Bedienung.
- [ ] Tutorial-Spec: „drei Fragen“, Sprache, Wisch, Ende.
- [ ] `cd web && npm test && npm run build && npx eslint src tests`
- [ ] Playwright: `npx playwright test e2e/tutorial.spec.ts e2e/sir-byte.spec.ts`; Bilder ansehen (`test-results/tutorial/`, `test-results/sir-byte/`).
- [ ] Auf 1024×768 und 820×1180 prüfen: keine Blase über Buttons, Sir Byte nicht abgeschnitten.

## Abnahme durch die Lehrkraft

1. Am Markt: Sir Byte heller, steht neben der Tafel, Kamera näher.
2. Tutorial: jede Figur spricht Englisch, Wisch statt Fahrt, Ende an der Tafel mit Zoom.
3. Münzen ploppen bei Quiz, Quest und Truhe.
4. Daily Quest auf dem Tablet: eine Hand, große Kacheln, kein Dropdown, deutliches Feedback.
