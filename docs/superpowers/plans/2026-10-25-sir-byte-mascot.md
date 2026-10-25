# Sir Byte – Maskottchen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Sir Byte robot butler from `Thomsen92/Sir-Byte` into Lerndorf as the mascot: he greets and guides pupils through the first-login tutorial with English speech bubbles, reacts to right and wrong answers in a small 3D window in the Daily Quests and the tutorial quiz, and floats next to the task board on the market plaza.

**Architecture:** The prototype's four modules are copied unchanged into `web/src/mascot/vendor/` and typed with `.d.mts` files. One Lerndorf wrapper (`mascot/sirByte.ts`) is the only user of the copy; it adds allowed reactions, quality levels, voice playback with speech motion and line events for the bubble. Two hosts use the wrapper: the village scene (market + tutorial plot) and `mascot/mascotStage.ts`, a small own renderer that only lives while the quest or quiz window is open (the village does not render meanwhile). No server change.

**Tech Stack:** TypeScript strict, Vite 5, three.js 0.170.0 (pinned; the copied modules were checked against it on 25.10.2026: 24 meshes, 26 930 triangles, builds and animates), Web Audio API, Vitest 2 + happy-dom, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-sir-byte-mascot-design.md`. Related: tutorial spec `docs/superpowers/specs/2026-10-21-first-login-tutorial-design.md` (§9 comic bubbles), daily quests `docs/superpowers/specs/2026-10-20-daily-quests-design.md`, build feedback plan Task 2 (`ui/sound.ts`).

## Global Constraints

- Read `CLAUDE.md` first. Do not touch `Konzept/`, `Prototyp/`, `Kenny/`, `../Referenz`, `Thomsen92/English-Club-8`. Do **not** change the `Thomsen92/Sir-Byte` repository; only read it (clone to a temporary folder outside Lerndorf).
- **Order:** needs `web/src/ui/sound.ts` (build-feedback plan Task 2: `Sound.enabled`, toggle „Töne: an/aus“). Work on `main` (single branch). If it is missing, implement build-feedback Task 2 first, unchanged. The XP feature is optional (Task 6 Step 5 only if `api/progress.ts` exists).
- No migration, no RPC, no new table, no network call except loading the voice files from the own site. No new npm dependency.
- Source of the copy: `https://github.com/Thomsen92/Sir-Byte` at commit `ea10e0c`. Copy `sir-byte.mjs`, `behavior.mjs`, `speech-motion.mjs`, `voice-clips.mjs` byte-identical except a header comment and the relative import paths. Never edit vendor logic; Lerndorf behaviour goes into the wrapper.
- Allowed reactions in Lerndorf: `idle`, `point`, `cheeky`, `celebrate`, `think`, `support`, `surprise`. **Never** `dry` or `smug`. Voice files used: `ready.mp3`, `splendid.mp3`, `nearly.mp3`, `support.mp3`, `thinking.mp3`, `surprised.mp3` → `web/public/assets/sir-byte/voice/`.
- Bubble text: English only, exactly the strings of spec §6 (table of recorded lines and table of text lines), stored once in `web/src/mascot/lines.ts`; always `textContent`; `role="status"`. All other UI stays German (`Weiter`, errors, quest feedback unchanged).
- Voice rules: only after a user gesture, only when `sound.enabled`, one voice at a time, voice gain `0.8`; without voice the same sentence is shown as text and the speech motion runs on time only.
- Bubble timing: with voice = clip duration + 1.5 s; without voice = `min(8, 2.5 + 0.06 × characters)` s; tutorial bubbles stay until „Weiter“.
- Market placement: left of the board seen from the plaza, about 1 m above the plaza surface, facing the plaza centre, scaled so the head is at figure eye height (model height 3.66 → target ≈ 1.9 m, scale ≈ 0.52). Update only when camera distance ≤ 60 m and in view; hidden beyond 90 m.
- Quality „Niedrig“: every `MeshPhysicalMaterial` replaced by a `MeshStandardMaterial` with the same colour/roughness/metalness (disposed with the mascot), no shadow casting.
- Mini window: square canvas, landscape ≈ 220 px left of the quest list, portrait ≈ 160 px high, right-aligned above the list; pixel ratio ≤ 1.5; fallback still image `assets/sir-byte/preview.png` (from the repo's `preview.png`, scaled to 320 px wide) when WebGL is missing or the context is lost.
- Per-day greeting flag: `localStorage` key `lerndorf.byteGreeted` = Berlin date `YYYY-MM-DD`, read/write in try/catch.
- Touch ≥ 44 px, keyboard reachable, no information only by animation or colour, `prefers-reduced-motion` forwarded as `reducedMotion` (body gestures off, eyes and bubbles stay).
- Done means: in `web/`, `npm test`, `npm run build`, `npx eslint src tests` green; render changes checked with `npm run galerie` (compare with `Konzept/Stil_Referenz/` and the last gallery run); UI changes screenshotted in Task 9.

## Review Focus

1. **Two voices at once** (quick answers in a row, Sir Byte talking while the pupil taps „▶ Anhören“ in a listening quest, closing the window while he talks) → at most one sound source at any time; the system voice of a listening quest silences Sir Byte; closing stops the voice at once. (Tests in Tasks 2 and 6.)
2. **No sound before a gesture / sound switched off / voice file 404** → no error, same sentence as text, motion still runs. (Tests in Task 2.)
3. **Tutorial resumed after reload or aborted by logout** at steps `intro`, `quiz`, `buy`, `place` → Sir Byte starts at the right place (market greeting only for `intro`), never two Sir Bytes visible, the tutorial copy is removed on abort. (Tests in Task 8.)
4. **Performance on the oldest tablet** (32 villagers + Sir Byte, quality Auto) → Sir Byte adds ≤ 24 draw calls and is not updated when far away or off screen; the mini window and the village never render at the same time. (Tests in Tasks 3, 7; measurement in Task 9.)
5. **Bubble covering controls** (portrait tablet, long line, Sir Byte near the screen edge or behind the avatar badge) → bubble clamped into the free area, never over the nav, the badge, the quest buttons or „Weiter“. (Tests in Task 4, screenshots in Task 9.)

---

## File Map

- `web/src/mascot/vendor/{sir-byte,behavior,speech-motion,voice-clips}.mjs` + `.d.mts`; `web/public/assets/sir-byte/voice/*.mp3`, `web/public/assets/sir-byte/preview.png`; `blender/sources/LICENSES.md`.
- `web/src/mascot/lines.ts`, `voice.ts`, `sirByte.ts`, `bubble.ts`, `mascotStage.ts`, `marketByte.ts`.
- Modify: `web/src/ui/speechBubble.ts` (+ `byte` mood), `web/src/style.css`, `web/src/ui/dailyQuestsView.ts`, `web/src/ui/tutorial/{flow,quizView,messages}.ts`, `web/src/ui/villageView.ts`, `web/src/render/plaza.ts` (export board pose only), `web/dev/tutorial.ts`, `web/e2e/tutorial.spec.ts`.
- Tests: `web/tests/mascot/{vendor,voice,sirByte,bubble,stage,market}.test.ts`, extend `web/tests/ui/dailyQuests.test.ts`, `web/tests/ui/tutorialFlow.test.ts`, `web/tests/ui/tutorialQuiz.test.ts`, `web/tests/ui/villageTutorial.test.ts`.
- New: `web/dev/byte.html`, `web/dev/byte.ts`, `web/e2e/sir-byte.spec.ts`; docs `docs/SPEC.md`, `docs/SCOPE.md`, `docs/PLAN.md`.

---

### Task 1: Vendor copy, types and assets

**Files:**
- Create: `web/src/mascot/vendor/*.mjs`, `*.d.mts`; `web/public/assets/sir-byte/voice/{ready,splendid,nearly,support,thinking,surprised}.mp3`; `web/public/assets/sir-byte/preview.png`
- Modify: `blender/sources/LICENSES.md`
- Test: `web/tests/mascot/vendor.test.ts` (node)

**Interfaces:**
- Produces (types in `sir-byte.d.mts`, `behavior.d.mts`):
  ```ts
  export type Reaction = 'idle' | 'point' | 'cheeky' | 'celebrate' | 'think' | 'support' | 'surprise' | 'dry' | 'smug';
  export interface Expression { label: string; line: string; duration: number; eyes: number[]; tilt: number; lift: number }
  export const EXPRESSIONS: Record<Reaction, Expression>;
  export class ByteBehavior { state: Reaction; mistakes: number; react(s: Reaction): Expression; feedback(correct: boolean): Expression; lookAt(x: number, y: number): void; update(dt: number): Expression }
  export interface UpdateOptions { reducedMotion?: boolean; speaking?: boolean; speechTime?: number; speechDuration?: number; speechLevel?: number; viewerPosition?: THREE.Vector3 | null }
  export interface SirByteInstance { root: THREE.Group; head: THREE.Group; behavior: ByteBehavior; update(dt: number, o?: UpdateOptions): void; playCane(): void; pointAtTask(target: string | THREE.Vector3 | { x: number; y: number; z: number }): void; triangles: number }
  export function createSirByte(): SirByteInstance;
  export const TASK_DIRECTIONS: Readonly<Record<string, unknown>>;
  ```

- [ ] **Step 1: Copy** from a temporary clone (`git clone https://github.com/Thomsen92/Sir-Byte /tmp/sir-byte && git -C /tmp/sir-byte checkout ea10e0c`): the four modules with the header comment `// Source: github.com/Thomsen92/Sir-Byte @ ea10e0c – copied unchanged except import paths. Do not edit; Lerndorf behaviour lives in ../sirByte.ts.`; the six MP3; `preview.png` scaled to 320 px wide (ffmpeg `-vf scale=320:-1`). Write the `.d.mts` files.
- [ ] **Step 2: Write the failing test** `vendor.test.ts`: `createSirByte()` with three 0.170 → 24 meshes, `triangles` between 26 000 and 28 000, height of the bounding box 3.5–3.8; 200 calls of `update(1/60)` plus `behavior.feedback(false)`, `pointAtTask(new Vector3(3,1,2))`, `react('celebrate')` do not throw and keep all positions finite; every file in `public/assets/sir-byte/voice/` exists and is < 120 KB; the `.mjs` files differ from the source only in the header and import lines (compare against the hashes noted in the test, computed in Step 1).
- [ ] **Step 3: Run** `npx vitest run tests/mascot/vendor.test.ts` — PASS (the copy already works; if it fails, stop and report, do not patch vendor code).
- [ ] **Step 4: Licence row:** „Sir Byte (Figur, Code, Stimme) | Auftraggeber (GitHub Thomsen92, eigenes Werk), Stimme erzeugt mit ElevenLabs | eigenes Werk | https://github.com/Thomsen92/Sir-Byte @ ea10e0c | `web/src/mascot/vendor/`, `web/public/assets/sir-byte/`“.
- [ ] **Step 5: Commit** `git add web/src/mascot/vendor web/public/assets/sir-byte blender/sources/LICENSES.md web/tests/mascot/vendor.test.ts && git commit -m "feat(mascot): vendor Sir Byte from his prototype repo"`

---

### Task 2: Voice player and lines

**Files:**
- Create: `web/src/mascot/lines.ts`, `web/src/mascot/voice.ts`
- Test: `web/tests/mascot/voice.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  // lines.ts
  export type VoicedReaction = 'idle' | 'celebrate' | 'cheeky' | 'support' | 'think' | 'surprise';
  export const VOICE: Record<VoicedReaction, { file: string; line: string }>;   // spec §6 table 1
  export type LineKey = 'hello' | 'welcome' | 'toHouse' | 'ruin' | 'quests' | 'coins' | 'quiz' | 'buy' | 'place' | 'final' | 'board' | 'allDone' | 'allDoneMarket' | 'catchUp';
  export const LINES: Record<LineKey, string>;                                   // spec §6 table 2, verbatim
  export function bubbleSeconds(text: string, clipSeconds: number | null): number; // §Global: clip+1.5, else min(8, 2.5+0.06·len)
  // voice.ts
  export interface SpeechFrame { speaking: boolean; speechTime: number; speechDuration: number; speechLevel: number }
  export interface VoicePlayer {
    /** plays the clip; resolves with its duration in s, or null when nothing plays (off, locked, missing) */
    play(r: VoicedReaction): Promise<number | null>;
    stop(): void;
    frame(): SpeechFrame;            // for SirByteInstance.update
    unlock(): void;                  // inside a user gesture
    dispose(): void;
  }
  export function createVoicePlayer(opts: { sound: Pick<Sound, 'enabled'>; base?: string; createContext?: () => AudioContext | null; fetchFn?: typeof fetch }): VoicePlayer;
  ```

- [ ] **Step 1: Write the failing tests** (fake `AudioContext` with `createBufferSource`, `createGain`, `createAnalyser`, `decodeAudioData`, `currentTime`): `LINES` and `VOICE` equal the spec strings (copy the tables into the test); `VOICE` has no `dry`/`smug`; `bubbleSeconds('abc', 3)` = 4.5, `bubbleSeconds('x'.repeat(200), null)` = 8; `play` before `unlock` → `null`, no source; after unlock → one source through gain `0.8` and an analyser, resolves the buffer duration; a second `play` stops the first source (Review Focus 1); `sound.enabled = false` → `null`; fetch 404 or decode error → `null`, nothing thrown (Review Focus 2); `frame()` while playing → `speaking true`, `speechTime` grows with `currentTime`, `speechLevel` in 0..1; after `stop()` → `speaking false`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (buffers decoded once per file, lazy on first `play`). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/mascot/lines.ts web/src/mascot/voice.ts web/tests/mascot/voice.test.ts && git commit -m "feat(mascot): voice player and English lines"`

---

### Task 3: The Lerndorf wrapper

**Files:**
- Create: `web/src/mascot/sirByte.ts`
- Test: `web/tests/mascot/sirByte.test.ts` (node, fake `VoicePlayer`)

**Interfaces:**
- Consumes: Tasks 1, 2.
- Produces:
  ```ts
  export type MascotReaction = Exclude<Reaction, 'dry' | 'smug'>;
  export interface Say { text: string; voiced: boolean; seconds: number }   // what the bubble shows and for how long
  export interface Mascot {
    readonly root: THREE.Group;
    /** reaction with its recorded line (voice if possible, else text); returns what to show */
    react(r: MascotReaction, opts?: { silent?: boolean }): Promise<Say | null>;   // silent: pose only, no bubble
    /** per-quest feedback: first mistake cheeky, then support, correct celebrate; counter per key */
    feedback(questKey: string, correct: boolean): Promise<Say>;
    /** text line without voice (keeps the current pose) */
    say(key: LineKey): Say;
    point(target: THREE.Vector3): void;   // pointAtTask with a world position
    lookAt(target: THREE.Vector3 | null, camera: THREE.Camera): void;   // converts to behavior.lookAt(-1..1)
    pop(): void;                          // cane "plop" + ring (playCane), used before hiding/after showing
    setQuality(q: 'high' | 'low'): void;  // material swap + castShadow
    update(dt: number, opts: { reducedMotion: boolean; viewer?: THREE.Vector3 | null }): void;  // feeds voice.frame()
    stopVoice(): void;
    dispose(): void;                      // disposes geometries and materials of this instance
  }
  export function createMascot(opts: { voice: VoicePlayer; quality?: 'high' | 'low' }): Mascot;
  ```

- [ ] **Step 1: Write the failing tests:** `react('celebrate')` with a voice returning 3.4 → `{text:'Splendid! Nicely done.', voiced:true, seconds:4.9}`; with voice `null` → `voiced false`, text same, `seconds` from `bubbleSeconds`; `react('dry' as never)` throws; `feedback('q1', false)` → cheeky, again → support, `feedback('q2', false)` → cheeky (own counter), `feedback('q1', true)` → celebrate and resets `q1`; `say('board')` returns the line and does not call `voice.play`; `react(...)` calls `voice.stop()` first; `setQuality('low')` → no `MeshPhysicalMaterial` left, no mesh with `castShadow`; `setQuality('high')` restores the originals; every mesh of `root` has `userData.kind === 'byte'`; `dispose()` disposes the replaced materials too.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/mascot/sirByte.ts web/tests/mascot/sirByte.test.ts && git commit -m "feat(mascot): Lerndorf wrapper with allowed reactions, quality and voice"`

---

### Task 4: Speech bubble for Sir Byte

**Files:**
- Create: `web/src/mascot/bubble.ts`
- Modify: `web/src/ui/speechBubble.ts` (`BubbleMood` += `'byte'`), `web/src/style.css`
- Test: `web/tests/mascot/bubble.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  export interface ByteBubble {
    /** shows text; auto-hides after `seconds` unless sticky; returns a promise that resolves when hidden */
    show(say: Say, opts?: { sticky?: boolean }): Promise<void>;
    /** sticky tutorial bubble with a German „Weiter“ button inside; resolves on tap/Enter */
    ask(text: string, button: string): Promise<void>;
    /** anchor in viewport px (head), or null to hide; re-clamped every call */
    anchor(p: { x: number; y: number } | null): void;
    hide(): void;
    dispose(): void;
  }
  export function createByteBubble(opts: { host: HTMLElement; avoid?: () => DOMRect[] }): ByteBubble;
  /** pure: final rect of a bubble of size w×h for anchor p inside viewport, avoiding the given rects; null if impossible */
  export function placeBubble(p: { x: number; y: number }, w: number, h: number, viewport: { w: number; h: number }, avoid: DOMRect[]): { left: number; top: number; below: boolean; tipX: number } | null;
  ```

- [ ] **Step 1: Write the failing tests:** element has class `speech-bubble speech-bubble--byte`, label `SIR BYTE` (`aria-hidden`), text via `textContent` (HTML in the text stays text); `role="status"`; `show` with `seconds 2` hides after 2 s (fake timers); a new `show` replaces the old text; `ask` renders the button `Weiter` (≥ 44 px class), resolves on click and on Enter; `placeBubble` keeps the rect inside the viewport, moves it out of an `avoid` rect (nav bar at the bottom, badge at the top right) and flips below when there is no room above (Review Focus 5); returns `null` when nothing fits (then the bubble docks at the top centre).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (reuse `positionBubble` maths where possible; CSS `.speech-bubble--byte` with the teal border `#38bfc9`, label line in small caps). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/mascot/bubble.ts web/src/ui/speechBubble.ts web/src/style.css web/tests/mascot/bubble.test.ts && git commit -m "feat(mascot): Sir Byte speech bubble"`

---

### Task 5: Mini window (mascot stage)

**Files:**
- Create: `web/src/mascot/mascotStage.ts`
- Modify: `web/src/style.css`
- Test: `web/tests/mascot/stage.test.ts` (happy-dom)

**Interfaces:**
- Produces:
  ```ts
  export interface MascotStage {
    el: HTMLElement;                 // <figure class="byte-stage"> with canvas (aria-hidden) or fallback <img alt="Sir Byte">, plus the bubble host
    mascot: Mascot | null;           // null in fallback mode
    bubble: ByteBubble;
    dispose(): void;                 // stops loop and voice, disposes renderer (forceContextLoss) and mascot
  }
  export function createMascotStage(opts: { voice: VoicePlayer; reducedMotion: () => boolean; createRenderer?: (c: HTMLCanvasElement) => THREE.WebGLRenderer | null }): MascotStage;
  /** pure: camera framing of the head-and-shoulders view for a square canvas */
  export function stageFrame(): { fov: number; position: [number, number, number]; target: [number, number, number] };
  ```

- [ ] **Step 1: Write the failing tests:** `createRenderer: () => null` → fallback image `assets/sir-byte/preview.png`, `mascot null`, `bubble` still works; with a stub renderer → canvas present, `mascot` set, the animation loop stops when `el` is removed from the DOM; `dispose()` calls `stopVoice`, renderer `dispose` and `forceContextLoss`; `webglcontextlost` on the canvas → switches to the fallback image; `stageFrame()` keeps the whole hat and the bow in view (check with the vendor bounding box: top of hat and bottom of bow inside the frustum).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**: renderer settings as `render/itemPreview.ts` (sRGB, ACES, alpha), pixel ratio ≤ 1.5, soft hemisphere + key light (values from `itemPreview`), quality `high`; camera from `stageFrame()`; Sir Byte looks at the camera when idle. **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `git add web/src/mascot/mascotStage.ts web/src/style.css web/tests/mascot/stage.test.ts && git commit -m "feat(mascot): small 3D window with fallback"`

---

### Task 6: Daily Quests and tutorial quiz with Sir Byte

**Files:**
- Modify: `web/src/ui/dailyQuestsView.ts`, `web/src/ui/tutorial/quizView.ts`, `web/src/style.css`
- Test: extend `web/tests/ui/dailyQuests.test.ts`, `web/tests/ui/tutorialQuiz.test.ts`

**Interfaces:**
- Produces:
  ```ts
  /** what the quest and quiz views need; villageView builds it with createMascotStage */
  export interface QuestMascot {
    el: HTMLElement;
    opened(firstToday: boolean): void;                       // greeting with voice once per day
    checking(): void;                                        // think, silent
    answered(questKey: string, correct: boolean, lastOfToday: boolean): Promise<void>;
    listening(): void;                                       // stopVoice (system voice reads)
    levelUp?(): Promise<void>;                               // surprise with voice (XP feature)
    say(key: LineKey): void;
    dispose(): void;
  }
  export function questMascot(stage: MascotStage): QuestMascot;   // in mascot/mascotStage.ts
  export function greetedToday(store?: Pick<Storage,'getItem'|'setItem'> | null, today?: string): boolean; // reads+sets lerndorf.byteGreeted
  // DailyQuestsOptions += mascot?: QuestMascot ; QuizOptions += mascot?: QuestMascot
  ```

- [ ] **Step 1: Write the failing tests** (fake `QuestMascot` with spies):
  - opening the quests mounts `mascot.el` in the area (landscape: before the list; class `byte-stage`), calls `opened(true)` the first time today and `opened(false)` the second time (fake store).
  - tap on `Prüfen` → `checking()` before the server answers; wrong → `answered(key,false,false)`; correct third quest of today → `answered(key,true,true)`; catch-up correct → `lastOfToday false`.
  - tap on `▶ Anhören` → `listening()` (Review Focus 1).
  - closing the area → `dispose()` once; closing while `answered` is pending does not throw.
  - without `mascot` the view works exactly as before (existing tests unchanged).
  - quiz: `say('quiz')` at start, wrong/right → `answered` with the quiz question number as key.
  - `greetedToday` with a throwing store → `false` and no throw.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** the hooks in both views and `questMascot` (maps: opened → `react('idle')` with voice if first today else `react('idle',{silent:true})`; checking → `react('think',{silent:true})`; answered → `feedback(...)`, then on `lastOfToday` `react('surprise')` and `say('allDone')`; each result shown via `stage.bubble.show`).
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5 (only if `web/src/api/progress.ts` exists):** when a quest answer's `progress.level > progress.levelBefore`, await `mascot.levelUp()` before the level-up celebration is opened; test it.
- [ ] **Step 6: Commit** `git add web/src/ui/dailyQuestsView.ts web/src/ui/tutorial/quizView.ts web/src/mascot/mascotStage.ts web/src/style.css web/tests/ui/dailyQuests.test.ts web/tests/ui/tutorialQuiz.test.ts && git commit -m "feat(mascot): Sir Byte reacts in Daily Quests and the tutorial quiz"`

---

### Task 7: Sir Byte on the market plaza

**Files:**
- Create: `web/src/mascot/marketByte.ts`
- Modify: `web/src/render/plaza.ts` (export `boardPose(layout)`; the board code uses it), `web/src/ui/villageView.ts`
- Test: `web/tests/mascot/market.test.ts` (node)

**Interfaces:**
- Produces:
  ```ts
  // plaza.ts
  export function boardPose(layout: Layout): { x: number; y: number; z: number; rotY: number };   // same values the board uses today
  // marketByte.ts
  export const BYTE_SCALE = 0.52;
  export function marketPose(layout: Layout): { position: THREE.Vector3; rotY: number };   // left of the board, 1 m above the plaza, facing the plaza centre
  export function mascotLod(distance: number, inView: boolean): 'update' | 'still' | 'hidden'; // ≤60 & in view: update; ≤90: still; else hidden
  export type MarketTap = { action: 'point-board'; line: 'board' | 'catchUp' } | { action: 'celebrate'; line: 'allDoneMarket' } | { action: 'open-quests' };
  /** what a tap does: second tap while pointing → open-quests */
  export function marketTap(status: { todayOpen: number; catchUpOpen: number }, pointing: boolean): MarketTap;
  export interface MarketByte { mascot: Mascot; boardTarget: THREE.Vector3; update(dt: number, camera: THREE.Camera, reducedMotion: boolean): void; tap(status: { todayOpen: number; catchUpOpen: number }): Promise<MarketTap>; setVisible(v: boolean): void; dispose(): void }
  export function createMarketByte(scene: THREE.Scene, layout: Layout, opts: { voice: VoicePlayer; bubble: ByteBubble; quality: 'high' | 'low'; project: (p: THREE.Vector3) => { x: number; y: number } | null }): MarketByte;
  ```

- [ ] **Step 1: Write the failing tests:** `boardPose` matches the old placement for both map templates (snapshot of x, z, rotY from the current code); `marketPose` lies 1.8–2.6 m from the board centre on its left side (seen from the plaza), at plaza height + 1.0, and faces the plaza centre (dot product > 0.9); it does not intersect the board posts or a stall (bounding check against `layout` stall positions); `mascotLod(30,true)='update'`, `(30,false)='still'`, `(70,true)='still'`, `(95,true)='hidden'`; `marketTap({todayOpen:2,catchUpOpen:0}, false)` → point-board/board, same with `pointing true` → open-quests, `{0,1}` → point-board/catchUp, `{0,0}` → celebrate/allDoneMarket; `MarketByte.update` does not call `mascot.update` when `still`/`hidden` (Review Focus 4).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `marketByte.ts` and `boardPose`.
- [ ] **Step 4: Wire `villageView.ts`:** one `VoicePlayer` per village (unlock in the existing window `pointerdown`), one `ByteBubble` on `document.body` with `avoid` = nav, badge/status, build bar; `createMarketByte` after the village is built; `update` in the animation loop before `gl.render`; bubble `anchor` from the projected head each frame while visible; tap: raycast hit with `userData.kind === 'byte'` → load today's status with `loadDailyQuests` (count `!solved && !catch_up` / catch-up), then `tap`; `open-quests` → `areas.select('aufgaben')`; Daily Quests area gets `mascot: questMascot(createMascotStage(...))` (stage created on open, disposed on close); quality follows the existing quality switch (`setQuality`); `stop()` disposes all.
- [ ] **Step 5: Run** `npm test`, `npm run build`; then `npm run galerie` and look at the market pictures: Sir Byte beside the board, not inside it, size like a figure, readable silhouette.
- [ ] **Step 6: Commit** `git add web/src/mascot/marketByte.ts web/src/render/plaza.ts web/src/ui/villageView.ts web/tests/mascot/market.test.ts && git commit -m "feat(mascot): Sir Byte on the market next to the board"`

---

### Task 8: Tutorial with Sir Byte

**Files:**
- Modify: `web/src/ui/tutorial/flow.ts`, `web/src/ui/tutorial/messages.ts` (remove `MESSAGES` and `FINAL_TEXT` uses that Sir Byte now speaks; keep German UI strings), `web/src/ui/villageView.ts` (tutorial side), `web/src/render/introCamera.ts` (market stop)
- Test: extend `web/tests/ui/tutorialFlow.test.ts`, `web/tests/ui/villageTutorial.test.ts`, `web/tests/render/introCamera.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // TutorialVillage (flow.ts) gets:
  flyIntro(reducedMotion: boolean, atMarket?: () => Promise<void>): Promise<void>;   // pauses at the market pose in front of Sir Byte, awaits atMarket, then continues to the plot
  byte: {
    greet(): Promise<void>;                       // surprise pose (silent) at the market
    moveToPlot(): void;                           // pop at market, market copy hidden, tutorial copy beside the plot gate, pop
    moveToMarket(): void;                         // reverse; removes the tutorial copy
    pointAtHouseSlot(): void;
    react(r: MascotReaction, opts?: { silent?: boolean }): Promise<Say | null>;
    ask(key: LineKey): Promise<void>;             // sticky bubble at his head with „Weiter“
    show(key: LineKey): void;                     // timed bubble
    mascot(): QuestMascot;                        // for the quiz window
  };
  // introCamera.ts: introPath(layout, plot, reduced, marketStop?: CameraPose) with a hold point; export marketStopPose(layout): CameraPose (looks at Sir Byte from the plaza side)
  ```

- [ ] **Step 1: Write the failing flow tests** (fake village recording calls in order):
  - step `intro`: figure picker → `flyIntro` with `atMarket` → inside it `greet`, `ask('hello')`, `ask('welcome')`, `react('idle')` (voice), `show('toHouse')`, `moveToPlot` → after the flight the figure's sad bubble (German, unchanged) → `ask('ruin')`, `ask('quests')`, `ask('coins')` → `continueIntro`.
  - step `quiz`: the quiz gets `mascot` from `byte.mascot()`; no greeting; `moveToPlot` is called exactly once on resume (Sir Byte already at the plot), never `greet` (Review Focus 3).
  - step `buy`: `show('buy')` with the buy dialog; step `place`: `pointAtHouseSlot` + `ask` not used (timed `show('place')`), after the house stands `react('celebrate')`, dance, `show('final')`, then `moveToMarket`, then Daily Quests.
  - abort (signal) in any step → `moveToMarket` called, no bubble left in the DOM.
  - reduced motion: `flyIntro` still gets `atMarket` (short flight with a hold).
- [ ] **Step 2: Camera test:** `introPath(..., marketStop)` passes through `marketStopPose` and holds there (two keys with the same pose); `marketStopPose` looks at the `marketPose` of Sir Byte from ≥ 4 m and ≤ 8 m.
- [ ] **Step 3: Run** — FAIL.
- [ ] **Step 4: Implement** flow, camera hold (the path resolves `atMarket` at the hold key and waits for it), and the village side (tutorial copy = second `createMascot` instance, created on `moveToPlot`, disposed on `moveToMarket`/abort; the market copy is hidden meanwhile, so only one is visible).
- [ ] **Step 5: Update** `dev/tutorial.ts` (fake flow works with Sir Byte) and `e2e/tutorial.spec.ts`: new shots `02a-byte-hello`, `02b-byte-welcome`, `03a-byte-ruin`, `quiz-byte-wrong`, `quiz-byte-right`, `place-byte-points`, `final-byte`. Run it — green.
- [ ] **Step 6: Run** `npm test`, `npm run build`, eslint — green.
- [ ] **Step 7: Commit** `git add web/src/ui/tutorial web/src/ui/villageView.ts web/src/render/introCamera.ts web/dev/tutorial.ts web/e2e/tutorial.spec.ts web/tests/ui/tutorialFlow.test.ts web/tests/ui/villageTutorial.test.ts web/tests/render/introCamera.test.ts && git commit -m "feat(mascot): Sir Byte greets and guides through the tutorial"`

---

### Task 9: Screenshots, performance and docs

**Files:**
- Create: `web/dev/byte.html`, `web/dev/byte.ts`, `web/e2e/sir-byte.spec.ts`
- Modify: `web/playwright.config.ts`, `docs/SPEC.md`, `docs/SCOPE.md`, `docs/PLAN.md`, spec status line

- [ ] **Step 1: `dev/byte.ts`:** the Daily Quests area with a fake quest API (three quests, one listening) and the real `questMascot(createMascotStage(...))`; URL `?answer=wrong|wrong2|right|all` replays that sequence. Expose `window.__voices` (number of started sources) for the test.
- [ ] **Step 2: `e2e/sir-byte.spec.ts`** at 1180 × 820 and 820 × 1180: shots `01-quests-open`, `02-wrong-cheeky`, `03-wrong-support`, `04-right-celebrate`, `05-all-done`, `06-listening` (assert `__voices` never > 1 at a time), `07-reduced`; and in the village dev page (`dev/tutorial.html?step=done`) `08-market-byte`, `09-market-tap-point`. Fail on page errors, on horizontal scroll and when a bubble rect overlaps `.game-nav` or the avatar badge (Review Focus 5).
- [ ] **Step 3: Run** the e2e specs — green; look at every picture (bubbles readable, Sir Byte not cut off, hat and bow in the mini window, market silhouette clear).
- [ ] **Step 4: Performance:** in the village with 32 fake villagers, quality Auto: log `renderer.info.render.calls` and triangles with and without Sir Byte in view → difference ≤ 24 calls / 27 000 triangles; with the camera 100 m away → 0 extra. Note the numbers in `docs/PLAN.md`. The teacher measures fps on the oldest tablet at acceptance.
- [ ] **Step 5: Full check** `npm test && npm run build && npx eslint src tests` — green; `npm run galerie` once more.
- [ ] **Step 6: Docs:** `docs/SPEC.md` new §11a „Sir Byte (Maskottchen)“ (short, link to the spec), §12 rows for Daily Quests (mini window) and tutorial; `docs/SCOPE.md` „Im Umfang“ item „Maskottchen Sir Byte (Tutorial, Daily Quests, Marktplatz)“; `docs/PLAN.md` block `## Zwischenpaket S – Sir Byte` with S.1–S.9 (`[x]`) and `[ ] S.10 | LK | **Abnahme Sir Byte** auf dem Schul-Tablet (Spec §11), fps mit Qualität Auto messen | Notiz hier |`; spec status line `Umgesetzt laut Plan 2026-10-25; Abnahme (S.10) steht aus.`
- [ ] **Step 7: Commit** `git add web/dev/byte.html web/dev/byte.ts web/e2e/sir-byte.spec.ts web/playwright.config.ts docs/SPEC.md docs/SCOPE.md docs/PLAN.md docs/superpowers/specs/2026-10-25-sir-byte-mascot-design.md && git commit -m "test(e2e): Sir Byte screenshots; docs"`
- [ ] **Step 8: Report to the teacher in German:** what pupils see, which recordings are used and which not (and why), where the screenshots are, the measured draw calls, and the checklist for S.10. Mention that new recordings can be added later by putting a file next to a line in `mascot/lines.ts`.

---

## Self-review

- Spec §2.1 tutorial greeting and bubbles → Task 8 (+ 4, 6 for the quiz). §2.2 reactions in quests → Tasks 3, 6. §2.3 market next to the existing board → Task 7. §2.4 English bubbles only, German UI → Global Constraints, Tasks 2, 4. §2.5 only existing recordings, rest as text → Tasks 1, 2. §2.6 small window → Tasks 5, 6.
- §3 anti-goals: no `dry`/`smug` → Tasks 2, 3 tests; no sound without gesture → Task 2; no covering → Task 4, 9; performance → Tasks 3, 7, 9. §5 approach A (vendor copy, wrapper) → Tasks 1, 3. §6 lines, timing, voice rules → Task 2, 4. §7 bubble → Task 4. §8.1 market (placement, idle, tap, LOD) → Task 7. §8.2 tutorial steps 1–9 and resume → Task 8. §8.3 quests/quiz window, greeting once a day, think/cheeky/support/celebrate/surprise, per-quest counter, reduced motion, fallback → Tasks 5, 6. §8.4 XP → Task 6 Step 5. §9 files, assets, three 0.170, light, budget, tap kind, localStorage, licence → Tasks 1, 3, 5, 7, 9. §10 edge cases → Review Focus 1–3, Tasks 5, 6, 8. §11 acceptance → Task 9 + S.10.
- Names defined once and reused: `Mascot`, `MascotReaction`, `Say`, `VoicePlayer`, `VOICE`, `LINES`, `LineKey`, `bubbleSeconds`, `ByteBubble`, `placeBubble`, `MascotStage`, `QuestMascot`, `questMascot`, `greetedToday`, `boardPose`, `marketPose`, `mascotLod`, `marketTap`, `MarketByte`, `marketStopPose`.
